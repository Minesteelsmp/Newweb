/**
 * GET  /api/orders - list current user's orders (all statuses)
 * POST /api/orders - create a new order
 *
 * NOTE: For upgrade orders, the client may submit a pro-rata `amount`.
 * For new/renewal orders, the amount is always the plan's full price.
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { sendOrderConfirmation } from '@/lib/email'
import { apiLimiter } from '@/lib/rate-limit'
import type { Plan, Order, Coupon } from '@/lib/types'
import type { ResultSetHeader } from 'mysql2'

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orders = await query<(Order & { plan_name: string })[]>(
      `SELECT o.*,
         p.name AS plan_name, p.slug AS plan_slug, p.price AS plan_price
       FROM orders o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [session.userId]
    )

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('[Orders GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const rl = apiLimiter.check(request, 'order')
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      planId,
      softwareId,
      serverName,
      orderType,
      paymentSenderName,
      relatedServerId,
      customAmount,
      couponCode,
    } = body

    if (!planId || !serverName || !orderType || !paymentSenderName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['new', 'renewal', 'upgrade'].includes(orderType)) {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 })
    }

    const cleanName = serverName.trim()
    if (cleanName.length < 2 || cleanName.length > 100) {
      return NextResponse.json(
        { error: 'Server name must be between 2 and 100 characters' },
        { status: 400 }
      )
    }

    const plan = await queryOne<Plan>('SELECT * FROM plans WHERE id = ? AND is_active = 1', [planId])
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if ((orderType === 'renewal' || orderType === 'upgrade') && relatedServerId) {
      const serverOwner = await queryOne<{ user_id: number }>(
        'SELECT user_id FROM servers WHERE id = ? AND user_id = ?',
        [relatedServerId, session.userId]
      )
      if (!serverOwner) {
        return NextResponse.json({ error: 'Server not found' }, { status: 404 })
      }
    }

    // Pro-rata: upgrade orders may submit a smaller custom amount.
    // We clamp to [1, plan.price] to prevent abuse.
    let baseAmount = plan.price
    if (orderType === 'upgrade' && typeof customAmount === 'number' && customAmount > 0) {
      baseAmount = Math.min(Math.max(1, Math.round(customAmount)), plan.price)
    }

    // Coupon validation (server-side, authoritative)
    let couponId: number | null = null
    let finalAmount = baseAmount
    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const coupon = await queryOne<Coupon>(
        `SELECT * FROM coupons
          WHERE code = ?
            AND is_active = 1
            AND valid_from  <= NOW()
            AND valid_until >= NOW()
            AND used_count  <  max_uses
          LIMIT 1`,
        [couponCode.trim().toUpperCase()]
      )

      if (coupon) {
        const pct = Number(coupon.discount_percent)
        const discount = Math.round((baseAmount * pct) / 100)
        finalAmount = Math.max(1, baseAmount - discount)
        couponId = coupon.id

        // Reserve a use atomically (only if still under the cap)
        await query(
          `UPDATE coupons
              SET used_count = used_count + 1
            WHERE id = ?
              AND used_count < max_uses`,
          [coupon.id]
        )
      }
    }

    const result = await query<ResultSetHeader>(
      `INSERT INTO orders
         (user_id, plan_id, software_id, server_name, order_type,
          payment_sender_name, amount, original_amount, coupon_id,
          status, related_server_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        session.userId,
        planId,
        softwareId || null,
        cleanName,
        orderType,
        paymentSenderName.trim(),
        finalAmount,
        baseAmount,
        couponId,
        relatedServerId || null,
      ]
    )

    const orderId = result.insertId

    try {
      if (session.email) {
        await sendOrderConfirmation({
          to: session.email,
          orderId: orderId.toString(),
          serverName: cleanName,
          planName: plan.name,
          amount: finalAmount,
        })
      }
    } catch (emailErr) {
      console.error('[Orders POST] Email failed:', emailErr)
    }

    return NextResponse.json({ success: true, orderId, amount: finalAmount })
  } catch (error) {
    console.error('[Orders POST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
