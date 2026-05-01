// apps/admin/src/lib/session.ts
import { getAdminSession } from './admin-session'

export async function getSession() {
  const session = await getAdminSession()
  if (!session) return null
  return {
    user: {
      id: session.id,
      email: session.email,
      name: `${session.firstName} ${session.lastName}`.trim(),
      role: session.role,
      firstName: session.firstName,
      lastName: session.lastName,
      permissions: [] as string[],
    },
  }
}
