/**
 * /api/admin/plans
 * GET  - list all plans (admin)
 * POST - create a new plan
 * PUT  - update an existing plan
 *
 * NOTE: columns `backups`, `ports`, `plan_type` have been removed from
 * the schema/queries. All server plans live in `plans`; world plans
 * are in a separate `world_plans` table and managed via /api/admin/world-plans.
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/config'
import type { Plan } from '@/lib/types'
import type { ResultSetHeader } from 'mysql2'

async function requireAdmin() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.isLoggedIn || !session.userId) return null
  if (!session.isAdmin && session.email !== ADMIN_EMAIL) return null
  return session
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const plans = await query<Plan[]>(
      'SELECT * FROM plans ORDER BY sort_order ASC'
    )
    return NextResponse.json(plans)
  } catch (err) {
    console.error('[Admin Plans GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug, price, cpu_percent, ram_mb, storage_mb, sort_order } = body

    if (!name || !slug || !price || !cpu_percent || !ram_mb || !storage_mb) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await query<ResultSetHeader>(
      `INSERT INTO plans (name, slug, price, cpu_percent, ram_mb, storage_mb, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [name, slug, price, cpu_percent, ram_mb, storage_mb, sort_order ?? 0]
    )

    const plan = await queryOne<Plan>('SELECT * FROM plans WHERE id = ?', [result.insertId])
    return NextResponse.json({ success: true, plan }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg.includes('Duplicate entry')) {
      return NextResponse.json({ error: 'A plan with that slug already exists' }, { status: 400 })
    }
    console.error('[Admin Plans POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, price, cpu_percent, ram_mb, storage_mb, is_active, sort_order } = body

    if (!id) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 })
    }

    await query(
      `UPDATE plans SET name=?, price=?, cpu_percent=?, ram_mb=?, storage_mb=?,
       is_active=?, sort_order=? WHERE id=?`,
      [name, price, cpu_percent, ram_mb, storage_mb, is_active ? 1 : 0, sort_order, id]
    )

    const plan = await queryOne<Plan>('SELECT * FROM plans WHERE id = ?', [id])
    return NextResponse.json({ success: true, plan })
  } catch (err) {
    console.error('[Admin Plans PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
