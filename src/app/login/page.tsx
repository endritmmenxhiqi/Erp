"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Spinner } from "@/components/spinner"
import Link from "next/link"
import { ChevronRight, Rocket, AlertCircle, Building2, UserCircle, Briefcase } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslation } from "@/components/language-provider"
import { StaffService } from "@/lib/services/staff"

const businessLoginSchema = z.object({
  fiscal_number: z.string().min(9).max(10).regex(/^[a-zA-Z0-9]+$/),
  password: z.string().min(6),
})

const workerLoginSchema = z.object({
  username: z.string().min(2, "Shkruani emrin ose username-in"),
  password: z.string().min(1, "Fjalëkalimi është i detyrueshëm"),
})

function LoginForm() {
  const [loginType, setLoginType] = useState<"business" | "worker">("business")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const authError = searchParams.get('error')
  const supabase = createClient()
  const { t } = useTranslation()

  const businessForm = useForm<z.infer<typeof businessLoginSchema>>({
    resolver: zodResolver(businessLoginSchema),
    defaultValues: { fiscal_number: "", password: "" },
  })

  const workerForm = useForm<z.infer<typeof workerLoginSchema>>({
    resolver: zodResolver(workerLoginSchema),
    defaultValues: { username: "", password: "" },
  })

  async function onBusinessSubmit(values: z.infer<typeof businessLoginSchema>) {
    setIsLoading(true)
    try {
      StaffService.setCurrentWorker(null) // Clear any previous worker session
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('fiscal_number', values.fiscal_number)
        .single()

      if (fetchError || !profile) {
        toast.error(t("auth.error_fiscal"))
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: values.password,
      })

      if (signInError) {
        toast.error(t("auth.error_password"))
        return
      }

      toast.success(t("auth.success_login"))
      router.push(profile.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err: unknown) {
      toast.error(t("auth.error_unexpected"))
    } finally {
      setIsLoading(false)
    }
  }

  async function onWorkerSubmit(values: z.infer<typeof workerLoginSchema>) {
    setIsLoading(true)
    try {
      const result = await StaffService.workerLogin(values.username, values.password)
      if (!result || !result.worker) {
        toast.error("Të dhënat e punëtorit nuk janë të sakta.")
        return
      }

      const { worker } = result
      StaffService.setCurrentWorker(worker)

      // Start the shift automatically
      try {
        await StaffService.clockIn(worker.id)
      } catch (e) {
        console.warn("Shift clock in notice:", e)
      }

      toast.success(`Mirësevini, ${worker.first_name} ${worker.last_name}!`)

      if (worker.role === "seller") {
        router.push("/dashboard/sales")
      } else if (worker.role === "commercialist") {
        router.push("/dashboard/purchases")
      } else {
        router.push("/dashboard")
      }
    } catch (err: any) {
      toast.error(err.message || "Gabim gjatë kyçjes së punëtorit.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      {/* Absolute Toggles */}
      <div className="absolute top-8 right-8 flex items-center space-x-2 z-50">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse" />
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="flex flex-col items-center text-center space-y-3">
           <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 backdrop-blur-sm animate-float">
             <Rocket className="w-8 h-8 text-primary" />
           </div>
           <div className="space-y-1">
             <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{t("welcome")}</h1>
             <p className="text-muted-foreground text-sm">
               {loginType === "business" ? t("login_subtitle") : t("worker_login_desc")}
             </p>
           </div>
        </div>

        {/* Tab Switcher: Business vs Worker */}
        <div className="grid grid-cols-2 p-1.5 bg-muted/40 rounded-2xl border border-border">
          <button
            type="button"
            onClick={() => setLoginType("business")}
            className={`flex items-center justify-center py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              loginType === "business"
                ? "bg-background text-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4 mr-2" />
            {t("login_as_business")}
          </button>
          <button
            type="button"
            onClick={() => setLoginType("worker")}
            className={`flex items-center justify-center py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              loginType === "worker"
                ? "bg-background text-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCircle className="w-4 h-4 mr-2 text-primary" />
            {t("login_as_worker")}
          </button>
        </div>

        <div className="glass-card p-8 rounded-3xl border border-border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          {authError === 'auth-code-error' && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Linku i emails ka skaduar ose është i pavlefshëm. Ju lutem kërkoni një link të ri.</p>
            </div>
          )}

          {loginType === "business" ? (
            <Form {...businessForm}>
              <form onSubmit={businessForm.handleSubmit(onBusinessSubmit)} className="space-y-5">
                <FormField
                  control={businessForm.control}
                  name="fiscal_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fiscal_number")}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Psh. 600123456" 
                          className="h-12 bg-background/50 border-border focus:ring-primary/20" 
                          disabled={isLoading} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={businessForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("password")}</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          className="h-12 bg-background/50 border-border focus:ring-primary/20" 
                          disabled={isLoading} 
                          {...field} 
                        />
                      </FormControl>
                      <div className="flex justify-end pt-1">
                        <Link href="/forgot-password" className="text-xs text-primary hover:underline underline-offset-4 font-medium">
                          {t("forgot_password")}
                        </Link>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full h-12 text-md font-bold primary-gradient mt-4 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all" disabled={isLoading}>
                  {isLoading ? <Spinner className="mr-2" /> : t("continue")}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...workerForm}>
              <form onSubmit={workerForm.handleSubmit(onWorkerSubmit)} className="space-y-5">
                <FormField
                  control={workerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("username")} ose Emri & Mbiemri</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Psh. agoni ose Agon Krasniqi" 
                          className="h-12 bg-background/50 border-border focus:ring-primary/20" 
                          disabled={isLoading} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={workerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("password")}</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Fjalëkalimi i caktuar nga admini" 
                          className="h-12 bg-background/50 border-border focus:ring-primary/20" 
                          disabled={isLoading} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full h-12 text-md font-bold primary-gradient mt-4 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all" disabled={isLoading}>
                  {isLoading ? <Spinner className="mr-2" /> : "Kyçu si Punëtor"}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </Form>
          )}
        </div>

        {loginType === "business" && (
          <p className="text-center text-sm text-muted-foreground px-8">
            {t("no_account")}{" "}
            <Link href="/register" className="text-primary font-bold hover:underline underline-offset-4 decoration-2">
              {t("register_link")}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  )
}
