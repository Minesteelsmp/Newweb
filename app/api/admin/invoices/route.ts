/**
 * GET /api/admin/invoices
 * Returns all invoices across all users (admin only).
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/config'

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.isAdmin && session.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const invoices = await query<Record<string, unknown>[]>(
      `SELECT i.*, u.email AS user_email, u.full_name AS user_name,
              s.server_name, p.name AS plan_name
       FROM invoices i
       LEFT JOIN users u ON u.id = i.user_id
       LEFT JOIN servers s ON s.id = i.server_id
       LEFT JOIN orders o ON o.id = i.order_id
       LEFT JOIN plans p ON p.id = o.plan_id
       ORDER BY i.created_at DESC
       LIMIT 200`
    )

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('[Admin Invoices] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
