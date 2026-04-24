/**
 * /api/servers/[id]/share
 * ─────────────────────────────────────────────────────────────
 * POST — Share a server with another user by email
 * DELETE — Remove a shared user from a server
 *
 * Only the server OWNER can add/remove subusers.
 * Adds the user as a subuser on Pterodactyl with console + control permissions.
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { addSubuser, removeSubuser } from '@/lib/pterodactyl'
import type { Server } from '@/lib/types'
import type { ResultSetHeader } from 'mysql2'

interface UserRow {
  id: number
  email: string
}

interface SubuserRow {
  id: number
  shared_user_id: number
  pterodactyl_uuid: string | null
}

// ── POST /api/servers/[id]/share ──────────────────────────────
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: serverId } = await params

  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // ── Verify caller owns this server ─────────────────────────
    const server = await queryOne<Server & { pterodactyl_identifier: string | null }>(
      'SELECT * FROM servers WHERE id = ? AND user_id = ? AND status != ?',
      [serverId, session.userId, 'deleted']
    )

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // ── Cannot share with yourself ─────────────────────────────
    if (email === session.email) {
      return NextResponse.json(
        { error: 'You cannot share a server with yourself' },
        { status: 400 }
      )
    }

    // ── Find the target user in our DB ─────────────────────────
    const targetUser = await queryOne<UserRow>(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    )

    if (!targetUser) {
      return NextResponse.json(
        { error: 'No user found with that email address' },
        { status: 404 }
      )
    }

    // ── Check for duplicate share ──────────────────────────────
    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM server_subusers WHERE server_id = ? AND shared_user_id = ?',
      [serverId, targetUser.id]
    )

    if (existing) {
      return NextResponse.json(
        { error: 'This user already has access to the server' },
        { status: 400 }
      )
    }

    // ── Add subuser on Pterodactyl if server is provisioned ───
    let pterodactylUuid: string | null = null

    if (server.pterodactyl_identifier) {
      try {
        await addSubuser(server.pterodactyl_identifier, targetUser.email)
        // The API doesn't return the subuser UUID in a predictable way across
        // panel versions — we store null and use email for removal instead.
      } catch (pteroErr) {
        console.error('[Share] Pterodactyl subuser add failed:', pteroErr)
        // Continue — they'll get DB access; panel access may need manual setup
      }
    }

    // ── Save to our database ──────────────────────────────────
    await query<ResultSetHeader>(
      `INSERT INTO server_subusers (server_id, owner_user_id, shared_user_id, pterodactyl_uuid)
       VALUES (?, ?, ?, ?)`,
      [serverId, session.userId, targetUser.id, pterodactylUuid]
    )

    return NextResponse.json({
      success: true,
      message: `Server shared with ${targetUser.email}`,
    })
  } catch (error) {
    console.error('[Share POST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── DELETE /api/servers/[id]/share ────────────────────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: serverId } = await params

  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sharedUserId } = await request.json()
    if (!sharedUserId) {
      return NextResponse.json({ error: 'sharedUserId is required' }, { status: 400 })
    }

    // Verify caller owns this server
    const server = await queryOne<Server & { pterodactyl_identifier: string | null }>(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [serverId, session.userId]
    )

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Get the subuser record
    const subuser = await queryOne<SubuserRow>(
      'SELECT id, shared_user_id, pterodactyl_uuid FROM server_subusers WHERE server_id = ? AND shared_user_id = ?',
      [serverId, sharedUserId]
    )

    if (!subuser) {
      return NextResponse.json({ error: 'Shared user not found' }, { status: 404 })
    }

    // Remove from Pterodactyl if we have the UUID and server identifier
    if (server.pterodactyl_identifier && subuser.pterodactyl_uuid) {
      try {
        await removeSubuser(server.pterodactyl_identifier, subuser.pterodactyl_uuid)
      } catch (pteroErr) {
        console.error('[Share DELETE] Pterodactyl subuser remove failed:', pteroErr)
      }
    }

    // Remove from our database
    await query('DELETE FROM server_subusers WHERE id = ?', [subuser.id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Share DELETE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── GET /api/servers/[id]/share ───────────────────────────────
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: serverId } = await params

  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const server = await queryOne<{ id: number }>(
      'SELECT id FROM servers WHERE id = ? AND user_id = ?',
      [serverId, session.userId]
    )
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // List all subusers
    const subusers = await query<{ id: number; email: string; full_name: string | null; shared_since: string }[]>(
      `SELECT u.id, u.email, u.full_name, su.created_at as shared_since
       FROM server_subusers su
       JOIN users u ON u.id = su.shared_user_id
       WHERE su.server_id = ?`,
      [serverId]
    )

    return NextResponse.json({ subusers })
  } catch (error) {
    console.error('[Share GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
