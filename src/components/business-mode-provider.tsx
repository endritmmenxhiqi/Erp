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

// ─── Industry-specific Roles ────────────────────────────────────
export const INDUSTRY_ROLES: Record<BusinessType, { id: string; name: string; permissions: string[] }[]> = {
  all: [
    { id: "owner", name: "Pronari / Administratori", permissions: ["*"] },
  ],
  market: [
    { id: "owner", name: "Pronari / Administratori", permissions: ["*"] },
    { id: "seller", name: "Shitës / Arkëtar", permissions: ["sales", "tables", "products"] },
    { id: "commercialist", name: "Komercialist / Blerje", permissions: ["purchases", "suppliers", "stock", "consumption"] },
    { id: "manager", name: "Menaxher i Dyqanit", permissions: ["*"] },
  ],
  gastronomy: [
    { id: "owner", name: "Pronari / Administratori", permissions: ["*"] },
    { id: "waiter", name: "Kamerier/e", permissions: ["tables", "orders"] },
    { id: "hall_manager", name: "Menaxher i Sallës", permissions: ["tables", "orders", "sales", "staff", "reports"] },
    { id: "bartender", name: "Barmen/e", permissions: ["tables", "orders", "products"] },
    { id: "chef", name: "Kuzhinier/e", permissions: ["orders", "consumption", "products"] },
    { id: "cashier", name: "Arkëtar/e", permissions: ["sales", "tables", "orders"] },
  ],
  rent_a_car: [
    { id: "owner", name: "Pronari / Administratori", permissions: ["*"] },
    { id: "agent", name: "Agjent / Shitës", permissions: ["rent-a-car", "clients", "sales"] },
    { id: "manager", name: "Menaxher", permissions: ["*"] },
  ],
  hotel: [
    { id: "owner", name: "Pronari / Administratori", permissions: ["*"] },
    { id: "receptionist", name: "Recepsionist/e", permissions: ["hotel", "clients", "sales"] },
    { id: "housekeeping", name: "Mirëmbajtëse", permissions: ["hotel"] },
    { id: "manager", name: "Menaxher i Hotelit", permissions: ["*"] },
  ],
  auto_service: [
    { id: "owner", name: "Pronari / Administratori", permissions: ["*"] },
    { id: "mechanic", name: "Mekanik", permissions: ["auto-service", "products"] },
    { id: "parts_manager", name: "Menaxher i Pjesëve", permissions: ["products", "purchases", "suppliers", "consumption"] },
    { id: "service_advisor", name: "Këshilltar Servisi", permissions: ["auto-service", "clients", "sales"] },
  ],
  production: [
    { id: "owner", name: "Pronari / Administratori", permissions: ["*"] },
    { id: "production_manager", name: "Menaxher Prodhimi", permissions: ["production", "products", "consumption", "reports"] },
    { id: "warehouse", name: "Magazinier", permissions: ["products", "purchases", "consumption"] },
    { id: "quality", name: "Kontrollor Cilësie", permissions: ["production", "reports"] },
  ],
  customs_distribution: [
    { id: "owner", name: "Pronari / Administratori", permissions: ["*"] },
    { id: "customs_agent", name: "Agjent Doganor", permissions: ["customs", "sales", "purchases"] },
    { id: "distributor", name: "Distributor", permissions: ["sales", "clients", "products"] },
    { id: "warehouse", name: "Magazinier", permissions: ["products", "purchases", "consumption"] },
  ],
}

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
  userRole: string
  setUserRole: (role: string) => void
  hasPermission: (module: string) => boolean
  currentRoles: { id: string; name: string; permissions: string[] }[]
}

const BusinessModeContext = createContext<BusinessModeContextType | undefined>(undefined)

export function BusinessModeProvider({ children }: { children: React.ReactNode }) {
  const [businessType, setBusinessTypeState] = useState<BusinessType>("market")
  const [userRole, setUserRoleState] = useState<string>("owner")

  useEffect(() => {
    const saved = localStorage.getItem("agoni_business_type") as BusinessType
    if (saved && INDUSTRIES.some(i => i.id === saved)) {
      setBusinessTypeState(saved)
    }
    const savedRole = localStorage.getItem("agoni_user_role")
    if (savedRole) {
      setUserRoleState(savedRole)
    }
  }, [])

  const setBusinessType = (type: BusinessType) => {
    setBusinessTypeState(type)
    localStorage.setItem("agoni_business_type", type)
  }

  const setUserRole = (role: string) => {
    setUserRoleState(role)
    localStorage.setItem("agoni_user_role", role)
  }

  const currentIndustry = INDUSTRIES.find(i => i.id === businessType) || INDUSTRIES[1]
  const currentRoles = INDUSTRY_ROLES[businessType] || INDUSTRY_ROLES.market
  
  const hasPermission = (module: string): boolean => {
    if (userRole === "owner" || userRole === "manager") return true
    const roleConfig = currentRoles.find(r => r.id === userRole)
    if (!roleConfig) return true
    if (roleConfig.permissions.includes("*")) return true
    return roleConfig.permissions.includes(module)
  }

  return (
    <BusinessModeContext.Provider value={{ 
      businessType, 
      setBusinessType, 
      currentIndustry,
      userRole,
      setUserRole,
      hasPermission,
      currentRoles
    }}>
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
