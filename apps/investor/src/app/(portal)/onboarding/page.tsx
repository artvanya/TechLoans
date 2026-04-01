// apps/investor/src/app/(portal)/onboarding/page.tsx
import { getSession } from '@/lib/session'
import { prisma } from '@nexus/db'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { KycUploadForm } from '@/components/onboarding/kyc-upload-form'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const session = await getSession()
  const userId = session!.user.id

  const profile = await prisma.investorProfile.findUnique({
    where: { userId },
    include: {
      kycCases: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { documents: { where: { deletedAt: null } } },
      },
      bankAccounts: true,
    },
  })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true, twoFactorEnabled: true, createdAt: true } })

  const kycCase = profile?.kycCases[0]
  const kycStatus = profile?.kycStatus ?? 'NOT_STARTED'

  type StepStatus = 'done' | 'active' | 'pending'

  function stepStatus(condition: boolean, activeCondition?: boolean): StepStatus {
    if (condition) return 'done'
    if (activeCondition) return 'active'
    return 'pending'
  }

  const steps = [
    {
      title: 'Identity Verification (KYC)',
      desc: 'Passport or national ID verified against live selfie via Sumsub automated workflow.',
      status: stepStatus(kycStatus === 'APPROVED', ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED'].includes(kycStatus)),
      badges: kycStatus === 'APPROVED'
        ? [<Badge variant="green">Completed</Badge>, <Badge variant="gold">{profile?.kycLevel}</Badge>]
        : kycStatus === 'UNDER_REVIEW'
        ? [<Badge variant="amber">Under Review</Badge>]
        : kycStatus === 'DOCUMENTS_SUBMITTED'
        ? [<Badge variant="blue">Documents Submitted</Badge>]
        : kycStatus === 'ADDITIONAL_INFO_REQUIRED'
        ? [<Badge variant="amber">More Info Required</Badge>]
        : kycStatus === 'REJECTED'
        ? [<Badge variant="red">Rejected</Badge>]
        : [<Badge variant="gray">Not Started</Badge>],
      date: profile?.kycApprovedAt ? formatDate(profile.kycApprovedAt.toISOString(), 'short') : null,
    },
    {
      title: 'Investor Suitability Assessment',
      desc: 'Classification as High Net Worth Individual or Sophisticated Investor under FCA guidelines.',
      status: stepStatus(!!profile?.suitabilityCompleted),
      badges: profile?.suitabilityCompleted
        ? [<Badge variant="green">Completed</Badge>, <Badge variant="purple">{profile.investorClassification ?? 'Investor'}</Badge>]
        : [<Badge variant="gray">Pending</Badge>],
      date: profile?.suitabilityCompletedAt ? formatDate(profile.suitabilityCompletedAt.toISOString(), 'short') : null,
    },
    {
      title: 'Source of Funds Declaration',
      desc: 'AML-compliant declaration of wealth origin reviewed by compliance team.',
      status: stepStatus(kycStatus === 'APPROVED'),
      badges: kycStatus === 'APPROVED' ? [<Badge variant="green">Verified</Badge>] : [<Badge variant="gray">Pending KYC</Badge>],
      date: profile?.kycApprovedAt ? formatDate(profile.kycApprovedAt.toISOString(), 'short') : null,
    },
    {
      title: 'Bank Account Linkage',
      desc: 'UK bank account verified for sterling withdrawals.',
      status: stepStatus(!!profile?.bankAccountVerified),
      badges: profile?.bankAccountVerified
        ? [<Badge variant="green">Linked</Badge>, ...(profile.bankAccounts.map(b => <Badge variant="gray">{b.bankName} ···{b.accountNumberMasked}</Badge>))]
        : [<Badge variant="gray">Not linked</Badge>],
      date: null,
    },
    {
      title: 'Platform Agreement & Risk Disclosure',
      desc: 'Investor agreement and risk warning signed electronically.',
      status: stepStatus(!!profile?.agreementSigned),
      badges: profile?.agreementSigned
        ? [<Badge variant="green">Executed</Badge>, ...(profile.agreementRef ? [<Badge variant="gray">{profile.agreementRef}</Badge>] : [])]
        : [<Badge variant="gray">Pending</Badge>],
      date: profile?.agreementSignedAt ? formatDate(profile.agreementSignedAt.toISOString(), 'short') : null,
    },
    {
      title: 'Account Approved · Full Access Granted',
      desc: `Compliance review completed. ${kycStatus === 'APPROVED' ? `Account active at ${profile?.tier} tier. Auto-invest and credit line features enabled.` : 'Awaiting compliance review.'}`,
      status: stepStatus(kycStatus === 'APPROVED'),
      badges: kycStatus === 'APPROVED'
        ? [<Badge variant="gold">⬡ {profile?.tier}</Badge>, <Badge variant="green">Full Access</Badge>]
        : [<Badge variant="gray">Pending</Badge>],
      date: profile?.kycApprovedAt ? formatDate(profile.kycApprovedAt.toISOString(), 'short') : null,
    },
  ]

  const needsUpload = ['NOT_STARTED', 'DOCUMENTS_REQUESTED', 'ADDITIONAL_INFO_REQUIRED'].includes(kycStatus)

  return (
    <div className="flex flex-col gap-5 animate-fadeIn max-w-[700px] mx-auto w-full">
      <div>
        <h1 className="font-serif text-[24px] mb-1.5">Account Verification</h1>
        <p className="text-[13px] text-nexus-muted leading-[1.7]">
          Nexus is available exclusively to verified investors. Your current status is shown below.
          {kycStatus === 'APPROVED' && ' All steps complete — full platform access granted.'}
        </p>
      </div>

      {needsUpload && (
        <div className="bg-nexus-gold/[0.06] border border-nexus-gold/10 rounded-lg p-5">
          <div className="text-[10.5px] tracking-[1.5px] uppercase text-nexus-gold mb-3">Action Required — Upload Identity Documents</div>
          <p className="text-[12.5px] text-nexus-muted leading-[1.7] mb-4">
            Please upload a clear copy of your passport or national ID, plus proof of address dated within 3 months.
            Documents are processed securely and never shared with third parties.
          </p>
          <KycUploadForm kycCaseId={kycCase?.id} />
        </div>
      )}

      {kycStatus === 'ADDITIONAL_INFO_REQUIRED' && (
        <div className="bg-nexus-amber/10 border border-nexus-amber/20 rounded-lg p-4">
          <div className="text-[12px] text-nexus-amber font-medium mb-1">Additional Information Required</div>
          <p className="text-[12px] text-nexus-muted">{kycCase?.rejectionReason ?? 'Our compliance team has requested additional documentation. Please upload the requested items below.'}</p>
        </div>
      )}

      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-4 py-4 border-b border-nexus last:border-0">
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[12px] font-semibold flex-shrink-0 mt-0.5 transition-colors ${
            step.status === 'done'   ? 'border-nexus-teal bg-nexus-teal/10 text-nexus-teal' :
            step.status === 'active' ? 'border-nexus-gold bg-nexus-gold/10 text-nexus-gold' :
                                       'border-nexus2 text-nexus-hint'
          }`}>
            {step.status === 'done' ? '✓' : i + 1}
          </div>
          <div className="flex-1">
            <div className="text-[13.5px] font-semibold mb-1.5">{step.title}</div>
            <div className="text-[12px] text-nexus-muted leading-[1.6] mb-2.5">{step.desc}</div>
            <div className="flex gap-2 flex-wrap">{step.badges}</div>
          </div>
          {step.date && <div className="text-[11px] text-nexus-muted flex-shrink-0 mt-1">{step.date}</div>}
        </div>
      ))}

      {kycStatus === 'APPROVED' && profile?.kycExpiresAt && (
        <div className="bg-nexus-bg2 border border-nexus2 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold mb-1">Annual Refresh Due {formatDate(profile.kycExpiresAt.toISOString(), 'short')}</div>
            <div className="text-[12px] text-nexus-muted">Source of funds re-verification required annually. We will notify you 30 days in advance.</div>
          </div>
          <Badge variant="gray">
            {Math.max(0, Math.ceil((profile.kycExpiresAt.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)))} months remaining
          </Badge>
        </div>
      )}
    </div>
  )
}
