/**
 * POST /api/account/change-password
 * Allows authenticated users to change their own password.
 * Requires current password verification before updating.
 */
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { loginLimiter } from '@/lib/rate-limit'

interface UserRow { id: number; password_hash: string }

export async function POST(request: Request) {
  const rl = loginLimiter.check(request, 'change-password')
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both passwords are required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }

    const user = await queryOne<UserRow>(
      'SELECT id, password_hash FROM users WHERE id = ?',
      [session.userId]
    )
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const isValid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    const newHash = await bcrypt.hash(newPassword, 12)
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, session.userId])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ChangePassword]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
