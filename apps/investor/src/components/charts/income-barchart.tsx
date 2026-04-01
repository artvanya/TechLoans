'use client'
// apps/investor/src/components/charts/income-barchart.tsx
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Panel } from '@/components/ui/panel'

interface Props {
  data: Array<{ month: string; amount: number }>
}

export function IncomeBarchart({ data }: Props) {
  return (
    <Panel>
      <div className="p-5">
        <div className="text-[12.5px] font-semibold mb-1">Monthly Income</div>
        <div className="text-[11px] text-nexus-muted mb-4">Interest receipts · last 6 months</div>
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#7A7873', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#7A7873', fontFamily: 'Outfit' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `£${v / 1000}k` : `£${v}`} />
              <Tooltip
                contentStyle={{ background: '#141618', border: '1px solid rgba(255,255,255,0.11)', borderRadius: '8px', fontSize: 12 }}
                labelStyle={{ color: '#E8E6DF' }}
                formatter={(v: number) => [`£${v.toLocaleString()}`, 'Income']}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="amount" fill="rgba(191,160,99,0.25)" stroke="#BFA063" strokeWidth={1.5} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  )
}
