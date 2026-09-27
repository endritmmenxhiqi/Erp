"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/spinner"
import Link from "next/link"
import { ChevronRight, ChevronLeft, Rocket, Store, UtensilsCrossed, Car, Hotel, Wrench, Factory, Package, Sparkles } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslation } from "@/components/language-provider"

// ─── Business Types ─────────────────────────────────────────────
const BUSINESS_TYPES = [
  {
    id: "market",
    name: "Dyqan / Market / Pakicë",
    icon: Store,
    description: "POS me barkod, arka, inventari",
    color: "from-emerald-600 to-teal-600",
    roles: [
      { id: "owner", name: "Pronari / Administratori" },
      { id: "seller", name: "Shitës / Arkëtar" },
      { id: "commercialist", name: "Komercialist / Blerje" },
      { id: "manager", name: "Menaxher i Dyqanit" },
    ]
  },
  {
    id: "gastronomy",
    name: "Restorant / Kafene / Bar",
    icon: UtensilsCrossed,
    description: "Tavolinat, kamarierët, porositë live",
    color: "from-amber-600 to-orange-600",
    roles: [
      { id: "owner", name: "Pronari / Administratori" },
      { id: "waiter", name: "Kamerier/e" },
      { id: "hall_manager", name: "Menaxher i Sallës" },
      { id: "bartender", name: "Barmen/e" },
      { id: "chef", name: "Kuzhinier/e" },
      { id: "cashier", name: "Arkëtar/e" },
    ]
  },
  {
    id: "rent_a_car",
    name: "Rent-a-Car",
    icon: Car,
    description: "Flota e veturave, kontratat, kilometrazha",
    color: "from-sky-600 to-blue-600",
    roles: [
      { id: "owner", name: "Pronari / Administratori" },
      { id: "agent", name: "Agjent / Shitës" },
      { id: "manager", name: "Menaxher" },
    ]
  },
  {
    id: "hotel",
    name: "Hotel & Akomodimi",
    icon: Hotel,
    description: "Dhomat, check-in/out, rezervimet",
    color: "from-indigo-600 to-violet-600",
    roles: [
      { id: "owner", name: "Pronari / Administratori" },
      { id: "receptionist", name: "Recepsionist/e" },
      { id: "housekeeping", name: "Mirëmbajtëse" },
      { id: "manager", name: "Menaxher i Hotelit" },
    ]
  },
  {
    id: "auto_service",
    name: "Auto Servis & Mekanikë",
    icon: Wrench,
    description: "Urdhëresat e punës, pjesët dhe servisimi",
    color: "from-rose-600 to-pink-600",
    roles: [
      { id: "owner", name: "Pronari / Administratori" },
      { id: "mechanic", name: "Mekanik" },
      { id: "parts_manager", name: "Menaxher i Pjesëve" },
      { id: "service_advisor", name: "Këshilltar Servisi" },
    ]
  },
  {
    id: "production",
    name: "Prodhim & Fabrikë",
    icon: Factory,
    description: "Normativat BOM, kostoja e prodhimit",
    color: "from-purple-600 to-fuchsia-600",
    roles: [
      { id: "owner", name: "Pronari / Administratori" },
      { id: "production_manager", name: "Menaxher Prodhimi" },
      { id: "warehouse", name: "Magazinier" },
      { id: "quality", name: "Kontrollor Cilësie" },
    ]
  },
  {
    id: "customs_distribution",
    name: "Doganë & Distribucion",
    icon: Package,
    description: "DUD, taksat doganore, shumica",
    color: "from-cyan-600 to-blue-700",
    roles: [
      { id: "owner", name: "Pronari / Administratori" },
      { id: "customs_agent", name: "Agjent Doganor" },
      { id: "distributor", name: "Distributor" },
      { id: "warehouse", name: "Magazinier" },
    ]
  },
]

