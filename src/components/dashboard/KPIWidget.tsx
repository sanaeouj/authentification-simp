'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Users, Link2, FileCheck, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type IconName = 'Users' | 'Link2' | 'FileCheck'

const iconMap: Record<IconName, LucideIcon> = {
  Users,
  Link2,
  FileCheck,
}

interface KPIWidgetProps {
  title: string
  value: number | string
  description?: string
  icon: IconName
  color?: 'blue' | 'cyan' | 'green' | 'orange' | 'red' | 'violet'
  trend?: number
  onClick?: () => void
  href?: string
  loading?: boolean
}

const colorConfig: Record<'blue' | 'cyan' | 'green' | 'orange' | 'red' | 'violet', {
  bg: string
  text: string
  iconBg: string
}> = {
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    iconBg: 'bg-blue-500/10 text-blue-600',
  },
  cyan: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    iconBg: 'bg-primary/10 text-primary',
  },
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    iconBg: 'bg-green-500/10 text-green-600',
  },
  orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600',
    iconBg: 'bg-orange-500/10 text-orange-600',
  },
  red: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    iconBg: 'bg-red-500/10 text-red-600',
  },
  violet: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-600',
    iconBg: 'bg-violet-500/10 text-violet-600',
  },
}

export default function KPIWidget({
  title,
  value,
  description,
  icon,
  color = 'blue',
  trend,
  onClick,
  href,
  loading = false,
}: KPIWidgetProps) {
  const config = colorConfig[color]
  const isClickable = !!onClick || !!href
  const IconComponent = iconMap[icon]

  const handleClick = () => {
    if (href) {
      window.location.href = href
    } else if (onClick) {
      onClick()
    }
  }

  const trendColor = trend !== undefined && trend >= 0 ? 'text-green-600' : 'text-red-600'
  const TrendIcon = trend !== undefined && trend >= 0 ? ArrowUp : ArrowDown

  return (
    <Card
      onClick={isClickable ? handleClick : undefined}
      className={cn(
        'p-6 hover:shadow-lg transition-all duration-300 border-primary/20 hover:border-primary/40',
        isClickable && 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-2">{title}</p>
          {loading ? (
            <div className="h-10 w-24 bg-slate-200 rounded-lg animate-pulse mb-2" />
          ) : (
            <p className="text-3xl font-bold gradient-text">
              {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
            </p>
          )}
          {description && (
            <p className={cn('text-sm font-medium mt-1', config.text)}>
              {description}
            </p>
          )}
          {trend !== undefined && trend !== 0 && (
            <div className={cn('flex items-center gap-1 mt-2 text-sm font-medium', trendColor)}>
              <TrendIcon className="h-4 w-4" />
              <span>{Math.abs(trend)}%</span>
              <span className="text-muted-foreground font-normal">ce mois</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', config.iconBg)}>
          <IconComponent className="h-6 w-6" />
        </div>
      </div>
    </Card>
  )
}

