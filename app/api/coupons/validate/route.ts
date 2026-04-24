/**
 * POST /api/coupons/validate
 *
 * Body: { code: string, amount: number }
 * Returns:
 *   { valid: true, coupon: { id, code, discount_percent }, discount, finalAmount }
 *   { valid: false, error: string }
 *
 * Checks:
 *  - Code exists
 *  - is_active = TRUE
 *  - NOW() between valid_from and valid_until
 *  - used_count < max_uses
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import type { Coupon } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ valid: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { code, amount } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Coupon code is required' }, { status: 400 })
    }

    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json({ valid: false, error: 'Invalid amount' }, { status: 400 })
    }

    const coupon = await queryOne<Coupon>(
      `SELECT *
         FROM coupons
        WHERE code = ?
          AND is_active = 1
          AND valid_from  <= NOW()
          AND valid_until >= NOW()
          AND used_count  <  max_uses
        LIMIT 1`,
      [code.trim().toUpperCase()]
    )

    if (!coupon) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired coupon code' },
        { status: 404 }
      )
    }

    const discountPercent = Number(coupon.discount_percent)
    const discount = Math.round((numericAmount * discountPercent) / 100)
    const finalAmount = Math.max(1, numericAmount - discount)

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_percent: discountPercent,
      },
      discount,
      finalAmount,
    })
  } catch (err) {
    console.error('[coupons/validate] Error:', err)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
