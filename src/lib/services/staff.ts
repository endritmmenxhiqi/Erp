import { createClient } from "@/utils/supabase/client"

export interface Worker {
  id: number
  business_id: string
  first_name: string
  last_name: string
  username: string
  password_hash: string
  role: 'seller' | 'commercialist' | 'manager'
  shift_start_time?: string
  shift_end_time?: string
  work_days?: string
  is_active: boolean
  created_at?: string
}

export interface WorkerShift {
  id: number
  worker_id: number
  business_id: string
  clock_in: string
  clock_out?: string | null
  total_sales: number
  is_active: boolean
  worker?: Worker
}

export const StaffService = {
  getEffectiveBusinessId: async (supabaseClient?: any): Promise<string | null> => {
    const supabase = supabaseClient || createClient()
    if (typeof window !== "undefined") {
      const impersonatedId = sessionStorage.getItem("impersonated_business_id") || localStorage.getItem("impersonated_business_id")
      if (impersonatedId) return impersonatedId
    }
    const { data: { user } } = await supabase.auth.getUser()
    return user ? user.id : null
  },

  getCurrentWorker: (): Worker | null => {
    if (typeof window === "undefined") return null
    const stored = localStorage.getItem("current_worker_session")
    if (!stored) return null
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  },

  setCurrentWorker: (worker: Worker | null) => {
    if (typeof window === "undefined") return
    if (worker) {
      localStorage.setItem("current_worker_session", JSON.stringify(worker))
    } else {
      localStorage.removeItem("current_worker_session")
    }
  },

  getWorkers: async (): Promise<Worker[]> => {
    const supabase = createClient()
    const businessId = await StaffService.getEffectiveBusinessId(supabase)
    if (!businessId) return []

    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn("Workers table query returned error (table might be newly created):", error.message)
      return []
    }
    return data || []
  },

  createWorker: async (workerData: Omit<Worker, 'id' | 'business_id' | 'created_at'>): Promise<Worker | null> => {
    const supabase = createClient()
    const businessId = await StaffService.getEffectiveBusinessId(supabase)
    if (!businessId) throw new Error("Nuk keni sesion aktiv të biznesit.")

    const { data, error } = await supabase
      .from('workers')
      .insert({
        ...workerData,
        business_id: businessId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateWorker: async (id: number, updates: Partial<Worker>): Promise<Worker | null> => {
    const supabase = createClient()
    const businessId = await StaffService.getEffectiveBusinessId(supabase)
    if (!businessId) throw new Error("Nuk keni sesion aktiv të biznesit.")

    const { data, error } = await supabase
      .from('workers')
      .update(updates)
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  deleteWorker: async (id: number): Promise<void> => {
    const supabase = createClient()
    const businessId = await StaffService.getEffectiveBusinessId(supabase)
    if (!businessId) throw new Error("Nuk keni sesion aktiv të biznesit.")

    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId)

    if (error) throw error
  },

  workerLogin: async (usernameOrName: string, password: string): Promise<{ worker: Worker; businessEmail?: string } | null> => {
    const res = await fetch("/api/auth/worker-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameOrName.trim(),
        password: password.trim(),
      }),
    })

    const result = await res.json()

    if (!res.ok || !result.worker) {
      throw new Error(result.error || "Përdoruesi ose fjalëkalimi është i pasaktë.")
    }

    return {
      worker: result.worker,
      businessEmail: result.businessEmail,
    }
  },

  clockIn: async (workerId: number): Promise<WorkerShift | null> => {
    const supabase = createClient()
    const businessId = await StaffService.getEffectiveBusinessId(supabase)
    if (!businessId) throw new Error("Sesioni skadoi.")

    // Check if there is already an active shift
    const { data: existing } = await supabase
      .from('worker_shifts')
      .select('*')
      .eq('worker_id', workerId)
      .eq('is_active', true)
      .single()

    if (existing) {
      return existing
    }

    const { data, error } = await supabase
      .from('worker_shifts')
      .insert({
        worker_id: workerId,
        business_id: businessId,
        clock_in: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  clockOut: async (shiftId: number): Promise<void> => {
    const supabase = createClient()
    const { error } = await supabase
      .from('worker_shifts')
      .update({
        clock_out: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', shiftId)

    if (error) throw error
  },

  getActiveShifts: async (): Promise<WorkerShift[]> => {
    const supabase = createClient()
    const businessId = await StaffService.getEffectiveBusinessId(supabase)
    if (!businessId) return []

    const { data, error } = await supabase
      .from('worker_shifts')
      .select('*, worker:workers(*)')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('clock_in', { ascending: false })

    if (error) return []
    return data || []
  },

  getTodaySalesPerWorker: async (): Promise<Record<string, { count: number; total: number; worker_name: string }>> => {
    const supabase = createClient()
    const businessId = await StaffService.getEffectiveBusinessId(supabase)
    if (!businessId) return {}

    const todayStr = new Date().toISOString().split('T')[0]
    const { data: sales, error } = await supabase
      .from('sales')
      .select('total_amount, worker_id, worker_name')
      .eq('user_id', businessId)
      .gte('date', `${todayStr}T00:00:00`)
      .lte('date', `${todayStr}T23:59:59`)

    if (error || !sales) return {}

    const result: Record<string, { count: number; total: number; worker_name: string }> = {}

    sales.forEach((s: any) => {
      const key = s.worker_id ? String(s.worker_id) : 'admin_direct'
      const name = s.worker_name || 'Admin / Pa caktuar'
      if (!result[key]) {
        result[key] = { count: 0, total: 0, worker_name: name }
      }
      result[key].count += 1
      result[key].total += Number(s.total_amount) || 0
    })

    return result
  },

  verifyManagerPin: async (inputPin: string): Promise<boolean> => {
    const supabase = createClient()
    const businessId = await StaffService.getEffectiveBusinessId(supabase)
    if (!businessId) return false

    // Try to fetch profile manager_pin
    const { data } = await supabase
      .from('profiles')
      .select('manager_pin')
      .eq('id', businessId)
      .single()

    const correctPin = data?.manager_pin || '1234'
    return inputPin.trim() === correctPin.trim()
  }
}
