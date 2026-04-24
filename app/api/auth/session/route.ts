import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/config'
import { queryOne } from '@/lib/db'
import type { User } from '@/lib/types'

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ user: null })
    }

    // Get fresh user data from database
    const user = await queryOne<User>(
      'SELECT id, email, full_name, is_admin, created_at, updated_at FROM users WHERE id = ?',
      [session.userId]
    )

    if (!user) {
      session.destroy()
      return NextResponse.json({ user: null })
    }

    // Check for admin email
    const isAdmin = user.is_admin || user.email === ADMIN_EMAIL

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isAdmin,
      },
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ user: null })
  }
}
