"use client"

import { useState } from "react"
import { useTranslation } from "@/components/language-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { Spinner } from "@/components/spinner"
import { AlertCircle, AlertTriangle, Plus, Printer, Receipt, Save, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { MAX_INVOICE_LENGTH, MAX_ITEMS } from "@/lib/constants"

const saleSchema = z.object({
  invoice_num: z.string().trim().min(1, "Numri i fatures eshte i detyrueshem").max(MAX_INVOICE_LENGTH, `Maksimumi ${MAX_INVOICE_LENGTH} karaktere`),
  date: z.string().min(1, "Data eshte e detyrueshme"),
  total_amount: z.coerce.number().gt(0, "Totali duhet te jete me i madh se 0"),
  vat_rate: z.coerce.number().min(0, "TVSH nuk mund te jete negative").max(100, "TVSH nuk mund te jete mbi 100%"),
  type: z.enum(["Mall", "Sherbim"]),
  items: z
    .array(
      z.object({
        item_name: z.string().trim().min(1, "Shkruani emrin e artikullit").max(120, "Emri i artikullit eshte shume i gjate"),
        quantity: z.coerce.number().gt(0, "Sasia duhet te jete me e madhe se 0"),
        unit: z.string().trim().min(1, "Njesia eshte e detyrueshme").max(20, "Njesia eshte shume e gjate"),
        price: z.coerce.number().min(0, "Cmimi nuk mund te jete negativ"),
      })
    )
    .min(1, "Shtoni te pakten nje artikull")
    .max(MAX_ITEMS, `Maksimumi ${MAX_ITEMS} artikuj per nje fature`),
})

type SaleFormValues = z.infer<typeof saleSchema>

export default function SalesPage() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [showVatModal, setShowVatModal] = useState(false)
  const [pendingValues, setPendingValues] = useState<SaleFormValues | null>(null)
  const [formError, setFormError] = useState("")
  const supabase = createClient()

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as never,
    defaultValues: {
      invoice_num: "",
      date: new Date().toISOString().split("T")[0],
      total_amount: 0,
      vat_rate: 18,
      type: "Mall",
      items: [{ item_name: "", quantity: 1, unit: "cope", price: 0 }],
    },
  })

  const handleFormSubmit = (values: SaleFormValues) => {
    if (isLoading) return

    if (values.vat_rate !== 18 && values.vat_rate !== 8 && values.vat_rate !== 0) {
      setPendingValues(values)
      setShowVatModal(true)
      return
    }

    void processSale(values)
  }

  async function processSale(values: SaleFormValues) {
    if (isLoading) return

    setFormError("")
    setIsLoading(true)
    setShowVatModal(false)

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("Sesioni ka skaduar. Ju lutem hyni perseri.")
      }

      const { error: saleError } = await supabase.from("sales").insert({
        invoice_num: values.invoice_num,
        date: values.date,
        total_amount: values.total_amount,
        vat_rate: values.vat_rate,
        type: values.type,
        user_id: user.id,
      })

      if (saleError) throw saleError

      if (values.type === "Mall") {
        for (const item of values.items) {
          const { data: existing, error: stockLookupError } = await supabase
            .from("stock")
            .select("*")
            .eq("item_name", item.item_name)
            .eq("user_id", user.id)
            .maybeSingle()

          if (stockLookupError) throw stockLookupError

          if (existing) {
            const newQty = Math.max(0, Number(existing.quantity) - Number(item.quantity))
            const { error: updateError } = await supabase.from("stock").update({ quantity: newQty }).eq("id", existing.id)
            if (updateError) throw updateError
          }
        }
      }

      toast.success("Shitja u regjistrua me sukses!")
      form.reset({
        invoice_num: "",
        date: new Date().toISOString().split("T")[0],
        total_amount: 0,
        vat_rate: 18,
        type: "Mall",
        items: [{ item_name: "", quantity: 1, unit: "cope", price: 0 }],
      })
      setPendingValues(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : t("auth.error_unexpected")
      setFormError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = () => {
    const current = form.getValues("items")
    if (current.length >= MAX_ITEMS) {
      toast.warning(`Lejohen maksimumi ${MAX_ITEMS} artikuj ne nje fature.`)
      return
    }

    form.setValue("items", [...current, { item_name: "", quantity: 1, unit: "cope", price: 0 }], { shouldDirty: true })
  }

  const removeItem = (index: number) => {
    const current = form.getValues("items")
    if (current.length > 1) {
      form.setValue("items", current.filter((_, itemIndex) => itemIndex !== index), { shouldDirty: true })
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 print:p-0">
      <div className="print:hidden flex items-center justify-between">
        <div className="flex flex-col space-y-2">
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{t("sales")}</h2>
          <p className="text-muted-foreground">Krijoni faturat e shitjes dhe menaxhoni stokun</p>
        </div>
        <Button onClick={() => window.print()} variant="outline" className="glass h-12 rounded-xl border-primary/20 px-6 hover:bg-primary/5">
          <Printer className="mr-2 h-5 w-5" /> {t("print")}
        </Button>
      </div>

      <Card className="glass border-border shadow-xl print:border-none print:bg-white print:text-black print:shadow-none">
        <CardHeader className="print:pb-8">
          <CardTitle className="flex items-center text-xl print:text-2xl print:font-bold">
            <Receipt className="mr-2 h-5 w-5 text-primary print:hidden" />
            Fatura e Shitjes #{form.watch("invoice_num") || "____"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
              {formError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{formError}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="invoice_num"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("invoice_number")}</FormLabel>
                      <FormControl>
                        <Input className="h-11 bg-background/50 print:border-b print:bg-transparent" maxLength={MAX_INVOICE_LENGTH} {...field} />
                      </FormControl>
                      <p className="text-[11px] text-muted-foreground">{field.value.length}/{MAX_INVOICE_LENGTH} karaktere</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("date")}</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-11 bg-background/50 print:border-b print:bg-transparent" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-background/50">
                            <SelectValue placeholder="Zgjidh llojin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="glass border-border">
                          <SelectItem value="Mall">{t("product")}</SelectItem>
                          <SelectItem value="Sherbim">{t("service")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vat_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("vat_rate")} (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" className="h-11 bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="total_amount"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-bold text-primary">{t("total_amount")} (EUR)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" className="h-11 border-primary/20 bg-primary/5 text-xl font-bold" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2 print:border-black">
                  <h3 className="flex items-center text-sm font-bold uppercase tracking-widest text-muted-foreground print:text-black">Artikujt</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="print:hidden h-8 rounded-lg border-primary/20 bg-primary/5 text-primary">
                    <Plus className="mr-1 h-3 w-3" /> Shto Artikull
                  </Button>
                </div>

                <div className="space-y-4">
                  {form.watch("items").map((_, index) => (
                    <div key={index} className="grid grid-cols-1 items-end gap-4 animate-in fade-in slide-in-from-right-2 duration-300 md:grid-cols-12 print:grid-cols-4 print:gap-1">
                      <div className="md:col-span-5 print:col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.item_name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="print:hidden text-xs">{t("item_name")}</FormLabel>
                              <FormControl>
                                <Input className="h-10 bg-background/50 print:border-none print:text-sm" maxLength={120} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:col-span-2 print:col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="print:hidden text-xs">{t("quantity")}</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.001" min="0.001" className="h-10 bg-background/50 print:border-none print:text-sm" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:col-span-2 print:col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="print:hidden text-xs">{t("total_amount")} (EUR)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" min="0" className="h-10 bg-background/50 print:border-none print:text-sm" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="print:hidden md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">{t("unit")}</FormLabel>
                              <FormControl>
                                <Input className="h-10 bg-background/50" maxLength={20} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="print:hidden pb-1 md:col-span-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-10 w-10 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="!mt-12 flex justify-end">
                <Button type="submit" className="print:hidden primary-gradient h-12 w-full rounded-xl text-lg font-bold shadow-lg transition-all hover:shadow-primary/20 md:w-64" disabled={isLoading}>
                  {isLoading ? <Spinner className="mr-2" /> : <><Save className="mr-2 h-5 w-5" /> {t("add_sale")}</>}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <AlertDialog open={showVatModal} onOpenChange={setShowVatModal}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-amber-500">
              <AlertTriangle className="mr-2 h-5 w-5" />
              {t("confirm_vat")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm_vat_desc")} (Aktuale: {pendingValues?.vat_rate}%)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowVatModal(false)}>Kthehu</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingValues && void processSale(pendingValues)} disabled={isLoading} className="bg-primary text-white">
              {isLoading ? <Spinner className="mr-2" /> : "Konfirmo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="fixed bottom-0 left-0 right-0 hidden border-t border-black p-8 text-center text-xs print:block">
        <p>Faleminderit per bashkepunimin! | ERP Anti-Gravity AI</p>
      </div>
    </div>
  )
}
