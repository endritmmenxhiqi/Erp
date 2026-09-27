"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { StockService } from "@/lib/services/stock"
import { StaffService } from "@/lib/services/staff"
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
  Users,
  Search,
  Minus,
  X,
  Printer,
  ShoppingCart,
  Package,
  ArrowLeft,
  AlertTriangle,
  CreditCard,
  Banknote,
  Wallet,
  ChefHat,
  Flame,
  Zap,
  Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

// ─── Types ──────────────────────────────────────────────────────
interface TableItem {
  id: number
  table_number: string
  zone: string
  status: "E lire" | "E zene" | "E rezervuar"
  active_bill_total: number
  waiter_name: string | null
  current_order?: OrderLine[]
}

interface OrderLine {
  id: string
  item_name: string
  barcode: string
  quantity: number
  unit: string
  price: number
  available_stock: number
  note: string
}

interface StockProduct {
  id: string
  item_name: string
  barcode: string
  quantity: number
  unit: string
  selling_price: number
  category?: string
}

// ─── Default Tables ─────────────────────────────────────────────
const DEFAULT_TABLES: TableItem[] = [
  { id: 1, table_number: "T-01", zone: "Brenda", status: "E lire", active_bill_total: 0, waiter_name: null, current_order: [] },
  { id: 2, table_number: "T-02", zone: "Brenda", status: "E lire", active_bill_total: 0, waiter_name: null, current_order: [] },
  { id: 3, table_number: "T-03", zone: "Brenda", status: "E lire", active_bill_total: 0, waiter_name: null, current_order: [] },
  { id: 4, table_number: "T-04", zone: "Terasa", status: "E lire", active_bill_total: 0, waiter_name: null, current_order: [] },
  { id: 5, table_number: "T-05", zone: "Terasa", status: "E lire", active_bill_total: 0, waiter_name: null, current_order: [] },
  { id: 6, table_number: "T-06", zone: "Terasa", status: "E lire", active_bill_total: 0, waiter_name: null, current_order: [] },
  { id: 7, table_number: "VIP-1", zone: "VIP", status: "E lire", active_bill_total: 0, waiter_name: null, current_order: [] },
  { id: 8, table_number: "VIP-2", zone: "VIP", status: "E lire", active_bill_total: 0, waiter_name: null, current_order: [] },
]

