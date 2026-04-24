import { query } from '@/lib/db'
import { WorldPurchasesTable } from '@/components/admin/world-purchases-table'

interface PurchaseRow {
  id: number
  user_id: number
  user_email: string | null
  user_full_name: string | null
  world_plan_id: number
  world_plan_name: string | null
  world_plan_price: number | null
  world_plan_slug: string | null
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  pterodactyl_server_id: number | null
  payment_sender_name: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export default async function AdminWorldPurchasesPage() {
  let purchases: PurchaseRow[] = []

  try {
    purchases = await query<PurchaseRow[]>(
      `SELECT wp.*,
              w.name AS world_plan_name,
              w.price AS world_plan_price,
              w.slug AS world_plan_slug,
              u.email AS user_email,
              u.full_name AS user_full_name
       FROM world_purchases wp
       LEFT JOIN world_plans w ON w.id = wp.world_plan_id
       LEFT JOIN users u ON u.id = wp.user_id
       ORDER BY wp.created_at DESC`
    )
  } catch (err) {
    console.error('[Admin World Purchases]', err)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">World Purchases</h1>
        <p className="text-muted-foreground">
          Review pending world purchases. Enter the Pterodactyl server ID and mark as
          active once the world is deployed.
        </p>
      </div>
      <WorldPurchasesTable purchases={purchases} />
    </div>
  )
}
