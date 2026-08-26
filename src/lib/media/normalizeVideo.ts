// src/lib/media/normalizeVideo.ts
//
// Why this exists: Instagram's Graph API was rejecting every video VyralBro
// published with a generic "failed to process the video" error (see
// src/lib/social/publisher.ts's waitForContainerReady — Meta's container
// status just flips to ERROR with no further detail). Investigated by
// checking the actual uploaded file: a .mov straight off an iPhone, and
// VyralBro's upload path (src/app/api/media/presign — a raw presigned S3
// PUT) does zero processing on it before handing the URL to Instagram.
//
// Meta's documented video ingestion requirements include the container
// having "no edit lists, moov atom at the front" (the standard "faststart"
// layout) — most phone cameras and editing apps do NOT produce files this
// way by default, and Meta's ingestion apparently fails silently rather
// than giving a useful error when it isn't. This is a well-known gotcha for
// any app that publishes API-uploaded video to Instagram.
//
// Fix: after upload, remux the file (rewrap the container + move the moov
// atom to the front) before it's ever used as a mediaUrl. `-c copy` means
// no re-encoding — this only rewrites the container, so it's fast (seconds,
// even for a large file) and lossless. If the source codec itself isn't one
// Instagram accepts (rare — remux failing suggests something deeper than a
// moov-atom problem), fall back to a real transcode to H.264/AAC.

import { execFile }                        from 'child_process'
import { promisify }                       from 'util'
import { mkdtemp, rm, writeFile, readFile } from 'fs/promises'
import { tmpdir }                          from 'os'
import path                                from 'path'
import { downloadObject, uploadBuffer }    from '@/lib/storage/s3'

const execFileAsync = promisify(execFile)

const REMUX_TIMEOUT_MS     = 60_000
const TRANSCODE_TIMEOUT_MS = 120_000

async function runFfmpeg(args: string[], timeoutMs: number) {
  await execFileAsync('ffmpeg', ['-y', ...args], {
    timeout:   timeoutMs,
    maxBuffer: 32 * 1024 * 1024,
  })
}

export async function normalizeVideo(key: string): Promise<{ key: string; publicUrl: string }> {
  const dir        = await mkdtemp(path.join(tmpdir(), 'vyral-video-'))
  const inputPath  = path.join(dir, 'input')
  const outputPath = path.join(dir, 'output.mp4')

  try {
    const original = await downloadObject(key)
    await writeFile(inputPath, original)

    try {
      // Fast path: remux only. Fixes the moov-atom/faststart issue without
      // touching a single frame.
      await runFfmpeg(
        ['-i', inputPath, '-c', 'copy', '-movflags', '+faststart', '-f', 'mp4', outputPath],
        REMUX_TIMEOUT_MS,
      )
    } catch {
      // Remux failed outright — the codec itself is likely incompatible
      // (not just the container layout). Fall back to a full transcode.
      await runFfmpeg(
        [
          '-i', inputPath,
          '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-b:a', '128k',
          '-movflags', '+faststart',
          '-f', 'mp4', outputPath,
        ],
        TRANSCODE_TIMEOUT_MS,
      )
    }

    const output  = await readFile(outputPath)
    const newKey  = key.replace(/\.[^./]+$/, '') + '-normalized.mp4'
    const publicUrl = await uploadBuffer(newKey, 'video/mp4', output)
    return { key: newKey, publicUrl }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
