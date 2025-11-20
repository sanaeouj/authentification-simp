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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* En-tête avec gradient */}
        <div className="bg-gradient-to-r from-[#00C3D9] to-[#00A8BA] rounded-t-2xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {disabled ? 'Création de lien désactivée' : 'Créer un Lien Magique'}
              </h2>
              <p className="text-white/90 text-sm">
                Remplissez les informations du client pour générer un lien de configuration
              </p>
            </div>
            <button
              onClick={() => onCancel(resolvedClientId)}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg"
              aria-label="Fermer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Section : Informations client obligatoires */}
            <section className="border border-gray-200 rounded-lg p-6 bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00C3D9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Informations Client
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-[#1D3B4E] mb-2">
                    Nom complet du client <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-[#1D3B4E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent transition-all"
                    placeholder="Ex: Jean Dupont"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#1D3B4E] mb-2">
                    Email du client <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-[#1D3B4E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent transition-all"
                    placeholder="client@example.com"
                  />
                </div>
              </div>
            </section>

            {/* Section : Informations complémentaires */}
            <section className="border border-gray-200 rounded-lg p-6 bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00C3D9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Informations Complémentaires
                <span className="text-xs font-normal text-gray-500 ml-2">(optionnel)</span>
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-[#1D3B4E] mb-2">
                    Téléphone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-[#1D3B4E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent transition-all"
                    placeholder="+33 6 XX XX XX XX"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-[#1D3B4E] mb-2">
                    Entreprise
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-[#1D3B4E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent transition-all"
                    placeholder="Nom de l'entreprise"
                  />
                </div>
              </div>
            </section>

            {/* Section : Informations VOIP */}
            <section className="border border-gray-200 rounded-lg p-6 bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00C3D9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Informations VOIP
                <span className="text-xs font-normal text-gray-500 ml-2">(optionnel)</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="voip_provider" className="block text-sm font-medium text-[#1D3B4E] mb-2">
                    Fournisseur VOIP
                  </label>
                  <input
                    id="voip_provider"
                    name="voip_provider"
                    type="text"
                    value={formData.voip_provider}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-[#1D3B4E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent transition-all"
                    placeholder="Ex: Twilio, OVH Telecom"
                  />
                </div>

                <div>
                  <label htmlFor="voip_number" className="block text-sm font-medium text-[#1D3B4E] mb-2">
                    Numéro VOIP / Prix
                  </label>
                  <input
                    id="voip_number"
                    name="voip_number"
                    type="text"
                    value={formData.voip_number}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-[#1D3B4E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent transition-all"
                    placeholder="Prix ou numéro VOIP"
                  />
                </div>

                <div>
                  <label htmlFor="voip_configuration" className="block text-sm font-medium text-[#1D3B4E] mb-2">
                    Configuration VOIP / Détails des Prix
                  </label>
                  <textarea
                    id="voip_configuration"
                    name="voip_configuration"
                    value={formData.voip_configuration}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-[#1D3B4E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent transition-all resize-none"
                    placeholder="Détails de configuration..."
                  />
                </div>

                <div>
                  <label htmlFor="additional_notes" className="block text-sm font-medium text-[#1D3B4E] mb-2">
                    Remarques supplémentaires
                  </label>
                  <textarea
                    id="additional_notes"
                    name="additional_notes"
                    value={formData.additional_notes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-[#1D3B4E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent transition-all resize-none"
                    placeholder="Remarques..."
                  />
                </div>
              </div>
            </section>

            {/* Section : Durée de validité */}
            <section className="border border-gray-200 rounded-lg p-6 bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00C3D9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Durée de Validité
              </h3>
              <div>
                <label htmlFor="expires_in_days" className="block text-sm font-medium text-[#1D3B4E] mb-2">
                  Durée de validité du lien (jours)
                </label>
                <select
                  id="expires_in_days"
                  name="expires_in_days"
                  value={formData.expires_in_days}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-[#1D3B4E] focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent transition-all bg-white"
                >
                  <option value={1}>1 jour</option>
                  <option value={3}>3 jours</option>
                  <option value={7}>7 jours</option>
                  <option value={14}>14 jours</option>
                  <option value={30}>30 jours</option>
                </select>
              </div>
            </section>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => onCancel(resolvedClientId)}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-[#1D3B4E] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={disabled || loading || loadingClient}
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-[#00C3D9] hover:bg-[#00A8BA] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#00C3D9]/20"
              >
                {loading || loadingClient ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Création en cours...
                  </>
                ) : disabled ? (
                  "Action réservée à l'administrateur"
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Créer le Lien Magique
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
