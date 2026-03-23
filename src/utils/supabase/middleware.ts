import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 1. Defino rrugët e rëndësishme
  const isAuthCallback = pathname.startsWith('/auth')
  const isUpdatePasswordRoute = pathname.startsWith('/update-password')
  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/dashboard')
  const isAuthFormRoute = pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password')

  // 2. LEJO AUTH CALLBACK: Ky rresht rregullon gabimin "auth-code-error"
  // Lejon Supabase-in të shkëmbejë kodin nga emaili me një sesion real
  if (isAuthCallback) {
    return supabaseResponse
  }

  // 3. MBROJTJA: Nëse s'ka user dhe tenton Dashboard, dërgoje në Login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 4. PAS LOGINIT: Nëse ka user dhe tenton Login/Register, dërgoje në Dashboard
  // POR: Mos e blloko nëse është duke ndryshuar fjalëkalimin (update-password)
  if (user && isAuthFormRoute && !isUpdatePasswordRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // 5. ROLE-BASED ACCESS (ADMIN)
  if (user && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}