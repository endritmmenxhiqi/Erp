"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export type BusinessType = 
  | "all"
  | "market"
  | "gastronomy"
  | "rent_a_car"
  | "hotel"
  | "auto_service"
  | "production"
  | "customs_distribution"

interface IndustryConfig {
  id: BusinessType
  name: string
  icon: string
  description: string
  color: string
}

export const INDUSTRIES: IndustryConfig[] = [
  {
    id: "all",
    name: "Të Gjitha Modulet",
    icon: "✨",
    description: "Shfaq çdo modul të mundshëm të Agoni ERP",
    color: "from-blue-600 to-indigo-600"
  },
  {
    id: "market",
    name: "Dyqan / Market / Pakicë",
    icon: "🛒",
    description: "POS me barkod, arka, inventari dhe pro-faturat",
    color: "from-emerald-600 to-teal-600"
  },
  {
    id: "gastronomy",
    name: "Restorant / Kafene / Bar",
    icon: "🍽️",
    description: "Tavolinat live sipas zonave, kamarierët dhe porositë",
    color: "from-amber-600 to-orange-600"
  },
  {
    id: "rent_a_car",
    name: "Rent-a-Car",
    icon: "🚗",
    description: "Flota e veturave, kontratat e qirasë dhe kilometrazha",
    color: "from-sky-600 to-blue-600"
  },
  {
    id: "hotel",
    name: "Hotel & Akomaodimi",
    icon: "🏨",
    description: "Dhomat, check-in/out, rezervimet dhe mysafirët",
    color: "from-indigo-600 to-violet-600"
  },
  {
    id: "auto_service",
    name: "Auto Servis & Mekanikë",
    icon: "🔧",
    description: "Urdhëresat e punës, targat e veturave, pjesët dhe punëdora",
    color: "from-rose-600 to-pink-600"
  },
  {
    id: "production",
    name: "Prodhim & Fabrikë",
    icon: "🏭",
    description: "Normativat e lëndës së parë (BOM) dhe kostoja e prodhimit",
    color: "from-purple-600 to-fuchsia-600"
  },
  {
    id: "customs_distribution",
    name: "Doganë & Distribucion (DUD)",
    icon: "📦",
    description: "Zhdoganimet, deklarata DUD, taksat doganore dhe shumica",
    color: "from-cyan-600 to-blue-700"
  }
]

interface BusinessModeContextType {
  businessType: BusinessType
  setBusinessType: (type: BusinessType) => void
  currentIndustry: IndustryConfig
}

const BusinessModeContext = createContext<BusinessModeContextType | undefined>(undefined)

export function BusinessModeProvider({ children }: { children: React.ReactNode }) {
  const [businessType, setBusinessTypeState] = useState<BusinessType>("market")

  useEffect(() => {
    const saved = localStorage.getItem("agoni_business_type") as BusinessType
    if (saved && INDUSTRIES.some(i => i.id === saved)) {
      setBusinessTypeState(saved)
    }
  }, [])

  const setBusinessType = (type: BusinessType) => {
    setBusinessTypeState(type)
    localStorage.setItem("agoni_business_type", type)
  }

  const currentIndustry = INDUSTRIES.find(i => i.id === businessType) || INDUSTRIES[1]

  return (
    <BusinessModeContext.Provider value={{ businessType, setBusinessType, currentIndustry }}>
      {children}
    </BusinessModeContext.Provider>
  )
}

export function useBusinessMode() {
  const context = useContext(BusinessModeContext)
  if (!context) {
    throw new Error("useBusinessMode must be used within a BusinessModeProvider")
  }
  return context
}
