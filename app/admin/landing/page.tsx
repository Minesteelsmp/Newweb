import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/config'
import { query } from '@/lib/db'
import type { SiteSetting, SiteSettings } from '@/lib/types'
import { LandingCustomizer } from '@/components/admin/landing-customizer'

export const dynamic = 'force-dynamic'

export default async function AdminLandingPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.isLoggedIn || !(session.isAdmin || session.email === ADMIN_EMAIL)) {
    redirect('/auth/login')
  }

  let settings: SiteSettings = {}
  try {
    const rows = await query<SiteSetting[]>(
      'SELECT setting_key, setting_value FROM site_settings'
    )
    settings = rows.reduce((acc, r) => {
      acc[r.setting_key] = r.setting_value
      return acc
    }, {} as SiteSettings)
  } catch {}

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Landing Page Customizer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit the hero section copy, branding and background. Changes are saved to <code>site_settings</code>.
        </p>
      </div>

      <LandingCustomizer initialSettings={settings} />
    </div>
  )
}
