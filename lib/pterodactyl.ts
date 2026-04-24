/**
 * lib/pterodactyl.ts
 * All Pterodactyl Application-API helpers.
 *
 * Key design decisions:
 *  • NODE_ID / EGG_ID / LOCATION_ID come from environment config — never hard-coded.
 *  • Passwords for panel users are derived deterministically from
 *    userId + SSO_SECRET so SSO works without storing plain passwords.
 *  • Every public function throws on failure — callers decide whether
 *    to catch and continue or surface the error.
 */

import crypto from 'crypto'
import {
  PANEL_URL,
  PANEL_API_KEY,
  DEFAULT_NODE_ID,
  DEFAULT_EGG_ID,
  DEFAULT_NEST_ID,
  DEFAULT_LOCATION_ID,
  SSO_SECRET,
} from '@/lib/config'

// ─── Types ────────────────────────────────────────────────────

export interface PterodactylUser {
  id: number
  uuid: string
  username: string
  email: string
  first_name: string
  last_name: string
}

export interface PterodactylServer {
  id: number
  uuid: string
  identifier: string
  name: string
  status: string
}

// ─── Core HTTP helper ─────────────────────────────────────────

async function apiRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<unknown> {
  const url = `${PANEL_URL}/api/application${endpoint}`

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${PANEL_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  if (response.status === 204) return null

  const text = await response.text()

  if (!response.ok) {
    throw new Error(
      `Pterodactyl API ${method} ${endpoint} → ${response.status}: ${text}`
    )
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// ─── Deterministic SSO password ──────────────────────────────

/**
 * Generates a reproducible, strong password for a panel user.
 * Uses HMAC-SHA256(userId, SSO_SECRET) — we never store plain-text panel passwords.
 * Format: "Ph" + 14-hex-chars + "1!" meets most password policies.
 *
 * WARNING: If SSO_SECRET changes, all panel users get a new password.
 */
export function getPterodactylPassword(userId: number): string {
  const hmac = crypto.createHmac('sha256', SSO_SECRET)
  hmac.update(String(userId))
  const hex = hmac.digest('hex')
  return `Ph${hex.substring(0, 14)}1!`
}

export function getPterodactylUsername(email: string, userId: number): string {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 16)
  return `${base}${userId}`
}

// ─── User management ──────────────────────────────────────────

/**
 * Creates a new user in the Pterodactyl panel.
 * Called during registration so the user has a panel account.
 */
export async function createPanelUser(params: {
  userId: number
  email: string
  fullName: string
}): Promise<PterodactylUser> {
  const username = getPterodactylUsername(params.email, params.userId)
  const password = getPterodactylPassword(params.userId)
  const [firstName, ...rest] = (params.fullName || 'Minecraft').split(' ')

  const res = (await apiRequest('/users', 'POST', {
    email: params.email,
    username,
    first_name: firstName || 'Minecraft',
    last_name: rest.join(' ') || 'Player',
    password,
  })) as { attributes: PterodactylUser }

  return res.attributes
}

/**
 * Finds an existing panel user by email, or creates one.
 */
export async function findOrCreateUser(
  email: string,
  username: string
): Promise<PterodactylUser> {
  const searchRes = (await apiRequest(
    `/users?filter[email]=${encodeURIComponent(email)}`
  )) as { data: Array<{ attributes: PterodactylUser }> }

  if (searchRes.data && searchRes.data.length > 0) {
    return searchRes.data[0].attributes
  }

  const createRes = (await apiRequest('/users', 'POST', {
    email,
    username: username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20),
    first_name: username,
    last_name: 'User',
    password: Math.random().toString(36).slice(-12) + 'Aa1!',
  })) as { attributes: PterodactylUser }

  return createRes.attributes
}

// ─── Server management ────────────────────────────────────────

/**
 * Creates a Minecraft server on the panel using configured NODE/EGG/LOCATION IDs.
 */
export async function createServer(params: {
  name: string
  userId: number
  eggId?: number
  nestId?: number
  cpu: number
  ram: number
  disk: number
  backups?: number
  ports?: number
}): Promise<PterodactylServer> {
  const eggId = params.eggId || DEFAULT_EGG_ID
  const nestId = params.nestId || DEFAULT_NEST_ID
  const nodeId = DEFAULT_NODE_ID

  // Get available (unassigned) allocations for the configured node
  const allocRes = (await apiRequest(
    `/nodes/${nodeId}/allocations?per_page=100`
  )) as {
    data: Array<{ attributes: { id: number; assigned: boolean } }>
  }

  const freeAllocation = allocRes.data?.find((a) => !a.attributes.assigned)

  if (!freeAllocation) {
    throw new Error(
      `No free allocations on node ${nodeId}. Add more ports in the Pterodactyl panel.`
    )
  }

  // Fetch egg details: docker image + startup command + default env vars
  const eggRes = (await apiRequest(
    `/nests/${nestId}/eggs/${eggId}?include=variables`
  )) as {
    attributes: {
      docker_image: string
      startup: string
      relationships?: {
        variables?: {
          data: Array<{
            attributes: { env_variable: string; default_value: string }
          }>
        }
      }
    }
  }
  const egg = eggRes.attributes

  // Build environment variables from egg defaults
  const environment: Record<string, string> = {}
  for (const v of egg.relationships?.variables?.data || []) {
    environment[v.attributes.env_variable] = v.attributes.default_value || ''
  }

  const serverRes = (await apiRequest('/servers', 'POST', {
    name: params.name,
    user: params.userId,
    egg: eggId,
    docker_image: egg.docker_image,
    startup: egg.startup,
    environment,
    limits: {
      memory: params.ram,
      swap: 0,
      disk: params.disk,
      io: 500,
      cpu: params.cpu,
    },
    feature_limits: {
      databases: 1,
      backups: params.backups ?? 1,
      allocations: params.ports ?? 1,
    },
    allocation: {
      default: freeAllocation.attributes.id,
    },
    start_on_completion: false,
  })) as { attributes: PterodactylServer }

  return serverRes.attributes
}

export async function suspendServer(panelServerId: number): Promise<void> {
  await apiRequest(`/servers/${panelServerId}/suspend`, 'POST')
}

export async function unsuspendServer(panelServerId: number): Promise<void> {
  await apiRequest(`/servers/${panelServerId}/unsuspend`, 'POST')
}

export async function deleteServer(
  panelServerId: number,
  forceDelete = false
): Promise<void> {
  const endpoint = forceDelete
    ? `/servers/${panelServerId}/force`
    : `/servers/${panelServerId}`
  await apiRequest(endpoint, 'DELETE')
}

/**
 * Updates server resource limits.
 * BUG FIX: Old code passed `allocation: undefined` which caused 422 errors.
 * We now fetch the current allocation and include it.
 */
export async function updateServerResources(
  panelServerId: number,
  params: {
    cpu: number
    ram: number
    disk: number
    backups?: number
    ports?: number
  }
): Promise<void> {
  const current = (await apiRequest(`/servers/${panelServerId}`)) as {
    attributes: {
      allocation: number
      feature_limits: { allocations: number }
    }
  }

  await apiRequest(`/servers/${panelServerId}/build`, 'PATCH', {
    allocation: current.attributes.allocation, // REQUIRED — cannot be undefined
    limits: {
      memory: params.ram,
      swap: 0,
      disk: params.disk,
      io: 500,
      cpu: params.cpu,
    },
    feature_limits: {
      databases: 1,
      backups: params.backups ?? 1,
      allocations: params.ports ?? current.attributes.feature_limits.allocations,
    },
  })
}

export async function getServerDetails(panelServerId: number) {
  const res = (await apiRequest(`/servers/${panelServerId}`)) as {
    attributes: PterodactylServer
  }
  return res.attributes
}

// ─── Subuser (server sharing) ─────────────────────────────────

/**
 * Adds a subuser to a server (Client API, not Application API).
 * `serverIdentifier` is the short UUID visible in the panel URL.
 */
export async function addSubuser(
  serverIdentifier: string,
  subUserEmail: string
): Promise<void> {
  const url = `${PANEL_URL}/api/client/servers/${serverIdentifier}/users`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PANEL_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: subUserEmail,
      permissions: [
        'control.console',
        'control.start',
        'control.stop',
        'control.restart',
        'websocket.connect',
      ],
    }),
    cache: 'no-store',
  })

  if (!response.ok && response.status !== 422) {
    const err = await response.text()
    throw new Error(`Add subuser failed ${response.status}: ${err}`)
  }
}

