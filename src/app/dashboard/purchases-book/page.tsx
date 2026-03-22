"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/components/language-provider"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
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
import { FileText, Calendar, ChevronRight, Hash, Receipt, Package } from "lucide-react"

export default function PurchasesBookPage() {
  const { t } = useTranslation()
  const [purchases, setPurchases] = useState<any[]>([])
  const [groupedPurchases, setGroupedPurchases] = useState<any>({})
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchPurchases()
  }, [])

  async function fetchPurchases() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .order('date', { ascending: false })

    if (data) {
      setPurchases(data)
      const grouped = data.reduce((acc: any, purchase: any) => {
        const date = new Date(purchase.date).toLocaleDateString()
        if (!acc[date]) acc[date] = []
        acc[date].push(purchase)
        return acc
      }, {})
      setGroupedPurchases(grouped)
    }
  }

  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{t("purchases_book")}</h2>
        <p className="text-muted-foreground">{t("grouped_by_date")} për blerjet e materialit</p>
      </div>

      <Card className="glass border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary" />
            {t("summary")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full space-y-4">
            {Object.keys(groupedPurchases).map((date) => (
              <AccordionItem key={date} className="glass-card !border-border rounded-xl px-4 overflow-hidden">
                <AccordionTrigger 
                  onClick={() => setExpandedDate(expandedDate === date ? null : date)}
                  className="hover:no-underline w-full"
                >
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center">
                       <Calendar className="w-4 h-4 mr-2 text-primary" />
                       <span className="font-bold">{date}</span>
                    </div>
                    <div className="flex items-center space-x-6">
                       <span className="text-sm text-muted-foreground">{groupedPurchases[date].length} Blerje</span>
                       <span className="text-lg font-extrabold">
                          {groupedPurchases[date].reduce((sum: number, p: any) => sum + Number(p.total_cost), 0).toFixed(2)}€
                       </span>
                    </div>
                  </div>
                </AccordionTrigger>
                {expandedDate === date && (
                  <AccordionContent className="animate-in slide-in-from-top-2 duration-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border">
                          <TableHead className="w-[100px]">{t("serial_number")}</TableHead>
                          <TableHead>{t("invoice_number")}</TableHead>
                          <TableHead>{t("seller_fiscal")}</TableHead>
                          <TableHead className="text-right">{t("total_cost")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedPurchases[date].map((purchase: any, idx: number) => (
                          <TableRow 
                            key={purchase.id} 
                            className="cursor-pointer hover:bg-primary/5 border-border active:scale-[0.99] transition-all"
                            onClick={() => setSelectedPurchase(purchase)}
                          >
                            <TableCell className="font-medium">#{idx + 1}</TableCell>
                            <TableCell className="font-bold text-primary flex items-center">
                               {purchase.invoice_num}
                               <ChevronRight className="w-3 h-3 ml-1 opacity-50" />
                            </TableCell>
                            <TableCell>{purchase.seller_fiscal_num}</TableCell>
                            <TableCell className="text-right font-bold">{purchase.total_cost}€</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                )}
              </AccordionItem>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Purchase Detail Dialog */}
      <Dialog open={!!selectedPurchase} onOpenChange={() => setSelectedPurchase(null)}>
        <DialogContent className="glass border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center">
               <Receipt className="w-6 h-6 mr-2 text-primary" />
               Detajet e Blerjes
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

               {/* Items list if available */}
               <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center">
                     <Package className="w-4 h-4 mr-2" /> Artikujt e Blere
                  </h3>
                  <div className="bg-muted/30 rounded-xl p-4 border border-border">
                     <p className="text-sm text-muted-foreground italic">Artikujt rritin stokun automatikisht gjatë regjistrimit.</p>
                  </div>
               </div>

               <div className="flex justify-end space-x-4 pt-8">
                  {selectedPurchase.image_url && (
                    <Button variant="outline" className="h-12 border-border" onClick={() => window.open(selectedPurchase.image_url, '_blank')}>
                       <FileText className="w-5 h-5 mr-2" /> {t("view_invoice")}
                    </Button>
                  )}
                  <Button className="h-12 primary-gradient px-8 font-bold rounded-xl" onClick={() => setSelectedPurchase(null)}>
                     Mbyll
                  </Button>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
