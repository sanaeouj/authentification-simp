import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database, MagicLink } from '@/lib/types/database.types'
import { requireRole } from '@/lib/utils/auth'

interface RequestBody {
  link_id: string
}

/** Simple non-empty string guard */
const isString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Ensure caller has admin role
    try {
      await requireRole(['admin'])
    } catch {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const bodyRaw = (await request.json()) as Partial<RequestBody>
    if (!isString(bodyRaw.link_id)) {
      return NextResponse.json({ success: false, error: 'link_id is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error: missing Supabase credentials.' },
        { status: 500 }
      )
    }

    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const {
      data,
      error,
    }: { data: MagicLink | null; error: unknown } = await supabase
      .from('magic_links')
      .delete()
      .eq('id', bodyRaw.link_id)
      .select()
      .single()

    if (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke magic link'
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Magic link not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, link: data }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}