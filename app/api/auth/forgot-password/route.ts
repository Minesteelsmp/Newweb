/**
 * POST /api/auth/forgot-password
 * BUG FIX: was importing { pool } from db — db only has a default export.
 * Switched to query/queryOne helpers.
 */
import { NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import { loginLimiter } from '@/lib/rate-limit'
import crypto from 'crypto'

interface UserRow { id: number; email: string; full_name: string | null }

export async function POST(request: Request) {
  // Rate-limit: 5 attempts per 15 min per IP (same limiter as login)
  const rl = loginLimiter.check(request, 'forgot-password')
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Always return success to prevent email enumeration attacks
    const user = await queryOne<UserRow>(
      'SELECT id, email, full_name FROM users WHERE email = ?',
      [email]
    )

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await query(
        'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
        [resetToken, expiresAt.toISOString().slice(0, 19).replace('T', ' '), user.id]
      )

      try {
        await sendPasswordResetEmail(user.email, user.full_name || 'User', resetToken)
      } catch (emailErr) {
        console.error('[ForgotPassword] Email send failed:', emailErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ForgotPassword] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
