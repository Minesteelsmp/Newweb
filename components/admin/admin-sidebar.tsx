'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Zap,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Server,
  Settings,
  LogOut,
  DollarSign,
  Home,
  Menu,
  Receipt,
  Globe,
  Gift,
  Tag,
  Palette,
} from 'lucide-react'

const navItems = [
  { href: '/admin',                 label: 'Dashboard',       icon: LayoutDashboard, exact: true },
  { href: '/admin/orders',          label: 'Orders',          icon: ShoppingCart },
  { href: '/admin/world-purchases', label: 'World Purchases', icon: Gift },
  { href: '/admin/invoices',        label: 'Invoices',        icon: Receipt },
  { href: '/admin/users',           label: 'Users',           icon: Users },
  { href: '/admin/servers',         label: 'Servers',         icon: Server },
  { href: '/admin/plans',           label: 'Server Plans',    icon: DollarSign },
  { href: '/admin/world-plans',     label: 'World Plans',     icon: Globe },
  { href: '/admin/coupons',         label: 'Coupons',         icon: Tag },
  { href: '/admin/landing',         label: 'Landing Page',    icon: Palette },
  { href: '/admin/settings',        label: 'Settings',        icon: Settings },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="text-base font-bold block leading-tight">CubiqHost</span>
            <span className="text-[11px] text-muted-foreground">Admin Panel</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-border/50 space-y-1">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
        >
          <Home className="w-4.5 h-4.5" />
          My Dashboard
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="w-4.5 h-4.5" />
          Logout
        </button>
      </div>
    </div>
  )
}

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile: hamburger trigger + slide-over */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 border-b border-border bg-background/95 backdrop-blur md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-3">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm">CubiqHost Admin</span>
        </div>
      </div>

      {/* Desktop: fixed sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-60 border-r border-border bg-card/50 flex-col z-30">
        <SidebarContent />
      </aside>
    </>
  )
}
