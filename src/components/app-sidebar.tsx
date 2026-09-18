"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  FileText, 
  BarChart3, 
  LogOut, 
  Rocket, 
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Clock,
  Briefcase
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ThemeToggle } from "./theme-toggle"
import { LanguageToggle } from "./language-toggle"
import { useTranslation } from "@/components/language-provider"
import { StaffService, Worker } from "@/lib/services/staff"

interface SidebarProps {
  email: string
  role: string
  signOutAction: () => Promise<void>
}

export function AppSidebar({ email, role, signOutAction }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const [worker, setWorker] = useState<Worker | null>(null)

  useEffect(() => {
    const currentWorker = StaffService.getCurrentWorker()
    setWorker(currentWorker)
  }, [pathname])

  // Determine effective role & navigation items
  let effectiveRole = role
  if (worker) {
    effectiveRole = worker.role
  }

  let navItems: { name: string; href: string; icon: any }[] = []

  if (effectiveRole === 'admin') {
    navItems = [
      { name: t("dashboard"), href: "/admin", icon: LayoutDashboard },
      { name: t("user_mgmt"), href: "/admin/users", icon: Users },
      { name: t("settings"), href: "/admin/settings", icon: Settings },
    ]
  } else if (effectiveRole === 'seller') {
    // Seller only has POS & Sales section
    navItems = [
      { name: t("sales"), href: "/dashboard/sales", icon: Users },
    ]
  } else if (effectiveRole === 'commercialist') {
    // Commercialist only has Purchases & Invoicing & Products
    navItems = [
      { name: t("purchases"), href: "/dashboard/purchases", icon: Rocket },
      { name: t("purchases_book"), href: "/dashboard/purchases-book", icon: FileText },
      { name: t("products"), href: "/dashboard/products", icon: Briefcase },
    ]
  } else {
    // Business Super Admin / Owner / Manager has full access
    navItems = [
      { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
      { name: t("purchases"), href: "/dashboard/purchases", icon: Rocket },
      { name: t("purchases_book"), href: "/dashboard/purchases-book", icon: FileText },
      { name: t("sales"), href: "/dashboard/sales", icon: Users },
      { name: t("sales_book"), href: "/dashboard/sales-book", icon: FileText },
      { name: t("consumption"), href: "/dashboard/consumption", icon: Settings },
      { name: t("products"), href: "/dashboard/products", icon: Briefcase },
      { name: t("reports"), href: "/dashboard/reports", icon: BarChart3 },
      { name: t("staff_mgmt"), href: "/dashboard/staff", icon: Users },
    ]
  }

  const handleSignOut = async () => {
    if (worker) {
      StaffService.setCurrentWorker(null)
      // Clear worker_session cookie
      document.cookie = 'worker_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      router.push("/login")
    } else {
      await signOutAction()
    }
  }

  return (
    <div className="w-72 h-screen flex flex-col bg-sidebar dark:bg-[#0a0a0c] border-r border-border sticky top-0 overflow-hidden print:hidden">
      {/* Brand */}
      <div className="p-8">
        <div className="flex items-center space-x-3 group cursor-pointer">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">{t("dashboard")}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">
              {worker ? `${worker.first_name} ${worker.last_name}` : t("business_dashboard")}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-2 py-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold px-4 mb-4">{t("main_menu")}</div>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all group relative overflow-hidden",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}>
                {isActive && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full" />}
                <Icon className={cn("w-5 h-5 mr-3 transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="flex-1">{item.name}</span>
                <ChevronRight className={cn("w-4 h-4 opacity-0 transition-opacity", isActive ? "opacity-30" : "group-hover:opacity-10")} />
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer / User */}
      <div className="p-6 mt-auto flex flex-col space-y-4">
        <div className="flex items-center justify-between px-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        
        <div className="p-4 rounded-2xl bg-accent/20 border border-border space-y-4">
          <div className="flex items-center space-x-3">
             <Avatar className="w-10 h-10 border border-primary/30">
               <AvatarFallback className="bg-primary/20 text-primary font-bold">
                 {worker ? worker.first_name[0].toUpperCase() : email[0].toUpperCase()}
               </AvatarFallback>
             </Avatar>
             <div className="flex-1 min-w-0">
               <div className="text-sm font-semibold text-foreground truncate">
                 {worker ? `${worker.first_name} ${worker.last_name}` : email.split('@')[0]}
               </div>
               <div className="text-[10px] uppercase text-primary font-bold flex items-center">
                 <ShieldCheck className="w-3 h-3 mr-1" />
                 {worker ? (worker.role === 'seller' ? t('role_seller') : worker.role === 'commercialist' ? t('role_commercialist') : t('role_manager')) : (role === 'admin' ? 'Super Admin' : t('role_business_admin'))}
               </div>
             </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent/50 p-2 h-auto"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t("sign_out")}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
