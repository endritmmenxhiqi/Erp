import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/login")
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
      </main>
    </div>
  )
}
