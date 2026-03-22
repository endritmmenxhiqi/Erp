"use client"

import { useTranslation } from "@/components/language-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Phone, MapPin, Hash, Sparkles, TrendingUp, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

export default function DashboardPage() {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    load()
  }, [])

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
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Status</div>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 uppercase tracking-widest mt-1">
                      Active
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
            <CardTitle className="text-xl font-bold text-foreground">Account</CardTitle>
            <CardDescription className="text-muted-foreground">Credentials</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Email</div>
              <div className="text-sm font-medium text-foreground break-all">{profile?.email}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Member Since</div>
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
