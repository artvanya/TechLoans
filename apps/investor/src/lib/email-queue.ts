// apps/investor/src/lib/email-queue.ts
// Email queue abstraction - queues emails for reliable delivery
// In production, use BullMQ or Inngest for retry/dead-letter handling

import type { Notification } from '@prisma/client'

interface QueuedEmail {
  to: string
  templateId: string
  data: Record<string, any>
  priority?: 'high' | 'normal' | 'low'
}

// Simple in-process queue for development
// In production: replace with BullMQ queue backed by Redis
const queue: QueuedEmail[] = []
let processing = false

export async function queueEmail(email: QueuedEmail): Promise<void> {
  queue.push(email)
  if (!processing) {
    setImmediate(processQueue)
  }
}

async function processQueue(): Promise<void> {
  if (processing || queue.length === 0) return
  processing = true

  while (queue.length > 0) {
    const email = queue.shift()!
    try {
      await sendTemplatedEmail(email)
    } catch (err) {
      console.error('[EmailQueue] Failed to send email:', email.templateId, err)
      // In production: push to dead-letter queue, retry with backoff
    }
  }

  processing = false
}

async function sendTemplatedEmail(email: QueuedEmail): Promise<void> {
  const { sendEmail } = await import('./email-helpers')

  const templates: Record<string, (data: any) => { subject: string; html: string; text: string }> = {
    kyc_approved: (d) => ({
      subject: 'Your Nexus account has been verified',
      html: kycApprovedHtml(d.firstName),
      text: `Hello ${d.firstName},\n\nYour account is verified. You can now invest at app.nexusprivatecredit.com`,
    }),
    kyc_rejected: (d) => ({
      subject: 'Action required: Identity verification',
      html: kycRejectedHtml(d.firstName, d.reason),
      text: `Hello ${d.firstName},\n\nWe could not verify your identity. Reason: ${d.reason}\n\nPlease contact support.`,
    }),
    investment_confirmed: (d) => ({
      subject: `Investment confirmed: ${d.dealName}`,
      html: investmentConfirmedHtml(d.firstName, d.dealName, d.amount),
      text: `Hello ${d.firstName},\n\nYour investment of £${d.amount.toLocaleString()} in ${d.dealName} has been confirmed.`,
    }),
    interest_paid: (d) => ({
      subject: `Interest payment received: ${d.dealName}`,
      html: interestPaidHtml(d.firstName, d.dealName, d.amount),
      text: `Hello ${d.firstName},\n\nInterest of £${d.amount.toLocaleString()} from ${d.dealName} has been credited to your wallet.`,
    }),
    withdrawal_approved: (d) => ({
      subject: 'Withdrawal approved',
      html: withdrawalApprovedHtml(d.firstName, d.amount),
      text: `Hello ${d.firstName},\n\nYour withdrawal of £${d.amount.toLocaleString()} has been approved and is being processed.`,
    }),
  }

  const template = templates[email.templateId]
  if (!template) {
    console.warn('[EmailQueue] Unknown template:', email.templateId)
    return
  }

  const { subject, html, text } = template(email.data)
  await sendEmail({ to: email.to, subject, html, text })
}

// HTML templates - minimal, institutional
const BASE_STYLE = `background:#09090B;color:#EDEAE3;font-family:'Outfit',sans-serif;max-width:560px;margin:0 auto;padding:40px 20px`
const LOGO = `<div style="font-size:20px;font-weight:600;letter-spacing:3px;color:#BFA063;margin-bottom:28px">NEXUS</div>`
const FOOTER = `<p style="color:#3D3C3A;font-size:11px;margin-top:32px;line-height:1.6">Nexus Private Credit · Institutional<br>This email was sent to you as a registered investor. Capital at risk. Not regulated advice.</p>`

function btn(text: string, url: string) {
  return `<a href="${url}" style="display:inline-block;background:#BFA063;color:#09090B;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;margin:16px 0">${text}</a>`
}

function kycApprovedHtml(firstName: string) {
  const url = process.env.NEXT_PUBLIC_INVESTOR_URL ?? 'https://app.nexusprivatecredit.com'
  return `<div style="${BASE_STYLE}">${LOGO}<h1 style="font-size:21px;font-weight:500;margin-bottom:12px">Verification complete</h1><p style="color:#7A7873;line-height:1.75;margin-bottom:16px">Hello ${firstName},<br><br>Your identity has been verified and your account is now fully active. You can browse available loan opportunities and invest.</p>${btn('View Available Deals', `${url}/deals`)}${FOOTER}</div>`
}

