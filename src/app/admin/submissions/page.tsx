import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { FormSubmission, MagicLink, Client } from '@/lib/types/database.types'
import Link from 'next/link'

type SubmissionWithDetails = FormSubmission & {
  magic_links: MagicLink & {
    clients: Client
  }
}

export default async function AdminSubmissionsPage(): Promise<React.JSX.Element> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile, error: roleError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (roleError || !profile || (profile.role !== 'admin' && profile.role !== 'support')) {
    redirect('/unauthorized')
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from('form_submissions')
    .select(
      `
      *,
      magic_links (
        id,
        token,
        status,
        created_at,
        used_at,
        clients (
          id,
          full_name,
          email,
          company
        )
      )
    `
    )
    .order('submitted_at', { ascending: false })

  if (submissionsError) {
    console.error('Error fetching submissions:', submissionsError)
  }

  const submissionsWithDetails = (submissions ?? []) as SubmissionWithDetails[]

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto py-8 px-6 sm:px-8 lg:px-12">
        {/* Page Header */}
        <div className="mb-10 animate-fade-in">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1D3B4E] mb-2">
                Soumissions de <span className="text-gradient-primary">Formulaires</span>
              </h1>
              <p className="text-base text-[#1D3B4E]/70">Gestion des fichiers PDF et MP3</p>
            </div>
            <Link
              href="/admin/dashboard"
              className="btn-secondary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour au tableau de bord
            </Link>
          </div>
        </div>
        {submissionsWithDetails.length === 0 ? (
          <div className="card-glass text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#00C3D9]/10 mb-6">
              <svg className="w-10 h-10 text-[#00C3D9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#1D3B4E] mb-2">Aucune soumission</h3>
            <p className="text-base text-[#1D3B4E]/70">
              Aucune soumission de formulaire pour le moment.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissionsWithDetails.map((submission, index) => {
              const client = submission.magic_links?.clients
              const formData = submission.data as {
                portability_authorization_letter?: string
                portability_last_invoice?: string
                french_recording_url?: string
                english_recording_url?: string
                [key: string]: any
              }

              const hasFiles =
                formData.portability_authorization_letter ||
                formData.portability_last_invoice ||
                formData.french_recording_url ||
                formData.english_recording_url

              return (
                <div 
                  key={submission.id} 
                  className="card-glass glass-hover animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#1D3B4E]">
                          {client?.full_name ?? 'Client inconnu'}
                        </h3>
                        <p className="text-sm text-[#1D3B4E]/70">{client?.email ?? 'Email inconnu'}</p>
                        {client?.company && (
                          <p className="text-sm text-[#1D3B4E]/60">Société : {client.company}</p>
                        )}
                        <p className="text-xs text-[#1D3B4E]/50 mt-1">
                          Soumis le {new Date(submission.submitted_at).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={submission.status} />
                        <Link
                          href={`/api/forms/download?submissionId=${submission.id}`}
                          target="_blank"
                          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Télécharger PDF
                        </Link>
                      </div>
                    </div>

                    {hasFiles && (
                      <div className="mt-6 pt-6 border-t border-[#00C3D9]/20">
                        <h4 className="text-sm font-semibold text-[#1D3B4E] mb-4">Fichiers téléversés</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Documents PDF */}
                          <div className="space-y-3">
                            <h5 className="text-xs font-medium text-[#1D3B4E]/70 uppercase tracking-wide">
                              Documents PDF
                            </h5>
                            {formData.portability_authorization_letter && (
                              <FileDownloadCard
                                title="Lettre d'autorisation signée"
                                url={formData.portability_authorization_letter}
                                type="pdf"
                              />
                            )}
                            {formData.portability_last_invoice && (
                              <FileDownloadCard
                                title="Dernière facture opérateur"
                                url={formData.portability_last_invoice}
                                type="pdf"
                              />
                            )}
                            {!formData.portability_authorization_letter && !formData.portability_last_invoice && (
                              <p className="text-xs text-[#1D3B4E]/50">Aucun document PDF</p>
                            )}
                          </div>

                          {/* Fichiers audio MP3 */}
                          <div className="space-y-3">
                            <h5 className="text-xs font-medium text-[#1D3B4E]/70 uppercase tracking-wide">
                              Enregistrements audio (MP3)
                            </h5>
                            {formData.french_recording_url && (
                              <FileDownloadCard
                                title="Enregistrement français"
                                url={formData.french_recording_url}
                                type="mp3"
                              />
                            )}
                            {formData.english_recording_url && (
                              <FileDownloadCard
                                title="Enregistrement anglais"
                                url={formData.english_recording_url}
                                type="mp3"
                              />
                            )}
                            {!formData.french_recording_url && !formData.english_recording_url && (
                              <p className="text-xs text-[#1D3B4E]/50">Aucun enregistrement audio</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {!hasFiles && (
                      <div className="mt-4 pt-4 border-t border-[#00C3D9]/20">
                        <p className="text-xs text-[#1D3B4E]/50">Aucun fichier téléversé pour cette soumission</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: FormSubmission['status'] }) {
  const labels: Record<FormSubmission['status'], string> = {
    pending: 'En attente',
    processed: 'Traité',
    failed: 'Échoué',
  }

  const colors: Record<FormSubmission['status'], string> = {
    pending: 'bg-amber-100 text-amber-800',
    processed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  )
}

function FileDownloadCard({ title, url, type }: { title: string; url: string; type: 'pdf' | 'mp3' }) {
  const getIcon = () => {
    if (type === 'pdf') {
      return (
        <svg
          className="h-5 w-5 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      )
    } else {
      return (
        <svg
          className="h-5 w-5 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      )
    }
  }

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-[#00C3D9] transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1D3B4E] truncate">{title}</p>
          <p className="text-xs text-[#1D3B4E]/50 truncate">{url.split('/').pop()?.split('?')[0] ?? url}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
          title="Ouvrir dans un nouvel onglet"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Ouvrir
        </a>
        <a
          href={url}
          download
          className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
          title="Télécharger le fichier"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Télécharger
        </a>
      </div>
    </div>
  )
}

