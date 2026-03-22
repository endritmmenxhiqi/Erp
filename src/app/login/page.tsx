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
import { Spinner } from "@/components/spinner"
import Link from "next/link"
import { ShieldCheck, ChevronRight, Rocket } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslation } from "@/components/language-provider"

const loginSchema = z.object({
  fiscal_number: z.string().min(9).max(10).regex(/^[a-zA-Z0-9]+$/),
  password: z.string().min(6),
})

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { fiscal_number: "", password: "" },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true)
    try {
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
    } catch (error) {
      toast.error(t("auth.error_unexpected"))
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
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center space-y-4">
           <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 backdrop-blur-sm animate-float">
             <Rocket className="w-8 h-8 text-primary" />
           </div>
           <div className="space-y-2">
             <h1 className="text-4xl font-extrabold tracking-tight">{t("welcome")}</h1>
             <p className="text-muted-foreground">{t("login_subtitle")}</p>
           </div>
        </div>

        <div className="glass-card p-8 rounded-3xl border border-border mt-0 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
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
                control={form.control}
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
        </div>

        <p className="text-center text-sm text-muted-foreground px-8">
          {t("no_account")}{" "}
          <Link href="/register" className="text-primary font-bold hover:underline underline-offset-4 decoration-2">
            {t("register_link")}
          </Link>
        </p>
      </div>
    </div>
  )
}
