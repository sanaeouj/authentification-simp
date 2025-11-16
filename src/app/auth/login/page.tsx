'use client'

import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types/database.types'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const emailParam = searchParams.get('email')
    const passwordParam = searchParams.get('password')

    if (emailParam) setEmail(emailParam)
    if (passwordParam) setPassword(passwordParam)
  }, [searchParams])

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // Tentative de connexion
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw new Error(authError.message)

      // Récupération du profil utilisateur pour le rôle
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (profileError) throw new Error('Erreur lors de la récupération du profil')

      // Redirection basée sur le rôle
      const role = profile?.role as UserRole
      if (role === 'support' || role === 'admin') {
        router.push('/admin/dashboard')
      } else if (role === 'agent') {
        router.push('/agent/dashboard')
      } else {
        router.push('/client/dashboard')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target
    if (name === 'email') setEmail(value)
    if (name === 'password') setPassword(value)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#00C3D9]/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#FF8A00]/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10 animate-fade-in">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">
            <span className="text-[#1D3B4E]">Simplicom</span>
            <span className="text-gradient-primary">Simplypay</span>
          </h1>
          <p className="text-[#1D3B4E]/60 text-sm">Plateforme de gestion professionnelle</p>
        </div>

        <div className="glass rounded-3xl p-8 sm:p-10 shadow-2xl glass-hover">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-[#1D3B4E] mb-2">
              Bienvenue
            </h2>
            <p className="text-center text-sm text-[#1D3B4E]/70">
              Connectez-vous pour accéder à votre espace
            </p>
          </div>
        
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-xl bg-red-50/90 border-2 border-red-200 p-4 animate-slide-in">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-[#1D3B4E]">
                  Adresse email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-[#00C3D9]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={cn(
                      "input-modern pl-12",
                      "placeholder:text-gray-400 text-[#1D3B4E]"
                    )}
                    placeholder="votre@email.com"
                    value={email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-[#1D3B4E]">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-[#00C3D9]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className={cn(
                      "input-modern pl-12",
                      "placeholder:text-gray-400 text-[#1D3B4E]"
                    )}
                    placeholder="••••••••"
                    value={password}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "btn-primary w-full py-4 text-base font-semibold",
                  "flex items-center justify-center gap-2",
                  loading && "opacity-70 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#1D3B4E]/50">
          © 2024 SimplicomSimplypay. Tous droits réservés.
        </p>
      </div>
    </div>
  )
}