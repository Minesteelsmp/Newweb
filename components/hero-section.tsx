'use client'

/**
 * components/hero-section.tsx
 *
 * Minimal hero focused purely on atmosphere:
 *   - Left-aligned punchline with a vertical aqua accent line.
 *   - Two CTAs side by side: "Get Started Free" (solid aqua) and
 *     "Service Status" (outlined / glass).
 *   - Trustpilot stars link.
 *
 * Big headings and subtitles are intentionally removed so the Minecraft
 * sunset backdrop carries the visual weight. The fixed SunsetBackground
 * component (rendered by app/page.tsx) provides the actual sunset image
 * or admin-configured background behind this transparent section.
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { ArrowRight, Star } from 'lucide-react'
import type { User } from '@/lib/types'

interface HeroSectionProps {
  user: User | null
  settings: {
    hero_logo_url?: string
    hero_punchline?: string
    hero_trustpilot_url?: string
    // Legacy fallback keys still supported
    trustpilot_url?: string
    status_page_url?: string
    site_name?: string
  }
}

export function HeroSection({ user, settings }: HeroSectionProps) {
  const logo      = settings.hero_logo_url || ''
  const punchline = settings.hero_punchline || 'Built for Players, Trusted by Thousands'
  const trust     = settings.hero_trustpilot_url || settings.trustpilot_url || ''
  const status    = settings.status_page_url || ''
  const brand     = settings.site_name || 'CubiqHost'

  return (
    <section className="relative overflow-hidden min-h-[80vh] flex items-center">
      <div className="container relative z-10 mx-auto px-4 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="max-w-3xl"
        >
          {/* Optional logo */}
          {logo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              className="mb-8"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo}
                alt={`${brand} logo`}
                className="h-14 md:h-16 w-auto drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
              />
            </motion.div>
          )}

          {/* Punchline with vertical aqua accent */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <p
              className="border-l-4 pl-5 py-2 text-lg md:text-2xl lg:text-3xl font-extrabold tracking-[0.15em] text-white uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]"
              style={{ borderColor: '#00e5ff' }}
            >
              {punchline}
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col sm:flex-row items-start gap-3"
          >
            <Button asChild size="lg" className="gap-2 min-w-48 shadow-[0_6px_24px_rgba(0,229,255,0.35)]">
              <Link href={user ? '/dashboard' : '/auth/sign-up'}>
                {user ? 'My Dashboard' : 'Get Started Free'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>

            {status ? (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-w-48 bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm"
              >
                <a href={status} target="_blank" rel="noopener noreferrer">
                  Service Status
                </a>
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                className="min-w-48 bg-white/10 text-white border-white/30 backdrop-blur-sm opacity-60 cursor-not-allowed"
                disabled
              >
                Service Status
              </Button>
            )}
          </motion.div>

          {/* Trustpilot stars */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10"
          >
            <a
              href={trust || '#'}
              target={trust ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition-colors"
            >
              <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-current"
                    style={{ color: '#00e5ff' }}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-white">Trustpilot</span>
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
