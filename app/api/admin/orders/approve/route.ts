/**
 * POST /api/admin/orders/approve
 * Approves an order and triggers the appropriate action:
 *  - new      -> create server on Pterodactyl + DB + invoice
 *  - renewal  -> extend expiry_date + unsuspend if needed + invoice
 *  - upgrade  -> update server resources on panel + DB + invoice
 *
 * Admin-only endpoint.
 *
 * Notes:
 *  - `p.backups`, `p.ports`, `s.nest_id` columns removed from SELECT
 *    (they don't exist in production DB). Defaults are hardcoded below.
 *  - Panel user password is ALWAYS set to the deterministic password
 *    derived from getPterodactylPassword(userId) so SSO works.
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import {
  createPanelUser,
  createServer,
  unsuspendServer,
  updateServerResources,
  getPterodactylPassword,
} from '@/lib/pterodactyl'
import { sendServerCreated } from '@/lib/email'
import {
  ADMIN_EMAIL,
  isPanelConfigured,
  PANEL_URL,
  PANEL_API_KEY,
} from '@/lib/config'
import type { Order, Server } from '@/lib/types'
import type { ResultSetHeader } from 'mysql2'

interface OrderWithDetails extends Order {
  plan_name: string
  plan_cpu_percent: number
  plan_ram_mb: number
  plan_storage_mb: number
  software_egg_id: number | null
  user_email: string
  user_full_name: string | null
  user_db_id: number
  pterodactyl_user_id: number | null
}

/** Force a panel user's password to the deterministic one. */
async function syncPanelUserPassword(panelUserId: number, userId: number, email: string, fullName: string | null) {
  const password = getPterodactylPassword(userId)
  const [firstName, ...rest] = (fullName || email.split('@')[0]).split(' ')

  const res = await fetch(`${PANEL_URL}/api/application/users/${panelUserId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${PANEL_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email,
      username: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 16) + userId,
      first_name: firstName || 'Minecraft',
      last_name: rest.join(' ') || 'Player',
      password,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PATCH /users/${panelUserId} -> ${res.status}: ${text}`)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.isAdmin && session.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orderId } = await request.json()
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    // -- Fetch order with joined data (invalid columns removed) ---
    const order = await queryOne<OrderWithDetails>(
      `SELECT
         o.*,
         p.name           AS plan_name,
         p.cpu_percent    AS plan_cpu_percent,
         p.ram_mb         AS plan_ram_mb,
         p.storage_mb     AS plan_storage_mb,
         s.egg_id         AS software_egg_id,
         u.id             AS user_db_id,
         u.email          AS user_email,
         u.full_name      AS user_full_name,
         u.pterodactyl_user_id
       FROM orders o
       LEFT JOIN plans            p ON p.id = o.plan_id
       LEFT JOIN software_options s ON s.id = o.software_id
       LEFT JOIN users            u ON u.id = o.user_id
       WHERE o.id = ?`,
      [orderId]
    )

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: `Order is already ${order.status}` },
        { status: 400 }
      )
    }

    // Mark order as approved
    await query('UPDATE orders SET status = ? WHERE id = ?', ['approved', orderId])

    const settingRow = await queryOne<{ setting_value: string }>(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'panel_url'"
    )
    const panelUrl = settingRow?.setting_value || PANEL_URL

    // Hardcoded defaults (these columns don't exist in DB)
    const DEFAULT_BACKUPS = 1
    const DEFAULT_PORTS = 1

    // NEW ORDER: provision a fresh server
    if (order.order_type === 'new') {
      let pterodactylServerId: number | null = null
      let pterodactylUuid: string | null = null
      let pterodactylIdentifier: string | null = null

      if (isPanelConfigured) {
        try {
          let pteroUserId = order.pterodactyl_user_id

          if (!pteroUserId) {
            // No panel user yet - create one with the deterministic password
            const pteroUser = await createPanelUser({
              userId: order.user_db_id,
              email: order.user_email,
              fullName: order.user_full_name || order.user_email.split('@')[0],
            })
            pteroUserId = pteroUser.id

            await query(
              'UPDATE users SET pterodactyl_user_id = ? WHERE id = ?',
              [pteroUserId, order.user_db_id]
            )
          } else {
            // Existing panel user - force their password to the deterministic one
            // so SSO works even for legacy accounts.
            try {
              await syncPanelUserPassword(
                pteroUserId,
                order.user_db_id,
                order.user_email,
                order.user_full_name
              )
            } catch (syncErr) {
              console.error('[Approve] Panel password sync failed:', syncErr)
            }
          }

          const pteroServer = await createServer({
            name: order.server_name,
            userId: pteroUserId,
            eggId: order.software_egg_id ?? undefined,
            cpu: order.plan_cpu_percent,
            ram: order.plan_ram_mb,
            disk: order.plan_storage_mb,
            backups: DEFAULT_BACKUPS,
            ports: DEFAULT_PORTS,
          })

          pterodactylServerId = pteroServer.id
          pterodactylUuid = pteroServer.uuid
          pterodactylIdentifier = pteroServer.identifier
        } catch (pteroErr) {
          console.error('[Approve] Pterodactyl server creation failed:', pteroErr)
        }
      }

      // 30-day expiry
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      const serverResult = await query<ResultSetHeader>(
        `INSERT INTO servers
           (user_id, plan_id, software_id, server_name, status, expires_at,
            pterodactyl_id, pterodactyl_uuid, pterodactyl_identifier)
         VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
        [
          order.user_id,
          order.plan_id,
          order.software_id,
          order.server_name,
          expiresAt.toISOString().slice(0, 19).replace('T', ' '),
          pterodactylServerId,
          pterodactylUuid,
          pterodactylIdentifier,
        ]
      )
      const newServerId = serverResult.insertId

      await query<ResultSetHeader>(
        `INSERT INTO invoices (user_id, order_id, server_id, amount, type, status)
         VALUES (?, ?, ?, ?, 'new', 'paid')`,
        [order.user_id, orderId, newServerId, order.amount]
      )

      try {
        await sendServerCreated({
          to: order.user_email,
          serverName: order.server_name,
          planName: order.plan_name,
          panelUrl,
        })
      } catch (emailErr) {
        console.error('[Approve] Email send failed:', emailErr)
      }
    }

    // RENEWAL ORDER: extend expiry + unsuspend
    else if (order.order_type === 'renewal' && order.related_server_id) {
      const server = await queryOne<Server>(
        'SELECT * FROM servers WHERE id = ?',
        [order.related_server_id]
      )

      if (server) {
        // Extend 30 days from current expiry (if in future) or today (if already expired)
        const baseDate =
          new Date(server.expires_at) > new Date()
            ? new Date(server.expires_at)
            : new Date()
        baseDate.setDate(baseDate.getDate() + 30)

        await query(
          'UPDATE servers SET expires_at = ?, status = ?, suspended_at = NULL WHERE id = ?',
          [
            baseDate.toISOString().slice(0, 19).replace('T', ' '),
            'active',
            order.related_server_id,
          ]
        )

        if (server.status === 'suspended' && server.pterodactyl_id && isPanelConfigured) {
          try {
            await unsuspendServer(server.pterodactyl_id)
          } catch (pteroErr) {
            console.error('[Approve Renewal] Unsuspend failed:', pteroErr)
          }
        }

        await query(
          `INSERT INTO invoices (user_id, order_id, server_id, amount, type, status)
           VALUES (?, ?, ?, ?, 'renewal', 'paid')`,
          [order.user_id, orderId, order.related_server_id, order.amount]
        )
      }
    }

    // UPGRADE ORDER: update resources
    else if (order.order_type === 'upgrade' && order.related_server_id) {
      const server = await queryOne<Server>(
        'SELECT * FROM servers WHERE id = ?',
        [order.related_server_id]
      )

      if (server) {
        await query(
          'UPDATE servers SET plan_id = ? WHERE id = ?',
          [order.plan_id, order.related_server_id]
        )

        if (server.pterodactyl_id && isPanelConfigured) {
          try {
            await updateServerResources(server.pterodactyl_id, {
              cpu: order.plan_cpu_percent,
              ram: order.plan_ram_mb,
              disk: order.plan_storage_mb,
              backups: DEFAULT_BACKUPS,
              ports: DEFAULT_PORTS,
            })
          } catch (pteroErr) {
            console.error('[Approve Upgrade] Update resources failed:', pteroErr)
          }
        }

        await query(
          `INSERT INTO invoices (user_id, order_id, server_id, amount, type, status)
           VALUES (?, ?, ?, ?, 'upgrade', 'paid')`,
          [order.user_id, orderId, order.related_server_id, order.amount]
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Approve] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
