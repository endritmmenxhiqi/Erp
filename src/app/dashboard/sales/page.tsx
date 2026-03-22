"use client"

import { useState, useEffect } from "react"
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
import { 
  Users, 
  Save, 
  Printer, 
  Plus, 
  Trash2, 
  AlertTriangle,
  Receipt
} from "lucide-react"
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

const saleSchema = z.object({
  invoice_num: z.string().min(1),
  date: z.string(),
  total_amount: z.coerce.number().min(0),
  vat_rate: z.coerce.number().min(0).max(100),
  type: z.enum(["Mall", "Shërbim"]),
  items: z.array(z.object({
    item_name: z.string().min(1),
    quantity: z.coerce.number().min(0),
    unit: z.string().default("copë"),
    price: z.coerce.number().min(0),
  })),
})

type SaleFormValues = z.infer<typeof saleSchema>

export default function SalesPage() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [showVatModal, setShowVatModal] = useState(false)
  const [pendingValues, setPendingValues] = useState<SaleFormValues | null>(null)
  const supabase = createClient()
  
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      invoice_num: "",
      date: new Date().toISOString().split('T')[0],
      total_amount: 0,
      vat_rate: 18,
      type: "Mall",
      items: [{ item_name: "", quantity: 0, unit: "copë", price: 0 }],
    },
  })

  // Logical check for VAT change
  const handleFormSubmit = (values: SaleFormValues) => {
    // If VAT is not default (e.g. 18), ask for confirmation
    if (values.vat_rate !== 18 && values.vat_rate !== 8 && values.vat_rate !== 0) {
       setPendingValues(values)
       setShowVatModal(true)
    } else {
       processSale(values)
    }
  }

  async function processSale(values: z.infer<typeof saleSchema>) {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Insert Sale Record
      const { data: sale, error: sError } = await supabase
        .from('sales')
        .insert({
          invoice_num: values.invoice_num,
          date: values.date,
          total_amount: values.total_amount,
          vat_rate: values.vat_rate,
          type: values.type,
          user_id: user.id
        })
        .select()
        .single()

      if (sError) throw sError

      // 2. Update Stock if type is "Mall"
      if (values.type === "Mall") {
        for (const item of values.items) {
          const { data: existing } = await supabase
            .from('stock')
            .select('*')
            .eq('item_name', item.item_name)
            .eq('user_id', user.id)
            .single()

          if (existing) {
             const newQty = Number(existing.quantity) - Number(item.quantity)
             await supabase
               .from('stock')
               .update({ quantity: newQty < 0 ? 0 : newQty })
               .eq('id', existing.id)
          }
        }
      }

      toast.success(t("auth.success_register"))
      form.reset()
      setPendingValues(null)
    } catch (error: any) {
      toast.error(error.message || t("auth.error_unexpected"))
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = () => {
    const current = form.getValues("items")
    form.setValue("items", [...current, { item_name: "", quantity: 0, unit: "copë", price: 0 }])
  }

  const removeItem = (index: number) => {
    const current = form.getValues("items")
    if (current.length > 1) {
      form.setValue("items", current.filter((_, i) => i !== index))
    }
  }

  const handlePrint = () => {
     window.print()
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex flex-col space-y-2">
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{t("sales")}</h2>
          <p className="text-muted-foreground">Krijoni faturat e shitjes dhe menaxhoni stokun</p>
        </div>
        <Button onClick={handlePrint} variant="outline" className="h-12 px-6 rounded-xl glass border-primary/20 hover:bg-primary/5">
           <Printer className="w-5 h-5 mr-2" /> {t("print")}
        </Button>
      </div>

      <Card className="glass border-border shadow-xl print:shadow-none print:border-none print:bg-white print:text-black">
        <CardHeader className="print:pb-8">
          <CardTitle className="text-xl flex items-center print:text-2xl print:font-bold">
            <Receipt className="w-5 h-5 mr-2 text-primary print:hidden" />
            Fatura e Shitjes #{form.watch("invoice_num") || "____"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="invoice_num"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("invoice_number")}</FormLabel>
                      <FormControl>
                        <Input className="h-11 bg-background/50 print:border-b print:bg-transparent" {...field} />
                      </FormControl>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-background/50">
                            <SelectValue placeholder="Zgjidh llojin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="glass border-border">
                          <SelectItem value="Mall">{t("product")}</SelectItem>
                          <SelectItem value="Shërbim">{t("service")}</SelectItem>
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
                        <Input type="number" className="h-11 bg-background/50" {...field} />
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
                      <FormLabel className="text-primary font-bold">{t("total_amount")} (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="h-11 bg-primary/5 border-primary/20 text-xl font-bold" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2 print:border-black">
                  <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground flex items-center print:text-black">
                     Artikujt
                  </h3>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 rounded-lg bg-primary/5 border-primary/20 text-primary print:hidden">
                     <Plus className="w-3 h-3 mr-1" /> Shto Artikull
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {form.watch("items").map((_, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end animate-in fade-in slide-in-from-right-2 duration-300 print:grid-cols-4 print:gap-1">
                      <div className="md:col-span-5 print:col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.item_name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs print:hidden">{t("item_name")}</FormLabel>
                              <FormControl>
                                <Input className="h-10 bg-background/50 print:border-none print:text-sm" {...field} />
                              </FormControl>
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
                              <FormLabel className="text-xs print:hidden">{t("quantity")}</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.001" className="h-10 bg-background/50 print:border-none print:text-sm" {...field} />
                              </FormControl>
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
                              <FormLabel className="text-xs print:hidden">{t("total_amount")} (€)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" className="h-10 bg-background/50 print:border-none print:text-sm" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:col-span-2 print:hidden">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">{t("unit")}</FormLabel>
                              <FormControl>
                                <Input className="h-10 bg-background/50" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:col-span-1 pb-1 print:hidden">
                         <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-10 w-10 text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                         </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end !mt-12">
                 <Button type="submit" className="w-full md:w-64 h-12 primary-gradient font-bold text-lg rounded-xl shadow-lg hover:shadow-primary/20 transition-all print:hidden" disabled={isLoading}>
                    {isLoading ? <Spinner className="mr-2" /> : <><Save className="w-5 h-5 mr-2" /> {t("add_sale")}</>}
                 </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* VAT Confirmation Modal */}
      <AlertDialog open={showVatModal} onOpenChange={setShowVatModal}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-amber-500">
               <AlertTriangle className="w-5 h-5 mr-2" />
               {t("confirm_vat")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm_vat_desc")} (Aktuale: {pendingValues?.vat_rate}%)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowVatModal(false)}>{t("continue")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingValues && processSale(pendingValues)} className="bg-primary text-white">
              {t("continue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Professional A4 Footer for print */}
      <div className="hidden print:block fixed bottom-0 left-0 right-0 p-8 border-t border-black text-center text-xs">
         <p>Faleminderit për bashkëpunimin! | ERP Anti-Gravity AI</p>
      </div>
    </div>
  )
}
