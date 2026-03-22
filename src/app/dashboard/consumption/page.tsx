"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/components/language-provider"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Hammer, Search, Minus, Package, AlertCircle } from "lucide-react"
import { Spinner } from "@/components/spinner"

export default function ConsumptionPage() {
  const { t } = useTranslation()
  const [stock, setStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [consumingItems, setConsumingItems] = useState<{[key: number]: number}>({})
  const supabase = createClient()

  useEffect(() => {
    fetchStock()
  }, [])

  async function fetchStock() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('stock')
      .select('*')
      .order('item_name', { ascending: true })

    if (data) setStock(data)
    setLoading(false)
  }

  async function handleConsume(itemId: number, currentQty: number, itemName: string) {
    const amount = consumingItems[itemId] || 0
    if (amount <= 0) {
      toast.error("Specifikoni një sasi të vlefshme për harxhim")
      return
    }

    if (amount > currentQty) {
       toast.warning(`Vërejtje: Po harxhoni më shumë se sa keni në stok për ${itemName}`)
    }

    try {
      const newQty = Number(currentQty) - Number(amount)
      const { error } = await supabase
        .from('stock')
        .update({ quantity: newQty < 0 ? 0 : newQty })
        .eq('id', itemId)

      if (error) throw error
      
      toast.success(`${amount} ${itemName} u zbritën nga stoku`)
      setConsumingItems(prev => ({ ...prev, [itemId]: 0 }))
      fetchStock()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const filteredStock = stock.filter(item => 
    item.item_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{t("consumption")}</h2>
        <p className="text-muted-foreground">Zbritni materialet e harxhuara (ngjyrë, llak, etj.) për të mbajtur stokun real</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Search & Info */}
        <div className="lg:col-span-1 space-y-6">
           <Card className="glass border-border shadow-lg">
              <CardHeader>
                 <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Kërko</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                       placeholder="Emri i artikullit..." 
                       className="pl-10 h-11 bg-background/50"
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                    />
                 </div>
              </CardContent>
           </Card>

           <Card className="glass border-primary/20 bg-primary/5 shadow-lg">
              <CardContent className="pt-6 space-y-4">
                 <div className="flex items-center text-primary">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span className="font-bold">Këshillë</span>
                 </div>
                 <p className="text-xs leading-relaxed">
                    Përdorni këtë modul vetëm për harxhimin e brendshëm që nuk lidhet direkt me një faturë shitjeje.
                 </p>
              </CardContent>
           </Card>
        </div>

        {/* Stock List */}
        <div className="lg:col-span-3">
           <Card className="glass border-border shadow-xl min-h-[400px]">
              <CardHeader className="border-b border-border mb-4">
                 <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2 text-primary" />
                    Statusi i Stokut
                 </CardTitle>
              </CardHeader>
              <CardContent>
                 {loading ? (
                    <div className="flex items-center justify-center h-64">
                       <Spinner />
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {filteredStock.map((item) => (
                          <div key={item.id} className="p-4 rounded-2xl glass-card !border-border flex items-center justify-between group hover:border-primary/30 transition-all">
                             <div className="space-y-1">
                                <h3 className="font-bold text-foreground">{item.item_name}</h3>
                                <div className="flex items-center space-x-2">
                                   <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.quantity > 5 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                      {item.quantity} {item.unit}
                                   </span>
                                </div>
                             </div>
                             
                             <div className="flex items-center space-x-2">
                                <Input 
                                   type="number" 
                                   className="w-20 h-9 bg-background/50 text-center font-bold"
                                   placeholder="Sasia"
                                   value={consumingItems[item.id] || ""}
                                   onChange={(e) => setConsumingItems(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                                />
                                <Button 
                                   size="icon" 
                                   className="h-9 w-9 bg-destructive hover:bg-destructive/90 text-white rounded-lg shadow-lg hover:shadow-destructive/20"
                                   onClick={() => handleConsume(item.id, item.quantity, item.item_name)}
                                >
                                   <Minus className="w-4 h-4" />
                                </Button>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}

                 {!loading && filteredStock.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
                       <Search className="w-12 h-12 opacity-20" />
                       <p>Nuk u gjet asnjë artikull në stok</p>
                    </div>
                 )}
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}
