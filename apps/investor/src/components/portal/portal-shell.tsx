'use client'
// apps/investor/src/components/portal/portal-shell.tsx
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import type { Session } from 'next-auth'

const NAV = [
  { href: '/portfolio',    label: 'Portfolio',                  group: 'Investor',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><polyline points="1,13 5,8 9,10 14,3"/><line x1="1" y1="15" x2="15" y2="15"/></svg> },
  { href: '/deals',        label: 'Investment Opportunities',  group: 'Investor',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 4h12M2 8h9M2 12h6"/></svg> },
  { href: '/track-record', label: 'Track Record',              group: 'Investor',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="6.5"/><polyline points="5,8 7.5,10.5 11,6"/></svg> },
  { href: '/wallet',       label: 'Wallet & Security',         group: 'Capital',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="4" width="14" height="10" rx="2"/><path d="M1 7.5h14"/><circle cx="11.5" cy="11" r="1" fill="currentColor" stroke="none"/></svg> },
  { href: '/credit-line',  label: 'Credit Line',               group: 'Capital',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 8h12M8 2v12"/><circle cx="8" cy="8" r="6.5"/></svg> },
  { href: '/auto-invest',  label: 'Auto-Invest',               group: 'Capital',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5l2.5 1.5"/></svg> },
  { href: '/onboarding',   label: 'Account & KYC',             group: 'Account',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg> },
]

function groupItems(items: typeof NAV) {
  const groups: Record<string, typeof NAV> = {}
  for (const item of items) {
    if (!groups[item.group]) groups[item.group] = []
    groups[item.group].push(item)
  }
  return Object.entries(groups)
}

interface PortalShellProps {
  session: Session
  children: React.ReactNode
}

export function PortalShell({ session, children }: PortalShellProps) {
  const pathname = usePathname()
  const user = session.user as any

  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() ?? 'NX'

  return (
    <div className="flex h-screen overflow-hidden bg-nexus-bg">
      {/* Sidebar */}
      <aside className="w-[224px] flex-shrink-0 bg-nexus-bg2 border-r border-nexus flex flex-col">
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-nexus">
          <div className="font-serif text-[20px] tracking-[4px] text-nexus-gold uppercase">Nexus</div>
          <div className="text-[9px] tracking-[2.5px] uppercase text-nexus-muted mt-1">Private Credit · Institutional</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {groupItems(NAV).map(([group, items]) => (
            <div key={group}>
              <div className="px-5 pt-3 pb-1 text-[9px] tracking-[2px] uppercase text-nexus-hint">{group}</div>
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 px-5 py-2.5 text-[12.5px] transition-all border-l-2',
                      active
                        ? 'text-nexus-text border-nexus-gold bg-nexus-gold/5 font-medium'
                        : 'text-nexus-muted border-transparent hover:text-nexus-text hover:bg-white/[0.025]'
                    )}
                  >
                    <span className={cn('w-3.5 h-3.5 flex-shrink-0', active ? 'opacity-90' : 'opacity-55')}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>



        {/* User footer */}
        <div className="p-4 border-t border-nexus">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nexus-gold to-[#7A5C20] flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium truncate">{user.name ?? user.email}</div>
              <div className="text-[10px] text-nexus-gold truncate">
                {user.kycStatus === 'APPROVED' ? `⬡ ${user.investorTier}` : 'Verification pending'}
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="ml-auto text-nexus-hint hover:text-nexus-muted transition-colors"
              title="Sign out"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M11 11l3-3-3-3M14 8H6"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-[54px] flex-shrink-0 bg-nexus-bg2 border-b border-nexus flex items-center justify-between px-7">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 border border-nexus rounded-md bg-nexus-bg3">
              <span className="w-1.5 h-1.5 rounded-full bg-nexus-teal animate-pulse" />
              <span className="text-[10px] text-nexus-muted tracking-[0.5px]">All systems operational</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userId={user.id} />
            {/* Investor name badge */}
            <div className="flex items-center gap-2 pl-3 border-l border-nexus">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-nexus-gold to-[#7A5C20] flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
                {initials}
              </div>
              <span className="text-[12.5px] font-medium text-nexus-text">{user.name ?? user.email}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-7">
          {children}
        </main>
      </div>
    </div>
  )
}

function NotificationBell({ userId }: { userId: string }) {
  // Fetches unread count from API
  return (
    <button className="w-8 h-8 rounded-lg border border-nexus flex items-center justify-center text-nexus-muted hover:border-nexus2 hover:text-nexus-text transition-all relative">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M8 1a5 5 0 0 1 5 5v3l1.5 2.5h-13L3 9V6a5 5 0 0 1 5-5z"/>
        <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/>
      </svg>
    </button>
  )
}
