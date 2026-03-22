"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/components/language-provider"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileText, Calendar, ChevronRight, Printer, Search } from "lucide-react"

export default function SalesBookPage() {
  const { t } = useTranslation()
  const [sales, setSales] = useState<any[]>([])
  const [groupedSales, setGroupedSales] = useState<any>({})
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchSales()
  }, [])

  async function fetchSales() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false })

    if (data) {
      setSales(data)
      const grouped = data.reduce((acc: any, sale: any) => {
        const date = new Date(sale.date).toLocaleDateString()
        if (!acc[date]) acc[date] = []
        acc[date].push(sale)
        return acc
      }, {})
      setGroupedSales(grouped)
    }
  }

  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{t("sales_book")}</h2>
        <p className="text-muted-foreground">{t("grouped_by_date")} sipas kërkesave ligjore</p>
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
            {Object.keys(groupedSales).map((date) => (
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
                       <span className="text-sm text-muted-foreground">{groupedSales[date].length} Fatura</span>
                       <span className="text-lg font-extrabold">
                          {groupedSales[date].reduce((sum: number, s: any) => sum + Number(s.total_amount), 0).toFixed(2)}€
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
                          <TableHead>{t("type")}</TableHead>
                          <TableHead className="text-right">{t("total_amount")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedSales[date].map((sale: any, idx: number) => (
                          <TableRow 
                            key={sale.id} 
                            className="cursor-pointer hover:bg-primary/5 border-border active:scale-[0.99] transition-all"
                            onClick={() => setSelectedInvoice(sale)}
                          >
                            <TableCell className="font-medium">#{idx + 1}</TableCell>
                            <TableCell className="font-bold text-primary flex items-center">
                               {sale.invoice_num}
                               <ChevronRight className="w-3 h-3 ml-1 opacity-50" />
                            </TableCell>
                            <TableCell>{sale.type}</TableCell>
                            <TableCell className="text-right font-bold">{sale.total_amount}€</TableCell>
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

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="glass border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center">
               <Receipt className="w-6 h-6 mr-2 text-primary" />
               Detajet e Faturës
            </DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-8 p-4">
               <div className="grid grid-cols-2 gap-8 border-b border-border pb-8">
                  <div className="space-y-1">
                     <p className="text-xs uppercase text-muted-foreground font-bold tracking-widest">{t("invoice_number")}</p>
                     <p className="text-xl font-black text-primary">{selectedInvoice.invoice_num}</p>
                  </div>
                  <div className="space-y-1 text-right">
                     <p className="text-xs uppercase text-muted-foreground font-bold tracking-widest">{t("date")}</p>
                     <p className="text-xl font-bold">{new Date(selectedInvoice.date).toLocaleDateString()}</p>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-8">
                   <div className="space-y-1">
                      <p className="text-xs uppercase text-muted-foreground font-bold tracking-widest">{t("type")}</p>
                      <p className="font-bold">{selectedInvoice.type}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-xs uppercase text-muted-foreground font-bold tracking-widest">{t("vat_rate")}</p>
                      <p className="font-bold">{selectedInvoice.vat_rate}%</p>
                   </div>
                   <div className="space-y-1 text-right">
                      <p className="text-xs uppercase text-muted-foreground font-bold tracking-widest">{t("total_amount")}</p>
                      <p className="text-2xl font-black text-primary">{selectedInvoice.total_amount}€</p>
                   </div>
               </div>

               <div className="flex justify-end space-x-4 pt-8">
                  <Button variant="outline" className="h-12 border-border" onClick={() => window.print()}>
                     <Printer className="w-5 h-5 mr-2" /> {t("reprint")}
                  </Button>
                  <Button className="h-12 primary-gradient px-8 font-bold rounded-xl" onClick={() => setSelectedInvoice(null)}>
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

function Receipt(props: any) {
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
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5V6.5" />
    </svg>
  )
}
