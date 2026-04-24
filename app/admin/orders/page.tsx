/**
 * app/admin/orders/page.tsx
 */
import { query } from '@/lib/db'
import { OrdersTable } from '@/components/admin/orders-table'
import type { Order, Plan, SoftwareOption, Profile } from '@/lib/types'

interface OrderRow extends Order {
  profile_id: number
  profile_email: string
  profile_full_name: string | null
  plan_name: string
  plan_price: number
  plan_cpu_percent: number
  plan_ram_mb: number
  plan_storage_mb: number
  software_name: string | null
  software_egg_id: number | null
}

type OrderWithRelations = Omit<Order, 'software'> & {
  profile: Profile
  plan: Plan
  software: SoftwareOption | null
}

export default async function AdminOrdersPage() {
  let orders: OrderWithRelations[] = []

  try {
    const rows = await query<OrderRow[]>(
      `SELECT
         o.*,
         u.id           AS profile_id,
         u.email        AS profile_email,
         u.full_name    AS profile_full_name,
         p.id           AS plan_id,
         p.name         AS plan_name,
         p.price        AS plan_price,
         p.cpu_percent  AS plan_cpu_percent,
         p.ram_mb       AS plan_ram_mb,
         p.storage_mb   AS plan_storage_mb,
         s.id           AS software_id,
         s.name         AS software_name,
         s.egg_id       AS software_egg_id,
         c.code             AS coupon_code,
         c.discount_percent AS coupon_discount_percent
       FROM orders o
       LEFT JOIN users            u ON u.id = o.user_id
       LEFT JOIN plans            p ON p.id = o.plan_id
       LEFT JOIN software_options s ON s.id = o.software_id
       LEFT JOIN coupons          c ON c.id = o.coupon_id
       ORDER BY o.created_at DESC`
    )

    orders = rows.map((o) => {
      const {
        profile_id,
        profile_email,
        profile_full_name,
        plan_name,
        plan_price,
        plan_cpu_percent,
        plan_ram_mb,
        plan_storage_mb,
        software_id,
        software_name,
        software_egg_id,
        software,
        coupon_code,
        coupon_discount_percent,
        ...rest
      } = o as any

      return {
        ...rest,
        coupon: coupon_code
          ? {
              id: o.coupon_id,
              code: coupon_code,
              discount_percent: Number(coupon_discount_percent),
              max_uses: 0,
              used_count: 0,
              valid_from: '',
              valid_until: '',
              is_active: true,
              created_at: '',
            }
          : null,

        profile: {
          id: profile_id,
          email: profile_email,
          full_name: profile_full_name,
          is_admin: false,
          created_at: '',
          updated_at: '',
        },

        plan: {
          id: o.plan_id,
          name: plan_name,
          slug: '',
          price: plan_price,
          cpu_percent: plan_cpu_percent,
          ram_mb: plan_ram_mb,
          storage_mb: plan_storage_mb,
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
              egg_id: software_egg_id ?? 1,
              is_active: true,
              sort_order: 0,
              created_at: new Date().toISOString(),
            }
          : null,
      }
    })
  } catch (err) {
    console.error('[Admin Orders] DB error:', err)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground">
          Approve or reject customer orders. Approving a new order automatically provisions the server.
        </p>
      </div>

      <OrdersTable orders={orders} />
    </div>
  )
}
