'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { MagnifyingGlassIcon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import Input from '@/components/ui/Input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Filter {
  id: string
  label: string
  active: boolean
}

interface DashboardHeaderProps {
  searchValue: string
  onSearchChange: (value: string) => void
  activeFilters?: Filter[]
  onFilterToggle?: (filterId: string) => void
  onCreateClient: () => void
  notificationCount?: number
  userDisplayName?: string
  userEmail?: string
}

export default function DashboardHeader({
  searchValue,
  onSearchChange,
  activeFilters = [],
  onFilterToggle,
  onCreateClient,
  notificationCount = 0,
  userDisplayName,
  userEmail,
}: DashboardHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)

  const statusFilters = [
    { id: 'active', label: 'Actifs' },
    { id: 'inactive', label: 'Inactifs' },
    { id: 'archived', label: 'Archivés' },
  ]

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] h-16 flex items-center px-6">
      <div className="w-full flex items-center justify-between gap-4">
        {/* Recherche */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Filtres */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2">
            {statusFilters.map((filter) => {
              const isActive = activeFilters.some((f) => f.id === filter.id && f.active)
              return (
                <button
                  key={filter.id}
                  onClick={() => onFilterToggle?.(filter.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-[#F5F7FA] text-gray-700 hover:bg-[#E5E7EB]'
                  }`}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-[#F5F7FA] transition-colors duration-200">
            <BellIcon className="w-5 h-5 text-gray-600" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          {/* Bouton Nouveau Client */}
          <Button onClick={onCreateClient} size="md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau Client
          </Button>

          {/* Menu Utilisateur */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F5F7FA] transition-colors duration-200"
            >
              <UserCircleIcon className="w-6 h-6 text-gray-600" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#E5E7EB] py-2 z-50">
                {userDisplayName && (
                  <div className="px-4 py-2 border-b border-[#E5E7EB]">
                    <p className="text-sm font-semibold text-[#111827]">{userDisplayName}</p>
                    {userEmail && (
                      <p className="text-xs text-gray-600">{userEmail}</p>
                    )}
                  </div>
                )}
                <Link
                  href="/agent/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-[#F5F7FA] transition-colors duration-200"
                >
                  Profil
                </Link>
                <Link
                  href="/auth/logout"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-[#F5F7FA] transition-colors duration-200"
                >
                  Déconnexion
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

