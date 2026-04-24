/**
 * PATCH  /api/admin/coupons/[id]  - update fields
 * DELETE /api/admin/coupons/[id]  - delete coupon
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'

async function requireAdmin() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.isLoggedIn || !session.userId || !session.isAdmin) return null
  return session
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const couponId = parseInt(id, 10)
  if (!couponId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const body = await request.json()
    const fields: string[] = []
    const values: any[] = []

    if (body.code !== undefined) {
      fields.push('code = ?')
      values.push(String(body.code).trim().toUpperCase())
    }
    if (body.discount_percent !== undefined) {
      const pct = Number(body.discount_percent)
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        return NextResponse.json({ error: 'discount_percent must be 0–100' }, { status: 400 })
      }
      fields.push('discount_percent = ?')
      values.push(pct)
    }
    if (body.max_uses !== undefined) {
      fields.push('max_uses = ?')
      values.push(parseInt(String(body.max_uses), 10) || 1)
    }
    if (body.valid_from !== undefined) {
      fields.push('valid_from = ?')
      values.push(new Date(body.valid_from).toISOString().slice(0, 19).replace('T', ' '))
    }
    if (body.valid_until !== undefined) {
      fields.push('valid_until = ?')
      values.push(new Date(body.valid_until).toISOString().slice(0, 19).replace('T', ' '))
    }
    if (body.is_active !== undefined) {
      fields.push('is_active = ?')
      values.push(body.is_active ? 1 : 0)
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(couponId)
    await query(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`, values)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 })
    }
    console.error('[admin/coupons PATCH] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const couponId = parseInt(id, 10)
  if (!couponId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    await query(`DELETE FROM coupons WHERE id = ?`, [couponId])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/coupons DELETE] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
