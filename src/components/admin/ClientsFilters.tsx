'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Filter, X } from 'lucide-react'
import type { Client } from '@/lib/types/database.types'

export interface ClientsFilters {
  agentId?: string
  status?: Client['status']
  dateFrom?: string
  dateTo?: string
}

interface ClientsFiltersProps {
  agents: Array<{ id: string; name: string }>
  filters: ClientsFilters
  onFiltersChange: (filters: ClientsFilters) => void
}

export function ClientsFilters({ agents, filters, onFiltersChange }: ClientsFiltersProps) {
  const hasActiveFilters = Boolean(filters.agentId || filters.status || filters.dateFrom || filters.dateTo)

  const handleAgentChange = (agentId: string | 'all') => {
    onFiltersChange({
      ...filters,
      agentId: agentId === 'all' ? undefined : agentId,
    })
  }

  const handleStatusChange = (status: Client['status'] | 'all') => {
    onFiltersChange({
      ...filters,
      status: status === 'all' ? undefined : status,
    })
  }

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      dateFrom: e.target.value || undefined,
    })
  }

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      dateTo: e.target.value || undefined,
    })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const selectedAgent = agents.find(a => a.id === filters.agentId)
  const statusLabels: Record<Client['status'], string> = {
    active: 'Actif',
    inactive: 'Inactif',
    archived: 'Archivé',
  }

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-black">Filtres:</span>
      </div>

      {/* Filtre par agent */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[150px] justify-between">
            {selectedAgent ? selectedAgent.name : 'Tous les agents'}
            <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[150px]">
          <DropdownMenuItem onClick={() => handleAgentChange('all')}>
            Tous les agents
          </DropdownMenuItem>
          {agents.map(agent => (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => handleAgentChange(agent.id)}
            >
              {agent.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Filtre par statut */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[120px] justify-between">
            {filters.status ? statusLabels[filters.status] : 'Tous les statuts'}
            <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[120px]">
          <DropdownMenuItem onClick={() => handleStatusChange('all')}>
            Tous les statuts
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('active')}>
            Actif
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('inactive')}>
            Inactif
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('archived')}>
            Archivé
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Filtre par date d'ajout - Date de début */}
      <div className="flex items-center gap-2">
        <label htmlFor="dateFrom" className="text-sm text-muted-foreground whitespace-nowrap">
          Du:
        </label>
        <input
          id="dateFrom"
          type="date"
          value={filters.dateFrom || ''}
          onChange={handleDateFromChange}
          className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Filtre par date d'ajout - Date de fin */}
      <div className="flex items-center gap-2">
        <label htmlFor="dateTo" className="text-sm text-muted-foreground whitespace-nowrap">
          Au:
        </label>
        <input
          id="dateTo"
          type="date"
          value={filters.dateTo || ''}
          onChange={handleDateToChange}
          className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Bouton pour effacer les filtres */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Effacer
        </Button>
      )}
    </div>
  )
}

