/**
 * GET /api/cron
 * ─────────────────────────────────────────────────────────────
 * Automated maintenance job — runs hourly via Vercel Cron.
 * Configure in vercel.json:
 *   { "crons": [{ "path": "/api/cron", "schedule": "0 * * * *" }] }
 *
 * Actions performed:
 *  1. Send renewal reminder emails for servers expiring in ≤3 days
 *  2. Suspend servers whose expiry_date has passed (DB + Pterodactyl)
 *  3. Permanently delete servers that have been suspended for 7+ days
 *
 * Secured by CRON_SECRET environment variable.
 */
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { suspendServer, deleteServer } from '@/lib/pterodactyl'
import { sendRenewalReminder, sendServerSuspended } from '@/lib/email'
import { CRON_SECRET, isPanelConfigured } from '@/lib/config'
import type { Server } from '@/lib/types'

type ServerWithUser = Server & {
  user_email: string
  user_full_name: string | null
}

export async function GET(request: Request) {
  // ── Auth: require CRON_SECRET in Authorization header ─────
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = {
    reminders_sent: 0,
    servers_suspended: 0,
    servers_deleted: 0,
    errors: [] as string[],
  }

  // ══════════════════════════════════════════════════════════
  // Step 1: Renewal reminder emails (3 days before expiry)
  // ══════════════════════════════════════════════════════════
  try {
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const fourDays  = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)

    const expiringServers = await query<ServerWithUser[]>(
      `SELECT s.*, u.email AS user_email, u.full_name AS user_full_name
       FROM servers s
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'active'
         AND s.expires_at >= ? AND s.expires_at < ?`,
      [
        threeDays.toISOString().slice(0, 19).replace('T', ' '),
        fourDays.toISOString().slice(0, 19).replace('T', ' '),
      ]
    )

    for (const server of expiringServers) {
      try {
        const daysLeft = Math.ceil(
          (new Date(server.expires_at).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
        await sendRenewalReminder({
          to: server.user_email,
          serverName: server.server_name,
          expiresAt: server.expires_at,
          daysLeft,
        })
        results.reminders_sent++
      } catch (err) {
        results.errors.push(`Reminder for server ${server.id}: ${err}`)
      }
    }
  } catch (err) {
    results.errors.push(`Reminder step failed: ${err}`)
  }

  // ══════════════════════════════════════════════════════════
  // Step 2: Suspend expired servers
  // ══════════════════════════════════════════════════════════
  try {
    const expiredServers = await query<ServerWithUser[]>(
      `SELECT s.*, u.email AS user_email, u.full_name AS user_full_name
       FROM servers s
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'active'
         AND s.expires_at < ?`,
      [now.toISOString().slice(0, 19).replace('T', ' ')]
    )

    for (const server of expiredServers) {
      try {
        // 1. Mark as suspended in DB
        await query(
          'UPDATE servers SET status = ?, suspended_at = ? WHERE id = ?',
          [
            'suspended',
            now.toISOString().slice(0, 19).replace('T', ' '),
            server.id,
          ]
        )

        // 2. Suspend on Pterodactyl if provisioned
        if (server.pterodactyl_id && isPanelConfigured) {
          try {
            await suspendServer(server.pterodactyl_id)
          } catch (pteroErr) {
            console.error(
              `[Cron] Pterodactyl suspend failed for server ${server.id}:`,
              pteroErr
            )
          }
        }

        // 3. Notify user via email
        try {
          await sendServerSuspended({
            to: server.user_email,
            serverName: server.server_name,
          })
        } catch (emailErr) {
          console.error(`[Cron] Suspension email failed for server ${server.id}:`, emailErr)
        }

        results.servers_suspended++
      } catch (err) {
        results.errors.push(`Suspend server ${server.id}: ${err}`)
      }
    }
  } catch (err) {
    results.errors.push(`Suspend step failed: ${err}`)
  }

  // ══════════════════════════════════════════════════════════
  // Step 3: Delete servers suspended for 7+ days
  // ══════════════════════════════════════════════════════════
  try {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const serversToDelete = await query<Server[]>(
      `SELECT * FROM servers
       WHERE status = 'suspended' AND suspended_at < ?`,
      [sevenDaysAgo.toISOString().slice(0, 19).replace('T', ' ')]
    )

    for (const server of serversToDelete) {
      try {
        // 1. Delete from Pterodactyl FIRST (before marking deleted in DB)
        if (server.pterodactyl_id && isPanelConfigured) {
          try {
            await deleteServer(server.pterodactyl_id)
          } catch (pteroErr) {
            // Try force-delete if normal delete fails
            try {
              await deleteServer(server.pterodactyl_id, true)
            } catch (forceErr) {
              console.error(
                `[Cron] Could not delete server ${server.id} from panel:`,
                forceErr
              )
            }
          }
        }

        // 2. Mark as deleted in our DB (soft delete — keep record for billing history)
        await query(
          'UPDATE servers SET status = ? WHERE id = ?',
          ['deleted', server.id]
        )

        results.servers_deleted++
      } catch (err) {
        results.errors.push(`Delete server ${server.id}: ${err}`)
      }
    }
  } catch (err) {
    results.errors.push(`Delete step failed: ${err}`)
  }

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    ...results,
  })
}
