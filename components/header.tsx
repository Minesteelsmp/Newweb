'use client'

/**
 * components/header.tsx
 * Site-wide navigation header. Shows user dropdown when logged in.
 * UPDATE: Added Account Settings link in user dropdown.
 */

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  User as UserIcon, LogOut, LayoutDashboard, Settings,
  Zap, ChevronDown, UserCog,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { User, SiteSettings } from '@/lib/types'

interface HeaderProps {
  initialUser?: User | null
  initialSettings?: SiteSettings
}

export function Header({ initialUser, initialSettings }: HeaderProps) {
  const [user, setUser]         = useState<User | null>(initialUser || null)
  const [settings, setSettings] = useState<SiteSettings>(initialSettings || {})
  const router = useRouter()

  useEffect(() => {
    if (!initialUser) {
      // Only fetch if no server-side user was provided (e.g. public pages)
      Promise.all([
        fetch('/api/auth/session').then(r => r.json()),
        fetch('/api/settings').then(r => r.json()),
      ]).then(([sessionData, settingsData]) => {
        if (sessionData.user) {
          setUser({
            id: sessionData.user.id,
            email: sessionData.user.email,
            full_name: sessionData.user.fullName,
            is_admin: sessionData.user.isAdmin,
            created_at: '',
            updated_at: '',
          })
        }
        if (settingsData.settings) setSettings(settingsData.settings)
      }).catch(() => {/* ignore fetch errors */})
    }
  }, [initialUser])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/')
    router.refresh()
  }

  const isOnline   = settings.site_status !== 'offline'
  const statusMsg  = settings.status_message || (isOnline ? 'Online' : 'Maintenance')
  const isAdmin    = user?.is_admin

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold">CubiqHost</span>
          </Link>

          {/* Center: nav links for desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/plans/server" className="text-muted-foreground hover:text-foreground transition-colors">
              Server Plans
            </Link>
            <Link href="/plans/world" className="text-muted-foreground hover:text-foreground transition-colors">
              World Plans
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Status pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-sm">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-primary animate-pulse' : 'bg-destructive'}`} />
              <span className="text-muted-foreground text-xs">{statusMsg}</span>
            </div>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <UserIcon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="hidden sm:inline max-w-[120px] truncate text-sm">
                      {user.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {/* User info */}
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>

                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/account" className="cursor-pointer">
                      <UserCog className="w-4 h-4 mr-2" /> Account Settings
                    </Link>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer text-primary">
                          <Settings className="w-4 h-4 mr-2" /> Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/sign-up">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
