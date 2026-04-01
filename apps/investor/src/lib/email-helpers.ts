// apps/investor/src/lib/email-helpers.ts
// Core email send function - used by email.ts and email-queue.ts

interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? 'console'

  if (provider === 'console') {
    // Development fallback - log to console
    console.log(`[Email/Dev] To: ${payload.to} | Subject: ${payload.subject}`)
    return
  }

  if (provider === 'resend') {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME ?? 'Nexus Private Credit'} <${process.env.EMAIL_FROM}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })
    if (result.error) {
      throw new Error(`Resend error: ${result.error.message}`)
    }
    return
  }

  if (provider === 'postmark') {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': process.env.POSTMARK_API_KEY!,
      },
      body: JSON.stringify({
        From: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
        To: payload.to,
        Subject: payload.subject,
        HtmlBody: payload.html,
        TextBody: payload.text,
        MessageStream: 'outbound',
      }),
    })
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Postmark error: ${err}`)
    }
    return
  }

  throw new Error(`Unknown email provider: ${provider}`)
}
