/**
 * app/admin/page.tsx
 * Admin home dashboard — live stats + recent order activity.
 */
import { query, queryOne } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RecentActivity } from '@/components/admin/admin-dashboard'
import {
  DollarSign, Users, Server, ShoppingCart, AlertTriangle, Activity,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface RecentOrder {
  id: number
  server_name: string
  user_email: string
  plan_name: string
  amount: number
  status: string
  order_type: string
  created_at: string
}

export default async function AdminDashboardPage() {
  // ── Stats ────────────────────────────────────────────────
  let totalUsers     = 0
  let totalRevenue   = 0
  let activeServers  = 0
  let suspendedServers = 0
  let pendingOrders  = 0
  let recentOrders: RecentOrder[] = []

  try {
    const [uRes, revRes, actRes, susRes, pendRes, recRes] = await Promise.all([
      queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM users'),
      queryOne<{ t: number }>('SELECT COALESCE(SUM(amount),0) AS t FROM invoices WHERE status="paid"'),
      queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM servers WHERE status="active"'),
      queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM servers WHERE status="suspended"'),
      queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM orders  WHERE status="pending"'),
      query<RecentOrder[]>(
        `SELECT o.id, o.server_name, o.amount, o.status, o.order_type, o.created_at,
                u.email AS user_email, p.name AS plan_name
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         LEFT JOIN plans p ON p.id = o.plan_id
         ORDER BY o.created_at DESC LIMIT 8`
      ),
    ])

    totalUsers     = uRes?.c   ?? 0
    totalRevenue   = revRes?.t  ?? 0
    activeServers  = actRes?.c  ?? 0
    suspendedServers = susRes?.c ?? 0
    pendingOrders  = pendRes?.c ?? 0
    recentOrders   = recRes
  } catch (err) {
    console.error('[Admin Dashboard]', err)
  }

  const stats = [
    {
      title: 'Total Revenue',
      value: `₹${Number(totalRevenue).toLocaleString('en-IN')}`,
      sub: 'From paid invoices',
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Total Users',
      value: totalUsers,
      sub: 'Registered accounts',
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Active Servers',
      value: activeServers,
      sub: `${suspendedServers} suspended`,
      icon: Server,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Pending Orders',
      value: pendingOrders,
      sub: 'Awaiting approval',
      icon: ShoppingCart,
      color: pendingOrders > 0 ? 'text-amber-500' : 'text-muted-foreground',
      bg: pendingOrders > 0 ? 'bg-amber-500/10' : 'bg-secondary',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Hosting business overview</p>
        </div>
        {pendingOrders > 0 && (
          <Button asChild className="gap-2">
            <Link href="/admin/orders">
              <AlertTriangle className="w-4 h-4" />
              {pendingOrders} Pending Order{pendingOrders !== 1 ? 's' : ''}
            </Link>
          </Button>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.title} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.title}
              </CardTitle>
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/admin/orders',   label: 'Manage Orders',   icon: ShoppingCart },
          { href: '/admin/servers',  label: 'Manage Servers',  icon: Server },
          { href: '/admin/users',    label: 'View Users',      icon: Users },
          { href: '/admin/invoices', label: 'Invoices',        icon: Activity },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-secondary/50 hover:border-primary/30 transition-all text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <RecentActivity orders={recentOrders} />
    </div>
  )
}
