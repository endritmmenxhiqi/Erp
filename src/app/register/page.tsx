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
import { 
  ChevronRight, 
  ChevronLeft, 
  Rocket, 
  Store, 
  UtensilsCrossed, 
  Car, 
  Hotel, 
  Wrench, 
  Factory, 
  Package, 
  Sparkles,
  ShieldCheck,
  Check
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslation } from "@/components/language-provider"

// ─── Business Types ─────────────────────────────────────────────
const BUSINESS_TYPES = [
  {
    id: "market",
    name: "Dyqan / Market / Pakicë",
    icon: Store,
    description: "POS me barkod, arka, inventari dhe pro-faturat",
    color: "from-emerald-600 to-teal-600",
    features: ["POS & Barkod", "Libri i Shitjeve/Blerjeve", "Inventari & Stoku"],
  },
  {
    id: "gastronomy",
    name: "Restorant / Kafene / Bar",
    icon: UtensilsCrossed,
    description: "Tavolinat live, porositë dhe zbritja automatike nga stoku",
    color: "from-amber-600 to-orange-600",
    features: ["POS Tavolina Live", "Mbyllje Fature Kesh/Kartë", "Zbritje Atomike Stoku"],
  },
  {
    id: "rent_a_car",
    name: "Rent-a-Car",
    icon: Car,
    description: "Flota e veturave, kontratat e qirasë dhe kilometrazha",
    color: "from-sky-600 to-blue-600",
    features: ["Menaxhim Flote", "Kontrata & Rezervime", "Statusi i Veturave"],
  },
  {
    id: "hotel",
    name: "Hotel & Akomodimi",
    icon: Hotel,
    description: "Dhomat, check-in/out, kalendari dhe rezervimet",
    color: "from-indigo-600 to-violet-600",
    features: ["Statusi i Dhomave", "Check-In / Out", "Faturimi i Mysafirëve"],
  },
  {
    id: "auto_service",
    name: "Auto Servis & Mekanikë",
    icon: Wrench,
    description: "Urdhëresat e punës, pjesët auto dhe riparimet",
    color: "from-rose-600 to-pink-600",
    features: ["Fletë-punët Servisi", "Pjesët & Konsumi", "Kartela e Automjetit"],
  },
  {
    id: "production",
    name: "Prodhim & Fabrikë",
    icon: Factory,
    description: "Normativat BOM, kostoja e prodhimit dhe lënda e parë",
    color: "from-purple-600 to-fuchsia-600",
    features: ["Normativa BOM", "Lënda e Parë & Konsumi", "Produktet Finale"],
  },
  {
    id: "customs_distribution",
    name: "Doganë & Distribucion",
    icon: Package,
    description: "Deklaratat DUD, taksat doganore dhe shitja me shumicë",
    color: "from-cyan-600 to-blue-700",
    features: ["Regjistrimi DUD", "Llogaritje Taksash Doganore", "Distribucion & Stok"],
  },
]

