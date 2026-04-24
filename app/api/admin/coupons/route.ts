/**
 * GET  /api/admin/coupons          - list all coupons
 * POST /api/admin/coupons          - create a coupon
 *   body: { code, discount_percent, max_uses, valid_from, valid_until, is_active }
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import type { Coupon } from '@/lib/types'
import type { ResultSetHeader } from 'mysql2'

async function requireAdmin() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.isLoggedIn || !session.userId || !session.isAdmin) {
    return null
  }
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const coupons = await query<Coupon[]>(
      `SELECT * FROM coupons ORDER BY created_at DESC`
    )
    return NextResponse.json({ coupons })
  } catch (err) {
    console.error('[admin/coupons GET] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const {
      code,
      discount_percent,
      max_uses,
      valid_from,
      valid_until,
      is_active,
    } = body

    if (!code || !discount_percent || !valid_from || !valid_until) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const cleanCode = String(code).trim().toUpperCase()
    if (cleanCode.length === 0 || cleanCode.length > 20) {
      return NextResponse.json({ error: 'Code length must be 1–20 characters' }, { status: 400 })
    }

    const pct = Number(discount_percent)
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return NextResponse.json({ error: 'discount_percent must be 0–100' }, { status: 400 })
    }

    const uses = Math.max(1, Math.min(1_000_000, parseInt(String(max_uses ?? 1), 10) || 1))

    const result = await query<ResultSetHeader>(
      `INSERT INTO coupons
        (code, discount_percent, max_uses, used_count, valid_from, valid_until, is_active)
       VALUES (?, ?, ?, 0, ?, ?, ?)`,
      [
        cleanCode,
        pct,
        uses,
        new Date(valid_from).toISOString().slice(0, 19).replace('T', ' '),
        new Date(valid_until).toISOString().slice(0, 19).replace('T', ' '),
        is_active === false ? 0 : 1,
      ]
    )

    return NextResponse.json({ success: true, id: result.insertId })
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 })
    }
    console.error('[admin/coupons POST] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
