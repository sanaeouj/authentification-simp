import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type {
  Database,
  MagicLink,
  Client,
  Agent,
} from '@/lib/types/database.types'
import { requireRole } from '@/lib/utils/auth'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Ensure caller is administrator
    try {
      await requireRole(['admin'])
    } catch {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // not used in this read-only route
            return
          },
          remove() {
            // not used in this read-only route
            return
          },
        },
      }
    )

    const {
      data,
      error,
    }: {
      data:
        | (MagicLink & {
            clients: Pick<Client, 'id' | 'full_name' | 'email'>
            agents: Agent
          })[]
        | null
      error: unknown
    } = await supabase
      .from('magic_links')
      .select(
        `
          *,
          clients:clients(id,full_name,email),
          agents:agents(*)
        `
      )

    if (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch links'
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }

    const links = data ?? []
    const count: number = links.length

    return NextResponse.json({ success: true, links, count }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}