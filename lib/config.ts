/**
 * lib/config.ts
 * ─────────────────────────────────────────────────────────────
 * Centralized configuration for the CubiqHost platform.
 * All environment variables are read here and exported as typed
 * constants so that nothing is ever hard-coded elsewhere.
 */

// ── Pterodactyl Panel ─────────────────────────────────────────
export const PANEL_URL =
  process.env.PTERODACTYL_PANEL_URL || 'https://panel.cubiqhost.in'

export const PANEL_API_KEY = process.env.PTERODACTYL_API_KEY || ''

// Default resource IDs pre-configured in the panel
export const DEFAULT_NODE_ID = parseInt(
  process.env.PTERODACTYL_DEFAULT_NODE_ID || '1'
)
export const DEFAULT_EGG_ID = parseInt(
  process.env.PTERODACTYL_DEFAULT_EGG_ID || '1'
)
export const DEFAULT_LOCATION_ID = parseInt(
  process.env.PTERODACTYL_DEFAULT_LOCATION_ID || '1'
)
export const DEFAULT_NEST_ID = parseInt(
  process.env.PTERODACTYL_DEFAULT_NEST_ID || '1'
)

// ── Security ──────────────────────────────────────────────────
export const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  'complex_password_at_least_32_characters_long_cubiqhost_2024'

/** Secret used for deterministic SSO password generation. NEVER change in production. */
export const SSO_SECRET =
  process.env.SSO_SECRET || SESSION_SECRET + '_sso_salt'

export const CRON_SECRET = process.env.CRON_SECRET || ''

// ── Email ─────────────────────────────────────────────────────
export const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
export const RESEND_FROM =
  process.env.RESEND_FROM || 'noreply@cubiqhost.in'

// ── Admin email (always treated as admin) ────────────────────
export const ADMIN_EMAIL = 'support.cubiqhost@gmail.com'

// ── Helpers ──────────────────────────────────────────────────
/** True when ALL required pterodactyl vars are present */
export const isPanelConfigured = Boolean(PANEL_URL && PANEL_API_KEY)
