import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Server, Globe, ArrowRight, Cpu, HardDrive } from 'lucide-react'
import type { Plan, WorldPlan } from '@/lib/types'

export function LandingPlans({
  serverPlans,
  worldPlans,
}: {
  serverPlans: Plan[]
  worldPlans: WorldPlan[]
}) {
  return (
    <>
      {/* Server Plans */}
      {serverPlans.length > 0 && (
        <section className="py-16 md:py-20 border-t border-border/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
                <Server className="w-3.5 h-3.5" />
                Server Plans
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Deploy in seconds</h2>
              <p className="text-muted-foreground">Pick a plan that fits your community.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {serverPlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/order/server/${plan.slug}`}
                  className="group rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 md:p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold">{plan.name}</h3>
                    <span className="text-primary font-bold">&#8377;{plan.price}</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5"><Cpu className="w-3 h-3" /> {plan.cpu_percent}% CPU</li>
                    <li className="flex items-center gap-1.5"><HardDrive className="w-3 h-3" /> {(plan.ram_mb / 1024).toFixed(1)} GB RAM</li>
                    <li className="flex items-center gap-1.5"><HardDrive className="w-3 h-3" /> {(plan.storage_mb / 1024).toFixed(1)} GB Disk</li>
                  </ul>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Get started <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button asChild variant="outline">
                <Link href="/plans/server">See all server plans</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* World Plans */}
      {worldPlans.length > 0 && (
        <section className="py-16 md:py-20 border-t border-border/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
                <Globe className="w-3.5 h-3.5" />
                World Plans
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Ready-made worlds</h2>
              <p className="text-muted-foreground">Hand-deployed by our team, just open a Discord ticket.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {worldPlans.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-5"
                >
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-8 mt-1">
                    {p.description}
                  </p>
                  <div className="mt-3 text-primary font-bold">&#8377;{p.price}</div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button asChild>
                <Link href="/worlds">Browse worlds</Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
