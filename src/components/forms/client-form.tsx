'use client'

import React, { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Agent, Client, MagicLink } from '@/lib/types/database.types'

interface ClientFormProps {
  link: MagicLink & { clients: Client & { agents: Agent } }
  disabled?: boolean
}

type PhoneNumberChoice = 'keep' | 'new' | ''
type IpPhoneChoice = 'keep' | 'buy' | 'virtual' | ''
type MenuChoice = 'fr' | 'en' | 'both' | 'none' | ''
type RecordingChoice = 'ai' | 'studio' | 'self' | ''
type YesNoChoice = 'yes' | 'no' | ''
type RecordingUploadStatus = 'idle' | 'loading' | 'success' | 'error'
type RecordingField = 'french' | 'english'
type DocumentUploadStatus = 'idle' | 'loading' | 'success' | 'error'
type PortabilityDocumentField = 'authorization_letter' | 'last_invoice' | 'eightxx_document'

interface PostConfiguration {
  label: string
  virtualMobile: boolean
  voicemailToMail: boolean
  device_brand: string
  device_mac: string
  device_ip: string
}

interface FormData {
  posts_count: number
  billing_company_name: string
  billing_contact_name: string
  billing_contact_phone: string
  billing_contact_email: string
  billing_address: string
  phone_numbers_choice: PhoneNumberChoice
  phone_numbers_to_keep: string
  emergency_service_address: string
  outgoing_display_name: string
  ip_phone_choice: IpPhoneChoice
  post_configurations: PostConfiguration[]
  collaborators_identification: string
  collaborators_contacts: string
  include_company_menu: MenuChoice
  french_menu_script: string
  english_menu_script: string
  professional_recording: RecordingChoice
  additional_notes: string
  notify_admin: YesNoChoice
  admin_notification_email: string
  portability_choice: YesNoChoice
  portability_contact_name: string
  portability_contact_email: string
  portability_account_reference: string
  portability_numbers: string[]
  portability_requested_date: string
  portability_lines_count: string
  portability_authorization_letter: string
  portability_last_invoice: string
  portability_eightxx_document: string
  french_recording_url: string
  english_recording_url: string
}

const createInitialFormData = (): FormData => ({
  posts_count: 1,
  billing_company_name: '',
  billing_contact_name: '',
  billing_contact_phone: '',
  billing_contact_email: '',
  billing_address: '',
  phone_numbers_choice: '',
  phone_numbers_to_keep: '',
  emergency_service_address: '',
  outgoing_display_name: '',
  ip_phone_choice: '',
  post_configurations: Array.from({ length: 1 }, (_, index) => ({
    label: `Poste ${index + 1}`,
    virtualMobile: false,
    voicemailToMail: false,
    device_brand: '',
    device_mac: '',
    device_ip: '',
  })),
  collaborators_identification: '',
  collaborators_contacts: '',
  include_company_menu: '',
  french_menu_script: '',
  english_menu_script: '',
  professional_recording: '',
  additional_notes: '',
  notify_admin: '',
  admin_notification_email: '',
  portability_choice: '',
  portability_contact_name: '',
  portability_contact_email: '',
  portability_account_reference: '',
  portability_numbers: [],
  portability_requested_date: '',
  portability_lines_count: '',
  portability_authorization_letter: '',
  portability_last_invoice: '',
  portability_eightxx_document: '',
  french_recording_url: '',
  english_recording_url: '',
})

