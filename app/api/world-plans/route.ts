/**
 * GET /api/world-plans - list all active world plans (public)
 */
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import type { WorldPlan } from '@/lib/types'

export async function GET() {
  try {
    const plans = await query<WorldPlan[]>(
      'SELECT * FROM world_plans WHERE is_active = 1 ORDER BY sort_order ASC'
    )
    return NextResponse.json({ plans })
  } catch (err) {
    console.error('[World Plans GET]', err)
    return NextResponse.json({ plans: [] })
  }
}
