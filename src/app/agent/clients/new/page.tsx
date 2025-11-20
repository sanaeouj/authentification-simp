'use client'

import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'

interface FormData {
  full_name: string
  email: string
  phone: string
  company: string
}

export default function NewClientPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    email: '',
    phone: '',
    company: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/clients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const json = await response.json()

      if (!response.ok || json.error) {
        setError(json.error || `Erreur serveur: ${response.status}`)
        return
      }

      setSuccess('Client créé avec succès!')
      // Rediriger vers la page du client après 2 secondes
      setTimeout(() => {
        router.push(`/agent/clients/${json.client.id}`)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-6 sm:px-8 lg:px-12">
      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00C3D9] to-[#00A8BA] flex items-center justify-center text-white font-bold text-2xl shadow-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-[#1D3B4E]">Créer un Nouveau Client</h1>
              <p className="mt-2 text-base text-[#1D3B4E]/70">
                Remplissez les informations du client pour commencer
              </p>
            </div>
          </div>
        </div>

        <div className="card-glass shadow-2xl">

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="rounded-xl bg-red-50/90 border-2 border-red-200/50 p-4 animate-slide-in shadow-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-semibold text-red-700">{error}</p>
                </div>
              </div>
            )}
            {success && (
              <div className="rounded-xl bg-green-50/90 border-2 border-green-200/50 p-4 animate-slide-in shadow-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-semibold text-green-700">{success}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="full_name" className="block text-sm font-semibold text-[#1D3B4E] mb-2">
                  Nom complet *
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  className="input-modern w-full"
                  placeholder="Ex: Jean Dupont"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[#1D3B4E] mb-2">
                  Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input-modern w-full"
                  placeholder="client@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-[#1D3B4E] mb-2">
                  Téléphone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-modern w-full"
                  placeholder="+33 6 XX XX XX XX"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-semibold text-[#1D3B4E] mb-2">
                  Entreprise
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleChange}
                  className="input-modern w-full"
                  placeholder="Nom de l'entreprise"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-8 border-t border-[#00C3D9]/10 mt-8">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-black"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    <span className="text-black">Création...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-black">Créer le Client</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
