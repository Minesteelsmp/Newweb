/**
 * app/admin/invoices/page.tsx
 * Admin invoices view — all invoices across all users.
 */
import { query } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Receipt } from 'lucide-react'

interface InvoiceRow {
  id: number
  user_email: string
  user_name: string | null
  server_name: string | null
  plan_name: string | null
  amount: number
  type: string
  status: string
  created_at: string
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const TYPE_LABEL: Record<string, string> = {
  new: 'New Server',
  renewal: 'Renewal',
  upgrade: 'Upgrade',
}

export default async function AdminInvoicesPage() {
  let invoices: InvoiceRow[] = []
  let totalRevenue = 0

  try {
    invoices = await query<InvoiceRow[]>(
      `SELECT
         i.id, i.amount, i.type, i.status, i.created_at,
         u.email AS user_email, u.full_name AS user_name,
         s.server_name,
         p.name AS plan_name
       FROM invoices i
       LEFT JOIN users   u ON u.id = i.user_id
       LEFT JOIN servers s ON s.id = i.server_id
       LEFT JOIN orders  o ON o.id = i.order_id
       LEFT JOIN plans   p ON p.id = o.plan_id
       ORDER BY i.created_at DESC
       LIMIT 500`
    )
    totalRevenue = invoices.reduce((acc, inv) => acc + (inv.status === 'paid' ? inv.amount : 0), 0)
  } catch (err) {
    console.error('[Admin Invoices] DB error:', err)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">
          Complete billing history across all customers.
        </p>
      </div>

      {/* Revenue summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">₹{totalRevenue.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-1">From paid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{invoices.length}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ₹{invoices
                .filter(inv => {
                  const d = new Date(inv.created_at)
                  const now = new Date()
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                })
                .reduce((acc, inv) => acc + inv.amount, 0)
                .toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Current month revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No invoices yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">ID</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Customer</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Server</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Type</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Amount</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">#{inv.id}</td>
                      <td className="py-3 pr-4">
                        <p className="font-medium truncate max-w-[160px]">{inv.user_email}</p>
                        {inv.user_name && (
                          <p className="text-xs text-muted-foreground">{inv.user_name}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{inv.server_name ?? '—'}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABEL[inv.type] ?? inv.type}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-primary">₹{inv.amount}</td>
                      <td className="py-3 pr-4">
                        {inv.status === 'paid' ? (
                          <span className="flex items-center gap-1 text-primary text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Paid
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{inv.status}</Badge>
                        )}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(inv.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
