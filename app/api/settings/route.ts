import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/config'
import type { SiteSetting, SiteSettings } from '@/lib/types'

export async function GET() {
  try {
    const settingsRows = await query<SiteSetting[]>(
      'SELECT setting_key, setting_value FROM site_settings'
    )

    const settings: SiteSettings = settingsRows.reduce((acc, item) => {
      acc[item.setting_key] = item.setting_value
      return acc
    }, {} as SiteSettings)

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = session.isAdmin || session.email === ADMIN_EMAIL
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { settings } = await request.json()

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await query(
        'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value as string, value as string]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
