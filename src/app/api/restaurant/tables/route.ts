import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error("Mungon konfigurimi i Supabase.")
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  })
}

async function getBusinessId(request: NextRequest): Promise<string | null> {
  // 1. Check worker session cookie
  const cookieStore = await cookies()
  const workerCookie = cookieStore.get("worker_session")?.value
  if (workerCookie) {
    try {
      const parsed = JSON.parse(workerCookie)
      if (parsed.business_id) return parsed.business_id
    } catch {}
  }

  // 2. Check auth header or Supabase auth session token
  const authHeader = request.headers.get("authorization")
  if (authHeader) {
    try {
      const token = authHeader.replace("Bearer ", "")
      const supabase = getSupabaseAdmin()
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) return user.id
    } catch {}
  }

  // 3. Fallback: check query param or body business_id
  const url = new URL(request.url)
  const queryBiz = url.searchParams.get("business_id")
  if (queryBiz) return queryBiz

  return null
}

// ─── GET: Fetch All Tables ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const businessId = await getBusinessId(request)

    let query = supabase.from("restaurant_tables").select("*").order("id", { ascending: true })

    if (businessId) {
      query = query.eq("user_id", businessId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tables: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── POST: Create New Table ─────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()
    const { table_number, zone, capacity, business_id } = body

    const targetBusinessId = business_id || (await getBusinessId(request))
    if (!targetBusinessId) {
      return NextResponse.json({ error: "Nuk u gjet ID-ja e biznesit." }, { status: 400 })
    }

    if (!table_number) {
      return NextResponse.json({ error: "Numri/emri i tavolinës është i detyrueshëm." }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("restaurant_tables")
      .insert({
        table_number: String(table_number).trim(),
        zone: String(zone || "Brenda").trim(),
        capacity: Number(capacity) || 4,
        status: "E lire",
        active_bill_total: 0,
        current_order: [],
        user_id: targetBusinessId
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ table: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── PUT: Update Table (Edit, Move Zone, Update Order/Status) ───
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()
    const { id, table_number, zone, capacity, status, active_bill_total, current_order, waiter_name } = body

    if (!id) {
      return NextResponse.json({ error: "ID e tavolinës mungon." }, { status: 400 })
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (table_number !== undefined) updates.table_number = String(table_number).trim()
    if (zone !== undefined) updates.zone = String(zone).trim()
    if (capacity !== undefined) updates.capacity = Number(capacity) || 4
    if (status !== undefined) updates.status = status
    if (active_bill_total !== undefined) updates.active_bill_total = Number(active_bill_total) || 0
    if (current_order !== undefined) updates.current_order = current_order
    if (waiter_name !== undefined) updates.waiter_name = waiter_name

    const { data, error } = await supabase
      .from("restaurant_tables")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ table: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── DELETE: Remove Table ───────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID e tavolinës mungon." }, { status: 400 })
    }

    const { error } = await supabase
      .from("restaurant_tables")
      .delete()
      .eq("id", Number(id))

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
