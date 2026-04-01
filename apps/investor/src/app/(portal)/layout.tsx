// apps/investor/src/app/(portal)/layout.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { PortalShell } from '@/components/portal/portal-shell'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  return <PortalShell session={session}>{children}</PortalShell>
}