export async function removeSubuser(
  serverIdentifier: string,
  subUserUuid: string
): Promise<void> {
  const url = `${PANEL_URL}/api/client/servers/${serverIdentifier}/users/${subUserUuid}`
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${PANEL_API_KEY}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok && response.status !== 204) {
    const err = await response.text()
    throw new Error(`Remove subuser failed ${response.status}: ${err}`)
  }
}

// ─── SSO (auto-login to panel) ───────────────────────────────

/**
 * Performs server-side auto-login to the Pterodactyl panel.
 * Returns the authenticated session cookie string to forward to the browser.
 *
 * Flow:
 *  1. GET /auth/login → extract CSRF token + initial cookies
 *  2. POST credentials → panel returns redirect + auth session cookie
 *  3. Return the Set-Cookie header value
 *
 * Returns null if auto-login fails (caller should fall back to manual login URL).
 */
export async function getPanelSessionCookie(
  email: string,
  userId: number
): Promise<string | null> {
  try {
    const password = getPterodactylPassword(userId)
    const loginUrl = `${PANEL_URL}/auth/login`

    // Step 1: GET login page to obtain CSRF token + initial session cookies
    const getRes = await fetch(loginUrl, {
      redirect: 'follow',
      headers: { Accept: 'text/html' },
    })

    const initCookies = getRes.headers.get('set-cookie') || ''
    const html = await getRes.text()

    // Extract CSRF token from the hidden input or meta tag
    const tokenMatch =
      html.match(/name="_token"\s+value="([^"]+)"/) ||
      html.match(/"csrfToken":"([^"]+)"/) ||
      html.match(/meta name="csrf-token" content="([^"]+)"/)
    const csrfToken = tokenMatch?.[1]

    if (!csrfToken) {
      console.warn('[SSO] Could not extract CSRF token from panel login page')
      return null
    }

    const laravelSession = parseCookieHeader(initCookies, 'laravel_session')
    const xsrfToken = parseCookieHeader(initCookies, 'XSRF-TOKEN')

    const cookieHeader = [
      laravelSession ? `laravel_session=${laravelSession}` : '',
      xsrfToken ? `XSRF-TOKEN=${xsrfToken}` : '',
    ]
      .filter(Boolean)
      .join('; ')

    // Step 2: POST credentials to the panel login endpoint
    const postRes = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieHeader,
        Accept: 'application/json, text/html',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: new URLSearchParams({
        _token: csrfToken,
        user: email,
        password,
      }).toString(),
      redirect: 'manual',
    })

    // Step 3: Return authenticated session cookies
    const authCookies = postRes.headers.get('set-cookie')
    return authCookies || null
  } catch (err) {
    console.error('[SSO] Auto-login error:', err)
    return null
  }
}

function parseCookieHeader(header: string, name: string): string | null {
  const regex = new RegExp(`(?:^|,)\\s*${name}=([^;,]+)`)
  const match = header.match(regex)
  return match ? decodeURIComponent(match[1]) : null
}
