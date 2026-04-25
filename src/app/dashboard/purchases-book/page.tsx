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
import { FileText, Calendar, ChevronRight, Receipt, Package, TrendingDown, Filter } from "lucide-react"
import { EmptyState } from "@/components/EmptyState"
import { Spinner } from "@/components/spinner"

interface Purchase {
  id: number
  invoice_num: string
  date: string
  total_cost: number
  seller_fiscal_num: string | null
  image_url: string | null
  user_id: string
}

interface PurchaseItem {
  id: number
  item_name: string
  quantity: number
  cost_price: number
  unit: string
}

interface GroupedByDate {
  [date: string]: Purchase[]
}

interface GroupedPurchases {
  [month: string]: GroupedByDate
}

const getMonthName = (dateStr: string, language: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString(language === 'sq' ? 'sq-AL' : 'en-US', { month: 'long' })
}

const getFormattedDate = (dateStr: string, language: string) => {
  return new Date(dateStr).toLocaleDateString(language === 'sq' ? 'sq-AL' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function PurchasesBookPage() {
  const { t, language } = useTranslation() as any
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [selectedPurchaseItems, setSelectedPurchaseItems] = useState<PurchaseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isItemsLoading, setIsItemsLoading] = useState(false)
  
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

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      // Apply Year Filter
      if (selectedYear && !startDate && !endDate) {
        query = query
          .gte('date', `${selectedYear}-01-01`)
          .lte('date', `${selectedYear}-12-31T23:59:59`)
      }

      if (startDate) {
        query = query.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', `${endDate}T23:59:59`)
      }

      const { data, error } = await query

      if (error) throw error
      setPurchases(data || [])
    } catch (err) {
      console.error("Error fetching purchases:", err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, selectedYear, startDate, endDate])

  useEffect(() => {
    fetchPurchases()
  }, [fetchPurchases])

  const fetchPurchaseItems = async (purchaseId: number) => {
    setIsItemsLoading(true)
    try {
      const { data, error } = await supabase
        .from('purchase_items')
        .select('*')
        .eq('purchase_id', purchaseId)

      if (error) throw error
      setSelectedPurchaseItems(data || [])
    } catch (err) {
      console.error("Error fetching items:", err)
    } finally {
      setIsItemsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedPurchase) {
      fetchPurchaseItems(selectedPurchase.id)
    } else {
      setSelectedPurchaseItems([])
    }
  }, [selectedPurchase])

  const groupedPurchases = useMemo(() => {
    return purchases.reduce((acc: GroupedPurchases, purchase) => {
      const month = getMonthName(purchase.date, language)
      const date = getFormattedDate(purchase.date, language)
      
      if (!acc[month]) acc[month] = {}
      if (!acc[month][date]) acc[month][date] = []
      
      acc[month][date].push(purchase)
      return acc
    }, {})
  }, [purchases, language])

  const grandTotal = useMemo(() => {
    return purchases.reduce((sum, p) => sum + Number(p.total_cost), 0)
  }, [purchases])

  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col space-y-2">
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{t("purchases_book")}</h2>
          <p className="text-muted-foreground text-sm uppercase tracking-wider font-bold opacity-70">
            {t("purchases_book")} - {t("year")} {selectedYear}
          </p>
        </div>
        
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30 text-orange-600">
             <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-orange-600 tracking-widest">{t("total")}</div>
            <div className="text-2xl font-black text-foreground">{grandTotal.toFixed(2)} €</div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="glass border-border shadow-xl">
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

      <Card className="glass border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center font-black">
            <FileText className="w-5 h-5 mr-2 text-primary" />
            {t("purchases_book").toUpperCase()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full space-y-4">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Spinner />
              </div>
            ) : Object.keys(groupedPurchases).length > 0 ? (
              Object.keys(groupedPurchases).map((month) => {
                const monthTotal = Object.values(groupedPurchases[month]).flat().reduce((sum, p) => sum + Number(p.total_cost), 0)
                
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
                        <div className="text-xl font-black text-orange-600">
                          {monthTotal.toFixed(2)}€
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    {expandedMonth === month && (
                      <AccordionContent className="pb-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-3 pl-4 border-l-2 border-orange-500/20 ml-2">
                          {Object.keys(groupedPurchases[month]).map((date) => {
                            const dateTotal = groupedPurchases[month][date].reduce((sum, p) => sum + Number(p.total_cost), 0)
                            
                            return (
                              <div key={date} className="rounded-xl border border-border/50 bg-background/30 overflow-hidden">
                                <button 
                                  onClick={() => setExpandedDate(expandedDate === date ? null : date)}
                                  className="w-full flex items-center justify-between p-4 hover:bg-orange-500/5 transition-colors"
                                >
                                  <div className="flex items-center font-bold text-foreground/80">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 mr-3" />
                                    {date}
                                  </div>
                                  <div className="font-bold text-sm">
                                    {groupedPurchases[month][date].length} {t("purchases")} &middot; <span className="text-orange-600">{dateTotal.toFixed(2)}€</span>
                                  </div>
                                </button>
                                
                                {expandedDate === date && (
                                  <div className="p-4 bg-muted/20 border-t border-border/50 animate-in fade-in duration-200">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="hover:bg-transparent border-border/50">
                                          <TableHead className="w-[100px] text-[10px] uppercase font-bold tracking-widest">{t("serial_number")}</TableHead>
                                          <TableHead className="text-[10px] uppercase font-bold tracking-widest">{t("invoice_number")}</TableHead>
                                          <TableHead className="text-[10px] uppercase font-bold tracking-widest">{t("seller_fiscal")}</TableHead>
                                          <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest">{t("total_cost")}</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {groupedPurchases[month][date].map((purchase: Purchase, idx: number) => (
                                          <TableRow 
                                            key={purchase.id} 
                                            className="cursor-pointer hover:bg-orange-500/10 border-border/50 active:scale-[0.99] transition-all"
                                            onClick={() => setSelectedPurchase(purchase)}
                                          >
                                            <TableCell className="font-medium text-xs">#{idx + 1}</TableCell>
                                            <TableCell className="font-bold text-primary flex items-center">
                                               {purchase.invoice_num}
                                               <ChevronRight className="w-3 h-3 ml-1 opacity-50" />
                                            </TableCell>
                                            <TableCell className="text-xs">{purchase.seller_fiscal_num}</TableCell>
                                            <TableCell className="text-right font-black text-foreground">{purchase.total_cost}€</TableCell>
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
                title={t("no_purchases_found")} 
                description={`${t("no_purchases_found")} ${t("year")} ${selectedYear}.`}
                icon={Package}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Purchase Detail Dialog */}
      <Dialog open={!!selectedPurchase} onOpenChange={() => setSelectedPurchase(null)}>
        <DialogContent className="glass border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center">
               <Receipt className="w-6 h-6 mr-2 text-primary" />
               {t("details")}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPurchase && (
            <div className="space-y-8 p-4">
               <div className="grid grid-cols-2 gap-8 border-b border-border pb-8">
                  <div className="space-y-1">
                     <p className="text-xs uppercase text-muted-foreground font-bold tracking-widest">{t("invoice_number")}</p>
                     <p className="text-xl font-black text-primary">{selectedPurchase.invoice_num}</p>
                  </div>
                  <div className="space-y-1 text-right">
                     <p className="text-xs uppercase text-muted-foreground font-bold tracking-widest">{t("date")}</p>
                     <p className="text-xl font-bold">{new Date(selectedPurchase.date).toLocaleDateString()}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-1">
                      <p className="text-xs uppercase text-muted-foreground font-bold tracking-widest">{t("seller_fiscal")}</p>
                      <p className="font-bold">{selectedPurchase.seller_fiscal_num}</p>
                   </div>
                   <div className="space-y-1 text-right">
                      <p className="text-xs uppercase text-muted-foreground font-bold tracking-widest">{t("total_cost")}</p>
                      <p className="text-2xl font-black text-primary">{selectedPurchase.total_cost}€</p>
                   </div>
               </div>

               {/* Items list */}
               <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center">
                     <Package className="w-4 h-4 mr-2" /> {t("details")}
                  </h3>
                  <div className="space-y-2">
                    {isItemsLoading ? (
                      <div className="flex justify-center p-4"><Spinner /></div>
                    ) : selectedPurchaseItems.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>{t("item_name")}</TableHead>
                            <TableHead className="text-right">{t("quantity")}</TableHead>
                            <TableHead className="text-right">{t("price")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPurchaseItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.item_name}</TableCell>
                              <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                              <TableCell className="text-right">{item.cost_price} €</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="bg-muted/30 rounded-xl p-4 border border-border text-center text-xs text-muted-foreground italic">
                        {t("old_record_note")}
                      </div>
                    )}
                  </div>
               </div>

               <div className="flex justify-end space-x-4 pt-8">
                  {selectedPurchase.image_url && (
                    <Button variant="outline" className="h-12 border-border" onClick={() => window.open(selectedPurchase.image_url as string, '_blank')}>
                       <FileText className="w-5 h-5 mr-2" /> {t("view_invoice")}
                    </Button>
                  )}
                  <Button className="h-12 primary-gradient px-8 font-bold rounded-xl" onClick={() => setSelectedPurchase(null)}>
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
