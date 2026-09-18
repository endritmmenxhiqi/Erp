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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Konfigurimi i Supabase mungon." },
        { status: 500 }
      )
    }

    // Use service role key if available for admin operations
    const adminKey = supabaseServiceKey || supabaseAnonKey
    const supabase = createClient(supabaseUrl, adminKey, {
      auth: { persistSession: false }
    })

    const cleanUsername = String(username).trim().toLowerCase()
    const cleanPassword = String(password).trim()

    let matchedWorker: any = null
    let businessEmail: string | undefined
    let businessName: string | undefined

    // 1. Try RPC function first (if created in DB)
    const { data: rpcWorker, error: rpcError } = await supabase.rpc('verify_worker_login', {
      p_username: cleanUsername,
      p_password: cleanPassword,
    })

    if (rpcWorker) {
      matchedWorker = {
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
      }
      businessEmail = rpcWorker.business_email
      businessName = rpcWorker.business_name
    } else {
      // 2. Direct table fallback search
      const { data: workers, error: queryError } = await supabase
        .from('workers')
        .select('*, profiles:business_id(email, business_name, fiscal_number)')
        .eq('is_active', true)

      if (!queryError && workers && workers.length > 0) {
        matchedWorker = workers.find((w: any) => {
          const uMatch = w.username?.toLowerCase() === cleanUsername
          const nameMatch = `${w.first_name} ${w.last_name}`.toLowerCase() === cleanUsername
          return (uMatch || nameMatch) && String(w.password_hash).trim() === cleanPassword
        })

        if (matchedWorker) {
          businessEmail = matchedWorker.profiles?.email
          businessName = matchedWorker.profiles?.business_name
        }
      }
    }

    if (!matchedWorker) {
      return NextResponse.json(
        { error: "Përdoruesi ose fjalëkalimi është i pasaktë." },
        { status: 401 }
      )
    }

    // If we have the service role key, generate a session for the business user
    // so the worker's client-side Supabase queries work with RLS
    let sessionData: any = null
    if (supabaseServiceKey) {
      try {
        // Generate a magic link for the business user (returns tokens without sending email)
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: businessEmail!,
        })

        if (!linkError && linkData) {
          // Exchange the OTP for a session
          const anonSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false }
          })
          
          const { data: session, error: verifyError } = await anonSupabase.auth.verifyOtp({
            email: businessEmail!,
            token: linkData.properties?.hashed_token || '',
            type: 'magiclink',
          })

          if (!verifyError && session?.session) {
            sessionData = {
              access_token: session.session.access_token,
              refresh_token: session.session.refresh_token,
            }
          }
        }
      } catch (sessionErr) {
        console.warn("Could not generate business session for worker:", sessionErr)
        // Continue without session - worker will use cookie-only mode
      }
    }

    const response = NextResponse.json({
      worker: matchedWorker,
      businessEmail,
      businessName,
      session: sessionData,
    })

    // Set cookie so Next.js middleware and DashboardLayout allow the worker session
    response.cookies.set('worker_session', JSON.stringify({
      id: matchedWorker.id,
      business_id: matchedWorker.business_id,
      first_name: matchedWorker.first_name,
      last_name: matchedWorker.last_name,
      username: matchedWorker.username,
      role: matchedWorker.role,
      business_email: businessEmail,
      business_name: businessName,
    }), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      httpOnly: false,
    })

    return response
  } catch (err: any) {
    console.error("Worker login API error:", err)
    return NextResponse.json(
      { error: err.message || "Ndodhi një gabim gjatë kyçjes së punëtorit." },
      { status: 500 }
    )
  }
}
