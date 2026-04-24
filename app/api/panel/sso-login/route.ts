/**
 * GET /api/panel/sso-login?server=<identifier>
 *
 * Token-based SSO into the Pterodactyl panel (replaces the legacy
 * CSRF/form-post approach which was failing with 419 errors).
 *
 * Flow:
 *  1. Validate the CubiqHost session.
 *  2. Look up the user's email in our DB.
 *  3. GET /api/application/users?filter[email]=... to find their panel user ID.
 *  4. POST /api/application/users/{id}/login to mint a one-time login token.
 *  5. Redirect to ${PANEL_URL}/login?token=...&redirect=/server/{identifier}
 *
 * If anything fails, we fall back to sending the user to the panel's login page.
 */
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { queryOne } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { PANEL_URL, PANEL_API_KEY, isPanelConfigured } from '@/lib/config'

interface UserRow {
  id: number
  email: string
}

async function panelRequest(endpoint: string, method: 'GET' | 'POST' = 'GET') {
  const res = await fetch(`${PANEL_URL}/api/application${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${PANEL_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Panel ${method} ${endpoint} -> ${res.status}: ${text}`)
  try { return JSON.parse(text) } catch { return text }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const serverIdentifier = searchParams.get('server') || ''

  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    if (!isPanelConfigured) {
      return NextResponse.redirect(`${PANEL_URL}/auth/login`)
    }

    const user = await queryOne<UserRow>(
      'SELECT id, email FROM users WHERE id = ?',
      [session.userId]
    )
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // 1. Find panel user by email
    const searchRes = (await panelRequest(
      `/users?filter[email]=${encodeURIComponent(user.email)}`
    )) as { data: Array<{ attributes: { id: number } }> }

    const panelUser = searchRes.data?.[0]?.attributes
    if (!panelUser) {
      // No matching panel user - fall back to manual login
      return NextResponse.redirect(`${PANEL_URL}/auth/login`)
    }

    // 2. Mint a one-time login token
    const tokenRes = (await panelRequest(
      `/users/${panelUser.id}/login`,
      'POST'
    )) as { attributes?: { token: string } } | { token: string }

    // Pterodactyl builds may return { token: ... } or { attributes: { token: ... } }
    const token =
      (tokenRes as { attributes?: { token: string } }).attributes?.token ??
      (tokenRes as { token?: string }).token

    if (!token) {
      console.error('[SSO] Panel did not return a login token:', tokenRes)
      return NextResponse.redirect(`${PANEL_URL}/auth/login`)
    }

    // 3. Redirect to panel with the token
    const redirectPath = serverIdentifier
      ? `/server/${encodeURIComponent(serverIdentifier)}`
      : '/'
    const url = `${PANEL_URL}/login?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectPath)}`

    return NextResponse.redirect(url)
  } catch (err) {
    console.error('[SSO] Error:', err)
    return NextResponse.redirect(`${PANEL_URL}/auth/login`)
  }
}
