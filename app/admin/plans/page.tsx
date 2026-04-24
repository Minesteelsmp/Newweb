/**
 * app/admin/plans/page.tsx
 * Admin plans management - server-side fetch so auth is guaranteed.
 */
import { query } from '@/lib/db'
import { PlansManager } from '@/components/admin/plans-manager'
import type { Plan } from '@/lib/types'

export default async function AdminPlansPage() {
  let plans: Plan[] = []

  try {
    plans = await query<Plan[]>(
      'SELECT * FROM plans ORDER BY sort_order ASC'
    )
  } catch (err) {
    console.error('[Admin Plans]', err)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Server Plans</h1>
        <p className="text-muted-foreground">Manage server hosting plans and pricing. World plans are managed separately.</p>
      </div>
      <PlansManager plans={plans} />
    </div>
  )
}
