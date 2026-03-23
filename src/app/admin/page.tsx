"use client"

import { useTranslation } from "@/components/language-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Mail, Clock, Hash, Shield, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

export default function AdminPage() {
  const { t, language } = useTranslation()
  const [profiles, setProfiles] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setProfiles(data)
    }
    load()
  }, [])

  return (
    <div className="space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-destructive font-bold text-sm tracking-widest uppercase">
            <Shield className="w-4 h-4" />
            <span>{t("admin_panel")}</span>
          </div>
          <h2 className="text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            {t("system_mgmt")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl">
            {t("dashboard_desc")}
          </p>
        </div>
        <div className="w-full sm:w-auto">
           <div className="relative group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
             <Input 
                placeholder={t("search_businesses")}
                className="pl-10 h-12 bg-accent/20 border-border focus:border-primary/30 w-full sm:w-64 rounded-xl"
             />
           </div>
        </div>
      </div>

      <div className="grid gap-8">
        <Card className="glass border-border shadow-3xl overflow-hidden pt-2">
          <div className="h-1 w-full bg-gradient-to-r from-destructive via-red-500 to-transparent" />
          <CardHeader className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-foreground flex items-center">
                  <Users className="w-6 h-6 mr-3 text-destructive" />
                  {t("recent_registrations")}
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1">
                   {language === 'sq' ? 'Lista e bizneseve që janë bashkuar së fundmi' : 'List of recently joined businesses'}
                </CardDescription>
              </div>
              <div className="px-4 py-2 rounded-xl bg-accent/20 border border-border text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {t("total")}: {profiles.length}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-accent/10 border-y border-border">
                    <th className="h-14 px-8 text-left align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">{t("business_name")}</th>
                    <th className="h-14 px-8 text-left align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Email</th>
                    <th className="h-14 px-8 text-left align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">{t("fiscal_number")}</th>
                    <th className="h-14 px-8 text-left align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Role</th>
                    <th className="h-14 px-8 text-left align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profiles.map((p) => (
                    <tr key={p.id} className="group hover:bg-accent/5 transition-colors">
                      <td className="p-8 align-middle">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive font-bold group-hover:scale-110 transition-transform">
                             {p.business_name[0].toUpperCase()}
                           </div>
                           <div className="font-bold text-foreground transition-colors">{p.business_name}</div>
                        </div>
                      </td>
                      <td className="p-8 align-middle text-zinc-500">
                         <div className="flex items-center">
                           <Mail className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                           {p.email}
                         </div>
                      </td>
                      <td className="p-8 align-middle font-mono text-zinc-500 tracking-tighter text-xs">
                         <div className="flex items-center">
                            <Hash className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                            {p.fiscal_number}
                         </div>
                      </td>
                      <td className="p-8 align-middle">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                          p.role === 'admin' 
                            ? 'bg-destructive/10 text-destructive border-destructive/20' 
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          {p.role}
                        </div>
                      </td>
                      <td className="p-8 align-middle text-zinc-500">
                        <div className="flex items-center">
                           <Clock className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                           {new Date(p.created_at).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
