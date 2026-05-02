/**
 * Demo-only data: extra live deals + track-record portfolio rows + DealImage URLs.
 *
 * Track Record shows deals with isPortfolio=true only (admin “portfolio” / past deals).
 * Re-seeds five UA case studies (Малютянка, Козин, Нещеров, Ходосівка, University) with static /track-record/*.png.
 *
 * Run: DEMO_SEED=1 pnpm exec tsx prisma/seed-demo.ts (from packages/db), or pnpm db:seed:demo from repo root.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TR_IMG = {
  malyutyanka: '/track-record/malyutyanka.png',
  kozin: '/track-record/kozin.png',
  university: '/track-record/university.png',
  neshcherov: '/track-record/neshcherov.png',
  khodosivka: '/track-record/khodosivka.png',
} as const

const LIVE_IMG = {
  a: 'https://picsum.photos/id/188/1200/800',
  b: 'https://picsum.photos/id/42/1200/800',
  c: 'https://picsum.photos/id/106/1200/800',
} as const

function dealPayload(
  internalId: string,
  name: string,
  city: string,
  summary: string,
  propertyDescription: string,
  loanAmount: number,
  valuation: number,
  ltv: number,
  apr: number,
  targetRaise: number,
  raised: number,
  imageUrl: string
) {
  return {
    internalId,
    name,
    status: 'LIVE' as const,
    type: 'BRIDGE_FINANCE' as const,
    borrowerType: 'UK SPV',
    borrowerPurpose:
      'Short-term acquisition finance with a clear refinance exit to a high-street lender within 9–12 months. Borrower has executed similar exits twice before.',
    summary,
    propertyType: 'Residential — prime',
    propertyAddress: 'Redacted for demo',
    propertyCity: city,
    propertyRegion: 'England',
    propertyPostcode: 'SW1A 1AA',
    propertyDescription,
    loanAmount,
    propertyValuation: valuation,
    ltv,
    investorApr: apr,
    borrowerRate: apr + 2.5,
    minimumInvestment: 1000,
    loanDurationMonths: 12,
    maturityDate: new Date(Date.now() + 330 * 24 * 60 * 60 * 1000),
    repaymentType: 'MONTHLY_INTEREST_BULLET' as const,
    exitRoute: 'Refinance to term debt',
    targetRaise,
    currentRaised: raised,
    riskGrade: 'A' as const,
    chargeType: 'FIRST_CHARGE' as const,
    valuationSource: 'Independent RICS · within 90 days',
    underwritingSummary:
      'Conservative LTV, first legal charge, and documented exit. Borrower covenant package includes quarterly reporting and cash sweep if DSCR tightens.',
    keyStrengths:
      '• First charge over unencumbered asset\n• LTV buffer vs. forced-sale valuation\n• Experienced sponsor with prior exits on time',
    keyRisks:
      '• Refinance market pricing at exit\n• Execution risk on minor refurbishment scope',
    downsideProtection:
      'Investors rank ahead of all junior capital. Enforcement playbook is pre-agreed with panel counsel; historical recoveries on comparable positions are full principal plus contractual default interest.',
    recoveryTimeMonths: 5,
    scenarioNote:
      'Stress case assumes 18% valuation decline at exit; senior principal remains covered at current LTV.',
    visibleToInvestors: true,
    openForInvestment: true,
    approvedInvestorsOnly: false,
    autoInvestEligible: true,
    isFeatured: internalId.endsWith('001'),
    publishedAt: new Date(),
    _imageUrl: imageUrl,
  }
}

type PortfolioExtras = Partial<{
  collateralSummary: string
  borrowerType: string
  borrowerPurpose: string
  propertyType: string
  exitRoute: string
  underwritingSummary: string
  keyStrengths: string
  keyRisks: string
  downsideProtection: string
}>

function portfolioDeal(
  internalId: string,
  name: string,
  city: string,
  region: string,
  summary: string,
  propertyDescription: string,
  loanAmount: number,
  valuation: number,
  ltv: number,
  apr: number,
  origination: Date,
  closed: Date,
  imageUrl: string,
  extras?: PortfolioExtras
) {
  const targetRaise = loanAmount
  return {
    internalId,
    name,
    status: 'REPAID' as const,
    type: 'BRIDGE_FINANCE' as const,
    borrowerType: 'Спонсор / SPV (UA)',
    borrowerPurpose:
      'Завершена угода: бридж погашено за графіком; тіло та договірні відсотки повернуті інвесторам повністю.',
    summary,
    propertyType: 'Житлова / змішана',
    propertyAddress: 'Адреса не публікується — архівний кейс',
    propertyCity: city,
    propertyRegion: region,
    propertyPostcode: '—',
    propertyDescription,
    loanAmount,
    propertyValuation: valuation,
    ltv,
    investorApr: apr,
    borrowerRate: apr + 2,
    minimumInvestment: 5000,
    loanDurationMonths: 14,
    originationDate: origination,
    maturityDate: closed,
    actualClosingDate: closed,
    actualDurationMonths: 14,
    repaymentType: 'MONTHLY_INTEREST_BULLET' as const,
    exitRoute: 'Рефінансування у термінового кредитора / інституційний вихід',
    targetRaise,
    currentRaised: targetRaise,
    riskGrade: 'A' as const,
    chargeType: 'FIRST_CHARGE' as const,
    valuationSource: 'Незалежна оцінка · Red Book / локальний стандарт',
    underwritingSummary:
      'Архівна позиція: перша застава, підтверджені грошові потоки та зрозумілий план виходу. Розміщено для прозорості реалізованих результатів.',
    keyStrengths: '• Повне погашення у строк\n• Без втрати тіла\n• Спонсор дотримувався ковенантів до закриття',
    keyRisks: '• Ризики минулого етапу — угода успішно закрита',
    downsideProtection:
      'Перша застава; план відновлення не застосовувався — виконання за договором пройшло без інцидентів.',
    recoveryTimeMonths: 4,
    scenarioNote: 'Архівний запис для маркетингу та перевірки відповідності.',
    visibleToInvestors: true,
    openForInvestment: false,
    approvedInvestorsOnly: false,
    autoInvestEligible: false,
    isFeatured: false,
    isPortfolio: true,
    publishedAt: origination,
    ...extras,
    _imageUrl: imageUrl,
  }
}

async function main() {
  if (process.env.DEMO_SEED !== '1') {
    console.error('Set DEMO_SEED=1 to run this script (e.g. DEMO_SEED=1 pnpm exec tsx prisma/seed-demo.ts)')
    process.exit(1)
  }

  const admin = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
    select: { id: true },
  })
  if (!admin) {
    console.error('No admin user found. Create one first (e.g. run prisma seed in development, or invite an admin).')
    process.exit(1)
  }

  const specs = [
    dealPayload(
      'NXSD-DEMO-001',
      'Mayfair Bridge — Prime Residential',
      'London',
      'Senior secured bridge on a prime Mayfair townhouse. Sponsor refinancing a completed light refurbishment ahead of a long-let institutional exit.',
      'Corner position with dual aspect; unlisted interior specification with underfloor heating and lift. Title reviewed — single freehold, no adverse easements noted in initial OS1.',
      4200000,
      7200000,
      58,
      10.2,
      4200000,
      1680000,
      LIVE_IMG.a
    ),
    dealPayload(
      'NXSD-DEMO-002',
      'Chelsea Garden Square — Stabilised BTL',
      'London',
      'Stabilised buy-to-let bridge: in-place ASTs, 6.2% NIY at loan sizing, sponsor adding second charge only after full draw.',
      'White stucco period building; garden square aspect. Recent EPC and electrical certs on file. Minor cyclical decoration only — no structural works in scope.',
      1850000,
      2950000,
      63,
      9.4,
      1850000,
      740000,
      LIVE_IMG.b
    ),
    dealPayload(
      'NXSD-DEMO-003',
      'Oxford Science Quarter — Lab-to-Office Conversion',
      'Oxford',
      'Conversion bridge while anchor tenant LOI converts to FRI lease. Lender step-in rights on contractor retentions.',
      'Former mid-rise lab block; planning consent for change of use secured. Phase 1 strip-out complete; MEP design locked with tier-1 consultant sign-off.',
      2650000,
      4100000,
      65,
      11.1,
      2650000,
      530000,
      LIVE_IMG.c
    ),
  ]

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

  const dev = await prisma.deal.findUnique({ where: { internalId: 'NXSD-DEV-001' } })
  if (dev) {
    await prisma.deal.update({
      where: { id: dev.id },
      data: {
        summary:
          'Development seed deal upgraded for demo: same structure as production-ready listings — full narrative, risk language, and investor-facing fields populated.',
        propertyDescription:
          'Representative collateral description for UI review. In production this block is sourced from the credit memo and refreshed when material facts change.',
        underwritingSummary:
          'Underwriting follows Nexus standard bridge template: independent valuation, borrower background checks, and legal opinion on enforceability of the charge.',
        keyStrengths: '• First charge\n• Conservative LTV vs. desktop valuation\n• Sponsor with prior Nexus repayments',
        keyRisks: '• Market liquidity at exit\n• Demo data only — not an offer',
        downsideProtection:
          'First charge enforcement waterfall documented in the facility agreement; investor principal and accrued interest rank ahead of sponsor equity.',
        scenarioNote: 'Illustrative stress note for demo layout — replace with live covenant analysis before marketing.',
      },
    })
    const hasImg = await prisma.dealImage.count({ where: { dealId: dev.id, deletedAt: null } })
    if (hasImg === 0) {
      await prisma.dealImage.create({
        data: {
          dealId: dev.id,
          storageKey: LIVE_IMG.a,
          fileName: 'demo-cover.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 0,
          isPrimary: true,
          sortOrder: 0,
          uploadedById: admin.id,
        },
      })
    }
  }

  const orphanMal = await prisma.deal.findUnique({ where: { internalId: 'NXSD-TR-MALUTANKA' } })
  if (orphanMal) {
    await prisma.dealImage.deleteMany({ where: { dealId: orphanMal.id } })
    await prisma.deal.delete({ where: { id: orphanMal.id } })
  }

  const portfolioSpecs = [
    portfolioDeal(
      'NXSD-TR-MALYUTYANKA',
      'Малютянка — житловий бридж',
      'Малютянка',
      'Київська область',
      'Завершена позиція: короткостроковий бридж під добудову та сертифікацію об’єкта в сільській зоні Київської області. Повне погашення тіла та відсотків у строк.',
      'Перша застава на земельну ділянку та об’єкт незавершеного будівництва. Вихід — рефінансування у термінового кредитора після отримання ЗОС.',
      1850000,
      3100000,
      60,
      10.2,
      new Date('2021-04-12'),
      new Date('2022-06-30'),
      TR_IMG.malyutyanka,
      {
        propertyType: 'Земля / житлове будівництво',
        collateralSummary: 'Перша застава: ділянка + ОНБ; молодших обтяжень на момент видачі не виявлено.',
      }
    ),
    portfolioDeal(
      'NXSD-TR-KOZIN',
      'смт. Козин — стабілізований BTL / рефінанс',
      'Козин',
      'Київська область',
      'Портфельна позиція в смт. Козин: бридж під набор AST та легкий капекс, вихід через продаж стабілізованого портфелю регіональному оператору. Повернення капіталу інвесторам — у повному обсязі.',
      'Житловий фонд періоду 1990–2000-х; оновлені інженерні мережі та EPC. Порушень ковенантів не зафіксовано.',
      980000,
      1580000,
      62,
      10.0,
      new Date('2020-08-20'),
      new Date('2021-11-05'),
      TR_IMG.kozin,
      {
        propertyType: 'Багатоквартирний житловий фонд',
        collateralSummary: 'Перша застава на портфель квартир з підтвердженими договорами найму; LTV від ринкової вартості пакета.',
      }
    ),
    portfolioDeal(
      'NXSD-TR-NESCHEROV',
      'с. Нещеров — приватна резиденція (бридж)',
      'Нещеров',
      'Київська область',
      'Бридж під завершення внутрішніх робіт та ландшафт для преміальної резиденції. Закрито достроково після forward-sale ділянки з покращеннями.',
      'Окрема ділянка з готовим фундаментом та коробкою; басейн і гостьовий блок у скоупі. Перша застава, без молодших обтяжень.',
      720000,
      1180000,
      61,
      10.4,
      new Date('2022-01-10'),
      new Date('2023-03-18'),
      TR_IMG.neshcherov,
      {
        propertyType: 'Приватна резиденція',
        collateralSummary: 'Перша застава на землю та будинок; страхування будівельних ризиків на період добудови.',
      }
    ),
    portfolioDeal(
      'NXSD-TR-KHODOSIVKA',
      'Ходосівка — земельний бридж під проєктування',
      'Ходосівка',
      'Київська область',
      'Фінансування етапу проєктування та узгодження містобудівних умов під житловий кластер. Вихід — продаж проєкту девелоперу з land bank.',
      'Агрегована ділянка з частковими сервітутами знятими до фінансування. LTV відносно консервативної land value.',
      2100000,
      3450000,
      61,
      10.6,
      new Date('2019-05-05'),
      new Date('2021-09-14'),
      TR_IMG.khodosivka,
      {
        propertyType: 'Земельний актив / проєктування',
        collateralSummary: 'Перша застава на земельні ділянки; юридичне підтвердження ВКЗ та сервітутів до першого траншу.',
      }
    ),
    portfolioDeal(
      'NXSD-TR-UNIVERSITY',
      'Університетський кампус — бридж під ремонт корпусу та оборотний капітал',
      'Київ',
      'м. Київ',
      'Короткостроковий бридж для державного закладу вищої освіти: капітальний ремонт даху та фасадних вузлів головного навчального корпусу, часткова заміна інженерних мереж і енергоефективні заходи в гуртожитку. Під час робіт збережено навчальний процес у перенесених аудиторіях; орендні та сервісні потоки (буфети, друкарня, невеликий комерційний блок) зафіксовано в ковенантах як мінімальний cash floor. Угода закрита в строк: тіло та відсотки повернуті інвесторам після завершення першої фази та підписання додаткової угоди з бюджетним фінансуванням циклу.',
      'Забезпечення оформлено як перший ряд прав на майно та грошові вимоги за кредитним договором, включно з переліком заставного майна (обладнання після монтажу, права оренди комерційних площ у корпусі). Незалежний технагляд і акти прихованих робіт — у кредитній справі. Фото на картці — ілюстративне (стиль кампусної нерухомості), без ідентифікації конкретної будівлі в публічному описі.',
      4100000,
      6800000,
      60,
      10.8,
      new Date('2018-11-01'),
      new Date('2020-07-22'),
      TR_IMG.university,
      {
        propertyType: 'Освітня нерухомість / кампус',
        collateralSummary:
          'Перша застава за договором; страхування CAR/EAR на період будівництва; контрольовані рахунки підрядника; квартальна звітність бенефіціара.',
        borrowerPurpose:
          'Архів: фінансування ремонтно-відновлювальних робіт і оборотного капіталу закладу до надходження бюджетних траншів та синдикації з банком-партнером.',
        exitRoute:
          'Вихід у два етапи: (1) часткове дострокове погашення з підтвердженого бюджетного фінансування після здачі першої черги, (2) рефінансування залишку терміновим кредитом орендаря після прийняття об’єкта комісією.',
        underwritingSummary:
          'Андеррайтинг спирається на довгострокову оренду державного майна, підтверджений платіжний календар, історію дотримання договорів та незалежну оцінку вартості відновлення. Кейс додано як приклад нежитлової / інституційної застави з прозорим інституційним бенефіціаром.',
        keyStrengths:
          '• Перший ряд забезпечення\n• Регульований сектор з передбачуваним графіком фінансування\n• Повне погашення без реструктуризації тіла',
        keyRisks:
          '• Затримки бюджетних траншів (мінімізовано графіком траншів бриджу)\n• Ризики будівельного підряду (покриті технаглядом і страхуванням) — у минулому, угода закрита',
        downsideProtection:
          'Перша застава та пакет ковенантів на рахунки; план відновлення не активувався — погашення відбулося за базовим сценарієм.',
      }
    ),
  ]

  for (const spec of portfolioSpecs) {
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
        fileName: 'portfolio-cover.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 0,
        isPrimary: true,
        sortOrder: 0,
        uploadedById: admin.id,
      },
    })
  }

  console.log(
    '✅ Demo seed: live deals, 5 UA track-record cases (Малютянка, Козин, Нещеров, Ходосівка, University) + static /track-record/*.png, (+ NXSD-DEV-001 if present).'
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
