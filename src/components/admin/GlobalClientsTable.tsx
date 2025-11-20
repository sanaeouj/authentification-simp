'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Input from '@/components/ui/Input'
import { Eye, MoreVertical, Search, Download, ChevronUp, ChevronDown, ChevronsUpDown, Archive, Edit, CheckCircle, XCircle, Ban, CheckSquare } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import AdminMagicLinkActions from '@/components/AdminMagicLinkActions'
import { ClientsFilters as ClientsFiltersComponent, type ClientsFilters } from '@/components/admin/ClientsFilters'
import type { Client, MagicLink } from '@/lib/types/database.types'

type ClientWithMeta = Client & {
  agent_name?: string
  agent_email?: string
  agent_id?: string
  magic_links: MagicLink[]
  latest_submission_id?: string | null
  latest_submission_at?: string | null
  latest_submission_data?: any
  formsCompleted?: number
  lastActivity?: string
  todosCount?: number
  todosPendingCount?: number
}

interface GlobalClientsTableProps {
  clients: ClientWithMeta[]
  agents?: Array<{ id: string; name: string }>
}

type SortField = 'name' | 'agent' | 'status' | 'forms' | 'activity' | 'date'
type SortDirection = 'asc' | 'desc'

export function GlobalClientsTable({ clients, agents = [] }: GlobalClientsTableProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<ClientsFilters>({})
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [archivingClient, setArchivingClient] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Éviter les erreurs d'hydratation avec Radix UI
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Extraire les agents uniques depuis les clients
  const availableAgents = useMemo(() => {
    const agentMap = new Map<string, string>()
    clients.forEach(client => {
      if (client.agent_id && client.agent_name) {
        agentMap.set(client.agent_id, client.agent_name)
      }
    })
    if (agents.length > 0) {
      agents.forEach(agent => {
        agentMap.set(agent.id, agent.name)
      })
    }
    return Array.from(agentMap.entries()).map(([id, name]) => ({ id, name }))
  }, [clients, agents])

  const getStatusBadge = (status: Client['status']) => {
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

  // Filtrage et recherche
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Filtre par agent (depuis ClientsFilters)
      if (filters.agentId && client.agent_id !== filters.agentId) {
        return false
      }

      // Filtre par statut (depuis ClientsFilters)
      if (filters.status && client.status !== filters.status) {
        return false
      }

      // Filtre par date d'ajout (depuis ClientsFilters)
      if (filters.dateFrom || filters.dateTo) {
        const clientDate = new Date(client.created_at)
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom)
          fromDate.setHours(0, 0, 0, 0)
          if (clientDate < fromDate) {
            return false
          }
        }
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo)
          toDate.setHours(23, 59, 59, 999)
          if (clientDate > toDate) {
            return false
          }
        }
      }

      // Recherche par nom, email ou entreprise
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const name = client.full_name?.toLowerCase() || ''
        const email = client.email?.toLowerCase() || ''
        const company = client.company?.toLowerCase() || ''
        if (!name.includes(query) && !email.includes(query) && !company.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [clients, searchQuery, filters])

  // Tri
  const sortedClients = useMemo(() => {
    const sorted = [...filteredClients].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = (a.full_name || '').localeCompare(b.full_name || '', 'fr')
          break
        case 'agent':
          const agentA = a.agent_name || ''
          const agentB = b.agent_name || ''
          comparison = agentA.localeCompare(agentB, 'fr')
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'forms':
          comparison = (a.formsCompleted || 0) - (b.formsCompleted || 0)
          break
        case 'activity':
          const dateA = a.latest_submission_at ? new Date(a.latest_submission_at).getTime() : 0
          const dateB = b.latest_submission_at ? new Date(b.latest_submission_at).getTime() : 0
          comparison = dateA - dateB
          break
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [filteredClients, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedClients.length / itemsPerPage)
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return sortedClients.slice(start, end)
  }, [sortedClients, currentPage, itemsPerPage])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    )
  }

  const handleStatusChange = async (clientId: string, newStatus: Client['status']) => {
    setUpdatingStatus(clientId)
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        router.refresh()
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.error || 'Impossible de mettre à jour le statut'}`)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Erreur lors de la mise à jour du statut')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleArchive = async (clientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir archiver ce client ?')) {
      return
    }

    setArchivingClient(clientId)
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        alert('Client archivé avec succès')
        router.refresh()
      } else {
        alert(`Erreur: ${data.error || 'Impossible d\'archiver le client'}`)
      }
    } catch (error) {
      console.error('Error archiving client:', error)
      alert('Erreur lors de l\'archivage du client')
    } finally {
      setArchivingClient(null)
    }
  }

  const handleExport = () => {
    window.open('/api/admin/clients/export', '_blank')
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun client enregistré</p>
      </div>
    )
  }

  // Éviter le rendu côté serveur pour éviter les erreurs d'hydratation
  if (!isMounted) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barre de recherche et filtres */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:max-w-md">
            <Input
              type="text"
              placeholder="Rechercher par nom, email ou entreprise..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="flex gap-2 items-center">
            {/* Bouton export */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exporter CSV
            </Button>
          </div>
        </div>
        
        {/* Composant de filtres existant */}
        <ClientsFiltersComponent
          agents={availableAgents}
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Résultats */}
      <div className="text-sm text-muted-foreground">
        {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}
        {searchQuery && ` pour "${searchQuery}"`}
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <Table variant="default" size="md">
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center hover:text-primary transition-colors"
                >
                  Client
                  {getSortIcon('name')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('agent')}
                  className="flex items-center hover:text-primary transition-colors"
                >
                  Agent
                  {getSortIcon('agent')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center hover:text-primary transition-colors"
                >
                  Statut
                  {getSortIcon('status')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('forms')}
                  className="flex items-center hover:text-primary transition-colors"
                >
                  Formulaires
                  {getSortIcon('forms')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('activity')}
                  className="flex items-center hover:text-primary transition-colors"
                >
                  Dernière activité
                  {getSortIcon('activity')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center hover:text-primary transition-colors"
                >
                  Date d&apos;ajout
                  {getSortIcon('date')}
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <p className="text-muted-foreground">Aucun client trouvé</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedClients.map((client) => (
                <TableRow 
                  key={client.id} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={(e) => {
                    // Ne pas naviguer si on clique sur un bouton ou un lien
                    const target = e.target as HTMLElement
                    if (target.closest('button') || target.closest('a') || target.closest('[role="menuitem"]')) {
                      return
                    }
                    router.push(`/admin/clients/${client.id}`)
                  }}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-black">{client.full_name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{client.email}</p>
                      {client.company && (
                        <p className="text-xs text-muted-foreground mt-1">{client.company}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium text-black">{client.agent_name ?? 'Agent non assigné'}</p>
                    {client.agent_email && (
                      <p className="text-xs text-muted-foreground mt-1">{client.agent_email}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          disabled={updatingStatus === client.id}
                          className="cursor-pointer disabled:opacity-50"
                        >
                          {getStatusBadge(client.status)}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(client.id, 'active')}
                          disabled={client.status === 'active' || updatingStatus === client.id}
                          className="flex items-center"
                        >
                          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                          Actif
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(client.id, 'inactive')}
                          disabled={client.status === 'inactive' || updatingStatus === client.id}
                          className="flex items-center"
                        >
                          <XCircle className="h-4 w-4 mr-2 text-yellow-600" />
                          Inactif
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(client.id, 'archived')}
                          disabled={client.status === 'archived' || updatingStatus === client.id}
                          className="flex items-center"
                        >
                          <Ban className="h-4 w-4 mr-2 text-gray-600" />
                          Archivé
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-black">{client.formsCompleted ?? 0}</span>
                      {client.todosPendingCount !== undefined && client.todosPendingCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800" title={`${client.todosPendingCount} tâche(s) en attente`}>
                          <CheckSquare className="h-3 w-3" />
                          {client.todosPendingCount}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-black/70">
                      {client.lastActivity ?? 'Aucune activité'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-black/70">
                      {new Date(client.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl text-[#1D3B4E] hover:bg-[#00C3D9]/10 hover:text-[#00C3D9] transition-all duration-200"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-[#00C3D9] to-[#00A8BA] text-white shadow-lg shadow-[#00C3D9]/30 hover:shadow-xl hover:shadow-[#00C3D9]/40 transition-all duration-200">
                            <MoreVertical className="h-4 w-4" />
                            Actions
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/clients/${client.id}`} className="flex items-center w-full">
                              <Eye className="h-4 w-4 mr-2 text-[#00C3D9]" />
                              Voir détails
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/clients/${client.id}/edit`} className="flex items-center w-full">
                              <Edit className="h-4 w-4 mr-2 text-[#00C3D9]" />
                              Modifier
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <div className="p-2">
                            <AdminMagicLinkActions client={client} />
                          </div>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 flex items-center hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleArchive(client.id)}
                            disabled={archivingClient === client.id || client.status === 'archived'}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            {archivingClient === client.id ? 'Archivage...' : 'Archiver'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Éléments par page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-3 py-1 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00C3D9]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
