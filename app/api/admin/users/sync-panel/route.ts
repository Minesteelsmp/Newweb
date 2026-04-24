/**
 * POST /api/admin/users/sync-panel
 * Creates a Pterodactyl panel account for a user who doesn't have one yet.
 * Useful when registration panel creation failed due to API issues.
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { createPanelUser } from '@/lib/pterodactyl'
import { ADMIN_EMAIL } from '@/lib/config'

interface UserRow {
  id: number
  email: string
  full_name: string | null
  pterodactyl_user_id: number | null
}

export async function POST(request: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.isLoggedIn || (!session.isAdmin && session.email !== ADMIN_EMAIL)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const user = await queryOne<UserRow>(
      'SELECT id, email, full_name, pterodactyl_user_id FROM users WHERE id = ?',
      [userId]
    )

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.pterodactyl_user_id) {
      return NextResponse.json({
        success: true,
        message: 'User already synced',
        pterodactylUserId: user.pterodactyl_user_id,
      })
    }

    // Create panel account
    const pteroUser = await createPanelUser({
      userId: user.id,
      email: user.email,
      fullName: user.full_name || user.email.split('@')[0],
    })

    await query(
      'UPDATE users SET pterodactyl_user_id = ? WHERE id = ?',
      [pteroUser.id, user.id]
    )

    return NextResponse.json({
      success: true,
      message: 'Panel account created',
      pterodactylUserId: pteroUser.id,
    })
  } catch (err) {
    console.error('[Sync Panel]', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Internal server error',
    }, { status: 500 })
  }
}
