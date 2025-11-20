'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { ArrowUp, ArrowDown, UserCog, Users, Link2, FileCheck, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type IconName = 'UserCog' | 'Users' | 'Link2' | 'FileCheck'

const iconMap: Record<IconName, LucideIcon> = {
  UserCog,
  Users,
  Link2,
  FileCheck,
}

interface KPICardProps {
  title: string
  value: number
  icon: IconName
  trend?: number
  color?: 'blue' | 'cyan' | 'green' | 'orange'
}

export function KPICard({
  title,
  value,
  icon,
  trend = 0,
  color = 'blue',
}: KPICardProps) {
  const IconComponent = iconMap[icon]
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600',
    cyan: 'bg-primary/10 text-primary',
    green: 'bg-green-500/10 text-green-600',
    orange: 'bg-orange-500/10 text-orange-600',
  }

  const trendColor = trend >= 0 ? 'text-green-600' : 'text-red-600'
  const TrendIcon = trend >= 0 ? ArrowUp : ArrowDown

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 border-primary/20 hover:border-primary/40">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-2">{title}</p>
          <p className="text-3xl font-bold gradient-text">{value}</p>
          {trend !== 0 && (
            <div className={cn('flex items-center gap-1 mt-2 text-sm font-medium', trendColor)}>
              <TrendIcon className="h-4 w-4" />
              <span>{Math.abs(trend)}%</span>
              <span className="text-muted-foreground font-normal">ce mois</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', colorClasses[color])}>
          <IconComponent className="h-6 w-6" />
        </div>
      </div>
    </Card>
  )
}

