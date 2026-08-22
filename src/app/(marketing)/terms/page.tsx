// src/app/(marketing)/terms/page.tsx
//
// Real Terms of Service page — companion to /privacy, same motivation:
// LoginClient.tsx already links here but the route didn't exist. Meta App
// Review and Business Verification expect real Terms alongside a real
// Privacy Policy. Written from what the app actually does today, including
// its current beta status — not aspirational claims about uptime, refunds,
// or features that don't exist yet. Have a lawyer review before relying on
// this for anything beyond getting past App Review.

const LAST_UPDATED = 'August 22, 2026'

const sectionStyle = { marginBottom: 40 }
const h2Style = { fontSize: '1.3rem', fontWeight: 800, marginBottom: 14, color: '#F2F2F8', letterSpacing: '-0.01em' }
const pStyle = { fontSize: '0.92rem', color: '#B0B0C4', lineHeight: 1.8, marginBottom: 12 }
const liStyle = { fontSize: '0.92rem', color: '#B0B0C4', lineHeight: 1.8, marginBottom: 8 }

export default function TermsOfServicePage() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#06060A', color: '#F2F2F8', minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '80px 24px 120px' }}>
        <a href="/" style={{ fontSize: '0.82rem', color: '#8585A0', textDecoration: 'none' }}>&larr; Back to VyralBro</a>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '24px 0 8px' }}>Terms of Service</h1>
        <p style={{ fontSize: '0.82rem', color: '#5A5A72', marginBottom: 48 }}>Last updated: {LAST_UPDATED}</p>

        <div style={sectionStyle}>
          <p style={pStyle}>
            These terms govern your use of VyralBro, a product operated by Rootn.ai (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
            &ldquo;our&rdquo;). By creating an account or using VyralBro, you agree to these terms. If you don&apos;t
            agree, please don&apos;t use the service.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>1. What VyralBro does</h2>
          <p style={pStyle}>VyralBro lets you write one piece of content, have it AI-adapted for different social platforms, and publish it to the platforms you&apos;ve connected (currently Instagram, X/Twitter, and LinkedIn, with more planned) — either immediately or on a schedule. It also shows you performance analytics for what you&apos;ve published.</p>
          <p style={pStyle}><strong>VyralBro is currently in private beta.</strong> Features, pricing, and reliability are still being actively developed. We do not currently guarantee any specific uptime or availability.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>2. Your account</h2>
          <p style={pStyle}>You sign in via Google. You&apos;re responsible for keeping your account secure and for everything that happens under it. You must be at least 18 years old to use VyralBro.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>3. Connecting your social accounts</h2>
          <p style={pStyle}>When you connect Instagram, X/Twitter, or LinkedIn, you authorize VyralBro to access and act on that account within the specific permissions you grant during that platform&apos;s own consent screen — for example, to publish posts and read analytics. You can revoke this at any time by disconnecting the platform in Settings, or by removing VyralBro&apos;s access directly from that platform&apos;s own app-permissions settings.</p>
          <p style={pStyle}>You&apos;re responsible for making sure your use of each connected platform through VyralBro complies with that platform&apos;s own terms and policies (for example, Meta&apos;s Platform Terms, X&apos;s Rules, or LinkedIn&apos;s User Agreement). We&apos;re not responsible for actions a platform takes against your account for content you chose to publish through us.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>4. Your content</h2>
          <p style={pStyle}>You own the content you create and publish through VyralBro. By using the service, you give us permission to store, process, and transmit that content as needed to do what you&apos;ve asked — generating platform-adapted versions of it and sending it to the platforms you&apos;ve connected.</p>
          <p style={pStyle}>You&apos;re responsible for what you post. Don&apos;t use VyralBro to publish anything illegal, infringing, or in violation of a connected platform&apos;s own content policies.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>5. Plans, billing, and AI credits</h2>
          <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
            <li style={liStyle}>VyralBro offers Free, Creator, Pro, and Agency plans, priced in INR, each with a monthly post limit, an AI credit allowance, and a limit on how many platforms you can connect — shown on our pricing page.</li>
            <li style={liStyle}>Paid subscriptions are billed through Razorpay. We don&apos;t store your card or bank details ourselves.</li>
            <li style={liStyle}>AI credits are consumed when you generate platform-adapted content. Unused credits do not currently roll over between billing cycles.</li>
            <li style={liStyle}>We don&apos;t yet have a formal refund policy published. If you have a billing issue, email <a href="mailto:rj@rootn.ai" style={{ color: '#FF9933' }}>rj@rootn.ai</a> and we&apos;ll work it out directly — we&apos;d rather sort it out than hide behind fine print.</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>6. Acceptable use</h2>
          <p style={pStyle}>Don&apos;t use VyralBro to send spam, publish content that violates a connected platform&apos;s policies, attempt to access another user&apos;s account or data, or attempt to interfere with or overload the service.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>7. Termination</h2>
          <p style={pStyle}>You can stop using VyralBro and ask us to delete your account at any time (see our <a href="/privacy#data-deletion" style={{ color: '#FF9933' }}>Privacy Policy</a> for how). We may suspend or terminate accounts that violate these terms, or a connected platform&apos;s policies in a way that puts our own platform access at risk.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>8. Disclaimer and limitation of liability</h2>
          <p style={pStyle}>VyralBro is provided &ldquo;as is,&rdquo; especially given its current beta status. We don&apos;t guarantee that publishing will always succeed, that a connected platform&apos;s API will always be available, or that analytics will always be complete or timely. To the maximum extent permitted by law, we aren&apos;t liable for indirect, incidental, or consequential damages arising from your use of the service, including lost content, lost engagement, or a connected platform suspending your account.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>9. Changes to these terms</h2>
          <p style={pStyle}>We may update these terms as the product evolves. We&apos;ll update the &ldquo;Last updated&rdquo; date above, and notify you by email for material changes.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>10. Governing law</h2>
          <p style={pStyle}>These terms are governed by the laws of India.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>11. Contact</h2>
          <p style={pStyle}>Questions about these terms: <a href="mailto:rj@rootn.ai" style={{ color: '#FF9933' }}>rj@rootn.ai</a>.</p>
        </div>
      </div>
    </div>
  )
}
