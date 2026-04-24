'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Cpu, HardDrive, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Plan } from '@/lib/types'

interface PlanCardProps {
  plan: Plan
  index: number
  planType: 'server' | 'world'
}

function formatStorage(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`
  return `${mb} MB`
}

function formatRam(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

export function PlanCard({ plan, index, planType }: PlanCardProps) {
  const isPopular = plan.slug === 'stone' || plan.slug === 'iron'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group relative"
    >
      <div className={`relative h-full overflow-hidden rounded-xl border ${isPopular ? 'border-primary' : 'border-border/50'} bg-card/50 backdrop-blur-sm p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10`}>
        {isPopular && (
          <div className="absolute -top-px left-1/2 -translate-x-1/2">
            <div className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-b-lg">
              Popular
            </div>
          </div>
        )}

        <div className="mb-4 pt-2">
          <h3 className="text-lg font-bold">{plan.name}</h3>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-bold text-primary">&#8377;{plan.price}</span>
            <span className="text-sm text-muted-foreground">/month</span>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Cpu className="w-4 h-4 text-primary" />
            </div>
            <span>{plan.cpu_percent}% CPU</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <span>{formatRam(plan.ram_mb)} RAM</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <HardDrive className="w-4 h-4 text-primary" />
            </div>
            <span>{formatStorage(plan.storage_mb)} Storage</span>
          </div>
        </div>

        <Button asChild className="w-full" variant={isPopular ? 'default' : 'outline'}>
          <Link href={`/order/${planType}/${plan.slug}`}>
            Select Plan
          </Link>
        </Button>
      </div>
    </motion.div>
  )
}
