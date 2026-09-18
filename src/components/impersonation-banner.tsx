"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "@/components/language-provider"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function ImpersonationBanner() {
  const { t } = useTranslation()
  const router = useRouter()
  const [impersonatedName, setImpersonatedName] = useState<string | null>(null)

  useEffect(() => {
    const checkImpersonation = () => {
      const name = sessionStorage.getItem("impersonated_business_name") || localStorage.getItem("impersonated_business_name")
      setImpersonatedName(name)
    }
    checkImpersonation()
    window.addEventListener("storage", checkImpersonation)
    return () => window.removeEventListener("storage", checkImpersonation)
  }, [])

  if (!impersonatedName) return null

  const handleExit = () => {
    sessionStorage.removeItem("impersonated_business_id")
    sessionStorage.removeItem("impersonated_business_name")
    localStorage.removeItem("impersonated_business_id")
    localStorage.removeItem("impersonated_business_name")
    router.push("/admin/users")
    router.refresh()
  }

  return (
    <div className="bg-destructive/90 text-destructive-foreground px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold shadow-md sticky top-0 z-50 animate-in slide-in-from-top print:hidden">
      <div className="flex items-center space-x-2">
        <ShieldAlert className="w-4 h-4 animate-pulse shrink-0" />
        <span>
          {t("impersonating_banner")} <span className="underline uppercase tracking-wide">{impersonatedName}</span> (Platform Admin Override)
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleExit}
        className="h-8 rounded-lg font-bold text-xs bg-white text-destructive hover:bg-white/90 shadow"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
        {t("exit_impersonation")}
      </Button>
    </div>
  )
}
