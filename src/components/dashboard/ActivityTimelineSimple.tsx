'use client'

import React from 'react'
import { FileCheck, Link2, UserPlus, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Activity {
  id: string
  type: 'form_submitted' | 'link_created' | 'client_added' | 'link_expired'
  client: string
  description: string
  timestamp: string
}

interface ActivityTimelineSimpleProps {
  activities: Activity[]
}

export default function ActivityTimelineSimple({ activities }: ActivityTimelineSimpleProps) {
  const getActivityIcon = (type: Activity['type']) => {
    const config = {
      form_submitted: {
        icon: FileCheck,
        color: 'text-green-600',
        bgColor: 'bg-green-500/10',
      },
      link_created: {
        icon: Link2,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      },
      client_added: {
        icon: UserPlus,
        color: 'text-blue-600',
        bgColor: 'bg-blue-500/10',
      },
      link_expired: {
        icon: AlertCircle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-500/10',
      },
    }

    return config[type]
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const config = getActivityIcon(activity.type)
        const Icon = config.icon
        const isLast = index === activities.length - 1

        return (
          <div key={activity.id} className="relative flex gap-3">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[19px] top-10 w-0.5 h-full bg-border" />
            )}

            {/* Icon */}
            <div
              className={cn(
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10',
                config.bgColor
              )}
            >
              <Icon className={cn('h-5 w-5', config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <p className="font-medium text-sm">{activity.client}</p>
              <p className="text-sm text-muted-foreground">
                {activity.description}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {activity.timestamp}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

