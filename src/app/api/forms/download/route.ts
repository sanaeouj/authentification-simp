import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types/database.types'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export const runtime = 'nodejs'

const ALLOWED_ROLES: UserRole[] = ['admin', 'support', 'agent']

const sanitizeFilename = (input: string | null | undefined): string => {
  if (!input) return 'client'
  return (
    input
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'client'
  )
}

const formatPrimitive = (value: unknown): string => {
  if (value === null || value === undefined) return 'Non renseigné'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (typeof value === 'number') return Number.isFinite(value) ? value.toString() : 'Non renseigné'
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

const buildContentLines = (data: unknown, label?: string, depth = 0): string[] => {
  const indent = '  '.repeat(depth)
  const lines: string[] = []

  const pushLine = (text: string) => {
    lines.push(`${indent}${text}`)
  }

  if (Array.isArray(data)) {
    if (!data.length) {
      pushLine(`${label ?? 'Liste'} : Aucun élément`)
      return lines
    }

    data.forEach((item, index) => {
      const itemLabel = label ? `${label} #${index + 1}` : `Élément #${index + 1}`
      if (typeof item === 'object' && item !== null) {
        pushLine(`${itemLabel} :`)
        lines.push(...buildContentLines(item, undefined, depth + 1))
      } else {
        pushLine(`${itemLabel} : ${formatPrimitive(item)}`)
      }
    })
    return lines
  }

  if (typeof data === 'object' && data !== null) {
    const entries = Object.entries(data as Record<string, unknown>)
    if (!entries.length) {
      pushLine(`${label ?? 'Données'} : Aucune information`)
      return lines
    }

    if (label) {
      pushLine(`${label} :`)
    }
    entries.forEach(([key, value]) => {
      const nextLabel = key.replace(/_/g, ' ')
      lines.push(...buildContentLines(value, nextLabel, label ? depth + 1 : depth))
    })
    return lines
  }

  if (label) {
    pushLine(`${label} : ${formatPrimitive(data)}`)
  } else {
    pushLine(formatPrimitive(data))
  }
  return lines
}

const wrapLine = (text: string, maxWidth: number, font: any, size: number): string[] => {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  words.forEach(word => {
    const tentative = current ? `${current} ${word}` : word
    const width = font.widthOfTextAtSize(tentative, size)
    if (width <= maxWidth) {
      current = tentative
    } else {
      if (current) lines.push(current)
      current = word
    }
  })

  if (current) lines.push(current)
  return lines
}

const drawLines = (
  doc: PDFDocument,
  page: ReturnType<PDFDocument['addPage']>,
  lines: string[],
  font: any,
  fontSize: number,
  margin: number,
  verticalSpacing: number
): { page: ReturnType<PDFDocument['addPage']>; y: number } => {
  let currentPage = page
  let y = currentPage.getHeight() - margin
  const maxWidth = currentPage.getWidth() - margin * 2

  const ensureSpace = (lineCount = 1) => {
    if (y - verticalSpacing * lineCount < margin) {
      currentPage = doc.addPage()
      y = currentPage.getHeight() - margin
    }
  }

  lines.forEach(rawLine => {
    const wrapped = wrapLine(rawLine, maxWidth, font, fontSize)
    ensureSpace(wrapped.length)
    wrapped.forEach(segment => {
      currentPage.drawText(segment, {
        x: margin,
        y,
        size: fontSize,
        font,
      })
      y -= verticalSpacing
    })
  })

  return { page: currentPage, y }
}

const drawDivider = (
  doc: PDFDocument,
  page: ReturnType<PDFDocument['addPage']>,
  positionY: number,
  margin: number,
  color = rgb(0, 0.76, 0.85)
) => {
  const width = page.getWidth() - margin * 2
  page.drawRectangle({
    x: margin,
    y: positionY,
    width,
    height: 2,
    color,
    opacity: 0.3,
  })
}

const extractPhoneEntries = (raw: unknown): string[] => {
  if (!raw) return []
  const text = Array.isArray(raw)
    ? (raw as unknown[]).map(item => (item == null ? '' : String(item))).join('\n')
    : String(raw)

  return text
    .split(/[\r\n,;]+/)
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0)
    .slice(0, 10)
}

