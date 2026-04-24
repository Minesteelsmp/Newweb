import { query } from '@/lib/db'
import { WorldPlansManager } from '@/components/admin/world-plans-manager'
import type { WorldPlan } from '@/lib/types'

export default async function AdminWorldPlansPage() {
  let plans: WorldPlan[] = []
  try {
    plans = await query<WorldPlan[]>('SELECT * FROM world_plans ORDER BY sort_order ASC')
  } catch (err) {
    console.error('[Admin World Plans]', err)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">World Plans</h1>
        <p className="text-muted-foreground">
          Manage pre-configured world offerings available for one-time purchase.
        </p>
      </div>
      <WorldPlansManager plans={plans} />
    </div>
  )
}
