'use client'

/**
 * components/account-settings.tsx
 * User account settings: view info + change password.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, User, Lock, Shield, CheckCircle } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface AccountSettingsProps { user: Profile }

export function AccountSettings({ user }: AccountSettingsProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState<string | null>(null)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) { setError('New passwords do not match'); return }
    if (newPassword.length < 8)          { setError('Password must be at least 8 characters'); return }
    if (newPassword === currentPassword)  { setError('New password must be different from current'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change password')

      toast.success('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" /> Account Info
          </CardTitle>
          <CardDescription>Your registered account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</Label>
              <p className="font-medium">{user.full_name || '—'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
              <p className="font-medium">{user.email}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Role</Label>
              <div>
                {user.is_admin
                  ? <Badge><Shield className="w-3 h-3 mr-1" /> Admin</Badge>
                  : <Badge variant="secondary">Customer</Badge>}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Member Since</Label>
              <p className="font-medium">{user.created_at ? formatDate(user.created_at) : '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" /> Change Password
          </CardTitle>
          <CardDescription>Update your login password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setError(null) }}
                placeholder="Enter current password"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(null) }}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null) }}
                placeholder="Repeat new password"
                autoComplete="new-password"
                required
              />
            </div>

            {/* Password strength indicator */}
            {newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => {
                    const strength = Math.min(
                      Math.floor(newPassword.length / 4) +
                      ((/[A-Z]/.test(newPassword) ? 1 : 0) +
                       (/[0-9]/.test(newPassword) ? 1 : 0) +
                       (/[^A-Za-z0-9]/.test(newPassword) ? 1 : 0)),
                      4
                    )
                    return (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < strength
                            ? strength <= 1 ? 'bg-red-500'
                            : strength <= 2 ? 'bg-amber-500'
                            : strength <= 3 ? 'bg-yellow-400'
                            : 'bg-primary'
                            : 'bg-secondary'
                        }`}
                      />
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Use uppercase, numbers, and symbols for a stronger password
                </p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…</>
                : <><CheckCircle className="w-4 h-4 mr-2" /> Update Password</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
