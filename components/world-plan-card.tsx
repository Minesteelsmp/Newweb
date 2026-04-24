'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Cpu, HardDrive, Database, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorldPurchaseModal } from '@/components/world-purchase-modal'
import type { WorldPlan, SiteSettings } from '@/lib/types'

interface WorldPlanCardProps {
  plan: WorldPlan
  settings: SiteSettings
  loggedIn: boolean
  index?: number
}

function formatRam(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}
function formatStorage(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`
  return `${mb} MB`
}

export function WorldPlanCard({ plan, settings, loggedIn, index = 0 }: WorldPlanCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ y: -4 }}
        className="group relative"
      >
        <div className="relative h-full overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-4.5 h-4.5 text-primary" />
            </div>
            <h3 className="text-lg font-bold">{plan.name}</h3>
          </div>

          {plan.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
              {plan.description}
            </p>
          )}

          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-bold text-primary">&#8377;{Number(plan.price).toFixed(0)}</span>
            <span className="text-sm text-muted-foreground">one-time</span>
          </div>

          <div className="space-y-2 mb-5 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Cpu className="w-3.5 h-3.5 text-primary" />
              {plan.cpu_percent}% CPU
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Database className="w-3.5 h-3.5 text-primary" />
              {formatRam(plan.ram_mb)} RAM
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <HardDrive className="w-3.5 h-3.5 text-primary" />
              {formatStorage(plan.storage_mb)} Storage
            </div>
          </div>

          <Button className="w-full" onClick={() => setOpen(true)}>
            Purchase
          </Button>
        </div>
      </motion.div>

      {open && (
        <WorldPurchaseModal
          plan={plan}
          settings={settings}
          loggedIn={loggedIn}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
