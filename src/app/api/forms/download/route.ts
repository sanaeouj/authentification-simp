import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types/database.types'
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib'

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

const wrapLine = (text: string, maxWidth: number, font: PDFFont, size: number): string[] => {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  words.forEach(word => {
    // Vérifier si le mot seul dépasse la largeur
    const wordWidth = font.widthOfTextAtSize(word, size)
    if (wordWidth > maxWidth) {
      // Si le mot est trop long, le couper caractère par caractère
      if (current) {
        lines.push(current)
        current = ''
      }
      // Couper le mot en plusieurs parties
      let remainingWord = word
      while (remainingWord && remainingWord.length > 0) {
        let charCount = 1
        let segment = remainingWord.substring(0, charCount)
        let segmentWidth = font.widthOfTextAtSize(segment, size)
        
        // Trouver le nombre maximum de caractères qui tiennent dans maxWidth
        while (charCount < remainingWord.length && segmentWidth < maxWidth) {
          charCount++
          segment = remainingWord.substring(0, charCount)
          segmentWidth = font.widthOfTextAtSize(segment, size)
        }
        
        // Si on a dépassé, revenir en arrière d'un caractère
        if (segmentWidth > maxWidth && charCount > 1) {
          charCount--
          segment = remainingWord.substring(0, charCount)
        }
        
        lines.push(segment)
        remainingWord = remainingWord.substring(charCount)
      }
    } else {
      const tentative = current ? `${current} ${word}` : word
      const width = font.widthOfTextAtSize(tentative, size)
      if (width <= maxWidth) {
        current = tentative
      } else {
        if (current) lines.push(current)
        current = word
      }
    }
  })

  if (current) lines.push(current)
  return lines
}

const drawLines = (
  doc: PDFDocument,
  page: ReturnType<PDFDocument['addPage']>,
  lines: string[],
  font: PDFFont,
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
  color = rgb(0, 0.76, 0.85),
  width?: number
) => {
  const dividerWidth = width ?? (page.getWidth() - margin * 2)
  page.drawRectangle({
    x: margin,
    y: positionY,
    width: dividerWidth,
    height: 1.5, // Épaisseur harmonisée
    color,
    opacity: 0.35, // Légèrement plus visible
  })
}

const extractPhoneEntries = (raw: unknown): string[] => {
  if (!raw) return []
  
  // Si c'est un tableau, utiliser directement les éléments
  if (Array.isArray(raw)) {
    return (raw as unknown[])
      .map(item => (item == null ? '' : String(item).trim()))
      .filter(entry => entry.length > 0)
      .slice(0, 10)
  }
  
  // Sinon, traiter comme une chaîne et diviser
  const text = String(raw)
  return text
    .split(/[\r\n,;]+/)
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0)
    .slice(0, 10)
}

/**
 * Nettoie un numéro de téléphone en enlevant les caractères non numériques
 * et enlève l'indicatif de pays (1) au début si présent
 */
const cleanPhoneNumber = (phone: string): string => {
  if (!phone || typeof phone !== 'string') {
    return ''
  }
  // Enlever tous les caractères non numériques (espaces, tirets, parenthèses, points, plus, etc.)
  let cleaned = phone.replace(/[^\d]/g, '')
  
  // Enlever l'indicatif de pays "1" au début si présent (pour les numéros nord-américains)
  // Un numéro nord-américain a 10 chiffres
  // Si on a 11 chiffres ou plus et que ça commence par 1, on l'enlève
  while (cleaned.length > 10 && cleaned.startsWith('1')) {
    cleaned = cleaned.substring(1)
  }
  
  return cleaned
}

/**
 * Mapping des préfixes 8XX vers leurs Resp Org correspondants
 * Modifiez ce mapping selon vos besoins spécifiques
 */
const EIGHT_XX_RESP_ORG_MAP: Record<string, string> = {
  '800': '800-RESP-ORG',
  '811': '811-RESP-ORG',
  '822': '822-RESP-ORG',
  '833': '833-RESP-ORG',
  '844': '844-RESP-ORG',
  '855': '855-RESP-ORG',
  '866': '866-RESP-ORG',
  '877': '877-RESP-ORG',
  '888': '888-RESP-ORG',
  '899': '899-RESP-ORG',
}

/**
 * Détermine le Resp Org basé sur le préfixe 8XX du numéro
 * Les préfixes 8XX (811, 822, 833, 844, 855, 866, 877, 888, 899, 800) 
 * nécessitent un Resp Org spécifique
 */
const getRespOrgFor8XX = (phoneNumber: string): string | null => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return null
  }
  
  // Nettoyer le numéro
  const cleaned = cleanPhoneNumber(phoneNumber.trim())
  
  // Debug: log pour vérifier le nettoyage
  console.log(`[RespOrg] Numéro original: "${phoneNumber}", Nettoyé: "${cleaned}"`)
  
  // Vérifier si le numéro nettoyé a au moins 3 chiffres
  if (cleaned.length < 3) {
    console.log(`[RespOrg] Numéro trop court (${cleaned.length} caractères)`)
    return null
  }
  
  // Extraire les 3 premiers chiffres
  const prefix = cleaned.substring(0, 3)
  console.log(`[RespOrg] Préfixe détecté: "${prefix}"`)
  
  // Vérifier si le préfixe commence par 8 (pour les numéros 8XX)
  if (prefix.startsWith('8')) {
    // Vérifier si c'est un préfixe 8XX valide (800, 811, 822, 833, 844, 855, 866, 877, 888, 899)
    if (EIGHT_XX_RESP_ORG_MAP[prefix]) {
      const respOrg = EIGHT_XX_RESP_ORG_MAP[prefix]
      console.log(`[RespOrg] Resp Org trouvé: "${respOrg}" pour le préfixe "${prefix}"`)
      return respOrg
    } else {
      console.log(`[RespOrg] Préfixe "${prefix}" commence par 8 mais n'est pas dans le mapping`)
    }
  } else {
    console.log(`[RespOrg] Préfixe "${prefix}" ne commence pas par 8`)
  }
  
  return null
}

