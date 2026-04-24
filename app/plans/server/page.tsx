import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { PlanCard } from '@/components/plan-card'
import { sessionOptions, SessionData } from '@/lib/session'
import { query, queryOne } from '@/lib/db'
import type { Plan, SiteSettings, User, SiteSetting } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ServerPlansPage() {
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
    const settingsRows = await query<SiteSetting[]>(
      'SELECT setting_key, setting_value FROM site_settings'
    )
    settings = settingsRows.reduce((acc, item) => {
      acc[item.setting_key] = item.setting_value
      return acc
    }, {} as SiteSettings)
  } catch {}

  let plans: Plan[] = []
  try {
    plans = await query<Plan[]>(
      'SELECT * FROM plans WHERE is_active = 1 ORDER BY sort_order ASC'
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
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Server Plans</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Choose the perfect plan for your Minecraft server. All plans include DDoS protection.
            </p>
          </div>

          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan, index) => (
                <PlanCard key={plan.id} plan={plan} index={index} planType="server" />
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer settings={settings} />
    </div>
  )
}
