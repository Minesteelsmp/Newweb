import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getIronSession } from 'iron-session'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { OrderForm } from '@/components/order-form'
import { sessionOptions, SessionData } from '@/lib/session'
import { query, queryOne } from '@/lib/db'
import type { Plan, SoftwareOption, SiteSettings, User, SiteSetting } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface OrderPageProps {
  params: Promise<{
    type: 'server' | 'world'
    slug: string
  }>
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { type, slug } = await params

  // World orders now have their own flow at /worlds
  if (type === 'world') {
    redirect('/worlds')
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.isLoggedIn || !session.userId) {
    redirect(`/auth/login?redirect=/order/${type}/${slug}`)
  }

  const user = await queryOne<User>(
    'SELECT id, email, full_name, is_admin, created_at, updated_at FROM users WHERE id = ?',
    [session.userId]
  )

  if (!user) {
    redirect(`/auth/login?redirect=/order/${type}/${slug}`)
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

  // Fetch plan without plan_type filter (table holds server plans only)
  let plan: Plan | null = null
  try {
    plan = await queryOne<Plan>(
      'SELECT * FROM plans WHERE slug = ? AND is_active = 1',
      [slug]
    )
  } catch {}

  if (!plan) {
    redirect(`/plans/${type}`)
  }

  let softwareOptions: SoftwareOption[] = []
  try {
    softwareOptions = await query<SoftwareOption[]>(
      'SELECT * FROM software_options WHERE is_active = 1 ORDER BY sort_order ASC'
    )
  } catch {}

  return (
    <div className="min-h-screen flex flex-col">
      <Header initialUser={user} initialSettings={settings} />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <Link
            href={`/plans/${type}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to plans
          </Link>

          <OrderForm
            plan={plan}
            planType={type}
            softwareOptions={softwareOptions}
            userEmail={user.email}
            settings={settings}
          />
        </div>
      </main>

      <Footer settings={settings} />
    </div>
  )
}
