'use client'

/**
 * components/admin/coupons-manager.tsx
 * Lists coupons, lets admins create/edit/delete them via /api/admin/coupons.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import type { Coupon } from '@/lib/types'

interface Props {
  initialCoupons: Coupon[]
}

interface FormState {
  code: string
  discount_percent: string
  max_uses: string
  valid_from: string
  valid_until: string
  is_active: boolean
}

const emptyForm: FormState = {
  code: '',
  discount_percent: '10',
  max_uses: '100',
  valid_from: new Date().toISOString().slice(0, 16),
  valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  is_active: true,
}

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function couponToForm(c: Coupon): FormState {
  return {
    code: c.code,
    discount_percent: String(c.discount_percent),
    max_uses: String(c.max_uses),
    valid_from: new Date(c.valid_from).toISOString().slice(0, 16),
    valid_until: new Date(c.valid_until).toISOString().slice(0, 16),
    is_active: !!c.is_active,
  }
}

export function CouponsManager({ initialCoupons }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id)
    setForm(couponToForm(coupon))
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error('Code is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discount_percent: Number(form.discount_percent),
        max_uses: parseInt(form.max_uses, 10) || 1,
        valid_from: form.valid_from,
        valid_until: form.valid_until,
        is_active: form.is_active,
      }

      const res = editingId
        ? await fetch(`/api/admin/coupons/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/admin/coupons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save coupon')

      toast.success(editingId ? 'Coupon updated' : 'Coupon created')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this coupon? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete')
      }
      toast.success('Coupon deleted')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle>All Coupons ({initialCoupons.length})</CardTitle>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Coupon
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
              <DialogDescription>
                Coupons grant a percentage discount on the order total at checkout.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="WELCOME10"
                  maxLength={20}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pct">Discount %</Label>
                  <Input
                    id="pct"
                    type="number"
                    min="1"
                    max="100"
                    step="0.5"
                    value={form.discount_percent}
                    onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="uses">Max Uses</Label>
                  <Input
                    id="uses"
                    type="number"
                    min="1"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="from">Valid From</Label>
                  <Input
                    id="from"
                    type="datetime-local"
                    value={form.valid_from}
                    onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="until">Valid Until</Label>
                  <Input
                    id="until"
                    type="datetime-local"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={form.is_active}
                  onCheckedChange={(c) => setForm({ ...form, is_active: c })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingId ? 'Save changes' : 'Create coupon'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {initialCoupons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No coupons yet. Create one to start offering discounts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Valid From</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialCoupons.map((c) => {
                  const exhausted = c.used_count >= c.max_uses
                  const expired = new Date(c.valid_until) < new Date()
                  const active = c.is_active && !exhausted && !expired
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                      <TableCell>{Number(c.discount_percent)}%</TableCell>
                      <TableCell>
                        {c.used_count} / {c.max_uses}
                      </TableCell>
                      <TableCell>{formatDate(c.valid_from)}</TableCell>
                      <TableCell>{formatDate(c.valid_until)}</TableCell>
                      <TableCell>
                        {active ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30">Active</Badge>
                        ) : exhausted ? (
                          <Badge variant="secondary">Exhausted</Badge>
                        ) : expired ? (
                          <Badge variant="secondary">Expired</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(c.id)}
                            disabled={deletingId === c.id}
                          >
                            {deletingId === c.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
