import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

const STORAGE_BUCKET = process.env.FORMS_STORAGE_BUCKET ?? 'form-assets'
const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15 MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Configuration serveur incomplète pour le stockage.' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const categoryRaw = formData.get('category')
    const category =
      typeof categoryRaw === 'string' && categoryRaw.trim().length > 0
        ? categoryRaw.trim()
        : 'uploads'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Le fichier dépasse la taille maximale autorisée (15 Mo).' },
        { status: 413 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const supabase = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const safeCategory = category.replace(/[^a-zA-Z0-9/_-]/g, '')
    const filePath = `${safeCategory}/${randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase storage upload error', uploadError)
      return NextResponse.json(
        {
          error: 'Échec du téléversement du fichier.',
          details: uploadError instanceof Error ? uploadError.message : String(uploadError),
        },
        { status: 500 }
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath)

    return NextResponse.json({ url: publicUrl }, { status: 201 })
  } catch (error) {
    console.error('Unhandled upload error', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