function kycRejectedHtml(firstName: string, reason: string) {
  return `<div style="${BASE_STYLE}">${LOGO}<h1 style="font-size:21px;font-weight:500;margin-bottom:12px">Verification update required</h1><p style="color:#7A7873;line-height:1.75;margin-bottom:16px">Hello ${firstName},<br><br>We were unable to complete your identity verification.<br><br><strong style="color:#E8E6DF">Reason:</strong> ${reason}<br><br>Please contact <a href="mailto:compliance@nexusprivatecredit.com" style="color:#BFA063">compliance@nexusprivatecredit.com</a> if you have questions.</p>${FOOTER}</div>`
}

function investmentConfirmedHtml(firstName: string, dealName: string, amount: number) {
  const url = process.env.NEXT_PUBLIC_INVESTOR_URL ?? 'https://app.nexusprivatecredit.com'
  return `<div style="${BASE_STYLE}">${LOGO}<h1 style="font-size:21px;font-weight:500;margin-bottom:12px">Investment confirmed</h1><p style="color:#7A7873;line-height:1.75;margin-bottom:16px">Hello ${firstName},<br><br>Your investment of <strong style="color:#E8E6DF">£${amount.toLocaleString()}</strong> in <strong style="color:#E8E6DF">${dealName}</strong> has been confirmed and is now active.</p>${btn('View Portfolio', `${url}/portfolio`)}${FOOTER}</div>`
}

function interestPaidHtml(firstName: string, dealName: string, amount: number) {
  const url = process.env.NEXT_PUBLIC_INVESTOR_URL ?? 'https://app.nexusprivatecredit.com'
  return `<div style="${BASE_STYLE}">${LOGO}<h1 style="font-size:21px;font-weight:500;margin-bottom:12px">Interest payment received</h1><p style="color:#7A7873;line-height:1.75;margin-bottom:16px">Hello ${firstName},<br><br>An interest payment of <strong style="color:#2CC89A">£${amount.toLocaleString()}</strong> from <strong style="color:#E8E6DF">${dealName}</strong> has been credited to your wallet.</p>${btn('View Wallet', `${url}/wallet`)}${FOOTER}</div>`
}

function withdrawalApprovedHtml(firstName: string, amount: number) {
  return `<div style="${BASE_STYLE}">${LOGO}<h1 style="font-size:21px;font-weight:500;margin-bottom:12px">Withdrawal approved</h1><p style="color:#7A7873;line-height:1.75;margin-bottom:16px">Hello ${firstName},<br><br>Your withdrawal of <strong style="color:#E8E6DF">£${amount.toLocaleString()}</strong> has been approved and is being processed to your registered destination. This typically takes 1–2 business days.</p>${FOOTER}</div>`
}

// Notification → email bridge
export async function sendNotificationEmail(
  userId: string,
  notification: Pick<Notification, 'type' | 'title' | 'body' | 'metadata'>
): Promise<void> {
  const { prisma } = await import('@nexus/db')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { investorProfile: { select: { firstName: true } } },
  })

  if (!user) return

  const firstName = user.investorProfile?.firstName ?? 'Investor'
  const meta = notification.metadata as Record<string, any> ?? {}

  const templateMap: Record<string, { templateId: string; data: Record<string, any> }> = {
    KYC_APPROVED: { templateId: 'kyc_approved', data: { firstName } },
    KYC_REJECTED: { templateId: 'kyc_rejected', data: { firstName, reason: meta.rejectionReason ?? 'See compliance email' } },
    INVESTMENT_CONFIRMED: { templateId: 'investment_confirmed', data: { firstName, dealName: meta.dealName ?? '', amount: meta.amount ?? 0 } },
    INTEREST_PAID: { templateId: 'interest_paid', data: { firstName, dealName: meta.dealName ?? '', amount: meta.amount ?? 0 } },
    WITHDRAWAL_APPROVED: { templateId: 'withdrawal_approved', data: { firstName, amount: meta.amount ?? 0 } },
  }

  const mapping = templateMap[notification.type]
  if (mapping) {
    await queueEmail({ to: user.email, ...mapping })
  }
}
