/**
 * app/account/page.tsx
 * User account settings — change password, view account info.
 */
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getIronSession } from 'iron-session'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { AccountSettings } from '@/components/account-settings'
import { sessionOptions, SessionData } from '@/lib/session'
import { query, queryOne } from '@/lib/db'
import type { SiteSettings, User, SiteSetting } from '@/lib/types'

export default async function AccountPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.isLoggedIn || !session.userId) {
    redirect('/auth/login?redirect=/account')
  }

  const user = await queryOne<User>(
    'SELECT id, email, full_name, is_admin, created_at FROM users WHERE id = ?',
    [session.userId]
  )

  if (!user) redirect('/auth/login')

  let settings: SiteSettings = {}
  try {
    const rows = await query<SiteSetting[]>('SELECT setting_key, setting_value FROM site_settings')
    settings = rows.reduce((a, r) => { a[r.setting_key] = r.setting_value; return a }, {} as SiteSettings)
  } catch { /* DB not connected */ }

  return (
    <div className="min-h-screen flex flex-col">
      <Header initialUser={user} initialSettings={settings} />
      <main className="flex-1 py-10">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="text-2xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground mb-8">Manage your account details and password.</p>
          <AccountSettings user={user} />
        </div>
      </main>
      <Footer settings={settings} />
    </div>
  )
}
