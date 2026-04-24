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
import { Loader2, CheckCircle, Copy, AlertCircle, Globe, MessageCircle } from 'lucide-react'
import type { WorldPlan, SiteSettings } from '@/lib/types'

interface WorldPurchaseModalProps {
  plan: WorldPlan
  settings: SiteSettings
  onClose: () => void
  loggedIn: boolean
}

export function WorldPurchaseModal({ plan, settings, onClose, loggedIn }: WorldPurchaseModalProps) {
  const [paymentSenderName, setPaymentSenderName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const discordInvite = settings.discord_invite || settings.discord_url || ''

  const copyUpiId = () => {
    if (settings.upi_id) {
      navigator.clipboard.writeText(settings.upi_id)
      toast.success('UPI ID copied!')
    }
  }

  const handleSubmit = async () => {
    if (!loggedIn) {
      router.push(`/auth/login?redirect=/worlds`)
      return
    }
    if (!paymentSenderName.trim()) {
      setError('Please enter the payment sender name')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/world-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worldPlanId: plan.id,
          paymentSenderName: paymentSenderName.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit purchase')

      setSuccess(true)
      toast.success('Purchase submitted! Please open a ticket on Discord for setup.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit purchase'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-9 h-9 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl mb-2">Purchase Submitted</DialogTitle>
              <DialogDescription>
                We manually set up your world on our high-performance servers.
                Please open a ticket on Discord so our team can complete the setup.
              </DialogDescription>
            </div>
            {discordInvite && (
              <Button asChild className="w-full">
                <a href={discordInvite} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Open Discord Ticket
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" /> Purchase &ldquo;{plan.name}&rdquo;
              </DialogTitle>
              <DialogDescription>
                {plan.description || 'A ready-to-play Minecraft world set up by our team.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm space-y-2">
                <p className="font-semibold">How it works</p>
                <p className="text-muted-foreground leading-relaxed">
                  We manually set up your world on our high-performance servers.
                  After purchase, please open a ticket on Discord for setup.
                </p>
                {discordInvite && (
                  <a
                    href={discordInvite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Join our Discord
                  </a>
                )}
              </div>

              <div className="p-4 rounded-xl bg-secondary/30 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-2xl font-bold text-primary">&#8377;{plan.price}</span>
              </div>

              {loggedIn && (
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
                  {settings.upi_name && <p className="text-sm font-medium">{settings.upi_name}</p>}
                  <p className="text-xs text-amber-500">Pay exactly &#8377;{plan.price}</p>
                </div>
              )}

              {loggedIn && (
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
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                  ) : loggedIn ? (
                    'I Have Paid'
                  ) : (
                    'Log In to Continue'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
