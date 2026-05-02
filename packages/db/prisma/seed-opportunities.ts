/**
 * Marketplace only: removes junk “Open Investment” + dev test NXSD-DEV-001, upserts NXSD-DEMO-001…006 with HTTPS cover images.
 * Does NOT read or write portfolio / track-record deals (isPortfolio=true).
 * Removes NXSD-DEV-001 unless KEEP_NXSD_DEV_001=1.
 *
 * Run from packages/db:
 *   OPPORTUNITIES_SEED=1 pnpm exec tsx prisma/seed-opportunities.ts
 * or:
 *   pnpm db:seed:opportunities
 */

import { PrismaClient } from '@prisma/client'
import {
  removePlaceholderOpenInvestmentDeals,
  removeNxsdDev001Deal,
} from './lib/deal-cascade-delete'
import { opportunitySpecs } from './lib/investment-opportunity-specs'

const prisma = new PrismaClient()

async function main() {
  if (process.env.OPPORTUNITIES_SEED !== '1') {
    console.error(
      'Set OPPORTUNITIES_SEED=1 to run (e.g. OPPORTUNITIES_SEED=1 pnpm exec tsx prisma/seed-opportunities.ts)'
    )
    process.exit(1)
  }

  const admin = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
    select: { id: true },
  })
  if (!admin) {
    console.error('No admin user found. Create one first (e.g. pnpm db:seed in development).')
    process.exit(1)
  }

  const nOpen = await removePlaceholderOpenInvestmentDeals(prisma)
  if (nOpen > 0) console.log(`Removed ${nOpen} placeholder “Open Investment” deal(s).`)

  if (process.env.KEEP_NXSD_DEV_001 === '1') {
    console.log('Skipped removing NXSD-DEV-001 (KEEP_NXSD_DEV_001=1).')
  } else {
    const nDev = await removeNxsdDev001Deal(prisma)
    if (nDev > 0) console.log('Removed NXSD-DEV-001 (dev test bridge deal).')
  }

  const specs = opportunitySpecs()
  for (const spec of specs) {
    const { _imageUrl, ...dealData } = spec
    const deal = await prisma.deal.upsert({
      where: { internalId: dealData.internalId },
      update: dealData,
      create: { ...dealData, createdById: admin.id },
    })

    await prisma.dealImage.deleteMany({ where: { dealId: deal.id } })
    await prisma.dealImage.create({
      data: {
        dealId: deal.id,
        storageKey: _imageUrl,
        fileName: 'cover.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 0,
        isPrimary: true,
        sortOrder: 0,
        uploadedById: admin.id,
      },
    })
  }

  console.log(
    '✅ Opportunities seed: NXSD-DEMO-001…006 upserted with primary images. Track record untouched.'
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
