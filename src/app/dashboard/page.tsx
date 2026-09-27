"use client"

import { useTranslation } from "@/components/language-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StaffService } from "@/lib/services/staff"
import { 
  Briefcase, 
  Phone, 
  MapPin, 
  Hash, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Rocket, 
  FileText, 
  Users, 
  Package, 
  BarChart3, 
  Settings, 
  UserCog, 
  ChevronRight,
  Truck,
  ClipboardList,
  UtensilsCrossed,
  AlertTriangle,
  Lightbulb,
  ArrowRight
} from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"

interface Profile {
  id: string
  business_name: string
  email: string
  fiscal_number: string
  phone_number: string
  address: string
  role: string
  created_at: string
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [aiAdvisor, setAiAdvisor] = useState<any>({
    greeting: "Mirësevini në qendrën e kontrollit operativ.",
    health_score: 95,
    status_summary: "Sistemi funksionon me parametra optimalë. Shitjet dhe furnizimet janë të balancuara.",
    top_opportunity: "Krijoni oferta të reja me asistentin me zë për të rritur konvertimet këtë javë.",
    top_warning: "Kontrolloni artikujt me sasi të ulët në depo para furnizimit të radhës.",
    recommended_actions: [
      "Verifiko faturat e hapura tek Klientët & CRM",
      "Kontrollo tavolinat aktive në modulin Restorant",
      "Përdor kamerën e telefonit për skanim faturash blerje"
    ]
  })
  const supabase = createClient()
  
  const menuItems = [
    { title: t("sales"), href: "/dashboard/sales", icon: Users, tone: "text-emerald-500", badge: "POS" },
    { title: t("orders"), href: "/dashboard/orders", icon: ClipboardList, tone: "text-blue-500", badge: "AI Voice" },
    { title: t("restaurant"), href: "/dashboard/tables", icon: UtensilsCrossed, tone: "text-amber-500", badge: "Live" },
    { title: t("clients"), href: "/dashboard/clients", icon: Users, tone: "text-cyan-500", badge: "CRM" },
    { title: t("purchases"), href: "/dashboard/purchases", icon: Rocket, tone: "text-indigo-500", badge: "AI OCR" },
    { title: t("suppliers"), href: "/dashboard/suppliers", icon: Truck, tone: "text-purple-500" },
    { title: t("products"), href: "/dashboard/products", icon: Package, tone: "text-violet-500" },
    { title: t("purchases_book"), href: "/dashboard/purchases-book", icon: FileText, tone: "text-orange-500" },
    { title: t("sales_book"), href: "/dashboard/sales-book", icon: FileText, tone: "text-sky-500" },
    { title: t("reports"), href: "/dashboard/reports", icon: BarChart3, tone: "text-rose-500" },
    { title: t("consumption"), href: "/dashboard/consumption", icon: Settings, tone: "text-zinc-500" },
    { title: t("staff_mgmt"), href: "/dashboard/staff", icon: UserCog, tone: "text-indigo-400" },
  ]

  useEffect(() => {
    async function load() {
      const businessId = await StaffService.getEffectiveBusinessId(supabase)
      if (businessId) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', businessId)
          .single()
        setProfile(data as Profile)
      }
      setIsLoading(false)
    }
    load()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="space-y-12 animate-in fade-in duration-500">
        <div className="flex flex-col space-y-2">
          <div className="h-4 w-32 bg-primary/10 rounded-full animate-pulse" />
          <div className="h-10 w-64 bg-muted/50 rounded-xl animate-pulse" />
          <div className="h-4 w-80 bg-muted/30 rounded-full animate-pulse" />
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="col-span-1 lg:col-span-2 h-64 rounded-3xl bg-muted/20 border border-border animate-pulse" />
          <div className="h-64 rounded-3xl bg-muted/20 border border-border animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2 text-primary font-bold text-sm tracking-widest uppercase">
          <Sparkles className="w-4 h-4" />
          <span>{t("welcome_back")}</span>
        </div>
        <h2 className="text-5xl font-extrabold tracking-tight text-foreground leading-tight">
          {t("business_dashboard")}
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl">
          {t("dashboard_desc")}
        </p>
      </div>

      {/* AI Business Advisor Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-950/40 via-indigo-950/20 to-card border border-blue-800/40 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Asistenti Kryesor
              </span>
              <span className="text-xs text-muted-foreground">Analizë Operative në Kohë Reale</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-foreground">
              {aiAdvisor.greeting}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {aiAdvisor.status_summary}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-background/60 backdrop-blur-md p-4 rounded-2xl border border-border/80 shrink-0">
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Health Score</div>
              <div className="text-3xl font-black text-emerald-400 mt-0.5">{aiAdvisor.health_score}%</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="space-y-1 text-xs">
              <div className="flex items-center text-emerald-400 font-semibold gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Trend Pozitiv
              </div>
              <div className="text-muted-foreground">Likuiditet i Qëndrueshëm</div>
            </div>
          </div>
        </div>

        {/* AI Actionable Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 pt-5 border-t border-border/60">
          <div className="p-3.5 rounded-xl bg-accent/25 border border-border/60 flex items-start space-x-3">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-foreground">Mundësi Rritjeje:</div>
              <p className="text-xs text-muted-foreground mt-0.5">{aiAdvisor.top_opportunity}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-accent/25 border border-border/60 flex items-start space-x-3">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-foreground">Vëmendje Operative:</div>
              <p className="text-xs text-muted-foreground mt-0.5">{aiAdvisor.top_warning}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of All Modules */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground tracking-tight">Modulet e Sistemit</h3>
          <span className="text-xs text-muted-foreground">12 Module Aktive</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <Card className="glass border-border h-full hover:border-primary/40 hover:bg-accent/30 transition-all group relative overflow-hidden">
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-accent/40 border border-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Icon className={`w-5 h-5 ${item.tone}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground truncate">{item.title}</div>
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-1" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Stats Quick View */}
        <Card className="glass border-border col-span-1 lg:col-span-2 shadow-2xl overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
             <TrendingUp className="w-32 h-32 text-primary" />
          </div>
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-2xl font-bold text-foreground flex items-center">
              <Briefcase className="w-6 h-6 mr-3 text-primary" />
              {profile?.business_name || '...'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">{t("acc_settings")}</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-4">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                    <Hash className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{t("fiscal_number")}</div>
                    <div className="text-lg font-semibold text-foreground tracking-tight">{profile?.fiscal_number}</div>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{t("phone_number")}</div>
                    <div className="text-lg font-semibold text-foreground tracking-tight">{profile?.phone_number}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                 <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{t("address")}</div>
                    <div className="text-lg font-semibold text-foreground leading-snug">{profile?.address}</div>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{t("type")}</div>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 uppercase tracking-widest mt-1">
                      {t("auth.success_login").split('!')[0]}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="glass border-border shadow-2xl">
          <CardHeader className="p-8">
            <CardTitle className="text-xl font-bold text-foreground">{t("acc_settings")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("settings")}</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Email</div>
              <div className="text-sm font-medium text-foreground break-all">{profile?.email}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{t("date")}</div>
              <div className="text-sm font-medium text-foreground">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '...'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
