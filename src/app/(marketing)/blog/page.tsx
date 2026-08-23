// src/app/(marketing)/blog/page.tsx
//
// Real Blog page — the landing nav's "Blog" link was pointing at nothing
// (a dead <span>, not even a link). Posts here are genuine first-party
// content in the founder's own voice, matching the "Why we're building
// this" section already on the landing page — not fabricated case studies,
// testimonials, or metrics. Kept as sections on one page rather than a
// full slug-based CMS, since there are only a couple of posts so far;
// worth revisiting once there's enough content to need real pagination.

const sectionStyle = { marginBottom: 64, paddingBottom: 56, borderBottom: '1px solid rgba(255,255,255,0.06)' }
const h2Style = { fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8, color: '#F2F2F8' }
const metaStyle = { fontSize: '0.78rem', color: '#5A5A72', marginBottom: 20 }
const pStyle = { fontSize: '0.94rem', color: '#B0B0C4', lineHeight: 1.85, marginBottom: 16 }

export default function BlogPage() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#06060A', color: '#F2F2F8', minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px 120px' }}>
        <a href="/" style={{ fontSize: '0.82rem', color: '#8585A0', textDecoration: 'none' }}>&larr; Back to VyralBro</a>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '24px 0 8px' }}>The VyralBro Blog</h1>
        <p style={{ fontSize: '0.92rem', color: '#8585A0', marginBottom: 56 }}>Notes from building VyralBro, straight from the team — no ghostwritten fluff.</p>

        <article style={sectionStyle}>
          <h2 style={h2Style}>Why we&apos;re building VyralBro for Bharat</h2>
          <p style={metaStyle}>August 2026 &middot; Rootn</p>
          <p style={pStyle}>
            Every major social media tool was built with the US market in mind first, and everyone else second. Pricing is quoted in dollars.
            Regional Indian languages are an afterthought, if they&apos;re supported at all. And WhatsApp — the single highest-open-rate channel
            for reaching Indian audiences — is usually left out of the conversation entirely.
          </p>
          <p style={pStyle}>
            VyralBro started from a simple frustration: why should an Indian creator or small business have to translate their pricing,
            their numbers, and their voice into a US-first tool just to reach their own audience? We wanted something that spoke ₹, lakh,
            and crore natively, that treated Hindi, Tamil, Telugu, Kannada, Bengali, and Marathi as first-class languages rather than an
            add-on, and that understood WhatsApp Broadcast as a real publishing channel, not an edge case.
          </p>
          <p style={pStyle}>
            That&apos;s what we&apos;re building — one idea, adapted in your voice, reaching Instagram, YouTube, LinkedIn, Twitter, Facebook,
            and WhatsApp, in whichever Indian languages your audience actually speaks.
          </p>
        </article>

        <article style={{ ...sectionStyle, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
          <h2 style={h2Style}>One idea, every platform, every language</h2>
          <p style={metaStyle}>August 2026 &middot; Rootn</p>
          <p style={pStyle}>
            Most social tools that promise to help you &ldquo;post everywhere&rdquo; really mean one thing: the same caption, copy-pasted
            across every platform, maybe with a hashtag swapped out. That&apos;s not adaptation — a LinkedIn post and an Instagram caption
            aren&apos;t the same piece of writing wearing a different hat, and a message aimed at a Hindi-speaking WhatsApp audience isn&apos;t
            the same as an English LinkedIn post run through a translator.
          </p>
          <p style={pStyle}>
            VyralBro treats both dimensions — platform and language — as real, independent choices. Write your idea once, pick every
            platform you want to reach and every language your audience actually speaks, and VyralBro generates a genuinely separate,
            properly adapted version for each combination: the right length, the right tone, the right format, in that language, for that
            platform. Review each one side by side before anything goes out, edit anything that doesn&apos;t sound like you, and publish
            each version when it&apos;s ready — not a single generic post wearing six different hats.
          </p>
        </article>
      </div>
    </div>
  )
}
