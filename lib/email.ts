/**
 * lib/email.ts
 * ─────────────────────────────────────────────────────────────
 * All transactional email sending via Resend.
 * Uses RESEND_FROM and RESEND_API_KEY from lib/config.
 * All functions are fire-and-forget safe — they never throw to callers.
 */
import { Resend } from 'resend'
import { RESEND_API_KEY, RESEND_FROM } from '@/lib/config'

const resend = new Resend(RESEND_API_KEY)

// ── Shared HTML wrapper ───────────────────────────────────────
function wrapEmail(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="background:#0a0a0a;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#052e16,#14532d);padding:28px 32px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:36px;height:36px;background:#22c55e22;border-radius:10px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:20px;">⚡</span>
        </div>
        <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">CubiqHost</span>
      </div>
    </div>
    <!-- Body -->
    <div style="padding:32px;color:#e5e7eb;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #222;">
      <p style="color:#4b5563;font-size:12px;margin:0;">
        © ${new Date().getFullYear()} CubiqHost · 
        <a href="mailto:support.cubiqhost@gmail.com" style="color:#6b7280;text-decoration:none;">support.cubiqhost@gmail.com</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

// ── Helper: send with error swallowing ───────────────────────
async function send(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY || RESEND_API_KEY.startsWith('re_placeholder')) {
    console.warn('[Email] RESEND_API_KEY not configured — email not sent:', subject)
    return
  }
  try {
    await resend.emails.send({ from: RESEND_FROM, to, subject, html })
  } catch (err) {
    console.error('[Email] Failed to send:', subject, err)
  }
}

// ─── Public functions ─────────────────────────────────────────

export async function sendOrderConfirmation(params: {
  to: string
  orderId: string
  serverName: string
  planName: string
  amount: number
}) {
  await send(
    params.to,
    '🛒 Order Received — CubiqHost',
    wrapEmail(`
      <h2 style="color:#22c55e;margin-top:0;">Order Received!</h2>
      <p style="color:#9ca3af;">Thank you for your order. Your payment claim is under review.</p>

      <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin:24px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#6b7280;padding:6px 0;font-size:14px;">Order ID</td>
              <td style="color:#e5e7eb;text-align:right;font-size:14px;">#${params.orderId}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0;font-size:14px;">Server Name</td>
              <td style="color:#e5e7eb;text-align:right;font-size:14px;">${params.serverName}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0;font-size:14px;">Plan</td>
              <td style="color:#e5e7eb;text-align:right;font-size:14px;">${params.planName}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0;font-size:14px;font-weight:600;">Amount</td>
              <td style="color:#22c55e;text-align:right;font-size:16px;font-weight:700;">₹${params.amount}</td></tr>
        </table>
      </div>

      <p style="color:#9ca3af;font-size:14px;">
        ⏱ Your order is being reviewed — usually approved within <strong style="color:#e5e7eb;">15 minutes</strong>.
        <br/>Not approved within 30 minutes? Reach us on Discord.
      </p>
    `)
  )
}

export async function sendServerCreated(params: {
  to: string
  serverName: string
  planName: string
  panelUrl: string
}) {
  await send(
    params.to,
    '🚀 Your Server is Ready — CubiqHost',
    wrapEmail(`
      <h2 style="color:#22c55e;margin-top:0;">Your Server is Live! 🎉</h2>
      <p style="color:#9ca3af;">Your Minecraft server has been created and is ready to play.</p>

      <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin:24px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#6b7280;padding:6px 0;font-size:14px;">Server Name</td>
              <td style="color:#e5e7eb;text-align:right;font-size:14px;">${params.serverName}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0;font-size:14px;">Plan</td>
              <td style="color:#e5e7eb;text-align:right;font-size:14px;">${params.planName}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0;font-size:14px;">Status</td>
              <td style="color:#22c55e;text-align:right;font-size:14px;font-weight:600;">Active ✓</td></tr>
        </table>
      </div>

      <div style="text-align:center;margin:32px 0;">
        <a href="${params.panelUrl}" style="background:#22c55e;color:#000;font-weight:700;padding:14px 32px;text-decoration:none;border-radius:10px;display:inline-block;font-size:15px;">
          Open Control Panel →
        </a>
      </div>

      <p style="color:#6b7280;font-size:13px;">
        Your server expires in <strong style="color:#e5e7eb;">30 days</strong>. Renew from your dashboard before it expires.
      </p>
    `)
  )
}

