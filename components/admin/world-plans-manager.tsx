'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus, Edit } from 'lucide-react'
import type { WorldPlan } from '@/lib/types'

interface Props { plans: WorldPlan[] }

export function WorldPlansManager({ plans }: Props) {
  const [editPlan, setEditPlan] = useState<WorldPlan | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const data: Record<string, unknown> = {
      name: fd.get('name'),
      slug: fd.get('slug'),
      description: fd.get('description'),
      price: parseFloat(fd.get('price') as string),
      cpu_percent: parseInt((fd.get('cpu_percent') as string) || '100'),
      ram_mb: parseInt((fd.get('ram_mb') as string) || '2048'),
      storage_mb: parseInt((fd.get('storage_mb') as string) || '5120'),
      sort_order: parseInt((fd.get('sort_order') as string) || '0'),
      is_active: fd.get('is_active') === 'on',
      id: editPlan?.id,
    }

    try {
      const res = await fetch('/api/admin/world-plans', {
        method: editPlan ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      toast.success(editPlan ? 'World plan updated' : 'World plan created')
      setOpen(false)
      setEditPlan(null)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditPlan(null) }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add World Plan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editPlan ? 'Edit World Plan' : 'Add World Plan'}</DialogTitle>
              <DialogDescription>One-time purchase worlds deployed manually</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" defaultValue={editPlan?.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" name="slug" defaultValue={editPlan?.slug} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={editPlan?.description ?? ''} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (INR)</Label>
                  <Input id="price" name="price" type="number" step="0.01" defaultValue={editPlan?.price} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input id="sort_order" name="sort_order" type="number" defaultValue={editPlan?.sort_order ?? 0} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpu_percent">CPU %</Label>
                  <Input id="cpu_percent" name="cpu_percent" type="number" defaultValue={editPlan?.cpu_percent ?? 100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ram_mb">RAM (MB)</Label>
                  <Input id="ram_mb" name="ram_mb" type="number" defaultValue={editPlan?.ram_mb ?? 2048} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storage_mb">Storage (MB)</Label>
                  <Input id="storage_mb" name="storage_mb" type="number" defaultValue={editPlan?.storage_mb ?? 5120} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="is_active" name="is_active" defaultChecked={editPlan?.is_active ?? true} />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editPlan ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>World Plans</CardTitle></CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No world plans yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map(p => (
                <div key={p.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{p.name}</h4>
                      <p className="text-xl font-bold text-primary">&#8377;{Number(p.price).toFixed(0)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!p.is_active && <Badge variant="secondary">Inactive</Badge>}
                      <Button size="sm" variant="ghost" onClick={() => { setEditPlan(p); setOpen(true) }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{p.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {p.cpu_percent}% CPU - {p.ram_mb} MB RAM - {p.storage_mb} MB storage
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
