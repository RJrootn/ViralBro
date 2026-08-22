// src/app/(marketing)/privacy/page.tsx
//
// Real Privacy Policy page — until now /privacy was a dead link (referenced
// from LoginClient.tsx's "you agree to our Terms and Privacy Policy" but no
// route existed). This blocks Meta App Review outright: Meta requires a
// live Privacy Policy URL before you can submit permissions for review, and
// its OAuth consent screen links to it directly.
//
// Content below describes what VyralBro actually does, based on the real
// Prisma schema and integrations in this codebase (see prisma/schema.prisma,
// src/lib/tokens/encrypt.ts, src/lib/ai/generate.ts, src/lib/storage/s3.ts) —
// nothing here is boilerplate or aspirational. That said, this is a draft
// written from the code, not a substitute for legal review: have a lawyer
// familiar with India's DPDP Act 2023 (and GDPR, if you expect EU users)
// check this before relying on it for Meta's Business Verification or
// general compliance.

const LAST_UPDATED = 'August 22, 2026'

const sectionStyle = { marginBottom: 40 }
const h2Style = { fontSize: '1.3rem', fontWeight: 800, marginBottom: 14, color: '#F2F2F8', letterSpacing: '-0.01em' }
const pStyle = { fontSize: '0.92rem', color: '#B0B0C4', lineHeight: 1.8, marginBottom: 12 }
const liStyle = { fontSize: '0.92rem', color: '#B0B0C4', lineHeight: 1.8, marginBottom: 8 }

