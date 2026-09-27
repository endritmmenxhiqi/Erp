"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/spinner"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { Users, DollarSign, TrendingUp, FileText, Plus, Printer, CheckCircle2, Wallet, Calculator, User, AlertCircle } from "lucide-react"

const PENSION_RATE = 0.05
const MONTHS = ["Janar","Shkurt","Mars","Prill","Maj","Qershor","Korrik","Gusht","Shtator","Tetor","Nentor","Dhjetor"]

function calcTax(grossMonthly: number): number {
  const annual = grossMonthly * 12
  let tax = 0, prev = 0
  const brackets = [960, 3000, 5400]
  const rates = [0, 0.04, 0.08, 0.10]
  for (let i = 0; i < brackets.length; i++) {
    if (annual <= prev) break
    tax += (Math.min(annual, brackets[i]) - prev) * rates[i]
    prev = brackets[i]
  }
  if (annual > 5400) tax += (annual - 5400) * 0.10
  return Math.round((tax / 12) * 100) / 100
}

function calcPayroll(gross: number, advances = 0, bonuses = 0) {
  const pension_employee = Math.round(gross * PENSION_RATE * 100) / 100
  const pension_employer = Math.round(gross * PENSION_RATE * 100) / 100
  const taxable_salary = gross - pension_employee
  const tax_amount = calcTax(taxable_salary)
  const net_salary = Math.round((taxable_salary - tax_amount - advances + bonuses) * 100) / 100
  return { pension_employee, pension_employer, taxable_salary, tax_amount, net_salary }
}

interface Worker {
  id: number; first_name: string; last_name: string; position?: string; role: string
  gross_salary?: number; bank_account?: string; bank_name?: string; personal_number?: string
  contract_start_date?: string; is_active: boolean
}
interface Advance {
  id: number; worker_id: number; amount: number; advance_date: string; reason: string
  is_deducted: boolean; worker?: { first_name: string; last_name: string }
}
interface PayrollRecord {
  id: number; worker_id: number; worker_name: string; position?: string; month: number; year: number
  gross_salary: number; pension_employee: number; pension_employer: number; taxable_salary: number
  tax_amount: number; advances_deducted: number; bonuses: number; net_salary: number
  bank_account?: string; status: "Draft" | "Aprovuar" | "Paguar"; paid_at?: string
}

