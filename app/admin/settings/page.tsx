import { query } from '@/lib/db'
import { SettingsForm } from '@/components/admin/settings-form'
import type { SiteSettings, SiteSetting } from '@/lib/types'

export default async function AdminSettingsPage() {
  let settings: SiteSettings = {}
  
  try {
    const settingsRows = await query<SiteSetting[]>(
      'SELECT setting_key, setting_value FROM site_settings'
    )
    settings = settingsRows.reduce((acc, item) => {
      acc[item.setting_key] = item.setting_value
      return acc
    }, {} as SiteSettings)
  } catch {
    // Database not connected yet
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure site settings and integrations</p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  )
}
