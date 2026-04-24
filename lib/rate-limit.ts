/**
 * lib/rate-limit.ts
 * ─────────────────────────────────────────────────────────────
 * Simple in-memory rate limiter for API routes.
 *
 * For production deployments with multiple instances, replace the
 * in-memory Map with a Redis store (e.g. via @upstash/ratelimit).
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 5 })
 *   const result = await limiter.check(request, 'login')
 *   if (!result.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum number of requests allowed in the window */
  max: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

// In-memory store — keyed by "action:ip"
const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max } = options

  return {
    /**
     * Checks if the request is within rate limits.
     * @param request - The incoming Next.js request
     * @param action  - A string to namespace the limit (e.g. "login")
     */
    check(request: Request, action: string): RateLimitResult {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1'

      const key = `${action}:${ip}`
      const now = Date.now()
      const entry = store.get(key)

      if (!entry || entry.resetAt < now) {
        // Start a new window
        store.set(key, { count: 1, resetAt: now + windowMs })
        return { success: true, remaining: max - 1, resetAt: now + windowMs }
      }

      entry.count++

      if (entry.count > max) {
        return { success: false, remaining: 0, resetAt: entry.resetAt }
      }

      return {
        success: true,
        remaining: max - entry.count,
        resetAt: entry.resetAt,
      }
    },
  }
}

// Pre-configured limiters for common use cases
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per 15 min per IP
})

export const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 registrations per hour per IP
})

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // 60 requests per minute per IP
})
