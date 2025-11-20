"use client"

import React, { useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
      <header className="glass shadow-lg border-b border-[#00C3D9]/20 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/agent/dashboard" className="flex items-center gap-3 group">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00C3D9] to-[#00A8BA] flex items-center justify-center text-white font-bold text-xl shadow-xl group-hover:scale-110 transition-transform duration-300">
                  S
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-[#1D3B4E] group-hover:text-gradient-primary transition-all">
                    Simplicom<span className="text-gradient-primary">Simplypay</span>
                  </span>
                  {displayName && (
                    <span className="text-xs text-[#1D3B4E]/70 flex items-center gap-1.5 font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {displayName}
                      {displayEmail && <span className="text-[#1D3B4E]/50">• {displayEmail}</span>}
                    </span>
                  )}
                </div>
              </Link>
              <span className="badge badge-info text-xs px-3 py-1.5">Agent</span>
            </div>

            <nav className="flex items-center gap-2">
              <Link
                href="/agent/dashboard"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold rounded-xl text-[#1D3B4E] hover:bg-[#00C3D9]/10 hover:text-[#00C3D9] transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Dashboard
              </Link>
              <Link
                href="/agent/clients"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold rounded-xl text-[#1D3B4E] hover:bg-[#00C3D9]/10 hover:text-[#00C3D9] transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Clients
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className={`inline-flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg shadow-red-500/20 ${
                  loading ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                aria-disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Déconnexion...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Déconnexion</span>
                  </>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main>
        {children}
      </main>
    </>
  )
}
