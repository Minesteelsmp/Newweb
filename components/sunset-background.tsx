'use client'

/**
 * components/sunset-background.tsx
 *
 * Fixed, full-viewport background that renders the Minecraft sunset photo
 * (or any admin-chosen image/gradient), layered with a warm sunset glow
 * and a dark vignette that fades seamlessly into the site's dark theme
 * as the user scrolls past the hero.
 *
 * Layers, bottom -> top:
 *   1. Deep dark base (ensures no flash of white before image decodes).
 *   2. Admin background: image (object-fit: cover) OR CSS gradient.
 *   3. Soft warm sunset glow (fakes golden-hour bloom on any image).
 *   4. Bottom-to-transparent dark vignette — dissolves the photo into
 *      the page's dark theme with no hard cut.
 *   5. Rising ember particles (optional).
 *
 * The entire stack fades out together as the user scrolls, driven by a
 * rAF-throttled scroll listener that mutates `opacity` directly to keep
 * it buttery smooth on mobile.
 */

import { useEffect, useRef, useState, useMemo } from 'react'
import { motion } from 'framer-motion'

const DEFAULT_GRADIENT =
  'linear-gradient(180deg, #1a0b2e 0%, #3d1e3d 40%, #b85b1a 80%, #f4a261 100%)'

interface SunsetBackgroundProps {
  backgroundType?: string         // 'gradient' | 'image'
  backgroundGradient?: string     // any valid CSS gradient
  backgroundImageUrl?: string     // used when type === 'image'
  showParticles?: boolean
}

export function SunsetBackground({
  backgroundType = 'gradient',
  backgroundGradient = DEFAULT_GRADIENT,
  backgroundImageUrl = '',
  showParticles = true,
}: SunsetBackgroundProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null)

  // Scroll-based opacity — fade starts ~20% of viewport, fully gone by 100vh.
  useEffect(() => {
    let ticking = false
    const update = () => {
      if (!overlayRef.current) {
        ticking = false
        return
      }
      const vh = window.innerHeight || 1
      const y = window.scrollY
      const start = vh * 0.2
      const end = vh * 1.0
      const progress = Math.min(Math.max((y - start) / (end - start), 0), 1)
      overlayRef.current.style.opacity = String(1 - progress)
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const useImage = backgroundType === 'image' && !!backgroundImageUrl
  const gradient = backgroundGradient || DEFAULT_GRADIENT

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        transition: 'opacity 120ms linear',
        willChange: 'opacity',
      }}
    >
      {/* 1. Dark base so the page never flashes white */}
      <div className="absolute inset-0" style={{ background: '#09090b' }} />

      {/* 2. Admin background layer */}
      {useImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={backgroundImageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: gradient }} />
      )}

      {/* 3. Warm sunset glow — adds cinematic bloom without hiding the photo */}
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 75% 45%, rgba(255,183,94,0.55) 0%, rgba(255,120,60,0.25) 40%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(26,11,46,0.55), transparent 55%)',
        }}
      />

      {/* 4. Dark bottom vignette — dissolves into the site background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, transparent 40%, rgba(9,9,11,0.55) 75%, #09090b 100%)',
        }}
      />

      {/* 5. Subtle aqua rim highlight for brand cohesion */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(0,229,255,0.08), transparent 55%)',
        }}
      />

      {showParticles && <Embers />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Rising ember particles — subtle golden sparks                      */
/* ------------------------------------------------------------------ */

function Embers() {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])

  const particles = useMemo(() => {
    // Mostly golden/peach with occasional aqua sparks.
    const palette = ['#f4a261', '#ffb86b', '#ffd27a', '#ff8a3d']
    return Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,          // %
      size: 2 + Math.random() * 2.5,      // px
      duration: 10 + Math.random() * 12,  // s
      delay: Math.random() * 10,          // s
      drift: (Math.random() - 0.5) * 50,  // px sideways drift
      hue:
        Math.random() > 0.85
          ? '#00e5ff'
          : palette[Math.floor(Math.random() * palette.length)],
    }))
  }, [])

  if (!ready) return null
  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: -10,
            width: p.size,
            height: p.size,
            background: p.hue,
            boxShadow: `0 0 ${p.size * 3}px ${p.hue}`,
          }}
          initial={{ y: 0, x: 0, opacity: 0 }}
          animate={{
            y: [0, -window.innerHeight - 50],
            x: [0, p.drift, -p.drift, 0],
            opacity: [0, 0.85, 0.85, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}
