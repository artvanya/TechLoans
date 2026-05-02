import type { PrismaClient } from '@prisma/client'

export async function deleteDealWithRelations(prisma: PrismaClient, dealId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.payout.deleteMany({ where: { investment: { dealId } } })
    await tx.transaction.deleteMany({ where: { investment: { dealId } } })
    await tx.investment.deleteMany({ where: { dealId } })
    await tx.dealImage.deleteMany({ where: { dealId } })
    await tx.dealDocument.deleteMany({ where: { dealId } })
    await tx.dealUpdate.deleteMany({ where: { dealId } })
    await tx.servicingLog.deleteMany({ where: { dealId } })
    await tx.repaymentScheduleItem.deleteMany({ where: { dealId } })
    await tx.autoInvestMatch.deleteMany({ where: { dealId } })
    await tx.deal.delete({ where: { id: dealId } })
  })
}

/** Admin empty “New Open Investment” form → title Open Investment. */
export async function removePlaceholderOpenInvestmentDeals(prisma: PrismaClient) {
  const junk = await prisma.deal.findMany({
    where: { isPortfolio: false, name: 'Open Investment' },
    select: { id: true },
  })
  for (const row of junk) {
    await deleteDealWithRelations(prisma, row.id)
  }
  return junk.length
}

/** Dev seed deal from prisma/seed.ts — safe to drop when replacing with real listings. */
export async function removeNxsdDev001Deal(prisma: PrismaClient) {
  const dev = await prisma.deal.findUnique({ where: { internalId: 'NXSD-DEV-001' } })
  if (!dev || dev.isPortfolio) return 0
  await deleteDealWithRelations(prisma, dev.id)
  return 1
}
