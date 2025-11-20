import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/utils/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Vérifier les permissions
    const role = await getUserRole()
    const allowedRoles: Array<'admin' | 'support' | 'agent'> = ['admin', 'support', 'agent']
    
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    // Utiliser le client admin avec service role key pour accéder au storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Configuration serveur incomplète.' },
        { status: 500 }
      )
    }

    const supabase = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    const url = new URL(request.url)
    const fileUrl = url.searchParams.get('url')

    if (!fileUrl) {
      return NextResponse.json({ error: 'URL du fichier requise.' }, { status: 400 })
    }

    // Extraire le chemin du fichier depuis l'URL Supabase
    // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    const urlObj = new URL(fileUrl)
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
    
    if (!pathMatch) {
      return NextResponse.json({ error: 'URL de fichier invalide.' }, { status: 400 })
    }

    const [, bucket, filePath] = pathMatch

    // Télécharger le fichier depuis Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath)

    if (error) {
      console.error('Error downloading file:', error)
      return NextResponse.json(
        { error: 'Impossible de télécharger le fichier.' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Fichier introuvable.' },
        { status: 404 }
      )
    }

    // Convertir le Blob en ArrayBuffer
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Déterminer le type MIME et le nom du fichier
    const fileName = filePath.split('/').pop() || 'file'
    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    
    let contentType = 'application/octet-stream'
    if (extension === 'pdf') {
      contentType = 'application/pdf'
    } else if (extension === 'mp3') {
      contentType = 'audio/mpeg'
    }

    // Retourner le fichier
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Unhandled error while downloading file:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors du téléchargement.' },
      { status: 500 }
    )
  }
}

