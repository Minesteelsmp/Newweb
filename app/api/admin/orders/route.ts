import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/config'
import type { Order } from '@/lib/types'

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = session.isAdmin || session.email === ADMIN_EMAIL
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orders = await query<Order[]>(
      `SELECT o.*, 
        p.name as plan_name, p.slug as plan_slug, p.price as plan_price,
        s.name as software_name,
        u.email as user_email, u.full_name as user_full_name
       FROM orders o
       LEFT JOIN plans p ON o.plan_id = p.id
       LEFT JOIN software_options s ON o.software_id = s.id
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    )

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Error fetching admin orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
