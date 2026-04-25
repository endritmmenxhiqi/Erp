"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "@/components/language-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { Spinner } from "@/components/spinner"
import { AlertCircle, AlertTriangle, Plus, Printer, Receipt, Save, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { StockService } from "@/lib/services/stock"
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

export default function SalesPage() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [showVatModal, setShowVatModal] = useState(false)
  const [pendingValues, setPendingValues] = useState<any>(null)
  const [formError, setFormError] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()

  const saleSchema = z.object({
    invoice_num: z.string().trim().min(1, t("val_invoice_required")).max(MAX_INVOICE_LENGTH, `Max ${MAX_INVOICE_LENGTH}`),
    date: z.string().min(1, t("val_date_required")),
    total_amount: z.coerce.number().gt(0, t("val_total_gt_zero")),
    vat_rate: z.coerce.number().min(0, t("val_vat_negative")).max(100, t("val_vat_max")),
    type: z.enum(["Mall", "Sherbim"]),
    items: z
      .array(
        z.object({
          item_name: z.string().trim().min(1, t("val_item_required")).max(120, "Too long"),
          quantity: z.coerce.number().gt(0, t("val_qty_gt_zero")),
          unit: z.string().trim().min(1, t("val_unit_required")).max(20, "Too long"),
          price: z.coerce.number().min(0, t("val_vat_negative")),
          barcode: z.string().optional(),
          available_stock: z.number().optional(),
        })
      )
      .min(1, t("val_at_least_one"))
      .max(MAX_ITEMS, `Max ${MAX_ITEMS}`),
  })

  type SaleFormValues = z.infer<typeof saleSchema>

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as never,
    defaultValues: {
      invoice_num: "",
      date: new Date().toISOString().split("T")[0],
      total_amount: 0,
      vat_rate: 18,
      type: "Mall",
      items: [{ item_name: "", quantity: 1, unit: "cope", price: 0, barcode: "", available_stock: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const watchedItems = form.watch("items")
  const vatRate = form.watch("vat_rate") || 0
  
  const subtotal = watchedItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.price) || 0
    return acc + (qty * price)
  }, 0)

  const vatAmount = subtotal * (vatRate / 100)
  const calculatedTotal = subtotal + vatAmount

  useEffect(() => {
    form.setValue("total_amount", parseFloat(calculatedTotal.toFixed(2)), { 
      shouldValidate: true,
      shouldDirty: true 
    })
  }, [calculatedTotal, form])

  useEffect(() => {
    const fetchLastInvoice = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('sales')
          .select('invoice_num')
          .eq('user_id', user.id)
          .order('id', { ascending: false })
          .limit(1)

        if (data && data.length > 0) {
          const lastNum = parseInt(data[0].invoice_num)
          if (!isNaN(lastNum)) {
            form.setValue("invoice_num", (lastNum + 1).toString())
          }
        } else {
          form.setValue("invoice_num", "1")
        }
      }
    }
    fetchLastInvoice()

    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    fetchProfile()
  }, [form, supabase])

  const handleBarcodeSearch = async (index: number, barcode: string, silent = false) => {
    if (!barcode) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const data = await StockService.getStockByBarcode(barcode)

      if (data && data.user_id === user.id) {
        form.setValue(`items.${index}.item_name`, data.item_name)
        form.setValue(`items.${index}.unit`, data.unit)
        form.setValue(`items.${index}.price`, data.selling_price || 0)
        form.setValue(`items.${index}.available_stock`, data.quantity)
        
        if (!silent) {
          toast.success(`${t("product")}: ${data.item_name} (${t("stock")}: ${data.quantity})`)
        }
      }
    } catch (err) {
      console.error("Barcode search error:", err)
    }
  }

  const handleFormSubmit = async (values: SaleFormValues) => {
    setFormError("")
    const currentVatRate = values.vat_rate
    const hasChangedVat = currentVatRate !== 18 && currentVatRate !== 0 && currentVatRate !== 8

    if (hasChangedVat) {
      setPendingValues(values)
      setShowVatModal(true)
    } else {
      await processSale(values)
    }
  }

  const processSale = async (values: SaleFormValues) => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Session expired")

      const { data: saleData, error: saleError } = await supabase.from("sales").insert({
        invoice_num: values.invoice_num,
        date: values.date,
        total_amount: values.total_amount,
        vat_rate: values.vat_rate,
        type: values.type,
        user_id: user.id,
      }).select().single()

      if (saleError) throw saleError

      const saleItemsToInsert = values.items.map(item => ({
        sale_id: saleData.id,
        item_name: item.item_name,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit,
        barcode: item.barcode,
        user_id: user.id
      }))

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItemsToInsert)
      if (itemsError) throw itemsError

      if (values.type === "Mall") {
        for (const item of values.items) {
          await StockService.updateStock(
            item.item_name,
            -item.quantity,
            item.unit,
            user.id
          )
        }
      }

      toast.success(t("auth.success_login"))
      
      setTimeout(() => {
        window.print()
      }, 500)

      form.reset({
        invoice_num: (parseInt(values.invoice_num) + 1).toString(),
        date: new Date().toISOString().split("T")[0],
        total_amount: 0,
        vat_rate: 18,
        type: "Mall",
        items: [{ item_name: "", quantity: 1, unit: "cope", price: 0, barcode: "", available_stock: 0 }],
      })
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
      setShowVatModal(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="print:hidden flex flex-col space-y-2">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{t("sales")}</h2>
        <p className="text-muted-foreground">{t("dashboard_desc")}</p>
      </div>

      <div className="hidden print:block bg-white text-black p-[20mm] font-sans text-sm print:h-auto">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 0; size: auto; }
            body { margin: 0; }
            [data-sonner-toaster] { display: none !important; }
          }
        `}} />
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">{t("sales")}</h1>
            <p className="font-bold text-lg">{t("invoice_number")}: {form.watch("invoice_num")}</p>
            <p className="text-muted-foreground mt-1">{t("date")}: {form.watch("date")}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase">{profile?.business_name || "BUSINESS NAME"}</h2>
            <p className="font-medium">{t("fiscal_number")}: {profile?.fiscal_number || "FISCAL NUMBER"}</p>
            <p>{t("address")}: {profile?.address || "ADDRESS"}</p>
            <p>Tel: {profile?.phone_number || "PHONE"}</p>
          </div>
        </div>

        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-2 px-1">{t("barcode")}</th>
                <th className="py-2 px-1">{t("item_name")}</th>
                <th className="py-2 px-1 text-right">{t("quantity")}</th>
                <th className="py-2 px-1 text-right">{t("price")}</th>
                <th className="py-2 px-1 text-right">{t("total_amount")}</th>
              </tr>
            </thead>
            <tbody>
              {watchedItems.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 px-1 font-mono text-xs">{item.barcode || "—"}</td>
                  <td className="py-2 px-1 font-bold">{item.item_name}</td>
                  <td className="py-2 px-1 text-right">{item.quantity} {item.unit}</td>
                  <td className="py-2 px-1 text-right">{Number(item.price).toFixed(2)} €</td>
                  <td className="py-2 px-1 text-right font-bold">{(Number(item.quantity) * Number(item.price)).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-12">
          <div className="w-64 space-y-2 text-right">
            <div className="flex justify-between border-b pb-1">
              <span>{t("subtotal")}:</span>
              <span className="font-medium">{subtotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span>{t("vat_amount")} ({vatRate}%):</span>
              <span className="font-medium">{vatAmount.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-2xl font-black pt-2 border-t-2 border-black text-primary">
              <span>{t("grand_total")}:</span>
              <span>{calculatedTotal.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </div>

      <Card className="glass border-border shadow-xl print:hidden">
        <CardHeader className="print:pb-8">
          <CardTitle className="flex items-center text-xl print:text-2xl print:font-bold">
            <Receipt className="mr-2 h-5 w-5 text-primary print:hidden" />
            {t("invoice_number")} #{form.watch("invoice_num") || "____"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
              {formError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2 animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
                <FormField
                  control={form.control}
                  name="invoice_num"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{t("invoice_number")}</FormLabel>
                      <FormControl>
                        <Input placeholder="0001" {...field} className="h-11 bg-background/50" />
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
                      <FormLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{t("date")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-11 bg-background/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vat_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{t("vat_rate")} (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="h-11 bg-background/50" onFocus={(e) => e.target.select()} />
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
                      <FormLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{t("type")}</FormLabel>
                      <Select onValueChange={(val: string | null) => { if (val) field.onChange(val) }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-background/50">
                            <SelectValue placeholder={t("type")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="glass">
                          <SelectItem value="Mall">{t("product")}</SelectItem>
                          <SelectItem value="Sherbim">{t("service")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                    <Plus className="w-4 h-4 mr-2" /> {t("details")}
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-primary/20 text-primary hover:bg-primary/10 font-bold"
                    onClick={() => append({ item_name: "", quantity: 1, unit: "cope", price: 0, barcode: "", available_stock: 0 })}
                  >
                    {t("add_item")}
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const isOver = form.watch(`items.${index}.quantity`) > (form.watch(`items.${index}.available_stock`) || 0) && form.watch("type") === "Mall" && (form.watch(`items.${index}.available_stock`) || 0) > 0
                    
                    return (
                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-muted/10 rounded-2xl border border-border/30 group animate-in slide-in-from-right-2">
                        <div className="md:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block px-1">{t("barcode")}</label>
                          <Input
                            {...form.register(`items.${index}.barcode`)}
                            placeholder="600xxx..."
                            className="h-9 bg-background/50 text-sm"
                            onBlur={(e) => handleBarcodeSearch(index, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                handleBarcodeSearch(index, (e.target as HTMLInputElement).value)
                              }
                            }}
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block px-1">{t("item_name")}</label>
                          <Input
                            {...form.register(`items.${index}.item_name`)}
                            placeholder={t("item_name")}
                            className="h-9 bg-background/50 text-sm font-bold"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block px-1">{t("quantity")}</label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.001"
                              min="0.001"
                              {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                              className={cn(
                                "h-9 bg-background/50 text-sm",
                                isOver && "border-destructive text-destructive"
                              )}
                              onFocus={(e) => e.target.select()}
                            />
                            {isOver && (
                              <div className="absolute -top-6 right-0 text-[10px] font-bold text-destructive animate-pulse">
                                {t("stock")}: {form.watch(`items.${index}.available_stock`)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block px-1">{t("unit")}</label>
                          <Input
                            {...form.register(`items.${index}.unit`)}
                            placeholder="cope"
                            className="h-9 bg-background/50 text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block px-1">{t("price")}</label>
                          <Input
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.price`, { valueAsNumber: true })}
                            className="h-9 bg-background/50 text-sm font-bold text-primary"
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                        <div className="md:col-span-1 flex items-end justify-center pb-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                            onClick={() => fields.length > 1 && remove(index)}
                            disabled={fields.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-end justify-between gap-6 pt-6 border-t border-border/50">
                <div className="w-full md:w-64 space-y-3 bg-primary/5 p-6 rounded-2xl border border-primary/10">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">{t("subtotal")}:</span>
                    <span className="font-bold">{subtotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">{t("vat_amount")} ({vatRate}%):</span>
                    <span className="font-bold">{vatAmount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-primary/20">
                    <span className="text-lg font-black text-primary">{t("grand_total")}:</span>
                    <span className="text-2xl font-black text-primary">{calculatedTotal.toFixed(2)} €</span>
                  </div>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                   <Button 
                    type="button"
                    variant="outline"
                    className="h-14 px-8 rounded-2xl border-border font-bold flex-1 md:flex-none"
                    onClick={() => window.print()}
                  >
                    <Printer className="mr-2 h-5 w-5" /> {t("print")}
                  </Button>
                  <Button 
                    type="submit" 
                    className="h-14 px-12 rounded-2xl primary-gradient text-white font-black text-lg shadow-lg shadow-primary/20 flex-1 md:flex-none transition-all active:scale-95" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <><Spinner className="mr-2" /> {t("processing")}</>
                    ) : (
                      <><Save className="mr-2 h-5 w-5" /> {t("register_sale_btn")}</>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <AlertDialog open={showVatModal} onOpenChange={setShowVatModal}>
        <AlertDialogContent className="glass border-border rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-yellow-500" />
              {t("confirm_vat")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-base">
              {t("confirm_vat_desc")} ({t("total")}: {pendingValues?.vat_rate}%)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowVatModal(false)}>{t("back")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingValues && void processSale(pendingValues)} disabled={isLoading} className="primary-gradient text-white font-bold rounded-xl px-8">
              {isLoading ? <Spinner className="mr-2" /> : t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TrendingUp(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}
