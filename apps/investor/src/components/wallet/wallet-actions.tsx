'use client'
// apps/investor/src/components/wallet/wallet-actions.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  wallets: Array<{ id: string; currency: string; balance: number }>
  bankAccounts: Array<{ id: string; bankName: string; accountNumberMasked: string; verifiedAt: Date | null }>
  whitelistedAddresses: Array<{ id: string; address: string; network: string; label: string | null; verifiedAt: Date | null }>
}

export function WalletActions({ wallets, bankAccounts, whitelistedAddresses }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<'deposit' | 'withdraw' | null>(null)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [destType, setDestType] = useState<'bank' | 'crypto'>('bank')
  const [destId, setDestId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function submitWithdrawal() {
    setError(null)
    const numAmt = parseFloat(amount)
    if (!numAmt || numAmt < 100) { setError('Minimum withdrawal is £100'); return }
    if (!destId) { setError('Please select a destination'); return }

    setLoading(true)
    const res = await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'withdraw', amount: numAmt, currency, destinationType: destType, destinationRef: destId }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) { setSuccess(true); router.refresh() }
    else setError(data.error?.message ?? 'Withdrawal failed')
  }

  return (
    <>
      <div className="flex gap-2.5 items-start">
        <button
          onClick={() => setModal('deposit')}
          className="px-4 py-2.5 bg-nexus-gold text-nexus-bg text-[13px] font-semibold rounded-lg hover:bg-nexus-gold2 transition-colors"
        >
          Deposit Funds
        </button>
        <button
          onClick={() => setModal('withdraw')}
          className="px-4 py-2.5 bg-transparent text-nexus-text text-[13px] border border-nexus2 rounded-lg hover:border-nexus-gold hover:text-nexus-gold transition-colors"
        >
          Withdraw
        </button>
      </div>

      {/* Deposit modal */}
      {modal === 'deposit' && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-nexus-bg2 border border-nexus2 rounded-xl p-6 w-[440px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-[20px] mb-2">Deposit Funds</h2>
            <p className="text-[12.5px] text-nexus-muted mb-5 leading-[1.7]">
              Send USDC, USDT, or ETH to your platform wallet address. Funds are automatically credited once confirmed on-chain.
            </p>
            <div className="bg-nexus-bg3 border border-nexus rounded-lg p-4 mb-4">
              <div className="text-[9.5px] tracking-[1.5px] uppercase text-nexus-muted mb-2">Your USDC/USDT deposit address (Polygon)</div>
              <div className="font-mono text-[12px] text-nexus-text break-all">
                {wallets[0]?.currency === 'USDC'
                  ? 'Connect Fireblocks to generate your deposit address'
                  : 'Deposit address will appear here once wallet is configured'}
              </div>
            </div>
            <div className="text-[11.5px] text-nexus-muted leading-[1.7] mb-5">
              ⚠ Only send from a verified wallet address. Transfers from unverified sources may be subject to additional AML review and delays.
              Minimum deposit: £500 equivalent.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-nexus rounded-lg text-[12.5px] text-nexus-muted hover:border-nexus2 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw modal */}
      {modal === 'withdraw' && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-nexus-bg2 border border-nexus2 rounded-xl p-6 w-[440px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-[20px] mb-2">{success ? 'Request Submitted' : 'Withdraw Funds'}</h2>

            {success ? (
              <>
                <p className="text-[12.5px] text-nexus-muted leading-[1.7] mb-5">
                  Your withdrawal request has been submitted and is pending review. Processing typically takes 1–2 business days.
                </p>
                <button onClick={() => { setModal(null); setSuccess(false) }} className="w-full py-2.5 bg-nexus-gold text-nexus-bg text-[13px] font-semibold rounded-lg">Done</button>
              </>
            ) : (
              <>
                <p className="text-[12.5px] text-nexus-muted mb-5 leading-[1.7]">Withdrawals are processed to verified destinations only.</p>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-[9.5px] tracking-[1.2px] uppercase text-nexus-muted mb-1.5">Amount (£)</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 5000" min="100"
                      className="w-full px-3 py-2.5 bg-nexus-bg3 border border-nexus2 rounded-lg text-nexus-text font-mono text-[13px] outline-none focus:border-nexus-gold transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[9.5px] tracking-[1.2px] uppercase text-nexus-muted mb-1.5">Destination type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['bank', 'crypto'] as const).map((t) => (
                        <button key={t} onClick={() => setDestType(t)}
                          className={`py-2 rounded-lg text-[12px] border transition-colors ${destType === t ? 'border-nexus-gold text-nexus-gold bg-nexus-gold/5' : 'border-nexus text-nexus-muted hover:border-nexus2'}`}>
                          {t === 'bank' ? '🏦 Bank account' : '⛓ Crypto address'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9.5px] tracking-[1.2px] uppercase text-nexus-muted mb-1.5">
                      {destType === 'bank' ? 'Select bank account' : 'Select whitelisted address'}
                    </label>
                    <select value={destId} onChange={(e) => setDestId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-nexus-bg3 border border-nexus2 rounded-lg text-nexus-text text-[12.5px] outline-none focus:border-nexus-gold"
                      style={{ appearance: 'none' }}>
                      <option value="">— Select destination —</option>
                      {destType === 'bank'
                        ? bankAccounts.filter(b => b.verifiedAt).map(b => (
                          <option key={b.id} value={b.id}>{b.bankName} ···{b.accountNumberMasked}</option>
                        ))
                        : whitelistedAddresses.filter(a => a.verifiedAt).map(a => (
                          <option key={a.id} value={a.id}>{a.label ?? a.address.slice(0, 12)}... · {a.network}</option>
                        ))
                      }
                    </select>
                    {destType === 'bank' && bankAccounts.filter(b => b.verifiedAt).length === 0 && (
                      <p className="mt-1.5 text-[11px] text-nexus-muted">No verified bank accounts. Add one in Account Settings.</p>
                    )}
                  </div>
                </div>

                {error && <div className="mb-3 text-[12px] text-nexus-red">{error}</div>}

                <div className="flex gap-2">
                  <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-nexus rounded-lg text-[12.5px] text-nexus-muted hover:border-nexus2 transition-colors">Cancel</button>
                  <button onClick={submitWithdrawal} disabled={loading}
                    className="flex-1 py-2.5 bg-nexus-gold text-nexus-bg text-[12.5px] font-semibold rounded-lg hover:bg-nexus-gold2 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                    {loading && <span className="w-3.5 h-3.5 border-2 border-nexus-bg border-t-transparent rounded-full animate-spin" />}
                    Submit Request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
