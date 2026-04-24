'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, CheckCircle, Copy, AlertCircle, ArrowRight, ArrowUpCircle } from 'lucide-react'
import type { Server, Plan, SiteSettings } from '@/lib/types'

interface UpgradeModalProps {
  server: Server & { plan: Plan }
  allPlans: Plan[]
  settings: SiteSettings
  onClose: () => void
}

/** Returns whole-day difference between two dates (minimum 0). */
function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function UpgradeModal({ server, allPlans, settings, onClose }: UpgradeModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [paymentSenderName, setPaymentSenderName] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const upgradePlans = allPlans.filter((p) => p.price > (server.plan?.price ?? 0))
  const selectedPlan = allPlans.find((p) => String(p.id) === selectedPlanId)

  // Pro-rata calculation
  const proRata = useMemo(() => {
    if (!selectedPlan) return null
    const today = new Date()
    const expiresAt = new Date(server.expires_at)
    const daysLeft = daysBetween(today, expiresAt)
    const currentPrice = server.plan?.price ?? 0
    const newPrice = selectedPlan.price

    const unusedValue = (daysLeft / 30) * currentPrice
    const newCostForRemaining = (daysLeft / 30) * newPrice
    const upgradeAmount = Math.max(0, newCostForRemaining - unusedValue)

    return {
      daysLeft,
      unusedValue: Math.round(unusedValue),
      newCostForRemaining: Math.round(newCostForRemaining),
      upgradeAmount: Math.round(upgradeAmount),
    }
  }, [selectedPlan, server.plan?.price, server.expires_at])

  const copyUpiId = () => {
    if (settings.upi_id) { navigator.clipboard.writeText(settings.upi_id); toast.success('UPI ID copied!') }
  }

  const handleSubmit = async () => {
    if (!paymentSenderName.trim()) { setError('Please enter the payment sender name'); return }
    if (!proRata) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanId,
          serverName: server.server_name,
          softwareId: server.software_id,
          paymentSenderName: paymentSenderName.trim(),
          orderType: 'upgrade',
          relatedServerId: server.id,
          customAmount: proRata.upgradeAmount,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit upgrade')

      toast.success('Upgrade submitted! Awaiting admin approval.')
      setSuccess(true)
      setTimeout(() => { onClose(); router.refresh() }, 2500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit upgrade'
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
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-primary" />
            </div>
            <DialogTitle className="text-xl mb-2">Upgrade Submitted</DialogTitle>
            <DialogDescription>
              Your upgrade request is pending admin approval.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5" /> Upgrade Server
              </DialogTitle>
              <DialogDescription>
                Upgrade <strong>{server.server_name}</strong> to a higher plan
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {step === 1 && (
                <>
                  <div className="p-3 rounded-xl bg-secondary/30 text-sm">
                    <p className="text-muted-foreground mb-0.5">Current Plan</p>
                    <p className="font-semibold">{server.plan?.name} &mdash; &#8377;{server.plan?.price}/month</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Upgrade To</Label>
                    {upgradePlans.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3 rounded-lg bg-secondary/30">
                        You&apos;re already on the highest available plan.
                      </p>
                    ) : (
                      <Select value={selectedPlanId} onValueChange={(v) => { setSelectedPlanId(v); setError(null) }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {upgradePlans.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name} &mdash; &#8377;{p.price}/month
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {selectedPlan && proRata && (
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{server.plan?.name}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span className="text-foreground font-semibold">{selectedPlan.name}</span>
                        </div>
                        <span className="text-primary font-bold">&#8377;{proRata.upgradeAmount}</span>
                      </div>
                      <div className="pt-2 border-t border-primary/20 text-xs text-muted-foreground space-y-1 leading-relaxed">
                        <p>You have <strong className="text-foreground">{proRata.daysLeft} days</strong> left on your current plan.</p>
                        <p>Unused value: <strong className="text-foreground">&#8377;{proRata.unusedValue}</strong></p>
                        <p>New plan cost for remaining days: <strong className="text-foreground">&#8377;{proRata.newCostForRemaining}</strong></p>
                        <p>You pay the difference: <strong className="text-primary">&#8377;{proRata.upgradeAmount}</strong></p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button
                      onClick={() => { setStep(2); setError(null) }}
                      disabled={!selectedPlanId || upgradePlans.length === 0 || !proRata || proRata.upgradeAmount <= 0}
                      className="flex-1"
                    >
                      Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </>
              )}

              {step === 2 && selectedPlan && proRata && (
                <>
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
                    <p className="text-xs text-amber-500">Pay exactly &#8377;{proRata.upgradeAmount} (prorated upgrade)</p>
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
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                      {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'I Have Paid'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
