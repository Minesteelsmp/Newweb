import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/config'
import { suspendServer } from '@/lib/pterodactyl'
import type { Server } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = session.isAdmin || session.email === ADMIN_EMAIL
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { serverId } = await request.json()
    if (!serverId) {
      return NextResponse.json({ error: 'Server ID required' }, { status: 400 })
    }

    // Get server details
    const server = await queryOne<Server>(
      'SELECT pterodactyl_id FROM servers WHERE id = ?',
      [serverId]
    )

    // Update server status in database
    await query(
      'UPDATE servers SET status = ?, suspended_at = NOW() WHERE id = ?',
      ['suspended', serverId]
    )

    // Suspend on Pterodactyl if configured
    if (server?.pterodactyl_id) {
      try {
        await suspendServer(server.pterodactyl_id)
      } catch (pteroError) {
        console.error('Failed to suspend on Pterodactyl:', pteroError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error suspending server:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
