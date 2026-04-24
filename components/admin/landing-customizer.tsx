'use client'

/**
 * components/admin/landing-customizer.tsx
 *
 * Admin form for editing the landing page hero: copy, logo, background
 * (gradient or image), Trustpilot link, and particles toggle. Renders a
 * live preview by reusing the real <HeroSection /> component against the
 * current draft state.
 */

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Loader2, ExternalLink, Save, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HeroSection } from '@/components/hero-section'
import type { SiteSettings } from '@/lib/types'

const DEFAULT_GRADIENT =
  'linear-gradient(180deg, #1a0b2e 0%, #3d1e3d 40%, #b85b1a 80%, #f4a261 100%)'

const GRADIENT_PRESETS: { label: string; value: string }[] = [
  {
    label: 'Minecraft Sunset (default)',
    value: DEFAULT_GRADIENT,
  },
  {
    label: 'Deep Ocean',
    value: 'linear-gradient(180deg, #0f172a 0%, #1e3a8a 50%, #0369a1 100%)',
  },
  {
    label: 'Aurora',
    value: 'linear-gradient(180deg, #0b1020 0%, #2a0f52 40%, #00695c 80%, #00e5ff 100%)',
  },
  {
    label: 'Ember Night',
    value: 'linear-gradient(180deg, #1a0a0a 0%, #4a1414 40%, #b84a1a 80%, #f4a261 100%)',
  },
  {
    label: 'Nether',
    value: 'linear-gradient(180deg, #1a0000 0%, #5a0000 40%, #ff3d00 80%, #ffab00 100%)',
  },
]

const HERO_KEYS = [
  'hero_logo_url',
  'hero_title',
  'hero_subtitle',
  'hero_punchline',
  'hero_trustpilot_url',
  'hero_background_type',
  'hero_background_gradient',
  'hero_background_image_url',
  'hero_show_particles',
  // Linked legacy keys so preview's CTA also works
  'status_page_url',
  'trustpilot_url',
  'site_name',
] as const

interface LandingCustomizerProps {
  initialSettings: SiteSettings
}

