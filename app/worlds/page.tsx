import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { WorldPlanCard } from '@/components/world-plan-card'
import { sessionOptions, SessionData } from '@/lib/session'
import { query, queryOne } from '@/lib/db'
import type { WorldPlan, SiteSettings, User, SiteSetting } from '@/lib/types'

export default async function WorldsPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  let user: User | null = null
  if (session.isLoggedIn && session.userId) {
    user = await queryOne<User>(
      'SELECT id, email, full_name, is_admin, created_at, updated_at FROM users WHERE id = ?',
      [session.userId]
    )
  }

  let settings: SiteSettings = {}
  try {
    const rows = await query<SiteSetting[]>('SELECT setting_key, setting_value FROM site_settings')
    settings = rows.reduce((acc, r) => { acc[r.setting_key] = r.setting_value; return acc }, {} as SiteSettings)
  } catch {}

  let plans: WorldPlan[] = []
  try {
    plans = await query<WorldPlan[]>(
      'SELECT * FROM world_plans WHERE is_active = 1 ORDER BY sort_order ASC'
    )
  } catch {}

  return (
    <div className="min-h-screen flex flex-col">
      <Header initialUser={user} initialSettings={settings} />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">World Plans</h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-pretty">
              Pre-configured worlds hand-deployed by our team on our
              high-performance infrastructure. Purchase and open a ticket on
              Discord - we&apos;ll set everything up for you.
            </p>
          </div>

          {plans.length === 0 ? (
            <div className="max-w-md mx-auto p-8 rounded-xl border border-dashed border-border/50 text-center text-muted-foreground">
              No world plans available yet. Check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {plans.map((p, i) => (
                <WorldPlanCard
                  key={p.id}
                  plan={p}
                  settings={settings}
                  loggedIn={!!user}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer settings={settings} />
    </div>
  )
}
