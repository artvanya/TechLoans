'use client'
// apps/investor/src/components/charts/allocation-donut.tsx
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { Panel } from '@/components/ui/panel'

const COLORS = ['#2CC89A', '#BFA063', '#5B9CF6', '#9D8DF7', '#E8A030']

export function AllocationDonut({ allocations, total }: { allocations: Record<string, number>; total: number }) {
  const data = Object.entries(allocations).map(([name, value]) => ({ name, value }))

  return (
    <Panel>
      <div className="p-5">
        <div className="text-[12.5px] font-semibold mb-4">Capital Allocation</div>
        <div className="relative w-[130px] h-[130px] mx-auto mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.length > 0 ? data : [{ name: 'None', value: 1 }]} cx="50%" cy="50%"
                innerRadius={42} outerRadius={58} dataKey="value" strokeWidth={0}>
                {(data.length > 0 ? data : [{ name: 'None', value: 1 }]).map((_, i) => (
                  <Cell key={i} fill={data.length > 0 ? COLORS[i % COLORS.length] : 'rgba(255,255,255,0.06)'} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="font-mono text-[16px] font-medium">{total > 0 ? formatCurrency(total, 'GBP', true) : '—'}</div>
            <div className="text-[9px] text-nexus-muted tracking-[1px] uppercase mt-0.5">deployed</div>
          </div>
        </div>
        {data.map(({ name, value }, i) => (
          <div key={name} className="flex items-center justify-between py-2 border-b border-nexus last:border-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-[12px] text-nexus-muted">{name}</span>
            </div>
            <span className="font-mono text-[12px]">{formatCurrency(value)}</span>
          </div>
        ))}
        {data.length === 0 && <div className="text-[12px] text-nexus-muted text-center py-2">No positions</div>}
      </div>
    </Panel>
  )
}
