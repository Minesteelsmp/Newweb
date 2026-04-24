import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/config'

interface Stats {
  totalUsers: number
  totalOrders: number
  pendingOrders: number
  totalServers: number
  activeServers: number
  totalRevenue: number
}

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

    const totalUsers = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users')
    const totalOrders = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM orders')
    const pendingOrders = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'")
    const totalServers = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM servers WHERE status != 'deleted'")
    const activeServers = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM servers WHERE status = 'active'")
    const totalRevenue = await queryOne<{ total: number }>("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'approved'")

    const stats: Stats = {
      totalUsers: totalUsers?.count || 0,
      totalOrders: totalOrders?.count || 0,
      pendingOrders: pendingOrders?.count || 0,
      totalServers: totalServers?.count || 0,
      activeServers: activeServers?.count || 0,
      totalRevenue: totalRevenue?.total || 0,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
