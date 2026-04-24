/**
 * GET /api/invoices
 * Returns all invoices for the current user, newest first.
 * Admins can pass ?userId=X to get another user's invoices.
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/config'

interface InvoiceRow {
  id: number
  user_id: number
  order_id: number
  server_id: number | null
  server_name: string | null
  amount: number
  type: string
  status: string
  created_at: string
  plan_name: string | null
}

export async function GET(request: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const isAdmin = session.isAdmin || session.email === ADMIN_EMAIL

    // Admins may query any user's invoices; regular users only their own
    let targetUserId = session.userId
    if (isAdmin && searchParams.get('userId')) {
      targetUserId = parseInt(searchParams.get('userId')!)
    }

    const invoices = await query<InvoiceRow[]>(
      `SELECT
         i.*,
         s.server_name,
         p.name AS plan_name
       FROM invoices i
       LEFT JOIN servers s ON s.id = i.server_id
       LEFT JOIN orders  o ON o.id = i.order_id
       LEFT JOIN plans   p ON p.id = o.plan_id
       WHERE i.user_id = ?
       ORDER BY i.created_at DESC`,
      [targetUserId]
    )

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('[Invoices GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
