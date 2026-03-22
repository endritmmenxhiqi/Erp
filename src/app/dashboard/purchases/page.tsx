"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/components/language-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { Spinner } from "@/components/spinner"
import { FileUp, Save, Search, Plus, Trash2, Package } from "lucide-react"
import { cn } from "@/lib/utils"

const purchaseSchema = z.object({
  invoice_num: z.string().min(1),
  date: z.string(),
  total_cost: z.coerce.number().min(0),
  seller_fiscal_num: z.string().optional().or(z.literal("")),
  items: z.array(z.object({
    item_name: z.string().min(1),
    quantity: z.coerce.number().min(0),
    unit: z.string().default("copë"),
  })),
})

type PurchaseFormValues = z.infer<typeof purchaseSchema>

export default function PurchasesPage() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema) as any,
    defaultValues: {
      invoice_num: "",
      date: new Date().toISOString().split('T')[0],
      total_cost: 0,
      seller_fiscal_num: "",
      items: [{ item_name: "", quantity: 0, unit: "copë" }],
    },
  })


  const addItem = () => {
    const current = form.getValues("items")
    form.setValue("items", [...current, { item_name: "", quantity: 0, unit: "copë" }])
  }

  const removeItem = (index: number) => {
    const current = form.getValues("items")
    if (current.length > 1) {
      form.setValue("items", current.filter((_, i) => i !== index))
    }
  }

  const [isExtracting, setIsExtracting] = useState(false)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)

  async function onSubmit(values: z.infer<typeof purchaseSchema>) {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let imageUrl = null

      // Upload file if exists
      if (invoiceFile) {
        const fileExt = invoiceFile.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(fileName, invoiceFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('invoices')
          .getPublicUrl(fileName)
        
        imageUrl = publicUrl
      }

      // 1. Insert Purchase Record
      const { data: purchase, error: pError } = await supabase
        .from('purchases')
        .insert({
          invoice_num: values.invoice_num,
          date: values.date,
          total_cost: values.total_cost,
          seller_fiscal_num: values.seller_fiscal_num,
          image_url: imageUrl,
          user_id: user.id
        })
        .select()
        .single()

      if (pError) throw pError

      // 2. Update Stock (Upsert Logic)
      for (const item of values.items) {
        // Find existing item
        const { data: existing } = await supabase
          .from('stock')
          .select('*')
          .eq('item_name', item.item_name)
          .eq('user_id', user.id)
          .single()

        if (existing) {
          await supabase
            .from('stock')
            .update({ quantity: Number(existing.quantity) + Number(item.quantity) })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('stock')
            .insert({
              item_name: item.item_name,
              quantity: item.quantity,
              unit: item.unit,
              user_id: user.id
            })
        }
      }

      toast.success("Blerja u regjistrua dhe stoku u përditësua!")
      form.reset()
      setInvoiceFile(null)
    } catch (error: any) {
      toast.error(error.message || "Gabim gjatë regjistrimit")
    } finally {
      setIsLoading(false)
    }
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setInvoiceFile(file)
    setIsExtracting(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Set forms values
      if (data.invoice_num) form.setValue("invoice_num", data.invoice_num)
      if (data.date) form.setValue("date", data.date)
      if (data.total_cost) form.setValue("total_cost", data.total_cost)
      if (data.seller_fiscal_num) form.setValue("seller_fiscal_num", data.seller_fiscal_num)
      
      if (data.items && Array.isArray(data.items)) {
        form.setValue("items", data.items.map((item: any) => ({
          item_name: item.item_name || "",
          quantity: item.quantity || 0,
          unit: item.unit || "copë"
        })))
      }

      toast.success("Të dhënat u nxorrën me sukses!")
    } catch (error: any) {
      toast.error(error.message || "Gabim gjatë procesimit me AI")
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{t("purchases")}</h2>
        <p className="text-muted-foreground">{t("manual_entry")} dhe inputi i materialit</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Form Container */}
        <Card className="lg:col-span-2 glass border-border shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Plus className="w-5 h-5 mr-2 text-primary" />
              {t("add_purchase")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="invoice_num"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("invoice_number")}</FormLabel>
                        <FormControl>
                          <Input className="h-11 bg-background/50" {...field} />
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
                          <Input type="date" className="h-11 bg-background/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="total_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("total_cost")} (€)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" className="h-11 bg-background/50" {...field} />
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
                        <FormLabel>{t("seller_fiscal")}</FormLabel>
                        <FormControl>
                          <Input className="h-11 bg-background/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground flex items-center">
                       <Package className="w-4 h-4 mr-2" />
                       Artikujt (Stoku)
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 rounded-lg bg-primary/5 border-primary/20 text-primary">
                       <Plus className="w-3 h-3 mr-1" /> Shto Artikull
                    </Button>
                  </div>
                  
                  {form.watch("items").map((_, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end animate-in slide-in-from-left-2 duration-300">
                      <div className="md:col-span-6">
                        <FormField
                          control={form.control}
                          name={`items.${index}.item_name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">{t("item_name")}</FormLabel>
                              <FormControl>
                                <Input className="h-10 bg-background/50" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">{t("quantity")}</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.001" className="h-10 bg-background/50" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:col-span-2">
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
                      <div className="md:col-span-1 pb-1">
                         <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-10 w-10 text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                         </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-full h-12 primary-gradient font-bold text-lg rounded-xl shadow-lg hover:shadow-primary/20 transition-all" disabled={isLoading || isExtracting}>
                  {isLoading ? <Spinner className="mr-2" /> : <><Save className="w-5 h-5 mr-2" /> {t("add_purchase")}</>}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* AI Processing */}
        <Card className="glass border-border shadow-xl h-fit border-dashed border-2 relative overflow-hidden">
           <CardHeader>
              <CardTitle className="text-lg flex items-center">
                 <FileUp className="w-5 h-5 mr-2 text-indigo-500" />
                 AI Analysis (PDF/Foto)
              </CardTitle>
              <CardDescription>Ngarkoni faturën për procesim automatik</CardDescription>
           </CardHeader>
           <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                 {isExtracting ? <Spinner className="w-10 h-10 text-indigo-500" /> : <FileUp className="w-10 h-10 text-indigo-500" />}
              </div>
              <p className="text-xs text-center text-muted-foreground max-w-[180px]">
                 {invoiceFile ? `Skedari: ${invoiceFile.name}` : "Zvarritni faturën këtu ose klikoni për të përzgjedhur"}
              </p>
              
              <label 
                className={cn(
                  "w-full h-11 flex items-center justify-center border rounded-xl cursor-pointer transition-colors",
                  isExtracting ? "opacity-50 cursor-not-allowed bg-accent/50" : "hover:bg-accent border-border"
                )}
              >
                <span className="text-sm font-semibold">{isExtracting ? "Duke procesuar..." : t("ai_extract")}</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*,application/pdf"
                  disabled={isExtracting}
                  onChange={onFileChange}
                />
              </label>
              
              {isExtracting && (
                <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] flex items-center justify-center z-10" />
              )}
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
