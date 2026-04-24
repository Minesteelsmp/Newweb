import { SessionOptions } from 'iron-session'
import { SESSION_SECRET } from '@/lib/config'

export interface SessionData {
  userId?: number
  email?: string
  fullName?: string
  isAdmin?: boolean
  isLoggedIn?: boolean
}

export const sessionOptions: SessionOptions = {
  password: SESSION_SECRET,
  cookieName: 'cubiqhost_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
}
