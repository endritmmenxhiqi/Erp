import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { AppSidebar } from "@/components/app-sidebar"
import { ChatDB } from "@/components/ChatDB"
import { ImpersonationBanner } from "@/components/impersonation-banner"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  let user = null
  try {
    const {
      data: { user: u },
    } = await supabase.auth.getUser()
    user = u
  } catch (err) {
    // If fetch fails or auth call errors, check for worker session before redirecting
    console.error('Supabase auth.getUser error:', err)
  }

  // Check for worker session cookie
  const cookieStore = await cookies()
  const workerSessionCookie = cookieStore.get('worker_session')?.value
  let workerSession: any = null
  if (workerSessionCookie) {
    try {
      workerSession = JSON.parse(workerSessionCookie)
    } catch {
      workerSession = null
    }
  }

  // If neither Supabase user nor worker session, redirect to login
  if (!user && !workerSession) {
    return redirect('/login')
  }

  let profile: any = null
  let email = ''
  let role = 'user'
  let aiEnabled = false

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, ai_enabled')
      .eq('id', user.id)
      .single()
    profile = data
    email = user.email || ''
    role = profile?.role || 'user'
    aiEnabled = profile?.ai_enabled || false
  } else if (workerSession) {
    // Worker session - use worker info
    email = `${workerSession.first_name} ${workerSession.last_name}`
    role = workerSession.role || 'seller'
    aiEnabled = false
  }

  const signOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    // Clear worker session cookie
    const cookieStore = await cookies();
    cookieStore.delete('worker_session');
    return redirect("/login");
  };

  return (
    <div className="flex min-h-screen bg-background print:block print:bg-white print:min-h-0 print:h-auto">
      <AppSidebar 
        email={email} 
        role={role} 
        signOutAction={signOut} 
      />
      <main className="flex-1 overflow-y-auto print:overflow-visible print:p-0">
        <ImpersonationBanner />
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 0; }
            body { margin: 0; padding: 0; }
            .print-padding { padding: 15mm !important; }
          }
        `}} />
        <div className="p-8 sm:p-12 max-w-7xl mx-auto print:p-0 print:max-w-none">
          <div className="hidden print:block print-padding">
            {/* Print wrapper */}
          </div>
          {children}
        </div>
        {aiEnabled && (
          <div className="print:hidden">
            <ChatDB />
          </div>
        )}
      </main>
    </div>
  )
}
