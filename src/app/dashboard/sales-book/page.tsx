"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "@/components/language-provider"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { FileText, Calendar, ChevronRight, Printer, Receipt, Filter, Trash2, Edit3, Plus, ShieldCheck, UserCheck } from "lucide-react"
import { EmptyState } from "@/components/EmptyState"
import { Spinner } from "@/components/spinner"
import { toast } from "sonner"
import { StockService } from "@/lib/services/stock"
import { StaffService } from "@/lib/services/staff"
import { TwoFactorDialog } from "@/components/two-factor-dialog"

interface Sale {
  id: number
  invoice_num: string
  date: string
  total_amount: number
  vat_rate: number
  type: string
  user_id: string
  worker_id?: number
  worker_name?: string
  is_corrected?: boolean
  corrected_at?: string
  corrected_by?: string
}

interface SaleItem {
  id: number
  item_name: string
  quantity: number
  price: number
  unit: string
  barcode: string
}

interface GroupedByDate {
  [date: string]: Sale[]
}

interface GroupedSales {
  [month: string]: GroupedByDate
}

const getMonthName = (dateStr: string, language: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString(language === 'sq' ? 'sq-AL' : 'en-US', { month: 'long' })
}

const getFormattedDate = (dateStr: string, language: string) => {
  return new Date(dateStr).toLocaleDateString(language === 'sq' ? 'sq-AL' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function SalesBookPage() {
  const { t, language } = useTranslation() as any
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null)
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<SaleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isItemsLoading, setIsItemsLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Correction State
  const [isCorrecting, setIsCorrecting] = useState(false)
  const [correctionItems, setCorrectionItems] = useState<SaleItem[]>([])
  const [correctionVatRate, setCorrectionVatRate] = useState(18)
  const [isSavingCorrection, setIsSavingCorrection] = useState(false)
  
  // 2FA Dialog State
  const [twoFactorAction, setTwoFactorAction] = useState<"delete_invoice" | "delete_item" | null>(null)
  const [itemIndexToDelete, setItemIndexToDelete] = useState<number | null>(null)

  // Filters
  const currentYear = new Date().getFullYear().toString()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const supabase = createClient()

  const years = useMemo(() => {
    const startYear = 2023
    const endYear = new Date().getFullYear() + 1
    const y = []
    for (let i = endYear; i >= startYear; i--) {
      y.push(i.toString())
    }
    return y
  }, [])

  const fetchSales = useCallback(async () => {
    setIsLoading(true)
    try {
      const businessId = await StaffService.getEffectiveBusinessId(supabase)
      if (!businessId) return

      let query = supabase
        .from('sales')
        .select('*')
        .eq('user_id', businessId)
        .order('date', { ascending: false })

      // Apply Year Filter
      if (selectedYear && !startDate && !endDate) {
        query = query
          .gte('date', `${selectedYear}-01-01`)
          .lte('date', `${selectedYear}-12-31T23:59:59`)
      }

      // Apply Date Range
      if (startDate) {
        query = query.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', `${endDate}T23:59:59`)
      }

      const { data, error } = await query

      if (error) throw error
      setSales(data || [])
    } catch (err) {
      console.error("Error fetching sales:", err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, selectedYear, startDate, endDate])

  const fetchProfile = useCallback(async () => {
    const businessId = await StaffService.getEffectiveBusinessId(supabase)
    if (businessId) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', businessId)
        .single()
      setProfile(data)
    }
  }, [supabase])

  useEffect(() => {
    fetchSales()
    fetchProfile()
  }, [fetchSales, fetchProfile])

  const fetchInvoiceItems = async (saleId: number) => {
    setIsItemsLoading(true)
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId)

      if (error) throw error
      setSelectedInvoiceItems(data || [])
    } catch (err) {
      console.error("Error fetching items:", err)
    } finally {
      setIsItemsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedInvoice) {
      fetchInvoiceItems(selectedInvoice.id)
    } else {
      setSelectedInvoiceItems([])
    }
  }, [selectedInvoice])

  // Open Correction Modal
  const handleOpenCorrection = () => {
    if (!selectedInvoice) return
    setCorrectionItems(JSON.parse(JSON.stringify(selectedInvoiceItems)))
    setCorrectionVatRate(selectedInvoice.vat_rate || 18)
    setIsCorrecting(true)
  }

  // Calculate Correction Totals
  const correctionSubtotal = correctionItems.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.price || 0)), 0)
  const correctionVatAmount = correctionSubtotal * (correctionVatRate / 100)
  const correctionTotal = correctionSubtotal + correctionVatAmount

  // Save Invoice Correction
  const handleSaveCorrection = async () => {
    if (!selectedInvoice) return
    if (correctionItems.length === 0) {
      toast.error(t("val_at_least_one"))
      return
    }

    setIsSavingCorrection(true)
    try {
      const businessId = await StaffService.getEffectiveBusinessId(supabase)
      if (!businessId) throw new Error("Session expired")

      // If type is "Mall", synchronize inventory differences
      if (selectedInvoice.type === "Mall") {
        // 1. Revert original items back to stock
        for (const orig of selectedInvoiceItems) {
          await StockService.updateStock(orig.item_name, orig.quantity, orig.unit, businessId)
        }
        // 2. Deduct new corrected items from stock
        for (const curr of correctionItems) {
          await StockService.updateStock(curr.item_name, -curr.quantity, curr.unit, businessId)
        }
      }

      // Update Sales record
      const { error: updateSaleError } = await supabase
        .from('sales')
        .update({
          total_amount: parseFloat(correctionTotal.toFixed(2)),
          vat_rate: correctionVatRate,
          is_corrected: true,
          corrected_at: new Date().toISOString(),
        })
        .eq('id', selectedInvoice.id)

      if (updateSaleError) throw updateSaleError

      // Replace items in sale_items
      await supabase.from('sale_items').delete().eq('sale_id', selectedInvoice.id)

      const newItemsToInsert = correctionItems.map(item => ({
        sale_id: selectedInvoice.id,
        item_name: item.item_name,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit || "copë",
        barcode: item.barcode || null,
        user_id: businessId,
      }))

      const { error: insertItemsError } = await supabase.from('sale_items').insert(newItemsToInsert)
      if (insertItemsError) throw insertItemsError

      toast.success(t("invoice_corrected_success"))
      setIsCorrecting(false)
      setSelectedInvoice(null)
      fetchSales()
    } catch (err: any) {
      console.error("Error correcting invoice:", err)
      toast.error(err.message || "Gabim gjatë korrigjimit të faturës.")
    } finally {
      setIsSavingCorrection(false)
    }
  }

  const handleDeleteInvoiceConfirmed = async () => {
    if (!selectedInvoice) return
    setIsDeleting(true)
    try {
      const businessId = await StaffService.getEffectiveBusinessId(supabase)
      if (!businessId) throw new Error("Session expired")

      if (selectedInvoice.type === "Mall") {
        let itemsToRevert = selectedInvoiceItems
        if (itemsToRevert.length === 0) {
          const { data } = await supabase.from('sale_items').select('*').eq('sale_id', selectedInvoice.id)
          itemsToRevert = data || []
        }

        for (const item of itemsToRevert) {
          await StockService.updateStock(item.item_name, item.quantity, item.unit, businessId)
        }
      }

      const { error: deleteError } = await supabase
        .from('sales')
        .delete()
        .eq('id', selectedInvoice.id)

      if (deleteError) throw deleteError

      toast.success(t("invoice_deleted_success"))
      setSelectedInvoice(null)
      fetchSales()
    } catch (err: any) {
      console.error("Error deleting invoice:", err)
      toast.error(err.message || "Ndodhi një gabim gjatë fshirjes")
    } finally {
      setIsDeleting(false)
    }
  }

  const groupedSales = useMemo(() => {
    return sales.reduce((acc: GroupedSales, sale) => {
      const month = getMonthName(sale.date, language)
      const date = getFormattedDate(sale.date, language)
      
      if (!acc[month]) acc[month] = {}
      if (!acc[month][date]) acc[month][date] = []
      
      acc[month][date].push(sale)
      return acc
    }, {})
  }, [sales, language])

  const grandTotal = useMemo(() => {
    return sales.reduce((sum, s) => sum + Number(s.total_amount), 0)
  }, [sales])

  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  // Calculate Subtotal and VAT for selected invoice
  let subtotal = selectedInvoiceItems.reduce((acc, item) => acc + (item.quantity * item.price), 0)
  let vatAmount = subtotal * ((selectedInvoice?.vat_rate || 0) / 100)

  if (selectedInvoiceItems.length === 0 && selectedInvoice) {
    const rate = selectedInvoice.vat_rate || 0
    subtotal = selectedInvoice.total_amount / (1 + (rate / 100))
    vatAmount = selectedInvoice.total_amount - subtotal
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col space-y-2">
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{t("sales_book")}</h2>
          <p className="text-muted-foreground text-sm uppercase tracking-wider font-bold opacity-70">
            {t("sales_book")} - {t("year")} {selectedYear}
          </p>
        </div>
        
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-primary tracking-widest">{t("total")}</div>
            <div className="text-2xl font-black text-foreground">{grandTotal.toFixed(2)} €</div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="print:hidden glass border-border shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold flex items-center">
            <Filter className="w-5 h-5 mr-2 text-primary" />
            {t("period_filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{t("year")}</label>
              <Select value={selectedYear} onValueChange={(val: string | null) => { if (val) setSelectedYear(val) }}>
                <SelectTrigger className="h-11 w-32 bg-background/50 border-border rounded-xl font-bold">
                  <SelectValue placeholder={t("year")} />
                </SelectTrigger>
                <SelectContent className="glass">
                  {years.map(y => (
                    <SelectItem key={y} value={y} className="font-bold">{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-11 w-px bg-border hidden md:block self-end mb-1" />

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{t("from_date")}</label>
              <Input 
                type="date" 
                className="h-11 w-44 bg-background/50 border-border rounded-xl" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{t("to_date")}</label>
              <Input 
                type="date" 
                className="h-11 w-44 bg-background/50 border-border rounded-xl" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              className="h-11 rounded-xl border-border hover:bg-primary/5 px-6"
              onClick={() => { setStartDate(""); setEndDate(""); setSelectedYear(currentYear); }}
            >
              {t("reset")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="print:hidden glass border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center font-black">
            <FileText className="w-5 h-5 mr-2 text-primary" />
            {t("sales_book").toUpperCase()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full space-y-4">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Spinner />
              </div>
            ) : Object.keys(groupedSales).length > 0 ? (
              Object.keys(groupedSales).map((month) => {
                const monthTotal = Object.values(groupedSales[month]).flat().reduce((sum, s) => sum + Number(s.total_amount), 0)
                
                return (
                  <AccordionItem key={month} className="glass-card !border-border rounded-xl px-4 overflow-hidden mb-2">
                    <AccordionTrigger 
                      onClick={() => setExpandedMonth(expandedMonth === month ? null : month)}
                      className="hover:no-underline w-full py-4"
                    >
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center">
                           <Calendar className="w-5 h-5 mr-3 text-primary" />
                           <span className="text-lg font-black capitalize tracking-tight">{month}</span>
                        </div>
                        <div className="text-xl font-black text-primary">
                          {monthTotal.toFixed(2)}€
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    {expandedMonth === month && (
                      <AccordionContent className="pb-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-3 pl-4 border-l-2 border-primary/20 ml-2">
                          {Object.keys(groupedSales[month]).map((date) => {
                            const dateTotal = groupedSales[month][date].reduce((sum, s) => sum + Number(s.total_amount), 0)
                            
                            return (
                              <div key={date} className="rounded-xl border border-border/50 bg-background/30 overflow-hidden">
                                <button 
                                  onClick={() => setExpandedDate(expandedDate === date ? null : date)}
                                  className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors"
                                >
                                  <div className="flex items-center font-bold text-foreground/80">
                                    <div className="w-2 h-2 rounded-full bg-primary mr-3" />
                                    {date}
                                  </div>
                                  <div className="font-bold text-sm">
                                    {groupedSales[month][date].length} {t("sales")} &middot; <span className="text-primary">{dateTotal.toFixed(2)}€</span>
                                  </div>
                                </button>
                                
                                {expandedDate === date && (
                                  <div className="p-4 bg-muted/20 border-t border-border/50 animate-in fade-in duration-200">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="hover:bg-transparent border-border/50">
                                          <TableHead className="w-[80px] text-[10px] uppercase font-bold tracking-widest">{t("serial_number")}</TableHead>
                                          <TableHead className="text-[10px] uppercase font-bold tracking-widest">{t("invoice_number")}</TableHead>
                                          <TableHead className="text-[10px] uppercase font-bold tracking-widest">{t("sold_by")}</TableHead>
                                          <TableHead className="text-[10px] uppercase font-bold tracking-widest">{t("type")}</TableHead>
                                          <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest">{t("total_amount")}</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {groupedSales[month][date].map((sale: Sale, idx: number) => (
                                          <TableRow 
                                            key={sale.id} 
                                            className="cursor-pointer hover:bg-primary/10 border-border/50 active:scale-[0.99] transition-all"
                                            onClick={() => setSelectedInvoice(sale)}
                                          >
                                            <TableCell className="font-medium text-xs">#{idx + 1}</TableCell>
                                            <TableCell className="font-bold text-primary flex items-center space-x-2">
                                              <span>{sale.invoice_num}</span>
                                              {sale.is_corrected && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 font-bold uppercase">
                                                  {t("corrected_badge")}
                                                </span>
                                              )}
                                              <ChevronRight className="w-3 h-3 opacity-50" />
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                              {sale.worker_name ? (
                                                <span className="flex items-center">
                                                  <UserCheck className="w-3 h-3 mr-1 text-primary" />
                                                  {sale.worker_name}
                                                </span>
                                              ) : (
                                                "Admin"
                                              )}
                                            </TableCell>
                                            <TableCell className="text-xs">{sale.type}</TableCell>
                                            <TableCell className="text-right font-black text-foreground">{sale.total_amount}€</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </AccordionContent>
                    )}
                  </AccordionItem>
                )
              })
            ) : (
              <EmptyState 
                title={t("no_sales_found")} 
                description={`${t("no_sales_found")} ${t("year")} ${selectedYear}.`}
                icon={Receipt}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice && !isCorrecting} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="glass border-border max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-2xl font-black flex items-center">
                 <Receipt className="w-6 h-6 mr-2 text-primary" />
                 {t("details")} #{selectedInvoice?.invoice_num}
              </DialogTitle>
              {selectedInvoice?.is_corrected && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 font-bold uppercase">
                  {t("corrected_badge")}
                </span>
              )}
            </div>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-8 p-4">
               {/* Professional Invoice Layout (Visible on Print) */}
               <div className="bg-white text-black p-[20mm] font-sans text-sm print:h-auto">
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
                      <p className="font-bold text-lg">{t("invoice_number")}: {selectedInvoice.invoice_num}</p>
                      <p className="text-muted-foreground mt-1">{t("date")}: {new Date(selectedInvoice.date).toLocaleDateString()}</p>
                      <p className="text-muted-foreground">{t("type")}: {selectedInvoice.type}</p>
                      {selectedInvoice.worker_name && (
                        <p className="text-xs font-bold text-primary mt-1">{t("sold_by")}: {selectedInvoice.worker_name}</p>
                      )}
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
                        {isItemsLoading ? (
                          <tr><td colSpan={5} className="py-8 text-center"><Spinner /></td></tr>
                        ) : selectedInvoiceItems.length > 0 ? (
                          selectedInvoiceItems.map((item, i) => (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="py-2 px-1 font-mono text-xs">{item.barcode || "—"}</td>
                              <td className="py-2 px-1 font-bold">{item.item_name}</td>
                              <td className="py-2 px-1 text-right">{item.quantity} {item.unit}</td>
                              <td className="py-2 px-1 text-right">{Number(item.price).toFixed(2)} €</td>
                              <td className="py-2 px-1 text-right font-bold">{(Number(item.quantity) * Number(item.price)).toFixed(2)} €</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={5} className="py-8 text-center italic text-muted-foreground text-xs opacity-50">{t("old_record_note")}</td></tr>
                        )}
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
                        <span>{t("vat_amount")} ({selectedInvoice.vat_rate}%):</span>
                        <span className="font-medium">{vatAmount.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-2xl font-black pt-2 border-t-2 border-black text-primary">
                        <span>{t("grand_total")}:</span>
                        <span>{selectedInvoice.total_amount} €</span>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="flex flex-wrap justify-end gap-3 pt-8 print:hidden">
                  <Button 
                    variant="outline" 
                    className="h-12 px-5 font-bold rounded-xl border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10 flex items-center" 
                    onClick={handleOpenCorrection}
                  >
                     <Edit3 className="w-4 h-4 mr-2" /> {t("correct_invoice")}
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="h-12 px-5 font-bold rounded-xl flex items-center" 
                    onClick={() => {
                      setTwoFactorAction("delete_invoice")
                    }}
                    disabled={isDeleting}
                  >
                     <Trash2 className="w-4 h-4 mr-2" /> {isDeleting ? t("processing") : t("delete")}
                  </Button>
                  <Button variant="outline" className="h-12 border-border" onClick={() => window.print()}>
                     <Printer className="w-4 h-4 mr-2" /> {t("reprint")}
                  </Button>
                  <Button className="h-12 primary-gradient px-6 font-bold rounded-xl" onClick={() => setSelectedInvoice(null)}>
                     {t("close")}
                  </Button>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Correction Dialog */}
      <Dialog open={isCorrecting} onOpenChange={setIsCorrecting}>
        <DialogContent className="glass border-border max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center">
              <Edit3 className="w-6 h-6 mr-2 text-yellow-500" />
              {t("correct_invoice")} #{selectedInvoice?.invoice_num}
            </DialogTitle>
            <CardDescription>
              Modifikoni artikujt, sasitë ose çmimet. Diferencat e inventarit do të rillogariten automatikisht.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("details")}</h4>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl border-primary/20 text-primary font-bold"
                onClick={() => setCorrectionItems([...correctionItems, { id: Date.now(), item_name: "", quantity: 1, price: 0, unit: "copë", barcode: "" }])}
              >
                <Plus className="w-4 h-4 mr-1.5" /> {t("add_item")}
              </Button>
            </div>

            <div className="space-y-3">
              {correctionItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-2xl bg-accent/20 border border-border/50 items-center">
                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">{t("item_name")}</label>
                    <Input
                      value={item.item_name}
                      onChange={(e) => {
                        const newItems = [...correctionItems]
                        newItems[idx].item_name = e.target.value
                        setCorrectionItems(newItems)
                      }}
                      placeholder={t("item_name")}
                      className="h-10 bg-background/50 text-sm font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">{t("quantity")}</label>
                    <Input
                      type="number"
                      step="0.001"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...correctionItems]
                        newItems[idx].quantity = parseFloat(e.target.value) || 0
                        setCorrectionItems(newItems)
                      }}
                      className="h-10 bg-background/50 text-sm font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">{t("unit")}</label>
                    <Input
                      value={item.unit}
                      onChange={(e) => {
                        const newItems = [...correctionItems]
                        newItems[idx].unit = e.target.value
                        setCorrectionItems(newItems)
                      }}
                      className="h-10 bg-background/50 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">{t("price")} (€)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => {
                        const newItems = [...correctionItems]
                        newItems[idx].price = parseFloat(e.target.value) || 0
                        setCorrectionItems(newItems)
                      }}
                      className="h-10 bg-background/50 text-sm font-bold text-primary"
                    />
                  </div>
                  <div className="sm:col-span-1 flex items-end justify-center pt-4 sm:pt-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                      onClick={() => {
                        setItemIndexToDelete(idx)
                        setTwoFactorAction("delete_item")
                      }}
                      disabled={correctionItems.length <= 1}
                      title="Fshij me 2FA"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("subtotal")}:</span>
                  <span className="font-bold">{correctionSubtotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("vat_amount")} ({correctionVatRate}%):</span>
                  <span className="font-bold">{correctionVatAmount.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-lg font-black text-primary border-t border-primary/20 pt-2">
                  <span>{t("grand_total")}:</span>
                  <span>{correctionTotal.toFixed(2)} €</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCorrecting(false)}
              className="rounded-xl border-border"
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={isSavingCorrection}
              onClick={handleSaveCorrection}
              className="primary-gradient font-bold rounded-xl px-8"
            >
              {isSavingCorrection ? <Spinner className="mr-2" /> : "Ruaj Korrigjimet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TwoFactorDialog for Deleting Item or Deleting Invoice */}
      <TwoFactorDialog
        open={twoFactorAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTwoFactorAction(null)
            setItemIndexToDelete(null)
          }
        }}
        title={t("manager_pin_required")}
        description={twoFactorAction === "delete_invoice" ? "Shënoni PIN-in e menaxherit për të autorizuar fshirjen e të gjithë faturës." : t("enter_manager_pin")}
        onSuccess={() => {
          if (twoFactorAction === "delete_invoice") {
            handleDeleteInvoiceConfirmed()
          } else if (twoFactorAction === "delete_item" && itemIndexToDelete !== null) {
            const updated = [...correctionItems]
            updated.splice(itemIndexToDelete, 1)
            setCorrectionItems(updated)
            setItemIndexToDelete(null)
          }
          setTwoFactorAction(null)
        }}
      />
    </div>
  )
}