export default function PrivacyPolicyPage() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#06060A', color: '#F2F2F8', minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '80px 24px 120px' }}>
        <a href="/" style={{ fontSize: '0.82rem', color: '#8585A0', textDecoration: 'none' }}>&larr; Back to VyralBro</a>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '24px 0 8px' }}>Privacy Policy</h1>
        <p style={{ fontSize: '0.82rem', color: '#5A5A72', marginBottom: 48 }}>Last updated: {LAST_UPDATED}</p>

        <div style={sectionStyle}>
          <p style={pStyle}>
            VyralBro is operated by Rootn.ai (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). This policy explains what
            information we collect when you use VyralBro, why we collect it, who we share it with, and how you can
            control or delete it. If anything here is unclear, email us at{' '}
            <a href="mailto:rj@rootn.ai" style={{ color: '#FF9933' }}>rj@rootn.ai</a> and we&apos;ll clarify.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>1. Information we collect</h2>
          <p style={pStyle}><strong>Account information.</strong> When you sign in with Google, we receive your name, email address, and profile image. You can also add a username, bio, website, location, preferred language, and timezone to your profile.</p>
          <p style={pStyle}><strong>Connected platform accounts.</strong> When you connect Instagram, X/Twitter, or LinkedIn, we store the platform username, display name, avatar, the OAuth access token (and refresh token, if the platform issues one), the token&apos;s expiry, and the specific permission scopes you granted. Access and refresh tokens are encrypted at rest (AES-256-GCM) before they touch our database — even someone with direct database access cannot read them without our separate encryption key, which is stored apart from the database itself.</p>
          <p style={pStyle}><strong>Content you create.</strong> The raw idea or text you write in Studio, the AI-adapted version generated per platform, any hashtags, and any images or video you upload (stored in Amazon S3).</p>
          <p style={pStyle}><strong>Publishing records.</strong> Which platforms a post was sent to, its status (draft, scheduled, publishing, published, or failed), and the ID the platform assigns once it&apos;s live.</p>
          <p style={pStyle}><strong>Analytics.</strong> After a post publishes, we periodically fetch performance data — reach, impressions, likes, comments, shares, saves, video views, and similar metrics — directly from the platform&apos;s own API, and store it so you can see it on your dashboard.</p>
          <p style={pStyle}><strong>Billing information.</strong> Your subscription plan, and payment records (Razorpay order ID, payment ID, amount, currency, status) for transactions processed through Razorpay. We never see or store your card, UPI, or bank details — Razorpay handles that directly.</p>
          <p style={pStyle}><strong>AI usage.</strong> How many AI credits you&apos;ve used and have remaining, so we can enforce your plan&apos;s limits and show you accurate usage.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>2. How we use this information</h2>
          <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
            <li style={liStyle}>To generate platform-adapted versions of your content and publish it to the platforms you&apos;ve connected, on your instruction.</li>
            <li style={liStyle}>To show you analytics on how your published posts are performing.</li>
            <li style={liStyle}>To bill you correctly for your plan and track your AI credit usage.</li>
            <li style={liStyle}>To operate, secure, and improve VyralBro — including debugging issues when something fails to publish.</li>
            <li style={liStyle}>To contact you about your account, e.g. a failed publish, a token that needs reconnecting, or a billing issue.</li>
          </ul>
          <p style={pStyle}>We do not sell your personal information or your content to anyone.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>3. Who we share information with</h2>
          <p style={pStyle}>We share data with the following third parties, only as needed to provide the service:</p>
          <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
            <li style={liStyle}><strong>Anthropic</strong> — the raw text you write is sent to Anthropic&apos;s Claude models to generate platform-adapted versions of your content.</li>
            <li style={liStyle}><strong>Meta (Instagram/Facebook), X Corp, LinkedIn</strong> — we send your adapted content and media to these platforms&apos; APIs to publish on your behalf, using the access token you granted us, and we read back analytics for posts you publish.</li>
            <li style={liStyle}><strong>Razorpay</strong> — processes your subscription payments directly; we receive only the order/payment status, not your payment instrument details.</li>
            <li style={liStyle}><strong>Supabase</strong> — hosts our database.</li>
            <li style={liStyle}><strong>Amazon Web Services (S3)</strong> — stores images and video you upload.</li>
            <li style={liStyle}><strong>Netlify and Railway</strong> — host our application and background publishing worker.</li>
            <li style={liStyle}><strong>Resend</strong> — sends transactional email (e.g. waitlist confirmations).</li>
          </ul>
          <p style={pStyle}>We don&apos;t share your data with anyone else, and we don&apos;t share it for advertising purposes.</p>
        </div>

        <div style={sectionStyle} id="data-deletion">
          <h2 style={h2Style}>4. Deleting your data</h2>
          <p style={pStyle}>
            You can disconnect any individual platform (Instagram, X/Twitter, LinkedIn) at any time from Settings —
            this immediately deletes that platform&apos;s stored access token from our database.
          </p>
          <p style={pStyle}>
            To delete your entire VyralBro account and all associated data — your profile, connected platforms,
            posts, analytics, and billing records — email <a href="mailto:rj@rootn.ai" style={{ color: '#FF9933' }}>rj@rootn.ai</a> from
            the address on your account and ask us to delete it. We&apos;ll confirm once it&apos;s done, normally within a
            few business days. We don&apos;t yet have a fully self-service &ldquo;delete my account&rdquo; button in the
            product — this is a manual process on our end for now, and this page will be updated when that changes.
          </p>
          <p style={pStyle}>
            If you signed in or connected a platform through Meta, you can also remove VyralBro&apos;s access at any
            time from your own Facebook/Instagram account&apos;s connected-apps settings, independent of anything on
            our side.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>5. Data retention</h2>
          <p style={pStyle}>We keep your data for as long as your account is active, so the product keeps working the way you&apos;d expect. If you close your account or ask us to delete your data per the process above, we remove it from our active systems; residual copies may persist briefly in backups until they age out naturally.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>6. Security</h2>
          <p style={pStyle}>Platform access and refresh tokens are encrypted at rest using AES-256-GCM. All traffic between your browser and VyralBro, and between VyralBro and the platforms it connects to, is encrypted in transit (TLS/HTTPS). No system is perfectly secure, and we can&apos;t guarantee absolute security, but we treat your connected-account credentials as the most sensitive thing we hold and design accordingly.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>7. Your rights</h2>
          <p style={pStyle}>Subject to applicable law (including India&apos;s Digital Personal Data Protection Act, 2023, and — if you&apos;re in the EU/EEA — the GDPR), you have the right to access the personal data we hold about you, correct it if it&apos;s inaccurate, request its deletion, and request a copy of it in a portable format. Email <a href="mailto:rj@rootn.ai" style={{ color: '#FF9933' }}>rj@rootn.ai</a> for any of these requests.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>8. Children&apos;s privacy</h2>
          <p style={pStyle}>VyralBro is not directed at, and is not intended for use by, anyone under 18. We don&apos;t knowingly collect data from children.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>9. Changes to this policy</h2>
          <p style={pStyle}>If we make material changes to this policy, we&apos;ll update the &ldquo;Last updated&rdquo; date above and, where the change is significant, notify you by email.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>10. Contact</h2>
          <p style={pStyle}>Questions about this policy or your data: <a href="mailto:rj@rootn.ai" style={{ color: '#FF9933' }}>rj@rootn.ai</a>.</p>
        </div>
      </div>
    </div>
  )
}
