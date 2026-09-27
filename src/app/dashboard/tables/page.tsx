"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { 
  UtensilsCrossed, 
  Plus, 
  Coffee, 
  Check, 
  Clock, 
  Sparkles, 
  Receipt, 
  DollarSign, 
  Trash2,
  Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface TableItem {
  id: number
  table_number: string
  zone: string
  status: "E lire" | "E zene" | "E rezervuar"
  active_bill_total: number
  waiter_name: string | null
  current_order?: any[]
}

const DEFAULT_TABLES: TableItem[] = [
  { id: 1, table_number: "T-01", zone: "Brenda", status: "E lire", active_bill_total: 0, waiter_name: null },
  { id: 2, table_number: "T-02", zone: "Brenda", status: "E zene", active_bill_total: 14.50, waiter_name: "Valoni" },
  { id: 3, table_number: "T-03", zone: "Brenda", status: "E lire", active_bill_total: 0, waiter_name: null },
  { id: 4, table_number: "T-04", zone: "Terasa", status: "E zene", active_bill_total: 8.20, waiter_name: "Agoni" },
  { id: 5, table_number: "T-05", zone: "Terasa", status: "E rezervuar", active_bill_total: 0, waiter_name: null },
  { id: 6, table_number: "T-06", zone: "Terasa", status: "E lire", active_bill_total: 0, waiter_name: null },
  { id: 7, table_number: "VIP-1", zone: "VIP", status: "E zene", active_bill_total: 45.00, waiter_name: "Valoni" },
  { id: 8, table_number: "VIP-2", zone: "VIP", status: "E lire", active_bill_total: 0, waiter_name: null },
]

