"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Mic, 
  Sparkles, 
  CheckCircle2, 
  FileCheck, 
  Trash2, 
  Printer, 
  ArrowRight,
  Send,
  Loader2,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Order {
  id: number
  order_number: string
  order_type: "Oferte" | "Porosi" | "Proforme"
  status: "Draft" | "Derguar" | "Pranuar" | "Faturuar" | "Anuluar"
  client_name: string
  client_phone: string | null
  total_amount: number
  delivery_date: string | null
  notes: string | null
  created_at: string
}

export default function OrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // AI Voice / Smart Order Prompt
  const [aiPrompt, setAiPrompt] = useState("")
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [isListening, setIsListening] = useState(false)

  // Order Form
  const [formData, setFormData] = useState({
    order_number: `OF-${Date.now().toString().slice(-6)}`,
    order_type: "Oferte" as "Oferte" | "Porosi" | "Proforme",
    client_name: "",
    client_phone: "",
    total_amount: 0,
    delivery_date: "",
    notes: ""
  })

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.warn("Orders fetch warning:", error.message)
      } else {
        setOrders(data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // AI Voice & Natural Text Parser
  async function handleAiParseOrder() {
    if (!aiPrompt.trim()) {
      toast.error("Shkruani ose flisni porosinë fillimisht")
      return
    }

    setIsAiProcessing(true)
    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parse_voice_order",
          payload: { text: aiPrompt }
        })
      })

      const data = await res.json()
      if (data?.success && data?.data) {
        const parsed = data.data
        const calculatedTotal = (parsed.items || []).reduce(
          (acc: number, item: any) => acc + (Number(item.quantity || 1) * Number(item.unit_price || 0)),
          0
        )

        setFormData(prev => ({
          ...prev,
          client_name: parsed.client_name || prev.client_name || "Klient i nderuar",
          client_phone: parsed.client_phone || prev.client_phone,
          order_type: parsed.order_type === "Oferte" ? "Oferte" : "Porosi",
          total_amount: calculatedTotal > 0 ? calculatedTotal : prev.total_amount,
          notes: parsed.notes || aiPrompt
        }))

        toast.success("AI e analizoi dhe e plotësoi porosinë me sukses! ✨")
      } else {
        toast.info("Porosia u pranua, kontrolloni fushat para ruajtjes.")
      }
    } catch (err: any) {
      toast.error(err.message || "Gabim me asistentin AI")
    } finally {
      setIsAiProcessing(false)
    }
  }

  // Voice speech-to-text with Web Speech API on phone or desktop
  function toggleVoiceRecognition() {
    if (typeof window === "undefined") return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error("Browseri juaj nuk mbështet regjistrimin me zë. Mund të shkruani me tekst.")
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "sq-AL"
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsListening(true)
      toast.info("🎙️ Po dëgjoj... Flisni porosinë ose ofertën (në shqip)")
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setAiPrompt(prev => (prev ? prev + " " + transcript : transcript))
      setIsListening(false)
      toast.success("Zëri u regjistrua!")
    }

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  async function handleSaveOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.client_name.trim()) {
      toast.error("Emri i klientit është i detyrueshëm")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Sesioni ka skaduar")
        return
      }

      const { error } = await supabase.from("orders").insert([
        {
          order_number: formData.order_number,
          order_type: formData.order_type,
          status: "Draft",
          client_name: formData.client_name,
          client_phone: formData.client_phone || null,
          total_amount: Number(formData.total_amount) || 0,
          delivery_date: formData.delivery_date || null,
          notes: formData.notes || null,
          user_id: user.id
        }
      ])

      if (error) throw error

      toast.success(`${formData.order_type} u regjistrua me sukses!`)
      setIsModalOpen(false)
      setAiPrompt("")
      setFormData({
        order_number: `OF-${Date.now().toString().slice(-6)}`,
        order_type: "Oferte",
        client_name: "",
        client_phone: "",
        total_amount: 0,
        delivery_date: "",
        notes: ""
      })
      fetchOrders()
    } catch (err: any) {
      toast.error(err.message || "Gabim gjatë ruajtjes")
    }
  }

  // 1-Click Convert to Invoice / Sale
  async function handleConvertToSale(order: Order) {
    if (!confirm(`A dëshironi ta konvertoni ${order.order_type} #${order.order_number} në Shitje / Faturë zyrtare?`)) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Insert into sales table
      const { error: saleError } = await supabase.from("sales").insert([
        {
          invoice_num: `FAT-${order.order_number}`,
          total_amount: order.total_amount,
          vat_rate: 18,
          type: "Mall",
          user_id: user.id
        }
      ])

      if (saleError) throw saleError

      // Update order status to Faturuar
      await supabase.from("orders").update({ status: "Faturuar" }).eq("id", order.id)

      toast.success(`Fatura zyrtare FAT-${order.order_number} u krijua me sukses! 🎉`)
      fetchOrders()
    } catch (err: any) {
      toast.error(err.message || "Gabim gjatë konvertimit në shitje")
    }
  }

  async function handleDeleteOrder(id: number) {
    if (!confirm("A jeni të sigurt?")) return
    try {
      await supabase.from("orders").delete().eq("id", id)
      toast.success("U fshi")
      fetchOrders()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filtered = orders.filter(o => 
    o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Ofertat & Porositë</h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI Voice & Text
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Gjeneroni proforma dhe oferta me zë ose tekst dhe konvertojini në fatura me 1 klik.
          </p>
        </div>

        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Krijo Ofertë / Porosi të Re
        </Button>
      </div>

      {/* AI Voice Assistant Quick Box */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-background border border-blue-800/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
            <Mic className={`w-5 h-5 ${isListening ? "text-red-400 animate-pulse" : "text-blue-400"}`} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              Porosi me Zë nga Telefoni ose Desktopi
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold">Fast POS</span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Flisni ose shkruani natyrshëm (p.sh. <i>"Ofertë për 10 thasë cement me 5 euro për Arbenin"</i>)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Button
            type="button"
            onClick={toggleVoiceRecognition}
            variant="outline"
            className={`border-blue-500/40 ${isListening ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse" : ""}`}
          >
            <Mic className="w-4 h-4 mr-1.5" />
            {isListening ? "Po dëgjoj..." : "Fol me Zë"}
          </Button>
          <Button
            onClick={() => {
              setIsModalOpen(true)
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            Hap Krijuesin
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Kërko me numër oferte ose emër klienti..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 bg-card/80 border-border rounded-xl"
        />
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Duke ngarkuar...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-semibold">Nuk u gjet asnjë ofertë apo porosi</p>
            <p className="text-muted-foreground text-xs mt-1">Krijoni ofertën e parë për ta dërguar tek klienti.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Nr. Dokumentit</th>
                  <th className="py-3.5 px-4">Lloji</th>
                  <th className="py-3.5 px-4">Klienti</th>
                  <th className="py-3.5 px-4">Shuma Totale</th>
                  <th className="py-3.5 px-4">Statusi</th>
                  <th className="py-3.5 px-4">Data Dorëzimit</th>
                  <th className="py-3.5 px-4 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((ord) => (
                  <tr key={ord.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                      {ord.order_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {ord.order_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div>{ord.client_name}</div>
                      {ord.client_phone && <div className="text-xs text-muted-foreground font-normal">{ord.client_phone}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-black text-foreground">
                      €{Number(ord.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ord.status === "Faturuar" 
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : ord.status === "Pranuar"
                          ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {ord.delivery_date ? new Date(ord.delivery_date).toLocaleDateString() : "E menjëhershme"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {ord.status !== "Faturuar" && (
                          <Button
                            size="sm"
                            onClick={() => handleConvertToSale(ord)}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs"
                            title="Konverto në Faturë / Shitje"
                          >
                            <FileCheck className="w-3.5 h-3.5 mr-1" />
                            Konverto në Faturë
                          </Button>
                        )}
                        <button
                          onClick={() => handleDeleteOrder(ord.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Krijimi Ofertë / Porosi me AI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-xl rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-xl font-bold text-foreground">Krijo Ofertë / Porosi</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Plotësoni të dhënat ose përdorni asistentin AI.</p>
              </div>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary/20 text-primary">Agoni AI</span>
            </div>

            {/* AI Assistant Fast Input */}
            <div className="mt-4 p-3.5 rounded-xl bg-accent/30 border border-border/80 space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Plotësim me AI (Zë ose Tekst Shqip):
              </label>
              <div className="flex gap-2">
                <Input 
                  placeholder="p.sh. Porosi për Besnikun 10 copë karrige me 25 euro..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="text-xs h-9 bg-card"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={toggleVoiceRecognition}
                  variant="outline"
                  className={`h-9 px-3 ${isListening ? "bg-red-500/20 text-red-400 border-red-500" : ""}`}
                >
                  <Mic className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAiParseOrder}
                  disabled={isAiProcessing}
                  className="h-9 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3"
                >
                  {isAiProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Analizo me AI"}
                </Button>
              </div>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Numri Dokumentit</label>
                  <Input 
                    required
                    value={formData.order_number}
                    onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Lloji</label>
                  <select 
                    value={formData.order_type}
                    onChange={(e: any) => setFormData({ ...formData, order_type: e.target.value })}
                    className="w-full mt-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  >
                    <option value="Oferte" className="bg-card">Ofertë</option>
                    <option value="Porosi" className="bg-card">Porosi</option>
                    <option value="Proforme" className="bg-card">Proformë</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Klienti *</label>
                  <Input 
                    required
                    placeholder="Emri i klientit"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Numri i Telefonit</label>
                  <Input 
                    placeholder="044 111 222"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Shuma Totale (€) *</label>
                  <Input 
                    type="number"
                    step="0.01"
                    required
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: Number(e.target.value) })}
                    className="mt-1 font-bold text-base"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Data e Dorëzimit</label>
                  <Input 
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Shënime / Artikujt e Përfshirë</label>
                <textarea 
                  rows={3}
                  placeholder="Detajet e artikujve, afati i pagesës, mënyra e dërgimit..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full mt-1 rounded-md border border-input bg-transparent p-2 text-sm shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Anulo
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90"
                >
                  Ruaj Dokumentin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
