'use client'

import React from 'react'
import ClientTable from './ClientTable'
import AgentMagicLinkActions from '@/components/AgentMagicLinkActions'
import type { Client, MagicLink } from '@/lib/types/database.types'

type ClientWithMeta = Client & {
  magic_links: MagicLink[]
  latest_submission_id?: string | null
  latest_submission_at?: string | null
}

interface ClientTableWrapperProps {
  clients: ClientWithMeta[]
}

export default function ClientTableWrapper({ clients }: ClientTableWrapperProps) {
  return (
    <ClientTable
      clients={clients}
      onClientClick={() => {}}
      renderActions={(client) => <AgentMagicLinkActions client={client} />}
    />
  )
}

