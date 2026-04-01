// apps/admin/src/app/(admin)/kyc/page.tsx
import { prisma } from '@nexus/db'
import { formatDate } from '@/lib/utils'
import { KycReviewActions } from '@/components/kyc-review-actions'

export const dynamic = 'force-dynamic'

export default async function KycQueuePage() {
  const cases = await prisma.kycCase.findMany({
    where: { status: { in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED'] } },
    orderBy: { updatedAt: 'asc' },
    include: {
      investorProfile: { include: { user: { select: { email: true, createdAt: true } } } },
      documents: { where: { deletedAt: null } },
    },
  })

  const statusColor: Record<string, string> = {
    DOCUMENTS_SUBMITTED: '#E8A030', UNDER_REVIEW: '#5B9CF6', ADDITIONAL_INFO_REQUIRED: '#E8A030',
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: '#E8E6DF', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>KYC & Onboarding Queue</div>
          <div style={{ fontSize: '11px', color: '#7C7A74', marginTop: '3px' }}>{cases.length} case{cases.length !== 1 ? 's' : ''} requiring review</div>
        </div>
      </div>

      {cases.length === 0 ? (
        <div style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#7C7A74' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.3 }}>✓</div>
          <div style={{ fontSize: '13px' }}>KYC queue is clear</div>
        </div>
      ) : cases.map((c) => (
        <div key={c.id} style={{ background: '#0F1012', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                <span style={{ background: `${statusColor[c.status] ?? '#7C7A74'}18`, color: statusColor[c.status] ?? '#7C7A74', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px' }}>{c.status.replace(/_/g,' ')}</span>
                <span style={{ background: 'rgba(191,160,99,0.12)', color: '#BFA063', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px' }}>{c.level}</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{c.investorProfile.firstName} {c.investorProfile.lastName}</div>
              <div style={{ fontSize: '12px', color: '#7C7A74', marginTop: '2px' }}>{c.investorProfile.user.email}</div>
              <div style={{ fontSize: '11px', color: '#3E3D3B', marginTop: '4px' }}>
                Joined {formatDate(c.investorProfile.user.createdAt.toISOString(), 'short')} ·
                Case updated {formatDate(c.updatedAt.toISOString(), 'short')} ·
                {c.documents.length} document{c.documents.length !== 1 ? 's' : ''} submitted
              </div>
            </div>
            <KycReviewActions caseId={c.id} />
          </div>

          {/* Documents list */}
          <div style={{ padding: '12px 20px' }}>
            <div style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#3E3D3B', marginBottom: '8px' }}>Submitted Documents</div>
            {c.documents.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#7C7A74' }}>No documents uploaded</div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {c.documents.map((doc) => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: '#18191E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px' }}>
                    <span>📄</span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{doc.category.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: '10px', color: '#7C7A74' }}>{doc.fileName}</div>
                    </div>
                    <DocumentDownload storageKey={doc.storageKey} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

async function DocumentDownload({ storageKey }: { storageKey: string }) {
  // Server action to generate signed URL
  return (
    <form action={async () => {
      'use server'
      const { getSignedDownloadUrl } = await import('@/lib/storage-impl')
      const url = await getSignedDownloadUrl(storageKey, 300)
      // In production: redirect to url
      console.log('Signed URL:', url)
    }}>
      <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', color: '#7C7A74', cursor: 'pointer' }}>
        View
      </button>
    </form>
  )
}