export async function sendRenewalReminder(params: {
  to: string
  serverName: string
  expiresAt: string
  daysLeft: number
}) {
  const expiryFormatted = new Date(params.expiresAt).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  await send(
    params.to,
    `⚠️ ${params.serverName} expires in ${params.daysLeft} day${params.daysLeft !== 1 ? 's' : ''} — CubiqHost`,
    wrapEmail(`
      <h2 style="color:#f59e0b;margin-top:0;">Renewal Reminder ⏰</h2>
      <p style="color:#9ca3af;">Your server is expiring soon. Renew now to avoid suspension.</p>

      <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin:24px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#6b7280;padding:6px 0;font-size:14px;">Server Name</td>
              <td style="color:#e5e7eb;text-align:right;font-size:14px;">${params.serverName}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0;font-size:14px;">Expires On</td>
              <td style="color:#f59e0b;text-align:right;font-size:14px;font-weight:600;">${expiryFormatted}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0;font-size:14px;">Days Left</td>
              <td style="color:#ef4444;text-align:right;font-size:16px;font-weight:700;">${params.daysLeft}</td></tr>
        </table>
      </div>

      <div style="text-align:center;margin:32px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://cubiqhost.in'}/dashboard" 
           style="background:#22c55e;color:#000;font-weight:700;padding:14px 32px;text-decoration:none;border-radius:10px;display:inline-block;font-size:15px;">
          Renew Now →
        </a>
      </div>

      <p style="color:#6b7280;font-size:13px;">
        Servers suspended for 7+ days are permanently deleted. Don't lose your progress!
      </p>
    `)
  )
}

export async function sendServerSuspended(params: {
  to: string
  serverName: string
}) {
  await send(
    params.to,
    `🔴 Server Suspended — ${params.serverName}`,
    wrapEmail(`
      <h2 style="color:#ef4444;margin-top:0;">Server Suspended</h2>
      <p style="color:#9ca3af;">
        Your server <strong style="color:#e5e7eb;">${params.serverName}</strong> has been suspended due to non-renewal.
      </p>

      <div style="background:#3f0000;border:1px solid #7f0000;border-radius:12px;padding:16px;margin:24px 0;">
        <p style="color:#fca5a5;margin:0;font-size:14px;">
          ⚠️ <strong>Renew within 7 days</strong> to restore your server. After 7 days, it will be permanently deleted and cannot be recovered.
        </p>
      </div>

      <div style="text-align:center;margin:32px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://cubiqhost.in'}/dashboard" 
           style="background:#22c55e;color:#000;font-weight:700;padding:14px 32px;text-decoration:none;border-radius:10px;display:inline-block;font-size:15px;">
          Renew Server Now →
        </a>
      </div>
    `)
  )
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cubiqhost.in'}/auth/reset-password?token=${token}`

  await send(
    to,
    '🔑 Reset Your Password — CubiqHost',
    wrapEmail(`
      <h2 style="color:#22c55e;margin-top:0;">Reset Your Password</h2>
      <p style="color:#9ca3af;">Hi ${name || 'there'},</p>
      <p style="color:#9ca3af;">We received a request to reset your CubiqHost password. Click the button below:</p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}" style="background:#22c55e;color:#000;font-weight:700;padding:14px 32px;text-decoration:none;border-radius:10px;display:inline-block;font-size:15px;">
          Reset Password →
        </a>
      </div>

      <p style="color:#6b7280;font-size:13px;">
        This link expires in <strong style="color:#e5e7eb;">1 hour</strong>.<br/>
        If you didn't request this, you can safely ignore this email.
      </p>
    `)
  )
}
