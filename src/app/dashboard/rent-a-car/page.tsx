"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { 
  Car, 
  Plus, 
  Search, 
  Key, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Sparkles, 
  DollarSign, 
  Gauge
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Vehicle {
  id: number
  plate_number: string
  make_model: string
  year_manufacture: number
  daily_rate: number
  mileage: number
  status: "E lire" | "E dhene me qira" | "Ne servis"
  fuel_type: string
  transmission: string
}

interface Contract {
  id: number
  contract_number: string
  vehicle_id: number
  client_name: string
  client_phone: string
  start_date: string
  end_date: string
  total_price: number
  deposit: number
  status: "Aktive" | "E perfunduar" | "E anuluar"
}

const DEMO_VEHICLES: Vehicle[] = [
  { id: 1, plate_number: "01-123-AB", make_model: "VW Golf 8 R-Line", year_manufacture: 2023, daily_rate: 45, mileage: 34200, status: "E lire", fuel_type: "Dizel", transmission: "Automatik" },
  { id: 2, plate_number: "01-456-CD", make_model: "Mercedes-Benz C-Class", year_manufacture: 2022, daily_rate: 70, mileage: 48900, status: "E dhene me qira", fuel_type: "Dizel", transmission: "Automatik" },
  { id: 3, plate_number: "01-789-EF", make_model: "Audi A4 S-Line", year_manufacture: 2021, daily_rate: 60, mileage: 62000, status: "E lire", fuel_type: "Dizel", transmission: "Automatik" },
  { id: 4, plate_number: "01-321-GH", make_model: "BMW Seria 5 520d", year_manufacture: 2023, daily_rate: 85, mileage: 25100, status: "Ne servis", fuel_type: "Dizel", transmission: "Automatik" },
]

