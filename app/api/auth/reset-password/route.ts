/**
 * POST /api/auth/reset-password
 * BUG FIX: was importing { pool } from db — switched to query/queryOne.
 * Also increased minimum password length from 6 → 8 for security.
 */
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query, queryOne } from '@/lib/db'

interface UserRow { id: number }

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Find user with a valid (non-expired) reset token
    const user = await queryOne<UserRow>(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    )

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [passwordHash, user.id]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ResetPassword] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
