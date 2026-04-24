'use client'

/**
 * components/order-form.tsx
 * Two-step order form: Configure → Payment.
 * - Coupon code support (POST /api/coupons/validate)
 * - Payment QR image (settings.payment_qr_url) shown alongside UPI QR
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Loader2, Server, CreditCard, CheckCircle, AlertCircle, Copy, ArrowLeft,
  Tag, X,
} from 'lucide-react'
import type { Plan, SoftwareOption, SiteSettings } from '@/lib/types'

interface OrderFormProps {
  plan: Plan
  planType: 'server' | 'world'
  softwareOptions: SoftwareOption[]
  userEmail: string
  settings: SiteSettings
}

interface AppliedCoupon {
  id: number
  code: string
  discount_percent: number
  discount: number
  finalAmount: number
}

export function OrderForm({ plan, planType, softwareOptions, userEmail, settings }: OrderFormProps) {
  const [step, setStep] = useState(1)
  const [serverName, setServerName] = useState('')
  const [selectedSoftware, setSelectedSoftware] = useState<string>('')
  const [paymentSenderName, setPaymentSenderName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderComplete, setOrderComplete] = useState(false)
  const router = useRouter()

  // Coupon state
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

  const totalToPay = appliedCoupon ? appliedCoupon.finalAmount : plan.price

  const handleContinueToPayment = () => {
    const trimmed = serverName.trim()
    if (!trimmed) { setError('Please enter a server name'); return }
    if (trimmed.length < 2) { setError('Server name must be at least 2 characters'); return }
    if (planType === 'server' && !selectedSoftware) {
      setError('Please select server software')
      return
    }
    setError(null)
    setStep(2)
  }

  const handleApplyCoupon = async () => {
    const code = couponInput.trim()
    if (!code) {
      toast.error('Enter a coupon code first')
      return
    }
    setCouponLoading(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, amount: plan.price }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        throw new Error(data.error || 'Invalid coupon')
      }
      setAppliedCoupon({
        id: data.coupon.id,
        code: data.coupon.code,
        discount_percent: data.coupon.discount_percent,
        discount: data.discount,
        finalAmount: data.finalAmount,
      })
      toast.success(`Coupon applied — saved ₹${data.discount}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to apply coupon'
      toast.error(msg)
      setAppliedCoupon(null)
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
  }

  const handleSubmitOrder = async () => {
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
          planId: plan.id,
          serverName: serverName.trim(),
          softwareId: planType === 'server' ? selectedSoftware : null,
          paymentSenderName: paymentSenderName.trim(),
          orderType: 'new',
          couponCode: appliedCoupon?.code ?? null,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to submit order')

      setOrderComplete(true)
      toast.success('Order submitted! Awaiting admin approval.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit order'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const copyUpiId = () => {
    if (settings.upi_id) {
      navigator.clipboard.writeText(settings.upi_id)
      toast.success('UPI ID copied!')
    }
  }

  // ── Order Complete screen ─────────────────────────────────
  if (orderComplete) {
    return (
      <div className="max-w-lg mx-auto">
        <Card className="border-primary/30">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-primary" />
            </div>
            <CardTitle className="text-2xl">Order Submitted</CardTitle>
            <CardDescription>
              Your payment claim is under review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold">What happens next?</p>
                  <p className="text-muted-foreground">
                    Our team will verify your payment and approve your order — usually within{' '}
                    <strong>15 minutes</strong>. You&apos;ll receive an email when your server is ready.
                  </p>
                  {settings.discord_url && (
                    <p className="text-muted-foreground">
                      Not approved in 30 minutes?{' '}
                      <a href={settings.discord_url} target="_blank" rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium">
                        Contact us on Discord →
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {[
          { n: 1, label: 'Configure' },
          { n: 2, label: 'Payment' },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-3">
            {i > 0 && <div className="w-12 h-px bg-border" />}
            <div className={`flex items-center gap-2 ${step >= n ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${step >= n ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                {step > n ? <CheckCircle className="w-4 h-4" /> : n}
              </div>
              <span className="hidden sm:inline text-sm font-medium">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Step 1: Configure ────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Server className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>{plan.name} Plan</CardTitle>
                <CardDescription>₹{plan.price}/month</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Plan specs summary */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-secondary/30 text-center text-xs">
              <div>
                <p className="text-muted-foreground">CPU</p>
                <p className="font-semibold">{plan.cpu_percent}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">RAM</p>
                <p className="font-semibold">
                  {plan.ram_mb >= 1024 ? `${plan.ram_mb / 1024} GB` : `${plan.ram_mb} MB`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Disk</p>
                <p className="font-semibold">
                  {plan.storage_mb >= 1024 ? `${Math.round(plan.storage_mb / 1024)} GB` : `${plan.storage_mb} MB`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serverName">Server Name</Label>
              <Input
                id="serverName"
                placeholder="My Minecraft Server"
                value={serverName}
                onChange={(e) => { setServerName(e.target.value); setError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleContinueToPayment()}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">{serverName.length}/100 characters</p>
            </div>

            {planType === 'server' && (
              <div className="space-y-2">
                <Label>Server Software</Label>
                <Select value={selectedSoftware} onValueChange={(v) => { setSelectedSoftware(v); setError(null) }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select software" />
                  </SelectTrigger>
                  <SelectContent>
                    {softwareOptions.map((sw) => (
                      <SelectItem key={sw.id} value={String(sw.id)}>
                        {sw.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Latest stable version installed by default</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Account Email</Label>
              <Input value={userEmail} disabled className="bg-secondary/50 text-muted-foreground" />
            </div>

            {/* Coupon */}
            <div className="space-y-2">
              <Label htmlFor="coupon">Coupon Code (optional)</Label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-primary">
                    <Tag className="w-4 h-4" />
                    <strong>{appliedCoupon.code}</strong> — {appliedCoupon.discount_percent}% off
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    placeholder="WELCOME10"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    maxLength={20}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading}
                  >
                    {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
              )}
            </div>

            <Button onClick={handleContinueToPayment} className="w-full">
              Continue to Payment →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Payment ──────────────────────────────── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Payment</CardTitle>
                <CardDescription>Pay via UPI and confirm below</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Order summary */}
            <div className="p-4 rounded-xl bg-secondary/30 space-y-2 text-sm">
              <p className="font-semibold mb-3">Order Summary</p>
              {[
                ['Plan', plan.name],
                ['Server Name', serverName],
                ...(planType === 'server' && selectedSoftware
                  ? [['Software', softwareOptions.find(s => String(s.id) === selectedSoftware)?.name ?? '']]
                  : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{plan.price}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-primary">
                  <span>Coupon ({appliedCoupon.code} · -{appliedCoupon.discount_percent}%)</span>
                  <span>−₹{appliedCoupon.discount}</span>
                </div>
              )}

              <div className="pt-2 mt-2 border-t border-border flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary text-base">₹{totalToPay}</span>
              </div>
            </div>

            {/* UPI payment section */}
            <div className="rounded-xl border border-border bg-card p-5 text-center space-y-4">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pay via UPI</p>

              {settings.upi_qr_url ? (
                <img
                  src={settings.upi_qr_url}
                  alt="UPI QR Code"
                  className="w-44 h-44 mx-auto rounded-xl object-cover border border-border"
                />
              ) : (
                <div className="w-44 h-44 mx-auto rounded-xl bg-secondary/50 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">QR not configured</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">UPI ID</p>
                <button
                  onClick={copyUpiId}
                  className="flex items-center gap-2 mx-auto font-mono text-primary font-semibold hover:opacity-80 transition-opacity"
                >
                  {settings.upi_id || '—'}
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {settings.upi_name && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <p className="font-medium text-sm">{settings.upi_name}</p>
                </div>
              )}

              <p className="text-xs text-amber-500 font-medium">
                Pay exactly ₹{totalToPay} — wrong amounts cause delays
              </p>
            </div>

            {/* Optional second QR (e.g. bank/payment gateway) */}
            {settings.payment_qr_url && (
              <div className="rounded-xl border border-border bg-card p-5 text-center space-y-3">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Scan to Pay
                </p>
                <img
                  src={settings.payment_qr_url}
                  alt="Payment QR Code"
                  className="w-44 h-44 mx-auto rounded-xl object-contain border border-border bg-white p-2"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="paymentSender">Payment Sender Name</Label>
              <Input
                id="paymentSender"
                placeholder="Name shown in your UPI app"
                value={paymentSenderName}
                onChange={(e) => { setPaymentSenderName(e.target.value); setError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleSubmitOrder()}
              />
              <p className="text-xs text-muted-foreground">
                Enter the exact name shown on your UPI payment confirmation
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep(1); setError(null) }} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button onClick={handleSubmitOrder} disabled={loading} className="flex-1">
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <>I Have Paid</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
