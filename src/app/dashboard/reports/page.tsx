"use client"

// Production build version 1.0.2
import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "@/components/language-provider"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, Users, Calendar, TrendingUp, DollarSign, Receipt, Medal } from "lucide-react"
import { Spinner } from "@/components/spinner"
import { EmptyState } from "@/components/EmptyState"
import { StaffService, Worker } from "@/lib/services/staff"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns"
import { sq } from "date-fns/locale"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts"

interface Sale {
  id: number
  date: string
  total_amount: number
  worker_id?: number
  worker_name?: string
  invoice_num: string
}

type DateRange = "today" | "yesterday" | "this_week" | "this_month" | "all_time"

export default function ReportsPage() {
  const { t, language } = useTranslation() as any
  const [sales, setSales] = useState<Sale[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filters
  const [dateRange, setDateRange] = useState<DateRange>("this_week")
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("all")

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const businessId = await StaffService.getEffectiveBusinessId(supabase)
      if (!businessId) return

      // Fetch Workers
      const workersData = await StaffService.getWorkers()
      setWorkers(workersData)

      // Fetch Sales
      const { data, error } = await supabase
        .from('sales')
        .select('id, date, total_amount, worker_id, worker_name, invoice_num')
        .eq('user_id', businessId)
        .order('date', { ascending: true })

      if (error) throw error
      setSales(data || [])
    } catch (err) {
      console.error("Error fetching reports data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter Sales based on Date Range and Worker
  const filteredSales = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return sales.filter((sale) => {
      // 1. Worker Filter
      if (selectedWorkerId !== "all" && sale.worker_id?.toString() !== selectedWorkerId) {
        return false
      }

      // 2. Date Filter
      const saleDate = new Date(sale.date)
      switch (dateRange) {
        case "today":
          return saleDate >= today
        case "yesterday": {
          const yesterday = subDays(today, 1)
          return saleDate >= yesterday && saleDate < today
        }
        case "this_week": {
          const start = startOfWeek(today, { weekStartsOn: 1 })
          const end = endOfWeek(today, { weekStartsOn: 1 })
          return isWithinInterval(saleDate, { start, end })
        }
        case "this_month": {
          const start = startOfMonth(today)
          const end = endOfMonth(today)
          return isWithinInterval(saleDate, { start, end })
        }
        case "all_time":
        default:
          return true
      }
    })
  }, [sales, dateRange, selectedWorkerId])

  // Calculate Stats
  const totalSalesAmount = filteredSales.reduce((acc, s) => acc + Number(s.total_amount), 0)
  const totalInvoices = filteredSales.length

  // Calculate Worker Performance
  const workerPerformance = useMemo(() => {
    const map = new Map<string, { name: string, total: number, count: number }>()
    
    filteredSales.forEach(sale => {
      const wId = sale.worker_id ? sale.worker_id.toString() : 'admin'
      const wName = sale.worker_name || 'Admin / Pronari'
      
      const current = map.get(wId) || { name: wName, total: 0, count: 0 }
      map.set(wId, {
        name: wName,
        total: current.total + Number(sale.total_amount),
        count: current.count + 1
      })
    })

    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [filteredSales])

  const bestSeller = workerPerformance.length > 0 ? workerPerformance[0] : null

  // Chart Data: Group by Date
  const chartData = useMemo(() => {
    const map = new Map<string, number>()
    
    filteredSales.forEach(sale => {
      // Format as "DD MMM"
      const dateStr = format(new Date(sale.date), "dd MMM", { locale: language === 'sq' ? sq : undefined })
      const current = map.get(dateStr) || 0
      map.set(dateStr, current + Number(sale.total_amount))
    })

    return Array.from(map.entries()).map(([date, total]) => ({ date, total }))
  }, [filteredSales, language])

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 print:pb-0 print:space-y-4">
      <div className="print:hidden flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{t("reports") || "Raportet"}</h2>
          <p className="text-muted-foreground">{t("reports_desc") || "Statistikat e shitjeve dhe performanca e punëtorëve"}</p>
        </div>
        
        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedWorkerId} onValueChange={(v) => setSelectedWorkerId(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[200px] h-11 glass border-border shadow-sm">
              <Users className="w-4 h-4 mr-2 text-primary" />
              <SelectValue placeholder={t("select_worker")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_workers")}</SelectItem>
              {workers.map(w => (
                <SelectItem key={w.id} value={w.id.toString()}>
                  {w.first_name} {w.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={dateRange} onValueChange={(v) => setDateRange((v ?? "this_week") as DateRange)}>
            <SelectTrigger className="w-full sm:w-[180px] h-11 glass border-border shadow-sm">
              <Calendar className="w-4 h-4 mr-2 text-primary" />
              <SelectValue placeholder="Periudha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Sot</SelectItem>
              <SelectItem value="yesterday">Dje</SelectItem>
              <SelectItem value="this_week">Këtë Javë</SelectItem>
              <SelectItem value="this_month">Këtë Muaj</SelectItem>
              <SelectItem value="all_time">Të Gjitha Kohërat</SelectItem>
            </SelectContent>
          </Select>

          <button 
            onClick={() => window.print()}
            className="h-11 px-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:bg-primary/90 transition flex items-center justify-center gap-2"
          >
            <Receipt className="w-4 h-4" />
            Printo / PDF
          </button>
        </div>
      </div>

      {/* Print Header (Only visible when printing) */}
      <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-black uppercase text-black">Raporti i Shitjeve</h1>
        <p className="text-sm font-bold text-gray-600 mt-1">
          Periudha: {dateRange === 'today' ? 'Sot' : dateRange === 'yesterday' ? 'Dje' : dateRange === 'this_week' ? 'Këtë Javë' : dateRange === 'this_month' ? 'Këtë Muaj' : 'Të gjitha kohërat'} 
          {selectedWorkerId !== 'all' ? ` | Punëtori: ${workers.find(w => w.id.toString() === selectedWorkerId)?.first_name || ''}` : ' | Të gjithë punëtorët'}
        </p>
        <p className="text-xs text-gray-500 mt-1">Gjeneruar më: {new Date().toLocaleString('sq-AL')}</p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="glass border-border shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center">
                  <DollarSign className="w-4 h-4 mr-2 text-emerald-500" />
                  {t("total_sales")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-foreground">
                  {totalSalesAmount.toFixed(2)} <span className="text-xl text-muted-foreground font-semibold">EUR</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-border shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center">
                  <Receipt className="w-4 h-4 mr-2 text-blue-500" />
                  {t("total_invoices")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-foreground">
                  {totalInvoices}
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-border shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-background to-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary uppercase tracking-wider flex items-center">
                  <Medal className="w-4 h-4 mr-2" />
                  {t("best_seller")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground truncate">
                  {bestSeller ? bestSeller.name : "—"}
                </div>
                {bestSeller && (
                  <p className="text-sm text-muted-foreground font-semibold mt-1">
                    {bestSeller.total.toFixed(2)} EUR ({bestSeller.count} fatura)
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
            {/* Chart */}
            <Card className="glass border-border shadow-xl lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                  Trendi i Shitjeve
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {chartData.length > 0 ? (
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 12 }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 12 }}
                          tickFormatter={(value) => `€${value}`}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          formatter={(value: any) => [`€${Number(value || 0).toFixed(2)}`, 'Shitjet']}
                          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: '4px' }}
                        />
                        <Bar 
                          dataKey="total" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]} 
                          maxBarSize={50}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={BarChart3}
                    title={t("no_sales_data") || "Nuk ka të dhëna"}
                    description="Zgjidhni një periudhë tjetër për të parë trendin."
                  />
                )}
              </CardContent>
            </Card>

            {/* Worker Performance Table */}
            <Card className="glass border-border shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Users className="w-5 h-5 mr-2 text-primary" />
                  {t("worker_performance")}
                </CardTitle>
                <CardDescription>Performanca sipas totalit të shitjeve</CardDescription>
              </CardHeader>
              <CardContent>
                {workerPerformance.length > 0 ? (
                  <div className="space-y-4">
                    {workerPerformance.map((worker, index) => (
                      <div key={worker.name} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50 hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            index === 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{worker.name}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{worker.count} fatura</div>
                          </div>
                        </div>
                        <div className="text-right font-bold text-foreground">
                          {worker.total.toFixed(2)} <span className="text-[10px] text-muted-foreground uppercase">EUR</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Asnjë e dhënë për këtë periudhë.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
