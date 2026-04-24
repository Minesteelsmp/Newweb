'use client'

/**
 * components/admin/settings-form.tsx
 * Admin settings editor for site-level config stored in DB.
 * NOTE: Pterodactyl API key is managed via environment variables (.env.local),
 * NOT stored in the DB — the DB settings panel_url field is used only for
 * display in emails and dashboard links.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save, CheckCircle, AlertTriangle, Shield } from 'lucide-react'
import type { SiteSettings } from '@/lib/types'

interface SettingsFormProps {
  settings: SiteSettings
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formData, setFormData] = useState<SiteSettings>(settings)
  const router = useRouter()

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setLoading(true)
    setSaved(false)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: formData }),
      })

      if (!res.ok) throw new Error('Failed to save settings')

      setSaved(true)
      toast.success('Settings saved successfully')
      router.refresh()
    } catch (err) {
      toast.error('Failed to save settings')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Site Status */}
      <Card>
        <CardHeader>
          <CardTitle>Site Status</CardTitle>
          <CardDescription>Control the site status banner shown to users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Site Online</Label>
              <p className="text-sm text-muted-foreground">Shows a green/red status dot in the header</p>
            </div>
            <Switch
              checked={formData.site_status === 'online'}
              onCheckedChange={(checked) =>
                handleChange('site_status', checked ? 'online' : 'offline')
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status_message">Status Message</Label>
            <Input
              id="status_message"
              value={formData.status_message || ''}
              onChange={(e) => handleChange('status_message', e.target.value)}
              placeholder="All systems operational"
            />
          </div>
        </CardContent>
      </Card>

      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle>Homepage Content</CardTitle>
          <CardDescription>Customize the hero section on the landing page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hero_title">Hero Title</Label>
            <Input
              id="hero_title"
              value={formData.hero_title || ''}
              onChange={(e) => handleChange('hero_title', e.target.value)}
              placeholder="CubiqHost — Where Your Minecraft Server Comes Alive Instantly"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hero_punchline">Hero Punchline</Label>
            <Input
              id="hero_punchline"
              value={formData.hero_punchline || ''}
              onChange={(e) => handleChange('hero_punchline', e.target.value)}
              placeholder="Built for Players, Trusted by Thousands"
            />
            <p className="text-xs text-muted-foreground">
              Shown to the left of the hero with a vertical aqua accent line.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trustpilot_url">Trustpilot URL</Label>
            <Input
              id="trustpilot_url"
              value={formData.trustpilot_url || ''}
              onChange={(e) => handleChange('trustpilot_url', e.target.value)}
              placeholder="https://www.trustpilot.com/review/cubiqhost.in"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status_page_url">Service Status Page URL</Label>
            <Input
              id="status_page_url"
              value={formData.status_page_url || ''}
              onChange={(e) => handleChange('status_page_url', e.target.value)}
              placeholder="https://status.cubiqhost.in"
            />
            <p className="text-xs text-muted-foreground">
              Linked from the hero "Service Status" button.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <CardTitle>UPI Payment</CardTitle>
          <CardDescription>Payment details shown to customers during checkout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="upi_id">UPI ID</Label>
              <Input
                id="upi_id"
                value={formData.upi_id || ''}
                onChange={(e) => handleChange('upi_id', e.target.value)}
                placeholder="yourname@upi"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upi_name">Account Name</Label>
              <Input
                id="upi_name"
                value={formData.upi_name || ''}
                onChange={(e) => handleChange('upi_name', e.target.value)}
                placeholder="CubiqHost"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="upi_qr_url">UPI QR Code Image URL</Label>
            <Input
              id="upi_qr_url"
              value={formData.upi_qr_url || ''}
              onChange={(e) => handleChange('upi_qr_url', e.target.value)}
              placeholder="https://example.com/upi-qr.png"
            />
            {formData.upi_qr_url && (
              <img
                src={formData.upi_qr_url}
                alt="UPI QR Preview"
                className="w-28 h-28 mt-2 rounded-lg border border-border object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment_qr_url">Payment Page QR Code URL</Label>
            <Input
              id="payment_qr_url"
              value={formData.payment_qr_url || ''}
              onChange={(e) => handleChange('payment_qr_url', e.target.value)}
              placeholder="https://example.com/payment-qr.png"
            />
            <p className="text-xs text-muted-foreground">
              Shown on the checkout/payment page. Leave empty to hide.
            </p>
            {formData.payment_qr_url && (
              <img
                src={formData.payment_qr_url}
                alt="Payment QR Preview"
                className="w-28 h-28 mt-2 rounded-lg border border-border object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Panel URL (display only — API key is env var) */}
      <Card>
        <CardHeader>
          <CardTitle>Pterodactyl Panel</CardTitle>
          <CardDescription>Panel URL used for email links and "Open Panel" buttons</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="panel_url">Panel URL</Label>
            <Input
              id="panel_url"
              value={formData.panel_url || ''}
              onChange={(e) => handleChange('panel_url', e.target.value)}
              placeholder="https://panel.cubiqhost.in"
            />
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-blue-400">API Key stays in environment variables</p>
              <p>
                The Pterodactyl API key is set via <code className="bg-secondary px-1 rounded">PTERODACTYL_API_KEY</code> in your{' '}
                <code className="bg-secondary px-1 rounded">.env.local</code> file — never stored in the database.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Contact & Support</CardTitle>
          <CardDescription>Shown in footer and customer emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="discord_url">Discord Invite URL</Label>
            <Input
              id="discord_url"
              value={formData.discord_url || ''}
              onChange={(e) => handleChange('discord_url', e.target.value)}
              placeholder="https://discord.gg/xxxxxx"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="support_email">Support Email</Label>
            <Input
              id="support_email"
              type="email"
              value={formData.support_email || ''}
              onChange={(e) => handleChange('support_email', e.target.value)}
              placeholder="support@cubiqhost.in"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instagram_url">Instagram URL</Label>
            <Input
              id="instagram_url"
              value={formData.instagram_url || ''}
              onChange={(e) => handleChange('instagram_url', e.target.value)}
              placeholder="https://instagram.com/cubiqhost"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="youtube_url">YouTube URL</Label>
            <Input
              id="youtube_url"
              value={formData.youtube_url || ''}
              onChange={(e) => handleChange('youtube_url', e.target.value)}
              placeholder="https://youtube.com/@cubiqhost"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="site_name">Site Name</Label>
            <Input
              id="site_name"
              value={formData.site_name || ''}
              onChange={(e) => handleChange('site_name', e.target.value)}
              placeholder="CubiqHost"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              value={formData.logo_url || ''}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              placeholder="/icon.svg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center justify-between pt-2">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-primary">
            <CheckCircle className="w-4 h-4" /> Changes saved
          </span>
        )}
        <Button onClick={handleSave} disabled={loading} className="ml-auto min-w-32">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save Changes</>
          )}
        </Button>
      </div>
    </div>
  )
}
