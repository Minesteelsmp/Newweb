/**
 * app/admin/users/page.tsx
 * Admin users management — shows all users with panel sync status and server count.
 */
import { query } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Shield, User, ServerIcon, CheckCircle, AlertCircle } from 'lucide-react'
import type { User as UserType } from '@/lib/types'

interface UserWithStats extends UserType {
  server_count: number
  pterodactyl_user_id: number | null
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default async function AdminUsersPage() {
  let users: UserWithStats[] = []
  let totalUsers = 0
  let panelSynced = 0

  try {
    users = await query<UserWithStats[]>(
      `SELECT
         u.id, u.email, u.full_name, u.is_admin,
         u.pterodactyl_user_id, u.created_at, u.updated_at,
         COUNT(DISTINCT s.id) AS server_count
       FROM users u
       LEFT JOIN servers s ON s.user_id = u.id AND s.status != 'deleted'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    totalUsers = users.length
    panelSynced = users.filter(u => u.pterodactyl_user_id != null).length
  } catch (err) {
    console.error('[Admin Users] DB error:', err)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">All registered customer accounts.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Panel Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{panelSynced}</p>
            <p className="text-xs text-muted-foreground mt-1">Have Pterodactyl accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Not Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-500">{totalUsers - panelSynced}</p>
            <p className="text-xs text-muted-foreground mt-1">No panel account yet</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({totalUsers})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile view */}
          <div className="md:hidden space-y-3">
            {users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            ) : users.map((user) => (
              <div
                key={user.id}
                className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {user.is_admin
                        ? <Shield className="w-4 h-4 text-primary" />
                        : <User className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</p>
                    </div>
                  </div>
                  {(user.is_admin || user.email === 'support.cubiqhost@gmail.com')
                    ? <Badge>Admin</Badge>
                    : <Badge variant="secondary">User</Badge>}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <ServerIcon className="w-3 h-3" />
                    {user.server_count} server{user.server_count !== 1 ? 's' : ''}
                  </span>
                  {user.pterodactyl_user_id
                    ? <span className="flex items-center gap-1 text-primary">
                        <CheckCircle className="w-3 h-3" /> Panel synced
                      </span>
                    : <span className="flex items-center gap-1 text-amber-500">
                        <AlertCircle className="w-3 h-3" /> Not synced
                      </span>}
                  <span>Joined {formatDate(user.created_at)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Servers</TableHead>
                  <TableHead>Panel Sync</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {user.is_admin
                            ? <Shield className="w-4 h-4 text-primary" />
                            : <User className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <span className="font-medium">{user.full_name || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell>
                      {(user.is_admin || user.email === 'support.cubiqhost@gmail.com')
                        ? <Badge>Admin</Badge>
                        : <Badge variant="secondary">User</Badge>}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm">
                        <ServerIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        {user.server_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.pterodactyl_user_id ? (
                        <span className="flex items-center gap-1.5 text-sm text-primary">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Synced #{user.pterodactyl_user_id}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-amber-500">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Not synced
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
