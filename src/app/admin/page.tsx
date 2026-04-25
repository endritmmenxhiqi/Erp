"use client"

import { useTranslation } from "@/components/language-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Shield, Sparkles, TrendingUp, Briefcase } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"

export default function AdminPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    aiEnabled: 0,
  })
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('profiles').select('id, ai_enabled')
      if (data) {
        setStats({
          totalBusinesses: data.length,
          aiEnabled: data.filter(p => p.ai_enabled).length,
        })
      }
    }
    load()
  }, [supabase])

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-destructive font-bold text-sm tracking-widest uppercase">
          <Shield className="w-4 h-4" />
          <span>{t("admin_panel")}</span>
        </div>
        <h2 className="text-5xl font-extrabold tracking-tight text-foreground leading-tight">
          {t("dashboard")}
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl">
          Mirësevini në panelin e kontrollit të sistemit.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/users">
          <Card className="glass border-border shadow-xl hover:scale-[1.02] transition-all cursor-pointer group">
            <CardHeader className="p-8">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive group-hover:bg-destructive group-hover:text-white transition-all">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black">{stats.totalBusinesses}</div>
              </div>
              <CardTitle className="mt-6">{t("user_mgmt")}</CardTitle>
              <CardDescription>Menaxhoni të gjitha bizneset e regjistruara.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Card className="glass border-border shadow-xl">
          <CardHeader className="p-8">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-3xl font-black">{stats.aiEnabled}</div>
            </div>
            <CardTitle className="mt-6">AI të Aktivizuara</CardTitle>
            <CardDescription>Numri i bizneseve që kanë qasje në AI.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="glass border-border shadow-xl">
          <CardHeader className="p-8">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="text-3xl font-black">100%</div>
            </div>
            <CardTitle className="mt-6">Uptime i Sistemit</CardTitle>
            <CardDescription>Statusi i performancës së serverit.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
