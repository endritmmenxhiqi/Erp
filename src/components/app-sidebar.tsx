"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
  ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "./theme-toggle"
import { LanguageToggle } from "./language-toggle"
import { useTranslation } from "./language-provider"

interface SidebarProps {
  email: string
  role: string
  signOutAction: () => Promise<void>
}

export function AppSidebar({ email, role, signOutAction }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useTranslation()
  
  const navItems = role === 'admin' 
    ? [
        { name: t("dashboard"), href: "/admin", icon: LayoutDashboard },
        { name: t("user_mgmt"), href: "/admin/users", icon: Users },
        { name: t("reports"), href: "/admin/reports", icon: BarChart3 },
        { name: t("settings"), href: "/admin/settings", icon: Settings },
      ]
    : [
        { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
        { name: t("purchases"), href: "/dashboard/purchases", icon: Rocket },
        { name: t("purchases_book"), href: "/dashboard/purchases-book", icon: FileText },
        { name: t("sales"), href: "/dashboard/sales", icon: Users },
        { name: t("sales_book"), href: "/dashboard/sales-book", icon: FileText },
        { name: t("consumption"), href: "/dashboard/consumption", icon: Settings },
      ]

  return (
    <div className="w-72 h-screen flex flex-col bg-sidebar dark:bg-[#0a0a0c] border-r border-border sticky top-0 overflow-hidden">
      {/* Brand */}
      <div className="p-8">
        <div className="flex items-center space-x-3 group cursor-pointer">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">Anti-Gravity</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">AI-ERP System</div>
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
               <AvatarFallback className="bg-primary/20 text-primary font-bold">{email[0].toUpperCase()}</AvatarFallback>
             </Avatar>
             <div className="flex-1 min-w-0">
               <div className="text-sm font-semibold text-foreground truncate">{email.split('@')[0]}</div>
               <div className="text-[10px] uppercase text-primary font-bold flex items-center">
                 <ShieldCheck className="w-3 h-3 mr-1" />
                 {role}
               </div>
             </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent/50 p-2 h-auto"
            onClick={() => signOutAction()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t("sign_out")}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
