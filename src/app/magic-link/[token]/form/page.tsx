import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function ConfigurationFormPage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  // Vérifier l'authentification de l'utilisateur (compte utilisateur réel)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect(`/magic-link/${token}`)
  }

  // Vérifier le lien magique
  const { data: magicLink, error } = await supabase
    .from('magic_links')
    .select(`
      *,
      clients (
        id,
        email,
        full_name,
        company
      ),
      agents (
        id,
        phone
      )
    `)
    .eq('token', token)
    .single()

  if (error || !magicLink) {
    redirect(`/magic-link/${token}`)
  }

  // Vérifier le statut
  if (magicLink.status !== 'pending' && magicLink.status !== 'issued') {
    redirect(`/magic-link/${token}`)
  }

  async function handleSubmit(formData: FormData) {
    'use server'

    const voip_provider = formData.get('voip_provider') as string
    const voip_number = formData.get('voip_number') as string
    const price_config = formData.get('price_config') as string
    const notes = formData.get('notes') as string

    const supabase = await createClient()

    // Créer la soumission du formulaire
    const { error: submitError } = await supabase
      .from('form_submissions')
      .insert({
        magic_link_id: magicLink!.id,
        data: {
          voip_provider,
          voip_number,
          price_config,
          notes,
        },
        status: 'pending',
      })

    if (submitError) {
      console.error('Erreur lors de la soumission:', submitError)
      redirect(`/magic-link/${token}/form?error=submit_failed`)
    }

    // Marquer le lien comme utilisé
    await supabase
      .from('magic_links')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
      })
      .eq('id', magicLink!.id)

    redirect(`/magic-link/${token}/success`)
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-[#00C3D9] to-[#FF8A00] rounded-xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#1D3B4E] mb-2">
            Formulaire de Configuration VOIP
          </h1>
          <p className="text-[#1D3B4E]/70">
            Remplissez les informations demandées par votre agent
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-8">
          <form action={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="voip_provider" className="block text-sm font-medium text-[#1D3B4E] mb-2">
                Fournisseur VOIP
              </label>
              <input
                type="text"
                id="voip_provider"
                name="voip_provider"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent"
                placeholder="Ex: Twilio, OVH Telecom"
              />
            </div>

            <div>
              <label htmlFor="voip_number" className="block text-sm font-medium text-[#1D3B4E] mb-2">
                Numéro VOIP / Prix
              </label>
              <input
                type="text"
                id="voip_number"
                name="voip_number"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent"
                placeholder="Prix ou numéro VOIP"
              />
            </div>

            <div>
              <label htmlFor="price_config" className="block text-sm font-medium text-[#1D3B4E] mb-2">
                Configuration VOIP / Détails des Prix
              </label>
              <textarea
                id="price_config"
                name="price_config"
                required
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent"
                placeholder="Détails de configuration ou structure de prix (SIP, tarifs, etc.)"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-[#1D3B4E] mb-2">
                Remarques supplémentaires
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent"
                placeholder="Informations complémentaires sur les prix ou la configuration"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#00C3D9] to-[#FF8A00] text-white font-semibold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9]"
            >
              Soumettre le Formulaire
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-[#1D3B4E]/60">
            <p>Une fois soumis, ce formulaire ne pourra plus être modifié.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
