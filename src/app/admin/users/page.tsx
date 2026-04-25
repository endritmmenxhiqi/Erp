"use client"

import { useTranslation } from "@/components/language-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Mail, Clock, Hash, Shield, Search, Sparkles, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { Spinner } from "@/components/spinner"

interface Profile {
  id: string
  business_name: string
  email: string
  fiscal_number: string
  role: string
  created_at: string
  ai_enabled: boolean
}

export default function AdminUsersPage() {
  const { t, language } = useTranslation()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setProfiles(data as Profile[])
      setIsLoading(false)
    }
    load()
  }, [supabase])

  const toggleAI = async (profileId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ai_enabled: !currentStatus })
        .eq('id', profileId)

      if (error) throw error

      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, ai_enabled: !currentStatus } : p))
      toast.success(language === 'sq' ? "Statusi i AI u ndryshua" : "AI Status updated")
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filteredProfiles = profiles.filter(p => 
    p.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.fiscal_number.includes(searchQuery)
  )

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-destructive font-bold text-sm tracking-widest uppercase">
            <Shield className="w-4 h-4" />
            <span>{t("admin_panel")}</span>
          </div>
          <h2 className="text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            {t("user_mgmt")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl">
            {language === 'sq' ? 'Menaxhoni bizneset, licencat dhe veçoritë e sistemit.' : 'Manage businesses, licenses and system features.'}
          </p>
        </div>
        <div className="w-full sm:w-auto">
           <div className="relative group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
             <Input 
                placeholder={t("search_businesses")}
                className="pl-10 h-12 bg-accent/20 border-border focus:border-primary/30 w-full sm:w-64 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                   {language === 'sq' ? 'Lista e të gjitha bizneseve në platformë' : 'List of all businesses on the platform'}
                </CardDescription>
              </div>
              <div className="px-4 py-2 rounded-xl bg-accent/20 border border-border text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {t("total")}: {filteredProfiles.length}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <div className="relative w-full overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-accent/10 border-y border-border">
                      <th className="h-14 px-8 text-left align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">{t("business_name")}</th>
                      <th className="h-14 px-8 text-left align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Email / {t("fiscal_number")}</th>
                      <th className="h-14 px-8 text-center align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">AI Feature</th>
                      <th className="h-14 px-8 text-left align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Role / Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProfiles.map((p) => (
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
                           <div className="flex flex-col space-y-1">
                             <div className="flex items-center">
                               <Mail className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                               {p.email}
                             </div>
                             <div className="flex items-center font-mono text-[10px] tracking-tighter">
                                <Hash className="w-3 h-3 mr-2 text-zinc-400" />
                                {p.fiscal_number}
                             </div>
                           </div>
                        </td>
                        <td className="p-8 align-middle text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                             <div className="flex items-center space-x-3 bg-muted/30 p-2 rounded-2xl border border-border/50">
                                <Sparkles className={`w-4 h-4 ${p.ai_enabled ? 'text-yellow-500' : 'text-zinc-500'}`} />
                                <Switch 
                                  checked={p.ai_enabled} 
                                  onCheckedChange={() => toggleAI(p.id, p.ai_enabled)}
                                  className="data-[state=checked]:bg-yellow-500"
                                />
                             </div>
                             <span className={`text-[10px] font-black uppercase tracking-widest ${p.ai_enabled ? 'text-yellow-600' : 'text-zinc-500'}`}>
                               {p.ai_enabled ? (language === 'sq' ? 'Aktiv' : 'Active') : (language === 'sq' ? 'Pasiv' : 'Inactive')}
                             </span>
                          </div>
                        </td>
                        <td className="p-8 align-middle">
                          <div className="flex flex-col space-y-2">
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border w-fit ${
                              p.role === 'admin' 
                                ? 'bg-destructive/10 text-destructive border-destructive/20' 
                                : 'bg-primary/10 text-primary border-primary/20'
                            }`}>
                              {p.role}
                            </div>
                            <div className="flex items-center text-zinc-500 text-xs">
                               <Clock className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                               {new Date(p.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