export function LandingCustomizer({ initialSettings }: LandingCustomizerProps) {
  const [saved, setSaved] = useState<SiteSettings>(initialSettings)
  const [draft, setDraft] = useState<SiteSettings>({
    hero_background_type: 'gradient',
    hero_background_gradient: DEFAULT_GRADIENT,
    hero_show_particles: 'true',
    ...initialSettings,
  })
  const [saving, setSaving] = useState(false)

  const set = (key: string, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const dirty = useMemo(() => {
    return HERO_KEYS.some((k) => (draft[k] ?? '') !== (saved[k] ?? ''))
  }, [draft, saved])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Record<string, string> = {}
      for (const k of HERO_KEYS) payload[k] = draft[k] ?? ''
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaved({ ...saved, ...payload })
      toast.success('Landing page settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setDraft({
      ...saved,
      hero_background_type: saved.hero_background_type || 'gradient',
      hero_background_gradient: saved.hero_background_gradient || DEFAULT_GRADIENT,
      hero_show_particles: saved.hero_show_particles || 'true',
    })
  }

  const bgType = draft.hero_background_type || 'gradient'
  const bgGradient = draft.hero_background_gradient || DEFAULT_GRADIENT
  const bgImage = draft.hero_background_image_url || ''
  const showParticles = (draft.hero_show_particles ?? 'true') !== 'false'

  const previewBackground =
    bgType === 'image' && bgImage
      ? `center/cover no-repeat url("${bgImage}")`
      : bgGradient

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6">
      {/* ------- FORM ---------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Settings</CardTitle>
          <CardDescription>
            Changes are reflected in the live preview instantly. Click Save to publish.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="copy">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="copy">Copy</TabsTrigger>
              <TabsTrigger value="background">Background</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
            </TabsList>

            {/* ---- COPY ---- */}
            <TabsContent value="copy" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="hero_logo_url">Hero Logo URL</Label>
                <Input
                  id="hero_logo_url"
                  value={draft.hero_logo_url || ''}
                  onChange={(e) => set('hero_logo_url', e.target.value)}
                  placeholder="https://.../logo.png"
                />
                {draft.hero_logo_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={draft.hero_logo_url}
                    alt="Logo preview"
                    className="h-12 mt-2 rounded border border-border bg-background/40 p-1 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hero_title">Title</Label>
                <Input
                  id="hero_title"
                  value={draft.hero_title || ''}
                  onChange={(e) => set('hero_title', e.target.value)}
                  placeholder="CubiqHost - Where Your Minecraft Server Comes Alive Instantly"
                />
                <p className="text-xs text-muted-foreground">
                  A dash or em-dash splits the title — text after it renders in aqua.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hero_subtitle">Subtitle</Label>
                <Textarea
                  id="hero_subtitle"
                  rows={2}
                  value={draft.hero_subtitle || ''}
                  onChange={(e) => set('hero_subtitle', e.target.value)}
                  placeholder="One-line description (optional)"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hero_punchline">Punchline (left accent bar)</Label>
                <Input
                  id="hero_punchline"
                  value={draft.hero_punchline || ''}
                  onChange={(e) => set('hero_punchline', e.target.value)}
                  placeholder="Built for Players, Trusted by Thousands"
                />
              </div>
            </TabsContent>

            {/* ---- BACKGROUND ---- */}
            <TabsContent value="background" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="hero_background_type">Background Type</Label>
                <Select
                  value={bgType}
                  onValueChange={(v) => set('hero_background_type', v)}
                >
                  <SelectTrigger id="hero_background_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bgType === 'gradient' && (
                <>
                  <div className="space-y-1.5">
                    <Label>Preset</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {GRADIENT_PRESETS.map((p) => (
                        <button
                          type="button"
                          key={p.label}
                          onClick={() => set('hero_background_gradient', p.value)}
                          className="group rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
                        >
                          <div
                            className="h-12 w-full"
                            style={{ background: p.value }}
                          />
                          <div className="text-[11px] px-2 py-1 text-left">
                            {p.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="hero_background_gradient">Custom CSS Gradient</Label>
                    <Textarea
                      id="hero_background_gradient"
                      rows={3}
                      value={draft.hero_background_gradient || ''}
                      onChange={(e) => set('hero_background_gradient', e.target.value)}
                      placeholder={DEFAULT_GRADIENT}
                      className="font-mono text-xs"
                    />
                  </div>
                </>
              )}

              {bgType === 'image' && (
                <div className="space-y-1.5">
                  <Label htmlFor="hero_background_image_url">Image URL</Label>
                  <Input
                    id="hero_background_image_url"
                    value={draft.hero_background_image_url || ''}
                    onChange={(e) => set('hero_background_image_url', e.target.value)}
                    placeholder="https://.../hero-bg.jpg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use a high-quality landscape image. It will be center-cropped to fit.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <Label htmlFor="hero_show_particles" className="text-sm">
                    Show Ember Particles
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Soft rising sparks over the hero. Looks great on gradients.
                  </p>
                </div>
                <Switch
                  id="hero_show_particles"
                  checked={showParticles}
                  onCheckedChange={(v) =>
                    set('hero_show_particles', v ? 'true' : 'false')
                  }
                />
              </div>
            </TabsContent>

            {/* ---- LINKS ---- */}
            <TabsContent value="links" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="hero_trustpilot_url">Trustpilot URL</Label>
                <Input
                  id="hero_trustpilot_url"
                  value={draft.hero_trustpilot_url || ''}
                  onChange={(e) => set('hero_trustpilot_url', e.target.value)}
                  placeholder="https://www.trustpilot.com/review/cubiqhost.in"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status_page_url">Service Status URL</Label>
                <Input
                  id="status_page_url"
                  value={draft.status_page_url || ''}
                  onChange={(e) => set('status_page_url', e.target.value)}
                  placeholder="https://status.cubiqhost.in"
                />
                <p className="text-xs text-muted-foreground">
                  Powers the "Service Status" button in the hero.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
            <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save changes
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={saving || !dirty}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
            <Button asChild variant="ghost" size="sm" className="ml-auto gap-1.5">
              <Link href="/" target="_blank">
                Open landing page
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ------- LIVE PREVIEW ------------------------------------------- */}
      <Card className="xl:sticky xl:top-4 xl:self-start overflow-hidden">
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>
            Reflects the current draft. The fixed scroll-fade is disabled inside
            the preview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-lg overflow-hidden border border-border">
            {/* Static background for the preview (no scroll fade) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: previewBackground }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse at top, rgba(0,229,255,0.10), transparent 60%)',
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(0,0,0,0.10), transparent 40%, rgba(0,0,0,0.20))',
                }}
              />
            </div>

            <div
              className="relative max-h-[600px] overflow-hidden"
              style={{ pointerEvents: 'none' }}
            >
              {/* Reuse the real hero so admins see exactly what users get */}
              <HeroSection
                user={null}
                settings={{
                  hero_logo_url: draft.hero_logo_url,
                  hero_punchline: draft.hero_punchline,
                  hero_trustpilot_url: draft.hero_trustpilot_url,
                  trustpilot_url: draft.trustpilot_url,
                  status_page_url: draft.status_page_url,
                  site_name: draft.site_name,
                }}
              />
            </div>
          </div>
          {dirty && (
            <p className="mt-3 text-xs text-primary">
              Unsaved changes — click Save to publish.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
