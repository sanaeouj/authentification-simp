'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Link2, Eye, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Client {
  id: string
  full_name: string | null
  email: string | null
  company?: string | null
  status: 'active' | 'inactive' | 'archived'
  lastActivity?: string
  formsCompleted?: number
  linksActive?: number
}

interface ClientsTableSimpleProps {
  clients: Client[]
}

export default function ClientsTableSimple({ clients }: ClientsTableSimpleProps) {
  const getStatusBadge = (status: Client['status']) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      archived: 'outline',
    } as const

    const labels = {
      active: 'Actif',
      inactive: 'Inactif',
      archived: 'Archivé',
    }

    return (
      <Badge variant={variants[status]} className="capitalize">
        {labels[status]}
      </Badge>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Formulaires</TableHead>
            <TableHead>Liens</TableHead>
            <TableHead>Dernière activité</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id} className="hover:bg-muted/50">
              <TableCell>
                <div>
                  <p className="font-medium">{client.full_name || 'Sans nom'}</p>
                  <p className="text-sm text-muted-foreground">{client.email || ''}</p>
                  {client.company && (
                    <p className="text-xs text-muted-foreground">{client.company}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(client.status)}</TableCell>
              <TableCell>
                <span className="font-medium">{client.formsCompleted ?? 0}</span>
              </TableCell>
              <TableCell>
                <span className="font-medium">{client.linksActive ?? 0}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {client.lastActivity || 'Aucune activité'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4 text-black" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Voir détails</DropdownMenuItem>
                      <DropdownMenuItem>Créer lien magique</DropdownMenuItem>
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Archiver
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

