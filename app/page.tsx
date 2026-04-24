import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { Header } from '@/components/header'
import { HeroSection } from '@/components/hero-section'
import { ProductCards } from '@/components/product-cards'
import { LandingPlans } from '@/components/landing-plans'
import { Footer } from '@/components/footer'
import { SunsetBackground } from '@/components/sunset-background'
import { sessionOptions, SessionData } from '@/lib/session'
import { query, queryOne } from '@/lib/db'
import type { SiteSettings, User, SiteSetting, Plan, WorldPlan } from '@/lib/types'

/**
 * Fallback defaults for the hero background when nothing has been saved
 * in site_settings yet. Admins can override any of these from /admin/landing.
 */
const DEFAULT_HERO_IMAGE = '/hero-sunset.jpg'
const DEFAULT_HERO_TYPE  = 'image'

export default async function HomePage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  let user: User | null = null
  if (session.isLoggedIn && session.userId) {
    user = await queryOne<User>(
      'SELECT id, email, full_name, is_admin, created_at, updated_at FROM users WHERE id = ?',
      [session.userId]
    )
  }

  let settings: SiteSettings = {}
  try {
    const settingsRows = await query<SiteSetting[]>(
      'SELECT setting_key, setting_value FROM site_settings'
    )
    settings = settingsRows.reduce((acc, item) => {
      acc[item.setting_key] = item.setting_value
      return acc
    }, {} as SiteSettings)
  } catch {}

  let serverPlans: Plan[] = []
  try {
    serverPlans = await query<Plan[]>(
      'SELECT id, name, slug, price, cpu_percent, ram_mb, storage_mb FROM plans WHERE is_active = 1 ORDER BY sort_order ASC LIMIT 8'
    )
  } catch {}

  let worldPlans: WorldPlan[] = []
  try {
    worldPlans = await query<WorldPlan[]>(
      'SELECT id, name, slug, price, description FROM world_plans WHERE is_active = 1 ORDER BY sort_order ASC LIMIT 4'
    )
  } catch {}

  const showParticles = (settings.hero_show_particles ?? 'true') !== 'false'

  // Resolve background: respect admin overrides, otherwise fall back to the
  // default Minecraft sunset photo that ships in /public.
  const bgType =
    settings.hero_background_type ||
    (settings.hero_background_image_url ? 'image' : DEFAULT_HERO_TYPE)

  const bgImage =
    settings.hero_background_image_url ||
    (bgType === 'image' ? DEFAULT_HERO_IMAGE : '')

  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      {/* Fixed, scroll-fading Minecraft sunset background */}
      <SunsetBackground
        backgroundType={bgType}
        backgroundGradient={settings.hero_background_gradient}
        backgroundImageUrl={bgImage}
        showParticles={showParticles}
      />

      {/* Everything else sits above the fixed background */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header initialUser={user} initialSettings={settings} />

        <main className="flex-1">
          <HeroSection user={user} settings={settings} />
          <ProductCards />
          <LandingPlans serverPlans={serverPlans} worldPlans={worldPlans} />
        </main>

        <Footer settings={settings} />
      </div>
    </div>
  )
}
