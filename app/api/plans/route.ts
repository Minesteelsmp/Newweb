import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import type { Plan } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'

    const sql = all
      ? 'SELECT * FROM plans ORDER BY sort_order ASC'
      : 'SELECT * FROM plans WHERE is_active = 1 ORDER BY sort_order ASC'

    const plans = await query<Plan[]>(sql)

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
