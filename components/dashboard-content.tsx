'use client'

/**
 * components/dashboard-content.tsx
 * ─────────────────────────────────────────────────────────────
 * Main dashboard UI with three tabs:
 *  • My Servers  — active/suspended servers, SSO panel link, renew/upgrade
 *  • Orders      — order history with status badges
 *  • Invoices    — billing history
 *
 * Server cards also have a "Share" flow that lets users add subusers.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Server,
  Clock,
  AlertTriangle,
  ExternalLink,
  Plus,
  RefreshCw,
  ArrowUpCircle,
  Cpu,
  Database,
  HardDrive,
  Share2,
  Receipt,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import type { Profile, Server as ServerType, Order, Plan, SiteSettings } from '@/lib/types'
import { RenewalModal } from '@/components/renewal-modal'
import { UpgradeModal } from '@/components/upgrade-modal'

// ─── Types ───────────────────────────────────────────────────

interface InvoiceRow {
  id: number
  server_id: number | null
  server_name: string | null
  order_id: number
  amount: number
  type: 'new' | 'renewal' | 'upgrade'
  status: 'pending' | 'paid'
  plan_name: string | null
  created_at: string
}

interface SubuserRow {
  id: number
  email: string
  full_name: string | null
  shared_since: string
}

interface DashboardContentProps {
  profile: Profile
  servers: (ServerType & { plan: Plan })[],
  pendingOrders: (Order & { plan: Plan })[]
  allPlans: Plan[]
  settings: SiteSettings
}

// ─── Utility helpers ──────────────────────────────────────────

function formatDate(date: string) {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getDaysUntilExpiry(expiresAt: string) {
  const now = new Date()
  const expiry = new Date(expiresAt)
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatRam(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`
  return `${mb} MB`
}

function formatDisk(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`
  return `${mb} MB`
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  new: 'New Server',
  renewal: 'Renewal',
  upgrade: 'Upgrade',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  approved: 'default',
  pending:  'secondary',
  rejected: 'destructive',
  cancelled:'outline',
  paid:     'default',
}

// ─── Share Server Dialog ──────────────────────────────────────

function ShareDialog({
  server,
  onClose,
}: {
  server: ServerType & { plan: Plan }
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [subusers, setSubusers] = useState<SubuserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    fetchSubusers()
  }, [])

  const fetchSubusers = async () => {
    setFetching(true)
    try {
      const res = await fetch(`/api/servers/${server.id}/share`)
      if (res.ok) {
        const data = await res.json()
        setSubusers(data.subusers || [])
      }
    } catch {
      toast.error('Failed to load shared users')
    } finally {
      setFetching(false)
    }
  }

  const handleShare = async () => {
    if (!email.trim()) { toast.error('Enter an email address'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/servers/${server.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message)
      setEmail('')
      fetchSubusers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to share server')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (userId: number, userEmail: string) => {
    if (!confirm(`Remove ${userEmail}'s access?`)) return
    try {
      const res = await fetch(`/api/servers/${server.id}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharedUserId: userId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Access removed')
      setSubusers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove access')
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" /> Share "{server.server_name}"
          </DialogTitle>
          <DialogDescription>
            Grant another CubiqHost user access to your server's panel console.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new subuser */}
          <div className="flex gap-2">
            <Input
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleShare()}
              type="email"
            />
            <Button onClick={handleShare} disabled={loading} size="sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            </Button>
          </div>

          {/* Existing subusers */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Shared With
            </Label>
            {fetching ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : subusers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Not shared with anyone yet
              </p>
            ) : (
              subusers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div>
                    <p className="text-sm font-medium">{u.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Since {formatDate(u.shared_since)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(u.id, u.email)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Server Card ──────────────────────────────────────────────

function ServerCard({
  server,
  onRenew,
  onUpgrade,
  onShare,
}: {
  server: ServerType & { plan: Plan }
  onRenew: () => void
  onUpgrade: () => void
  onShare: () => void
}) {
  const daysLeft = getDaysUntilExpiry(server.expires_at)
  const isExpiringSoon = daysLeft <= 7
  const isSuspended = server.status === 'suspended'

  return (
    <div
      className={`p-5 rounded-xl border transition-colors ${
        isSuspended
          ? 'bg-destructive/5 border-destructive/30'
          : 'bg-secondary/20 border-border/50'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left: server info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4 className="font-semibold truncate">{server.server_name}</h4>
            <Badge
              variant={isSuspended ? 'destructive' : 'default'}
              className={isSuspended ? '' : 'bg-primary/20 text-primary border-0'}
            >
              {isSuspended ? 'Suspended' : 'Active'}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              {server.plan?.cpu_percent ?? 0}% CPU
            </span>
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              {formatRam(server.plan?.ram_mb ?? 0)}
            </span>
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              {formatDisk((server.plan as any)?.storage_mb ?? 0)}
            </span>
          </div>

          <p
            className={`text-sm ${
              isExpiringSoon || isSuspended
                ? 'text-amber-500'
                : 'text-muted-foreground'
            }`}
          >
            {isSuspended ? (
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Suspended — renew to restore (deleted in 7 days)
              </span>
            ) : isExpiringSoon ? (
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
              </span>
            ) : (
              `Expires ${formatDate(server.expires_at)}`
            )}
          </p>
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {!isSuspended && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href={`/api/panel/sso-login?server=${encodeURIComponent(server.pterodactyl_identifier || '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Open Panel
              </a>
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={onRenew}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Renew
          </Button>

          {!isSuspended && (
            <Button variant="outline" size="sm" onClick={onUpgrade}>
              <ArrowUpCircle className="w-3.5 h-3.5 mr-1.5" />
              Upgrade
            </Button>
          )}

          {!isSuspended && (
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Share
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Invoices Tab ─────────────────────────────────────────────

function InvoicesTab() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/invoices')
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices || []))
      .catch(() => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">No invoices yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {invoices.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/40"
        >
          <div>
            <p className="font-medium text-sm">
              {inv.server_name ?? `Server #${inv.server_id}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ORDER_TYPE_LABEL[inv.type]} · {formatDate(inv.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">₹{inv.amount}</span>
            <Badge variant={STATUS_VARIANT[inv.status]}>
              {inv.status === 'paid' ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Paid
                </span>
              ) : (
                inv.status
              )}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Orders Tab ───────────────────────────────────────────────

function OrdersTab({ initialOrders }: { initialOrders: (Order & { plan: Plan })[] }) {
  const [orders, setOrders] = useState(initialOrders)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch {
      toast.error('Failed to refresh orders')
    } finally {
      setLoading(false)
    }
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground mb-4">No orders yet</p>
        <Button asChild size="sm">
          <Link href="/plans/server">Browse plans</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div
          key={order.id}
          className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/40"
        >
          <div>
            <p className="font-medium text-sm">{order.server_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ORDER_TYPE_LABEL[order.order_type]} · {(order as any).plan_name ?? order.plan?.name} ·{' '}
              {formatDate(order.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">₹{order.amount}</span>
            <Badge variant={STATUS_VARIANT[order.status]}>
              {order.status === 'approved' ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Approved
                </span>
              ) : order.status === 'rejected' ? (
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Rejected
                </span>
              ) : (
                order.status.charAt(0).toUpperCase() + order.status.slice(1)
              )}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────

export function DashboardContent({
  profile,
  servers,
  pendingOrders,
  allPlans,
  settings,
}: DashboardContentProps) {
  const [renewServer, setRenewServer] = useState<(ServerType & { plan: Plan }) | null>(null)
  const [upgradeServer, setUpgradeServer] = useState<(ServerType & { plan: Plan }) | null>(null)
  const [shareServer, setShareServer] = useState<(ServerType & { plan: Plan }) | null>(null)

  const activeServers = servers.filter((s) => s.status === 'active')
  const suspendedServers = servers.filter((s) => s.status === 'suspended')
  const allVisibleServers = [...activeServers, ...suspendedServers]

  return (
    <div className="container mx-auto px-4 max-w-5xl">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-muted-foreground">
          Manage your Minecraft servers, orders, and invoices.
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Button asChild>
          <Link href="/plans/server">
            <Plus className="w-4 h-4 mr-2" />
            New Server
          </Link>
        </Button>
      </div>

      {/* Pending orders banner */}
      <AnimatePresence>
        {pendingOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mb-6"
          >
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <CardTitle className="text-base">
                    {pendingOrders.length} Pending Order{pendingOrders.length > 1 ? 's' : ''}
                  </CardTitle>
                </div>
                <CardDescription>
                  Waiting for payment verification by admin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingOrders.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">{o.server_name}</span>
                      <span className="text-muted-foreground">
                        ₹{o.amount} · {(o as any).plan_name ?? o.plan?.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main tabs */}
      <Tabs defaultValue="servers">
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="servers" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            My Servers
            {allVisibleServers.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {allVisibleServers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Invoices
          </TabsTrigger>
        </TabsList>

        {/* ── Servers Tab ───────────────────────────────────── */}
        <TabsContent value="servers">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {allVisibleServers.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Server className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No servers yet</h3>
                  <p className="text-muted-foreground mb-6 text-sm">
                    Create your first Minecraft server in minutes.
                  </p>
                  <Button asChild>
                    <Link href="/plans/server">
                      <Plus className="w-4 h-4 mr-2" />
                      Browse Plans
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {allVisibleServers.map((server) => (
                  <motion.div
                    key={server.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ServerCard
                      server={server}
                      onRenew={() => setRenewServer(server)}
                      onUpgrade={() => setUpgradeServer(server)}
                      onShare={() => setShareServer(server)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* ── Orders Tab ────────────────────────────────────── */}
        <TabsContent value="orders">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <OrdersTab initialOrders={pendingOrders} />
          </motion.div>
        </TabsContent>

        {/* ── Invoices Tab ──────────────────────────────────── */}
        <TabsContent value="invoices">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <InvoicesTab />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ── Modals ────────────────────────────────────────── */}
      {renewServer && (
        <RenewalModal
          server={renewServer}
          settings={settings}
          onClose={() => setRenewServer(null)}
        />
      )}
      {upgradeServer && (
        <UpgradeModal
          server={upgradeServer}
          allPlans={allPlans}
          settings={settings}
          onClose={() => setUpgradeServer(null)}
        />
      )}
      {shareServer && (
        <ShareDialog
          server={shareServer}
          onClose={() => setShareServer(null)}
        />
      )}
    </div>
  )
}
