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
    <div className="login-bg min-h-screen flex items-center justify-center px-8 sm:px-12 lg:px-16 py-16 sm:py-20">
      {/* Animated particles background */}
      <div className="login-particles">
        <div className="login-particle" style={{ width: '60px', height: '60px', top: '10%', left: '10%' }}></div>
        <div className="login-particle" style={{ width: '40px', height: '40px', top: '20%', right: '15%' }}></div>
        <div className="login-particle" style={{ width: '80px', height: '80px', bottom: '15%', left: '20%' }}></div>
        <div className="login-particle" style={{ width: '50px', height: '50px', bottom: '25%', right: '10%' }}></div>
        <div className="login-particle" style={{ width: '30px', height: '30px', top: '60%', left: '70%' }}></div>
        <div className="login-particle" style={{ width: '70px', height: '70px', top: '40%', right: '25%' }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10 animate-fade-in">
        {/* Logo and header */}
        <div className="text-center mb-12">
          <div className="login-logo mb-8">
            <span className="text-3xl font-bold text-white">S</span>
          </div>
          <h2 className="login-title text-4xl sm:text-5xl mb-4">
            Connexion
          </h2>
          <p className="login-subtitle text-lg">
            Accédez à votre tableau de bord professionnel
          </p>
        </div>

        <div className="login-form-container">
          <form className="space-y-8" onSubmit={handleLogin}>
            {error && (
              <div className="login-error">
                <div className="flex items-center gap-3">
                  <svg className="login-error-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="login-input-group">
                <label htmlFor="email" className="block text-sm font-semibold text-[#1D3B4E] mb-3">
                  Adresse email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="login-input"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={handleChange}
                />
                <svg className="login-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                <div className="login-help-text">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Utilisez l&apos;adresse associée à votre compte SimplyPay
                </div>
              </div>

              <div className="login-input-group">
                <label htmlFor="password" className="block text-sm font-semibold text-[#1D3B4E] mb-3">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={handleChange}
                />
                <svg className="login-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="login-help-text">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Saisissez votre mot de passe en respectant la casse
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="login-btn-primary"
              >
                {loading ? (
                  <>
                    <div className="login-spinner"></div>
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>Se connecter</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p className="login-footer-text">
            Plateforme sécurisée • SimplicomSimplypay
          </p>
        </div>
      </div>
    </div>
  )
}