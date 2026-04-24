/**
 * GET  /api/admin/world-purchases - list all world purchases
 * PUT  /api/admin/world-purchases - update a purchase (status, pterodactyl_server_id, admin_notes)
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/config'

async function requireAdmin() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.isLoggedIn || !session.userId) return null
  if (!session.isAdmin && session.email !== ADMIN_EMAIL) return null
  return session
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const purchases = await query(
      `SELECT wp.*,
              w.name AS world_plan_name,
              w.price AS world_plan_price,
              w.slug AS world_plan_slug,
              u.email AS user_email,
              u.full_name AS user_full_name
       FROM world_purchases wp
       LEFT JOIN world_plans w ON w.id = wp.world_plan_id
       LEFT JOIN users u ON u.id = wp.user_id
       ORDER BY wp.created_at DESC`
    )

    return NextResponse.json({ purchases })
  } catch (err) {
    console.error('[Admin World Purchases GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, status, pterodactyl_server_id, admin_notes } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'Purchase ID required' }, { status: 400 })
    }

    const allowedStatuses = ['pending', 'active', 'completed', 'cancelled']
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    await query(
      `UPDATE world_purchases
         SET status = COALESCE(?, status),
             pterodactyl_server_id = COALESCE(?, pterodactyl_server_id),
             admin_notes = COALESCE(?, admin_notes)
       WHERE id = ?`,
      [status ?? null, pterodactyl_server_id ?? null, admin_notes ?? null, id]
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Admin World Purchases PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