export default function TablesPage() {
  const supabase = createClient()
  const [tables, setTables] = useState<TableItem[]>(DEFAULT_TABLES)
  const [selectedZone, setSelectedZone] = useState<string>("Të gjitha")
  const [activeTable, setActiveTable] = useState<TableItem | null>(null)
  const [quickAmount, setQuickAmount] = useState<string>("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newTableNum, setNewTableNum] = useState("")
  const [newZone, setNewZone] = useState("Brenda")

  useEffect(() => {
    loadTables()
  }, [])

  async function loadTables() {
    try {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .order("id", { ascending: true })

      if (!error && data && data.length > 0) {
        setTables(data as TableItem[])
      }
    } catch (err) {
      console.warn("Using local tables setup:", err)
    }
  }

  async function updateTableStatus(table: TableItem, newStatus: "E lire" | "E zene" | "E rezervuar", newTotal = 0) {
    const updated = tables.map(t => t.id === table.id ? { ...t, status: newStatus, active_bill_total: newTotal } : t)
    setTables(updated)
    if (activeTable?.id === table.id) {
      setActiveTable({ ...activeTable, status: newStatus, active_bill_total: newTotal })
    }

    try {
      await supabase
        .from("restaurant_tables")
        .update({ status: newStatus, active_bill_total: newTotal })
        .eq("id", table.id)
    } catch {
      // Local fallback
    }
  }

  async function handleAddTable() {
    if (!newTableNum.trim()) return
    const newT: TableItem = {
      id: Date.now(),
      table_number: newTableNum,
      zone: newZone,
      status: "E lire",
      active_bill_total: 0,
      waiter_name: null
    }

    setTables([...tables, newT])
    setIsAddModalOpen(false)
    setNewTableNum("")
    toast.success(`Tavolina ${newTableNum} u shtua!`)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("restaurant_tables").insert([
          {
            table_number: newT.table_number,
            zone: newT.zone,
            status: "E lire",
            user_id: user.id
          }
        ])
      }
    } catch {
      // Local
    }
  }

  // Quick Close & Invoice
  async function handleCloseAndBill(table: TableItem) {
    if (table.active_bill_total <= 0) {
      updateTableStatus(table, "E lire", 0)
      toast.info(`Tavolina ${table.table_number} u lirua.`)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("sales").insert([
          {
            invoice_num: `REST-${table.table_number}-${Date.now().toString().slice(-4)}`,
            total_amount: table.active_bill_total,
            vat_rate: 18,
            type: "Shërbim",
            user_id: user.id
          }
        ])
      }

      toast.success(`Fatura për Tavolinën ${table.table_number} (€${table.active_bill_total.toFixed(2)}) u mbyll dhe u regjistrua në shitje! ☕🧾`)
      updateTableStatus(table, "E lire", 0)
    } catch (err: any) {
      toast.error(err.message || "Gabim gjatë mbylljes")
    }
  }

  const zones = ["Të gjitha", "Brenda", "Terasa", "VIP"]
  const filtered = selectedZone === "Të gjitha" ? tables : tables.filter(t => t.zone === selectedZone)

  const occupiedCount = tables.filter(t => t.status === "E zene").length
  const totalInRestaurant = tables.reduce((acc, t) => acc + (t.active_bill_total || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Moduli Restorant & Kafene</h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <Coffee className="w-3 h-3" /> Tavolinat Live
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Menaxhoni tavolinat, porositë e kamarierëve dhe faturimin e shpejtë sipas zonave.
          </p>
        </div>

        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Shto Tavolinë
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tavolina Gjithsej</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-foreground">{tables.length}</div>
          <div className="text-xs text-muted-foreground mt-1">{occupiedCount} tavolina aktive të zëna</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Llogari të Hapura (Në Tavolina)</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-emerald-500">€{totalInRestaurant.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">Priten për arkëtim</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 to-orange-950/20 border border-amber-800/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Mobile POS për Kamarierë
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Kamarierët mund ta hapin këtë faqe nga telefoni i tyre për të marrë porosi direkt te tavolina!
            </p>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-amber-400">Përshtatur për Telefon</div>
        </div>
      </div>

      {/* Zone Tabs */}
      <div className="flex items-center space-x-2 border-b border-border pb-3 overflow-x-auto">
        {zones.map(z => (
          <button
            key={z}
            onClick={() => setSelectedZone(z)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedZone === z 
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                : "bg-card hover:bg-accent text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            {z}
          </button>
        ))}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filtered.map((t) => {
          const isOccupied = t.status === "E zene"
          const isReserved = t.status === "E rezervuar"

          return (
            <div 
              key={t.id}
              onClick={() => setActiveTable(t)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative group hover:scale-[1.02] ${
                isOccupied 
                  ? "bg-rose-950/20 border-rose-600/40 hover:border-rose-500 shadow-md shadow-rose-950/10" 
                  : isReserved
                  ? "bg-amber-950/20 border-amber-600/40 hover:border-amber-500"
                  : "bg-card border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t.zone}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isOccupied 
                    ? "bg-rose-500/20 text-rose-400" 
                    : isReserved 
                    ? "bg-amber-500/20 text-amber-400" 
                    : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  {t.status}
                </span>
              </div>

              <div className="flex items-center space-x-3 my-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                  isOccupied ? "bg-rose-500/20 text-rose-400" : "bg-primary/20 text-primary"
                }`}>
                  {t.table_number}
                </div>
                <div>
                  <div className="text-lg font-black text-foreground">
                    €{t.active_bill_total.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {t.waiter_name ? `Kamarier: ${t.waiter_name}` : "Gati"}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Kliko për veprime</span>
                <Receipt className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Active Table Details Modal */}
      {activeTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-black text-primary">
                  {activeTable.table_number}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-foreground">Tavolina {activeTable.table_number}</h3>
                  <p className="text-xs text-muted-foreground">Zona: {activeTable.zone}</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTable(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-5 space-y-4">
              <div className="p-4 rounded-xl bg-accent/30 border border-border/80 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground font-medium">Shuma Aktuale e Faturës</div>
                  <div className="text-3xl font-black text-foreground mt-0.5">
                    €{activeTable.active_bill_total.toFixed(2)}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  activeTable.status === "E zene" ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  {activeTable.status}
                </span>
              </div>

              {/* Quick Add Amount to Table */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Shto Shpenzim / Porosi (€)</label>
                <div className="flex gap-2">
                  <Input 
                    type="number"
                    step="0.10"
                    placeholder="p.sh. 3.50"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                  />
                  <Button 
                    onClick={() => {
                      const add = Number(quickAmount) || 0
                      if (add <= 0) return
                      const newTot = activeTable.active_bill_total + add
                      updateTableStatus(activeTable, "E zene", newTot)
                      setQuickAmount("")
                      toast.success(`€${add.toFixed(2)} iu shtua tavolinës!`)
                    }}
                    className="bg-primary"
                  >
                    Shto
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => updateTableStatus(activeTable, "E rezervuar", 0)}
                  className="text-xs"
                >
                  Bëje të Rezervuar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateTableStatus(activeTable, "E lire", 0)}
                  className="text-xs"
                >
                  Liro Tavolinën
                </Button>
              </div>

              <Button
                onClick={() => {
                  handleCloseAndBill(activeTable)
                  setActiveTable(null)
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 shadow-md shadow-emerald-600/20"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Mbyll & Fatero Llogarinë (€{activeTable.active_bill_total.toFixed(2)})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold">Shto Tavolinë të Re</h3>
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Numri / Emri i Tavolinës</label>
                <Input 
                  placeholder="p.sh. T-10 ose Bar-1" 
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Zona</label>
                <select 
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  className="w-full mt-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="Brenda" className="bg-card">Brenda</option>
                  <option value="Terasa" className="bg-card">Terasa</option>
                  <option value="VIP" className="bg-card">VIP</option>
                  <option value="Kati 2" className="bg-card">Kati 2</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-5">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Anulo</Button>
              <Button onClick={handleAddTable} className="bg-primary">Krijo</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
