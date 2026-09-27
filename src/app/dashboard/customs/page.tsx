"use client"

import React, { useState } from "react"
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  FileText, 
  Globe, 
  Sparkles, 
  DollarSign, 
  Truck, 
  Scale, 
  CheckCircle2 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Declaration {
  id: number
  dud_number: string
  origin_country: string
  invoice_value: number
  customs_duty: number
  excise_duty: number
  vat_amount: number
  total_landed_cost: number
  status: "Ne proces" | "E zhdoganuar" | "Ne pritje te pageses"
  created_at: string
}

const DEMO_DUD: Declaration[] = [
  { id: 1, dud_number: "DUD-2026-08912", origin_country: "Gjermani", invoice_value: 12500, customs_duty: 1250, excise_duty: 0, vat_amount: 2475, total_landed_cost: 16225, status: "E zhdoganuar", created_at: "2026-09-20" },
  { id: 2, dud_number: "DUD-2026-09415", origin_country: "Turqi", invoice_value: 8400, customs_duty: 840, excise_duty: 0, vat_amount: 1663.20, total_landed_cost: 10903.20, status: "Ne pritje te pageses", created_at: "2026-09-25" },
  { id: 3, dud_number: "DUD-2026-09940", origin_country: "Itali", invoice_value: 19800, customs_duty: 1980, excise_duty: 500, vat_amount: 3956.40, total_landed_cost: 26236.40, status: "Ne proces", created_at: "2026-09-27" },
]

export default function CustomsPage() {
  const [declarations, setDeclarations] = useState<Declaration[]>(DEMO_DUD)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const [formData, setFormData] = useState({
    dud_number: `DUD-2026-${Date.now().toString().slice(-5)}`,
    origin_country: "Gjermani",
    invoice_value: 5000,
    customs_percent: 10,
    excise_duty: 0
  })

  function handleSaveDud(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.dud_number) {
      toast.error("Numri i DUD është i detyrueshëm")
      return
    }

    const val = Number(formData.invoice_value) || 0
    const duty = (val * (Number(formData.customs_percent) || 0)) / 100
    const excise = Number(formData.excise_duty) || 0
    const vatBase = val + duty + excise
    const vat = vatBase * 0.18 // 18% TVSH në doganë
    const total = val + duty + excise + vat

    const newD: Declaration = {
      id: Date.now(),
      dud_number: formData.dud_number,
      origin_country: formData.origin_country,
      invoice_value: val,
      customs_duty: duty,
      excise_duty: excise,
      vat_amount: vat,
      total_landed_cost: total,
      status: "E zhdoganuar",
      created_at: new Date().toISOString().split("T")[0]
    }

    setDeclarations([newD, ...declarations])
    setIsModalOpen(false)
    toast.success(`DUD ${newD.dud_number} u regjistrua me sukses! Taksat u llogaritën automatikisht. 📦🚢`)
  }

  const totalImport = declarations.reduce((acc, d) => acc + d.invoice_value, 0)
  const totalTaxes = declarations.reduce((acc, d) => acc + (d.customs_duty + d.excise_duty + d.vat_amount), 0)

  const filtered = declarations.filter(d => 
    d.dud_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.origin_country.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Dogana & Deklaratat DUD</h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Import & Zhdoganim
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Menaxhoni faturat e importit, deklaratat DUD doganore, taksat doganore, akcizën dhe TVSH-në në kufi.
          </p>
        </div>

        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Krijo Deklaratë DUD të Re
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vlera Totale e Importeve</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-foreground">€{totalImport.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">Nga faturat e blerjeve ndërkombëtare</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taksat & TVSH Doganore</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-cyan-400">€{totalTaxes.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">Doganë 10% + Akcizë + TVSH 18%</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-blue-950/20 border border-cyan-800/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> AI Llogaritja e Kostos Finale (Landed Cost)
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              AI shpërndan automatikisht shpenzimet e transportit dhe doganës në koston e secilit produkt të importuar!
            </p>
          </div>
          <span className="text-[11px] font-semibold text-cyan-400 mt-2">Kalkulim Automatik Çmimi</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Kërko me numër DUD ose shtet të origjinës..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 bg-card/80 border-border rounded-xl"
        />
      </div>

      {/* DUD Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="py-3.5 px-4">Nr. i DUD</th>
                <th className="py-3.5 px-4">Origjina</th>
                <th className="py-3.5 px-4">Vlera e Faturës</th>
                <th className="py-3.5 px-4">Dogana</th>
                <th className="py-3.5 px-4">TVSH Doganore</th>
                <th className="py-3.5 px-4">Kosto Totale (Landed)</th>
                <th className="py-3.5 px-4">Statusi</th>
                <th className="py-3.5 px-4 text-right">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-accent/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                    {d.dud_number}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-foreground">
                    {d.origin_country}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-foreground">
                    €{d.invoice_value.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    €{d.customs_duty.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    €{d.vat_amount.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 font-black text-foreground">
                    €{d.total_landed_cost.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      d.status === "E zhdoganuar" 
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast.success(`Dokumenti ${d.dud_number} u sinkronizua me Magazinën Doganore! 📦`)}
                      className="h-8 text-xs"
                    >
                      Fut në Magazinë
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add DUD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold text-foreground">Regjistro Deklaratë Doganore (DUD)</h2>
            <form onSubmit={handleSaveDud} className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Numri i DUD *</label>
                  <Input 
                    required
                    placeholder="DUD-2026-XXXXX"
                    value={formData.dud_number}
                    onChange={(e) => setFormData({ ...formData, dud_number: e.target.value })}
                    className="mt-1 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Shteti i Origjinës</label>
                  <Input 
                    placeholder="Gjermani, Itali, Turqi..."
                    value={formData.origin_country}
                    onChange={(e) => setFormData({ ...formData, origin_country: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Vlera e Faturës së Importit (€) *</label>
                <Input 
                  type="number"
                  step="0.01"
                  required
                  value={formData.invoice_value}
                  onChange={(e) => setFormData({ ...formData, invoice_value: Number(e.target.value) })}
                  className="mt-1 font-bold text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Norma Doganore (%)</label>
                  <Input 
                    type="number"
                    value={formData.customs_percent}
                    onChange={(e) => setFormData({ ...formData, customs_percent: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Akciza (€)</label>
                  <Input 
                    type="number"
                    value={formData.excise_duty}
                    onChange={(e) => setFormData({ ...formData, excise_duty: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-accent/40 border border-border text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>TVSH Doganore e llogaritur:</span>
                  <span className="font-bold text-foreground">18% automatike</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Anulo</Button>
                <Button type="submit" className="bg-primary">Llogarit & Ruaj DUD</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
