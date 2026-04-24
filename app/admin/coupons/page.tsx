/**
 * app/admin/coupons/page.tsx
 * Lists existing coupons and exposes a creation/edit dialog.
 */
import { query } from '@/lib/db'
import { CouponsManager } from '@/components/admin/coupons-manager'
import type { Coupon } from '@/lib/types'

export default async function AdminCouponsPage() {
  let coupons: Coupon[] = []
  try {
    coupons = await query<Coupon[]>(
      `SELECT * FROM coupons ORDER BY created_at DESC`
    )
  } catch (err) {
    console.error('[Admin Coupons] DB error:', err)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Coupons</h1>
        <p className="text-muted-foreground">
          Create promo codes that grant a percentage discount at checkout.
        </p>
      </div>

      <CouponsManager initialCoupons={coupons} />
    </div>
  )
}
