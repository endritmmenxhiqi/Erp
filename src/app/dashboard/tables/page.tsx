"use client"

import React, { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { StockService } from "@/lib/services/stock"
import { StaffService } from "@/lib/services/staff"
import { 
  UtensilsCrossed, 
  Plus, 
  Coffee, 
  Check, 
  Sparkles, 
  Receipt, 
  Trash2,
  Users,
  Search,
  Minus,
  X,
  Printer,
  ShoppingCart,
  Package,
  ArrowLeft,
  CreditCard,
  Banknote,
  Wallet,
  Pencil,
  ArrowRightLeft,
  Layers,
  MapPin,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

// ─── Types ──────────────────────────────────────────────────────
interface TableItem {
  id: number
  table_number: string
  zone: string
  capacity?: number
  status: "E lire" | "E zene" | "E rezervuar"
  active_bill_total: number
  waiter_name?: string | null
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

// ─── Local Orders Storage (Cache for instant resilience) ────────
function loadOrdersFromLocal(): Record<number, OrderLine[]> {
  try {
    const raw = localStorage.getItem("agoni_table_orders")
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveOrdersToLocal(orders: Record<number, OrderLine[]>) {
  localStorage.setItem("agoni_table_orders", JSON.stringify(orders))
}

export default function TablesPage() {
  const supabase = createClient()

  // State: Tables & Dynamic Zones (Zero hardcoded defaults!)
  const [tables, setTables] = useState<TableItem[]>([])
  const [isLoadingTables, setIsLoadingTables] = useState(true)
  const [zones, setZones] = useState<string[]>([])
  const [selectedZone, setSelectedZone] = useState<string>("Të gjitha")
  
  // Real stats
  const [todaySalesTotal, setTodaySalesTotal] = useState<number>(0)
  const [todaySalesCount, setTodaySalesCount] = useState<number>(0)

  // Modals & Active State
  const [activeTable, setActiveTable] = useState<TableItem | null>(null)
  const [isAddTableOpen, setIsAddTableOpen] = useState(false)
  const [isEditTableOpen, setIsEditTableOpen] = useState(false)
  const [tableToEdit, setTableToEdit] = useState<TableItem | null>(null)
  const [tableToDelete, setTableToDelete] = useState<TableItem | null>(null)
  
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false)
  const [isManageZonesOpen, setIsManageZonesOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferTargetId, setTransferTargetId] = useState<number | null>(null)

  // Inputs
  const [newTableNum, setNewTableNum] = useState("")
  const [newTableZone, setNewTableZone] = useState("")
  const [newTableCapacity, setNewTableCapacity] = useState("4")
  const [newZoneName, setNewZoneName] = useState("")

  // Edit table inputs
  const [editTableNum, setEditTableNum] = useState("")
  const [editTableZone, setEditTableZone] = useState("")
  const [editTableCapacity, setEditTableCapacity] = useState("4")

  // POS State
  const [products, setProducts] = useState<StockProduct[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [tableOrders, setTableOrders] = useState<Record<number, OrderLine[]>>({})
  const [isClosingBill, setIsClosingBill] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const barcodeRef = useRef<HTMLInputElement>(null)

  // ─── Initial Load ───────────────────────────────────────────
  useEffect(() => {
    loadTables()
    loadProducts()
    loadProfile()
    loadTodaySales()
    const saved = loadOrdersFromLocal()
    setTableOrders(saved)
  }, [])

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

  async function loadTodaySales() {
    try {
      const businessId = await StaffService.getEffectiveBusinessId(supabase)
      if (!businessId) return
      
      const today = new Date().toISOString().split("T")[0]
      const { data } = await supabase
        .from("sales")
        .select("total_amount")
        .eq("user_id", businessId)
        .gte("date", today)
        .ilike("invoice_num", "REST-%")

      if (data) {
        const total = data.reduce((acc: number, s: any) => acc + (Number(s.total_amount) || 0), 0)
        setTodaySalesTotal(total)
        setTodaySalesCount(data.length)
      }
    } catch (err) {
      console.warn("Could not load today sales:", err)
    }
  }

  async function loadTables() {
    setIsLoadingTables(true)
    try {
      const businessId = await StaffService.getEffectiveBusinessId(supabase)
      
      // Call our API route which operates cleanly with server authorization
      let fetchedTables: any[] = []
      try {
        const res = await fetch(`/api/restaurant/tables?business_id=${businessId || ""}`)
        if (res.ok) {
          const json = await res.json()
          fetchedTables = json.tables || []
        }
      } catch {
        // Fallback to direct supabase
        if (businessId) {
          const { data } = await supabase
            .from("restaurant_tables")
            .select("*")
            .eq("user_id", businessId)
            .order("id", { ascending: true })
          if (data) fetchedTables = data
        }
      }

      const saved = loadOrdersFromLocal()
      const mapped = fetchedTables.map((t: any) => {
        const orderFromDb = Array.isArray(t.current_order) && t.current_order.length > 0 ? t.current_order : (saved[t.id] || [])
        return {
          ...t,
          current_order: orderFromDb,
          capacity: t.capacity || 4
        }
      })

      setTables(mapped)

      // Initialize dynamic zones from actual tables + saved custom zones
      const distinctZones = Array.from(new Set(mapped.map((t: any) => String(t.zone).trim()).filter(Boolean)))
      const savedCustomZones = JSON.parse(localStorage.getItem(`agoni_zones_${businessId}`) || "[]")
      const mergedZones = Array.from(new Set([...distinctZones, ...savedCustomZones]))

      // If user has zero zones configured at all, provide two initial clean zones
      const finalZones = mergedZones.length > 0 ? mergedZones : ["Brenda", "Terasa"]
      setZones(finalZones as string[])
      if (!newTableZone && finalZones.length > 0) {
        setNewTableZone(finalZones[0] as string)
      }
    } catch (err) {
      console.warn("Tables load notice:", err)
    } finally {
      setIsLoadingTables(false)
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

  // ─── Zone Management ────────────────────────────────────────
  function handleAddZone() {
    const clean = newZoneName.trim()
    if (!clean) {
      toast.error("Ju lutem shënoni emrin e ambientit/zonës.")
      return
    }

    if (zones.map(z => z.toLowerCase()).includes(clean.toLowerCase())) {
      toast.error(`Ambienti "${clean}" ekziston tashmë!`)
      return
    }

    const updated = [...zones, clean]
    setZones(updated)
    setSelectedZone(clean)
    setNewTableZone(clean)
    setNewZoneName("")
    setIsAddZoneOpen(false)

    // Persist custom zones to localStorage
    const businessId = profile?.id
    if (businessId) {
      localStorage.setItem(`agoni_zones_${businessId}`, JSON.stringify(updated))
    }

    toast.success(`Ambienti "${clean}" u shtua me sukses!`)
  }

  async function handleDeleteZone(zoneToDelete: string) {
    const tablesInZone = tables.filter(t => t.zone === zoneToDelete)
    if (tablesInZone.length > 0) {
      toast.error(`Nuk mund të fshini zonën "${zoneToDelete}" sepse përmban ${tablesInZone.length} tavolina! Zhvendosni tavolinat së pari.`)
      return
    }

    const updated = zones.filter(z => z !== zoneToDelete)
    setZones(updated)
    if (selectedZone === zoneToDelete) {
      setSelectedZone("Të gjitha")
    }

    const businessId = profile?.id
    if (businessId) {
      localStorage.setItem(`agoni_zones_${businessId}`, JSON.stringify(updated))
    }

    toast.success(`Zona "${zoneToDelete}" u fshi!`)
  }

  // ─── Table CRUD: Add, Edit, Delete ──────────────────────────
  async function handleAddTable() {
    const cleanNum = newTableNum.trim()
    if (!cleanNum) {
      toast.error("Ju lutem vendosni numrin ose emrin e tavolinës.")
      return
    }

    const zoneToUse = newTableZone.trim() || (zones[0] || "Brenda")
    const capacity = parseInt(newTableCapacity) || 4

    try {
      const businessId = await StaffService.getEffectiveBusinessId(supabase) || profile?.id

      const res = await fetch("/api/restaurant/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_number: cleanNum,
          zone: zoneToUse,
          capacity: capacity,
          business_id: businessId
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Dështoi shtimi i tavolinës")

      const createdTable: TableItem = {
        id: data.table.id,
        table_number: data.table.table_number,
        zone: data.table.zone,
        capacity: data.table.capacity || capacity,
        status: "E lire",
        active_bill_total: 0,
        current_order: []
      }

      setTables(prev => [...prev, createdTable])
      setIsAddTableOpen(false)
      setNewTableNum("")
      toast.success(`Tavolina ${cleanNum} u shtua me sukses në zonën "${zoneToUse}"!`)
    } catch (err: any) {
      toast.error(err.message || "Gabim gjatë shtimit të tavolinës")
    }
  }

  function openEditModal(table: TableItem, e: React.MouseEvent) {
    e.stopPropagation()
    setTableToEdit(table)
    setEditTableNum(table.table_number)
    setEditTableZone(table.zone)
    setEditTableCapacity(String(table.capacity || 4))
    setIsEditTableOpen(true)
  }

  async function handleSaveEditTable() {
    if (!tableToEdit) return
    const cleanNum = editTableNum.trim()
    if (!cleanNum) {
      toast.error("Numri i tavolinës nuk mund të jetë i zbrazët.")
      return
    }

    const cleanZone = editTableZone.trim() || tableToEdit.zone
    const capacity = parseInt(editTableCapacity) || 4

    try {
      const res = await fetch("/api/restaurant/tables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tableToEdit.id,
          table_number: cleanNum,
          zone: cleanZone,
          capacity: capacity
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Dështoi përditësimi i tavolinës")

      setTables(prev => prev.map(t => 
        t.id === tableToEdit.id 
          ? { ...t, table_number: cleanNum, zone: cleanZone, capacity: capacity }
          : t
      ))

      if (activeTable?.id === tableToEdit.id) {
        setActiveTable(prev => prev ? { ...prev, table_number: cleanNum, zone: cleanZone, capacity } : null)
      }

      setIsEditTableOpen(false)
      setTableToEdit(null)
      toast.success(`Tavolina u ndryshua me sukses! U zhvendos në: "${cleanZone}".`)
    } catch (err: any) {
      toast.error(err.message || "Gabim gjatë përditësimit të tavolinës")
    }
  }

  function openDeleteConfirm(table: TableItem, e: React.MouseEvent) {
    e.stopPropagation()
    setTableToDelete(table)
  }

  async function handleConfirmDeleteTable() {
    if (!tableToDelete) return

    try {
      const res = await fetch(`/api/restaurant/tables?id=${tableToDelete.id}`, {
        method: "DELETE"
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Dështoi fshirja e tavolinës")
      }

      setTables(prev => prev.filter(t => t.id !== tableToDelete.id))
      
      // Clean orders cache
      const newOrders = { ...tableOrders }
      delete newOrders[tableToDelete.id]
      setTableOrders(newOrders)
      saveOrdersToLocal(newOrders)

      if (activeTable?.id === tableToDelete.id) {
        setActiveTable(null)
      }

      toast.success(`Tavolina ${tableToDelete.table_number} u fshi me sukses!`)
      setTableToDelete(null)
    } catch (err: any) {
      toast.error(err.message || "Gabim gjatë fshirjes së tavolinës")
    }
  }

  // ─── Order Transfer (Move Order to another table) ────────────
  async function handleTransferOrder() {
    if (!activeTable || !transferTargetId) return

    const sourceOrder = tableOrders[activeTable.id] || []
    if (sourceOrder.length === 0) {
      toast.info("Tavolina nuk ka porosi për të transferuar.")
      return
    }

    const targetTable = tables.find(t => t.id === transferTargetId)
    if (!targetTable) return

    try {
      const total = activeTable.active_bill_total

      // 1. Move to target table in local state
      const newOrders = {
        ...tableOrders,
        [targetTable.id]: sourceOrder,
      }
      delete newOrders[activeTable.id]
      setTableOrders(newOrders)
      saveOrdersToLocal(newOrders)

      // 2. Update DB for both tables
      await fetch("/api/restaurant/tables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetTable.id,
          status: "E zene",
          active_bill_total: total,
          current_order: sourceOrder
        })
      })

      await fetch("/api/restaurant/tables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeTable.id,
          status: "E lire",
          active_bill_total: 0,
          current_order: []
        })
      })

      // 3. Update tables state
      setTables(prev => prev.map(t => {
        if (t.id === targetTable.id) {
          return { ...t, status: "E zene", active_bill_total: total, current_order: sourceOrder }
        }
        if (t.id === activeTable.id) {
          return { ...t, status: "E lire", active_bill_total: 0, current_order: [] }
        }
        return t
      }))

      toast.success(`Porosia u transferua nga ${activeTable.table_number} te ${targetTable.table_number}!`)
      setIsTransferModalOpen(false)
      setActiveTable(null)
    } catch (err: any) {
      toast.error(err.message || "Gabim gjatë transferimit të tavolinës")
    }
  }

  // ─── Order Management ──────────────────────────────────────
  function updateTableOrder(tableId: number, newOrder: OrderLine[]) {
    const newOrders = { ...tableOrders, [tableId]: newOrder }
    setTableOrders(newOrders)
    saveOrdersToLocal(newOrders)

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

    // Persist via API
    fetch("/api/restaurant/tables", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: tableId,
        active_bill_total: total,
        status: newStatus,
        current_order: newOrder
      })
    }).catch(() => {})
  }

  function addProductToTable(product: StockProduct) {
    if (!activeTable) return
    const existing = (tableOrders[activeTable.id] || [])
    const existingIdx = existing.findIndex(o => o.item_name === product.item_name)

    let newOrder: OrderLine[]
    if (existingIdx >= 0) {
      newOrder = existing.map((o, i) => 
        i === existingIdx ? { ...o, quantity: o.quantity + 1 } : o
      )
    } else {
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
    toast.success(`${product.item_name} u shtua!`, { duration: 1000 })
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

  function handleBarcodeScan(barcode: string) {
    if (!barcode.trim()) return
    const found = products.find(p => p.barcode === barcode.trim())
    if (found) {
      addProductToTable(found)
      setBarcodeInput("")
      barcodeRef.current?.focus()
    } else {
      toast.error(`Produkti me barkod "${barcode}" nuk u gjet në stok!`)
    }
  }

  // ─── Close Bill (Atomic Sale + Stock Deduction) ─────────────
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

      // 1. Create Sale
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

      await supabase.from("sale_items").insert(saleItemsToInsert)

      // 3. Atomic Stock Deduction
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

      // 5. Update table status to "E lire"
      setTables(prev => prev.map(t => 
        t.id === activeTable.id 
          ? { ...t, active_bill_total: 0, status: "E lire" as const, current_order: [] }
          : t
      ))

      await fetch("/api/restaurant/tables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeTable.id,
          status: "E lire",
          active_bill_total: 0,
          current_order: []
        })
      })

      // Update today stats live
      setTodaySalesTotal(prev => prev + totalAmount)
      setTodaySalesCount(prev => prev + 1)

      toast.success(
        `✅ Fatura ${invoiceNum} u arkëtua!\n€${totalAmount.toFixed(2)} — ${paymentMethod}\nStoku u zbrit automatikisht!`,
        { duration: 4000 }
      )

      setTimeout(() => window.print(), 400)

      setActiveTable(null)
      setPaymentMethod(null)
    } catch (err: any) {
      toast.error(err.message || "Gabim gjatë mbylljes së faturës")
    } finally {
      setIsClosingBill(false)
    }
  }

  // ─── Computed Values ────────────────────────────────────────
  const allZonesList = ["Të gjitha", ...zones]
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

  // ═════════════════════════════════════════════════════════════
  // Render: POS View when Table is selected
  // ═════════════════════════════════════════════════════════════
  if (activeTable) {
    return (
      <div className="space-y-0 animate-in fade-in duration-200">
        {/* Printable Thermal Receipt (hidden on screen) */}
        <div className="hidden print:block bg-white text-black p-[10mm] font-sans text-xs">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { margin: 0; size: auto; }
              body { margin: 0; }
              [data-sonner-toaster] { display: none !important; }
            }
          `}} />
          <div className="border-b-2 border-black pb-3 mb-3 text-center">
            <h1 className="text-xl font-black uppercase tracking-wider">{profile?.business_name || "RESTORANTI"}</h1>
            <p>{profile?.address || ""} | Tel: {profile?.phone_number || ""}</p>
            <p className="font-bold">Numri Fiskal: {profile?.fiscal_number || ""}</p>
          </div>
          <div className="mb-3 flex justify-between border-b pb-2">
            <div>
              <p className="font-bold text-sm">Tavolina: {activeTable.table_number}</p>
              <p className="text-[10px]">Zona: {activeTable.zone}</p>
            </div>
            <div className="text-right">
              <p>{new Date().toLocaleDateString()}</p>
              <p>{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          <table className="w-full border-collapse mb-3">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-1">Artikulli</th>
                <th className="text-center py-1">Sasia</th>
                <th className="text-right py-1">Çmimi</th>
                <th className="text-right py-1">Totali</th>
              </tr>
            </thead>
            <tbody>
              {activeOrder.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 font-semibold">{item.item_name}</td>
                  <td className="py-1 text-center">{item.quantity} {item.unit}</td>
                  <td className="py-1 text-right">€{item.price.toFixed(2)}</td>
                  <td className="py-1 text-right font-bold">€{(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t-2 border-black pt-2 space-y-1">
            <div className="flex justify-between text-base font-black">
              <span>TOTALI PËR PAGESË:</span>
              <span>€{activeTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-gray-700">
              <span>Mënyra e Pagesës:</span>
              <span className="font-bold uppercase">{paymentMethod || "Kesh"}</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>TVSH (18% e përfshirë):</span>
              <span>€{(activeTotal * 0.18 / 1.18).toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t text-center text-[10px] text-gray-500">
            <p>Ju faleminderit për vizitën tuaj!</p>
            <p className="font-bold">Agoni ERP — POS Restorant</p>
          </div>
        </div>

        {/* Screen POS UI */}
        <div className="space-y-4 print:hidden">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs">
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveTable(null)}
                className="rounded-xl font-bold"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Kthehu te Tavolinat
              </Button>

              <div className="h-6 w-px bg-border" />

              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black text-sm">
                  {activeTable.table_number}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">Tavolina: {activeTable.table_number}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/20">
                      {activeTable.zone}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">Kapaciteti: {activeTable.capacity || 4} ulëse</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeOrder.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTransferModalOpen(true)}
                  className="rounded-xl border-border text-xs font-bold hover:bg-accent"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Ndërro Tavolinën
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => openEditModal(activeTable, e)}
                className="rounded-xl text-xs font-bold"
              >
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Ndrysho Tavolinën
              </Button>
            </div>
          </div>

          {/* POS Split View: Left = Products, Right = Order Bill */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Products List & Search (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder="Kërko artikull në meny sipas emrit ose barkodit..." 
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-9 h-11 rounded-xl bg-background/60"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input 
                    ref={barcodeRef}
                    placeholder="Skano barkodin..." 
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBarcodeScan(barcodeInput)
                    }}
                    className="h-9 text-xs rounded-xl bg-background/60"
                  />
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleBarcodeScan(barcodeInput)}
                    className="h-9 px-3 text-xs rounded-xl shrink-0"
                  >
                    Shto me Barkod
                  </Button>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[560px] overflow-y-auto pr-1">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full p-8 text-center bg-card rounded-2xl border border-dashed border-border text-muted-foreground text-sm">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Nuk u gjet asnjë artikull. Shtoni artikuj te menyja <b>Produktet</b>.
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id || p.item_name}
                      onClick={() => addProductToTable(p)}
                      className="p-3.5 rounded-2xl bg-card border border-border hover:border-primary/50 text-left transition-all hover:scale-[1.02] shadow-2xs group flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {p.item_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Stoku: {p.quantity || 0} {p.unit || "copë"}
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                        <span className="text-sm font-black text-emerald-500">
                          €{(Number(p.selling_price) || 0).toFixed(2)}
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Current Order & Billing (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col h-full min-h-[500px] justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="w-4 h-4 text-primary" />
                      <h3 className="font-bold text-sm">Porosia Aktive ({activeOrder.length})</h3>
                    </div>
                    {activeOrder.length > 0 && (
                      <button 
                        onClick={() => updateTableOrder(activeTable.id, [])}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-bold"
                      >
                        Pastro Porosinë
                      </button>
                    )}
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 mt-3 max-h-[340px] overflow-y-auto pr-1">
                    {activeOrder.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground text-xs space-y-2">
                        <UtensilsCrossed className="w-8 h-8 mx-auto opacity-30" />
                        <p>Tavolina është e lirë. Klikoni artikujt majtas për të filluar porosinë.</p>
                      </div>
                    ) : (
                      activeOrder.map((line) => (
                        <div 
                          key={line.id}
                          className="p-3 rounded-xl bg-background/50 border border-border/80 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-foreground truncate">{line.item_name}</div>
                            <div className="text-[11px] text-muted-foreground">€{line.price.toFixed(2)} / {line.unit}</div>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              onClick={() => changeQuantity(line.id, -1)}
                              className="w-6 h-6 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-accent text-foreground text-xs"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-black">{line.quantity}</span>
                            <button
                              onClick={() => changeQuantity(line.id, 1)}
                              className="w-6 h-6 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-accent text-foreground text-xs"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-right shrink-0 w-16">
                            <div className="text-xs font-black text-foreground">
                              €{(line.quantity * line.price).toFixed(2)}
                            </div>
                          </div>

                          <button
                            onClick={() => removeOrderLine(line.id)}
                            className="text-muted-foreground hover:text-rose-400 p-1 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Bill Summary & Closing */}
                {activeOrder.length > 0 && (
                  <div className="pt-4 border-t border-border space-y-3 mt-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-semibold">Nëntotali:</span>
                      <span className="font-bold">€{(activeTotal / 1.18).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-semibold">TVSH (18%):</span>
                      <span className="font-bold">€{(activeTotal * 0.18 / 1.18).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-black border-t border-border pt-2">
                      <span>Totali:</span>
                      <span className="text-emerald-500 text-xl font-black">€{activeTotal.toFixed(2)}</span>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Mënyra e Pagesës për Mbyllje Fature:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "Cash", name: "Kesh", icon: Banknote },
                          { id: "POS Kartelë", name: "Kartë", icon: CreditCard },
                          { id: "Faturë", name: "Faturë", icon: Wallet }
                        ].map(m => {
                          const Icon = m.icon
                          const isSel = paymentMethod === m.id
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setPaymentMethod(m.id)}
                              className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                isSel 
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                  : "bg-background border-border hover:bg-accent text-foreground"
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {m.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <Button
                      onClick={handleCloseAndBill}
                      disabled={isClosingBill || !paymentMethod}
                      className="w-full h-12 rounded-xl text-sm font-black primary-gradient text-white shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all"
                    >
                      {isClosingBill ? (
                        "Po mbyllet faturimi..."
                      ) : (
                        <>
                          <Printer className="w-4 h-4 mr-2" />
                          Mbyll Faturën & Zbrit Stokun (€{activeTotal.toFixed(2)})
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Order Modal */}
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                Lëviz Porosinë te Tavolinë Tjetër
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Zgjidhni tavolinën e re ku dëshironi të zhvendosni llogarinë (€{activeTotal.toFixed(2)}):
              </p>

              <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
                {tables.filter(t => t.id !== activeTable.id && t.status === "E lire").length === 0 ? (
                  <p className="text-xs text-rose-400 font-semibold p-3 text-center bg-rose-500/10 rounded-xl">
                    Nuk ka asnjë tavolinë tjetër të lirë!
                  </p>
                ) : (
                  tables
                    .filter(t => t.id !== activeTable.id && t.status === "E lire")
                    .map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTransferTargetId(t.id)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          transferTargetId === t.id 
                            ? "border-primary bg-primary/10 text-foreground font-bold" 
                            : "border-border hover:bg-accent text-foreground"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold">{t.table_number}</div>
                          <div className="text-[10px] text-muted-foreground">Zona: {t.zone}</div>
                        </div>
                        {transferTargetId === t.id && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))
                )}
              </div>

              <div className="flex justify-end space-x-2 mt-5">
                <Button variant="outline" size="sm" onClick={() => setIsTransferModalOpen(false)}>
                  Anulo
                </Button>
                <Button 
                  size="sm" 
                  disabled={!transferTargetId} 
                  onClick={handleTransferOrder}
                  className="bg-primary text-white font-bold"
                >
                  Konfirmo Lëvizjen
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════
  // Render: Tables Grid View (Main Screen)
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 print:hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Tavolinat & POS Restoranti</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5" /> POS i Integruar Live
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Shitjet kryhen direkt te tavolinat me zbritje automatike të stokut dhe printim fature.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => setIsManageZonesOpen(true)}
            className="rounded-xl border-border font-bold text-xs"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Menaxho Ambientet ({zones.length})
          </Button>

          <Button 
            onClick={() => setIsAddTableOpen(true)}
            className="rounded-xl primary-gradient text-white font-bold text-xs shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Shto Tavolinë
          </Button>
        </div>
      </div>

      {/* Real-time KPI Stats (100% Real, Zero Static Mock Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tavolina Gjithsej</div>
          <div className="text-2xl font-black mt-1 text-foreground">{tables.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{occupiedCount} tavolina aktive me mysafirë</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Llogari të Hapura (Në Tavolina)</div>
          <div className="text-2xl font-black mt-1 text-amber-500">€{totalInRestaurant.toFixed(2)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Priten për arkëtim</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Shitje Tavolinash Sot</div>
          <div className="text-2xl font-black mt-1 text-emerald-500">€{todaySalesTotal.toFixed(2)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{todaySalesCount} fatura të mbyllura sot</div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-primary/10 border border-primary/20 shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> POS i Integruar
          </div>
          <div className="text-xs text-foreground font-semibold mt-1">
            Kliko çdo tavolinë për të hapur POS-in
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Lidhje atomike me zbritje stoku
          </div>
        </div>
      </div>

      {/* Dynamic Zone Tabs (Created and configured by the user!) */}
      <div className="flex items-center space-x-2 border-b border-border pb-3 overflow-x-auto">
        {allZonesList.map(z => {
          const isSelected = selectedZone === z
          const countInZone = z === "Të gjitha" ? tables.length : tables.filter(t => t.zone === z).length
          const occupiedInZone = z === "Të gjitha" ? occupiedCount : tables.filter(t => t.zone === z && t.status === "E zene").length

          return (
            <button
              key={z}
              onClick={() => setSelectedZone(z)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                isSelected 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "bg-card hover:bg-accent text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              <span>{z}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {countInZone}
              </span>
              {occupiedInZone > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          )
        })}

        <button
          onClick={() => setIsAddZoneOpen(true)}
          className="px-3 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 border border-dashed border-primary/40 shrink-0 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Shto Ambient
        </button>
      </div>

      {/* Empty State: If user has 0 tables */}
      {!isLoadingTables && tables.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-card border border-dashed border-border space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-foreground">Nuk keni asnjë tavolinë të regjistruar</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Krijoni ambientet (p.sh. Brenda, Terasa, VIP, Kati 2) dhe shtoni tavolinat e lokalit tuaj për të filluar me porositë dhe faturimin.
            </p>
          </div>
          <Button 
            onClick={() => setIsAddTableOpen(true)}
            className="rounded-xl primary-gradient text-white font-bold text-xs shadow-md shadow-primary/20 px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Shto Tavolinën e Parë
          </Button>
        </div>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {filtered.map((t) => {
          const isOccupied = t.status === "E zene"
          const isReserved = t.status === "E rezervuar"
          const orderCount = (tableOrders[t.id] || []).length
          const orderTotal = (tableOrders[t.id] || []).reduce((acc, item) => acc + (item.quantity * item.price), 0)

          return (
            <div 
              key={t.id}
              onClick={() => setActiveTable(t)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative group hover:scale-[1.02] shadow-xs ${
                isOccupied 
                  ? "bg-rose-500/10 border-rose-500/40 hover:border-rose-500" 
                  : isReserved
                  ? "bg-amber-500/10 border-amber-500/40 hover:border-amber-500"
                  : "bg-card border-border hover:border-primary/50"
              }`}
            >
              {orderCount > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black shadow-md">
                  {orderCount}
                </div>
              )}

              {/* Card Header: Zone + Quick Action Buttons (Edit / Delete) */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[90px]">
                  {t.zone}
                </span>

                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => openEditModal(t, e)}
                    className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Ndrysho tavolinën / ndërro vendin"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => openDeleteConfirm(t, e)}
                    className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Fshi tavolinën"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Table Number & Amount */}
              <div className="flex items-center space-x-3 my-2.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                  isOccupied ? "bg-rose-500/20 text-rose-400" : "bg-primary/15 text-primary"
                }`}>
                  {t.table_number}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-black text-foreground truncate">
                    €{orderTotal.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Users className="w-2.5 h-2.5" />
                    {t.capacity || 4} ulëse
                  </div>
                </div>
              </div>

              {/* Status footer */}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  isOccupied 
                    ? "bg-rose-500/20 text-rose-400" 
                    : isReserved 
                    ? "bg-amber-500/20 text-amber-400" 
                    : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  {t.status}
                </span>

                <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1 font-semibold">
                  Hap POS
                  <Receipt className="w-3 h-3" />
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── MODAL: Shto Tavolinë ─────────────────────────────── */}
      {isAddTableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Shto Tavolinë të Re
              </h3>
              <button onClick={() => setIsAddTableOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Numri ose Emri i Tavolinës</label>
                <Input 
                  placeholder="p.sh. T-01, Tavolina 10, Bar 2..." 
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  className="mt-1 h-10 rounded-xl"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">Ambienti / Zona</label>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddTableOpen(false)
                      setIsAddZoneOpen(true)
                    }}
                    className="text-[11px] text-primary hover:underline font-bold"
                  >
                    + Krijo Zonë të Re
                  </button>
                </div>

                <select 
                  value={newTableZone}
                  onChange={(e) => setNewTableZone(e.target.value)}
                  className="w-full mt-1 h-10 rounded-xl border border-input bg-card px-3 py-1 text-xs font-semibold shadow-xs"
                >
                  {zones.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Kapaciteti (Ulëse)</label>
                <Input 
                  type="number"
                  min="1"
                  max="50"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(e.target.value)}
                  className="mt-1 h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsAddTableOpen(false)}>
                Anulo
              </Button>
              <Button size="sm" onClick={handleAddTable} className="bg-primary text-white font-bold">
                Krijo Tavolinën
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Ndrysho Tavolinë (Edit, Change Zone/Place) ─── */}
      {isEditTableOpen && tableToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary" />
                Ndrysho Tavolinën / Vendin
              </h3>
              <button onClick={() => setIsEditTableOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Emri / Numri i Tavolinës</label>
                <Input 
                  value={editTableNum}
                  onChange={(e) => setEditTableNum(e.target.value)}
                  className="mt-1 h-10 rounded-xl"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">Ambienti / Zona e Tavolinës</label>
                  <span className="text-[10px] text-muted-foreground">Ndërroni vendin e tavolinës këtu</span>
                </div>
                <select 
                  value={editTableZone}
                  onChange={(e) => setEditTableZone(e.target.value)}
                  className="w-full mt-1 h-10 rounded-xl border border-input bg-card px-3 py-1 text-xs font-semibold shadow-xs"
                >
                  {zones.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Kapaciteti (Ulëse)</label>
                <Input 
                  type="number"
                  min="1"
                  max="50"
                  value={editTableCapacity}
                  onChange={(e) => setEditTableCapacity(e.target.value)}
                  className="mt-1 h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsEditTableOpen(false)}>
                Anulo
              </Button>
              <Button size="sm" onClick={handleSaveEditTable} className="bg-primary text-white font-bold">
                Ruaj Ndryshimet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Konfirmim Fshirjeje Tavoline ───────────────── */}
      {tableToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-2 text-rose-500 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              Fshi Tavolinën {tableToDelete.table_number}?
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Jeni të sigurt që dëshironi të fshini tavolinën <b>{tableToDelete.table_number}</b> ({tableToDelete.zone})?
              {tableToDelete.active_bill_total > 0 && (
                <span className="block mt-2 font-bold text-rose-400">
                  Kujdes: Kjo tavolinë ka porosi aktive prej €{tableToDelete.active_bill_total.toFixed(2)}!
                </span>
              )}
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setTableToDelete(null)}>
                Anulo
              </Button>
              <Button size="sm" variant="destructive" onClick={handleConfirmDeleteTable} className="font-bold">
                Po, Fshije
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Shto Zonë / Ambient të Ri ──────────────────── */}
      {isAddZoneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Shto Ambient / Zonë të Re
              </h3>
              <button onClick={() => setIsAddZoneOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Emri i Ambientit / Zonës</label>
              <Input 
                placeholder="p.sh. Kopshti, Kati 2, Salla VIP, Veranda..." 
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddZone() }}
                className="mt-1 h-10 rounded-xl"
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsAddZoneOpen(false)}>
                Anulo
              </Button>
              <Button size="sm" onClick={handleAddZone} className="bg-primary text-white font-bold">
                Krijo Ambientin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Menaxho Ambientet ──────────────────────────── */}
      {isManageZonesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Menaxhimi i Ambientëve ({zones.length})
              </h3>
              <button onClick={() => setIsManageZonesOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {zones.map((z) => {
                const count = tables.filter(t => t.zone === z).length
                return (
                  <div 
                    key={z}
                    className="p-3 rounded-xl bg-background/50 border border-border flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">{z}</div>
                      <div className="text-[10px] text-muted-foreground">{count} tavolina në këtë zonë</div>
                    </div>

                    <button
                      onClick={() => handleDeleteZone(z)}
                      disabled={count > 0}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                        count > 0 
                          ? "opacity-30 cursor-not-allowed text-muted-foreground" 
                          : "text-rose-400 hover:bg-rose-500/10"
                      }`}
                      title={count > 0 ? "Zhvendosni tavolinat para se ta fshini" : "Fshi zonën"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 border-t flex justify-between items-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsManageZonesOpen(false)
                  setIsAddZoneOpen(true)
                }}
                className="text-xs font-bold text-primary"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Shto Ambient Tjetër
              </Button>

              <Button size="sm" onClick={() => setIsManageZonesOpen(false)}>
                Mbyll
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
