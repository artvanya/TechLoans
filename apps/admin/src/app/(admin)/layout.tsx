// apps/admin/src/app/(admin)/layout.tsx
// Authenticated admin shell with sidebar + topbar
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Link from 'next/link'

const NAV = [
  { href: '/',             label: 'Overview',       icon: '⊞' },
  { href: '/deals',        label: 'Deal Pipeline',  icon: '≡' },
  { href: '/deals/create', label: 'Create Deal',    icon: '+' },
  { href: '/repayments',   label: 'Repayments',     icon: '↑' },
  { href: '/investors',    label: 'Investors',      icon: '◎' },
  { href: '/withdrawals',  label: 'Withdrawals',    icon: '↓' },
  { href: '/kyc',          label: 'KYC Queue',      icon: '✓' },
  { href: '/audit',        label: 'Audit Log',      icon: '§' },
  { href: '/settings',     label: 'Settings',       icon: '⚙' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = session.user as any

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        background: '#111215',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '2px', color: '#C4A355' }}>NEXUS</div>
          <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#7C7A74', marginTop: '2px' }}>
            Operator Console
          </div>
          <div style={{
            background: 'rgba(224,92,92,0.1)', color: '#E05C5C',
            fontSize: '9px', fontWeight: 600, padding: '2px 6px',
            borderRadius: '4px', marginTop: '6px', display: 'inline-block',
            letterSpacing: '0.5px',
          }}>
            INTERNAL ONLY
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '9px 18px',
                fontSize: '12.5px',
                color: '#7C7A74',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '13px', width: '16px', textAlign: 'center', flexShrink: 0, opacity: 0.75 }}>
                {icon}
              </span>
              {label}
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#1E2028', border: '1px solid rgba(255,255,255,0.13)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, flexShrink: 0, color: '#E8E6DF',
            }}>
              {(user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.firstName} {user.lastName}
              </div>
              <div style={{ fontSize: '10px', color: '#7C7A74' }}>{user.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: 52, flexShrink: 0,
          background: '#111215',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}>
          <div style={{ fontSize: '13px', color: '#7C7A74', fontFamily: "'DM Mono', monospace" }}>
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <Link
            href="/deals/create"
            style={{
              background: '#C4A355', color: '#0A0A0C',
              padding: '6px 14px', borderRadius: '7px',
              fontSize: '12px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            + New Deal
          </Link>
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
