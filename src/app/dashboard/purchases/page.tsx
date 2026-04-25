"use client"

import { useState, useEffect, type ChangeEvent } from "react"
import { useTranslation } from "@/components/language-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { Spinner } from "@/components/spinner"
import { AlertCircle, FileUp, Plus, Save, Trash2, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { StockService } from "@/lib/services/stock"

import { MAX_INVOICE_LENGTH, MAX_ITEMS, MAX_FILE_SIZE } from "@/lib/constants"

export default function PurchasesPage() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [formError, setFormError] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        setProfile(data)
      }
    }
    fetchProfile()
  }, [supabase])

  const purchaseSchema = z.object({
    invoice_num: z.string().trim().min(1, t("val_invoice_required")).max(MAX_INVOICE_LENGTH, "Too long"),
    date: z.string().min(1, t("val_date_required")),
    total_cost: z.coerce.number().gt(0, t("val_total_gt_zero")),
    seller_fiscal_num: z.string().optional(),
    items: z
      .array(
        z.object({
          item_name: z.string().trim().min(1, t("val_item_required")).max(120, "Too long"),
          quantity: z.coerce.number().gt(0, t("val_qty_gt_zero")),
          unit: z.string().trim().min(1, t("val_unit_required")).max(20, "Too long"),
          cost_price: z.coerce.number().min(0, t("val_vat_negative")),
        })
      )
      .min(1, t("val_at_least_one"))
      .max(MAX_ITEMS, "Too many items"),
  })

  type PurchaseFormValues = z.infer<typeof purchaseSchema>

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema) as never,
    defaultValues: {
      invoice_num: "",
      date: new Date().toISOString().split("T")[0],
      total_cost: 0,
      seller_fiscal_num: "",
      items: [{ item_name: "", quantity: 1, unit: "cope", cost_price: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const watchedItems = form.watch("items")
  
  useEffect(() => {
    const total = watchedItems.reduce((acc, item) => {
      const qty = Number(item.quantity) || 0
      const price = Number(item.cost_price) || 0
      return acc + (qty * price)
    }, 0)
    form.setValue("total_cost", parseFloat(total.toFixed(2)), { shouldValidate: true })
  }, [watchedItems, form])

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large (max 5MB)")
      return
    }

    setIsExtracting(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Image }),
        })

        if (!response.ok) throw new Error("AI Extraction failed")

        const data = await response.json()
        if (data.invoice_num) form.setValue("invoice_num", data.invoice_num)
        if (data.date) form.setValue("date", data.date)
        if (data.seller_fiscal_num) form.setValue("seller_fiscal_num", data.seller_fiscal_num)
        if (data.total_amount) form.setValue("total_cost", data.total_amount)
        
        if (data.items && data.items.length > 0) {
          form.setValue("items", data.items.map((item: any) => ({
            item_name: item.description,
            quantity: item.quantity || 1,
            unit: item.unit || "cope",
            cost_price: item.price || 0
          })))
        }

        toast.success("AI Extraction Success!")
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleFormSubmit = async (values: PurchaseFormValues) => {
    setIsLoading(true)
    setFormError("")
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Session expired")

      const { data: purchaseData, error: purchaseError } = await supabase.from("purchases").insert({
        invoice_num: values.invoice_num,
        date: values.date,
        total_cost: values.total_cost,
        seller_fiscal_num: values.seller_fiscal_num,
        user_id: user.id,
      }).select().single()

      if (purchaseError) throw purchaseError

      const purchaseItemsToInsert = values.items.map(item => ({
        purchase_id: purchaseData.id,
        item_name: item.item_name,
        quantity: item.quantity,
        cost_price: item.cost_price,
        unit: item.unit,
        user_id: user.id
      }))

      const { error: itemsError } = await supabase.from("purchase_items").insert(purchaseItemsToInsert)
      if (itemsError) throw itemsError

      for (const item of values.items) {
        await StockService.updateStock(
          item.item_name,
          item.quantity,
          item.unit,
          user.id
        )
      }

      toast.success(t("auth.success_login"))
      form.reset({
        invoice_num: "",
        date: new Date().toISOString().split("T")[0],
        total_cost: 0,
        seller_fiscal_num: "",
        items: [{ item_name: "", quantity: 1, unit: "cope", cost_price: 0 }],
      })
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{t("purchases")}</h2>
        <p className="text-muted-foreground">{t("dashboard_desc")}</p>
      </div>

      <div className={cn("grid gap-8", profile?.ai_enabled ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1")}>
        {profile?.ai_enabled && (
          <Card className="lg:col-span-1 glass border-border shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <FileUp className="mr-2 h-5 w-5 text-primary" />
                {t("ai_extract")}
              </CardTitle>
              <CardDescription>{t("register_subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5 group hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isExtracting}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="bg-primary/10 p-5 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  {isExtracting ? (
                     <Spinner className="h-8 w-8 text-primary" />
                  ) : (
                     <FileUp className="h-8 w-8 text-primary" />
                  )}
                </div>
                <p className="text-sm font-bold text-primary">{isExtracting ? t("processing") : t("ai_extract")}</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={cn("glass border-border shadow-xl", profile?.ai_enabled ? "lg:col-span-2" : "w-full")}>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Plus className="mr-2 h-5 w-5 text-primary" />
              {t("manual_entry")}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
                  <FormField
                    control={form.control}
                    name="invoice_num"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{t("invoice_number")}</FormLabel>
                        <FormControl>
                          <Input placeholder="INV-001" {...field} className="h-11 bg-background/50" />
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
                    name="seller_fiscal_num"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{t("seller_fiscal")}</FormLabel>
                        <FormControl>
                          <Input placeholder="600xxxxxx" {...field} className="h-11 bg-background/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                      <Package className="w-4 h-4 mr-2" /> {t("details")}
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-primary/20 text-primary hover:bg-primary/10 font-bold"
                      onClick={() => append({ item_name: "", quantity: 1, unit: "cope", cost_price: 0 })}
                    >
                      {t("add_item")}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-muted/10 rounded-2xl border border-border/30 group animate-in slide-in-from-right-2">
                        <div className="md:col-span-5">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block px-1">{t("item_name")}</label>
                          <Input
                            {...form.register(`items.${index}.item_name`)}
                            placeholder={t("item_name")}
                            className="h-9 bg-background/50 text-sm font-bold"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block px-1">{t("quantity")}</label>
                          <Input
                            type="number"
                            step="0.001"
                            {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                            className="h-9 bg-background/50 text-sm"
                            onFocus={(e) => e.target.select()}
                          />
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
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block px-1">{t("cost_price")}</label>
                          <Input
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.cost_price`, { valueAsNumber: true })}
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
                    ))}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-border/50">
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground font-medium">{t("total_cost")}:</span>
                    <span className="text-3xl font-black text-primary">{form.watch("total_cost").toFixed(2)} €</span>
                  </div>
                  <Button 
                    type="submit" 
                    className="h-14 px-12 rounded-2xl primary-gradient text-white font-black text-lg shadow-lg shadow-primary/20 w-full md:w-auto transition-all active:scale-95" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <><Spinner className="mr-2" /> {t("processing")}</>
                    ) : (
                      <><Save className="mr-2 h-5 w-5" /> {t("register_purchase_btn")}</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
