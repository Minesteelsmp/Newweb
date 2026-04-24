/**
 * GET/POST/PUT/DELETE - admin management for world_plans
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/config'
import type { WorldPlan } from '@/lib/types'
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
    const plans = await query<WorldPlan[]>('SELECT * FROM world_plans ORDER BY sort_order ASC')
    return NextResponse.json({ plans })
  } catch (err) {
    console.error('[Admin World Plans GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const { name, slug, description, price, cpu_percent, ram_mb, storage_mb, sort_order } = body

    if (!name || !slug || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await query<ResultSetHeader>(
      `INSERT INTO world_plans (name, slug, description, price, cpu_percent, ram_mb, storage_mb, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [name, slug, description || null, price, cpu_percent ?? 100, ram_mb ?? 2048, storage_mb ?? 5120, sort_order ?? 0]
    )
    const plan = await queryOne<WorldPlan>('SELECT * FROM world_plans WHERE id = ?', [result.insertId])
    return NextResponse.json({ success: true, plan }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown'
    if (msg.includes('Duplicate entry')) {
      return NextResponse.json({ error: 'A world plan with that slug already exists' }, { status: 400 })
    }
    console.error('[Admin World Plans POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const { id, name, description, price, cpu_percent, ram_mb, storage_mb, is_active, sort_order } = body
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await query(
      `UPDATE world_plans SET name=?, description=?, price=?, cpu_percent=?, ram_mb=?, storage_mb=?, is_active=?, sort_order=? WHERE id=?`,
      [name, description || null, price, cpu_percent, ram_mb, storage_mb, is_active ? 1 : 0, sort_order, id]
    )
    const plan = await queryOne<WorldPlan>('SELECT * FROM world_plans WHERE id = ?', [id])
    return NextResponse.json({ success: true, plan })
  } catch (err) {
    console.error('[Admin World Plans PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
