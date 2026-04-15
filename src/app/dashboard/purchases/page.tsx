"use client"

import { useState, type ChangeEvent } from "react"
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
import { AlertCircle, FileUp, Plus, Save, Trash2, Package } from "lucide-react"
import { cn } from "@/lib/utils"

import { MAX_INVOICE_LENGTH, MAX_ITEMS, MAX_FILE_SIZE } from "@/lib/constants"

const itemSchema = z.object({
  item_name: z.string().trim().min(1, "Shkruani emrin e artikullit").max(120, "Emri i artikullit eshte shume i gjate"),
  quantity: z.coerce.number().gt(0, "Sasia duhet te jete me e madhe se 0"),
  unit: z.string().trim().min(1, "Njesia eshte e detyrueshme").max(20, "Njesia eshte shume e gjate"),
})

const purchaseSchema = z.object({
  invoice_num: z.string().trim().min(1, "Numri i fatures eshte i detyrueshem").max(MAX_INVOICE_LENGTH, `Maksimumi ${MAX_INVOICE_LENGTH} karaktere`),
  date: z.string().min(1, "Data eshte e detyrueshme"),
  total_cost: z.coerce.number().gt(0, "Totali duhet te jete me i madh se 0"),
  seller_fiscal_num: z.string().trim().max(40, "Numri fiskal eshte shume i gjate").optional().or(z.literal("")),
  items: z.array(itemSchema).min(1, "Shtoni te pakten nje artikull").max(MAX_ITEMS, `Maksimumi ${MAX_ITEMS} artikuj per nje fature`),
})

type PurchaseFormValues = z.infer<typeof purchaseSchema>

