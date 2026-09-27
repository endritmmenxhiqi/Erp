"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  ShoppingCart, 
  ShoppingBag, 
  Users, 
  Truck, 
  ClipboardList, 
  UtensilsCrossed, 
  Package, 
  BarChart3, 
  UserCheck, 
  Menu, 
  X, 
  Sparkles, 
  LogOut,
  Flame
} from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { LanguageToggle } from "./language-toggle"
import { useTranslation } from "@/components/language-provider"
import { StaffService, Worker } from "@/lib/services/staff"

interface MobileNavProps {
  email: string
  role: string
  signOutAction: () => Promise<void>
}

export function MobileNav({ email, role, signOutAction }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const worker: Worker | null = typeof window === "undefined" ? null : StaffService.getCurrentWorker()

  const handleSignOut = async () => {
    if (worker) {
      StaffService.setCurrentWorker(null)
      document.cookie = 'worker_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      router.push("/login")
    } else {
      await signOutAction()
    }
  }

  const navCategories = [
    {
      title: "Shitjet & Shërbimi",
      items: [
        { name: t("sales"), href: "/dashboard/sales", icon: ShoppingCart },
        { name: t("orders"), href: "/dashboard/orders", icon: ClipboardList, badge: "AI" },
        { name: t("restaurant"), href: "/dashboard/tables", icon: UtensilsCrossed },
        { name: t("sales_book"), href: "/dashboard/sales-book", icon: ShoppingCart },
      ]
    },
    {
      title: "Blerjet & Magazina",
      items: [
        { name: t("purchases"), href: "/dashboard/purchases", icon: ShoppingBag, badge: "OCR" },
        { name: t("purchases_book"), href: "/dashboard/purchases-book", icon: ShoppingBag },
        { name: t("products"), href: "/dashboard/products", icon: Package },
        { name: t("consumption"), href: "/dashboard/consumption", icon: Flame },
      ]
    },
    {
      title: "Partnerët & Klientët",
      items: [
        { name: t("clients"), href: "/dashboard/clients", icon: Users, badge: "AI CRM" },
        { name: t("suppliers"), href: "/dashboard/suppliers", icon: Truck },
      ]
    },
    {
      title: "Raportet & Ekipi",
      items: [
        { name: t("reports"), href: "/dashboard/reports", icon: BarChart3 },
        { name: t("staff_mgmt"), href: "/dashboard/staff", icon: UserCheck },
      ]
    }
  ]

  return (
    <div className="md:hidden print:hidden">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border shadow-xs">
        <Link href="/dashboard" className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight">Agoni ERP</span>
            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-semibold bg-primary/10 text-primary rounded-full">AI Mobile</span>
          </div>
        </Link>

        <div className="flex items-center space-x-1.5">
          <ThemeToggle />
          <LanguageToggle />
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 rounded-xl text-foreground hover:bg-accent/60 transition-colors"
            aria-label="Hap menunë"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Slide-out Mobile Menu Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs h-full bg-background border-r border-border p-5 flex flex-col justify-between overflow-y-auto shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-bold text-sm">Modulet e Agoni ERP</span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-accent/60 text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User badge */}
              <div className="p-3 mb-4 rounded-xl bg-accent/30 border border-border/60">
                <p className="text-xs font-semibold text-foreground truncate">
                  {worker ? `${worker.first_name} ${worker.last_name}` : email}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                  Roli: {worker ? worker.role : role}
                </p>
              </div>

              {/* Grouped Navigation */}
              <div className="space-y-4">
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === "/dashboard" 
                      ? "bg-primary/15 text-primary font-semibold" 
                      : "text-foreground hover:bg-accent/50"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{t("dashboard")}</span>
                </Link>

                {navCategories.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-3 pt-2">
                      {cat.title}
                    </div>
                    {cat.items.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                            isActive 
                              ? "bg-primary/15 text-primary font-semibold" 
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          )}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="w-4 h-4" />
                            <span>{item.name}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Logout button */}
            <div className="pt-4 border-t border-border mt-6">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t("sign_out")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Dock Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-lg border-t border-border/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <Link 
          href="/dashboard" 
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all",
            pathname === "/dashboard" ? "text-primary scale-105 font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Kreu</span>
        </Link>

        <Link 
          href="/dashboard/purchases" 
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all",
            pathname === "/dashboard/purchases" ? "text-primary scale-105 font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          <span>Blerje</span>
        </Link>

        {/* Center Glowing Action Button: POS / Shitje */}
        <Link
          href="/dashboard/sales"
          className="relative -top-3 flex flex-col items-center group"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-active:scale-95 transition-transform">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-foreground mt-0.5">POS Shitje</span>
        </Link>

        <Link 
          href="/dashboard/clients" 
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all",
            pathname === "/dashboard/clients" ? "text-primary scale-105 font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Klientët</span>
        </Link>

        <button
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium text-muted-foreground hover:text-foreground"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Më shumë</span>
        </button>
      </nav>
    </div>
  )
}
