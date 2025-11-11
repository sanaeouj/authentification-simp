"use client"

import React, { useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { useRouter } from 'next/navigation';

interface AgentLayoutProps {
  children: ReactNode
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<boolean>(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [displayEmail, setDisplayEmail] = useState<string | null>(null)

  /**
   * Déconnecte l'utilisateur et redirige vers /login
   */
  const handleLogout = async (): Promise<void> => {
    setLoading(true)
    try {
      const supabase: SupabaseClient<Database> = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error.message ?? error)
      }
      if (typeof window !== 'undefined') {
        window.location.href = 'http://localhost:3000/'
      } else {
        router.push('http://localhost:3000/')
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const supabase: SupabaseClient<Database> = createClient()

    const loadProfile = async (): Promise<void> => {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single()

      setDisplayName(profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? null)
      setDisplayEmail(profile?.email ?? user.email ?? null)
    }

    void loadProfile()
  }, [])

  return (
    <>
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-gray-900">Simplicom</span>
              {displayName && (
                <span className="text-sm text-gray-500">
                  Bonjour {displayName}
                  {displayEmail ? ` • ${displayEmail}` : ''}
                </span>
              )}
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Agent
            </span>
          </div>

          <nav className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                loading ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              aria-disabled={loading}
            >
              {loading ? 'Déconnexion...' : 'Se déconnecter'}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  )
}