// ─── Persist orders to localStorage ─────────────────────────────
function loadOrdersFromLocal(): Record<number, OrderLine[]> {
  try {
    const raw = localStorage.getItem("agoni_table_orders")
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveOrdersToLocal(orders: Record<number, OrderLine[]>) {
  localStorage.setItem("agoni_table_orders", JSON.stringify(orders))
}

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════
export default function TablesPage() {
  const supabase = createClient()
  const [tables, setTables] = useState<TableItem[]>(DEFAULT_TABLES)
  const [selectedZone, setSelectedZone] = useState<string>("Të gjitha")
  const [activeTable, setActiveTable] = useState<TableItem | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newTableNum, setNewTableNum] = useState("")
  const [newZone, setNewZone] = useState("Brenda")

  // POS State
  const [products, setProducts] = useState<StockProduct[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [tableOrders, setTableOrders] = useState<Record<number, OrderLine[]>>({})
  const [isClosingBill, setIsClosingBill] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [showBillPreview, setShowBillPreview] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const barcodeRef = useRef<HTMLInputElement>(null)

  // ─── Load Tables ────────────────────────────────────────────
  useEffect(() => {
    loadTables()
    loadProducts()
    loadProfile()
    const saved = loadOrdersFromLocal()
    setTableOrders(saved)
  }, [])

  async function loadTables() {
    try {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .order("id", { ascending: true })

      if (!error && data && data.length > 0) {
        const saved = loadOrdersFromLocal()
        const mapped = data.map((t: any) => ({
          ...t,
          current_order: saved[t.id] || []
        }))
        setTables(mapped as TableItem[])
      }
    } catch (err) {
      console.warn("Using local tables setup:", err)
    }
  }

  async function loadProducts() {
    try {
      const data = await StockService.getStock()
      setProducts(data as StockProduct[])
    } catch (err) {
      console.warn("Using empty product list:", err)
    }
  }

  async function loadProfile() {
    try {
      const businessId = await StaffService.getEffectiveBusinessId(supabase)
      if (businessId) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', businessId)
          .single()
        setProfile(data)
      }
    } catch {}
  }

  // ─── Order Management ──────────────────────────────────────
  function updateTableOrder(tableId: number, newOrder: OrderLine[]) {
    const newOrders = { ...tableOrders, [tableId]: newOrder }
    setTableOrders(newOrders)
    saveOrdersToLocal(newOrders)

    // Recalculate total
    const total = newOrder.reduce((acc, item) => acc + (item.quantity * item.price), 0)
    const newStatus: "E lire" | "E zene" = newOrder.length > 0 ? "E zene" : "E lire"
    
    setTables(prev => prev.map(t => 
      t.id === tableId 
        ? { ...t, active_bill_total: total, status: newStatus, current_order: newOrder } 
        : t
    ))

    if (activeTable?.id === tableId) {
      setActiveTable(prev => prev ? { 
        ...prev, 
        active_bill_total: total, 
        status: newStatus,
        current_order: newOrder 
      } : null)
    }

    // Persist to DB
    try {
      supabase
        .from("restaurant_tables")
        .update({ active_bill_total: total, status: newStatus })
        .eq("id", tableId)
        .then(() => {})
    } catch {}
  }

  function addProductToTable(product: StockProduct) {
    if (!activeTable) return
    const existing = (tableOrders[activeTable.id] || [])
    const existingIdx = existing.findIndex(o => o.item_name === product.item_name)

    let newOrder: OrderLine[]
    if (existingIdx >= 0) {
      // Increment quantity
      newOrder = existing.map((o, i) => 
        i === existingIdx ? { ...o, quantity: o.quantity + 1 } : o
      )
    } else {
      // Add new line
      newOrder = [...existing, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        item_name: product.item_name,
        barcode: product.barcode || "",
        quantity: 1,
        unit: product.unit || "cope",
        price: product.selling_price || 0,
        available_stock: product.quantity || 0,
        note: ""
      }]
    }

    updateTableOrder(activeTable.id, newOrder)
    toast.success(`${product.item_name} u shtua!`, { duration: 1200 })
  }

  function removeOrderLine(lineId: string) {
    if (!activeTable) return
    const existing = (tableOrders[activeTable.id] || [])
    const newOrder = existing.filter(o => o.id !== lineId)
    updateTableOrder(activeTable.id, newOrder)
  }

  function changeQuantity(lineId: string, delta: number) {
    if (!activeTable) return
    const existing = (tableOrders[activeTable.id] || [])
    const newOrder = existing.map(o => {
      if (o.id !== lineId) return o
      const newQty = o.quantity + delta
      return newQty <= 0 ? o : { ...o, quantity: newQty }
    })
    updateTableOrder(activeTable.id, newOrder)
  }

  // ─── Barcode Scanner ──────────────────────────────────────
  function handleBarcodeScan(barcode: string) {
    if (!barcode.trim()) return
    const found = products.find(p => p.barcode === barcode.trim())
    if (found) {
      addProductToTable(found)
      setBarcodeInput("")
      barcodeRef.current?.focus()
    } else {
      toast.error(`Produkti me barkod "${barcode}" nuk u gjet!`)
    }
  }

  // ─── Close Bill (Atomic: Sale + Stock Deduction) ──────────
  async function handleCloseAndBill() {
    if (!activeTable || !paymentMethod) return
    
    const order = tableOrders[activeTable.id] || []
    if (order.length === 0) {
      toast.info("Tavolina nuk ka porosi!")
      return
    }

    setIsClosingBill(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const businessId = await StaffService.getEffectiveBusinessId(supabase) || user?.id
      const currentWorker = StaffService.getCurrentWorker()
      const workerName = currentWorker 
        ? `${currentWorker.first_name} ${currentWorker.last_name}` 
        : (profile?.business_name || "Admin")

      const totalAmount = order.reduce((acc, item) => acc + (item.quantity * item.price), 0)

      // 1. Create Sale (atomic)
      const invoiceNum = `REST-${activeTable.table_number}-${Date.now().toString().slice(-6)}`
      const { data: saleData, error: saleError } = await supabase.from("sales").insert({
        invoice_num: invoiceNum,
        date: new Date().toISOString().split("T")[0],
        total_amount: totalAmount,
        vat_rate: 18,
        type: "Mall",
        user_id: businessId,
        worker_id: currentWorker?.id || null,
        worker_name: workerName,
        payment_method: paymentMethod,
      }).select().single()

      if (saleError) throw saleError

      // 2. Insert Sale Items
      const saleItemsToInsert = order.map(item => ({
        sale_id: saleData.id,
        item_name: item.item_name,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit,
        barcode: item.barcode,
        user_id: businessId
      }))

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItemsToInsert)
      if (itemsError) throw itemsError

      // 3. Atomic Stock Deduction (lidhje atomike me blerjet/inventarin)
      for (const item of order) {
        if (item.item_name) {
          await StockService.updateStock(
            item.item_name,
            -item.quantity,
            item.unit,
            businessId || ""
          )
        }
      }

      // 4. Clear table order
      const newOrders = { ...tableOrders }
      delete newOrders[activeTable.id]
      setTableOrders(newOrders)
      saveOrdersToLocal(newOrders)

      // 5. Update table status
      setTables(prev => prev.map(t => 
        t.id === activeTable.id 
          ? { ...t, active_bill_total: 0, status: "E lire" as const, current_order: [] }
          : t
      ))

      // Update DB
      try {
        await supabase
          .from("restaurant_tables")
          .update({ status: "E lire", active_bill_total: 0 })
          .eq("id", activeTable.id)
      } catch {}

      toast.success(
        `✅ Fatura ${invoiceNum} u mbyll!\n€${totalAmount.toFixed(2)} — ${paymentMethod}\nStoku u zbrit automatikisht!`,
        { duration: 4000 }
      )

      // Trigger print
      setTimeout(() => window.print(), 500)

      setActiveTable(null)
      setPaymentMethod(null)
      setShowBillPreview(false)
    } catch (err: any) {
      toast.error(err.message || "Gabim gjatë mbylljes së faturës")
    } finally {
      setIsClosingBill(false)
    }
  }

  // ─── Add Table ─────────────────────────────────────────────
  async function handleAddTable() {
    if (!newTableNum.trim()) return
    const newT: TableItem = {
      id: Date.now(),
      table_number: newTableNum,
      zone: newZone,
      status: "E lire",
      active_bill_total: 0,
      waiter_name: null,
      current_order: []
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
    } catch {}
  }

  // ─── Computed Values ──────────────────────────────────────
  const zones = ["Të gjitha", "Brenda", "Terasa", "VIP"]
  const filtered = selectedZone === "Të gjitha" ? tables : tables.filter(t => t.zone === selectedZone)
  const occupiedCount = tables.filter(t => t.status === "E zene").length
  const totalInRestaurant = tables.reduce((acc, t) => acc + (t.active_bill_total || 0), 0)

  const activeOrder = activeTable ? (tableOrders[activeTable.id] || []) : []
  const activeTotal = activeOrder.reduce((acc, item) => acc + (item.quantity * item.price), 0)

  const filteredProducts = products.filter(p => {
    if (!productSearch.trim()) return true
    const q = productSearch.toLowerCase()
    return p.item_name.toLowerCase().includes(q) || (p.barcode || "").includes(q)
  })

  // ═══════════════════════════════════════════════════════════════
  // Render: Table-Click POS View (when a table is selected)
  // ═══════════════════════════════════════════════════════════════
  if (activeTable) {
    return (
      <div className="space-y-0 animate-in fade-in duration-200">
        {/* ─── Print Preview (hidden on screen) ─── */}
        <div className="hidden print:block bg-white text-black p-[15mm] font-sans text-sm">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { margin: 0; size: auto; }
              body { margin: 0; }
              [data-sonner-toaster] { display: none !important; }
            }
          `}} />
          <div className="border-b-2 border-black pb-4 mb-4">
            <h1 className="text-2xl font-black uppercase">{profile?.business_name || "RESTORANTI"}</h1>
            <p>{profile?.address || ""} | Tel: {profile?.phone_number || ""}</p>
            <p>NF: {profile?.fiscal_number || ""}</p>
          </div>
          <div className="mb-4">
            <p className="font-bold text-lg">Tavolina: {activeTable.table_number} | Zona: {activeTable.zone}</p>
            <p>Data: {new Date().toLocaleString()}</p>
          </div>
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-1">Artikulli</th>
                <th className="text-right py-1">Sasia</th>
                <th className="text-right py-1">Çmimi</th>
                <th className="text-right py-1">Totali</th>
              </tr>
            </thead>
            <tbody>
              {activeOrder.map((item, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-1 font-bold">{item.item_name}</td>
                  <td className="py-1 text-right">{item.quantity} {item.unit}</td>
                  <td className="py-1 text-right">{item.price.toFixed(2)} €</td>
                  <td className="py-1 text-right font-bold">{(item.quantity * item.price).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t-2 border-black pt-2 text-right">
            <p className="text-sm">Nën-totali: {activeTotal.toFixed(2)} €</p>
            <p className="text-sm">TVSH (18%): {(activeTotal * 0.18).toFixed(2)} €</p>
            <p className="text-2xl font-black">TOTALI: {(activeTotal * 1.18).toFixed(2)} €</p>
          </div>
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Faleminderit për vizitën tuaj! 🍽️</p>
            <p>Powered by Agoni ERP</p>
          </div>
        </div>

        {/* ─── POS Header ─── */}
        <div className="flex items-center justify-between pb-4 border-b border-border print:hidden">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => { setActiveTable(null); setProductSearch(""); setBarcodeInput("") }}
              className="h-10 w-10 rounded-xl hover:bg-accent"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                  activeTable.status === "E zene" ? "bg-rose-500/20 text-rose-400" : "bg-primary/20 text-primary"
                }`}>
                  {activeTable.table_number}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">Tavolina {activeTable.table_number}</h2>
                  <p className="text-xs text-muted-foreground">Zona: {activeTable.zone} • {activeTable.waiter_name ? `Kamarier: ${activeTable.waiter_name}` : "Pa kamarier"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right mr-2">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Totali Live</div>
              <div className="text-2xl font-black text-primary">€{activeTotal.toFixed(2)}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="rounded-xl border-border text-xs font-bold"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Print
            </Button>
          </div>
        </div>

        {/* ─── POS Split View ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 print:hidden">
          
          {/* LEFT: Product Catalog */}
          <div className="lg:col-span-7 space-y-3">
            {/* Barcode Scanner */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Kërko artikull me emër..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-11 pl-10 bg-card border-border rounded-xl"
                />
              </div>
              <div className="relative w-48">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                <Input
                  ref={barcodeRef}
                  placeholder="Skano barkodin..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleBarcodeScan(barcodeInput)
                    }
                  }}
                  className="h-11 pl-10 bg-card border-amber-500/30 rounded-xl font-mono text-sm"
                />
              </div>
            </div>

            {/* Product Grid */}
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-1 rounded-xl">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">Nuk u gjet asnjë produkt</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Shtoni produkte në modulin e Blerje / Stoku</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {filteredProducts.map((product) => {
                    const inOrder = activeOrder.find(o => o.item_name === product.item_name)
                    const isLowStock = product.quantity <= 3
                    return (
                      <button
                        key={product.id}
                        onClick={() => addProductToTable(product)}
                        disabled={product.quantity <= 0}
                        className={`group relative p-3 rounded-xl border text-left transition-all duration-150 active:scale-95 ${
                          product.quantity <= 0
                            ? "opacity-40 cursor-not-allowed bg-card border-border"
                            : inOrder
                            ? "bg-primary/10 border-primary/40 shadow-md shadow-primary/10 hover:border-primary"
                            : "bg-card border-border hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
                        }`}
                      >
                        {inOrder && (
                          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black shadow-md animate-in zoom-in">
                            {inOrder.quantity}
                          </div>
                        )}
                        
                        <div className="text-xs font-black text-foreground leading-tight line-clamp-2 min-h-[32px]">
                          {product.item_name}
                        </div>
                        
                        <div className="mt-2 flex items-end justify-between">
                          <span className="text-lg font-black text-primary">
                            €{(product.selling_price || 0).toFixed(2)}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${
                            isLowStock ? "text-amber-500" : "text-muted-foreground"
                          }`}>
                            {product.quantity <= 0 ? "S'ka" : `${product.quantity} ${product.unit}`}
                          </span>
                        </div>

                        {isLowStock && product.quantity > 0 && (
                          <div className="absolute top-1.5 left-1.5">
                            <Flame className="w-3 h-3 text-amber-500" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Order Cart (Porosia e Tavolinës) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-card border border-border rounded-2xl flex flex-col h-[calc(100vh-280px)] shadow-xl">
              {/* Cart Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-accent/10 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">Porosia e Tavolinës {activeTable.table_number}</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground bg-accent/30 px-2 py-1 rounded-lg">
                  {activeOrder.length} artikuj
                </span>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {activeOrder.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <UtensilsCrossed className="w-10 h-10 text-muted-foreground/20 mb-3" />
                    <p className="text-sm font-bold text-muted-foreground">Tavolina është e zbrazët</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Klikoni produktet në të majtë për t'i shtuar</p>
                  </div>
                ) : (
                  activeOrder.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-accent/10 border border-border/50 group hover:bg-accent/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{item.item_name}</div>
                        <div className="text-[10px] text-muted-foreground">€{item.price.toFixed(2)} × {item.quantity}</div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (item.quantity <= 1) {
                              removeOrderLine(item.id)
                            } else {
                              changeQuantity(item.id, -1)
                            }
                          }}
                          className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                        >
                          {item.quantity <= 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        </button>
                        <span className="w-8 text-center text-xs font-black text-foreground">{item.quantity}</span>
                        <button
                          onClick={() => changeQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="w-16 text-right">
                        <span className="text-xs font-black text-primary">
                          €{(item.quantity * item.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer / Totals */}
              <div className="border-t border-border p-4 space-y-3 bg-accent/5 rounded-b-2xl">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Nën-totali:</span>
                    <span className="font-bold">€{activeTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">TVSH (18%):</span>
                    <span className="font-bold">€{(activeTotal * 0.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm font-black text-foreground">TOTALI:</span>
                    <span className="text-2xl font-black text-primary">€{(activeTotal * 1.18).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Buttons */}
                {activeOrder.length > 0 && !showBillPreview && (
                  <Button
                    onClick={() => setShowBillPreview(true)}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Mbyll & Fatero — €{(activeTotal * 1.18).toFixed(2)}
                  </Button>
                )}

                {/* Payment Method Selection */}
                {showBillPreview && (
                  <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-200">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider text-center">
                      Zgjidhni Mënyrën e Pagesës
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "Cash", icon: Banknote, label: "Cash", color: "emerald" },
                        { id: "Card", icon: CreditCard, label: "Kartë", color: "blue" },
                        { id: "Mixed", icon: Wallet, label: "Mikse", color: "purple" },
                      ].map(method => (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            paymentMethod === method.id
                              ? `border-${method.color}-500 bg-${method.color}-500/10 shadow-md`
                              : "border-border bg-background hover:border-primary/30"
                          }`}
                        >
                          <method.icon className={`w-5 h-5 mx-auto mb-1 ${
                            paymentMethod === method.id ? `text-${method.color}-500` : "text-muted-foreground"
                          }`} />
                          <span className="text-[10px] font-bold">{method.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => { setShowBillPreview(false); setPaymentMethod(null) }}
                        className="flex-1 h-10 rounded-xl text-xs font-bold"
                      >
                        Anulo
                      </Button>
                      <Button
                        onClick={handleCloseAndBill}
                        disabled={!paymentMethod || isClosingBill}
                        className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20"
                      >
                        {isClosingBill ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Po procesohet...
                          </span>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Konfirmo €{(activeTotal * 1.18).toFixed(2)}
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-[9px] text-center text-muted-foreground leading-tight">
                      ⚠️ Mbyllja e faturës automatikisht zbrit stokon e produkteve (lidhje atomike)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // Render: Table Grid View (default view)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 print:hidden">
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
            Klikoni mbi tavolinën për të hapur POS-in — shitjet bëhen direkt te tavolina me zbritje automatike të stokut.
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
              <Sparkles className="w-3.5 h-3.5" /> Mobile POS — Klik Tavolinën
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Klikoni mbi çdo tavolinë për të hapur POS-in e plotë me produkte, barkod skaner dhe faturim automatik!
            </p>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-[11px] font-semibold text-amber-400">Lidhje Atomike: Shitje ↔ Stok</span>
          </div>
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
          const orderCount = (tableOrders[t.id] || []).length
          const orderTotal = (tableOrders[t.id] || []).reduce((acc, item) => acc + (item.quantity * item.price), 0)

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
              {orderCount > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black shadow-md animate-in zoom-in">
                  {orderCount}
                </div>
              )}

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
                    €{orderTotal.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {orderCount > 0 ? `${orderCount} artikuj` : "Gati"}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3" />
                  Kliko për POS
                </span>
                <Receipt className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Table Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
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
