import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import type { SoftwareOption } from '@/lib/types'

export async function GET() {
  try {
    const software = await query<SoftwareOption[]>(
      'SELECT * FROM software_options WHERE is_active = 1 ORDER BY sort_order ASC'
    )

    return NextResponse.json({ software })
  } catch (error) {
    console.error('Error fetching software:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
