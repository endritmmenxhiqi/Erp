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
import { ShieldCheck, ChevronRight, Rocket } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslation } from "@/components/language-provider"

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
          }
        }
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success(t("auth.success_register"))
      router.push('/login')
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[150px] rounded-full -z-10" />
      
      <div className="w-full max-w-2xl space-y-8 relative z-10 py-12">
        <div className="flex flex-col items-center text-center space-y-4">
           <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 backdrop-blur-sm animate-float">
             <Rocket className="w-8 h-8 text-primary" />
           </div>
           <div className="space-y-2">
             <h1 className="text-4xl font-extrabold tracking-tight">{t("create_account")}</h1>
             <p className="text-muted-foreground">{t("register_subtitle")}</p>
           </div>
        </div>

        <div className="glass-card p-6 sm:p-10 rounded-3xl border border-border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
              <Button type="submit" className="w-full h-12 text-md font-bold primary-gradient mt-2 transition-all hover:scale-[1.01]" disabled={isLoading}>
                {isLoading ? <Spinner className="mr-2" /> : t("create_account")}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </Form>
        </div>

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
