'use client'

import React from 'react'
import { getColorFromString } from '@/lib/utils/colors'
import { ClockIcon } from '@heroicons/react/24/outline'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface Activity {
  id: string
  submitted_at: string | null
  client_name: string
  client_id: string | null
}

interface ActivityTimelineProps {
  activities: Activity[]
  clients?: Array<{ id: string; full_name: string | null }>
  filters?: {
    period: 'today' | 'week' | 'month' | 'all'
  }
  onFilterChange?: (period: string) => void
}

export default function ActivityTimeline({
  activities,
  clients = [],
  filters,
  onFilterChange,
}: ActivityTimelineProps) {
  const periodFilters = [
    { id: 'today', label: "Aujourd'hui" },
    { id: 'week', label: '7 jours' },
    { id: 'month', label: '30 jours' },
    { id: 'all', label: 'Tout' },
  ]

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Date inconnue'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) {
      return `Il y a ${diffMins} min`
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`
    } else if (diffDays < 7) {
      return `Il y a ${diffDays}j`
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  const groupByDate = (activities: Activity[]) => {
    const groups: Record<string, Activity[]> = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    activities.forEach((activity) => {
      if (!activity.submitted_at) {
        if (!groups['Autres']) groups['Autres'] = []
        groups['Autres'].push(activity)
        return
      }

      const date = new Date(activity.submitted_at)
      date.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000)

      let groupKey: string
      if (diffDays === 0) {
        groupKey = "Aujourd'hui"
      } else if (diffDays === 1) {
        groupKey = 'Hier'
      } else if (diffDays < 7) {
        groupKey = 'Cette semaine'
      } else if (diffDays < 30) {
        groupKey = 'Ce mois'
      } else {
        groupKey = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      }

      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(activity)
    })

    return groups
  }

  const groupedActivities = groupByDate(activities)

  return (
    <Card variant="standard" size="sm" className="p-0">
      <div className="mb-4 px-4 sm:px-6 pt-4 sm:pt-6">
        {onFilterChange && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {periodFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors duration-200 ${
                  filters?.period === filter.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-12 px-4 sm:px-6">
          <ClockIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Aucune activité récente</p>
          <p className="text-xs text-slate-500 mt-1.5">Les nouvelles soumissions apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-5 px-4 sm:px-6 pb-4 sm:pb-6">
          {Object.entries(groupedActivities).map(([groupKey, groupActivities]) => (
            <div key={groupKey}>
              <h4 className="text-xs font-semibold text-black uppercase tracking-wider mb-3">
                {groupKey}
              </h4>
              <div className="space-y-3 pl-3 border-l-2 border-slate-200">
                {groupActivities.map((activity) => {
                  const client = clients.find((c) => c.id === activity.client_id)
                  const avatarColor = getColorFromString(activity.client_name)
                  const initial = (activity.client_name?.charAt(0) || 'C').toUpperCase()

                  return (
                    <div key={activity.id} className="flex gap-3 relative">
                      <div className="absolute -left-[19px] top-2 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white"></div>
                      <div className={`shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-semibold text-xs shadow-sm`}>
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0 pb-3">
                        <p className="text-sm font-semibold text-black truncate">
                          {activity.client_name}
                        </p>
                        <p className="text-xs text-black mt-0.5">Formulaire soumis</p>
                        <p className="text-xs text-black mt-1.5 flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {formatDate(activity.submitted_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