export default function PurchasesPage() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [extractError, setExtractError] = useState("")
  const [formError, setFormError] = useState("")
  const supabase = createClient()

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema) as never,
    defaultValues: {
      invoice_num: "",
      date: new Date().toISOString().split("T")[0],
      total_cost: 0,
      seller_fiscal_num: "",
      items: [{ item_name: "", quantity: 1, unit: "cope" }],
    },
  })

  const addItem = () => {
    const current = form.getValues("items")
    if (current.length >= MAX_ITEMS) {
      toast.warning(`Lejohen maksimumi ${MAX_ITEMS} artikuj ne nje fature.`)
      return
    }

    form.setValue("items", [...current, { item_name: "", quantity: 1, unit: "cope" }], { shouldDirty: true })
  }

  const removeItem = (index: number) => {
    const current = form.getValues("items")
    if (current.length > 1) {
      form.setValue("items", current.filter((_, itemIndex) => itemIndex !== index), { shouldDirty: true })
    }
  }

  async function onSubmit(values: PurchaseFormValues) {
    if (isLoading || isExtracting) return

    setFormError("")
    setIsLoading(true)

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("Sesioni ka skaduar. Ju lutem hyni perseri.")
      }

      let imageUrl: string | null = null

      if (invoiceFile) {
        const fileExt = invoiceFile.name.split(".").pop() || "bin"
        const fileName = `${user.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from("invoices").upload(fileName, invoiceFile)
        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from("invoices").getPublicUrl(fileName)

        imageUrl = publicUrl
      }

      const { error: purchaseError } = await supabase.from("purchases").insert({
        invoice_num: values.invoice_num,
        date: values.date,
        total_cost: values.total_cost,
        seller_fiscal_num: values.seller_fiscal_num,
        image_url: imageUrl,
        user_id: user.id,
      })

      if (purchaseError) throw purchaseError

      for (const item of values.items) {
        const { data: existing, error: stockLookupError } = await supabase
          .from("stock")
          .select("*")
          .eq("item_name", item.item_name)
          .eq("user_id", user.id)
          .maybeSingle()

        if (stockLookupError) throw stockLookupError

        if (existing) {
          const { error: updateError } = await supabase
            .from("stock")
            .update({ quantity: Number(existing.quantity) + Number(item.quantity) })
            .eq("id", existing.id)

          if (updateError) throw updateError
        } else {
          const { error: insertError } = await supabase.from("stock").insert({
            item_name: item.item_name,
            quantity: item.quantity,
            unit: item.unit,
            user_id: user.id,
          })

          if (insertError) throw insertError
        }
      }

      toast.success("Blerja u regjistrua dhe stoku u perditesua.")
      form.reset({
        invoice_num: "",
        date: new Date().toISOString().split("T")[0],
        total_cost: 0,
        seller_fiscal_num: "",
        items: [{ item_name: "", quantity: 1, unit: "cope" }],
      })
      setInvoiceFile(null)
      setExtractError("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gabim gjate regjistrimit"
      setFormError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    if (isExtracting) return

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setExtractError("Ngarkoni vetem imazh ose PDF.")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setExtractError("Skedari eshte shume i madh. Kufiri eshte 5MB.")
      return
    }

    setInvoiceFile(file)
    setExtractError("")
    setIsExtracting(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 20000)

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })

      window.clearTimeout(timeoutId)

      const data = await response.json().catch(() => {
        throw new Error("Serveri ktheu nje pergjigje te pavlefshme.")
      })

      if (!response.ok || data.error) {
        throw new Error(data.error || "Procesimi me AI deshtoi.")
      }

      if (data.invoice_num) form.setValue("invoice_num", data.invoice_num, { shouldValidate: true })
      if (data.date) form.setValue("date", data.date, { shouldValidate: true })
      if (typeof data.total_cost === "number") form.setValue("total_cost", data.total_cost, { shouldValidate: true })
      if (data.seller_fiscal_num) form.setValue("seller_fiscal_num", data.seller_fiscal_num, { shouldValidate: true })

      if (Array.isArray(data.items) && data.items.length > 0) {
        form.setValue(
          "items",
          data.items.slice(0, MAX_ITEMS).map((item: { item_name?: string; quantity?: number; unit?: string }) => ({
            item_name: item.item_name || "",
            quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
            unit: item.unit || "cope",
          })),
          { shouldValidate: true }
        )
      }

      toast.success("Te dhenat u nxorren me sukses.")
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "Procesimi po zgjat shume. Kontrolloni rrjetin dhe provoni perseri."
          : error instanceof Error
            ? error.message
            : "Gabim gjate procesimit me AI"

      setExtractError(message)
      toast.error(message)
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
        <Card className="glass border-border shadow-xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Plus className="mr-2 h-5 w-5 text-primary" />
              {t("add_purchase")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {formError && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{formError}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="invoice_num"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("invoice_number")}</FormLabel>
                        <FormControl>
                          <Input className="h-11 bg-background/50" maxLength={MAX_INVOICE_LENGTH} {...field} />
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
                        <FormLabel>{t("total_cost")} (EUR)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" className="h-11 bg-background/50" {...field} />
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
                          <Input className="h-11 bg-background/50" maxLength={40} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="flex items-center text-sm font-bold uppercase tracking-widest text-muted-foreground">
                      <Package className="mr-2 h-4 w-4" />
                      Artikujt (Stoku)
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 rounded-lg border-primary/20 bg-primary/5 text-primary">
                      <Plus className="mr-1 h-3 w-3" /> Shto Artikull
                    </Button>
                  </div>

                  {form.watch("items").map((_, index) => (
                    <div key={index} className="grid grid-cols-1 items-end gap-4 animate-in slide-in-from-left-2 duration-300 md:grid-cols-12">
                      <div className="md:col-span-6">
                        <FormField
                          control={form.control}
                          name={`items.${index}.item_name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">{t("item_name")}</FormLabel>
                              <FormControl>
                                <Input className="h-10 bg-background/50" maxLength={120} {...field} />
                              </FormControl>
                              <FormMessage />
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
                                <Input type="number" step="0.001" min="0.001" className="h-10 bg-background/50" {...field} />
                              </FormControl>
                              <FormMessage />
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
                                <Input className="h-10 bg-background/50" maxLength={20} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="pb-1 md:col-span-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-10 w-10 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button type="submit" className="h-12 w-full rounded-xl text-lg font-bold shadow-lg transition-all hover:shadow-primary/20 primary-gradient" disabled={isLoading || isExtracting}>
                  {isLoading ? <Spinner className="mr-2" /> : <><Save className="mr-2 h-5 w-5" /> {t("add_purchase")}</>}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="glass relative h-fit overflow-hidden border-2 border-dashed border-border shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <FileUp className="mr-2 h-5 w-5 text-indigo-500" />
              AI Analysis (PDF/Foto)
            </CardTitle>
            <CardDescription>Ngarkoni faturen per procesim automatik</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 p-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-500/10">
              {isExtracting ? <Spinner className="h-10 w-10 text-indigo-500" /> : <FileUp className="h-10 w-10 text-indigo-500" />}
            </div>

            <p className="max-w-[220px] text-center text-xs text-muted-foreground">
              {invoiceFile ? `Skedari: ${invoiceFile.name}` : "Klikoni per te zgjedhur nje imazh ose PDF deri ne 5MB."}
            </p>

            {extractError && (
              <div className="w-full rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>{extractError}</p>
                </div>
              </div>
            )}

            <label
              className={cn(
                "flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border transition-colors",
                isExtracting ? "cursor-not-allowed bg-accent/50 opacity-50" : "border-border hover:bg-accent"
              )}
            >
              <span className="text-sm font-semibold">{isExtracting ? "Duke procesuar..." : t("ai_extract")}</span>
              <input type="file" className="hidden" accept="image/*,application/pdf" disabled={isExtracting} onChange={onFileChange} />
            </label>

            {isExtracting && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[1px]" />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
