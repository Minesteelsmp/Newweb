'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, CheckCircle, Copy, AlertCircle, RefreshCw } from 'lucide-react'
import type { Server, Plan, SiteSettings } from '@/lib/types'

interface RenewalModalProps {
  server: Server & { plan: Plan }
  settings: SiteSettings
  onClose: () => void
}

export function RenewalModal({ server, settings, onClose }: RenewalModalProps) {
  const [paymentSenderName, setPaymentSenderName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const copyUpiId = () => {
    if (settings.upi_id) {
      navigator.clipboard.writeText(settings.upi_id)
      toast.success('UPI ID copied!')
    }
  }

  const handleSubmit = async () => {
    if (!paymentSenderName.trim()) {
      setError('Please enter the payment sender name')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: server.plan_id,
          serverName: server.server_name,
          softwareId: server.software_id,
          paymentSenderName: paymentSenderName.trim(),
          orderType: 'renewal',
          relatedServerId: server.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit renewal')

      toast.success('Renewal submitted! Awaiting admin approval.')
      setSuccess(true)
      setTimeout(() => { onClose(); router.refresh() }, 2500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit renewal'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const price = server.plan?.price ?? 0

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-primary" />
            </div>
            <DialogTitle className="text-xl mb-2">Renewal Submitted!</DialogTitle>
            <DialogDescription>
              Your renewal request is pending admin approval. You'll receive an email when approved.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" /> Renew Server
              </DialogTitle>
              <DialogDescription>
                Renew <strong>{server.server_name}</strong> for another 30 days
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {/* Amount */}
              <div className="p-4 rounded-xl bg-secondary/30 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Renewal Amount</span>
                <span className="text-2xl font-bold text-primary">₹{price}</span>
              </div>

              {/* UPI details */}
              <div className="rounded-xl border border-border bg-card p-4 text-center space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pay via UPI</p>
                {settings.upi_qr_url && (
                  <img src={settings.upi_qr_url} alt="UPI QR" className="w-36 h-36 mx-auto rounded-lg" />
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">UPI ID</p>
                  <button onClick={copyUpiId} className="flex items-center gap-1.5 mx-auto font-mono text-primary font-semibold hover:opacity-80">
                    {settings.upi_id} <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                {settings.upi_name && (
                  <p className="text-sm font-medium">{settings.upi_name}</p>
                )}
                <p className="text-xs text-amber-500">Pay exactly ₹{price}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="senderName">Payment Sender Name</Label>
                <Input
                  id="senderName"
                  placeholder="Name shown in your UPI app"
                  value={paymentSenderName}
                  onChange={(e) => { setPaymentSenderName(e.target.value); setError(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleSubmit()}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'I Have Paid ✓'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
