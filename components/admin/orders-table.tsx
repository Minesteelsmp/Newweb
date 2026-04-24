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
import { Loader2, CheckCircle, XCircle, Eye, Server, User, CreditCard, Clock, Tag } from 'lucide-react'
import { toast } from 'sonner'
import type { Order, Profile, Plan, SoftwareOption, Coupon } from '@/lib/types'

type OrderWithRelations = Omit<Order, 'software'> & {
  profile: Profile
  plan: Plan
  software: SoftwareOption | null
  coupon?: Coupon | null
}

interface OrdersTableProps {
  orders: OrderWithRelations[]
}

function formatDate(date: string) {
  const d = new Date(date)
  const day = d.getUTCDate()
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  const year = d.getUTCFullYear()
  const hours = d.getUTCHours().toString().padStart(2, '0')
  const minutes = d.getUTCMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${minutes}`
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const [filter, setFilter] = useState<string>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const router = useRouter()

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.status === filter)

  const handleApprove = async (orderId: string) => {
    setLoadingId(String(orderId))
    try {
      const res = await fetch('/api/admin/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to approve')
      }
      toast.success('Order approved successfully! Server is being created.')
      router.refresh()
    } catch (error) {
      console.error('Error approving order:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to approve order')
    } finally {
      setLoadingId(null)
    }
  }

  const handleReject = async (orderId: string) => {
    setLoadingId(String(orderId))
    try {
      const res = await fetch('/api/admin/orders/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to reject')
      }
      toast.success('Order rejected')
      router.refresh()
    } catch (error) {
      console.error('Error rejecting order:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to reject order')
    } finally {
      setLoadingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">Pending</Badge>
      case 'approved':
        return <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">Approved</Badge>
      case 'rejected':
        return <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getOrderTypeBadge = (type: string) => {
    switch (type) {
      case 'new':
        return <Badge variant="outline">New</Badge>
      case 'renewal':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Renewal</Badge>
      case 'upgrade':
        return <Badge variant="outline" className="border-primary text-primary">Upgrade</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle>All Orders</CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {filteredOrders.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No orders found
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="bg-secondary/30">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-primary" />
                        <span className="font-semibold">{order.server_name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {getStatusBadge(order.status)}
                        {getOrderTypeBadge(order.order_type)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{order.profile?.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground truncate">{order.profile?.email}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Plan</p>
                        <p className="font-medium">{order.plan?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold text-primary">₹{order.amount}</p>
                          {order.original_amount && order.original_amount !== order.amount && (
                            <p className="text-[11px] text-muted-foreground line-through">
                              ₹{order.original_amount}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">{order.payment_sender_name || '-'}</p>
                        </div>
                      </div>
                      {order.coupon && (
                        <div className="flex items-center gap-2 col-span-2">
                          <Tag className="w-3.5 h-3.5 text-primary" />
                          <p className="text-xs">
                            <span className="font-semibold text-primary">{order.coupon.code}</span>
                            <span className="text-muted-foreground"> · {order.coupon.discount_percent}% off</span>
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                      </div>
                    </div>

                    {order.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          className="flex-1"
                          onClick={() => handleApprove(String(order.id))}
                          disabled={loadingId === String(order.id)}
                        >
                          {loadingId === String(order.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          className="flex-1"
                          variant="destructive"
                          onClick={() => handleReject(String(order.id))}
                          disabled={loadingId === String(order.id)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
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
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan / Software</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Coupon</TableHead>
                    <TableHead>Payment By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.server_name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.profile?.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{order.profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.plan?.name}</p>
                          {order.software?.name && (
                            <p className="text-xs text-muted-foreground">{order.software.name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getOrderTypeBadge(order.order_type)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-primary">₹{order.amount}</p>
                          {order.original_amount && order.original_amount !== order.amount && (
                            <p className="text-xs text-muted-foreground line-through">
                              ₹{order.original_amount}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.coupon ? (
                          <div className="flex items-center gap-1 text-primary text-xs">
                            <Tag className="w-3 h-3" />
                            <span className="font-semibold">{order.coupon.code}</span>
                            <span className="text-muted-foreground">·{order.coupon.discount_percent}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{order.payment_sender_name || '-'}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(String(order.id))}
                              disabled={loadingId === String(order.id)}
                            >
                              {loadingId === String(order.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(String(order.id))}
                              disabled={loadingId === String(order.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {order.status !== 'pending' && (
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
