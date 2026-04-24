/**
 * app/admin/servers/page.tsx
 */
import { query } from '@/lib/db'
import { ServersTable } from '@/components/admin/servers-table'
import type { Server, Profile, Plan, SoftwareOption } from '@/lib/types'

interface ServerRow extends Server {
  profile_id: number
  profile_email: string
  profile_full_name: string | null
  plan_name: string
  plan_price: number
  software_name: string | null
}

type ServerWithRelations = Omit<Server, 'software'> & {
  profile: Profile
  plan: Plan
  software: SoftwareOption | null
}

export default async function AdminServersPage() {
  let servers: ServerWithRelations[] = []

  try {
    const rows = await query<ServerRow[]>(
      `SELECT
         s.*,
         u.id        AS profile_id,
         u.email     AS profile_email,
         u.full_name AS profile_full_name,
         p.id        AS plan_id,
         p.name      AS plan_name,
         p.price     AS plan_price,
         sw.id       AS software_id,
         sw.name     AS software_name
       FROM servers s
       LEFT JOIN users            u  ON u.id  = s.user_id
       LEFT JOIN plans            p  ON p.id  = s.plan_id
       LEFT JOIN software_options sw ON sw.id = s.software_id
       WHERE s.status != 'deleted'
       ORDER BY s.created_at DESC`
    )

    servers = rows.map((s) => {
      const {
        profile_id,
        profile_email,
        profile_full_name,
        plan_name,
        plan_price,
        software_id,
        software_name,
        software,
        ...rest
      } = s as any

      return {
        ...rest,

        profile: {
          id: profile_id,
          email: profile_email,
          full_name: profile_full_name,
          is_admin: false,
          created_at: '',
          updated_at: '',
        },

        plan: {
          id: s.plan_id,
          name: plan_name,
          slug: '',
          price: plan_price,
          cpu_percent: 0,
          ram_mb: 0,
          storage_mb: 0,
          is_active: true,
          sort_order: 0,
          created_at: '',
          updated_at: '',
        },

        software: software_id
          ? {
              id: software_id,
              name: software_name ?? '',
              slug: '',
              egg_id: 1,
              is_active: true,
              sort_order: 0,
              created_at: new Date().toISOString(),
            }
          : null,
      }
    })
  } catch (err) {
    console.error('[Admin Servers] DB error:', err)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Servers</h1>
        <p className="text-muted-foreground">
          Manage all active and suspended Minecraft servers.
        </p>
      </div>

      <ServersTable servers={servers} />
    </div>
  )
}
