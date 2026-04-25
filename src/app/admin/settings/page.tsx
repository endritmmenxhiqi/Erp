"use client"

import { useTranslation } from "@/components/language-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Shield, Lock, Bell, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminSettingsPage() {
  const { t, language } = useTranslation()

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-destructive font-bold text-sm tracking-widest uppercase">
          <Shield className="w-4 h-4" />
          <span>{t("admin_panel")}</span>
        </div>
        <h2 className="text-5xl font-extrabold tracking-tight text-foreground leading-tight">
          {t("settings")}
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl">
          {language === 'sq' ? 'Konfiguroni parametrat globalë të sistemit.' : 'Configure global system parameters.'}
        </p>
      </div>

      <div className="grid gap-8">
        <Card className="glass border-border shadow-xl">
          <CardHeader className="p-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Cilësimet e Sistemit</CardTitle>
                <CardDescription>Menaxhoni gjuhët dhe rajonet e lejuara.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
             <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border">
                <div>
                   <div className="font-bold">Gjuha Default</div>
                   <div className="text-xs text-muted-foreground">Gjuha që do të përdoret për përdoruesit e rinj.</div>
                </div>
                <Button variant="outline" className="h-10 rounded-xl border-border font-bold">Shqip</Button>
             </div>
          </CardContent>
        </Card>

        <Card className="glass border-border shadow-xl">
          <CardHeader className="p-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Siguria</CardTitle>
                <CardDescription>Konfiguroni parametrat e sigurisë globale.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
             <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border">
                <div>
                   <div className="font-bold">Mbrojtja ndaj Brute-force</div>
                   <div className="text-xs text-muted-foreground">Limitimi i tentativave të dështuara për login.</div>
                </div>
                <Button variant="outline" className="h-10 rounded-xl border-border font-bold text-green-600 border-green-500/20 bg-green-500/5">Aktiv</Button>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
