-- Add PARTIAL to PostStatus so a post that published on some platforms but
-- failed on others can be represented honestly, instead of collapsing into
-- FAILED (see src/lib/queue/worker.ts's recomputePostStatus).
ALTER TYPE "PostStatus" ADD VALUE 'PARTIAL';
