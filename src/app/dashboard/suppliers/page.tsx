"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { 
  Truck, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  Trash2, 
  ExternalLink,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Supplier {
  id: number
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  fiscal_number: string | null
  balance: number // Sa i kemi borxh furnitorit
  payment_terms: string | null
  notes: string | null
  created_at: string
}

export default function SuppliersPage() {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    fiscal_number: "",
    balance: 0,
    payment_terms: "30 ditë",
    notes: ""
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  async function fetchSuppliers() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.warn("Suppliers warning:", error.message)
      } else {
        setSuppliers(data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSupplier(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error("Emri i furnitorit është i detyrueshëm")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Sesioni ka skaduar")
        return
      }

      const { error } = await supabase.from("suppliers").insert([
        {
          name: formData.name,
          contact_person: formData.contact_person || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          fiscal_number: formData.fiscal_number || null,
          balance: Number(formData.balance) || 0,
          payment_terms: formData.payment_terms || "30 ditë",
          notes: formData.notes || null,
          user_id: user.id
        }
      ])

      if (error) throw error

      toast.success("Furnitori u ruajt me sukses!")
      setIsModalOpen(false)
      setFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        fiscal_number: "",
        balance: 0,
        payment_terms: "30 ditë",
        notes: ""
      })
      fetchSuppliers()
    } catch (err: any) {
      toast.error(err.message || "Gabim gjatë ruajtjes së furnitorit")
    }
  }

  async function handleDeleteSupplier(id: number) {
    if (!confirm("A jeni të sigurt që dëshironi ta fshini këtë furnitor?")) return
    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id)
      if (error) throw error
      toast.success("Furnitori u fshi")
      fetchSuppliers()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact_person && s.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.fiscal_number && s.fiscal_number.includes(searchTerm))
  )

  const totalOwed = suppliers.reduce((acc, s) => acc + (Number(s.balance) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Furnitorët & Partnerët</h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Blerje Smart
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Menaxhoni të gjithë furnizuesit, kushtet e pagesës, afatet dhe bilancet e borxheve.
          </p>
        </div>

        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Shto Furnitor të Ri
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Furnitorë Aktivë</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-foreground">{suppliers.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Në rrjetin furnizues</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detyrimet Ndaj Furnitorëve</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-rose-500">€{totalOwed.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">Shuma totale për pagesë</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/30 to-purple-950/20 border border-indigo-800/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> AI OCR Lidhja
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Kur skanoni faturat me AI OCR te Blerjet, emrat e furnitorëve dhe numrat fiskalë lidhen automatikisht këtu!
            </p>
          </div>
          <div className="mt-2 text-[11px] font-medium text-indigo-400">Sinkronizim Automatik</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Kërko furnitor sipas emrit, personit kontaktues, numrit fiskal..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 bg-card/80 border-border rounded-xl"
        />
      </div>

      {/* Suppliers Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Duke ngarkuar furnitorët...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-semibold">Nuk u gjet asnjë furnitor</p>
            <p className="text-muted-foreground text-xs mt-1">Regjistroni furnitorët tuaj për të kontrolluar blerjet dhe faturat e pranuara.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Furnitori</th>
                  <th className="py-3.5 px-4">Personi Kontaktues</th>
                  <th className="py-3.5 px-4">Nr. Fiskal</th>
                  <th className="py-3.5 px-4">Kushtet e Pagesës</th>
                  <th className="py-3.5 px-4">Detyrimi (Borxhi)</th>
                  <th className="py-3.5 px-4 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div>{s.name}</div>
                      {s.phone && <div className="text-xs text-muted-foreground font-normal">{s.phone}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {s.contact_person || "—"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">{s.fiscal_number || "—"}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/60 border border-border">
                        {s.payment_terms || "30 ditë"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold">
                      <span className={Number(s.balance) > 0 ? "text-rose-500" : "text-muted-foreground"}>
                        €{Number(s.balance || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteSupplier(s.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                        title="Fshij"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold text-foreground">Regjistro Furnitor të Ri</h2>
            <p className="text-xs text-muted-foreground mt-1">Vendosni të dhënat e partnerit furnizues.</p>

            <form onSubmit={handleSaveSupplier} className="space-y-4 mt-5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Emri i Kompanisë / Furnitorit *</label>
                <Input 
                  required
                  placeholder="p.sh. ELKOS Group, Devolli Corp, Albi Sh.p.k"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Personi Kontaktues</label>
                  <Input 
                    placeholder="Emri Mbiemri"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Telefoni</label>
                  <Input 
                    placeholder="049 111 222"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Numri Fiskal</label>
                  <Input 
                    placeholder="600987654"
                    value={formData.fiscal_number}
                    onChange={(e) => setFormData({ ...formData, fiscal_number: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Kushtet e Pagesës</label>
                  <Input 
                    placeholder="p.sh. 15 ditë, 30 ditë, Me para në dorë"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Shuma e Detyrimit Aktual (€)</label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                  className="mt-1"
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
                  Ruaj Furnitorin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
