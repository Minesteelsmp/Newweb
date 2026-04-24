/**
 * POST /api/admin/servers/update
 * body: { serverId, expires_at?, status? }
 *
 * Lets an admin manually override expires_at and/or status for a server.
 * If status changes between active and suspended, the matching Pterodactyl
 * action is also fired (best-effort).
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { suspendServer, unsuspendServer } from '@/lib/pterodactyl'
import { isPanelConfigured } from '@/lib/config'
import type { Server } from '@/lib/types'

const VALID_STATUSES = ['active', 'suspended'] as const

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.isLoggedIn || !session.userId || !session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { serverId, expires_at, status } = await request.json()
    const id = parseInt(String(serverId), 10)
    if (!id) {
      return NextResponse.json({ error: 'Invalid server id' }, { status: 400 })
    }

    const server = await queryOne<Server>(
      `SELECT * FROM servers WHERE id = ?`,
      [id]
    )
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    const setClauses: string[] = []
    const values: any[] = []

    if (expires_at) {
      const d = new Date(expires_at)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid expires_at' }, { status: 400 })
      }
      setClauses.push('expires_at = ?')
      values.push(d.toISOString().slice(0, 19).replace('T', ' '))
    }

    let nextStatus: 'active' | 'suspended' | null = null
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      nextStatus = status
      setClauses.push('status = ?')
      values.push(status)

      if (status === 'suspended') {
        setClauses.push('suspended_at = ?')
        values.push(new Date().toISOString().slice(0, 19).replace('T', ' '))
      } else {
        // No placeholder — direct SQL literal
        setClauses.push('suspended_at = NULL')
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(id)
    await query(
      `UPDATE servers SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    )

    // Best-effort Pterodactyl sync
    if (nextStatus && server.pterodactyl_id && isPanelConfigured) {
      try {
        if (nextStatus === 'suspended' && server.status !== 'suspended') {
          await suspendServer(server.pterodactyl_id)
        } else if (nextStatus === 'active' && server.status === 'suspended') {
          await unsuspendServer(server.pterodactyl_id)
        }
      } catch (err) {
        console.error('[admin/servers/update] Pterodactyl sync failed:', err)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/servers/update] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
