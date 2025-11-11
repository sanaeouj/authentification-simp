import { createClient } from '@/lib/supabase/server'
import { requireAuth, getAgentProfile } from '@/lib/utils/auth'
import Link from 'next/link'

export default async function SubmissionsPage() {
  const user = await requireAuth()
  const agent = await getAgentProfile()

  if (!agent) {
    throw new Error('Agent profile not found')
  }

  const supabase = await createClient()

  const [{ data: agentProfile }, { data: submissions }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', agent.id)
      .single(),
    supabase
      .from('form_submissions')
      .select(`
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
            company,
            email
          )
        )
      `)
      .eq('magic_links.agent_id', agent.id)
      .order('submitted_at', { ascending: false }),
  ])

  const agentDisplayName = agentProfile?.full_name ?? user.email ?? 'Agent'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1D3B4E]">Soumissions des Clients</h1>
              <p className="text-sm text-gray-500">Agent référent : {agentDisplayName}</p>
            </div>
            <Link
              href="/agent/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Retour au Dashboard
            </Link>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {submissions && submissions.length > 0 ? (
                submissions.map((submission) => (
                  <li key={submission.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-[#1D3B4E]">
                              {submission.magic_links?.clients?.full_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {submission.magic_links?.clients?.company} • {submission.magic_links?.clients?.email}
                            </p>
                          </div>
                          <div className="ml-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ 
                              submission.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : submission.status === 'processed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {submission.status === 'pending' ? 'En attente' :
                               submission.status === 'processed' ? 'Traité' : 'Rejeté'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <p>Soumis le {new Date(submission.submitted_at).toLocaleString('fr-FR')}</p>
                          {submission.magic_links?.used_at && (
                            <p>Lien utilisé le {new Date(submission.magic_links.used_at).toLocaleString('fr-FR')}</p>
                          )}
                        </div>
                        <div className="mt-2">
                          <details className="text-sm">
                            <summary className="cursor-pointer text-[#00C3D9] hover:text-[#00C3D9]/80">
                              Voir les détails de la soumission
                            </summary>
                            <div className="mt-2 p-4 bg-gray-50 rounded-md">
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                {JSON.stringify(submission.data, null, 2)}
                              </pre>
                            </div>
                          </details>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/api/forms/download?submissionId=${submission.id}`}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D3B4E] hover:bg-[#132838] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D3B4E]"
                        >
                          Télécharger
                        </a>
                        {submission.status === 'pending' && (
                          <>
                            <form action={async () => {
                              'use server'
                              const supabase = await createClient()
                              await supabase
                                .from('form_submissions')
                                .update({ status: 'processed' })
                                .eq('id', submission.id)
                            }}>
                              <button
                                type="submit"
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                              >
                                Marquer comme traité
                              </button>
                            </form>
                            <form action={async () => {
                              'use server'
                              const supabase = await createClient()
                              await supabase
                                .from('form_submissions')
                                .update({ status: 'failed' })
                                .eq('id', submission.id)
                            }}>
                              <button
                                type="submit"
                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Rejeter
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="px-6 py-4 text-center text-gray-500">
                  Aucune soumission trouvée.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
