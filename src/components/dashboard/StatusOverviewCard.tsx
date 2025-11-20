'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { CheckCircle2, XCircle, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusOverviewCardProps {
  title: string
  count: number
  color: 'green' | 'yellow' | 'gray'
  onClick?: () => void
}

const statusConfig = {
  green: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20 hover:border-green-500/40',
  },
  yellow: {
    icon: XCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20 hover:border-orange-500/40',
  },
  gray: {
    icon: Archive,
    color: 'text-slate-600',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/20 hover:border-slate-500/40',
  },
}

export default function StatusOverviewCard({
  title,
  count,
  color,
  onClick,
}: StatusOverviewCardProps) {
  const config = statusConfig[color]
  const IconComponent = config.icon

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-6 hover:shadow-lg transition-all duration-300',
        config.borderColor,
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className={cn('text-4xl font-bold', config.color)}>{count}</p>
        </div>
        <div className={cn('p-4 rounded-xl', config.bgColor)}>
          <IconComponent className={cn('h-8 w-8', config.color)} />
        </div>
      </div>
    </Card>
  )
}

