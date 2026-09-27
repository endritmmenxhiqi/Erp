"use client"

import React, { useState } from "react"
import { 
  Wrench, 
  Plus, 
  Search, 
  Car, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  Trash2, 
  DollarSign 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface ServiceOrder {
  id: number
  order_number: string
  vehicle_plate: string
  vehicle_model: string
  client_name: string
  problem_description: string
  parts_cost: number
  labor_cost: number
  total_cost: number
  status: "Ne pritje" | "Ne riparim" | "Gati" | "Dorezuar"
  mechanic_name: string
}

const DEMO_ORDERS: ServiceOrder[] = [
  { id: 1, order_number: "SRV-1001", vehicle_plate: "01-987-ZZ", vehicle_model: "Audi A6 3.0 TDI", client_name: "Gëzim Morina", problem_description: "Ndërrim vaji, filtra dhe pllaka frenash", parts_cost: 140, labor_cost: 40, total_cost: 180, status: "Ne riparim", mechanic_name: "Mjeshtër Bekimi" },
  { id: 2, order_number: "SRV-1002", vehicle_plate: "02-543-KL", vehicle_model: "VW Passat B8", client_name: "Kreshnik Hasani", problem_description: "Defekt në pompën e ujit & termostat", parts_cost: 210, labor_cost: 70, total_cost: 280, status: "Gati", mechanic_name: "Mjeshtër Bekimi" },
  { id: 3, order_number: "SRV-1003", vehicle_plate: "01-111-AA", vehicle_model: "BMW X5 xDrive", client_name: "Alban Zeka", problem_description: "Diagnostikim kompjuteri dhe zhurmë në trap", parts_cost: 350, labor_cost: 90, total_cost: 440, status: "Ne pritje", mechanic_name: "Agroni" },
]

export default function AutoServicePage() {
  const [orders, setOrders] = useState<ServiceOrder[]>(DEMO_ORDERS)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const [formData, setFormData] = useState({
    order_number: `SRV-${Date.now().toString().slice(-4)}`,
    vehicle_plate: "",
    vehicle_model: "",
    client_name: "",
    problem_description: "",
    parts_cost: 0,
    labor_cost: 30,
    mechanic_name: "Mjeshtër Bekimi"
  })

  function handleSaveOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.vehicle_plate || !formData.problem_description) {
      toast.error("Targa dhe përshkrimi i defektit janë të detyrueshme")
      return
    }

    const total = Number(formData.parts_cost) + Number(formData.labor_cost)
    const newOrd: ServiceOrder = {
      id: Date.now(),
      order_number: formData.order_number,
      vehicle_plate: formData.vehicle_plate.toUpperCase(),
      vehicle_model: formData.vehicle_model || "Automjet",
      client_name: formData.client_name || "Klient",
      problem_description: formData.problem_description,
      parts_cost: Number(formData.parts_cost),
      labor_cost: Number(formData.labor_cost),
      total_cost: total,
      status: "Ne pritje",
      mechanic_name: formData.mechanic_name
    }

    setOrders([newOrd, ...orders])
    setIsModalOpen(false)
    toast.success(`Urdhëresa e servisit ${newOrd.order_number} u regjistrua! 🔧`)
  }

  function updateStatus(id: number, newStatus: ServiceOrder["status"]) {
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o))
    toast.success(`Statusi u ndryshua në: ${newStatus}`)
  }

  const filtered = orders.filter(o => 
    o.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.vehicle_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Auto Servis & Mekanikë</h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5" /> Urdhëresat e Riparimit
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Menaxhoni automjetet në servis, kalkulimin e pjesëve dhe punëdorës, dhe dërgimin e faturave.
          </p>
        </div>

        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Hap Urdhëresë Riparimi
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Automjete në Punëtori</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-foreground">{orders.length}</div>
          <div className="text-xs text-rose-400 font-semibold mt-1">Në proces diagnostikimi e servisi</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vlera e Serviseve Aktive</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-emerald-400">
            €{orders.reduce((acc, o) => acc + o.total_cost, 0).toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Pjesët rezervë + Punëdora</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 to-pink-950/20 border border-rose-800/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> AI Kërkim i Pjesëve
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              AI gjen numrin OEM të pjesës rezervë dhe furnitorin më të lirë me çmim partneri!
            </p>
          </div>
          <span className="text-[11px] font-semibold text-rose-400 mt-2">AI Smart Parts Finder</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Kërko me targë veture, model ose emër klienti..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 bg-card/80 border-border rounded-xl"
        />
      </div>

      {/* Service Orders Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="py-3.5 px-4">Nr. / Targa</th>
                <th className="py-3.5 px-4">Automjeti</th>
                <th className="py-3.5 px-4">Klienti</th>
                <th className="py-3.5 px-4">Defekti / Puna</th>
                <th className="py-3.5 px-4">Pjesë + Punëdorë</th>
                <th className="py-3.5 px-4">Statusi</th>
                <th className="py-3.5 px-4 text-right">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((ord) => (
                <tr key={ord.id} className="hover:bg-accent/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-xs text-muted-foreground">{ord.order_number}</div>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 font-mono font-bold text-xs text-white tracking-widest mt-0.5 inline-block">
                      {ord.vehicle_plate}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-foreground">
                    {ord.vehicle_model}
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    {ord.client_name}
                  </td>
                  <td className="py-3.5 px-4 max-w-xs text-xs">
                    <p className="line-clamp-2">{ord.problem_description}</p>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Mekaniku: {ord.mechanic_name}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-black text-sm text-foreground">€{ord.total_cost.toFixed(2)}</div>
                    <div className="text-[10px] text-muted-foreground">Pjesë: €{ord.parts_cost} | Punë: €{ord.labor_cost}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={ord.status}
                      onChange={(e: any) => updateStatus(ord.id, e.target.value)}
                      className="text-xs h-7 rounded-md border border-border bg-transparent px-2 shadow-xs font-semibold"
                    >
                      <option value="Ne pritje" className="bg-card">Në pritje</option>
                      <option value="Ne riparim" className="bg-card">Në riparim</option>
                      <option value="Gati" className="bg-card">Gati</option>
                      <option value="Dorezuar" className="bg-card">Dorëzuar</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast.success(`Fatura për ${ord.vehicle_plate} u dërgua me SMS/WhatsApp! 📲`)}
                      className="h-8 text-xs"
                    >
                      Njofto Klientin
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Service Order */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold text-foreground">Hap Urdhëresë Riparimi</h2>
            <form onSubmit={handleSaveOrder} className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Targa e Automjetit *</label>
                  <Input 
                    required
                    placeholder="01-123-AB"
                    value={formData.vehicle_plate}
                    onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                    className="mt-1 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Modeli i Automjetit</label>
                  <Input 
                    placeholder="p.sh. Audi A6 3.0 TDI"
                    value={formData.vehicle_model}
                    onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Klienti</label>
                <Input 
                  placeholder="Emri i pronarit të veturës"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Përshkrimi i Defektit / Punës *</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Çka duhet të riparohet ose ndërrohet..."
                  value={formData.problem_description}
                  onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
                  className="w-full mt-1 rounded-md border border-input bg-transparent p-2 text-sm shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Kosto Pjesëve (€)</label>
                  <Input 
                    type="number"
                    value={formData.parts_cost}
                    onChange={(e) => setFormData({ ...formData, parts_cost: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Kosto Punëdorës (€)</label>
                  <Input 
                    type="number"
                    value={formData.labor_cost}
                    onChange={(e) => setFormData({ ...formData, labor_cost: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Anulo</Button>
                <Button type="submit" className="bg-primary">Regjistro Riparimin</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
