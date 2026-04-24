'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Edit } from 'lucide-react'

interface Purchase {
  id: number
  user_email: string | null
  user_full_name: string | null
  world_plan_name: string | null
  world_plan_price: number | null
  world_plan_slug: string | null
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  pterodactyl_server_id: number | null
  payment_sender_name: string | null
  admin_notes: string | null
  created_at: string
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  completed: 'default',
  pending: 'secondary',
  cancelled: 'destructive',
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function WorldPurchasesTable({ purchases }: { purchases: Purchase[] }) {
  const [editing, setEditing] = useState<Purchase | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editing) return
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/admin/world-purchases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          status: fd.get('status'),
          pterodactyl_server_id: parseInt(fd.get('pterodactyl_server_id') as string) || null,
          admin_notes: fd.get('admin_notes') || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      toast.success('Purchase updated')
      setEditing(null)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (purchases.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground text-sm">
          No world purchases yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader><CardTitle>All World Purchases</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {purchases.map((p) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl bg-secondary/20 border border-border/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold">{p.world_plan_name ?? 'Unknown plan'}</span>
                    <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                    {p.pterodactyl_server_id && (
                      <span className="text-xs text-muted-foreground">
                        Server ID: {p.pterodactyl_server_id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.user_email ?? 'Unknown user'}
                    {p.payment_sender_name ? ` - Paid as: ${p.payment_sender_name}` : ''}
                    {' - '}{formatDate(p.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-primary">
                    &#8377;{p.world_plan_price ? Number(p.world_plan_price).toFixed(0) : '-'}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                    <Edit className="w-3.5 h-3.5 mr-1.5" />
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          {editing && (
            <form onSubmit={handleSave} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Manage Purchase #{editing.id}</DialogTitle>
                <DialogDescription>
                  {editing.world_plan_name} for {editing.user_email}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={editing.status}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pterodactyl_server_id">Pterodactyl Server ID</Label>
                <Input
                  id="pterodactyl_server_id"
                  name="pterodactyl_server_id"
                  type="number"
                  defaultValue={editing.pterodactyl_server_id ?? ''}
                  placeholder="e.g. 42"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_notes">Admin Notes</Label>
                <Textarea
                  id="admin_notes"
                  name="admin_notes"
                  defaultValue={editing.admin_notes ?? ''}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setEditing(null)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
