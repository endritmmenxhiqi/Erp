"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "@/components/language-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/spinner"
import { toast } from "sonner"
import { 
  Users, 
  UserPlus, 
  Clock, 
  ShieldCheck, 
  KeyRound, 
  TrendingUp, 
  Trash2, 
  Edit3, 
  Activity, 
  Calendar,
  Lock,
  CheckCircle2,
  XCircle,
  Briefcase
} from "lucide-react"
import { StaffService, Worker, WorkerShift } from "@/lib/services/staff"
import { createClient } from "@/utils/supabase/client"

export default function StaffManagementPage() {
  const { t } = useTranslation()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [activeShifts, setActiveShifts] = useState<WorkerShift[]>([])
  const [todaySales, setTodaySales] = useState<Record<string, { count: number; total: number; worker_name: string }>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [managerPin, setManagerPin] = useState("1234")
  const [newPin, setNewPin] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Worker Form State
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    password_hash: "",
    role: "seller" as "seller" | "commercialist" | "manager",
    shift_start_time: "",
    shift_end_time: "",
    work_days: "",
    is_active: true,
  })

  const supabase = createClient()

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [workersList, shifts, salesMap] = await Promise.all([
        StaffService.getWorkers(),
        StaffService.getActiveShifts(),
        StaffService.getTodaySalesPerWorker()
      ])
      setWorkers(workersList)
      setActiveShifts(shifts)
      setTodaySales(salesMap)

      const businessId = await StaffService.getEffectiveBusinessId(supabase)
      if (businessId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('manager_pin')
          .eq('id', businessId)
          .single()
        if (profile?.manager_pin) {
          setManagerPin(profile.manager_pin)
        }
      }
    } catch (err) {
      console.error("Error loading staff data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
    // Auto-refresh real-time data every 15 seconds
    const interval = setInterval(loadData, 15000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleOpenAddModal = () => {
    setEditingWorker(null)
    setFormData({
      first_name: "",
      last_name: "",
      username: "",
      password_hash: "",
      role: "seller",
      shift_start_time: "",
      shift_end_time: "",
      work_days: "",
      is_active: true,
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (worker: Worker) => {
    setEditingWorker(worker)
    setFormData({
      first_name: worker.first_name,
      last_name: worker.last_name,
      username: worker.username,
      password_hash: worker.password_hash || "",
      role: worker.role,
      shift_start_time: worker.shift_start_time || "",
      shift_end_time: worker.shift_end_time || "",
      work_days: worker.work_days || "",
      is_active: worker.is_active,
    })
    setIsModalOpen(true)
  }

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.username.trim() || !formData.password_hash.trim()) {
      toast.error("Ju lutem plotësoni emrin, mbiemrin, përdoruesin dhe fjalëkalimin.")
      return
    }

    setIsSaving(true)
    try {
      if (editingWorker) {
        await StaffService.updateWorker(editingWorker.id, formData)
        toast.success(t("worker_updated_success"))
      } else {
        await StaffService.createWorker(formData)
        toast.success(t("worker_created_success"))
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ruajtjes së punëtorit.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteWorker = async (id: number) => {
    if (!confirm("A jeni të sigurt që dëshironi ta fshini këtë punëtor?")) return
    try {
      await StaffService.deleteWorker(id)
      toast.success(t("worker_deleted_success"))
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë fshirjes.")
    }
  }

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPin.trim()) return
    setIsSaving(true)
    try {
      const businessId = await StaffService.getEffectiveBusinessId(supabase)
      if (businessId) {
        const { error } = await supabase
          .from('profiles')
          .update({ manager_pin: newPin.trim() })
          .eq('id', businessId)
        if (error) throw error
        setManagerPin(newPin.trim())
        toast.success("PIN-i i menaxherit / 2FA u përditësua me sukses!")
        setIsPinModalOpen(false)
        setNewPin("")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë përditësimit të PIN-it.")
    } finally {
      setIsSaving(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "seller":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">{t("role_seller")}</span>
      case "commercialist":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-500 border border-purple-500/20">{t("role_commercialist")}</span>
      case "manager":
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{t("role_manager")}</span>
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{role}</span>
    }
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-primary font-bold text-sm tracking-widest uppercase">
            <Users className="w-4 h-4" />
            <span>{t("staff_mgmt")}</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            {t("workers")}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl">
            Menaxhoni punëtorët, caktoni rolet (shitës, komercialist), oraret dhe monitoroni shitjet në kohë reale.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsPinModalOpen(true)}
            className="h-12 px-5 rounded-2xl border-border font-bold flex items-center shadow-sm"
          >
            <KeyRound className="w-4 h-4 mr-2 text-yellow-500" />
            PIN 2FA: {managerPin}
          </Button>
          <Button
            onClick={handleOpenAddModal}
            className="h-12 px-6 rounded-2xl primary-gradient text-white font-black text-md shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            {t("add_worker")}
          </Button>
        </div>
      </div>

      {/* Real-Time Live Monitoring Cards */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-primary font-black text-sm uppercase tracking-widest">
          <Activity className="w-4 h-4 animate-pulse text-emerald-500" />
          <span>{t("live_tracking")}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Active Shifts */}
          <Card className="glass border-border shadow-xl relative overflow-hidden">
            <div className="h-1 w-full bg-emerald-500" />
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="text-2xl font-black text-foreground">{activeShifts.length}</div>
              </div>
              <CardTitle className="text-lg font-bold mt-4">{t("active_shifts")}</CardTitle>
              <CardDescription>Punëtorët që janë aktualisht aktivë në ndërrim.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              {activeShifts.length > 0 ? (
                <div className="space-y-2.5 mt-2">
                  {activeShifts.map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-2.5 rounded-xl bg-accent/20 border border-border/50 text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-bold">{shift.worker?.first_name} {shift.worker?.last_name}</span>
                        <span className="text-muted-foreground text-[10px]">({shift.worker?.username})</span>
                      </div>
                      <span className="text-muted-foreground font-mono">
                        {new Date(shift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic py-2">
                  Asnjë punëtor nuk është në ndërrim aktiv aktualisht.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Today's Sales Live */}
          <Card className="glass border-border shadow-xl relative overflow-hidden">
            <div className="h-1 w-full bg-primary" />
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="text-2xl font-black text-primary">
                  {Object.values(todaySales).reduce((sum, item) => sum + item.total, 0).toFixed(2)} €
                </div>
              </div>
              <CardTitle className="text-lg font-bold mt-4">{t("sales_today_per_worker")}</CardTitle>
              <CardDescription>Shuma e përgjithshme e shitjeve live sot.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              {Object.keys(todaySales).length > 0 ? (
                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto pr-1">
                  {Object.entries(todaySales).map(([key, data]) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded-xl bg-accent/20 border border-border/50 text-xs">
                      <span className="font-bold truncate max-w-[120px]">{data.worker_name}</span>
                      <div className="text-right">
                        <span className="font-black text-primary">{data.total.toFixed(2)} €</span>
                        <span className="text-muted-foreground text-[10px] ml-1">({data.count} fatura)</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic py-2">
                  Ende nuk ka shitje të regjistruara sot.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Security & Fast Access */}
          <Card className="glass border-border shadow-xl relative overflow-hidden">
            <div className="h-1 w-full bg-yellow-500" />
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-sm font-black uppercase text-yellow-500">2FA AKTIV</div>
              </div>
              <CardTitle className="text-lg font-bold mt-4">{t("two_factor_auth")}</CardTitle>
              <CardDescription>Mbrojtje me PIN menaxheri për fshirjen e artikujve.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <p className="text-xs text-muted-foreground mb-3">
                Çdo fshirje e artikullit nga POS ose faturat e shitjes kërkon autorizim të menjëhershëm me PIN.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPinModalOpen(true)}
                className="w-full rounded-xl border-border text-xs font-bold"
              >
                Ndrysho PIN-in e Menaxherit
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Workers Directory Table */}
      <Card className="glass border-border shadow-2xl overflow-hidden">
        <CardHeader className="p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <Briefcase className="w-6 h-6 mr-3 text-primary" />
                Lista e Punëtorëve të Regjistruar
              </CardTitle>
              <CardDescription className="mt-1">
                Punëtorët që kanë qasje të kufizuar sipas rolit dhe orarit të tyre.
              </CardDescription>
            </div>
            <div className="px-4 py-2 rounded-xl bg-accent/20 border border-border text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {t("total")}: {workers.length}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner />
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Nuk keni shtuar ende asnjë punëtor</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Krijoni punëtorët e parë për t&apos;u mundësuar shitësve dhe komercialistëve të kyçen me llogaritë e tyre.
              </p>
              <Button onClick={handleOpenAddModal} className="primary-gradient font-bold rounded-xl">
                <UserPlus className="w-4 h-4 mr-2" />
                {t("add_worker")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-accent/10 border-y border-border">
                    <th className="h-12 px-6 text-left font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Punëtori</th>
                    <th className="h-12 px-6 text-left font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Username & Password</th>
                    <th className="h-12 px-6 text-left font-bold text-zinc-500 uppercase tracking-widest text-[10px]">{t("role")}</th>
                    <th className="h-12 px-6 text-left font-bold text-zinc-500 uppercase tracking-widest text-[10px]">{t("work_schedule")}</th>
                    <th className="h-12 px-6 text-center font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Statusi</th>
                    <th className="h-12 px-6 text-right font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Veprime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {workers.map((worker) => {
                    const isShiftActive = activeShifts.some(s => s.worker_id === worker.id)
                    return (
                      <tr key={worker.id} className="hover:bg-accent/5 transition-colors">
                        <td className="p-6 align-middle font-bold text-foreground">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                              {worker.first_name[0]}{worker.last_name[0]}
                            </div>
                            <div>
                              <div>{worker.first_name} {worker.last_name}</div>
                              <div className="text-[10px] font-normal text-muted-foreground flex items-center gap-1 mt-0.5">
                                {isShiftActive ? (
                                  <span className="text-emerald-500 flex items-center font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                                    {t("on_duty")}
                                  </span>
                                ) : (
                                  <span className="text-zinc-500">{t("off_duty")}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 align-middle">
                          <div className="font-mono text-xs text-foreground bg-accent/20 px-2.5 py-1 rounded-lg border border-border/50 w-fit">
                            @{worker.username}
                          </div>
                        </td>
                        <td className="p-6 align-middle">
                          {getRoleBadge(worker.role)}
                        </td>
                        <td className="p-6 align-middle text-xs text-muted-foreground">
                          {worker.shift_start_time || worker.shift_end_time || worker.work_days ? (
                            <div className="flex items-center space-x-1.5">
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                              <span>
                                {worker.shift_start_time || "--:--"} - {worker.shift_end_time || "--:--"}
                                {worker.work_days && ` (${worker.work_days})`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-500 italic">I papërcaktuar (Fleksibil)</span>
                          )}
                        </td>
                        <td className="p-6 align-middle text-center">
                          {worker.is_active ? (
                            <span className="inline-flex items-center text-xs font-bold text-emerald-500">
                              <CheckCircle2 className="w-4 h-4 mr-1" /> {t("active")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-bold text-muted-foreground">
                              <XCircle className="w-4 h-4 mr-1" /> {t("inactive")}
                            </span>
                          )}
                        </td>
                        <td className="p-6 align-middle text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditModal(worker)}
                              className="h-9 w-9 rounded-xl hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteWorker(worker.id)}
                              className="h-9 w-9 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Worker Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass border-border rounded-3xl max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveWorker} className="space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center">
                <UserPlus className="w-6 h-6 mr-3 text-primary" />
                {editingWorker ? "Ndrysho të Dhënat e Punëtorit" : t("add_worker")}
              </DialogTitle>
              <DialogDescription>
                Caktoni emrin, përdoruesin, fjalëkalimin dhe rolin e punëtorit në sistem.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground px-1">{t("first_name")} *</label>
                  <Input
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Psh. Agon"
                    className="h-11 bg-background/50 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground px-1">{t("last_name")} *</label>
                  <Input
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Psh. Krasniqi"
                    className="h-11 bg-background/50 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground px-1">{t("username")} *</label>
                  <Input
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="agon123"
                    className="h-11 bg-background/50 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground px-1">{t("password")} *</label>
                  <Input
                    required
                    type="text"
                    value={formData.password_hash}
                    onChange={(e) => setFormData({ ...formData, password_hash: e.target.value })}
                    placeholder="Fjalëkalimi i punëtorit"
                    className="h-11 bg-background/50 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground px-1">{t("role")} *</label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => {
                    if (val) setFormData({ ...formData, role: val })
                  }}
                >
                  <SelectTrigger className="h-11 bg-background/50 rounded-xl font-bold">
                    <SelectValue placeholder={t("role")} />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    <SelectItem value="seller" className="font-bold">
                      {t("role_seller")} — Qasje vetëm në POS & Shitje
                    </SelectItem>
                    <SelectItem value="commercialist" className="font-bold">
                      {t("role_commercialist")} — Qasje në Blerje & Fatura Hyrëse
                    </SelectItem>
                    <SelectItem value="manager" className="font-bold">
                      {t("role_manager")} — Qasje e Plotë Menaxheriale
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Work Schedule (Non-mandatory / Optional as explicitly requested) */}
              <div className="p-4 rounded-2xl bg-accent/20 border border-border/50 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{t("work_schedule")}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Orari nuk është i detyrueshëm. Mund ta lini të zbrazët nëse punëtori punon me orar fleksibil.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">{t("shift_start")}</label>
                    <Input
                      type="time"
                      value={formData.shift_start_time}
                      onChange={(e) => setFormData({ ...formData, shift_start_time: e.target.value })}
                      className="h-10 bg-background/50 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">{t("shift_end")}</label>
                    <Input
                      type="time"
                      value={formData.shift_end_time}
                      onChange={(e) => setFormData({ ...formData, shift_end_time: e.target.value })}
                      className="h-10 bg-background/50 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">{t("work_days")}</label>
                    <Input
                      value={formData.work_days}
                      onChange={(e) => setFormData({ ...formData, work_days: e.target.value })}
                      placeholder="Psh. Hën-Prem"
                      className="h-10 bg-background/50 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-background/30 border border-border">
                <div>
                  <div className="text-sm font-bold">Llogari Aktive</div>
                  <div className="text-xs text-muted-foreground">Lejo punëtorin të kyçet në sistem</div>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(val) => setFormData({ ...formData, is_active: val })}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border-border"
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="primary-gradient font-bold rounded-xl px-8"
              >
                {isSaving ? <Spinner className="mr-2" /> : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manager PIN Modal */}
      <Dialog open={isPinModalOpen} onOpenChange={setIsPinModalOpen}>
        <DialogContent className="glass border-border rounded-3xl max-w-md">
          <form onSubmit={handleSavePin} className="space-y-6">
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-black text-center">
                PIN-i i Menaxherit (2FA)
              </DialogTitle>
              <DialogDescription className="text-center text-xs">
                Ky PIN përdoret si autorizim me dy faktorë sa herë që fshihet një produkt nga fatura ose kryhen veprime kritike.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground block text-center">
                PIN-i Aktual: <span className="text-foreground font-mono">{managerPin}</span>
              </label>
              <Input
                type="password"
                maxLength={8}
                placeholder="Vendosni PIN-in e ri (Psh. 4567)"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="text-center font-mono tracking-widest text-xl h-12 bg-background/50 rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPinModalOpen(false)}
                className="rounded-xl border-border flex-1"
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !newPin.trim()}
                className="primary-gradient font-bold rounded-xl flex-1"
              >
                {isSaving ? <Spinner className="mr-2" /> : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
