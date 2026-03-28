import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { ChatDB } from "@/components/ChatDB"

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
    // If fetch fails or auth call errors, redirect to login
    // so the app doesn't crash with an unhandled error in auth-js
    // and surface a clearer message in server logs.
    // eslint-disable-next-line no-console
    console.error('Supabase auth.getUser error:', err)
    return redirect('/login')
  }

  if (!user) {
    return redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const signOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    return redirect("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar 
        email={user.email!} 
        role={profile?.role || 'user'} 
        signOutAction={signOut} 
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 sm:p-12 max-w-7xl mx-auto">
          {children}
        </div>
        <ChatDB />
      </main>
    </div>
  )
}
