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
} from "@/components/ui/dialog"
import { FileText, Calendar, ChevronRight, Printer, Receipt, Filter, Trash2 } from "lucide-react"
import { EmptyState } from "@/components/EmptyState"
import { Spinner } from "@/components/spinner"
import { toast } from "sonner"
import { StockService } from "@/lib/services/stock"

interface Sale {
  id: number
  invoice_num: string
  date: string
  total_amount: number
  vat_rate: number
  type: string
  user_id: string
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('sales')
        .select('*')
        .eq('user_id', user.id)
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
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
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

  const handleDeleteInvoice = async (sale: Sale) => {
    if (!confirm(t("confirm_delete_invoice"))) return
    
    setIsDeleting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Session expired")

      // 1. Fetch items of the invoice to revert stock (if it's a Mall type)
      if (sale.type === "Mall") {
        let itemsToRevert = selectedInvoiceItems
        if (itemsToRevert.length === 0) {
          const { data, error } = await supabase
            .from('sale_items')
            .select('*')
            .eq('sale_id', sale.id)
          if (error) throw error
          itemsToRevert = data || []
        }

        // Revert stock (add the quantities back)
        for (const item of itemsToRevert) {
          await StockService.updateStock(
            item.item_name,
            item.quantity, // Positive number to add it back to stock
            item.unit,
            user.id
          )
        }
      }

      // 2. Delete the invoice from database
      const { error: deleteError } = await supabase
        .from('sales')
        .delete()
        .eq('id', sale.id)

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

  // Calculate Subtotal and VAT for the selected invoice
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
                                          <TableHead className="w-[100px] text-[10px] uppercase font-bold tracking-widest">{t("serial_number")}</TableHead>
                                          <TableHead className="text-[10px] uppercase font-bold tracking-widest">{t("invoice_number")}</TableHead>
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
                                            <TableCell className="font-bold text-primary flex items-center">
                                               {sale.invoice_num}
                                               <ChevronRight className="w-3 h-3 ml-1 opacity-50" />
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
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="glass border-border max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
            <DialogTitle className="text-2xl font-black flex items-center">
               <Receipt className="w-6 h-6 mr-2 text-primary" />
               {t("details")}
            </DialogTitle>
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

               <div className="flex justify-end space-x-4 pt-8 print:hidden">
                  <Button 
                    variant="destructive" 
                    className="h-12 px-6 font-bold rounded-xl flex items-center" 
                    onClick={() => handleDeleteInvoice(selectedInvoice)}
                    disabled={isDeleting}
                  >
                     <Trash2 className="w-5 h-5 mr-2" /> {isDeleting ? t("processing") : t("delete")}
                  </Button>
                  <Button variant="outline" className="h-12 border-border" onClick={() => window.print()}>
                     <Printer className="w-5 h-5 mr-2" /> {t("reprint")}
                  </Button>
                  <Button className="h-12 primary-gradient px-8 font-bold rounded-xl" onClick={() => setSelectedInvoice(null)}>
                     {t("close")}
                  </Button>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
