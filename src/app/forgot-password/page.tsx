"use client"

import { useState } from "react"
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
import { KeyRound, ArrowLeft, Mail } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslation } from "@/components/language-provider"

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const { t } = useTranslation()

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success(t("auth.success_reset"))
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center space-y-4">
           <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 backdrop-blur-sm animate-float">
             <KeyRound className="w-8 h-8 text-primary" />
           </div>
           <div className="space-y-2">
             <h2 className="text-3xl font-extrabold tracking-tight">{t("forgot_password")}</h2>
             <p className="text-muted-foreground px-4">{t("register_subtitle")}</p>
           </div>
        </div>

        <div className="glass-card p-8 rounded-3xl border border-border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("work_email")}</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                        <Input 
                          placeholder="emri@kompania.com" 
                          className="pl-10 h-12 bg-background/50 border-border" 
                          disabled={isLoading} 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full h-12 text-md font-semibold primary-gradient transition-all hover:scale-[1.01]" disabled={isLoading}>
                {isLoading ? <Spinner className="mr-2" /> : t("continue")}
              </Button>
            </form>
          </Form>

          <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
            <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-white transition-colors group">
              <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
              {t("login_link")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
