// apps/investor/src/app/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Link from 'next/link'

export default async function RootPage() {
  const session = await getSession()
  if (session) redirect('/portfolio')

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: '#09090B', minHeight: '100vh', color: '#E8E6DF' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', height: 62 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, letterSpacing: '4px', color: '#BFA063' }}>NEXUS</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/login" style={{ padding: '7px 18px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#A0A09A', fontSize: 13, textDecoration: 'none', transition: 'all .2s' }}>
            Sign in
          </Link>
          <Link href="/register" style={{ padding: '7px 18px', background: '#BFA063', borderRadius: 8, color: '#09090B', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Create Account
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 160, paddingBottom: 100, textAlign: 'center', maxWidth: 760, margin: '0 auto', padding: '160px 24px 100px' }}>
        <div style={{ display: 'inline-block', padding: '4px 14px', border: '1px solid rgba(191,160,99,0.3)', borderRadius: 100, fontSize: 10.5, letterSpacing: '2px', textTransform: 'uppercase', color: '#BFA063', marginBottom: 28 }}>
          Private Credit · Senior Secured Real Estate
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 22, fontFamily: 'Georgia, serif' }}>
          Institutional-Grade<br />
          <span style={{ color: '#BFA063' }}>Real Estate Lending</span>
        </h1>
        <p style={{ fontSize: 16.5, color: '#9A9893', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px', fontWeight: 400 }}>
          Access senior secured bridge loans backed by real estate collateral. Fixed returns, transparent deal flow, and first-charge security on every position.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{ padding: '13px 32px', background: '#BFA063', borderRadius: 10, color: '#09090B', fontSize: 14, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.3px' }}>
            Get Started →
          </Link>
          <Link href="/login" style={{ padding: '13px 32px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#C8C6BF', fontSize: 14, textDecoration: 'none' }}>
            Sign into account
          </Link>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0D0D10' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', textAlign: 'center' }}>
          {[
            { value: '13–24%', label: 'Target APR' },
            { value: '£500k+', label: 'Avg. Loan Size' },
            { value: '≤70%', label: 'Max LTV' },
            { value: '1st Charge', label: 'Security Type' },
          ].map(({ value, label }) => (
            <div key={label} style={{ padding: '32px 20px', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 26, fontWeight: 600, color: '#BFA063', marginBottom: 6 }}>{value}</div>
              <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#5C5B57' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '90px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#5C5B57', marginBottom: 12 }}>How it works</div>
          <h2 style={{ fontSize: 32, fontWeight: 700, fontFamily: 'Georgia, serif', color: '#E8E6DF' }}>Three steps to start earning</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
          {[
            { step: '01', title: 'Create your account', body: 'Register in under 2 minutes. Provide your name, email and a password — no email confirmation delays.' },
            { step: '02', title: 'Browse opportunities', body: 'Review curated, senior secured bridge loans with full deal details: LTV, APR, collateral type and borrower purpose.' },
            { step: '03', title: 'Invest & earn', body: 'Allocate capital to selected deals. Track performance, upcoming repayments and your full portfolio in real time.' },
          ].map(({ step, title, body }) => (
            <div key={step} style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 28 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '2px', color: '#BFA063', marginBottom: 14 }}>{step}</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: '#E8E6DF' }}>{title}</h3>
              <p style={{ fontSize: 13, color: '#7A7873', lineHeight: 1.65 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Deal snapshot ───────────────────────────────────────────────── */}
      <section style={{ background: '#0D0D10', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '90px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#5C5B57', marginBottom: 12 }}>Deal structure</div>
            <h2 style={{ fontSize: 32, fontWeight: 700, fontFamily: 'Georgia, serif' }}>What you invest in</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {[
              { icon: '⊞', title: 'Residential Bridge Loans', desc: 'Short-term financing for residential property acquisition and renovation. First-charge mortgage security with LTVs typically under 70%.' },
              { icon: '◈', title: 'Commercial Property Finance', desc: 'Office, retail and mixed-use assets with income-producing covenants. Structured with senior priority and detailed exit planning.' },
              { icon: '◆', title: 'Land & Development Finance', desc: 'Planning uplift and development exit loans secured against land with full legal charge and independent valuation.' },
              { icon: '◎', title: 'Portfolio Track Record', desc: 'View our historical portfolio: closed deals, repayment histories, and the full spectrum of assets we have financed.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: 18, padding: 24, background: '#09090B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                <div style={{ fontSize: 20, flexShrink: 0, color: '#BFA063', width: 32, marginTop: 2 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 7, color: '#E8E6DF' }}>{title}</div>
                  <div style={{ fontSize: 12.5, color: '#7A7873', lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '100px 24px' }}>
        <h2 style={{ fontSize: 36, fontWeight: 700, fontFamily: 'Georgia, serif', marginBottom: 16 }}>
          Ready to start investing?
        </h2>
        <p style={{ fontSize: 15, color: '#7A7873', marginBottom: 40, maxWidth: 460, margin: '0 auto 40px' }}>
          Join investors already earning fixed returns on secured real estate loans.
        </p>
        <Link href="/register" style={{ display: 'inline-block', padding: '14px 40px', background: '#BFA063', borderRadius: 10, color: '#09090B', fontSize: 15, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.3px' }}>
          Create your account — it&apos;s free
        </Link>
        <div style={{ marginTop: 20, fontSize: 11.5, color: '#4A4A47' }}>
          No commitment required. Capital at risk. Investments are not FSCS protected.
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, letterSpacing: '3px', color: '#5C5B57' }}>NEXUS</div>
        <div style={{ fontSize: 11, color: '#4A4A47' }}>Private platform · Restricted access · Not regulated investment advice</div>
      </footer>

    </div>
  )
}