export default function RentACarPage() {
  const supabase = createClient()
  const [vehicles, setVehicles] = useState<Vehicle[]>(DEMO_VEHICLES)
  const [activeTab, setActiveTab] = useState<"fleet" | "contracts">("fleet")
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const [newVehicle, setNewVehicle] = useState({
    plate_number: "",
    make_model: "",
    year_manufacture: 2023,
    daily_rate: 50,
    mileage: 0,
    fuel_type: "Dizel",
    transmission: "Automatik"
  })

  const [newContract, setNewContract] = useState({
    contract_number: `RC-${Date.now().toString().slice(-6)}`,
    vehicle_id: DEMO_VEHICLES[0]?.id || 1,
    client_name: "",
    client_phone: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
    total_price: 150,
    deposit: 100
  })

  function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault()
    if (!newVehicle.plate_number || !newVehicle.make_model) {
      toast.error("Targa dhe Modeli janë të detyrueshme")
      return
    }

    const v: Vehicle = {
      id: Date.now(),
      plate_number: newVehicle.plate_number.toUpperCase(),
      make_model: newVehicle.make_model,
      year_manufacture: Number(newVehicle.year_manufacture),
      daily_rate: Number(newVehicle.daily_rate),
      mileage: Number(newVehicle.mileage),
      status: "E lire",
      fuel_type: newVehicle.fuel_type,
      transmission: newVehicle.transmission
    }

    setVehicles([v, ...vehicles])
    setIsVehicleModalOpen(false)
    toast.success("Vetura u shtua në flotë! 🚗")
  }

  function handleCreateContract(e: React.FormEvent) {
    e.preventDefault()
    if (!newContract.client_name) {
      toast.error("Emri i klientit është i detyrueshëm")
      return
    }

    // Set vehicle status to rented
    setVehicles(vehicles.map(v => v.id === newContract.vehicle_id ? { ...v, status: "E dhene me qira" } : v))
    setIsContractModalOpen(false)
    toast.success(`Kontrata ${newContract.contract_number} u regjistrua me sukses! 📑`)
  }

  const freeCount = vehicles.filter(v => v.status === "E lire").length
  const rentedCount = vehicles.filter(v => v.status === "E dhene me qira").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Moduli Rent-a-Car</h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center gap-1">
              <Car className="w-3.5 h-3.5" /> Flota & Qiraja
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Menaxhoni automjetet, kilometrazhën, kontratat e qirasë dhe kthimet e veturave.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => setIsContractModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            <Key className="w-4 h-4 mr-2" />
            Lësho me Qira
          </Button>
          <Button 
            onClick={() => setIsVehicleModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Shto Automjet
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flota Gjithsej</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-foreground">{vehicles.length} Veturë</div>
          <div className="text-xs text-emerald-400 font-semibold mt-1">{freeCount} gati për qira</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aktualisht me Qira</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-sky-400">{rentedCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Kontrata aktive në terren</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/40 to-blue-950/20 border border-sky-800/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-sky-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> AI Kthimi i Veturës
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Fotografo veturën para dhe pas kthimit për të detektuar automatikisht gërvishtjet dhe kilometrat!
            </p>
          </div>
          <span className="text-[11px] font-semibold text-sky-400 mt-2">AI Smart Inspection</span>
        </div>
      </div>

      {/* Fleet Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => {
          const isRented = v.status === "E dhene me qira"
          const inService = v.status === "Ne servis"

          return (
            <div 
              key={v.id}
              className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700 font-mono font-bold text-xs text-white tracking-widest">
                    {v.plate_number}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    isRented 
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                      : inService
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {v.status}
                  </span>
                </div>

                <h3 className="font-extrabold text-lg text-foreground">{v.make_model}</h3>
                <div className="text-xs text-muted-foreground mt-1 flex items-center space-x-3">
                  <span>Viti: {v.year_manufacture}</span>
                  <span>•</span>
                  <span>{v.fuel_type}</span>
                  <span>•</span>
                  <span>{v.transmission}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border/80 flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs text-muted-foreground font-mono">
                  <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{v.mileage.toLocaleString()} km</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-foreground">€{v.daily_rate}</div>
                  <div className="text-[10px] text-muted-foreground font-bold">/ Ditë</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Add Vehicle */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold text-foreground">Shto Automjet në Flotë</h2>
            <form onSubmit={handleAddVehicle} className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Targa e Automjetit *</label>
                <Input 
                  required
                  placeholder="01-123-AB"
                  value={newVehicle.plate_number}
                  onChange={(e) => setNewVehicle({ ...newVehicle, plate_number: e.target.value })}
                  className="mt-1 font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Prodhuesi & Modeli *</label>
                <Input 
                  required
                  placeholder="p.sh. VW Golf 8 R-Line ose Skoda Octavia"
                  value={newVehicle.make_model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, make_model: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Çmimi / Ditë (€)</label>
                  <Input 
                    type="number"
                    value={newVehicle.daily_rate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, daily_rate: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Kilometrazha Aktuale</label>
                  <Input 
                    type="number"
                    value={newVehicle.mileage}
                    onChange={(e) => setNewVehicle({ ...newVehicle, mileage: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-4">
                <Button type="button" variant="outline" onClick={() => setIsVehicleModalOpen(false)}>Anulo</Button>
                <Button type="submit" className="bg-primary">Ruaj Veturën</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal New Rental Contract */}
      {isContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold text-foreground">Krijo Kontratë Qiraje (Rent-a-Car)</h2>
            <form onSubmit={handleCreateContract} className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Zgjidh Automjetin</label>
                <select 
                  value={newContract.vehicle_id}
                  onChange={(e) => setNewContract({ ...newContract, vehicle_id: Number(e.target.value) })}
                  className="w-full mt-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  {vehicles.filter(v => v.status === "E lire").map(v => (
                    <option key={v.id} value={v.id} className="bg-card">
                      {v.plate_number} - {v.make_model} (€{v.daily_rate}/ditë)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Klienti (Emri Mbiemri) *</label>
                  <Input 
                    required
                    placeholder="Emri i klientit"
                    value={newContract.client_name}
                    onChange={(e) => setNewContract({ ...newContract, client_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Telefoni</label>
                  <Input 
                    placeholder="044 111 222"
                    value={newContract.client_phone}
                    onChange={(e) => setNewContract({ ...newContract, client_phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Nga Data</label>
                  <Input 
                    type="date"
                    value={newContract.start_date}
                    onChange={(e) => setNewContract({ ...newContract, start_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Deri më Datë</label>
                  <Input 
                    type="date"
                    value={newContract.end_date}
                    onChange={(e) => setNewContract({ ...newContract, end_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Totali (€)</label>
                  <Input 
                    type="number"
                    value={newContract.total_price}
                    onChange={(e) => setNewContract({ ...newContract, total_price: Number(e.target.value) })}
                    className="mt-1 font-bold text-base"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Depoziti / Garancioni (€)</label>
                  <Input 
                    type="number"
                    value={newContract.deposit}
                    onChange={(e) => setNewContract({ ...newContract, deposit: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-4">
                <Button type="button" variant="outline" onClick={() => setIsContractModalOpen(false)}>Anulo</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Lësho Kontratën</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