interface PortabilityLetterPayload {
  pdfDoc: PDFDocument
  boldFont: PDFFont
  regularFont: PDFFont
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
  // Utiliser les mêmes dimensions en paysage que le reste du document
  const LANDSCAPE_WIDTH = 792
  const LANDSCAPE_HEIGHT = 612
  const page = pdfDoc.addPage([LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT])
  const { width, height } = page.getSize()
  const margin = 40 // Réduit de 48 à 40 pour correspondre aux autres marges
  const lineHeight = 12 // Réduit de 16 à 12
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
      size: 9, // Réduit de 11 à 9
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
      size: 9, // Réduit de 11 à 9
      font: regularFont,
      color: textColor,
    })
  }

  const topBandHeight = 60 // Augmenté pour plus d'impact
  // Gradient pour l'en-tête
  const gradientSteps = 4
  const stepHeight = topBandHeight / gradientSteps
  for (let i = 0; i < gradientSteps; i++) {
    const opacity = 0.95 - (i * 0.15)
    page.drawRectangle({
      x: 0,
      y: height - topBandHeight + (i * stepHeight),
      width,
      height: stepHeight,
      color: rgb(0.06, 0.35, 0.49),
      opacity,
    })
  }
  
  // Ligne décorative
  page.drawRectangle({
    x: 0,
    y: height - topBandHeight,
    width,
    height: 4,
    color: rgb(0, 0.76, 0.85),
    opacity: 0.8,
  })

  // Construire le titre en concaténant pour éviter les problèmes d'apostrophe typographique
  const letterTitle = 'LETTRE D' + String.fromCharCode(39) + 'AUTORISATION'
  
  // Ombre du titre
  const titleSize = 20
  const titleWidth = boldFont.widthOfTextAtSize(letterTitle, titleSize)
  page.drawText(letterTitle, {
    x: (width - titleWidth) / 2 + 2,
    y: height - topBandHeight / 2 - 2,
    size: titleSize,
    font: boldFont,
    color: rgb(0, 0, 0),
    opacity: 0.2,
  })
  
  // Titre principal
  drawCentered(letterTitle, height - topBandHeight / 2, titleSize)
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
      size: 9, // Réduit de 11 à 9
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
      size: 9, // Réduit de 10.5 à 9
      font: boldFont,
      color: textColor,
    })
    page.drawText(String(entry.value || ''), {
      x: margin + 6,
      y: y - lineHeight + 4,
      size: 9, // Réduit de 10.5 à 9
      font: regularFont,
      color: textColor,
    })
  })

  const tableTop = infoBoxY - infoBoxHeight - 28
  const rowHeight = 18 // Réduit de 22 à 18
  const tableHeight = rowHeight * 11
  const tableWidth = width - margin * 2
  const numberColumnWidth = tableWidth * 0.6
  const shadowOffset = 2

  // Tableau avec ombre
  page.drawRectangle({
    x: margin + shadowOffset,
    y: tableTop - tableHeight - shadowOffset,
    width: tableWidth,
    height: tableHeight,
    color: rgb(0.85, 0.85, 0.85),
    opacity: 0.15,
  })
  
  page.drawRectangle({
    x: margin,
    y: tableTop - tableHeight,
    width: tableWidth,
    height: tableHeight,
    borderWidth: 1.5,
    borderColor: rgb(0.2, 0.2, 0.2),
  })

  // En-tête du tableau avec gradient
  const headerGradientSteps = 3
  const headerStepHeight = rowHeight / headerGradientSteps
  for (let i = 0; i < headerGradientSteps; i++) {
    page.drawRectangle({
      x: margin,
      y: tableTop - rowHeight + (i * headerStepHeight),
      width: tableWidth,
      height: headerStepHeight,
      color: rgb(0, 0.76, 0.85),
      opacity: 0.9 - (i * 0.2),
    })
  }
  
  // Bordure en bas de l'en-tête
  page.drawRectangle({
    x: margin,
    y: tableTop - rowHeight,
    width: tableWidth,
    height: 2,
    color: rgb(0, 0.65, 0.75),
  })

  page.drawText('NUMÉROS À TRANSFÉRER', {
    x: margin + 10,
    y: tableTop - rowHeight + 6,
    size: 10,
    font: boldFont,
    color: rgb(1, 1, 1),
  })
  page.drawText('FOURNISSEUR', {
    x: margin + numberColumnWidth + 10,
    y: tableTop - rowHeight + 6,
    size: 10,
    font: boldFont,
    color: rgb(1, 1, 1),
  })

  const numbers = extractPhoneEntries(formData.portability_numbers)
  
  // Debug: log pour vérifier l'extraction
  console.log(`[RespOrg] Numéros extraits:`, numbers)
  console.log(`[RespOrg] Type de portability_numbers:`, typeof formData.portability_numbers, Array.isArray(formData.portability_numbers))

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
      y: y + 4,
      size: 9,
      font: regularFont,
      color: textColor,
    })

    const numberValue = numbers[i] ?? ''
    
    // Déterminer le Resp Org si le numéro commence par 8XX
    const respOrg = numberValue ? getRespOrgFor8XX(numberValue) : null
    const is8XX = respOrg !== null
    const successColor = rgb(0, 0.7, 0.3)
    
    // Badge avec coche pour les numéros 8XX
    const checkmarkX = margin + 85
    if (is8XX) {
      // Badge vert pour 8XX
      page.drawRectangle({
        x: checkmarkX - 3,
        y: y + 1,
        width: 16,
        height: 16,
        color: successColor,
        opacity: 0.2,
      })
      page.drawRectangle({
        x: checkmarkX - 3,
        y: y + 1,
        width: 16,
        height: 16,
        borderColor: successColor,
        borderWidth: 1.5,
      })
      // Coche
      page.drawText('✓', {
        x: checkmarkX + 1,
        y: y + 4,
        size: 12,
        font: boldFont,
        color: successColor,
      })
    }
    
    // Afficher le numéro
    page.drawText(numberValue, {
      x: margin + 110,
      y: y + 4,
      size: 9,
      font: regularFont,
      color: textColor,
    })

    // Afficher le Resp Org dans le champ FOURNISSEUR
    const supplierText = respOrg ? respOrg : '__________________________'
    
    // Debug: log pour vérifier l'affichage
    console.log(`[RespOrg] Ligne ${i + 1}: Numéro="${numberValue}", RespOrg="${respOrg}", Texte="${supplierText}", is8XX=${is8XX}`)
    
    // Badge pour Resp Org
    if (respOrg) {
      const badgeX = margin + numberColumnWidth + 8
      page.drawRectangle({
        x: badgeX,
        y: y + 1,
        width: Math.min(boldFont.widthOfTextAtSize(respOrg, 9) + 8, tableWidth - numberColumnWidth - 20),
        height: 14,
        color: rgb(0, 0.76, 0.85),
        opacity: 0.15,
      })
      page.drawRectangle({
        x: badgeX,
        y: y + 1,
        width: Math.min(boldFont.widthOfTextAtSize(respOrg, 9) + 8, tableWidth - numberColumnWidth - 20),
        height: 14,
        borderColor: rgb(0, 0.76, 0.85),
        borderWidth: 1,
      })
    }
    
    page.drawText(supplierText, {
      x: margin + numberColumnWidth + 12,
      y: y + 4,
      size: 9,
      font: respOrg ? boldFont : regularFont,
      color: respOrg ? rgb(0, 0.65, 0.75) : textColor,
    })
  }

  const footerY = tableTop - tableHeight - 40
  const returnLines = [
    'Veuillez retourner ce formulaire dûment rempli à :',
    'Simplicom',
    '1430 St-Martin Ouest, Suite 317, Laval, QC, H7S 1M9',
    'Téléc : (450) 453-1301 · Courriel : info@simplicom.ca',
  ]

  returnLines.forEach((line, idx) => {
    drawCentered(line, footerY - idx * (lineHeight + 2), 9, regularFont)
  })

  const bottomText = 'Télécommunications Simplicom · 1.844.303.1300'
  drawCentered(bottomText, footerY - returnLines.length * (lineHeight + 2) - 6, 10, boldFont)
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Dimensions en paysage (landscape): largeur > hauteur
    const LANDSCAPE_WIDTH = 792 // 11 pouces
    const LANDSCAPE_HEIGHT = 612 // 8.5 pouces

    // Palette de couleurs sophistiquée
    const primaryColor = rgb(0, 0.76, 0.85) // Cyan principal
    const primaryDark = rgb(0, 0.65, 0.75) // Cyan foncé
    const secondaryColor = rgb(0.06, 0.35, 0.49) // Bleu foncé
    const accentColor = rgb(0.06, 0.35, 0.49)
    const textColor = rgb(0.09, 0.19, 0.28) // Texte principal
    const textLight = rgb(0.4, 0.4, 0.4) // Texte secondaire
    const bgCard = rgb(0.97, 0.99, 1) // Fond carte
    const borderColor = rgb(0, 0.58, 0.69)
    const borderLight = rgb(0.85, 0.9, 0.95)

    // Marges et espacements harmonisés
    const headerHeight = 70 // Augmenté pour plus d'espace
    const footerHeight = 35
    const sideMargin = 45
    const bottomMargin = 50 // Augmenté pour le footer
    const topMargin = 30 // Marge après l'en-tête
    const baseLineGap = 3
    const borderWidth = 1.2 // Bordure plus visible
    const shadowOffset = 2 // Décalage pour effet d'ombre

    type PageContext = {
      page: ReturnType<PDFDocument['addPage']>
      cursorYLeft: number
      cursorYRight: number
      currentColumn: 'left' | 'right'
    }

    // Calcul des dimensions des colonnes (2 colonnes avec espace entre)
    const getColumnLayout = () => {
      const pageWidth = LANDSCAPE_WIDTH
      const totalMargins = sideMargin * 2
      const columnGap = 25 // Espace entre les 2 colonnes (augmenté)
      const availableWidth = pageWidth - totalMargins - columnGap
      const columnWidth = availableWidth / 2
      const leftColumnX = sideMargin
      const rightColumnX = sideMargin + columnWidth + columnGap
      
      return {
        columnWidth,
        leftColumnX,
        rightColumnX,
        columnGap,
      }
    }

    const columnLayout = getColumnLayout()

    let pageNumber = 0
    const startNewPage = (): PageContext => {
      pageNumber++
      const newPage = pdfDoc.addPage([LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT])
      const { width, height } = newPage.getSize()

      // En-tête avec gradient simulé (plusieurs rectangles)
      const gradientSteps = 3
      const stepHeight = headerHeight / gradientSteps
      for (let i = 0; i < gradientSteps; i++) {
        const opacity = 0.95 - (i * 0.1)
        newPage.drawRectangle({
          x: 0,
          y: height - headerHeight + (i * stepHeight),
          width,
          height: stepHeight,
          color: primaryColor,
          opacity,
        })
      }

      // Ligne décorative en bas de l'en-tête
      newPage.drawRectangle({
        x: 0,
        y: height - headerHeight,
        width,
        height: 3,
        color: primaryDark,
        opacity: 0.8,
      })

      // Titre principal avec ombre
      const headerTitle = 'Dossier de Configuration Client'
      const headerSize = 22
      const headerWidth = boldFont.widthOfTextAtSize(headerTitle, headerSize)
      
      // Ombre du titre
      newPage.drawText(headerTitle, {
        x: (width - headerWidth) / 2 + 1,
        y: height - headerHeight + 20 - 1,
        size: headerSize,
        font: boldFont,
        color: rgb(0, 0, 0),
        opacity: 0.2,
      })
      
      // Titre principal
      newPage.drawText(headerTitle, {
        x: (width - headerWidth) / 2,
        y: height - headerHeight + 20,
        size: headerSize,
        font: boldFont,
        color: rgb(1, 1, 1),
      })

      // Sous-titre avec informations
      const subtitle = clientInfo?.company || clientInfo?.full_name || 'Configuration'
      const subtitleSize = 10
      const subtitleWidth = regularFont.widthOfTextAtSize(subtitle, subtitleSize)
      newPage.drawText(subtitle, {
        x: (width - subtitleWidth) / 2,
        y: height - headerHeight + 5,
        size: subtitleSize,
        font: regularFont,
        color: rgb(1, 1, 1),
        opacity: 0.9,
      })

      // Pied de page
      const footerY = footerHeight
      newPage.drawRectangle({
        x: 0,
        y: 0,
        width,
        height: footerHeight,
        color: rgb(0.95, 0.96, 0.98),
      })
      
      newPage.drawLine({
        start: { x: 0, y: footerHeight },
        end: { x: width, y: footerHeight },
        thickness: 1,
        color: borderLight,
      })

      // Numéro de page
      const pageText = `Page ${pageNumber}`
      const pageTextWidth = regularFont.widthOfTextAtSize(pageText, 9)
      newPage.drawText(pageText, {
        x: (width - pageTextWidth) / 2,
        y: footerHeight / 2 - 3,
        size: 9,
        font: regularFont,
        color: textLight,
      })

      // Logo/Info entreprise à droite
      const companyInfo = 'Simplicom'
      const companyInfoWidth = boldFont.widthOfTextAtSize(companyInfo, 8)
      newPage.drawText(companyInfo, {
        x: width - sideMargin - companyInfoWidth,
        y: footerHeight / 2 - 3,
        size: 8,
        font: boldFont,
        color: primaryColor,
      })

      // Date à gauche
      const dateText = new Date().toLocaleDateString('fr-FR')
      newPage.drawText(dateText, {
        x: sideMargin,
        y: footerHeight / 2 - 3,
        size: 8,
        font: regularFont,
        color: textLight,
      })

      // Dessiner une ligne de séparation entre les colonnes (plus subtile)
      const separatorY = height - headerHeight - topMargin
      newPage.drawLine({
        start: { x: sideMargin + columnLayout.columnWidth + columnLayout.columnGap / 2, y: footerHeight + 5 },
        end: { x: sideMargin + columnLayout.columnWidth + columnLayout.columnGap / 2, y: separatorY },
        thickness: 0.5,
        color: borderLight,
        opacity: 0.6,
      })

      return {
        page: newPage,
        cursorYLeft: height - headerHeight - topMargin,
        cursorYRight: height - headerHeight - topMargin,
        currentColumn: 'left',
      }
    }

    let context = startNewPage()

    const availableWidth = () => columnLayout.columnWidth
    const lineHeight = (size: number) => size + baseLineGap

    const ensureSpace = (requiredHeight: number, column?: 'left' | 'right') => {
      const currentCol = column ?? context.currentColumn
      const currentY = currentCol === 'left' ? context.cursorYLeft : context.cursorYRight
      
      // Prendre en compte le footer
      const actualBottomMargin = bottomMargin + footerHeight
      
      if (currentY - requiredHeight < actualBottomMargin) {
        // Essayer de passer à l'autre colonne
        if (currentCol === 'left') {
          const rightColY = context.cursorYRight
          if (rightColY - requiredHeight >= actualBottomMargin) {
            context.currentColumn = 'right'
            return
          }
        } else {
          const leftColYCheck = context.cursorYLeft
          if (leftColYCheck - requiredHeight >= actualBottomMargin) {
            context.currentColumn = 'left'
            return
          }
        }
        // Si aucune colonne n'a assez d'espace, créer une nouvelle page
        context = startNewPage()
      }
    }

    const getCurrentX = () => {
      return context.currentColumn === 'left' 
        ? columnLayout.leftColumnX 
        : columnLayout.rightColumnX
    }

    const getCurrentY = () => {
      return context.currentColumn === 'left' 
        ? context.cursorYLeft 
        : context.cursorYRight
    }

    const setCurrentY = (y: number) => {
      if (context.currentColumn === 'left') {
        context.cursorYLeft = y
      } else {
        context.cursorYRight = y
      }
    }

    const wrapMultiline = (
      text: string,
      font = regularFont,
      size = 9, // Réduit de 11 à 9 par défaut
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
        size = 9, // Réduit de 11 à 9 par défaut
        indent = 0,
        color = textColor,
        spacing = lineHeight(size),
        column,
      }: {
        font?: PDFFont
        size?: number
        indent?: number
        color?: ReturnType<typeof rgb>
        spacing?: number
        column?: 'left' | 'right'
      } = {}
    ) => {
      if (column) context.currentColumn = column
      // Largeur disponible pour le texte (largeur de colonne - indentation)
      const textWidth = availableWidth() - indent
      const lines = wrapMultiline(text, font, size, textWidth)
      if (lines.length === 0) return
      ensureSpace(lines.length * spacing, context.currentColumn)
      
      const x = getCurrentX() + indent
      let y = getCurrentY()
      
      lines.forEach(line => {
        // Vérifier que la ligne ne dépasse pas la largeur disponible
        const lineWidth = font.widthOfTextAtSize(line, size)
        let displayLine = line
        
        // Si la ligne dépasse, la tronquer (sécurité supplémentaire)
        if (lineWidth > textWidth) {
          let truncatedLine = line
          while (font.widthOfTextAtSize(truncatedLine, size) > textWidth && truncatedLine.length > 0) {
            truncatedLine = truncatedLine.substring(0, truncatedLine.length - 1)
          }
          displayLine = truncatedLine
        }
        
        context.page.drawText(displayLine, {
          x,
          y,
          size,
          font,
          color,
        })
        y -= spacing
      })
      
      setCurrentY(y)
    }

    const drawAnswerBox = (content: string[], column?: 'left' | 'right') => {
      // Ne rien dessiner si le contenu est vide
      if (content.length === 0) return
      if (column) context.currentColumn = column
      
      const fontSize = 9
      const paddingTop = 16 // Padding interne supérieur
      const paddingBottom = 16 // Padding interne inférieur
      const horizontalPadding = 14 // Padding interne horizontal
      const marginBefore = 8 // Marge externe avant la boîte
      const marginAfter = 12 // Marge externe après la boîte
      
      // Largeur disponible pour le texte (largeur de colonne - padding gauche et droite)
      const textWidth = availableWidth() - (horizontalPadding * 2)
      const wrapped = content.flatMap(line => wrapMultiline(line, regularFont, fontSize, textWidth))

      const boxHeight = wrapped.length * lineHeight(fontSize) + paddingTop + paddingBottom
      ensureSpace(boxHeight + marginBefore + marginAfter, context.currentColumn)

      const x = getCurrentX()
      const top = getCurrentY() - marginBefore // Espace avant la boîte
      const boxWidth = availableWidth()
      
      // Effet d'ombre (simulé avec un rectangle gris décalé)
      context.page.drawRectangle({
        x: x + shadowOffset,
        y: top - boxHeight - shadowOffset,
        width: boxWidth,
        height: boxHeight,
        color: rgb(0.85, 0.85, 0.85),
        opacity: 0.15,
      })
      
      // Boîte principale avec fond et bordure
      context.page.drawRectangle({
        x,
        y: top - boxHeight,
        width: boxWidth,
        height: boxHeight,
        color: bgCard,
        borderColor: borderColor,
        borderWidth: borderWidth,
      })

      // Ligne décorative en haut de la boîte
      context.page.drawRectangle({
        x,
        y: top - 2,
        width: boxWidth,
        height: 2,
        color: primaryColor,
        opacity: 0.3,
      })

      // S'assurer que le texte reste dans les limites
      let textY = top - paddingTop
      const textStartX = x + horizontalPadding
      
      wrapped.forEach(line => {
        // Vérifier que la ligne ne dépasse pas la largeur disponible
        const lineWidth = regularFont.widthOfTextAtSize(line, fontSize)
        const textX = textStartX
        
        // Si la ligne dépasse, la tronquer visuellement
        if (lineWidth > textWidth) {
          let truncatedLine = line
          while (regularFont.widthOfTextAtSize(truncatedLine, fontSize) > textWidth && truncatedLine.length > 0) {
            truncatedLine = truncatedLine.substring(0, truncatedLine.length - 1)
          }
          context.page.drawText(truncatedLine, {
            x: textX,
            y: textY,
            size: fontSize,
            font: regularFont,
            color: textColor,
          })
        } else {
          context.page.drawText(line, {
            x: textX,
            y: textY,
            size: fontSize,
            font: regularFont,
            color: textColor,
          })
        }
        textY -= lineHeight(fontSize)
      })

      setCurrentY(top - boxHeight - marginAfter) // Marge après la boîte
    }

    const drawSectionHeading = (title: string, column?: 'left' | 'right') => {
      if (column) context.currentColumn = column
      const marginBefore = 20 // Marge avant la section
      const marginAfterTitle = 14 // Marge après le titre
      const marginBetweenLineAndTitle = 12 // Marge entre la ligne et le titre
      const badgeHeight = 18
      const requiredSpace = badgeHeight + marginBefore + marginAfterTitle + marginBetweenLineAndTitle
      ensureSpace(requiredSpace, context.currentColumn)
      
      const x = getCurrentX()
      const y = getCurrentY() - marginBefore // Marge avant la ligne
      
      // Badge de section avec fond coloré
      const badgeWidth = Math.min(boldFont.widthOfTextAtSize(title, 11) + 16, availableWidth())
      context.page.drawRectangle({
        x,
        y: y - badgeHeight,
        width: badgeWidth,
        height: badgeHeight,
        color: primaryColor,
        opacity: 0.15,
      })
      
      // Bordure du badge
      context.page.drawRectangle({
        x,
        y: y - badgeHeight,
        width: badgeWidth,
        height: badgeHeight,
        borderColor: primaryColor,
        borderWidth: 1.5,
      })
      
      // Icône/symbole avant le titre (simulé avec un rectangle)
      const iconSize = 8
      context.page.drawRectangle({
        x: x + 6,
        y: y - badgeHeight + (badgeHeight - iconSize) / 2,
        width: iconSize,
        height: iconSize,
        color: primaryColor,
      })
      
      // Titre de section dans le badge
      context.page.drawText(title, {
        x: x + 18,
        y: y - badgeHeight + 5,
        size: 11,
        font: boldFont,
        color: secondaryColor,
      })
      
      setCurrentY(y - badgeHeight - marginAfterTitle) // Marge après le badge
    }

    const formatPrimitive = (value: unknown): string => {
      if (value === null || value === undefined) return 'Non renseigné'
      if (value instanceof Date) return value.toLocaleString('fr-FR')
      if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
      if (typeof value === 'number' && Number.isFinite(value)) return value.toString()
      return String(value)
    }

    const isEmptyValue = (value: unknown): boolean => {
      if (value === null || value === undefined) return true
      if (typeof value === 'string' && value.trim() === '') return true
      if (Array.isArray(value) && value.length === 0) return true
      if (typeof value === 'object' && Object.keys(value).length === 0) return true
      return false
    }

    const normalizeAnswer = (value: unknown, depth = 0): string[] => {
      const indent = '  '.repeat(depth)

      if (isEmptyValue(value)) return []

      if (Array.isArray(value)) {
        if (value.length === 0) return []
        return value.flatMap((item, index) => {
          if (isEmptyValue(item)) return []
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
          if (isEmptyValue(val)) return []
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
          const child = normalizeAnswer(val, depth + 1)
          if (!child.length) {
            const primitive = formatPrimitive(val)
            if (isEmptyValue(primitive) || primitive === 'Non renseigné') return []
            return [`${indent}${label} : ${primitive}`]
          }
          return [`${indent}${label} :`, ...child.map(line => `${'  '.repeat(depth + 1)}${line}`)]
        })
      }

      const formatted = formatPrimitive(value)
      if (isEmptyValue(formatted) || formatted === 'Non renseigné') return []

      return formatted
        .split(/\r?\n/)
        .filter(line => line.trim() !== '')
        .map(line => `${indent}${line}`)
    }

    let questionIndex = 1
    const drawQuestionBlock = (label: string, answer: unknown, column?: 'left' | 'right') => {
      // Si la réponse est null/undefined, ne pas afficher
      if (answer === null || answer === undefined) return
      const normalized = normalizeAnswer(answer)
      // Ne pas afficher si la réponse est vide après normalisation
      if (normalized.length === 0) return
      if (column) context.currentColumn = column
      const number = questionIndex++
      const questionMargin = 8 // Marge avant la question
      const currentY = getCurrentY()
      setCurrentY(currentY - questionMargin)
      
      // Badge numéro de question
      const x = getCurrentX()
      const badgeY = getCurrentY()
      context.page.drawRectangle({
        x,
        y: badgeY - 12,
        width: 20,
        height: 20,
        color: primaryColor,
        opacity: 0.2,
      })
      context.page.drawText(`${number}`, {
        x: x + 7,
        y: badgeY - 10,
        size: 10,
        font: boldFont,
        color: primaryColor,
      })
      
      // Label de la question avec indentation
      drawParagraph(label, { 
        font: boldFont, 
        size: 10, 
        color: textColor, 
        indent: 24,
        column: context.currentColumn 
      })
      drawAnswerBox(normalized, context.currentColumn)
    }

    const drawExplicitQuestion = (number: string, label: string, answer: unknown, column?: 'left' | 'right') => {
      // Si la réponse est null/undefined, ne pas afficher
      if (answer === null || answer === undefined) return
      const normalized = normalizeAnswer(answer)
      // Ne pas afficher si la réponse est vide après normalisation
      if (normalized.length === 0) return
      if (column) context.currentColumn = column
      const questionMargin = 6 // Marge avant la question
      const currentY = getCurrentY()
      setCurrentY(currentY - questionMargin)
      drawParagraph(`${number}. ${label}`, { font: boldFont, size: 10, color: textColor, column: context.currentColumn })
      drawAnswerBox(normalized, context.currentColumn)
    }

    const mapChoice = (value: string | null | undefined, mapping: Record<string, string>): string | null => {
      if (!value) return null
      const mapped = mapping[value]
      return mapped ?? null
    }

    // Section Résumé organisée en 2 colonnes
    drawSectionHeading('Résumé', 'left')
    drawParagraph(`Exporté le : ${new Date().toLocaleString('fr-FR')}`, { column: 'left' })
    drawParagraph(`Exporté par : ${profile.full_name ?? profile.email ?? 'Utilisateur'}`, { column: 'left' })
    drawParagraph(`Rôle : ${role === 'admin' ? 'Administrateur' : role === 'agent' ? 'Agent' : role}`, { column: 'left' })
    drawParagraph(`Client : ${clientInfo?.full_name ?? 'Non renseigné'}`, { column: 'left' })
    
    // Passer à la colonne droite
    context.currentColumn = 'right'
    drawParagraph(`Email : ${clientInfo?.email ?? 'Non renseigné'}`, { column: 'right' })
    drawParagraph(`Téléphone : ${clientInfo?.phone ?? 'Non renseigné'}`, { column: 'right' })
    drawParagraph(`Société : ${clientInfo?.company ?? 'Non renseignée'}`, { column: 'right' })
    drawParagraph(`Soumission ID : ${submission.id}`, { column: 'right' })
    drawParagraph(
      `Soumis le : ${
        submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('fr-FR') : 'Non renseigné'
      }`,
      { column: 'right' }
    )
    if (submission.processed_at) {
      drawParagraph(`Traité le : ${new Date(submission.processed_at).toLocaleString('fr-FR')}`, { column: 'right' })
    }
    
    // Organiser le contenu en alternant entre les colonnes gauche et droite
    drawSectionHeading('Informations transmises par l' + String.fromCharCode(39) + 'agent', 'left')
    if (agentFormData) {
      if (typeof agentFormData.generated_at === 'string') {
        drawParagraph(`Dernière mise à jour : ${new Date(agentFormData.generated_at).toLocaleString('fr-FR')}`, {
          font: boldFont,
          column: 'left',
        })
        const leftYUpdate = context.cursorYLeft
        setCurrentY(leftYUpdate - 4)
      }
      drawExplicitQuestion('A1', 'Fournisseur VOIP', agentFormData.voip_provider ?? 'Non renseigné')
      drawExplicitQuestion('A2', 'Numéro / Offre', agentFormData.voip_number ?? 'Non renseigné')
      
      // Passer à la colonne droite après quelques questions
      context.currentColumn = 'right'
      drawExplicitQuestion('A3', 'Configuration / Détails des prix', agentFormData.price_configuration ?? 'Non renseigné')
      drawExplicitQuestion(
        'A4',
        'Validité du lien',
        typeof agentFormData.expires_in_days === 'number'
          ? `${agentFormData.expires_in_days} jour(s)`
          : 'Non renseigné'
      )
      drawExplicitQuestion('A5', 'Observations de l' + String.fromCharCode(39) + 'agent', agentFormData.additional_notes ?? 'Non renseigné')
    } else {
      drawParagraph('Aucune information agent disponible.', { column: 'left' })
    }

    if (agentRawNotes) {
      const rightYUpdate = context.cursorYRight
      setCurrentY(rightYUpdate - 8)
      drawExplicitQuestion('A6', 'Notes complémentaires', agentRawNotes)
    }

    // Réinitialiser à la colonne gauche pour la suite
    context.currentColumn = 'left'
    const leftYReset = context.cursorYLeft
    const rightYReset = context.cursorYRight
    // Utiliser la plus basse des deux colonnes pour continuer
    const minY = Math.min(leftYReset, rightYReset)
    setCurrentY(minY - 12)

    const formData = (submission.data ?? {}) as Record<string, unknown>

    // Fonction pour alterner automatiquement entre les colonnes
    const alternateColumn = () => {
      const leftColY = context.cursorYLeft
      const rightColY = context.cursorYRight
      // Choisir la colonne avec le plus d'espace disponible
      context.currentColumn = leftColY > rightColY ? 'left' : 'right'
    }

    // ============================================
    // ORGANISATION DU FORMULAIRE EN SECTIONS LOGIQUES
    // ============================================
    
    // SECTION 1: INFORMATIONS DE FACTURATION
    const hasBillingInfo = formData.billing_company_name || formData.billing_contact_name || 
                           formData.billing_contact_phone || formData.billing_contact_email || 
                           formData.billing_address
    if (hasBillingInfo) {
      alternateColumn()
      drawSectionHeading('Informations de facturation', context.currentColumn)
      drawQuestionBlock('Nom de la compagnie *', formData.billing_company_name)
      drawQuestionBlock('Nom et prénom de la personne ressource *', formData.billing_contact_name)
      alternateColumn()
      drawQuestionBlock('Numéro de téléphone de la personne ressource *', formData.billing_contact_phone)
      drawQuestionBlock('Adresse courriel *', formData.billing_contact_email)
      alternateColumn()
      drawQuestionBlock('Adresse de facturation *', formData.billing_address)
    }

    // SECTION 2: NUMÉROS DE TÉLÉPHONE
    const phoneChoice = mapChoice(formData.phone_numbers_choice as string | undefined, {
      keep: 'Conserver mes numéros actuels',
      new: 'Activer de nouveaux numéros',
    })
    if (phoneChoice || formData.phone_numbers_to_keep) {
      alternateColumn()
      drawSectionHeading('Numéros de téléphone (DID, FAX et 1-800)', context.currentColumn)
      drawQuestionBlock('Souhaitez-vous activer de nouveaux numéros ? *', phoneChoice)
      alternateColumn()
      drawQuestionBlock('Numéros à conserver et transférer *', formData.phone_numbers_to_keep)
    }

    // SECTION 3: ADRESSES DE SERVICE
    if (formData.emergency_service_address || formData.outgoing_display_name) {
      alternateColumn()
      drawSectionHeading('Adresses de service', context.currentColumn)
      drawQuestionBlock('Adresse complète pour le service 911 *', formData.emergency_service_address)
      alternateColumn()
      drawQuestionBlock('Affichage sortant des postes *', formData.outgoing_display_name)
    }

    // SECTION 4: TÉLÉPHONES DE BUREAU IP
    const ipPhoneChoice = mapChoice(formData.ip_phone_choice as string | undefined, {
      keep: 'Je veux conserver mes appareils téléphoniques IP',
      buy: 'Je vais acheter de nouveaux appareils (facture d' + String.fromCharCode(39) + 'ouverture payée)',
      virtual: 'Je vais utiliser une solution 100% virtuelle',
    })
    if (ipPhoneChoice) {
      alternateColumn()
      drawSectionHeading('Téléphones de bureau IP', context.currentColumn)
      drawQuestionBlock('Stratégie pour les appareils téléphoniques *', ipPhoneChoice)
    }

    // SECTION 5: CONFIGURATION DES POSTES TÉLÉPHONIQUES
    if (formData.posts_count && Number(formData.posts_count) > 0) {
      alternateColumn()
      drawSectionHeading('Configuration des postes téléphoniques', context.currentColumn)
      drawQuestionBlock('Nombre de postes à configurer *', formData.posts_count)

      const postConfigs = Array.isArray(formData.post_configurations)
        ? (formData.post_configurations as Record<string, unknown>[])
        : []
      if (postConfigs.length) {
        postConfigs.forEach((post, index) => {
          alternateColumn()
          const label = typeof post.label === 'string' && post.label.trim() ? post.label : `Poste ${index + 1}`
          const lines = [
            `Téléphone virtuel sur cellulaire : ${post.virtualMobile ? 'Oui' : 'Non'}`,
            `Boîte vocale vers courriel : ${post.voicemailToMail ? 'Oui' : 'Non'}`,
          ]
          drawExplicitQuestion(`P${index + 1}`, label, lines)
        })
      }
    }

    // SECTION 6: INFORMATIONS SUR LES COLLABORATEURS
    if (formData.collaborators_identification || formData.collaborators_contacts) {
      alternateColumn()
      drawSectionHeading('Informations sur les collaborateurs', context.currentColumn)
      drawQuestionBlock('Noms, prénoms et extensions *', formData.collaborators_identification)
      alternateColumn()
      drawQuestionBlock('Courriels et numéros par extension *', formData.collaborators_contacts)
    }

    // SECTION 7: MENU D'ENTREPRISE
    const menuChoice = mapChoice(formData.include_company_menu as string | undefined, {
      fr: 'Oui, en français uniquement',
      en: 'Oui, en anglais uniquement',
      both: 'Oui, en français et en anglais',
      none: 'Non, je ne souhaite pas intégrer de menu',
    })
    if (menuChoice && menuChoice !== 'Non, je ne souhaite pas intégrer de menu') {
      alternateColumn()
      drawSectionHeading('Menu d' + String.fromCharCode(39) + 'entreprise', context.currentColumn)
      drawQuestionBlock('Souhaitez-vous intégrer un menu d' + String.fromCharCode(39) + 'entreprise ? *', menuChoice)
    }
    // Scripts de menu (seulement si menu activé et scripts remplis)
    if (menuChoice && menuChoice !== 'Non, je ne souhaite pas intégrer de menu') {
      if (formData.french_menu_script) {
        alternateColumn()
        drawQuestionBlock('Script du menu en français', formData.french_menu_script)
      }
      if (formData.english_menu_script) {
        alternateColumn()
        drawQuestionBlock('Script du menu en anglais', formData.english_menu_script)
      }
    }

    if (formData.include_company_menu !== 'none') {
      alternateColumn()
      drawSectionHeading('Enregistrement professionnel', context.currentColumn)
      drawQuestionBlock(
        'Souhaitez-vous un enregistrement professionnel ? *',
        mapChoice(formData.professional_recording as string | undefined, {
          ai: 'Oui, enregistrement voix IA (70$ / enregistrement / langue)',
          studio: 'Oui, enregistrement en studio (149$ / enregistrement / langue)',
          self: 'Non, je vais effectuer moi-même les enregistrements',
        })
      )
    }

    // SECTION 8: PORTABILITÉ DES NUMÉROS
    alternateColumn()
    drawSectionHeading('Portabilité des numéros', context.currentColumn)
    drawQuestionBlock(
      'Souhaitez-vous effectuer une portabilité ? *',
      mapChoice(formData.portability_choice as string | undefined, {
        yes: 'Oui, je souhaite transférer mes numéros existants',
        no: 'Non, je n’ai pas besoin de portabilité',
      })
    )

    if (formData.include_company_menu !== 'none') {
      alternateColumn()
      drawSectionHeading('Enregistrements audio du menu d' + String.fromCharCode(39) + 'entreprise', context.currentColumn)
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
        alternateColumn()
        const description =
          formData.professional_recording === 'ai'
            ? 'Enregistrement pris en charge par Simplicom (voix IA).'
            : formData.professional_recording === 'studio'
              ? 'Enregistrement pris en charge par Simplicom (studio professionnel).'
              : 'Les enregistrements seront réalisés par Simplicom.'
        drawQuestionBlock('Prise en charge des enregistrements', description)
      }
    }

    // Détails de portabilité (seulement si portabilité = oui)
    if (formData.portability_choice === 'yes') {
      if (formData.portability_contact_name) {
        alternateColumn()
        drawQuestionBlock('Nom du contact portabilité', formData.portability_contact_name)
      }
      if (formData.portability_contact_email) {
        alternateColumn()
        drawQuestionBlock('Courriel du contact portabilité', formData.portability_contact_email)
      }
      if (formData.portability_account_reference) {
        alternateColumn()
        drawQuestionBlock('Référence client / ID de compte', formData.portability_account_reference)
      }
      if (formData.portability_lines_count) {
        alternateColumn()
        drawQuestionBlock('Nombre de lignes à porter', formData.portability_lines_count)
      }
      if (formData.portability_numbers) {
        alternateColumn()
        // Gérer à la fois l'ancien format (string) et le nouveau format (array)
        const numbersText = Array.isArray(formData.portability_numbers)
          ? formData.portability_numbers.filter(n => n && n.trim()).join('\n')
          : String(formData.portability_numbers)
        if (numbersText) {
          drawQuestionBlock('Numéros à porter', numbersText)
        }
      }
      if (formData.portability_requested_date) {
        alternateColumn()
        drawQuestionBlock('Date souhaitée de portabilité', formData.portability_requested_date)
      }
      if (formData.portability_authorization_letter) {
        alternateColumn()
        drawQuestionBlock('Lien lettre d' + String.fromCharCode(39) + 'autorisation signée', formData.portability_authorization_letter)
      }
      if (formData.portability_last_invoice) {
        alternateColumn()
        drawQuestionBlock('Lien dernière facture opérateur', formData.portability_last_invoice)
      }
    }

    // SECTION 9: NOTIFICATION ADMINISTRATEUR
    if (formData.notify_admin) {
      alternateColumn()
      drawSectionHeading('Notification administrateur', context.currentColumn)
      const notifyText = formData.notify_admin === 'yes'
        ? (formData.admin_notification_email ? `Oui, adresse : ${formData.admin_notification_email}` : 'Oui')
        : 'Non'
      drawQuestionBlock('Souhaitez-vous notifier un administrateur ?', notifyText)
    }

    // SECTION 10: NOTES COMPLÉMENTAIRES
    if (formData.additional_notes) {
      alternateColumn()
      drawSectionHeading('Notes et informations complémentaires', context.currentColumn)
      drawQuestionBlock('Notes supplémentaires', formData.additional_notes)
    }

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

