"use client"

import { useTranslation } from "@/components/language-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Shield, Calendar, Download, TrendingUp, TrendingDown } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"

export default function AdminReportsPage() {
  const { t, language } = useTranslation()
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPurchases: 0,
    activeBusinesses: 0,
  })
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: sales } = await supabase.from('sales').select('total_amount')
      const { data: purchases } = await supabase.from('purchases').select('total_cost')
      const { data: profiles } = await supabase.from('profiles').select('id')
      
      setStats({
        totalSales: sales?.reduce((acc, s) => acc + Number(s.total_amount), 0) || 0,
        totalPurchases: purchases?.reduce((acc, p) => acc + Number(p.total_cost), 0) || 0,
        activeBusinesses: profiles?.length || 0,
      })
    }
    load()
  }, [supabase])

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-destructive font-bold text-sm tracking-widest uppercase">
            <Shield className="w-4 h-4" />
            <span>{t("admin_panel")}</span>
          </div>
          <h2 className="text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            {t("reports")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl">
            {language === 'sq' ? 'Analizoni performancën globale të sistemit.' : 'Analyze the global system performance.'}
          </p>
        </div>
        <Button className="h-12 rounded-xl primary-gradient text-white font-bold px-8 shadow-lg shadow-primary/20">
          <Download className="w-5 h-5 mr-2" />
          {language === 'sq' ? 'Shkarko Raportin' : 'Download Report'}
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="glass border-border shadow-xl">
          <CardHeader className="p-8">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="text-2xl font-black">{stats.totalSales.toFixed(2)} €</div>
            </div>
            <CardTitle className="mt-6">Shitjet Totale</CardTitle>
            <CardDescription>Vëllimi i përgjithshëm i shitjeve në sistem.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="glass border-border shadow-xl">
          <CardHeader className="p-8">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div className="text-2xl font-black">{stats.totalPurchases.toFixed(2)} €</div>
            </div>
            <CardTitle className="mt-6">Blerjet Totale</CardTitle>
            <CardDescription>Vëllimi i përgjithshëm i blerjeve në sistem.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="glass border-border shadow-xl">
          <CardHeader className="p-8">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="text-2xl font-black">{stats.activeBusinesses}</div>
            </div>
            <CardTitle className="mt-6">Biznese Aktive</CardTitle>
            <CardDescription>Numri total i klientëve që përdorin sistemin.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="glass border-border shadow-xl overflow-hidden">
        <CardHeader className="p-8">
          <CardTitle className="text-xl font-bold flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-primary" />
            Aktiviteti i Fundit
          </CardTitle>
          <CardDescription>Analiza e faturave të regjistruara në 30 ditët e fundit.</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground italic bg-muted/20">
          Grafiku i aktivitetit do të shfaqet këtu së shpejti...
        </CardContent>
      </Card>
    </div>
  )
}
