/**
 * app/admin/layout.tsx
 * Wraps all admin pages. Verifies the user is an admin — redirects otherwise.
 */
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { ADMIN_EMAIL } from '@/lib/config'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.isLoggedIn || !session.userId) {
    redirect('/auth/login?redirect=/admin')
  }

  const isAdmin = session.isAdmin || session.email === ADMIN_EMAIL
  if (!isAdmin) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar />
      {/* Content area — offset by sidebar width on desktop, top bar on mobile */}
      <main className="flex-1 md:ml-60">
        <div className="p-4 md:p-8 pt-16 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