export default function ClientForm({ link, disabled = false }: ClientFormProps) {
  const [formData, setFormData] = useState<FormData>(() => createInitialFormData())
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [isReadOnly, setIsReadOnly] = useState<boolean>(disabled)
  const [dataRestored, setDataRestored] = useState<boolean>(false)
  const [lastSaveTime, setLastSaveTime] = useState<string>('')
  const [recordingUploadStatus, setRecordingUploadStatus] = useState<Record<RecordingField, RecordingUploadStatus>>({
    french: 'idle',
    english: 'idle',
  })
  const [recordingUploadError, setRecordingUploadError] = useState<Record<RecordingField, string>>({
    french: '',
    english: '',
  })
  const [portabilityUploadStatus, setPortabilityUploadStatus] = useState<
    Record<PortabilityDocumentField, DocumentUploadStatus>
  >({
    authorization_letter: 'idle',
    last_invoice: 'idle',
    eightxx_document: 'idle',
  })
  const [portabilityUploadError, setPortabilityUploadError] = useState<
    Record<PortabilityDocumentField, string>
  >({
    authorization_letter: '',
    last_invoice: '',
    eightxx_document: '',
  })
  const draftStorageKey = `client-form-draft-${link.token}`

  useEffect(() => {
    setIsReadOnly(disabled)
  }, [disabled])

  // Charger les données sauvegardées au montage du composant
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isReadOnly) {
      window.localStorage.removeItem(draftStorageKey)
      return
    }

    try {
      const saved = window.localStorage.getItem(draftStorageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FormData>
        setFormData(prev => {
          // Fusionner intelligemment les données sauvegardées avec les valeurs par défaut
          const merged = { ...prev, ...parsed }
          // S'assurer que post_configurations est un tableau valide
          if (parsed.post_configurations && Array.isArray(parsed.post_configurations)) {
            merged.post_configurations = parsed.post_configurations
          }
          // Convertir portability_numbers de string (ancien format) vers array si nécessaire
          if (parsed.portability_numbers !== undefined) {
            const linesCount = parseInt(parsed.portability_lines_count || merged.portability_lines_count || '0', 10) || 0
            if (typeof parsed.portability_numbers === 'string') {
              // Ancien format : convertir le string en tableau
              if (linesCount > 0) {
                // Diviser par lignes si c'était un textarea
                const portabilityNumbersStr = parsed.portability_numbers as string
                const numbers = portabilityNumbersStr.split('\n').filter((n: string) => n.trim())
                // S'assurer qu'on a le bon nombre d'éléments
                while (numbers.length < linesCount) {
                  numbers.push('')
                }
                merged.portability_numbers = numbers.slice(0, linesCount)
              } else {
                merged.portability_numbers = []
              }
            } else if (Array.isArray(parsed.portability_numbers)) {
              // Nouveau format : s'assurer que le tableau a le bon nombre d'éléments
              if (linesCount > 0) {
                const numbers = [...parsed.portability_numbers]
                while (numbers.length < linesCount) {
                  numbers.push('')
                }
                merged.portability_numbers = numbers.slice(0, linesCount)
              } else {
                merged.portability_numbers = []
              }
            }
          } else if (parsed.portability_lines_count) {
            // Si portability_lines_count est défini mais pas portability_numbers, initialiser le tableau
            const linesCount = parseInt(parsed.portability_lines_count, 10) || 0
            merged.portability_numbers = Array(linesCount).fill('')
          }
          return merged
        })
        setDataRestored(true)
        // Masquer le message après 5 secondes
        setTimeout(() => setDataRestored(false), 5000)
      }
    } catch (storageError) {
      console.error('Impossible de charger le brouillon du formulaire', storageError)
    }
  }, [draftStorageKey, isReadOnly])

  // Sauvegarder automatiquement avec debounce pour éviter trop de sauvegardes
  useEffect(() => {
    if (typeof window === 'undefined' || isReadOnly) return
    
    const timeoutId = setTimeout(() => {
      try {
        window.localStorage.setItem(draftStorageKey, JSON.stringify(formData))
        // Mettre à jour l'heure de dernière sauvegarde
        const now = new Date()
        const timeString = now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
        setLastSaveTime(timeString)
      } catch (storageError) {
        console.error('Impossible de sauvegarder le brouillon du formulaire', storageError)
      }
    }, 500) // Debounce de 500ms

    return () => clearTimeout(timeoutId)
  }, [formData, draftStorageKey, isReadOnly])

  // Sauvegarder aussi avant de quitter la page
  useEffect(() => {
    if (typeof window === 'undefined' || isReadOnly) return

    const handleBeforeUnload = () => {
      try {
        window.localStorage.setItem(draftStorageKey, JSON.stringify(formData))
      } catch (storageError) {
        console.error('Impossible de sauvegarder le brouillon avant de quitter', storageError)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [formData, draftStorageKey, isReadOnly])

  const inputDisabledClass = isReadOnly ? 'bg-gray-100 text-gray-500' : ''
  const controlDisabledClass = isReadOnly ? 'cursor-not-allowed opacity-70' : ''

  const handleFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = event.target
    if (isReadOnly) return

    if (name === 'phone_numbers_choice') {
      setFormData(prev => ({
        ...prev,
        phone_numbers_choice: value as PhoneNumberChoice,
        phone_numbers_to_keep: value === 'keep' ? prev.phone_numbers_to_keep : '',
      }))
      return
    }

    if (name === 'notify_admin') {
      setFormData(prev => ({
        ...prev,
        notify_admin: value as YesNoChoice,
        admin_notification_email: value === 'yes' ? prev.admin_notification_email : '',
      }))
      return
    }

    if (name === 'ip_phone_choice') {
      setFormData(prev => ({
        ...prev,
        ip_phone_choice: value as IpPhoneChoice,
        post_configurations:
          value === 'keep'
            ? prev.post_configurations
            : prev.post_configurations.map(configuration => ({
                ...configuration,
                device_brand: '',
                device_mac: '',
                device_ip: '',
              })),
      }))
      return
    }

    if (name === 'include_company_menu') {
      const menuChoice = value as MenuChoice
      setFormData(prev => ({
        ...prev,
        include_company_menu: menuChoice,
        french_menu_script:
          menuChoice === 'fr' || menuChoice === 'both' ? prev.french_menu_script : '',
        english_menu_script:
          menuChoice === 'en' || menuChoice === 'both' ? prev.english_menu_script : '',
        professional_recording: menuChoice === 'none' ? '' : prev.professional_recording,
        french_recording_url:
          menuChoice === 'none' || menuChoice === 'en' ? '' : prev.french_recording_url,
        english_recording_url:
          menuChoice === 'none' || menuChoice === 'fr' ? '' : prev.english_recording_url,
      }))

      setRecordingUploadStatus(prev => ({
        french: menuChoice === 'none' || menuChoice === 'en' ? 'idle' : prev.french,
        english: menuChoice === 'none' || menuChoice === 'fr' ? 'idle' : prev.english,
      }))
      setRecordingUploadError(prev => ({
        french: menuChoice === 'none' || menuChoice === 'en' ? '' : prev.french,
        english: menuChoice === 'none' || menuChoice === 'fr' ? '' : prev.english,
      }))
      return
    }

    if (name === 'professional_recording') {
      setFormData(prev => ({
        ...prev,
        professional_recording: value as RecordingChoice,
        french_recording_url: '',
        english_recording_url: '',
      }))
      return
    }

    if (name === 'portability_choice') {
      setFormData(prev => ({
        ...prev,
        portability_choice: value as YesNoChoice,
        portability_contact_name: value === 'yes' ? prev.portability_contact_name : '',
        portability_contact_email: value === 'yes' ? prev.portability_contact_email : '',
        portability_account_reference: value === 'yes' ? prev.portability_account_reference : '',
        portability_numbers: value === 'yes' ? prev.portability_numbers : [],
        portability_requested_date: value === 'yes' ? prev.portability_requested_date : '',
        portability_lines_count: value === 'yes' ? prev.portability_lines_count : '',
        portability_authorization_letter: value === 'yes' ? prev.portability_authorization_letter : '',
        portability_last_invoice: value === 'yes' ? prev.portability_last_invoice : '',
        portability_eightxx_document: value === 'yes' ? prev.portability_eightxx_document : '',
      }))
      return
    }

    if (name === 'portability_lines_count') {
      const linesCount = parseInt(value, 10) || 0
      setFormData(prev => {
        const currentNumbers = Array.isArray(prev.portability_numbers) ? prev.portability_numbers : []
        let newNumbers: string[]
        
        if (linesCount > currentNumbers.length) {
          // Ajouter des champs vides si on augmente le nombre
          newNumbers = [...currentNumbers, ...Array(linesCount - currentNumbers.length).fill('')]
        } else if (linesCount < currentNumbers.length) {
          // Retirer des champs si on diminue le nombre
          newNumbers = currentNumbers.slice(0, linesCount)
        } else {
          // Garder les mêmes champs
          newNumbers = currentNumbers
        }
        
        return {
          ...prev,
          portability_lines_count: value,
          portability_numbers: newNumbers,
        }
      })
      return
    }

    setFormData(prev => ({ ...prev, [name]: value } as FormData))
  }

  const handlePostFieldChange = (index: number, field: keyof PostConfiguration, value: string): void => {
    if (isReadOnly) return
    setFormData(prev => {
      const updated = prev.post_configurations.map((post, idx) =>
        idx === index ? { ...post, [field]: value } : post
      )
      return { ...prev, post_configurations: updated }
    })
  }

  const handlePortabilityNumberChange = (index: number, value: string): void => {
    if (isReadOnly) return
    setFormData(prev => {
      const updatedNumbers = [...prev.portability_numbers]
      updatedNumbers[index] = value
      return { ...prev, portability_numbers: updatedNumbers }
    })
  }

  const handleRecordingFileChange = async (field: RecordingField, files: FileList | null): Promise<void> => {
    if (isReadOnly) return

    if (!files || files.length === 0) {
      setFormData(prev => ({
        ...prev,
        french_recording_url: field === 'french' ? '' : prev.french_recording_url,
        english_recording_url: field === 'english' ? '' : prev.english_recording_url,
      }))
      setRecordingUploadStatus(prev => ({ ...prev, [field]: 'idle' }))
      setRecordingUploadError(prev => ({ ...prev, [field]: '' }))
      return
    }

    const file = files[0]
    const isMp3 =
      file.type === 'audio/mpeg' ||
      file.type === 'audio/mp3' ||
      (file.name && file.name.toLowerCase().endsWith('.mp3'))

    if (!isMp3) {
      setRecordingUploadStatus(prev => ({ ...prev, [field]: 'error' }))
      setRecordingUploadError(prev => ({ ...prev, [field]: 'Veuillez sélectionner un fichier MP3.' }))
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setRecordingUploadStatus(prev => ({ ...prev, [field]: 'error' }))
      setRecordingUploadError(prev => ({ ...prev, [field]: 'Le fichier dépasse 15 Mo.' }))
      return
    }

    setRecordingUploadStatus(prev => ({ ...prev, [field]: 'loading' }))
    setRecordingUploadError(prev => ({ ...prev, [field]: '' }))

    try {
      const payload = new FormData()
      payload.append('file', file)
      payload.append('category', `menu-recordings/${field}`)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: payload,
      })
      const json = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !json.url) {
        throw new Error(json.error ?? 'Échec du téléversement.')
      }

      const recordingUrl = json.url ?? ''
      setFormData(prev => ({
        ...prev,
        french_recording_url: field === 'french' ? recordingUrl : prev.french_recording_url,
        english_recording_url: field === 'english' ? recordingUrl : prev.english_recording_url,
      }))
      setRecordingUploadStatus(prev => ({ ...prev, [field]: 'success' }))
    } catch (err) {
      setRecordingUploadStatus(prev => ({ ...prev, [field]: 'error' }))
      setRecordingUploadError(prev => ({
        ...prev,
        [field]: err instanceof Error ? err.message : 'Erreur lors du téléversement.',
      }))
    }
  }

  const handlePortabilityDocumentUpload = async (
    field: PortabilityDocumentField,
    files: FileList | null
  ): Promise<void> => {
    if (isReadOnly) return

    const fieldMap: Record<PortabilityDocumentField, keyof FormData> = {
      authorization_letter: 'portability_authorization_letter',
      last_invoice: 'portability_last_invoice',
      eightxx_document: 'portability_eightxx_document',
    }

    if (!files || files.length === 0) {
      setFormData(prev => ({
        ...prev,
        [fieldMap[field]]: '',
      }))
      setPortabilityUploadStatus(prev => ({ ...prev, [field]: 'idle' }))
      setPortabilityUploadError(prev => ({ ...prev, [field]: '' }))
      return
    }

    const file = files[0]
    const isPdf =
      file.type === 'application/pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf'))

    if (!isPdf) {
      setPortabilityUploadStatus(prev => ({ ...prev, [field]: 'error' }))
      setPortabilityUploadError(prev => ({ ...prev, [field]: 'Veuillez sélectionner un fichier PDF.' }))
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setPortabilityUploadStatus(prev => ({ ...prev, [field]: 'error' }))
      setPortabilityUploadError(prev => ({ ...prev, [field]: 'Le fichier dépasse 10 Mo.' }))
      return
    }

    setPortabilityUploadStatus(prev => ({ ...prev, [field]: 'loading' }))
    setPortabilityUploadError(prev => ({ ...prev, [field]: '' }))

    try {
      const payload = new FormData()
      payload.append('file', file)
      payload.append('category', `portability-documents/${field}`)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: payload,
      })
      const json = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !json.url) {
        throw new Error(json.error ?? 'Échec du téléversement.')
      }

      setFormData(prev => ({
        ...prev,
        [fieldMap[field]]: json.url,
      }))
      setPortabilityUploadStatus(prev => ({ ...prev, [field]: 'success' }))
    } catch (err) {
      setPortabilityUploadStatus(prev => ({ ...prev, [field]: 'error' }))
      setPortabilityUploadError(prev => ({
        ...prev,
        [field]: err instanceof Error ? err.message : 'Erreur lors du téléversement.',
      }))
    }
  }

  const handlePostOptionToggle = (
    index: number,
    option: 'virtualMobile' | 'voicemailToMail',
    checked: boolean
  ): void => {
    if (isReadOnly) return
    setFormData((prev) => {
      const updated = prev.post_configurations.map((post, idx) =>
        idx === index ? { ...post, [option]: checked } : post
      )
      return { ...prev, post_configurations: updated }
    })
  }

  const handlePostsCountChange = (count: number): void => {
    if (isReadOnly) return
    if (!Number.isFinite(count) || count < 1) return
    setFormData((prev) => {
      const current = prev.post_configurations
      let nextConfigurations: PostConfiguration[]
      if (count > current.length) {
        const additions = Array.from({ length: count - current.length }, (_, idx) => ({
          label: `Poste ${current.length + idx + 1}`,
          virtualMobile: false,
          voicemailToMail: false,
          device_brand: '',
          device_mac: '',
          device_ip: '',
        }))
        nextConfigurations = [...current, ...additions]
      } else {
        nextConfigurations = current.slice(0, count)
      }

      return {
        ...prev,
        posts_count: count,
        post_configurations: nextConfigurations,
      }
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (isReadOnly) return
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (recordingUploadStatus.french === 'loading' || recordingUploadStatus.english === 'loading') {
        setError('Veuillez attendre la fin du téléversement des fichiers audio.')
        setLoading(false)
        return
      }

      if (
        portabilityUploadStatus.authorization_letter === 'loading' ||
        portabilityUploadStatus.last_invoice === 'loading' ||
        portabilityUploadStatus.eightxx_document === 'loading'
      ) {
        setError('Veuillez attendre la fin du téléversement des documents PDF.')
        setLoading(false)
        return
      }

      // Vérifier que les documents de portabilité sont téléversés si la portabilité est sélectionnée
      if (needsPortabilityDetails) {
        if (!formData.portability_authorization_letter) {
          setError('Veuillez téléverser la lettre d\'autorisation signée (PDF).')
          setLoading(false)
          return
        }
        if (!formData.portability_last_invoice) {
          setError('Veuillez téléverser la dernière facture opérateur (PDF).')
          setLoading(false)
          return
        }
        // Vérifier le document 8xx si nécessaire
        if (hasEightxxNumber && !formData.portability_eightxx_document) {
          setError('Veuillez téléverser le document Resp Org form (PDF) pour les numéros 8xx.')
          setLoading(false)
          return
        }
      }

      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: link.token,
          form_data: formData,
        }),
      })

      const json: { success?: boolean; error?: string } = await response.json()

      if (!response.ok || json.error || json.success === false) {
        const message = json.error ?? `Server responded with ${response.status}`
        setError(message)
        return
      }

      setSuccess('Formulaire soumis avec succès. Merci !')
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(draftStorageKey)
      }
      setIsReadOnly(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur réseau est survenue')
    } finally {
      setLoading(false)
    }
  }

  const notifyAdminSelected = formData.notify_admin === 'yes'
  const needsPortabilityDetails = formData.portability_choice === 'yes'
  const showIpDeviceDetails = formData.ip_phone_choice === 'keep'
  const showPhoneNumbersToKeep = formData.phone_numbers_choice === 'keep'
  
  // Vérifier si au moins un numéro commence par 811, 822, 833, 844, 855, 866, 877, 888, ou 899
  const hasEightxxNumber = formData.portability_numbers.some(num => {
    if (!num || typeof num !== 'string') return false
    const cleaned = num.replace(/\D/g, '') // Enlever tous les caractères non numériques
    if (cleaned.length < 3) return false
    const prefix = cleaned.substring(0, 3)
    const validPrefixes = ['811', '822', '833', '844', '855', '866', '877', '888', '899']
    return validPrefixes.includes(prefix)
  })
  
  const showFrenchMenuScript =
    formData.include_company_menu === 'fr' || formData.include_company_menu === 'both'
  const showEnglishMenuScript =
    formData.include_company_menu === 'en' || formData.include_company_menu === 'both'
  const showRecordingSection = formData.include_company_menu !== 'none'
  const showFrenchRecordingUpload =
    showRecordingSection && formData.professional_recording === 'self' && showFrenchMenuScript
  const showEnglishRecordingUpload =
    showRecordingSection && formData.professional_recording === 'self' && showEnglishMenuScript

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700 text-center">
            {success}
          </div>
        )}

        {isReadOnly && (
          <div className="rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800 text-center">
            Ce formulaire a déjà été soumis. Les champs sont affichés en lecture seule.
          </div>
        )}

        {!isReadOnly && (
          <div className="rounded-lg border border-[#00C3D9]/30 bg-[#E0F7FA] p-4 flex items-start gap-3">
            <svg className="w-6 h-6 text-[#00C3D9] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-[#1D3B4E] mb-1">Sauvegarde automatique activée</h3>
              <p className="text-sm text-[#1D3B4E]/80 mb-2">
                Vos données sont sauvegardées automatiquement. Vous pouvez fermer cette page et revenir plus tard, vos informations seront conservées.
              </p>
              {lastSaveTime && (
                <p className="text-xs text-[#1D3B4E]/70">
                  Dernière sauvegarde: {lastSaveTime}
                </p>
              )}
            </div>
          </div>
        )}

        {dataRestored && !isReadOnly && (
          <div className="rounded-lg border-2 border-green-300 bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2 animate-fade-in">
            <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>Données restaurées :</strong> Vos informations précédemment saisies ont été restaurées automatiquement.
            </span>
          </div>
        )}

        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Informations de facturation
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Veuillez fournir les informations nécessaires à votre facturation.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="billing_company_name"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Nom de la compagnie *
              </label>
              <input
                id="billing_company_name"
                name="billing_company_name"
                type="text"
                required
                value={formData.billing_company_name}
                onChange={handleFieldChange}
                className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                placeholder="Entrez le nom de la compagnie"
                disabled={isReadOnly}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="billing_contact_name"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Nom et prénom de la personne ressource *
              </label>
              <input
                id="billing_contact_name"
                name="billing_contact_name"
                type="text"
                required
                value={formData.billing_contact_name}
                onChange={handleFieldChange}
                className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                placeholder="Entrez le nom complet"
                disabled={isReadOnly}
              />
            </div>

            <div>
              <label
                htmlFor="billing_contact_phone"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Numéro de téléphone de la personne ressource *
              </label>
              <input
                id="billing_contact_phone"
                name="billing_contact_phone"
                type="tel"
                required
                inputMode="tel"
                pattern="^[0-9()+\\s.-]{6,}$"
                value={formData.billing_contact_phone}
                onChange={handleFieldChange}
                className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                placeholder="(123) 456-7890"
                disabled={isReadOnly}
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                La valeur doit être un numéro de téléphone valide.
              </p>
            </div>

            <div>
              <label
                htmlFor="billing_contact_email"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Adresse courriel *
              </label>
              <input
                id="billing_contact_email"
                name="billing_contact_email"
                type="email"
                required
                value={formData.billing_contact_email}
                onChange={handleFieldChange}
                className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                placeholder="exemple@email.com"
                disabled={isReadOnly}
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Cette adresse recevra les communications importantes (factures, relances, accès portail...).
              </p>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="billing_address"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Adresse de facturation *
              </label>
              <textarea
                id="billing_address"
                name="billing_address"
                required
                rows={3}
                value={formData.billing_address}
                onChange={handleFieldChange}
                className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors resize-none ${inputDisabledClass}`}
                placeholder="Entrez l'adresse complète"
                disabled={isReadOnly}
              />
            </div>
          </div>
        </section>

        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Numéros de téléphone
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Indiquez votre préférence pour les numéros à conserver ou à activer.
          </p>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Voulez-vous activer de nouveaux numéros ou conserver vos numéros actuels ?*
              </p>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="phone_numbers_choice"
                    value="keep"
                    checked={formData.phone_numbers_choice === 'keep'}
                    onChange={handleFieldChange}
                    required
                    className={`h-5 w-5 border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 ${controlDisabledClass}`}
                    disabled={isReadOnly}
                  />
                  <span className="text-sm font-medium text-gray-700">Conserver mes numéros actuels</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="phone_numbers_choice"
                    value="new"
                    checked={formData.phone_numbers_choice === 'new'}
                    onChange={handleFieldChange}
                    required
                    className={`h-5 w-5 border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 ${controlDisabledClass}`}
                    disabled={isReadOnly}
                  />
                  <span className="text-sm font-medium text-gray-700">Activer de nouveaux numéros</span>
                </label>
              </div>
            </div>

            {showPhoneNumbersToKeep && (
              <div>
                <label
                  htmlFor="phone_numbers_to_keep"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Veuillez indiquer tous les numéros de téléphone à conserver et transférer *
                </label>
                <textarea
                  id="phone_numbers_to_keep"
                  name="phone_numbers_to_keep"
                  required={formData.phone_numbers_choice === 'keep'}
                  rows={4}
                  value={formData.phone_numbers_to_keep}
                  onChange={handleFieldChange}
                  className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors resize-none ${inputDisabledClass}`}
                  placeholder="Entrez les numéros séparés par des virgules ou sur des lignes différentes"
                  disabled={isReadOnly}
                />
              </div>
            )}
          </div>
        </section>

        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Portabilité des numéros
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Indiquez si vous souhaitez transférer vos numéros actuels vers Simplicom. Des informations complémentaires seront nécessaires pour lancer la demande.
          </p>

          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Souhaitez-vous effectuer une portabilité de vos numéros ?*
            </p>
            <div className="mt-4 space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="radio"
                  name="portability_choice"
                  value="yes"
                  checked={formData.portability_choice === 'yes'}
                  onChange={handleFieldChange}
                  required
                  className={`h-5 w-5 border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 ${controlDisabledClass}`}
                  disabled={isReadOnly}
                />
                <span className="text-sm font-medium text-gray-700">
                  Oui, je souhaite transférer mes numéros existants
                </span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="radio"
                  name="portability_choice"
                  value="no"
                  checked={formData.portability_choice === 'no'}
                  onChange={handleFieldChange}
                  required
                  className={`h-5 w-5 border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 ${controlDisabledClass}`}
                  disabled={isReadOnly}
                />
                <span className="text-sm font-medium text-gray-700">
                  Non, je n&apos;ai pas besoin de portabilité
                </span>
              </label>
            </div>
          </div>

          {needsPortabilityDetails && (
            <div className="mt-4 space-y-4 rounded-lg border border-gray-200 p-4 bg-gray-50">
              <p className="text-sm text-gray-600">
                Merci de fournir les informations suivantes pour initier la portabilité. Notre équipe reviendra vers vous pour confirmer la demande.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="portability_contact_name"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Nom et prénom du contact responsable *
                  </label>
                  <input
                    id="portability_contact_name"
                    name="portability_contact_name"
                    type="text"
                    required
                    value={formData.portability_contact_name}
                    onChange={handleFieldChange}
                    className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label
                    htmlFor="portability_contact_email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Adresse courriel du contact portabilité *
                  </label>
                  <input
                    id="portability_contact_email"
                    name="portability_contact_email"
                    type="email"
                    required
                    value={formData.portability_contact_email}
                    onChange={handleFieldChange}
                    className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="portability_account_reference"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Référence client / ID de compte actuel
                  </label>
                  <input
                    id="portability_account_reference"
                    name="portability_account_reference"
                    type="text"
                    value={formData.portability_account_reference}
                    onChange={handleFieldChange}
                    className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label
                    htmlFor="portability_requested_date"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Date souhaitée pour la portabilité *
                  </label>
                  <input
                    id="portability_requested_date"
                    name="portability_requested_date"
                    type="date"
                    required
                    value={formData.portability_requested_date}
                    onChange={handleFieldChange}
                    className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label
                    htmlFor="portability_lines_count"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Nombre de lignes à porter *
                  </label>
                  <input
                    id="portability_lines_count"
                    name="portability_lines_count"
                    type="number"
                    min={1}
                    required
                    value={formData.portability_lines_count}
                    onChange={handleFieldChange}
                    className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="portability_numbers"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Numéros à porter (un par ligne) *
                </label>
                {formData.portability_lines_count && parseInt(formData.portability_lines_count, 10) > 0 ? (
                  <div className="space-y-3">
                    {Array.from({ length: parseInt(formData.portability_lines_count, 10) || 0 }, (_, index) => (
                      <div key={`portability-number-${index}`}>
                        <label
                          htmlFor={`portability_number_${index}`}
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Numéro {index + 1} *
                        </label>
                        <input
                          id={`portability_number_${index}`}
                          type="tel"
                          required
                          value={formData.portability_numbers[index] || ''}
                          onChange={(e) => handlePortabilityNumberChange(index, e.target.value)}
                          className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                          placeholder={`Entrez le numéro ${index + 1}`}
                          disabled={isReadOnly}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 text-center">
                    Veuillez d&apos;abord indiquer le nombre de lignes à porter ci-dessus.
                  </div>
                )}
              </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lettre d&apos;autorisation signée (PDF) *
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={event => {
                    void handlePortabilityDocumentUpload('authorization_letter', event.target.files)
                    if (event.target) event.target.value = ''
                  }}
                  className={`mt-1 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500 focus:outline-none ${inputDisabledClass}`}
                  disabled={
                    isReadOnly || portabilityUploadStatus.authorization_letter === 'loading'
                  }
                />
                {portabilityUploadStatus.authorization_letter === 'loading' && (
                  <p className="mt-1 text-xs text-gray-500">Téléversement en cours...</p>
                )}
                {portabilityUploadStatus.authorization_letter === 'error' && (
                  <p className="mt-1 text-xs text-red-600">
                    {portabilityUploadError.authorization_letter}
                  </p>
                )}
                {formData.portability_authorization_letter && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs text-gray-700 mb-2">
                      ✓ Document téléversé avec succès
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={formData.portability_authorization_letter}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 underline hover:text-indigo-800"
                      >
                        Ouvrir / Télécharger
                      </a>
                      {!isReadOnly && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.createElement('input')
                              input.type = 'file'
                              input.accept = 'application/pdf'
                              input.onchange = (e) => {
                                const target = e.target as HTMLInputElement
                                void handlePortabilityDocumentUpload('authorization_letter', target.files)
                              }
                              input.click()
                            }}
                            className="text-xs text-blue-600 underline hover:text-blue-800"
                          >
                            Remplacer
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                portability_authorization_letter: '',
                              }))
                              setPortabilityUploadStatus(prev => ({ ...prev, authorization_letter: 'idle' }))
                            }}
                            className="text-xs text-red-600 underline hover:text-red-800"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dernière facture opérateur (PDF) *
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={event => {
                    void handlePortabilityDocumentUpload('last_invoice', event.target.files)
                    if (event.target) event.target.value = ''
                  }}
                  className={`mt-1 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500 focus:outline-none ${inputDisabledClass}`}
                  disabled={isReadOnly || portabilityUploadStatus.last_invoice === 'loading'}
                />
                {portabilityUploadStatus.last_invoice === 'loading' && (
                  <p className="mt-1 text-xs text-gray-500">Téléversement en cours...</p>
                )}
                {portabilityUploadStatus.last_invoice === 'error' && (
                  <p className="mt-1 text-xs text-red-600">
                    {portabilityUploadError.last_invoice}
                  </p>
                )}
                {formData.portability_last_invoice && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs text-gray-700 mb-2">
                      ✓ Document téléversé avec succès
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={formData.portability_last_invoice}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 underline hover:text-indigo-800"
                      >
                        Ouvrir / Télécharger
                      </a>
                      {!isReadOnly && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.createElement('input')
                              input.type = 'file'
                              input.accept = 'application/pdf'
                              input.onchange = (e) => {
                                const target = e.target as HTMLInputElement
                                void handlePortabilityDocumentUpload('last_invoice', target.files)
                              }
                              input.click()
                            }}
                            className="text-xs text-blue-600 underline hover:text-blue-800"
                          >
                            Remplacer
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                portability_last_invoice: '',
                              }))
                              setPortabilityUploadStatus(prev => ({ ...prev, last_invoice: 'idle' }))
                            }}
                            className="text-xs text-red-600 underline hover:text-red-800"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {hasEightxxNumber && needsPortabilityDetails && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Resp Org form (PDF) {hasEightxxNumber ? '*' : ''}
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={event => {
                    void handlePortabilityDocumentUpload('eightxx_document', event.target.files)
                    if (event.target) event.target.value = ''
                  }}
                  className={`mt-1 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500 focus:outline-none ${inputDisabledClass}`}
                  disabled={
                    isReadOnly || portabilityUploadStatus.eightxx_document === 'loading'
                  }
                />
                {portabilityUploadStatus.eightxx_document === 'loading' && (
                  <p className="mt-1 text-xs text-gray-500">Téléversement en cours...</p>
                )}
                {portabilityUploadStatus.eightxx_document === 'error' && (
                  <p className="mt-1 text-xs text-red-600">
                    {portabilityUploadError.eightxx_document}
                  </p>
                )}
                {formData.portability_eightxx_document && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs text-gray-700 mb-2">
                      ✓ Document téléversé avec succès
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={formData.portability_eightxx_document}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 underline hover:text-indigo-800"
                      >
                        Ouvrir / Télécharger
                      </a>
                      {!isReadOnly && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.createElement('input')
                              input.type = 'file'
                              input.accept = 'application/pdf'
                              input.onchange = (e) => {
                                const target = e.target as HTMLInputElement
                                void handlePortabilityDocumentUpload('eightxx_document', target.files)
                              }
                              input.click()
                            }}
                            className="text-xs text-blue-600 underline hover:text-blue-800"
                          >
                            Remplacer
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                portability_eightxx_document: '',
                              }))
                              setPortabilityUploadStatus(prev => ({ ...prev, eightxx_document: 'idle' }))
                            }}
                            className="text-xs text-red-600 underline hover:text-red-800"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isReadOnly && needsPortabilityDetails && (
              <p className="text-xs text-gray-500">
                Les documents, s&apos;ils sont fournis, sont stockés et associés à votre soumission
                pour consultation par l&apos;administrateur.
              </p>
            )}
            </div>
          )}
        </section>

        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Adresses de service
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Informations nécessaires pour les services d'urgence et l'affichage des appels sortants.
          </p>

          <div className="space-y-6">
            <div>
              <label
                htmlFor="emergency_service_address"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Adresse complète à communiquer au service d&apos;urgences 911 *
              </label>
              <textarea
                id="emergency_service_address"
                name="emergency_service_address"
                required
                rows={3}
                value={formData.emergency_service_address}
                onChange={handleFieldChange}
                className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors resize-none ${inputDisabledClass}`}
                placeholder="Entrez l'adresse complète pour le service 911"
                disabled={isReadOnly}
              />
            </div>

            <div>
              <label
                htmlFor="outgoing_display_name"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Affichage sortant de vos postes (ex.: Compagnie ABC) *
              </label>
              <input
                id="outgoing_display_name"
                name="outgoing_display_name"
                type="text"
                required
                value={formData.outgoing_display_name}
                onChange={handleFieldChange}
                className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                placeholder="Ex: Compagnie ABC"
                disabled={isReadOnly}
              />
            </div>
          </div>
        </section>

        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Téléphones de bureau IP
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Indiquez votre stratégie pour les appareils téléphoniques.
          </p>

          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Allez-vous conserver vos téléphones IP ou acheter de nouveaux appareils ?*
            </p>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="ip_phone_choice"
                  value="keep"
                  checked={formData.ip_phone_choice === 'keep'}
                  onChange={handleFieldChange}
                  required
                  className={`h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                  disabled={isReadOnly}
                />
                <span className="text-sm text-gray-700">
                  Je veux conserver mes appareils téléphoniques IP
                </span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="ip_phone_choice"
                  value="buy"
                  checked={formData.ip_phone_choice === 'buy'}
                  onChange={handleFieldChange}
                  required
                  className={`h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                  disabled={isReadOnly}
                />
                <span className="text-sm text-gray-700">
                  Je vais acheter de nouveaux appareils (facture d&apos;ouverture payée)
                </span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="ip_phone_choice"
                  value="virtual"
                  checked={formData.ip_phone_choice === 'virtual'}
                  onChange={handleFieldChange}
                  required
                  className={`h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                  disabled={isReadOnly}
                />
                <span className="text-sm text-gray-700">
                  Je vais utiliser une solution 100% virtuelle
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Configuration des postes téléphoniques
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Sélectionnez les options à activer pour chaque poste. Vous pouvez renommer les postes si nécessaire.
          </p>

          <div>
            <label
              htmlFor="posts_count"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Nombre de postes à configurer *
            </label>
            <input
              id="posts_count"
              name="posts_count"
              type="number"
              min={1}
              max={50}
              required
              value={formData.posts_count}
              onChange={(event) => handlePostsCountChange(Number.parseInt(event.target.value, 10) || 1)}
              className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
              disabled={isReadOnly}
            />
            <p className="mt-1 text-xs text-gray-500">
              Ajustez ce nombre pour générer autant de blocs de configuration que nécessaire.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {formData.post_configurations.map((post, index) => (
              <div key={`post-${index}`} className="rounded-md border border-gray-200 p-4">
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nom du poste
                  </label>
                  <input
                    type="text"
                    value={post.label}
                    onChange={event => handlePostFieldChange(index, 'label', event.target.value)}
                    className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={post.virtualMobile}
                      onChange={(event) =>
                        handlePostOptionToggle(index, 'virtualMobile', event.target.checked)
                      }
                      className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                      disabled={isReadOnly}
                    />
                    <span className="text-sm text-gray-700">Téléphone virtuel sur cellulaire</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={post.voicemailToMail}
                      onChange={(event) =>
                        handlePostOptionToggle(index, 'voicemailToMail', event.target.checked)
                      }
                      className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                      disabled={isReadOnly}
                    />
                    <span className="text-sm text-gray-700">Boîte vocale vers courriel</span>
                  </label>
                  {showIpDeviceDetails && (
                    <div className="grid gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Marque / modèle du terminal
                        </label>
                        <input
                          type="text"
                          value={post.device_brand ?? ''}
                          onChange={event => handlePostFieldChange(index, 'device_brand', event.target.value)}
                          className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Adresse MAC
                        </label>
                        <input
                          type="text"
                          value={post.device_mac ?? ''}
                          onChange={event => handlePostFieldChange(index, 'device_mac', event.target.value)}
                          className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Adresse IP (si fixe)
                        </label>
                        <input
                          type="text"
                          value={post.device_ip ?? ''}
                          onChange={event => handlePostFieldChange(index, 'device_ip', event.target.value)}
                          className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Informations sur les collaborateurs
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Renseignez les informations sur les collaborateurs et leurs extensions.
          </p>

          <div className="space-y-6">
            <div>
              <label
                htmlFor="collaborators_identification"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Noms, prénoms et extensions (ex.: Poste 1: Laura Mercier - Ext 101) *
              </label>
              <textarea
                id="collaborators_identification"
                name="collaborators_identification"
                required
                rows={4}
                value={formData.collaborators_identification}
                onChange={handleFieldChange}
                className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                disabled={isReadOnly}
              />
            </div>

            <div>
              <label
                htmlFor="collaborators_contacts"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Courriels et numéros de téléphone par extension *
              </label>
              <textarea
                id="collaborators_contacts"
                name="collaborators_contacts"
                required
                rows={4}
                value={formData.collaborators_contacts}
                onChange={handleFieldChange}
                className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </section>

        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Menu d&apos;entreprise
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Configurez le menu d'entreprise pour vos appels entrants.
          </p>

          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Souhaitez-vous intégrer un menu d&apos;entreprise ?*
            </p>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="include_company_menu"
                  value="fr"
                  checked={formData.include_company_menu === 'fr'}
                  onChange={handleFieldChange}
                  required
                  className={`h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                  disabled={isReadOnly}
                />
                <span className="text-sm text-gray-700">
                  Oui, en français uniquement
                </span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="include_company_menu"
                  value="en"
                  checked={formData.include_company_menu === 'en'}
                  onChange={handleFieldChange}
                  required
                  className={`h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                  disabled={isReadOnly}
                />
                <span className="text-sm text-gray-700">
                  Oui, en anglais uniquement
                </span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="include_company_menu"
                  value="both"
                  checked={formData.include_company_menu === 'both'}
                  onChange={handleFieldChange}
                  required
                  className={`h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                  disabled={isReadOnly}
                />
                <span className="text-sm text-gray-700">
                  Oui, en français et en anglais
                </span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="include_company_menu"
                  value="none"
                  checked={formData.include_company_menu === 'none'}
                  onChange={handleFieldChange}
                  required
                  className={`h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                  disabled={isReadOnly}
                />
                <span className="text-sm text-gray-700">
                  Non, je ne souhaite pas intégrer de menu
                </span>
              </label>
            </div>
          </div>

          {(showFrenchMenuScript || showEnglishMenuScript) && (
            <div className="mt-4 space-y-4">
              {showFrenchMenuScript && (
                <div>
                  <label
                    htmlFor="french_menu_script"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Script du menu d&apos;entreprise en français
                    {showFrenchMenuScript ? ' *' : ''}
                  </label>
                  <textarea
                    id="french_menu_script"
                    name="french_menu_script"
                    rows={6}
                    required={showFrenchMenuScript}
                    value={formData.french_menu_script}
                    onChange={handleFieldChange}
                    className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                    disabled={isReadOnly}
                  />
                </div>
              )}

              {showEnglishMenuScript && (
                <div>
                  <label
                    htmlFor="english_menu_script"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Script du menu d&apos;entreprise en anglais
                    {showEnglishMenuScript ? ' *' : ''}
                  </label>
                  <textarea
                    id="english_menu_script"
                    name="english_menu_script"
                    rows={6}
                    required={showEnglishMenuScript}
                    value={formData.english_menu_script}
                    onChange={handleFieldChange}
                    className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                    disabled={isReadOnly}
                  />
                </div>
              )}
            </div>
          )}
        </section>

        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Enregistrement professionnel
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Sélectionnez l&apos;option désirée pour l&apos;enregistrement de votre menu d&apos;entreprise.
          </p>

          <div className="mb-6">
            <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="professional_recording"
                    value="ai"
                    checked={formData.professional_recording === 'ai'}
                    onChange={handleFieldChange}
                    required
                    className={`h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                    disabled={isReadOnly}
                  />
                  <span className="text-sm text-gray-700">
                    Oui, enregistrement voix IA (70$ / enregistrement / langue)
                  </span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="professional_recording"
                    value="studio"
                    checked={formData.professional_recording === 'studio'}
                    onChange={handleFieldChange}
                    required
                    className={`h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                    disabled={isReadOnly}
                  />
                  <span className="text-sm text-gray-700">
                    Oui, enregistrement en studio (149$ / enregistrement / langue)
                  </span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="professional_recording"
                    value="self"
                    checked={formData.professional_recording === 'self'}
                    onChange={handleFieldChange}
                    required
                    className={`h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                    disabled={isReadOnly}
                  />
                  <span className="text-sm text-gray-700">
                    Non, je vais effectuer moi-même les enregistrements
                  </span>
                </label>
              </div>
          </div>

            {formData.professional_recording === 'self' && (
              <div className="mt-6 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-600">
                  Téléversez vos fichiers MP3. Vous pouvez fournir uniquement la version française ou anglaise si nécessaire.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fichier MP3 – version française {showFrenchMenuScript ? '*' : '(optionnel)'}
                    </label>
                      <input
                        type="file"
                        accept="audio/mpeg,audio/mp3"
                        onChange={event => {
                          void handleRecordingFileChange('french', event.target.files)
                          if (event.target) event.target.value = ''
                        }}
                        className={`mt-1 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500 focus:outline-none ${inputDisabledClass}`}
                        disabled={isReadOnly || recordingUploadStatus.french === 'loading'}
                      />
                      {recordingUploadStatus.french === 'loading' && (
                        <p className="mt-1 text-xs text-gray-500">Téléversement en cours...</p>
                      )}
                      {recordingUploadStatus.french === 'error' && (
                        <p className="mt-1 text-xs text-red-600">{recordingUploadError.french}</p>
                      )}
                      {formData.french_recording_url && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-xs text-gray-700 mb-2">
                            ✓ Fichier MP3 français téléversé avec succès
                          </p>
                          <div className="flex items-center gap-2">
                            <a
                              href={formData.french_recording_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-600 underline hover:text-indigo-800"
                            >
                              Ouvrir / Télécharger
                            </a>
                            {!isReadOnly && (
                              <>
                                <span className="text-gray-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const input = document.createElement('input')
                                    input.type = 'file'
                                    input.accept = 'audio/mpeg,audio/mp3'
                                    input.onchange = (e) => {
                                      const target = e.target as HTMLInputElement
                                      void handleRecordingFileChange('french', target.files)
                                    }
                                    input.click()
                                  }}
                                  className="text-xs text-blue-600 underline hover:text-blue-800"
                                >
                                  Remplacer
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      french_recording_url: '',
                                    }))
                                    setRecordingUploadStatus(prev => ({ ...prev, french: 'idle' }))
                                  }}
                                  className="text-xs text-red-600 underline hover:text-red-800"
                                >
                                  Supprimer
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fichier MP3 – version anglaise {showEnglishMenuScript ? '*' : '(optionnel)'}
                    </label>
                    <input
                      type="file"
                      accept="audio/mpeg,audio/mp3"
                      onChange={event => {
                        void handleRecordingFileChange('english', event.target.files)
                        if (event.target) event.target.value = ''
                      }}
                      className={`mt-1 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500 focus:outline-none ${inputDisabledClass}`}
                      disabled={isReadOnly || recordingUploadStatus.english === 'loading'}
                    />
                    {recordingUploadStatus.english === 'loading' && (
                      <p className="mt-1 text-xs text-gray-500">Téléversement en cours...</p>
                    )}
                    {recordingUploadStatus.english === 'error' && (
                      <p className="mt-1 text-xs text-red-600">{recordingUploadError.english}</p>
                    )}
                    {formData.english_recording_url && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-xs text-gray-700 mb-2">
                          ✓ Fichier MP3 anglais téléversé avec succès
                        </p>
                        <div className="flex items-center gap-2">
                          <a
                            href={formData.english_recording_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-indigo-600 underline hover:text-indigo-800"
                          >
                            Ouvrir / Télécharger
                          </a>
                          {!isReadOnly && (
                            <>
                              <span className="text-gray-300">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.createElement('input')
                                  input.type = 'file'
                                  input.accept = 'audio/mpeg,audio/mp3'
                                  input.onchange = (e) => {
                                    const target = e.target as HTMLInputElement
                                    void handleRecordingFileChange('english', target.files)
                                  }
                                  input.click()
                                }}
                                className="text-xs text-blue-600 underline hover:text-blue-800"
                              >
                                Remplacer
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    english_recording_url: '',
                                  }))
                                  setRecordingUploadStatus(prev => ({ ...prev, english: 'idle' }))
                                }}
                                className="text-xs text-red-600 underline hover:text-red-800"
                              >
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Notification de l&apos;administrateur
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Vous pouvez demander à ce qu&apos;un administrateur reçoive une copie de votre soumission par courriel.
          </p>

          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Souhaitez-vous notifier un administrateur ?*
            </p>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="notify_admin"
                  value="yes"
                  checked={formData.notify_admin === 'yes'}
                  onChange={handleFieldChange}
                  required
                  className={`h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                  disabled={isReadOnly}
                />
                <span className="text-sm text-gray-700">
                  Oui, envoyer une copie à un administrateur
                </span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="notify_admin"
                  value="no"
                  checked={formData.notify_admin === 'no'}
                  onChange={handleFieldChange}
                  required
                  className={`h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 ${controlDisabledClass}`}
                  disabled={isReadOnly}
                />
                <span className="text-sm text-gray-700">
                  Non, aucune notification supplémentaire
                </span>
              </label>
            </div>
          </div>

          {notifyAdminSelected && (
            <div className="mt-4">
              <label
                htmlFor="admin_notification_email"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Adresse courriel à notifier *
              </label>
              <input
                id="admin_notification_email"
                name="admin_notification_email"
                type="email"
                required
                value={formData.admin_notification_email}
                onChange={handleFieldChange}
                className={`mt-1 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors ${inputDisabledClass}`}
                disabled={isReadOnly}
              />
              <p className="mt-1 text-xs text-gray-500">
                Cette adresse recevra une copie instantanée du formulaire, en plus des administrateurs Simplicom.
              </p>
            </div>
          )}
          </section>

        <section className="border border-gray-200 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Notes et informations complémentaires
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Ajoutez toute information supplémentaire que vous souhaitez communiquer.
          </p>

          <div>
            <label
              htmlFor="additional_notes"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Notes supplémentaires
            </label>
            <textarea
              id="additional_notes"
              name="additional_notes"
              rows={5}
              value={formData.additional_notes}
              onChange={handleFieldChange}
              className={`mt-2 block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors resize-none ${inputDisabledClass}`}
              placeholder="Entrez vos notes supplémentaires ici..."
              disabled={isReadOnly}
            />
          </div>
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center sm:text-left">
            Merci de vérifier vos informations avant l&apos;envoi.
          </p>
          <button
            type="submit"
            disabled={loading || isReadOnly}
            className={`inline-flex items-center justify-center rounded-lg border-2 border-transparent px-8 py-3 text-base font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
              loading || isReadOnly
                ? 'cursor-not-allowed bg-indigo-400 focus:ring-indigo-400'
                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl focus:ring-indigo-500 transform hover:scale-105'
            }`}
            aria-disabled={loading || isReadOnly}
          >
            {isReadOnly ? 'Formulaire déjà soumis' : loading ? 'Envoi en cours...' : 'Soumettre le formulaire'}
          </button>
        </div>
      </form>
    </div>
  )
}