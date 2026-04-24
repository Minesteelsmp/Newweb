/**
 * POST /api/world-purchases - user initiates a world purchase
 * GET  /api/world-purchases - user lists their own purchases
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { apiLimiter } from '@/lib/rate-limit'
import type { WorldPlan, WorldPurchase } from '@/lib/types'
import type { ResultSetHeader } from 'mysql2'

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const purchases = await query<(WorldPurchase & { world_plan_name: string; world_plan_price: number })[]>(
      `SELECT wp.*, w.name AS world_plan_name, w.price AS world_plan_price
       FROM world_purchases wp
       LEFT JOIN world_plans w ON w.id = wp.world_plan_id
       WHERE wp.user_id = ?
       ORDER BY wp.created_at DESC`,
      [session.userId]
    )

    return NextResponse.json({ purchases })
  } catch (err) {
    console.error('[World Purchases GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const rl = apiLimiter.check(request, 'world-purchase')
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { worldPlanId, paymentSenderName } = await request.json()
    if (!worldPlanId) {
      return NextResponse.json({ error: 'World plan ID required' }, { status: 400 })
    }

    const plan = await queryOne<WorldPlan>(
      'SELECT * FROM world_plans WHERE id = ? AND is_active = 1',
      [worldPlanId]
    )
    if (!plan) {
      return NextResponse.json({ error: 'World plan not found' }, { status: 404 })
    }

    const result = await query<ResultSetHeader>(
      `INSERT INTO world_purchases (user_id, world_plan_id, payment_sender_name, status)
       VALUES (?, ?, ?, 'pending')`,
      [session.userId, worldPlanId, paymentSenderName?.trim() || null]
    )

    return NextResponse.json({ success: true, purchaseId: result.insertId })
  } catch (err) {
    console.error('[World Purchases POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
