'use client'

import React, { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'

interface PricingFormProps {
  clientId: string
  onSuccess: (magicLink: { url: string; token: string; clientId: string }) => void
  onCancel: (clientId?: string) => void
  disabled?: boolean
}

interface FormData {
  full_name: string
  email: string
  phone: string
  company: string
  voip_provider: string
  voip_number: string
  voip_configuration: string
  additional_notes: string
  expires_in_days: number
}

const defaultFormData: FormData = {
  full_name: '',
  email: '',
  phone: '',
  company: '',
  voip_provider: '',
  voip_number: '',
  voip_configuration: '',
  additional_notes: '',
  expires_in_days: 7,
}

export default function PricingForm({ clientId, onSuccess, onCancel, disabled = false }: PricingFormProps) {
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [resolvedClientId, setResolvedClientId] = useState<string>(clientId)
  const [loading, setLoading] = useState(false)
  const [loadingClient, setLoadingClient] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadClient = async () => {
    if (!clientId || clientId === 'new' || disabled) {
        setResolvedClientId(clientId)
        return
      }

      setLoadingClient(true)
      try {
        const response = await fetch(`/api/clients/${clientId}`)
      if (response.ok) {
          const json = (await response.json()) as {
            client: {
              id: string
              full_name: string
              email: string
              phone: string | null
              company: string | null
            }
          }

          if (isMounted && json.client) {
            setResolvedClientId(json.client.id)
            setFormData(prev => ({
              ...prev,
              full_name: json.client.full_name ?? '',
              email: json.client.email ?? '',
              phone: json.client.phone ?? '',
              company: json.client.company ?? '',
            }))
          }
        }
      } catch (err) {
        console.error('Failed to load client', err)
      } finally {
        if (isMounted) {
          setLoadingClient(false)
        }
      }
    }

    loadClient()

    return () => {
      isMounted = false
    }
  }, [clientId])

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]:
        name === 'expires_in_days'
          ? parseInt(value, 10) || defaultFormData.expires_in_days
          : value,
    }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (disabled) return
    setLoading(true)
    setError('')

    const sanitizedClientId =
      resolvedClientId && resolvedClientId !== 'new' ? resolvedClientId : undefined

    try {
      const response = await fetch('/api/magic-links/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: sanitizedClientId,
          client: {
            ...(sanitizedClientId ? { id: sanitizedClientId } : {}),
            full_name: formData.full_name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            company: formData.company.trim(),
          },
          expires_in_days: formData.expires_in_days,
          voip_provider: formData.voip_provider,
          voip_number: formData.voip_number,
          price_config: formData.voip_configuration,
          notes: formData.additional_notes,
        }),
      })

      const json = await response.json()

      if (!response.ok || json.error) {
        setError(json.error || `Erreur serveur: ${response.status}`)
        return
      }

      const finalClientId: string =
        json.client_id ?? sanitizedClientId ?? resolvedClientId ?? clientId

      setResolvedClientId(finalClientId)

      onSuccess({
        url: json.url,
        token: json.magic_link.token,
        clientId: finalClientId,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#1D3B4E]">
              {disabled ? 'Création de lien désactivée' : 'Créer un Lien Magique'}
            </h2>
            <button
              onClick={() => onCancel(resolvedClientId)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Nom complet du client
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3"
                  placeholder="Nom complet"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email du client
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3"
                  placeholder="client@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Téléphone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3"
                  placeholder="+33 6 XX XX XX XX"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                  Entreprise
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3"
                  placeholder="Nom de l'entreprise"
                />
              </div>
            </div>

            <div>
              <label htmlFor="voip_provider" className="block text-sm font-medium text-gray-700">
                Fournisseur VOIP
              </label>
              <input
                id="voip_provider"
                name="voip_provider"
                type="text"
                required
                value={formData.voip_provider}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3"
                placeholder="Ex: Twilio, OVH Telecom"
              />
            </div>

            <div>
              <label htmlFor="voip_number" className="block text-sm font-medium text-gray-700">
                Numéro VOIP / Prix
              </label>
              <input
                id="voip_number"
                name="voip_number"
                type="text"
                required
                value={formData.voip_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3"
                placeholder="Prix ou numéro VOIP"
              />
            </div>

            <div>
              <label htmlFor="voip_configuration" className="block text-sm font-medium text-gray-700">
                Configuration VOIP / Détails des Prix
              </label>
              <textarea
                id="voip_configuration"
                name="voip_configuration"
                required
                value={formData.voip_configuration}
                onChange={handleChange}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3"
                placeholder="Détails de configuration ou structure de prix (SIP, tarifs, etc.)"
              />
            </div>

            <div>
              <label htmlFor="additional_notes" className="block text-sm font-medium text-gray-700">
                Remarques supplémentaires
              </label>
              <textarea
                id="additional_notes"
                name="additional_notes"
                value={formData.additional_notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3"
                placeholder="Informations complémentaires sur les prix ou la configuration"
              />
            </div>

            <div>
              <label htmlFor="expires_in_days" className="block text-sm font-medium text-gray-700">
                Durée de validité du lien (jours)
              </label>
              <select
                id="expires_in_days"
                name="expires_in_days"
                value={formData.expires_in_days}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3"
              >
                <option value={1}>1 jour</option>
                <option value={3}>3 jours</option>
                <option value={7}>7 jours</option>
                <option value={14}>14 jours</option>
                <option value={30}>30 jours</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => onCancel(resolvedClientId)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={disabled || loading || loadingClient}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {disabled ? 'Action réservée à l’administrateur' : loading ? 'Création...' : 'Créer le Lien Magique'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
