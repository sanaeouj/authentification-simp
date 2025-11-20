'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import AgentMagicLinkActions from '@/components/AgentMagicLinkActions'
import { getColorFromString } from '@/lib/utils/colors'
import type { Client, MagicLink } from '@/lib/types/database.types'
import Link from 'next/link'
import { 
  PaperClipIcon, 
  DocumentTextIcon,
  EnvelopeIcon,
  EyeIcon 
} from '@heroicons/react/24/outline'

type ClientWithMeta = Client & {
  magic_links: MagicLink[]
  latest_submission_id?: string | null
  latest_submission_at?: string | null
}

interface ClientCardProps {
  client: ClientWithMeta
  isActiveMagicLink: (status: MagicLink['status']) => boolean
}

export default function ClientCard({ client, isActiveMagicLink }: ClientCardProps) {
  const [showActions, setShowActions] = useState(false)
  const activeLinksCount = client.magic_links.filter(link => isActiveMagicLink(link.status)).length
  const completedFormsCount = client.magic_links.filter(link => link.status === 'used').length
  const avatarColor = getColorFromString(client.full_name || client.email || 'C')
  const initial = (client.full_name?.charAt(0) || client.email?.charAt(0) || 'C').toUpperCase()

  const statusConfig: Record<Client['status'], { label: string; color: 'green' | 'orange' | 'gray' }> = {
    active: { label: 'Actif', color: 'green' },
    inactive: { label: 'Inactif', color: 'orange' },
    archived: { label: 'Archivé', color: 'gray' },
  }

  const status = statusConfig[client.status]

  return (
    <Card
      variant="interactive"
      className="p-5 hover:bg-[#F5F7FA] transition-all duration-200"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-semibold text-base shadow-sm`}>
          {initial}
        </div>

        {/* Informations */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-[#111827] truncate hover:text-[#3B82F6] transition-colors duration-200">
                {client.full_name || 'Client sans nom'}
              </h3>
              <p className="text-sm text-gray-600 truncate flex items-center gap-1.5 mt-0.5">
                <EnvelopeIcon className="w-3.5 h-3.5 text-gray-400" />
                {client.email}
              </p>
            </div>
            <Badge variant="status" color={status.color}>
              {status.label}
            </Badge>
          </div>

          {/* Métriques */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2">
              <PaperClipIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-[#111827]">
                {activeLinksCount} {activeLinksCount > 1 ? 'liens' : 'lien'}
              </span>
              {activeLinksCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-[#111827]">
                {completedFormsCount} {completedFormsCount > 1 ? 'formulaires' : 'formulaire'}
              </span>
            </div>
          </div>

          {/* Actions visibles au hover */}
          {showActions && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#E5E7EB]">
              <Link
                href={`/agent/clients/${client.id}`}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition-colors duration-200"
              >
                <EyeIcon className="w-4 h-4" />
                Voir détails
              </Link>
              {activeLinksCount === 0 && (
                <button
                  onClick={() => {/* TODO: Ouvrir modal pour envoyer lien */}}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition-colors duration-200"
                >
                  <PaperClipIcon className="w-4 h-4" />
                  Envoyer lien
                </button>
              )}
              {client.latest_submission_id && (
                <a
                  href={`/api/forms/download?submissionId=${client.latest_submission_id}`}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition-colors duration-200"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  Télécharger
                </a>
              )}
              <div className="ml-auto">
                <AgentMagicLinkActions client={client} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

