// apps/investor/src/lib/email.ts
// Email provider abstraction — supports Resend and Postmark

interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? 'resend'

  if (provider === 'resend') {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })
    if (result.error) throw new Error(`Resend error: ${result.error.message}`)
    return
  }

  if (provider === 'postmark') {
    // TODO: Implement Postmark
    throw new Error('Postmark integration not yet implemented')
  }

  throw new Error(`Unknown email provider: ${provider}`)
}

const INVESTOR_URL = process.env.NEXT_PUBLIC_INVESTOR_URL ?? 'http://localhost:3000'

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string
): Promise<void> {
  const verifyUrl = `${INVESTOR_URL}/verify-email?token=${token}`
  await sendEmail({
    to: email,
    subject: 'Verify your Nexus account',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;background:#09090B;color:#EDEAE3">
        <div style="font-size:22px;font-weight:600;letter-spacing:3px;color:#C4A355;margin-bottom:32px">NEXUS</div>
        <h1 style="font-size:22px;font-weight:500;margin-bottom:16px">Verify your email address</h1>
        <p style="color:#7A7873;line-height:1.7;margin-bottom:24px">Hello ${firstName},<br><br>
        Please verify your email address to complete your Nexus account setup.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#C4A355;color:#09090B;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Verify Email Address</a>
        <p style="color:#3E3D3B;font-size:12px;margin-top:32px">This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
      </div>
    `,
    text: `Hello ${firstName},\n\nVerify your email: ${verifyUrl}\n\nExpires in 24 hours.`,
  })
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  token: string
): Promise<void> {
  const resetUrl = `${INVESTOR_URL}/reset-password?token=${token}`
  await sendEmail({
    to: email,
    subject: 'Reset your Nexus password',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;background:#09090B;color:#EDEAE3">
        <div style="font-size:22px;font-weight:600;letter-spacing:3px;color:#C4A355;margin-bottom:32px">NEXUS</div>
        <h1 style="font-size:22px;font-weight:500;margin-bottom:16px">Reset your password</h1>
        <p style="color:#7A7873;line-height:1.7;margin-bottom:24px">Hello ${firstName},<br><br>
        A password reset was requested for your account.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#C4A355;color:#09090B;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Reset Password</a>
        <p style="color:#3E3D3B;font-size:12px;margin-top:32px">This link expires in 1 hour. If you did not request this, your account is secure.</p>
      </div>
    `,
    text: `Reset your password: ${resetUrl}\n\nExpires in 1 hour.`,
  })
}

export async function sendKycApprovedEmail(email: string, firstName: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Your Nexus account has been verified',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;background:#09090B;color:#EDEAE3">
        <div style="font-size:22px;font-weight:600;letter-spacing:3px;color:#C4A355;margin-bottom:32px">NEXUS</div>
        <h1 style="font-size:22px;font-weight:500;margin-bottom:16px">Verification complete</h1>
        <p style="color:#7A7873;line-height:1.7;margin-bottom:24px">Hello ${firstName},<br><br>
        Your identity has been verified and your account is now fully active. You can now browse available loan opportunities and invest.</p>
        <a href="${INVESTOR_URL}/deals" style="display:inline-block;background:#C4A355;color:#09090B;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Available Deals →</a>
      </div>
    `,
    text: `Hello ${firstName},\n\nYour Nexus account is now verified. View deals: ${INVESTOR_URL}/deals`,
  })
}
