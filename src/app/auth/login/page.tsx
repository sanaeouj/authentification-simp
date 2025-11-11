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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#00C3D9]/10 via-white to-[#FF8A00]/10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="glass rounded-2xl p-8 shadow-xl">
        <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-[#1D3B4E]">
            Connectez-vous à votre compte
          </h2>
            <p className="mt-2 text-center text-sm text-[#1D3B4E]/70">
              Accédez à votre tableau de bord
            </p>
        </div>
        
        <form className="mt-8 space-y-8" onSubmit={handleLogin}>
          {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
            <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[#1D3B4E]">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={cn(
                    "appearance-none rounded-lg relative block w-full px-4 py-3 border",
                    "border-[#00C3D9]/30 bg-white/60 placeholder-gray-400 text-[#1D3B4E]",
                    "focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-[#00C3D9]"
                )}
                placeholder="Adresse email"
                value={email}
                onChange={handleChange}
              />
              <p className="text-xs text-[#1D3B4E]/70">
                Utilisez l&apos;adresse associée à votre compte SimplyPay.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#1D3B4E]">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className={cn(
                    "appearance-none rounded-lg relative block w-full px-4 py-3 border",
                    "border-[#00C3D9]/30 bg-white/60 placeholder-gray-400 text-[#1D3B4E]",
                    "focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-[#00C3D9]"
                )}
                placeholder="Mot de passe"
                value={password}
                onChange={handleChange}
              />
              <p className="text-xs text-[#1D3B4E]/70">
                Saisissez votre mot de passe en respectant la casse.
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                  "group relative w-full flex justify-center py-3 px-4 border border-transparent",
                  "text-sm font-medium rounded-lg text-white bg-[#00C3D9]",
                  "hover:bg-[#00A8BA] focus:outline-none focus:ring-2",
                  "focus:ring-offset-2 focus:ring-[#00C3D9] shadow-lg",
                  "transition-all transform hover:scale-[1.02]",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}