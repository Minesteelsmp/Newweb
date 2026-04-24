'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, Plus, Edit, Cpu, Database, HardDrive } from 'lucide-react'
import type { Plan } from '@/lib/types'

interface PlansManagerProps {
  plans: Plan[]
}

function formatRam(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

function formatStorage(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`
  return `${mb} MB`
}

export function PlansManager({ plans }: PlansManagerProps) {
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data: Record<string, unknown> = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
      price: parseInt(formData.get('price') as string),
      cpu_percent: parseInt(formData.get('cpu_percent') as string),
      ram_mb: parseInt(formData.get('ram_mb') as string),
      storage_mb: parseInt(formData.get('storage_mb') as string),
      sort_order: parseInt((formData.get('sort_order') as string) || '0'),
      is_active: formData.get('is_active') === 'on',
      id: editPlan?.id,
    }

    try {
      const res = await fetch('/api/admin/plans', {
        method: editPlan ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      toast.success(editPlan ? 'Plan updated!' : 'Plan created!')
      setIsOpen(false)
      setEditPlan(null)
      router.refresh()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save plan'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const PlanRow = ({ plan }: { plan: Plan }) => (
    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold">{plan.name}</h4>
          <p className="text-xl font-bold text-primary">&#8377;{plan.price}</p>
        </div>
        <div className="flex items-center gap-2">
          {!plan.is_active && <Badge variant="secondary">Inactive</Badge>}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditPlan(plan)
              setIsOpen(true)
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5" />
          {plan.cpu_percent}%
        </div>
        <div className="flex items-center gap-1">
          <Database className="w-3.5 h-3.5" />
          {formatRam(plan.ram_mb)}
        </div>
        <div className="flex items-center gap-1">
          <HardDrive className="w-3.5 h-3.5" />
          {formatStorage(plan.storage_mb)}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setEditPlan(null)
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editPlan ? 'Edit Plan' : 'Add New Plan'}</DialogTitle>
              <DialogDescription>
                {editPlan ? 'Update the plan details' : 'Create a new hosting plan'}
              </DialogDescription>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (INR)</Label>
                  <Input id="price" name="price" type="number" defaultValue={editPlan?.price} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input id="sort_order" name="sort_order" type="number" defaultValue={editPlan?.sort_order ?? 0} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpu_percent">CPU %</Label>
                  <Input id="cpu_percent" name="cpu_percent" type="number" defaultValue={editPlan?.cpu_percent} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ram_mb">RAM (MB)</Label>
                  <Input id="ram_mb" name="ram_mb" type="number" defaultValue={editPlan?.ram_mb} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storage_mb">Storage (MB)</Label>
                  <Input id="storage_mb" name="storage_mb" type="number" defaultValue={editPlan?.storage_mb} required />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="is_active" name="is_active" defaultChecked={editPlan?.is_active ?? true} />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editPlan ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Server Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map(plan => (
              <PlanRow key={plan.id} plan={plan} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
