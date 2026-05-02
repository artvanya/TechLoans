/**
 * Shared payloads for marketplace (non-portfolio) LIVE deals + HTTPS cover image keys.
 * Used by seed-demo.ts and seed-opportunities.ts.
 */

export const LIVE_IMG = {
  a: 'https://picsum.photos/id/188/1200/800',
  b: 'https://picsum.photos/id/42/1200/800',
  c: 'https://picsum.photos/id/106/1200/800',
  d: 'https://picsum.photos/id/164/1200/800',
  e: 'https://picsum.photos/id/193/1200/800',
  f: 'https://picsum.photos/id/237/1200/800',
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
  imageUrl: string,
  propertyType: string = 'Residential — prime'
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
    propertyType,
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
    isPortfolio: false,
    _imageUrl: imageUrl,
  }
}

export function opportunitySpecs() {
  return [
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
    dealPayload(
      'NXSD-DEMO-004',
      'Bristol Harbourside — Acquisition Bridge',
      'Bristol',
      'First-charge bridge on a converted warehouse loft block: sponsor completing freehold assembly and minor common-part works ahead of a BTL term take-out with two national lenders in process.',
      'Waterside position; majority units sold on long leaseholds; residual freehold interest and commercial units provide alternative enforcement angles. Recent structural survey clean.',
      1420000,
      2350000,
      60,
      9.8,
      1420000,
      426000,
      LIVE_IMG.d,
      'Mixed-use — residential / light commercial'
    ),
    dealPayload(
      'NXSD-DEMO-005',
      'Manchester Northern Quarter — Light Refurb Bridge',
      'Manchester',
      'Bridge against a Victorian mill conversion: cosmetic refresh and EPC uplift in flight; ASTs rolling with modest void. Exit is refinance once 12-month rent roll is evidenced.',
      'Courtyard building; single title; listed consent limited to interiors only. Contractor bonded; QS sign-off on spend cap.',
      980000,
      1620000,
      60,
      9.2,
      980000,
      294000,
      LIVE_IMG.e,
      'Residential — conversion'
    ),
    dealPayload(
      'NXSD-DEMO-006',
      'Cambridge Biotech Park — Lab Fit-Out Bridge',
      'Cambridge',
      'Short-dated facility while a life-science tenant completes CAT B lab fit-out; landlord contribution held in escrow; step-in rights on contractor milestones.',
      'Purpose-built 2018 lab shell; base building warranties active. MEP capacity verified for tenant CAT B loads.',
      3100000,
      4850000,
      64,
      10.6,
      3100000,
      930000,
      LIVE_IMG.f,
      'Commercial — life sciences'
    ),
  ]
}
