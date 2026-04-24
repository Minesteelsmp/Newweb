'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Pause, Play, Trash2, ExternalLink, Server, User, Calendar, Cpu, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Server as ServerType, Profile, Plan, SoftwareOption } from '@/lib/types'

type ServerWithRelations = Omit<ServerType, 'software'> & {
  profile: Profile
  plan: Plan
  software: SoftwareOption | null
}

interface ServersTableProps {
  servers: ServerWithRelations[]
}

function formatDate(date: string) {
  const d = new Date(date)
  const day = d.getUTCDate()
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  const year = d.getUTCFullYear()
  return `${day} ${month} ${year}`
}

export function ServersTable({ servers }: ServersTableProps) {
  const [filter, setFilter] = useState<string>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editServer, setEditServer] = useState<ServerWithRelations | null>(null)
  const [editExpires, setEditExpires] = useState('')
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active')
  const [editSaving, setEditSaving] = useState(false)
  const router = useRouter()

  const openEdit = (server: ServerWithRelations) => {
    setEditServer(server)
    setEditExpires(new Date(server.expires_at).toISOString().slice(0, 16))
    setEditStatus(server.status === 'suspended' ? 'suspended' : 'active')
  }

  const handleEditSave = async () => {
    if (!editServer) return
    setEditSaving(true)
    try {
      const res = await fetch('/api/admin/servers/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: editServer.id,
          expires_at: editExpires,
          status: editStatus,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Update failed')
      toast.success('Server updated')
      setEditServer(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setEditSaving(false)
    }
  }

  const filteredServers = filter === 'all' 
    ? servers 
    : servers.filter(s => s.status === filter)

  const handleSuspend = async (serverId: string) => {
    setLoadingId(serverId)
    try {
      const res = await fetch('/api/admin/servers/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      })
      if (!res.ok) throw new Error('Failed to suspend')
      toast.success('Server suspended successfully')
      router.refresh()
    } catch (error) {
      console.error('Error suspending server:', error)
      toast.error('Failed to suspend server')
    } finally {
      setLoadingId(null)
    }
  }

  const handleUnsuspend = async (serverId: string) => {
    setLoadingId(serverId)
    try {
      const res = await fetch('/api/admin/servers/unsuspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      })
      if (!res.ok) throw new Error('Failed to unsuspend')
      toast.success('Server unsuspended successfully')
      router.refresh()
    } catch (error) {
      console.error('Error unsuspending server:', error)
      toast.error('Failed to unsuspend server')
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (serverId: string) => {
    if (!confirm('Are you sure you want to delete this server? This action cannot be undone.')) {
      return
    }
    setLoadingId(serverId)
    try {
      const res = await fetch('/api/admin/servers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Server deleted successfully')
      router.refresh()
    } catch (error) {
      console.error('Error deleting server:', error)
      toast.error('Failed to delete server')
    } finally {
      setLoadingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">Active</Badge>
      case 'suspended':
        return <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30">Suspended</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle>All Servers ({filteredServers.length})</CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Servers</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {filteredServers.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No servers found
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-4">
              {filteredServers.map((server) => (
                <Card key={server.id} className="bg-secondary/30">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-primary" />
                        <span className="font-semibold">{server.server_name}</span>
                      </div>
                      {getStatusBadge(server.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{server.profile?.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground truncate">{server.profile?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{server.plan?.name}</p>
                          <p className="text-xs text-muted-foreground">{server.software?.name || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Expires</p>
                          <p className="font-medium">{formatDate(server.expires_at)}</p>
                        </div>
                      </div>
                      <div>
                        {server.pterodactyl_id ? (
                          <a
                            href={`${process.env.NEXT_PUBLIC_PANEL_URL ?? 'https://panel.cubiqhost.in'}/server/${server.pterodactyl_identifier ?? server.pterodactyl_uuid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline text-sm"
                          >
                            Panel #{server.pterodactyl_id}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <p className="text-xs text-muted-foreground">No panel ID</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {server.status === 'active' ? (
                        <Button
                          className="flex-1"
                          variant="outline"
                          onClick={() => handleSuspend(String(server.id))}
                          disabled={loadingId === String(server.id)}
                        >
                          {loadingId === String(server.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Pause className="w-4 h-4 mr-1" />
                              Suspend
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          className="flex-1"
                          variant="outline"
                          onClick={() => handleUnsuspend(String(server.id))}
                          disabled={loadingId === String(server.id)}
                        >
                          {loadingId === String(server.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Unsuspend
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => openEdit(server)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(String(server.id))}
                        disabled={loadingId === String(server.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Server</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Software</TableHead>
                    <TableHead>Pterodactyl ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServers.map((server) => (
                    <TableRow key={server.id}>
                      <TableCell className="font-medium">{server.server_name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{server.profile?.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{server.profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{server.plan?.name}</TableCell>
                      <TableCell>{server.software?.name || '-'}</TableCell>
                      <TableCell>
                        {server.pterodactyl_id ? (
                          <a
                            href={`${process.env.NEXT_PUBLIC_PANEL_URL ?? 'https://panel.cubiqhost.in'}/server/${server.pterodactyl_identifier ?? server.pterodactyl_uuid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            #{server.pterodactyl_id}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(server.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(server.expires_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {server.status === 'active' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSuspend(String(server.id))}
                              disabled={loadingId === String(server.id)}
                            >
                              {loadingId === String(server.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Pause className="w-4 h-4 mr-1" />
                                  Suspend
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnsuspend(String(server.id))}
                              disabled={loadingId === String(server.id)}
                            >
                              {loadingId === String(server.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-1" />
                                  Unsuspend
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(server)}
                            title="Edit expiry / status"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(String(server.id))}
                            disabled={loadingId === String(server.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      {/* Edit dialog: expiry + status override */}
      <Dialog open={!!editServer} onOpenChange={(open) => { if (!open) setEditServer(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Server</DialogTitle>
            <DialogDescription>
              Manually override the expiry date and status. Use this to extend a
              customer&apos;s server or override the auto-suspend system.
            </DialogDescription>
          </DialogHeader>

          {editServer && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Server</Label>
                <p className="font-semibold">{editServer.server_name}</p>
                <p className="text-xs text-muted-foreground">
                  {editServer.profile?.email}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp">Expires At</Label>
                <Input
                  id="exp"
                  type="datetime-local"
                  value={editExpires}
                  onChange={(e) => setEditExpires(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="st">Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(v: 'active' | 'suspended') => setEditStatus(v)}
                >
                  <SelectTrigger id="st">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditServer(null)} disabled={editSaving}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
