// apps/admin/src/lib/audit.ts
import { prisma } from '@nexus/db'
import type { AuditAction, Prisma } from '@prisma/client'

interface AuditParams {
  actorId?: string
  actorEmail?: string
  action: AuditAction
  entityType: string
  entityId?: string
  beforeState?: Record<string, unknown>
  afterState?: Record<string, unknown>
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        beforeState: params.beforeState as Prisma.InputJsonValue | undefined,
        afterState: params.afterState as Prisma.InputJsonValue | undefined,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  } catch (err) {
    console.error('[AuditLog] Write failed:', err)
  }
}
