/**
 * GET /api/cron/suspend-expired
 *
 * Auto-suspend any active server whose `expires_at <= NOW()`.
 * Sets `status='suspended'` and `suspended_at=NOW()` and tries to suspend
 * the matching Pterodactyl server (best-effort).
 *
 * Authentication:
 *   - Requires either `?key=<CRON_API_KEY>` query string OR
 *     `Authorization: Bearer <CRON_API_KEY>` header.
 *   - Falls back to CRON_SECRET if CRON_API_KEY is not set, so this works
 *     with both Vercel Cron and a custom PM2 cron job.
 *
 * Suggested PM2 cron (every 5 minutes):
 *   pm2 start --name "cubiq-suspend" --cron "*\/5 * * * *" --no-autorestart \
 *     -- bash -c "curl -s 'https://your-domain.com/api/cron/suspend-expired?key=$CRON_API_KEY'"
 */
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { suspendServer } from '@/lib/pterodactyl'
import { isPanelConfigured } from '@/lib/config'
import type { Server } from '@/lib/types'

const CRON_API_KEY = process.env.CRON_API_KEY ?? process.env.CRON_SECRET ?? ''

export async function GET(request: Request) {
  // ── Auth ───────────────────────────────────────────────
  if (!CRON_API_KEY) {
    return NextResponse.json(
      { error: 'CRON_API_KEY is not configured on the server' },
      { status: 500 }
    )
  }

  const url = new URL(request.url)
  const queryKey = url.searchParams.get('key')
  const authHeader = request.headers.get('authorization')

  const ok =
    queryKey === CRON_API_KEY ||
    authHeader === `Bearer ${CRON_API_KEY}`

  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Find expired active servers ────────────────────────
  const now = new Date()
  const nowSql = now.toISOString().slice(0, 19).replace('T', ' ')

  const result = {
    suspended: 0,
    panel_failures: 0,
    errors: [] as string[],
  }

  try {
    const expired = await query<Server[]>(
      `SELECT * FROM servers
       WHERE status = 'active'
         AND expires_at <= ?`,
      [nowSql]
    )

    for (const server of expired) {
      try {
        await query(
          `UPDATE servers
             SET status = 'suspended',
                 suspended_at = ?
           WHERE id = ?`,
          [nowSql, server.id]
        )

        if (server.pterodactyl_id && isPanelConfigured) {
          try {
            await suspendServer(server.pterodactyl_id)
          } catch (pteroErr) {
            result.panel_failures++
            console.error(
              `[Cron suspend-expired] Pterodactyl suspend failed for server ${server.id}:`,
              pteroErr
            )
          }
        }

        result.suspended++
      } catch (err) {
        result.errors.push(`server ${server.id}: ${String(err)}`)
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'Database query failed', details: String(err) },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    ...result,
  })
}