// ─── Schema ─────────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email(),
  business_name: z.string().min(2, "Emri i biznesit duhet të ketë së paku 2 karaktere"),
  address: z.string().min(3, "Adresa është e detyrueshme"),
  fiscal_number: z.string().min(9).max(10).regex(/^[a-zA-Z0-9]+$/, "Numri fiskal duhet të ketë 9-10 karaktere alfanumerike"),
  phone_number: z.string().min(8, "Numri i telefonit duhet të ketë së paku 8 shifra"),
  password: z.string().min(6, "Fjalëkalimi duhet të jetë të paktën 6 karaktere"),
  confirm_password: z.string(),
  terms: z.boolean().refine(val => val === true, "Duhet të pranoni kushtet e përdorimit"),
}).refine((data) => data.password === data.confirm_password, {
  path: ["confirm_password"],
  message: "Fjalëkalimet nuk përputhen",
});

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1) // 1=business type, 2=details (Always as Administrator)
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>("market")
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

  const currentBusiness = BUSINESS_TYPES.find(b => b.id === selectedBusinessType) || BUSINESS_TYPES[0]

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true)
    try {
      // Every registered business account is created as Administrator / Owner
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
            user_role: "owner", // Always Administrator / Owner
            role: "business_admin",
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
        {/* Logo & Heading */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 backdrop-blur-sm shadow-xl">
            <Rocket className="w-7 h-7 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{t("create_account")}</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {step === 1 && "Zgjidhni profilin e biznesit tuaj për të konfiguruar modulet përkatëse"}
              {step === 2 && "Regjistroni llogarinë si Administrator me qasje të plotë"}
            </p>
          </div>
        </div>

        {/* Step Indicator (2 Steps) */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 ${
              step === 1 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110" 
                : "bg-primary/20 text-primary border border-primary/30"
            }`}>
              {step > 1 ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <span className={`text-xs font-bold ${step === 1 ? "text-foreground" : "text-muted-foreground"}`}>
              Lloji i Biznesit
            </span>
          </div>

          <div className={`w-12 h-0.5 rounded-full transition-all duration-300 ${
            step === 2 ? "bg-primary" : "bg-border"
          }`} />

          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 ${
              step === 2 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110" 
                : "bg-card text-muted-foreground border border-border"
            }`}>
              2
            </div>
            <span className={`text-xs font-bold ${step === 2 ? "text-foreground" : "text-muted-foreground"}`}>
              Të Dhënat e Administratorit
            </span>
          </div>
        </div>

        {/* ─── Step 1: Business Type Selection ───────────────── */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BUSINESS_TYPES.map((biz) => {
                const Icon = biz.icon
                const isSelected = selectedBusinessType === biz.id
                return (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => setSelectedBusinessType(biz.id)}
                    className={`group relative p-5 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between ${
                      isSelected 
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" 
                        : "border-border bg-card/60 hover:border-primary/40 hover:bg-card"
                    }`}
                  >
                    <div>
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${biz.color} flex items-center justify-center mb-3 shadow-lg transition-transform group-hover:scale-110`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-bold text-sm text-foreground">{biz.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{biz.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap gap-1">
                      {biz.features.map((f, i) => (
                        <span key={i} className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-background/80 text-muted-foreground border border-border/40">
                          {f}
                        </span>
                      ))}
                    </div>

                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-in zoom-in duration-200">
                        <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link 
                href="/login" 
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Keni llogari? <span className="text-primary font-bold">Kyçuni këtu</span>
              </Link>

              <Button
                onClick={() => setStep(2)}
                className="h-12 px-8 rounded-2xl primary-gradient text-white font-black shadow-lg shadow-primary/20"
              >
                Vazhdo me të Dhënat
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Administrator & Business Details ───────── */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header Badge & Administrator Role Notice */}
            <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentBusiness.color} flex items-center justify-center text-white shadow-md`}>
                  {(() => { const Icon = currentBusiness.icon; return <Icon className="w-5 h-5" /> })()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{currentBusiness.name}</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      <ShieldCheck className="w-3 h-3 mr-0.5" />
                      Administrator / Pronar
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Krijoni biznesin si Administrator. Rolet e stafit (kamerier, arkëtar, mekanik) mund t&apos;i caktoni tek paneli <b>Stafi</b>.
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs text-primary font-bold hover:bg-primary/10 rounded-xl"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Ndrysho Llojin
              </Button>
            </div>

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
                            <Input placeholder="Psh. Restorant Tradita Shpk" className="h-12 bg-background/50 rounded-xl" disabled={isLoading} {...field} />
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
                          <FormLabel>{t("work_email")} (Për kyçjen e Administratorit)</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="admin@biznesi.com" className="h-12 bg-background/50 rounded-xl" disabled={isLoading} {...field} />
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
                            <Input placeholder="600123456" className="h-12 bg-background/50 rounded-xl" disabled={isLoading} {...field} />
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
                            <Input placeholder="+383 44 123 456" className="h-12 bg-background/50 rounded-xl" disabled={isLoading} {...field} />
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
                            <Input placeholder="Rruga Nëna Terezë, Prishtinë" className="h-12 bg-background/50 rounded-xl" disabled={isLoading} {...field} />
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
                            <Input type="password" placeholder="••••••••" className="h-12 bg-background/50 rounded-xl" disabled={isLoading} {...field} />
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
                            <Input type="password" placeholder="••••••••" className="h-12 bg-background/50 rounded-xl" disabled={isLoading} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-4 border rounded-xl bg-background/50">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-xs text-muted-foreground font-medium cursor-pointer">
                            {t("agree_terms")}{" "}
                            <Link href="#" className="text-primary hover:underline font-bold">
                              {t("terms_link")}
                            </Link>
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between items-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="h-12 px-6 rounded-2xl font-bold border-border"
                      disabled={isLoading}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Prapa
                    </Button>

                    <Button 
                      type="submit" 
                      className="h-12 px-8 rounded-2xl primary-gradient text-white font-black shadow-lg shadow-primary/20" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Po regjistrohet...
                        </>
                      ) : (
                        <>
                          Krijo Llogarinë e Administratorit
                          <Rocket className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>

              <div className="mt-6 text-center text-xs text-muted-foreground">
                {t("have_account")}{" "}
                <Link href="/login" className="text-primary font-bold hover:underline">
                  {t("login_link")}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
