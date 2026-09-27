"use client"

import React, { useState } from "react"
import { 
  Building2, 
  Plus, 
  Calendar, 
  Bed, 
  Users, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Key, 
  DollarSign 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Room {
  id: number
  room_number: string
  room_type: string
  price_per_night: number
  capacity: number
  status: "E lire" | "E zene" | "Ne pastrim"
  guest_name?: string
}

const DEMO_ROOMS: Room[] = [
  { id: 101, room_number: "101", room_type: "Standard Single", price_per_night: 35, capacity: 1, status: "E lire" },
  { id: 102, room_number: "102", room_type: "Standard Double", price_per_night: 50, capacity: 2, status: "E zene", guest_name: "Artan Berisha" },
  { id: 103, room_number: "103", room_type: "Deluxe Twin", price_per_night: 65, capacity: 2, status: "E lire" },
  { id: 104, room_number: "104", room_type: "Deluxe Double", price_per_night: 65, capacity: 2, status: "Ne pastrim" },
  { id: 201, room_number: "201", room_type: "Presidential Suite", price_per_night: 130, capacity: 4, status: "E zene", guest_name: "Firma Exclusiv" },
  { id: 202, room_number: "202", room_type: "Junior Suite", price_per_night: 90, capacity: 3, status: "E lire" },
]

export default function HotelPage() {
  const [rooms, setRooms] = useState<Room[]>(DEMO_ROOMS)
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [guestName, setGuestName] = useState("")

  function handleCheckIn(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRoom || !guestName) return

    setRooms(rooms.map(r => r.id === selectedRoom.id ? { ...r, status: "E zene", guest_name: guestName } : r))
    setIsCheckInModalOpen(false)
    setGuestName("")
    toast.success(`Check-in i suksesshëm për Dhomën ${selectedRoom.room_number}! 🏨🔑`)
  }

  function handleCheckOut(room: Room) {
    if (!confirm(`A dëshironi të bëni Check-out për Dhomën ${room.room_number}?`)) return
    setRooms(rooms.map(r => r.id === room.id ? { ...r, status: "Ne pastrim", guest_name: undefined } : r))
    toast.info(`Dhoma ${room.room_number} u lirua dhe u shënua 'Në pastrim'.`)
  }

  function handleCleaned(room: Room) {
    setRooms(rooms.map(r => r.id === room.id ? { ...r, status: "E lire" } : r))
    toast.success(`Dhoma ${room.room_number} është e pastër dhe gati për mysafirë! ✨`)
  }

  const occupied = rooms.filter(r => r.status === "E zene").length
  const free = rooms.filter(r => r.status === "E lire").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Moduli Hotel & Akomodim</h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Dhomat & Check-in
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Menaxhoni disponueshmërinë e dhomave, statusin e pastrimit dhe faturimin e mysafirëve.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kapaciteti i Hotelit</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-foreground">{rooms.length} Dhoma</div>
          <div className="text-xs text-emerald-400 font-semibold mt-1">{free} dhoma të lira për sot</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shkalla e Zënies (Occupancy)</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-indigo-400">
            {((occupied / rooms.length) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">{occupied} dhoma aktive me mysafirë</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-purple-950/20 border border-indigo-800/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> AI Dynamic Room Pricing
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              AI sugjeron rritje të çmimit gjatë fundjavave apo ngjarjeve festive për të maksimizuar profitin!
            </p>
          </div>
          <span className="text-[11px] font-semibold text-indigo-400 mt-2">Optimizim i Të Hyrave</span>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => {
          const isOccupied = room.status === "E zene"
          const isCleaning = room.status === "Ne pastrim"

          return (
            <div
              key={room.id}
              className={`p-5 rounded-2xl border transition-all shadow-xs flex flex-col justify-between space-y-4 ${
                isOccupied 
                  ? "bg-indigo-950/20 border-indigo-600/40" 
                  : isCleaning 
                  ? "bg-amber-950/20 border-amber-600/40" 
                  : "bg-card border-border hover:border-primary/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center font-black text-primary">
                      {room.room_number}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground">{room.room_type}</div>
                      <div className="text-[11px] text-muted-foreground">{room.capacity} Persona</div>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isOccupied 
                      ? "bg-indigo-500/20 text-indigo-300" 
                      : isCleaning 
                      ? "bg-amber-500/20 text-amber-300" 
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {room.status}
                  </span>
                </div>

                {isOccupied && room.guest_name && (
                  <div className="p-3 rounded-xl bg-accent/40 border border-border/80 text-xs mt-3">
                    <span className="text-muted-foreground">Mysafiri:</span>
                    <div className="font-bold text-foreground mt-0.5">{room.guest_name}</div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/80 flex items-center justify-between">
                <div>
                  <div className="text-base font-black text-foreground">€{room.price_per_night}</div>
                  <div className="text-[10px] text-muted-foreground font-bold">/ Natë</div>
                </div>

                <div className="flex space-x-1.5">
                  {isOccupied ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckOut(room)}
                      className="text-xs h-8 border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                    >
                      Check-out
                    </Button>
                  ) : isCleaning ? (
                    <Button
                      size="sm"
                      onClick={() => handleCleaned(room)}
                      className="text-xs h-8 bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                    >
                      U pastrua
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedRoom(room)
                        setIsCheckInModalOpen(true)
                      }}
                      className="text-xs h-8 bg-primary hover:bg-primary/90"
                    >
                      <Key className="w-3.5 h-3.5 mr-1" />
                      Check-in
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Check In Modal */}
      {isCheckInModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold">Check-in: Dhoma {selectedRoom.room_number}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Plotësoni të dhënat e mysafirit për lëshimin e çelësit.</p>
            <form onSubmit={handleCheckIn} className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Emri i Mysafirit *</label>
                <Input 
                  required
                  placeholder="Emri Mbiemri"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-border mt-4">
                <Button type="button" variant="outline" onClick={() => setIsCheckInModalOpen(false)}>Anulo</Button>
                <Button type="submit" className="bg-primary">Regjistro Check-in</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
