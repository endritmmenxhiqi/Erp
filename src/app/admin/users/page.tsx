"use client"

import { useTranslation } from "@/components/language-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Mail, Clock, Hash, Shield, Search, Sparkles, LogIn, ExternalLink, ShieldAlert, CheckCircle2, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { Spinner } from "@/components/spinner"
import { useRouter } from "next/navigation"

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
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBusiness, setSelectedBusiness] = useState<Profile | null>(null)
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false)
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

  const handleOpenAccessModal = (profile: Profile) => {
    setSelectedBusiness(profile)
    setIsAccessModalOpen(true)
  }

  const handleImpersonate = (type: "direct" | "request") => {
    if (!selectedBusiness) return

    sessionStorage.setItem("impersonated_business_id", selectedBusiness.id)
    sessionStorage.setItem("impersonated_business_name", selectedBusiness.business_name)
    localStorage.setItem("impersonated_business_id", selectedBusiness.id)
    localStorage.setItem("impersonated_business_name", selectedBusiness.business_name)

    if (type === "direct") {
      toast.success(`Hyrje e drejtpërdrejtë e autorizuar në: ${selectedBusiness.business_name}`)
    } else {
      toast.success(`Kërkesa u regjistrua. Duke u kyçur në: ${selectedBusiness.business_name}`)
    }

    setIsAccessModalOpen(false)
    router.push("/dashboard")
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
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            {t("user_mgmt")}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl">
            {language === 'sq' ? 'Menaxhoni bizneset, licencat, veçoritë e AI dhe qasuni në çdo llogari.' : 'Manage businesses, licenses, AI features and access any account.'}
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
                      <th className="h-14 px-6 text-left align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">{t("business_name")}</th>
                      <th className="h-14 px-6 text-left align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Email / {t("fiscal_number")}</th>
                      <th className="h-14 px-6 text-center align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">AI Feature</th>
                      <th className="h-14 px-6 text-left align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Role / Date</th>
                      <th className="h-14 px-6 text-right align-middle font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Qasja në Biznes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProfiles.map((p) => (
                      <tr key={p.id} className="group hover:bg-accent/5 transition-colors">
                        <td className="p-6 align-middle">
                          <div className="flex items-center space-x-3">
                             <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive font-bold group-hover:scale-110 transition-transform">
                               {p.business_name[0]?.toUpperCase() || 'B'}
                             </div>
                             <div className="font-bold text-foreground transition-colors">{p.business_name}</div>
                          </div>
                        </td>
                        <td className="p-6 align-middle text-zinc-500">
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
                        <td className="p-6 align-middle text-center">
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
                        <td className="p-6 align-middle">
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
                        <td className="p-6 align-middle text-right">
                          <Button
                            onClick={() => handleOpenAccessModal(p)}
                            className="h-10 px-4 rounded-xl bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/20 font-bold text-xs transition-all shadow-sm"
                          >
                            <LogIn className="w-3.5 h-3.5 mr-1.5" />
                            {t("impersonate_business")}
                          </Button>
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

      {/* Impersonation & Direct Override Dialog */}
      <Dialog open={isAccessModalOpen} onOpenChange={setIsAccessModalOpen}>
        <DialogContent className="glass border-border rounded-3xl max-w-lg">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-2">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-black text-center">
              {t("impersonate_business")}
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              Zgjidhni mënyrën e qasjes administrative në llogarinë e <span className="font-bold text-foreground">{selectedBusiness?.business_name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Option 1: Direct Entry (No Approval) */}
            <div 
              onClick={() => handleImpersonate("direct")}
              className="p-5 rounded-2xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center text-destructive group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm flex items-center">
                      {t("direct_override")}
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground font-black uppercase">
                        Super Admin
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("direct_override_desc")}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-destructive" />
              </div>
            </div>

            {/* Option 2: Request Access */}
            <div 
              onClick={() => handleImpersonate("request")}
              className="p-5 rounded-2xl border border-border/80 bg-accent/20 hover:bg-accent/40 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{t("access_request")}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("request_access_desc")}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAccessModalOpen(false)}
              className="w-full rounded-xl border-border"
            >
              {t("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
