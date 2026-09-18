import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: "Përdoruesi dhe fjalëkalimi janë të detyrueshëm." },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Konfigurimi i Supabase mungon." },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })

    const cleanUsername = String(username).trim().toLowerCase()
    const cleanPassword = String(password).trim()

    // 1. Try RPC function first (if created in DB)
    const { data: rpcWorker, error: rpcError } = await supabase.rpc('verify_worker_login', {
      p_username: cleanUsername,
      p_password: cleanPassword,
    })

    if (rpcWorker) {
      return NextResponse.json({
        worker: {
          id: rpcWorker.id,
          business_id: rpcWorker.business_id,
          first_name: rpcWorker.first_name,
          last_name: rpcWorker.last_name,
          username: rpcWorker.username,
          password_hash: cleanPassword,
          role: rpcWorker.role,
          shift_start_time: rpcWorker.shift_start_time,
          shift_end_time: rpcWorker.shift_end_time,
          work_days: rpcWorker.work_days,
          is_active: rpcWorker.is_active,
        },
        businessEmail: rpcWorker.business_email,
        businessName: rpcWorker.business_name,
      })
    }

    // 2. Direct table fallback search
    const { data: workers, error: queryError } = await supabase
      .from('workers')
      .select('*, profiles:business_id(email, business_name, fiscal_number)')
      .eq('is_active', true)

    if (queryError || !workers || workers.length === 0) {
      return NextResponse.json(
        { error: "Llogaria e punëtorit nuk u gjet ose nuk keni ekzekutuar skriptin SQL në Supabase." },
        { status: 401 }
      )
    }

    const matched = workers.find((w: any) => {
      const uMatch = w.username?.toLowerCase() === cleanUsername
      const nameMatch = `${w.first_name} ${w.last_name}`.toLowerCase() === cleanUsername
      return (uMatch || nameMatch) && String(w.password_hash).trim() === cleanPassword
    })

    if (!matched) {
      return NextResponse.json(
        { error: "Përdoruesi ose fjalëkalimi është i pasaktë." },
        { status: 401 }
      )
    }

    return NextResponse.json({
      worker: matched,
      businessEmail: matched.profiles?.email,
      businessName: matched.profiles?.business_name,
    })
  } catch (err: any) {
    console.error("Worker login API error:", err)
    return NextResponse.json(
      { error: err.message || "Ndodhi një gabim gjatë kyçjes së punëtorit." },
      { status: 500 }
    )
  }
}
