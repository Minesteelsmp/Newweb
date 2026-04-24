import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/config'
import type { Server } from '@/lib/types'

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

    const servers = await query<Server[]>(
      `SELECT s.*, 
        p.name as plan_name, p.slug as plan_slug, p.price as plan_price,
        p.cpu_percent as plan_cpu_percent, p.ram_mb as plan_ram_mb, p.storage_mb as plan_storage_mb,
        sw.name as software_name,
        u.email as user_email, u.full_name as user_full_name
       FROM servers s
       LEFT JOIN plans p ON s.plan_id = p.id
       LEFT JOIN software_options sw ON s.software_id = sw.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.status != 'deleted'
       ORDER BY s.created_at DESC`
    )

    return NextResponse.json({ servers })
  } catch (error) {
    console.error('Error fetching admin servers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
