// apps/investor/src/app/(portal)/wallet/page.tsx
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Badge } from '@/components/ui/badge'
import { WalletActions } from '@/components/wallet/wallet-actions'

export const dynamic = 'force-dynamic'

export default async function WalletPage() {
  const session = await getSession()
  const userId = session!.user.id

  const profile = await prisma.investorProfile.findUnique({
    where: { userId },
    include: {
      wallets: true,
      whitelistedAddresses: true,
      bankAccounts: true,
    },
  })

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const totalGbp = profile?.wallets.reduce((s, w) => {
    if (w.currency === 'GBP') return s + Number(w.balance)
    if (w.currency === 'USDC' || w.currency === 'USDT') return s + Number(w.balance) * 0.997
    return s
  }, 0) ?? 0

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true, lastLoginAt: true, lastLoginIp: true } })

  const txTypeLabel: Record<string, string> = {
    DEPOSIT: 'Deposit', WITHDRAWAL: 'Withdrawal', INVESTMENT: 'Investment',
    REPAYMENT_INTEREST: 'Interest Payment', REPAYMENT_PRINCIPAL: 'Principal Repayment',
    FEE: 'Platform Fee', PENALTY: 'Penalty', REFUND: 'Refund',
  }
  const cryptoIcons: Record<string, string> = { USDC: '$', USDT: '₮', ETH: 'Ξ', GBP: '£' }
  const cryptoColors: Record<string, string> = { USDC: 'rgba(38,161,123,0.15)', USDT: 'rgba(38,161,123,0.15)', ETH: 'rgba(98,126,234,0.12)', GBP: 'rgba(191,160,99,0.12)' }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      {/* Hero balance */}
      <div className="bg-nexus-bg2 border border-nexus rounded-lg p-7">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[9.5px] tracking-[2px] uppercase text-nexus-muted mb-3">Total Wallet Balance</div>
            <div className="font-mono text-[40px] font-medium tracking-[-2px] leading-none">{formatCurrency(totalGbp)}</div>
            <div className="text-[12.5px] text-nexus-muted mt-2">
              Across {profile?.wallets.length ?? 0} currencies · Fireblocks MPC custody · Verified source of funds
            </div>
          </div>
          <WalletActions wallets={profile?.wallets.map(w => ({ id: w.id, currency: w.currency, balance: Number(w.balance) })) ?? []} bankAccounts={profile?.bankAccounts ?? []} whitelistedAddresses={profile?.whitelistedAddresses ?? []} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4 items-start">
        <div className="flex flex-col gap-4">
          {/* Asset balances */}
          <Panel>
            <PanelHeader title="Digital Asset Balances" subtitle="Held in Fireblocks institutional MPC custody" />
            <div className="divide-y divide-nexus">
              {profile?.wallets.length === 0 ? (
                <div className="px-5 py-6 text-[12px] text-nexus-muted text-center">No wallets configured</div>
              ) : profile?.wallets.map((w) => (
                <div key={w.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold flex-shrink-0"
                    style={{ background: cryptoColors[w.currency] ?? 'rgba(255,255,255,0.06)', color: w.currency === 'GBP' ? '#BFA063' : '#26A17B' }}>
                    {cryptoIcons[w.currency] ?? w.currency[0]}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{w.currency === 'USDC' ? 'USDC — USD Coin' : w.currency === 'USDT' ? 'USDT — Tether' : w.currency === 'ETH' ? 'ETH — Ethereum' : 'GBP — Sterling'}</div>
                    <div className="text-[11px] text-nexus-muted mt-0.5">
                      {w.fireblocksAddress ? `${w.fireblocksAddress.slice(0, 8)}...${w.fireblocksAddress.slice(-6)} · Polygon` : 'Platform wallet'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[15px] font-medium">{Number(w.balance).toLocaleString('en-GB', { maximumFractionDigits: 4 })}</div>
                    <div className="text-[11px] text-nexus-muted mt-0.5">≈ {formatCurrency(Number(w.balance) * (w.currency === 'ETH' ? 2700 : 0.997))}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Transaction log */}
          <Panel>
            <PanelHeader title="Transaction History" subtitle="All transactions · immutable record" />
            <table className="w-full">
              <thead>
                <tr>{['Description', 'Type', 'Amount', 'Tx Hash', 'Date'].map((h) => (
                  <th key={h} className="text-[9px] tracking-[1.5px] uppercase text-nexus-hint font-medium px-4 py-2.5 text-left border-b border-nexus [&:not(:first-child)]:text-right">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-[12px] text-nexus-muted">No transactions yet</td></tr>
                ) : transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-nexus last:border-0">
                    <td className="px-4 py-3">
                      <div className="text-[12.5px] font-medium">{tx.description ?? txTypeLabel[tx.type] ?? tx.type}</div>
                    </td>
                    <td className="px-4 py-3 text-right"><Badge status={tx.status}>{txTypeLabel[tx.type] ?? tx.type}</Badge></td>
                    <td className={`px-4 py-3 text-right font-mono text-[12px] ${['DEPOSIT','REPAYMENT_INTEREST','REPAYMENT_PRINCIPAL','REFUND'].includes(tx.type) ? 'text-nexus-teal' : 'text-nexus-red'}`}>
                      {['DEPOSIT','REPAYMENT_INTEREST','REPAYMENT_PRINCIPAL','REFUND'].includes(tx.type) ? '+' : '−'}{formatCurrency(Math.abs(Number(tx.amount)))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[10px] text-nexus-muted">
                      {tx.txHash ? `${tx.txHash.slice(0, 8)}...${tx.txHash.slice(-5)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] text-nexus-muted">{formatDate(tx.createdAt.toISOString(), 'short')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Security status */}
          <Panel>
            <div className="p-5">
              <div className="text-[10px] tracking-[1.5px] uppercase text-nexus-gold mb-4">Security Status</div>
              {[
                { label: 'KYC Level', value: profile?.kycLevel ?? '—', badge: profile?.kycStatus === 'APPROVED' ? <Badge variant="green">Verified</Badge> : <Badge variant="amber">Pending</Badge> },
                { label: 'Two-Factor Auth', badge: user?.twoFactorEnabled ? <Badge variant="green">Enabled · TOTP</Badge> : <Badge variant="red">Disabled</Badge> },
                { label: 'Whitelist', value: `${profile?.whitelistedAddresses.length ?? 0} address${(profile?.whitelistedAddresses.length ?? 0) !== 1 ? 'es' : ''}` },
                { label: 'Source of Funds', badge: <Badge variant="green">Verified</Badge> },
                { label: 'Last Login', value: user?.lastLoginAt ? formatDate(user.lastLoginAt.toISOString(), 'short') : '—' },
                { label: 'Session IP', value: user?.lastLoginIp ?? '—' },
              ].map(({ label, value, badge }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-nexus last:border-0">
                  <span className="text-[12px] text-nexus-muted">{label}</span>
                  {badge ?? <span className="font-mono text-[12px]">{value}</span>}
                </div>
              ))}
            </div>
          </Panel>

          {/* Custody explanation */}
          <Panel>
            <div className="p-5">
              <div className="text-[10px] tracking-[1.5px] uppercase text-nexus-gold mb-3">Custody Infrastructure</div>
              <p className="text-[12.5px] text-nexus-muted leading-[1.8] mb-4">
                All digital assets are held in <strong className="text-nexus-text">Fireblocks MPC wallets</strong> — institutional-grade custody used by leading banks globally. Private keys are never exposed.
              </p>
              {[
                { icon: '🔐', title: 'MPC Key Architecture', sub: 'No single point of failure · co-signing required' },
                { icon: '🛡️', title: 'SOC 2 Type II Certified', sub: 'Independent security audit passed annually' },
                { icon: '📋', title: 'Whitelisted Withdrawals', sub: 'Funds only exit to pre-approved addresses' },
                { icon: '⛓️', title: 'On-chain Settlement', sub: 'All allocations logged to Polygon' },
              ].map(({ icon, title, sub }) => (
                <div key={title} className="flex items-center gap-3 p-3 bg-nexus-bg3 rounded-lg mb-2 last:mb-0">
                  <span className="text-[16px] flex-shrink-0">{icon}</span>
                  <div>
                    <div className="text-[12.5px] font-medium">{title}</div>
                    <div className="text-[11px] text-nexus-muted mt-0.5">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Whitelisted addresses */}
          <Panel>
            <PanelHeader title="Withdrawal Whitelist" action={<button className="text-[11px] text-nexus-muted border border-nexus px-2 py-1 rounded hover:border-nexus2 transition-colors">+ Add</button>} />
            <div className="divide-y divide-nexus">
              {profile?.whitelistedAddresses.length === 0 ? (
                <div className="px-5 py-4 text-[12px] text-nexus-muted">No whitelisted addresses</div>
              ) : profile?.whitelistedAddresses.map((a) => (
                <div key={a.id} className="px-5 py-3.5">
                  <div className="font-mono text-[11px] text-nexus-text mb-1">{a.address}</div>
                  <div className="text-[10.5px] text-nexus-muted">{a.label ?? 'Wallet'} · {a.network} · {a.verifiedAt ? `Verified ${formatDate(a.verifiedAt.toISOString(), 'short')}` : 'Pending verification'}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
