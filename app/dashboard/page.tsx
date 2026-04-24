import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getIronSession } from 'iron-session'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { DashboardContent } from '@/components/dashboard-content'
import { sessionOptions, SessionData } from '@/lib/session'
import { query, queryOne } from '@/lib/db'
import type { SiteSettings, User, Server, Order, Plan, SiteSetting } from '@/lib/types'

export default async function DashboardPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.isLoggedIn || !session.userId) {
    redirect('/auth/login?redirect=/dashboard')
  }

  const user = await queryOne<User>(
    'SELECT id, email, full_name, is_admin, pterodactyl_user_id, created_at, updated_at FROM users WHERE id = ?',
    [session.userId]
  )

  if (!user) {
    redirect('/auth/login?redirect=/dashboard')
  }

  // Site settings
  let settings: SiteSettings = {}
  try {
    const rows = await query<SiteSetting[]>('SELECT setting_key, setting_value FROM site_settings')
    settings = rows.reduce((acc, r) => { acc[r.setting_key] = r.setting_value; return acc }, {} as SiteSettings)
  } catch { /* DB not connected yet */ }

  // User's servers (owned + shared with them).
  // NOTE: columns p.backups / p.ports / p.plan_type removed - defaults applied in app code.
  let servers: (Server & { plan: Plan })[] = []
  try {
    const rows = await query<(Server & {
      plan_name: string; plan_slug: string; plan_price: number
      plan_cpu_percent: number; plan_ram_mb: number; plan_storage_mb: number
      software_name: string | null
    })[]>(
      `(SELECT s.*,
          p.name AS plan_name, p.slug AS plan_slug, p.price AS plan_price,
          p.cpu_percent AS plan_cpu_percent, p.ram_mb AS plan_ram_mb,
          p.storage_mb AS plan_storage_mb,
          sw.name AS software_name
        FROM servers s
        LEFT JOIN plans p ON p.id = s.plan_id
        LEFT JOIN software_options sw ON sw.id = s.software_id
        WHERE s.user_id = ? AND s.status != 'deleted')
       UNION
       (SELECT s.*,
          p.name AS plan_name, p.slug AS plan_slug, p.price AS plan_price,
          p.cpu_percent AS plan_cpu_percent, p.ram_mb AS plan_ram_mb,
          p.storage_mb AS plan_storage_mb,
          sw.name AS software_name
        FROM servers s
        JOIN server_subusers su ON su.server_id = s.id AND su.shared_user_id = ?
        LEFT JOIN plans p ON p.id = s.plan_id
        LEFT JOIN software_options sw ON sw.id = s.software_id
        WHERE s.status != 'deleted')
       ORDER BY created_at DESC`,
      [session.userId, session.userId]
    )
    servers = rows.map(row => ({
      ...row,
      plan: {
        id: row.plan_id,
        name: row.plan_name,
        slug: row.plan_slug,
        price: row.plan_price,
        cpu_percent: row.plan_cpu_percent,
        ram_mb: row.plan_ram_mb,
        storage_mb: row.plan_storage_mb,
        is_active: true,
        sort_order: 0,
        created_at: '',
        updated_at: '',
      } as Plan,
    }))
  } catch { /* DB not connected yet */ }

  // Pending orders (for banner)
  let pendingOrders: (Order & { plan: Plan })[] = []
  try {
    const rows = await query<(Order & { plan_name: string; plan_slug: string; plan_price: number })[]>(
      `SELECT o.*, p.name AS plan_name, p.slug AS plan_slug, p.price AS plan_price
       FROM orders o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.user_id = ? AND o.status = 'pending'
       ORDER BY o.created_at DESC`,
      [session.userId]
    )
    pendingOrders = rows.map(row => ({
      ...row,
      plan: { id: row.plan_id, name: row.plan_name, slug: row.plan_slug, price: row.plan_price } as Plan,
    }))
  } catch { /* DB not connected yet */ }

  // All plans (for upgrade modal)
  let plans: Plan[] = []
  try {
    plans = await query<Plan[]>('SELECT * FROM plans WHERE is_active = 1 ORDER BY sort_order ASC')
  } catch { /* DB not connected yet */ }

  return (
    <div className="min-h-screen flex flex-col">
      <Header initialUser={user} initialSettings={settings} />
      <main className="flex-1 py-10">
        <DashboardContent
          profile={user}
          servers={servers}
          pendingOrders={pendingOrders}
          allPlans={plans}
          settings={settings}
        />
      </main>
      <Footer settings={settings} />
    </div>
  )
}
