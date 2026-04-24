/**
 * components/admin/admin-dashboard.tsx
 * Stats cards for the admin dashboard home page.
 * BUG FIX: original file imported 5 non-existent tab components (orders-tab, users-tab,
 * servers-tab, plans-tab, settings-tab) causing TypeScript compilation to fail.
 * Replaced with a proper RecentActivity component actually used by /admin/page.tsx.
 */
'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'

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

interface RecentActivityProps {
  orders: RecentOrder[]
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_ICON = {
  approved: <CheckCircle className="w-4 h-4 text-primary" />,
  rejected: <XCircle className="w-4 h-4 text-destructive" />,
  pending:  <Clock className="w-4 h-4 text-amber-500" />,
}

const TYPE_LABEL: Record<string, string> = {
  new: 'New', renewal: 'Renewal', upgrade: 'Upgrade',
}

export function RecentActivity({ orders }: RecentActivityProps) {
  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8 text-sm">No orders yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Recent Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/40"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">
                  {STATUS_ICON[order.status as keyof typeof STATUS_ICON] ?? STATUS_ICON.pending}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{order.server_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {order.user_email} · {order.plan_name} · {formatDate(order.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <Badge variant="outline" className="text-xs hidden sm:flex">
                  {TYPE_LABEL[order.order_type] ?? order.order_type}
                </Badge>
                <span className="font-semibold text-sm text-primary">₹{order.amount}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