interface PortabilityLetterPayload {
  pdfDoc: PDFDocument
  boldFont: any
  regularFont: any
  clientInfo: {
    full_name?: string | null
    company?: string | null
  } | null
  formData: Record<string, unknown>
}

const appendPortabilityLetter = ({
  pdfDoc,
  boldFont,
  regularFont,
  clientInfo,
  formData,
}: PortabilityLetterPayload) => {
  const page = pdfDoc.addPage()
  const { width, height } = page.getSize()
  const margin = 48
  const lineHeight = 16
  const textColor = rgb(0.06, 0.15, 0.25)

  const drawCentered = (text: string, y: number, size: number, font = boldFont) => {
    const textWidth = font.widthOfTextAtSize(text, size)
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y,
      size,
      font,
      color: textColor,
    })
  }

  const drawLabelValue = (label: string, value: string, y: number) => {
    page.drawText(label, {
      x: margin,
      y,
      size: 11,
      font: boldFont,
      color: textColor,
    })
    page.drawRectangle({
      x: margin,
      y: y - lineHeight,
      width: width - margin * 2,
      height: lineHeight - 4,
      borderWidth: 0.7,
      borderColor: rgb(0.7, 0.7, 0.7),
    })
    page.drawText(value, {
      x: margin + 4,
      y: y - lineHeight + 2,
      size: 11,
      font: regularFont,
      color: textColor,
    })
  }

  const topBandHeight = 54
  page.drawRectangle({
    x: 0,
    y: height - topBandHeight,
    width,
    height: topBandHeight,
    color: rgb(0.8, 0.85, 0.95),
  })

  drawCentered('LETTRE D’AUTORISATION', height - topBandHeight / 2 - 4, 18)
  drawLabelValue(
    "Nom de l’entreprise :",
    (clientInfo?.company ?? clientInfo?.full_name ?? '') || '________________________________________',
    height - topBandHeight - 24
  )

  const bodyTextY = height - topBandHeight - 80
  const authorizationText = [
    "J'autorise par la présente Télécommunications Simplicom inc. à obtenir toutes les informations relatives à mes services de télécommunications actuels,",
    "et à agir au nom de ______________________________ aux fins de commander, d’installer et gérer des services et installations de télécommunications.",
    '',
    'Cette lettre remplace toute autre Lettre d’autorisation antérieure.',
  ]

  authorizationText.forEach((line, index) => {
    page.drawText(line, {
      x: margin,
      y: bodyTextY - index * (lineHeight + 2),
      size: 11,
      font: regularFont,
      color: textColor,
    })
  })

  const infoBoxY = bodyTextY - (authorizationText.length + 1) * (lineHeight + 2) - 12
  const infoBoxHeight = 3 * (lineHeight + 6)
  page.drawRectangle({
    x: margin,
    y: infoBoxY - infoBoxHeight,
    width: width - margin * 2,
    height: infoBoxHeight,
    borderWidth: 0.8,
    borderColor: rgb(0.6, 0.6, 0.6),
  })

  const infoLabels = [
    { label: 'Nom du client (appellation légale complète):', value: clientInfo?.company ?? clientInfo?.full_name ?? '' },
    { label: 'Représentant autorisé (titre en caractères d’imprimerie):', value: formData.portability_contact_name ?? '' },
    { label: 'Signature du représentant autorisé :', value: '____________________________      Date : ___________' },
  ]

  infoLabels.forEach((entry, index) => {
    const y = infoBoxY - index * (lineHeight + 6) - 10
    page.drawText(entry.label, {
      x: margin + 6,
      y,
      size: 10.5,
      font: boldFont,
      color: textColor,
    })
    page.drawText(String(entry.value || ''), {
      x: margin + 6,
      y: y - lineHeight + 4,
      size: 10.5,
      font: regularFont,
      color: textColor,
    })
  })

  const tableTop = infoBoxY - infoBoxHeight - 28
  const rowHeight = 22
  const tableHeight = rowHeight * 11
  const tableWidth = width - margin * 2
  const numberColumnWidth = tableWidth * 0.6

  page.drawRectangle({
    x: margin,
    y: tableTop - tableHeight,
    width: tableWidth,
    height: tableHeight,
    borderWidth: 1,
    borderColor: rgb(0.3, 0.3, 0.3),
  })

  page.drawRectangle({
    x: margin,
    y: tableTop - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: rgb(0.88, 0.9, 0.96),
  })

  page.drawText('NUMÉROS À TRANSFÉRER', {
    x: margin + 10,
    y: tableTop - rowHeight + 6,
    size: 11,
    font: boldFont,
    color: textColor,
  })
  page.drawText('FOURNISSEUR', {
    x: margin + numberColumnWidth + 10,
    y: tableTop - rowHeight + 6,
    size: 11,
    font: boldFont,
    color: textColor,
  })

  const numbers = extractPhoneEntries(formData.portability_numbers)

  for (let i = 0; i < 10; i++) {
    const y = tableTop - rowHeight * (i + 2)
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + tableWidth, y },
      color: rgb(0.8, 0.8, 0.8),
      thickness: 0.7,
    })

    page.drawText(`${i + 1}e numéro :`, {
      x: margin + 8,
      y: y + 6,
      size: 10.5,
      font: regularFont,
      color: textColor,
    })

    const numberValue = numbers[i] ?? ''
    page.drawText(numberValue, {
      x: margin + 110,
      y: y + 6,
      size: 10.5,
      font: regularFont,
      color: textColor,
    })

    page.drawText('__________________________', {
      x: margin + numberColumnWidth + 12,
      y: y + 6,
      size: 10.5,
      font: regularFont,
      color: textColor,
    })
  }

  const footerY = tableTop - tableHeight - 48
  const returnLines = [
    'Veuillez retourner ce formulaire dûment rempli à :',
    'Simplicom',
    '1430 St-Martin Ouest, Suite 317, Laval, QC, H7S 1M9',
    'Téléc : (450) 453-1301 · Courriel : info@simplicom.ca',
  ]

  returnLines.forEach((line, idx) => {
    drawCentered(line, footerY - idx * (lineHeight + 2), 10.5, regularFont)
  })

  const bottomText = 'Télécommunications Simplicom · 1.844.303.1300'
  drawCentered(bottomText, footerY - returnLines.length * (lineHeight + 2) - 6, 11, boldFont)
}
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: userResult, error: userError } = await supabase.auth.getUser()

    if (userError || !userResult?.user) {
      return NextResponse.json({ error: 'Utilisateur non authentifié.' }, { status: 401 })
    }

    const user = userResult.user
    const url = new URL(request.url)
    const submissionId = url.searchParams.get('submissionId')
    const clientId = url.searchParams.get('clientId')

    if (!submissionId && !clientId) {
      return NextResponse.json(
        { error: 'submissionId ou clientId est requis.' },
        { status: 400 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Impossible de déterminer le rôle de l’utilisateur.' },
        { status: 403 }
      )
    }

    const role = profile.role as UserRole
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Accès refusé.' },
        { status: 403 }
      )
    }

    const baseSelect = `
      id,
      status,
      submitted_at,
      processed_at,
      data,
      magic_links (
        id,
        token,
        agent_id,
        client_id,
        clients (
          id,
          full_name,
          email,
          company,
          phone,
          notes
        )
      )
    `

    let submission: any = null
    let fetchError: unknown = null

    if (submissionId) {
      const { data, error } = await supabase
        .from('form_submissions')
        .select(baseSelect)
        .eq('id', submissionId)
        .maybeSingle()
      submission = data
      fetchError = error
    } else if (clientId) {
      const { data, error } = await supabase
        .from('form_submissions')
        .select(baseSelect)
        .eq('magic_links.client_id', clientId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      submission = data
      fetchError = error
    }

    if (fetchError) {
      console.error('Download submission fetch error', fetchError)
      return NextResponse.json(
        { error: 'Impossible de récupérer le formulaire demandé.' },
        { status: 500 }
      )
    }

    if (!submission) {
      return NextResponse.json(
        { error: 'Formulaire introuvable.' },
        { status: 404 }
      )
    }

    if (
      role === 'agent' &&
      submission.magic_links?.agent_id &&
      submission.magic_links.agent_id !== user.id
    ) {
      return NextResponse.json(
        { error: 'Accès refusé à ce formulaire.' },
        { status: 403 }
      )
    }

    const clientInfo = submission.magic_links?.clients ?? null
    const fileSafeClientName = sanitizeFilename(clientInfo?.full_name)
    const filename = `formulaire-${fileSafeClientName}-${submission.id}.pdf`

    let parsedNotes: Record<string, unknown> | null = null
    if (clientInfo?.notes) {
      try {
        const candidate = JSON.parse(clientInfo.notes)
        if (candidate && typeof candidate === 'object') {
          parsedNotes = candidate
        } else {
          parsedNotes = { legacy: clientInfo.notes }
        }
      } catch {
        parsedNotes = { legacy: clientInfo.notes }
      }
    }

    const agentFormData =
      parsedNotes && typeof parsedNotes.agentForm === 'object' && parsedNotes.agentForm !== null
        ? (parsedNotes.agentForm as Record<string, unknown>)
        : null

    const agentRawNotes =
      parsedNotes && typeof parsedNotes.rawNotes === 'string'
        ? (parsedNotes.rawNotes as string)
        : parsedNotes && typeof parsedNotes.legacy === 'string'
          ? (parsedNotes.legacy as string)
          : null

    const pdfDoc = await PDFDocument.create()
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const headerHeight = 72
    const sideMargin = 60
    const bottomMargin = 60
    const baseLineGap = 6
    const textColor = rgb(0.09, 0.19, 0.28)
    const accentColor = rgb(0.06, 0.35, 0.49)

    type PageContext = {
      page: ReturnType<PDFDocument['addPage']>
      cursorY: number
    }

    const startNewPage = (): PageContext => {
      const newPage = pdfDoc.addPage()
      const { width, height } = newPage.getSize()

      newPage.drawRectangle({
        x: 0,
        y: height - headerHeight,
        width,
        height: headerHeight,
        color: rgb(0, 0.76, 0.85),
        opacity: 0.9,
      })

      const headerTitle = 'Dossier de Configuration Client'
      const headerWidth = boldFont.widthOfTextAtSize(headerTitle, 22)
      newPage.drawText(headerTitle, {
        x: (width - headerWidth) / 2,
        y: height - headerHeight + 18,
        size: 22,
        font: boldFont,
        color: rgb(1, 1, 1),
      })

      return {
        page: newPage,
        cursorY: height - headerHeight - 32,
      }
    }

    let context = startNewPage()

    const availableWidth = () => context.page.getWidth() - sideMargin * 2
    const lineHeight = (size: number) => size + baseLineGap

    const ensureSpace = (requiredHeight: number) => {
      if (context.cursorY - requiredHeight < bottomMargin) {
        context = startNewPage()
      }
    }

    const wrapMultiline = (
      text: string,
      font = regularFont,
      size = 11,
      width = availableWidth()
    ): string[] => {
      return text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .flatMap(line => wrapLine(line, width, font, size))
    }

    const drawParagraph = (
      text: string,
      {
        font = regularFont,
        size = 11,
        indent = 0,
        color = textColor,
        spacing = lineHeight(size),
      }: {
        font?: typeof regularFont
        size?: number
        indent?: number
        color?: ReturnType<typeof rgb>
        spacing?: number
      } = {}
    ) => {
      const lines = wrapMultiline(text, font, size, availableWidth() - indent)
      if (lines.length === 0) return
      ensureSpace(lines.length * spacing)
      lines.forEach(line => {
        context.page.drawText(line, {
          x: sideMargin + indent,
          y: context.cursorY,
          size,
          font,
          color,
        })
        context.cursorY -= spacing
      })
    }

    const drawAnswerBox = (content: string[]) => {
      const normalized = content.length ? content : ['Non renseigné']
      const wrapped = normalized.flatMap(line => wrapMultiline(line, regularFont, 11, availableWidth() - 28))

      const boxHeight = wrapped.length * lineHeight(11) + 24
      ensureSpace(boxHeight + 12)

      const top = context.cursorY
      context.page.drawRectangle({
        x: sideMargin,
        y: top - boxHeight,
        width: availableWidth(),
        height: boxHeight,
        color: rgb(0.97, 0.99, 1),
        borderColor: rgb(0, 0.58, 0.69),
        borderWidth: 1,
        opacity: 0.98,
      })

      let textY = top - 18
      wrapped.forEach(line => {
        context.page.drawText(line, {
          x: sideMargin + 14,
          y: textY,
          size: 11,
          font: regularFont,
          color: textColor,
        })
        textY -= lineHeight(11)
      })

      context.cursorY = top - boxHeight - 18
    }

    const drawSectionHeading = (title: string) => {
      ensureSpace(40)
      drawDivider(pdfDoc, context.page, context.cursorY + 6, sideMargin, rgb(0, 0.7, 0.82))
      context.cursorY -= 12
      drawParagraph(title, { font: boldFont, size: 16, color: accentColor })
      context.cursorY -= 8
    }

    const formatPrimitive = (value: unknown): string => {
      if (value === null || value === undefined) return 'Non renseigné'
      if (value instanceof Date) return value.toLocaleString('fr-FR')
      if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
      if (typeof value === 'number' && Number.isFinite(value)) return value.toString()
      return String(value)
    }

    const normalizeAnswer = (value: unknown, depth = 0): string[] => {
      const indent = '  '.repeat(depth)

      if (value === null || value === undefined) return []

      if (Array.isArray(value)) {
        if (value.length === 0) return []
        return value.flatMap((item, index) => {
          const lines = normalizeAnswer(item, depth + 1)
          if (typeof item === 'object' && item !== null) {
            return [`${indent}• Élément ${index + 1}`, ...lines.map(line => `${'  '.repeat(depth + 1)}${line}`)]
          }
          return lines.length ? lines : [`${indent}• ${formatPrimitive(item)}`]
        })
      }

      if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
        if (!entries.length) return []
        return entries.flatMap(([key, val]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
          const child = normalizeAnswer(val, depth + 1)
          if (!child.length) {
            return [`${indent}${label} : ${formatPrimitive(val)}`]
          }
          return [`${indent}${label} :`, ...child.map(line => `${'  '.repeat(depth + 1)}${line}`)]
        })
      }

      return formatPrimitive(value)
        .split(/\r?\n/)
        .map(line => `${indent}${line}`)
    }

    let questionIndex = 1
    const drawQuestionBlock = (label: string, answer: unknown) => {
      const number = questionIndex++
      drawParagraph(`${number}. ${label}`, { font: boldFont, size: 12, color: textColor })
      drawAnswerBox(normalizeAnswer(answer))
    }

    const drawExplicitQuestion = (number: string, label: string, answer: unknown) => {
      drawParagraph(`${number}. ${label}`, { font: boldFont, size: 12, color: textColor })
      drawAnswerBox(normalizeAnswer(answer))
    }

    const mapChoice = (value: string | null | undefined, mapping: Record<string, string>): string => {
      if (!value) return 'Non renseigné'
      return mapping[value] ?? 'Non renseigné'
    }

    drawSectionHeading('Résumé')
    drawParagraph(`Exporté le : ${new Date().toLocaleString('fr-FR')}`)
    drawParagraph(`Exporté par : ${profile.full_name ?? profile.email ?? 'Utilisateur'}`)
    drawParagraph(`Rôle : ${role === 'admin' ? 'Administrateur' : role === 'agent' ? 'Agent' : role}`)
    drawParagraph(`Client : ${clientInfo?.full_name ?? 'Non renseigné'}`)
    drawParagraph(`Email : ${clientInfo?.email ?? 'Non renseigné'}`)
    drawParagraph(`Téléphone : ${clientInfo?.phone ?? 'Non renseigné'}`)
    drawParagraph(`Société : ${clientInfo?.company ?? 'Non renseignée'}`)
    drawParagraph(`Soumission ID : ${submission.id}`)
    drawParagraph(
      `Soumis le : ${
        submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('fr-FR') : 'Non renseigné'
      }`
    )
    if (submission.processed_at) {
      drawParagraph(`Traité le : ${new Date(submission.processed_at).toLocaleString('fr-FR')}`)
    }
    context.cursorY -= 12

    drawSectionHeading('Informations transmises par l’agent')
    if (agentFormData) {
      if (typeof agentFormData.generated_at === 'string') {
        drawParagraph(`Dernière mise à jour : ${new Date(agentFormData.generated_at).toLocaleString('fr-FR')}`, {
          font: boldFont,
        })
        context.cursorY -= 4
      }
      drawExplicitQuestion('A1', 'Fournisseur VOIP', agentFormData.voip_provider ?? 'Non renseigné')
      drawExplicitQuestion('A2', 'Numéro / Offre', agentFormData.voip_number ?? 'Non renseigné')
      drawExplicitQuestion('A3', 'Configuration / Détails des prix', agentFormData.price_configuration ?? 'Non renseigné')
      drawExplicitQuestion(
        'A4',
        'Validité du lien',
        typeof agentFormData.expires_in_days === 'number'
          ? `${agentFormData.expires_in_days} jour(s)`
          : 'Non renseigné'
      )
      drawExplicitQuestion('A5', 'Observations de l’agent', agentFormData.additional_notes ?? 'Non renseigné')
    } else {
      drawParagraph('Aucune information agent disponible.')
    }

    if (agentRawNotes) {
      context.cursorY -= 8
      drawExplicitQuestion('A6', 'Notes complémentaires', agentRawNotes)
    }

    context.cursorY -= 12

    const formData = (submission.data ?? {}) as Record<string, unknown>

    drawSectionHeading('Informations de facturation')
    drawQuestionBlock('Nom de la compagnie *', formData.billing_company_name)
    drawQuestionBlock('Nom et prénom de la personne ressource *', formData.billing_contact_name)
    drawQuestionBlock('Numéro de téléphone de la personne ressource *', formData.billing_contact_phone)
    drawQuestionBlock('Adresse courriel *', formData.billing_contact_email)
    drawQuestionBlock('Adresse de facturation *', formData.billing_address)

    drawSectionHeading('Numéros de téléphone (DID, FAX et 1-800)')
    drawQuestionBlock(
      'Souhaitez-vous activer de nouveaux numéros ? *',
      mapChoice(formData.phone_numbers_choice as string | undefined, {
        keep: 'Conserver mes numéros actuels',
        new: 'Activer de nouveaux numéros',
      })
    )
    drawQuestionBlock(
      'Numéros à conserver et transférer *',
      formData.phone_numbers_to_keep
    )

    drawSectionHeading('Adresses de service')
    drawQuestionBlock(
      'Adresse complète pour le service 911 *',
      formData.emergency_service_address
    )
    drawQuestionBlock(
      'Affichage sortant des postes *',
      formData.outgoing_display_name
    )

    drawSectionHeading('Téléphones de bureau IP')
    drawQuestionBlock(
      'Stratégie pour les appareils téléphoniques *',
      mapChoice(formData.ip_phone_choice as string | undefined, {
        keep: 'Je veux conserver mes appareils téléphoniques IP',
        buy: 'Je vais acheter de nouveaux appareils (facture d’ouverture payée)',
        virtual: 'Je vais utiliser une solution 100% virtuelle',
      })
    )

    drawSectionHeading('Configuration des postes téléphoniques')
    drawQuestionBlock('Nombre de postes à configurer *', formData.posts_count)

    const postConfigs = Array.isArray(formData.post_configurations)
      ? (formData.post_configurations as Record<string, unknown>[])
      : []
    if (postConfigs.length) {
      postConfigs.forEach((post, index) => {
        const label = typeof post.label === 'string' && post.label.trim() ? post.label : `Poste ${index + 1}`
        const lines = [
          `Téléphone virtuel sur cellulaire : ${post.virtualMobile ? 'Oui' : 'Non'}`,
          `Boîte vocale vers courriel : ${post.voicemailToMail ? 'Oui' : 'Non'}`,
        ]
        drawExplicitQuestion(`P${index + 1}`, label, lines)
      })
    }

    drawSectionHeading('Informations sur les collaborateurs')
    drawQuestionBlock(
      'Noms, prénoms et extensions *',
      formData.collaborators_identification
    )
    drawQuestionBlock(
      'Courriels et numéros par extension *',
      formData.collaborators_contacts
    )

    drawSectionHeading('Menu d’entreprise')
    drawQuestionBlock(
      'Souhaitez-vous intégrer un menu d’entreprise ? *',
      mapChoice(formData.include_company_menu as string | undefined, {
        fr: 'Oui, en français uniquement',
        en: 'Oui, en anglais uniquement',
        both: 'Oui, en français et en anglais',
        none: 'Non, je ne souhaite pas intégrer de menu',
      })
    )
    drawQuestionBlock(
      'Script du menu en français',
      formData.french_menu_script
    )
    drawQuestionBlock(
      'Script du menu en anglais',
      formData.english_menu_script
    )

    if (formData.include_company_menu !== 'none') {
      drawSectionHeading('Enregistrement professionnel')
      drawQuestionBlock(
        'Souhaitez-vous un enregistrement professionnel ? *',
        mapChoice(formData.professional_recording as string | undefined, {
          ai: 'Oui, enregistrement voix IA (70$ / enregistrement / langue)',
          studio: 'Oui, enregistrement en studio (149$ / enregistrement / langue)',
          self: 'Non, je vais effectuer moi-même les enregistrements',
        })
      )
    }

    drawSectionHeading('Portabilité des numéros')
    drawQuestionBlock(
      'Souhaitez-vous effectuer une portabilité ? *',
      mapChoice(formData.portability_choice as string | undefined, {
        yes: 'Oui, je souhaite transférer mes numéros existants',
        no: 'Non, je n’ai pas besoin de portabilité',
      })
    )

    if (formData.include_company_menu !== 'none') {
      drawSectionHeading('Enregistrements audio du menu d’entreprise')
      if (formData.professional_recording === 'self') {
        if (formData.french_recording_url || formData.english_recording_url) {
          const recordingsLines: string[] = []
          if (formData.french_recording_url) {
            recordingsLines.push(`Version française : ${formData.french_recording_url}`)
          }
          if (formData.english_recording_url) {
            recordingsLines.push(`Version anglaise : ${formData.english_recording_url}`)
          }
          drawQuestionBlock('Fichiers fournis par le client', recordingsLines)
        } else {
          drawQuestionBlock('Fichiers fournis par le client', 'Enregistrements attendus (aucun fichier reçu).')
        }
      } else {
        const description =
          formData.professional_recording === 'ai'
            ? 'Enregistrement pris en charge par Simplicom (voix IA).'
            : formData.professional_recording === 'studio'
              ? 'Enregistrement pris en charge par Simplicom (studio professionnel).'
              : 'Les enregistrements seront réalisés par Simplicom.'
        drawQuestionBlock('Prise en charge des enregistrements', description)
      }
    }

    if (formData.portability_choice === 'yes') {
      drawQuestionBlock('Nom du contact portabilité', formData.portability_contact_name)
      drawQuestionBlock('Courriel du contact portabilité', formData.portability_contact_email)
      drawQuestionBlock('Référence client / ID de compte', formData.portability_account_reference)
      drawQuestionBlock('Nombre de lignes à porter', formData.portability_lines_count)
      drawQuestionBlock('Numéros à porter', formData.portability_numbers)
      drawQuestionBlock('Date souhaitée de portabilité', formData.portability_requested_date)
      drawQuestionBlock('Lien lettre d’autorisation signée', formData.portability_authorization_letter)
      drawQuestionBlock('Lien dernière facture opérateur', formData.portability_last_invoice)
    }

    drawSectionHeading('Notification administrateur')
    drawQuestionBlock(
      'Souhaitez-vous notifier un administrateur ?',
      formData.notify_admin === 'yes'
        ? `Oui, adresse : ${formData.admin_notification_email ?? 'Non renseignée'}`
        : 'Non'
    )

    drawSectionHeading('Notes et informations complémentaires')
    drawQuestionBlock('Notes supplémentaires', formData.additional_notes)

    if (formData.portability_choice === 'yes') {
      appendPortabilityLetter({
        pdfDoc,
        boldFont,
        regularFont,
        clientInfo,
        formData,
      })
    }

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Unhandled error while downloading form submission', error)
    return NextResponse.json(
      { error: 'Erreur serveur inattendue.' },
      { status: 500 }
    )
  }
}