export default function HRPayrollPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<"workers"|"advances"|"payroll">("workers")
  const [workers, setWorkers] = useState<Worker[]>([])
  const [advances, setAdvances] = useState<Advance[]>([])
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string|null>(null)
  const [workerModal, setWorkerModal] = useState(false)
  const [editWorker, setEditWorker] = useState<Worker|null>(null)
  const [workerForm, setWorkerForm] = useState({ gross_salary:"", bank_account:"", bank_name:"TEB", personal_number:"", position:"", contract_start_date:"" })
  const [advanceModal, setAdvanceModal] = useState(false)
  const [advForm, setAdvForm] = useState({ worker_id:"", amount:"", reason:"Paradhenie e pages", advance_date:new Date().toISOString().slice(0,10) })
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth()+1)
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear())
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewPayroll, setPreviewPayroll] = useState<(PayrollRecord & {pendingAdvances:number})[]>([])
  const [payrollPreviewModal, setPayrollPreviewModal] = useState(false)
  const [printRecord, setPrintRecord] = useState<PayrollRecord|null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      let bId = user.id
      try {
        const imp = sessionStorage.getItem("impersonated_business_id") || localStorage.getItem("impersonated_business_id")
        if (imp) bId = imp
      } catch {}
      setBusinessId(bId)
      const [wRes, aRes, pRes] = await Promise.all([
        supabase.from("workers").select("*").eq("business_id", bId).eq("is_active", true).order("first_name"),
        supabase.from("salary_advances").select("*, worker:workers(first_name,last_name)").eq("business_id", bId).order("advance_date", { ascending: false }),
        supabase.from("payroll_records").select("*").eq("business_id", bId).order("year", { ascending: false }).order("month", { ascending: false }),
      ])
      setWorkers(wRes.data || [])
      setAdvances(aRes.data || [])
      setPayrolls(pRes.data || [])
    } catch(e) { console.error(e); toast.error("Gabim gjate ngarkimit") }
    finally { setIsLoading(false) }
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  async function saveWorkerHR() {
    if (!editWorker || !businessId) return
    const { error } = await supabase.from("workers").update({
      gross_salary: parseFloat(workerForm.gross_salary) || 0,
      bank_account: workerForm.bank_account,
      bank_name: workerForm.bank_name,
      personal_number: workerForm.personal_number,
      position: workerForm.position,
      contract_start_date: workerForm.contract_start_date || null,
    }).eq("id", editWorker.id)
    if (error) { toast.error("Gabim gjate ruajtjes"); return }
    toast.success("Te dhenat HR u ruajten"); setWorkerModal(false); loadData()
  }

  async function saveAdvance() {
    if (!businessId || !advForm.worker_id || !advForm.amount) { toast.error("Ploteso te gjitha fushat"); return }
    const { error } = await supabase.from("salary_advances").insert({
      worker_id: parseInt(advForm.worker_id), amount: parseFloat(advForm.amount),
      reason: advForm.reason, advance_date: advForm.advance_date, business_id: businessId,
    })
    if (error) { toast.error("Gabim gjate regjistrimit"); return }
    toast.success("Avanca u regjistrua"); setAdvanceModal(false)
    setAdvForm({ worker_id:"", amount:"", reason:"Paradhenie e pages", advance_date:new Date().toISOString().slice(0,10) }); loadData()
  }

  async function generatePayroll() {
    setIsGenerating(true)
    try {
      const preview: (PayrollRecord & {pendingAdvances:number})[] = []
      for (const w of workers) {
        const gross = w.gross_salary || 400
        const pendingAdvances = advances.filter(a => a.worker_id===w.id && !a.is_deducted).reduce((s,a) => s+a.amount, 0)
        const calc = calcPayroll(gross, pendingAdvances)
        preview.push({ id:0, worker_id:w.id, worker_name:`${w.first_name} ${w.last_name}`, position:w.position||w.role,
          month:payrollMonth, year:payrollYear, gross_salary:gross, ...calc,
          advances_deducted:pendingAdvances, bonuses:0, bank_account:w.bank_account, status:"Draft", pendingAdvances })
      }
      setPreviewPayroll(preview); setPayrollPreviewModal(true)
    } finally { setIsGenerating(false) }
  }

  async function confirmPayroll() {
    if (!businessId) return
    setIsGenerating(true)
    try {
      for (const rec of previewPayroll) {
        const { error } = await supabase.from("payroll_records").upsert({
          worker_id:rec.worker_id, worker_name:rec.worker_name, position:rec.position,
          month:rec.month, year:rec.year, gross_salary:rec.gross_salary,
          pension_employee:rec.pension_employee, pension_employer:rec.pension_employer,
          taxable_salary:rec.taxable_salary, tax_amount:rec.tax_amount,
          advances_deducted:rec.advances_deducted, bonuses:rec.bonuses, net_salary:rec.net_salary,
          bank_account:rec.bank_account, status:"Draft", business_id:businessId,
        }, { onConflict:"worker_id,month,year" })
        if (error) { toast.error(`Gabim: ${error.message}`); continue }
        if (rec.advances_deducted > 0) {
          const ids = advances.filter(a => a.worker_id===rec.worker_id && !a.is_deducted).map(a => a.id)
          if (ids.length > 0) await supabase.from("salary_advances").update({ is_deducted:true }).in("id", ids)
        }
      }
      toast.success(`Listepagesa ${MONTHS[payrollMonth-1]} ${payrollYear} u gjenerua!`)
      setPayrollPreviewModal(false); loadData(); setTab("payroll")
    } finally { setIsGenerating(false) }
  }

  async function updatePayrollStatus(id: number, status: "Aprovuar"|"Paguar") {
    const update: Record<string,unknown> = { status }
    if (status === "Paguar") update.paid_at = new Date().toISOString()
    const { error } = await supabase.from("payroll_records").update(update).eq("id", id)
    if (error) { toast.error("Gabim"); return }
    toast.success(`Statusi: ${status}`); loadData()
  }

  const pendingAdvancesTotal = advances.filter(a => !a.is_deducted).reduce((s,a) => s+a.amount, 0)
  const totalPaid = payrolls.filter(p => p.status==="Paguar").reduce((s,p) => s+p.net_salary, 0)
  const netFund = workers.reduce((s,w) => { const c=calcPayroll(w.gross_salary||400); return s+c.net_salary }, 0)

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8" /></div>

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            Burimet Njerezore &amp; Pagat
          </h1>
          <p className="text-muted-foreground mt-1">HR &amp; Payroll — TAP (ATK) + Trusti Pensional (5%+5%)</p>
        </div>
        <Button onClick={() => setAdvanceModal(true)} className="gap-2 bg-violet-600 hover:bg-violet-700">
          <Plus className="w-4 h-4" /> Avance e Re
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:"Punonjes Aktiv", val:workers.length, Icon:Users, c:"violet" },
          { label:"Fond Pagash (Neto)", val:`${netFund.toFixed(0)} EUR`, Icon:DollarSign, c:"emerald" },
          { label:"Avanca Aktive", val:`${pendingAdvancesTotal.toFixed(0)} EUR`, Icon:Wallet, c:"amber" },
          { label:"Paguar Gjithsej", val:`${totalPaid.toFixed(0)} EUR`, Icon:TrendingUp, c:"blue" },
        ].map(({ label, val, Icon, c }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-${c}-500/20`}>
                <Icon className={`w-5 h-5 text-${c}-400`} />
              </div>
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{val}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(["workers","advances","payroll"] as const).map(k => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab===k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {k==="workers" ? <><Users className="w-4 h-4" /> Punonjesit</> : k==="advances" ? <><Wallet className="w-4 h-4" /> Avanca</> : <><FileText className="w-4 h-4" /> Listepagesat</>}
          </button>
        ))}
      </div>

      {tab==="workers" && (
        <div className="space-y-3">
          {workers.length===0 && <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Nuk ka punonjes aktiv.</p></CardContent></Card>}
          {workers.map(w => {
            const gross = w.gross_salary || 400
            const calc = calcPayroll(gross)
            return (
              <Card key={w.id} className="hover:border-violet-500/30 transition-colors">
                <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {w.first_name[0]}{w.last_name[0]}
                    </div>
                    <div><p className="font-semibold">{w.first_name} {w.last_name}</p><p className="text-xs text-muted-foreground">{w.position || w.role}</p></div>
                  </div>
                  <div className="flex gap-6 flex-1 flex-wrap">
                    <div className="text-center"><p className="text-xs text-muted-foreground">Bruto</p><p className="font-bold text-amber-400">{gross.toFixed(2)} EUR</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground">Trusti 5%</p><p className="font-semibold text-red-400">-{calc.pension_employee.toFixed(2)} EUR</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground">TAP</p><p className="font-semibold text-orange-400">-{calc.tax_amount.toFixed(2)} EUR</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground">Neto</p><p className="font-bold text-emerald-400">{calc.net_salary.toFixed(2)} EUR</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground">Banka</p><p className="text-sm">{w.bank_name || "---"}</p></div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditWorker(w)
                    setWorkerForm({ gross_salary:String(w.gross_salary||""), bank_account:w.bank_account||"", bank_name:w.bank_name||"TEB", personal_number:w.personal_number||"", position:w.position||"", contract_start_date:w.contract_start_date||"" })
                    setWorkerModal(true)
                  }}>Edito HR</Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {tab==="advances" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{advances.length} avanca gjithsej</p>
            <Button size="sm" onClick={() => setAdvanceModal(true)} className="gap-2 bg-amber-600 hover:bg-amber-700"><Plus className="w-4 h-4" /> Avance e Re</Button>
          </div>
          {advances.length===0 && <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Nuk ka avanca.</p></CardContent></Card>}
          {advances.map(adv => (
            <Card key={adv.id} className={`border-l-4 ${adv.is_deducted ? "border-l-emerald-500 opacity-60" : "border-l-amber-500"}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{adv.worker?.first_name} {adv.worker?.last_name}</p>
                    <Badge variant="outline" className={adv.is_deducted ? "text-emerald-400 border-emerald-400" : "text-amber-400 border-amber-400"}>
                      {adv.is_deducted ? "E Zbritur" : "Aktive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{adv.reason} - {new Date(adv.advance_date).toLocaleDateString()}</p>
                </div>
                <p className="text-xl font-bold text-amber-400">{adv.amount.toFixed(2)} EUR</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab==="payroll" && (
        <div className="space-y-4">
          <Card className="border-violet-500/30 bg-violet-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2"><Calculator className="w-5 h-5 text-violet-400" /><span className="font-semibold">Gjenero Listepagese</span></div>
                <Select value={String(payrollMonth)} onValueChange={v => setPayrollMonth(Number(v))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m,i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={String(payrollYear)} onValueChange={v => setPayrollYear(Number(v))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>{[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={generatePayroll} disabled={isGenerating} className="gap-2 bg-violet-600 hover:bg-violet-700">
                  {isGenerating ? <Spinner className="w-4 h-4" /> : <Calculator className="w-4 h-4" />} Parashiko &amp; Gjenero
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Sipas Ligjit Nr. 05/L-028 (Trusti 5%+5%) dhe ATK (TAP shkalle progresive)
              </p>
            </CardContent>
          </Card>

          {payrolls.length===0 && <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Nuk ka listepagesa. Gjenero listepagesen e pare.</p></CardContent></Card>}

          {Array.from(new Set(payrolls.map(p => `${p.year}-${p.month}`))).map(key => {
            const [yr, mo] = key.split("-").map(Number)
            const group = payrolls.filter(p => p.year===yr && p.month===mo)
            const allPaid = group.every(p => p.status==="Paguar")
            const allApproved = group.every(p => p.status==="Aprovuar" || p.status==="Paguar")
            const totalNet = group.reduce((s,p) => s+p.net_salary, 0)
            const totalEmp = group.reduce((s,p) => s+p.pension_employer, 0)
            return (
              <Card key={key} className="border-violet-500/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{MONTHS[mo-1]} {yr}</CardTitle>
                      <CardDescription>{group.length} punonjes - Neto: {totalNet.toFixed(2)} EUR + Trusti: {totalEmp.toFixed(2)} EUR</CardDescription>
                    </div>
                    <Badge className={allPaid ? "bg-emerald-500/20 text-emerald-400" : allApproved ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"}>
                      {allPaid ? "Paguar" : allApproved ? "Aprovuar" : "Draft"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {group.map(rec => (
                      <div key={rec.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {rec.worker_name.split(" ").map(n => n[0]).join("").slice(0,2)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{rec.worker_name}</p>
                          <p className="text-xs text-muted-foreground">{rec.position}</p>
                        </div>
                        <div className="hidden md:flex gap-4 text-sm">
                          <div className="text-center"><p className="text-xs text-muted-foreground">Bruto</p><p>{rec.gross_salary.toFixed(2)}</p></div>
                          <div className="text-center"><p className="text-xs text-muted-foreground">Trusti</p><p className="text-red-400">-{rec.pension_employee.toFixed(2)}</p></div>
                          <div className="text-center"><p className="text-xs text-muted-foreground">TAP</p><p className="text-orange-400">-{rec.tax_amount.toFixed(2)}</p></div>
                          <div className="text-center"><p className="text-xs text-muted-foreground">Neto</p><p className="font-bold text-emerald-400">{rec.net_salary.toFixed(2)}</p></div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => setPrintRecord(rec)}><Printer className="w-4 h-4" /></Button>
                          {rec.status==="Draft" && <Button size="sm" variant="outline" className="text-blue-400 border-blue-500/30 text-xs" onClick={() => updatePayrollStatus(rec.id,"Aprovuar")}>Aprovo</Button>}
                          {rec.status==="Aprovuar" && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1" onClick={() => updatePayrollStatus(rec.id,"Paguar")}><CheckCircle2 className="w-3 h-3" /> Paguaj</Button>}
                          {rec.status==="Paguar" && <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">Paguar</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={workerModal} onOpenChange={setWorkerModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><User className="w-5 h-5 text-violet-400" /> Te dhenat HR - {editWorker?.first_name} {editWorker?.last_name}</DialogTitle>
            <DialogDescription>Paga bruto, banka, numri personal, pozita dhe data kontrates</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium mb-1 block">Paga Bruto (EUR)</label><Input type="number" value={workerForm.gross_salary} onChange={e => setWorkerForm(p => ({...p, gross_salary:e.target.value}))} placeholder="450.00" /></div>
            <div><label className="text-sm font-medium mb-1 block">Pozita / Titulli</label><Input value={workerForm.position} onChange={e => setWorkerForm(p => ({...p, position:e.target.value}))} placeholder="Shites, Arketar, Menaxher..." /></div>
            <div><label className="text-sm font-medium mb-1 block">Numri Personal</label><Input value={workerForm.personal_number} onChange={e => setWorkerForm(p => ({...p, personal_number:e.target.value}))} placeholder="XXXXXXXXXX" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Banka</label>
                <Select value={workerForm.bank_name} onValueChange={(v) => setWorkerForm(p => ({...p, bank_name: v ?? ""}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["TEB","ProCredit","Raiffeisen","BKT","NLB","Banka Ekonomike","Isbank"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium mb-1 block">IBAN / Llogarie</label><Input value={workerForm.bank_account} onChange={e => setWorkerForm(p => ({...p, bank_account:e.target.value}))} placeholder="XK05..." /></div>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Data Fillimit Kontrates</label><Input type="date" value={workerForm.contract_start_date} onChange={e => setWorkerForm(p => ({...p, contract_start_date:e.target.value}))} /></div>
            {workerForm.gross_salary && (() => {
              const c = calcPayroll(parseFloat(workerForm.gross_salary) || 0)
              const g = parseFloat(workerForm.gross_salary) || 0
              return (
                <div className="bg-muted rounded-lg p-3 space-y-1.5 text-sm">
                  <p className="font-semibold text-xs text-muted-foreground uppercase mb-2">Parashikim Pages</p>
                  <div className="flex justify-between"><span>Bruto</span><span className="font-semibold">{g.toFixed(2)} EUR</span></div>
                  <div className="flex justify-between text-red-400"><span>Trusti Punonjes (5%)</span><span>-{c.pension_employee.toFixed(2)} EUR</span></div>
                  <div className="flex justify-between text-orange-400"><span>TAP (ATK)</span><span>-{c.tax_amount.toFixed(2)} EUR</span></div>
                  <div className="border-t border-border my-1" />
                  <div className="flex justify-between font-bold text-emerald-400"><span>Neto</span><span>{c.net_salary.toFixed(2)} EUR</span></div>
                  <div className="flex justify-between text-muted-foreground text-xs border-t pt-1"><span>Kosto e plote punedhenesit</span><span>{(g + c.pension_employer).toFixed(2)} EUR</span></div>
                </div>
              )
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkerModal(false)}>Anulo</Button>
            <Button onClick={saveWorkerHR} className="bg-violet-600 hover:bg-violet-700">Ruaj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={advanceModal} onOpenChange={setAdvanceModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-amber-400" /> Regjistro Avance / Paradhenie</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Punonjesi</label>
              <Select value={advForm.worker_id} onValueChange={(v) => setAdvForm(p => ({...p, worker_id: v ?? ""}))}>
                <SelectTrigger><SelectValue placeholder="Zgjidh punonjësin..." /></SelectTrigger>
                <SelectContent>{workers.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.first_name} {w.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Shuma (EUR)</label><Input type="number" value={advForm.amount} onChange={e => setAdvForm(p => ({...p, amount:e.target.value}))} placeholder="100.00" /></div>
            <div><label className="text-sm font-medium mb-1 block">Arsyeja</label><Input value={advForm.reason} onChange={e => setAdvForm(p => ({...p, reason:e.target.value}))} /></div>
            <div><label className="text-sm font-medium mb-1 block">Data</label><Input type="date" value={advForm.advance_date} onChange={e => setAdvForm(p => ({...p, advance_date:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceModal(false)}>Anulo</Button>
            <Button onClick={saveAdvance} className="bg-amber-600 hover:bg-amber-700">Regjistro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payrollPreviewModal} onOpenChange={setPayrollPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-violet-400" /> Parashikim - {MONTHS[payrollMonth-1]} {payrollYear}</DialogTitle>
            <DialogDescription>Shiko llogaritjet para konfirmimit. Avanca aktive zbriten automatikisht.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="grid grid-cols-7 text-xs text-muted-foreground font-semibold uppercase px-3">
              <span className="col-span-2">Punonjesi</span><span className="text-right">Bruto</span><span className="text-right">Trusti</span><span className="text-right">TAP</span><span className="text-right">Avance</span><span className="text-right">Neto</span>
            </div>
            {previewPayroll.map((rec, i) => (
              <div key={i} className="grid grid-cols-7 items-center px-3 py-2.5 rounded-lg bg-muted/50 text-sm">
                <div className="col-span-2"><p className="font-medium">{rec.worker_name}</p><p className="text-xs text-muted-foreground">{rec.position}</p></div>
                <span className="text-right">{rec.gross_salary.toFixed(2)}</span>
                <span className="text-right text-red-400">-{rec.pension_employee.toFixed(2)}</span>
                <span className="text-right text-orange-400">-{rec.tax_amount.toFixed(2)}</span>
                <span className="text-right text-amber-400">{rec.advances_deducted>0 ? `-${rec.advances_deducted.toFixed(2)}` : "---"}</span>
                <span className="text-right font-bold text-emerald-400">{rec.net_salary.toFixed(2)}</span>
              </div>
            ))}
            <div className="grid grid-cols-7 px-3 py-2 border-t font-bold text-sm">
              <span className="col-span-2">TOTALI</span>
              <span className="text-right">{previewPayroll.reduce((s,r) => s+r.gross_salary, 0).toFixed(2)}</span>
              <span className="text-right text-red-400">-{previewPayroll.reduce((s,r) => s+r.pension_employee, 0).toFixed(2)}</span>
              <span className="text-right text-orange-400">-{previewPayroll.reduce((s,r) => s+r.tax_amount, 0).toFixed(2)}</span>
              <span className="text-right text-amber-400">-{previewPayroll.reduce((s,r) => s+r.advances_deducted, 0).toFixed(2)}</span>
              <span className="text-right text-emerald-400">{previewPayroll.reduce((s,r) => s+r.net_salary, 0).toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayrollPreviewModal(false)}>Anulo</Button>
            <Button onClick={confirmPayroll} disabled={isGenerating} className="bg-violet-600 hover:bg-violet-700 gap-2">
              {isGenerating ? <Spinner className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Konfirmo &amp; Ruaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printRecord && (
        <Dialog open={!!printRecord} onOpenChange={() => setPrintRecord(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Slip Pagese</DialogTitle></DialogHeader>
            <div className="space-y-4 font-mono text-sm">
              <div className="text-center border-b pb-3">
                <p className="font-bold text-lg">AGONI ERP</p>
                <p className="text-muted-foreground text-xs">SLIP PAGESE - {MONTHS[printRecord.month-1].toUpperCase()} {printRecord.year}</p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Punonjesi:</span><span className="font-semibold">{printRecord.worker_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pozita:</span><span>{printRecord.position}</span></div>
                {printRecord.bank_account && <div className="flex justify-between"><span className="text-muted-foreground">IBAN:</span><span>{printRecord.bank_account}</span></div>}
              </div>
              <div className="border rounded-lg p-3 space-y-1">
                <div className="flex justify-between"><span>Paga Bruto:</span><span className="font-bold">{printRecord.gross_salary.toFixed(2)} EUR</span></div>
                <div className="flex justify-between text-red-400"><span>(-) Trusti Punonjes (5%):</span><span>-{printRecord.pension_employee.toFixed(2)} EUR</span></div>
                <div className="flex justify-between text-orange-400"><span>(-) TAP (ATK):</span><span>-{printRecord.tax_amount.toFixed(2)} EUR</span></div>
                {printRecord.advances_deducted>0 && <div className="flex justify-between text-amber-400"><span>(-) Avance e zbritur:</span><span>-{printRecord.advances_deducted.toFixed(2)} EUR</span></div>}
                {printRecord.bonuses>0 && <div className="flex justify-between text-emerald-400"><span>(+) Bonus:</span><span>+{printRecord.bonuses.toFixed(2)} EUR</span></div>}
                <div className="border-t mt-2 pt-2 flex justify-between font-bold text-emerald-400 text-base">
                  <span>PAGA NETO:</span><span>{printRecord.net_salary.toFixed(2)} EUR</span>
                </div>
              </div>
              <div className="text-center text-xs text-muted-foreground">
                <p>Trusti Punëdhenes (5%): {printRecord.pension_employer.toFixed(2)} EUR</p>
                <p className="mt-1">Gjeneruar nga Agoni ERP</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPrintRecord(null)}>Mbyll</Button>
              <Button className="gap-2" onClick={() => window.print()}><Printer className="w-4 h-4" /> Printo</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
