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
    <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="glass shadow-lg rounded-xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1D3B4E]">Créer un Nouveau Client</h1>
            <p className="mt-2 text-[#1D3B4E]/70">
              Remplissez les informations du client pour commencer.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 border border-green-200">
                {success}
              </div>
            )}

            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-[#1D3B4E]">
                Nom complet *
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-[#00C3D9]/30 shadow-sm focus:ring-[#00C3D9] focus:border-[#00C3D9] sm:text-sm p-3 bg-white"
                placeholder="Ex: Jean Dupont"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1D3B4E]">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-[#00C3D9]/30 shadow-sm focus:ring-[#00C3D9] focus:border-[#00C3D9] sm:text-sm p-3 bg-white"
                placeholder="client@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#1D3B4E]">
                Téléphone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-[#00C3D9]/30 shadow-sm focus:ring-[#00C3D9] focus:border-[#00C3D9] sm:text-sm p-3 bg-white"
                placeholder="+33 6 XX XX XX XX"
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-[#1D3B4E]">
                Entreprise
              </label>
              <input
                id="company"
                name="company"
                type="text"
                value={formData.company}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-[#00C3D9]/30 shadow-sm focus:ring-[#00C3D9] focus:border-[#00C3D9] sm:text-sm p-3 bg-white"
                placeholder="Nom de l'entreprise"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center px-4 py-2 border border-[#00C3D9]/30 text-sm font-medium rounded-md text-[#1D3B4E] bg-white hover:bg-[#00C3D9]/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00C3D9] hover:bg-[#00C3D9]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Création...' : 'Créer le Client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
