/**
 * POST /api/auth/register
 * ─────────────────────────────────────────────────────────────
 * Creates a user in our DB + Pterodactyl panel in one flow.
 * Rate-limited to 5 registrations per IP per hour.
 */
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { createPanelUser } from '@/lib/pterodactyl'
import { registerLimiter } from '@/lib/rate-limit'
import { ADMIN_EMAIL, isPanelConfigured } from '@/lib/config'
import type { User } from '@/lib/types'
import type { ResultSetHeader } from 'mysql2'

export async function POST(request: Request) {
  // ── Rate limiting ──────────────────────────────────────────
  const rl = registerLimiter.check(request, 'register')
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    )
  }

  try {
    const { email, password, fullName } = await request.json()

    // ── Input validation ───────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // ── Duplicate check ────────────────────────────────────────
    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // ── Create user in our database ────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12)
    const isAdmin = email === ADMIN_EMAIL

    const result = await query<ResultSetHeader>(
      'INSERT INTO users (email, password_hash, full_name, is_admin) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, fullName || null, isAdmin]
    )

    const userId = result.insertId

    // ── Create user on Pterodactyl panel ───────────────────────
    // Done asynchronously after our DB insert so a panel API failure
    // doesn't prevent the user from registering.
    let pterodactylUserId: number | null = null

    if (isPanelConfigured) {
      try {
        const pteroUser = await createPanelUser({
          userId,
          email,
          fullName: fullName || email.split('@')[0],
        })
        pterodactylUserId = pteroUser.id

        // Save the panel user ID — used for SSO and server creation
        await query(
          'UPDATE users SET pterodactyl_user_id = ? WHERE id = ?',
          [pterodactylUserId, userId]
        )
      } catch (pteroErr) {
        // Log and continue — panel user can be created manually or on first order
        console.error('[Register] Pterodactyl user creation failed:', pteroErr)
      }
    }

    // ── Fetch the newly created user ──────────────────────────
    const user = await queryOne<User>(
      'SELECT id, email, full_name, is_admin FROM users WHERE id = ?',
      [userId]
    )

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // ── Create session ────────────────────────────────────────
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.userId = user.id
    session.email = user.email
    session.fullName = user.full_name || undefined
    session.isAdmin = user.is_admin
    session.isLoggedIn = true
    await session.save()

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isAdmin: user.is_admin,
      },
    })
  } catch (error) {
    console.error('[Register] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
