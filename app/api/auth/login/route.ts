/**
 * POST /api/auth/login
 * Rate-limited to 10 attempts per IP per 15 minutes.
 */
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { loginLimiter } from '@/lib/rate-limit'
import { ADMIN_EMAIL } from '@/lib/config'

interface UserWithPassword {
  id: number
  email: string
  password_hash: string
  full_name: string | null
  is_admin: boolean
}

export async function POST(request: Request) {
  // ── Rate limiting ──────────────────────────────────────────
  const rl = loginLimiter.check(request, 'login')
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again in 15 minutes.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    )
  }

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await queryOne<UserWithPassword>(
      'SELECT id, email, password_hash, full_name, is_admin FROM users WHERE email = ?',
      [email]
    )

    // Use constant-time comparison to prevent timing attacks
    const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxxx'
    const isValidPassword = user
      ? await bcrypt.compare(password, user.password_hash)
      : await bcrypt.compare(password, dummyHash).then(() => false)

    if (!user || !isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const isAdmin = user.is_admin || user.email === ADMIN_EMAIL

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.userId = user.id
    session.email = user.email
    session.fullName = user.full_name || undefined
    session.isAdmin = isAdmin
    session.isLoggedIn = true
    await session.save()

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isAdmin,
      },
    })
  } catch (error) {
    console.error('[Login] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