// ─── Schema ─────────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email(),
  business_name: z.string().min(2),
  address: z.string().min(5),
  fiscal_number: z.string().min(9).max(10).regex(/^[a-zA-Z0-9]+$/),
  phone_number: z.string().min(8),
  password: z.string().min(6),
  confirm_password: z.string(),
  terms: z.boolean().refine(val => val === true),
}).refine((data) => data.password === data.confirm_password, {
  path: ["confirm_password"],
});

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1) // 1=business type, 2=role, 3=details
  const [selectedBusinessType, setSelectedBusinessType] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      business_name: "",
      address: "",
      fiscal_number: "",
      phone_number: "",
      password: "",
      confirm_password: "",
      terms: false,
    },
  })

  const currentBusiness = BUSINESS_TYPES.find(b => b.id === selectedBusinessType)

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            business_name: values.business_name,
            fiscal_number: values.fiscal_number,
            address: values.address,
            phone_number: values.phone_number,
            business_type: selectedBusinessType,
            user_role: selectedRole,
          }
        }
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success(t("auth.success_register"))
      router.push('/login')
    } catch (err: unknown) {
      toast.error(t("auth.error_unexpected"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-12 relative overflow-hidden">
      {/* Absolute Toggles */}
      <div className="absolute top-6 right-6 flex items-center space-x-2 z-50">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[150px] rounded-full -z-10" />
      
      <div className="w-full max-w-4xl space-y-6 relative z-10 py-8">
        {/* Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
           <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 backdrop-blur-sm animate-float">
             <Rocket className="w-7 h-7 text-primary" />
           </div>
           <div className="space-y-1">
             <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{t("create_account")}</h1>
             <p className="text-muted-foreground text-sm">
               {step === 1 && "Zgjidhni llojin e biznesit tuaj"}
               {step === 2 && "Zgjidhni rolin tuaj në biznes"}
               {step === 3 && t("register_subtitle")}
             </p>
           </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 ${
                s === step 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110" 
                  : s < step 
                  ? "bg-primary/20 text-primary border border-primary/30" 
                  : "bg-card text-muted-foreground border border-border"
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-0.5 mx-1 rounded-full transition-all duration-300 ${
                  s < step ? "bg-primary" : "bg-border"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* ─── Step 1: Business Type ─────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BUSINESS_TYPES.map((biz) => {
                const Icon = biz.icon
                const isSelected = selectedBusinessType === biz.id
                return (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => setSelectedBusinessType(biz.id)}
                    className={`group relative p-5 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.02] ${
                      isSelected 
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" 
                        : "border-border bg-card/50 hover:border-primary/40 hover:bg-card"
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${biz.color} flex items-center justify-center mb-3 shadow-lg transition-transform group-hover:scale-110`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-sm text-foreground">{biz.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{biz.description}</p>
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-in zoom-in duration-200">
                        <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => {
                  if (!selectedBusinessType) {
                    toast.error("Ju lutem zgjidhni llojin e biznesit!")
                    return
                  }
                  setSelectedRole(null)
                  setStep(2)
                }}
                className="h-12 px-8 rounded-2xl primary-gradient text-white font-black shadow-lg shadow-primary/20"
              >
                Vazhdo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Role Selection ────────────────────────── */}
        {step === 2 && currentBusiness && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="glass-card p-5 rounded-2xl border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentBusiness.color} flex items-center justify-center shadow-md`}>
                  {(() => { const Icon = currentBusiness.icon; return <Icon className="w-5 h-5 text-white" /> })()}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">{currentBusiness.name}</h3>
                  <p className="text-[11px] text-muted-foreground">Zgjidhni rolin tuaj në këtë biznes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentBusiness.roles.map((role) => {
                  const isSelected = selectedRole === role.id
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.01] ${
                        isSelected 
                          ? "border-primary bg-primary/10 shadow-md shadow-primary/15" 
                          : "border-border bg-background/50 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{role.name}</span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-in zoom-in">
                            <Sparkles className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="h-12 px-6 rounded-2xl font-bold border-border"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Prapa
              </Button>
              <Button
                onClick={() => {
                  if (!selectedRole) {
                    toast.error("Ju lutem zgjidhni rolin tuaj!")
                    return
                  }
                  setStep(3)
                }}
                className="h-12 px-8 rounded-2xl primary-gradient text-white font-black shadow-lg shadow-primary/20"
              >
                Vazhdo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Account Details ───────────────────────── */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Selected Business/Role Badge */}
            {currentBusiness && (
              <div className="flex items-center gap-2 mb-4 justify-center flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r ${currentBusiness.color} text-white`}>
                  {(() => { const Icon = currentBusiness.icon; return <Icon className="w-3.5 h-3.5" /> })()}
                  {currentBusiness.name}
                </span>
                {selectedRole && (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    {currentBusiness.roles.find(r => r.id === selectedRole)?.name}
                  </span>
                )}
              </div>
            )}

            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="business_name"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>{t("business_name")}</FormLabel>
                          <FormControl>
                            <Input placeholder="Shpk. ABC" className="h-12 bg-background/50" disabled={isLoading} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>{t("work_email")}</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="kontakti@biznesi.com" className="h-12 bg-background/50" disabled={isLoading} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fiscal_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("fiscal_number")}</FormLabel>
                          <FormControl>
                            <Input placeholder="600123456" className="h-12 bg-background/50" disabled={isLoading} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("phone_number")}</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+383 4X XXX XXX" className="h-12 bg-background/50" disabled={isLoading} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>{t("address")}</FormLabel>
                          <FormControl>
                            <Input placeholder="Prishtinë, Kosovë" className="h-12 bg-background/50" disabled={isLoading} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("password")}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" className="h-12 bg-background/50" disabled={isLoading} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirm_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("confirm_password")}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" className="h-12 bg-background/50" disabled={isLoading} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="terms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-xl border p-4 sm:col-span-2 bg-background/30 border-border">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <div className="leading-none flex-1">
                            <FormLabel className="text-xs sm:text-sm font-normal text-muted-foreground">
                              {t("terms")}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="h-12 px-6 rounded-2xl font-bold border-border"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Prapa
                    </Button>
                    <Button type="submit" className="flex-1 h-12 text-md font-bold primary-gradient transition-all hover:scale-[1.01] rounded-2xl" disabled={isLoading}>
                      {isLoading ? <Spinner className="mr-2" /> : t("create_account")}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground px-8">
          {t("already_have_account")}{" "}
          <Link href="/login" className="text-primary font-bold hover:underline underline-offset-4 decoration-2">
            {t("login_link")}
          </Link>
        </p>
      </div>
    </div>
  )
}
