'use client'

import React from 'react'
import Link from 'next/link'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/badge'
import type { Client, MagicLink } from '@/lib/types/database.types'
import { cn } from '@/lib/utils'

type ClientWithMeta = Client & {
  magic_links: MagicLink[]
  latest_submission_id?: string | null
  latest_submission_at?: string | null
}

interface ClientTableProps {
  clients: ClientWithMeta[]
  onClientClick?: (client: ClientWithMeta) => void
  renderActions?: (client: ClientWithMeta) => React.ReactNode
}

function StatusBadge({ status }: { status: Client['status'] }) {
  const config: Record<Client['status'], { color: 'green' | 'yellow' | 'gray', label: string }> = {
    active: {
      color: 'green',
      label: 'Actif'
    },
    inactive: {
      color: 'yellow',
      label: 'Inactif'
    },
    archived: {
      color: 'gray',
      label: 'Archivé'
    },
  }

  const { color, label } = config[status]

  return (
    <Badge color={color} variant="status">
      {label}
    </Badge>
  )
}

export default function ClientTable({
  clients,
  onClientClick,
  renderActions,
}: ClientTableProps) {
  // Fonction pour déterminer si un lien est actif (définie dans le composant Client)
  const isActiveMagicLink = (status: MagicLink['status']): boolean => status === 'pending'

  if (clients.length === 0) {
    return (
      <div className="text-center py-16 px-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-indigo-50 mb-6">
          <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Aucun client pour le moment
        </h3>
        <p className="text-sm text-slate-600 mb-8 max-w-md mx-auto">
          Commencez par créer votre premier client pour gérer ses liens magiques et formulaires
        </p>
      </div>
    )
  }

  return (
    <Table variant="default" size="md">
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Liens Actifs</TableHead>
          <TableHead>Formulaires</TableHead>
          {renderActions && <TableHead className="text-center">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => {
          const activeLinks = client.magic_links.filter(link => isActiveMagicLink(link.status)).length
          const completedForms = client.magic_links.filter(link => link.status === 'used').length
          const initial = client.full_name?.charAt(0).toUpperCase() || 'C'

          return (
            <TableRow
              key={client.id}
              clickable={!!onClientClick}
              onClick={() => onClientClick?.(client)}
            >
              <TableCell>
                {onClientClick ? (
                  <Link href={`/agent/clients/${client.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm sm:text-base shadow-sm">
                      {initial}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-black">
                        {client.full_name}
                      </div>
                      <div className="text-xs sm:text-sm text-black flex items-center gap-1.5 mt-0.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                        {client.email}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm sm:text-base shadow-sm">
                      {initial}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-black">
                        {client.full_name}
                      </div>
                      <div className="text-xs sm:text-sm text-black flex items-center gap-1.5 mt-0.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                        {client.email}
                      </div>
                    </div>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={client.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-black">
                    {activeLinks}
                  </span>
                  {activeLinks > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm font-semibold text-black">
                  {completedForms}
                </div>
              </TableCell>
              {renderActions && (
                <TableCell>
                  <div className="flex items-center justify-center">
                    {renderActions(client)}
                  </div>
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

