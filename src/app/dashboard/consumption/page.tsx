"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "@/components/language-provider"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { AlertCircle, AlertTriangle, Minus, Package, Search } from "lucide-react"
import { Spinner } from "@/components/spinner"

export default function ConsumptionPage() {
  const { t } = useTranslation()
  const [stock, setStock] = useState<Array<{ id: number; item_name: string; quantity: number; unit: string }>>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pageError, setPageError] = useState("")
  const [consumingItems, setConsumingItems] = useState<{ [key: number]: number }>({})
  const [activeItemId, setActiveItemId] = useState<number | null>(null)
  const supabase = createClient()

  const fetchStock = useCallback(async () => {
    setLoading(true)
    setPageError("")

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("Sesioni ka skaduar. Ju lutem hyni perseri.")
      }

      const { data, error } = await supabase.from("stock").select("*").order("item_name", { ascending: true })
      if (error) throw error

      setStock(data || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nuk u arrit te ngarkohej stoku."
      setPageError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchStock()
  }, [fetchStock])

  async function handleConsume(itemId: number, currentQty: number, itemName: string) {
    if (activeItemId === itemId) return

    const amount = consumingItems[itemId] || 0
    if (amount <= 0) {
      toast.error("Specifikoni nje sasi te vlefshme per harxhim.")
      return
    }

    if (amount > currentQty) {
      toast.warning(`Po harxhoni me shume se sa keni ne stok per ${itemName}. Stoku do te ndalet ne zero.`)
    }

    setActiveItemId(itemId)
    try {
      const newQty = Math.max(0, Number(currentQty) - Number(amount))
      const { error } = await supabase.from("stock").update({ quantity: newQty }).eq("id", itemId)

      if (error) throw error

      toast.success(`${amount} ${itemName} u zbriten nga stoku.`)
      setConsumingItems((prev) => ({ ...prev, [itemId]: 0 }))
      await fetchStock()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gabim gjate perditesimit te stokut.")
    } finally {
      setActiveItemId(null)
    }
  }

  const filteredStock = stock.filter((item) => item.item_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{t("consumption")}</h2>
        <p className="text-muted-foreground">Zbritni materialet e harxhuara per te mbajtur stokun real.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        <div className="space-y-6 lg:col-span-1">
          <Card className="glass border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Kerko</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Emri i artikullit..." className="h-11 bg-background/50 pl-10" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20 bg-primary/5 shadow-lg">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center text-primary">
                <AlertTriangle className="mr-2 h-5 w-5" />
                <span className="font-bold">Keshille</span>
              </div>
              <p className="text-xs leading-relaxed">Perdoreni kete modul vetem per harxhimin e brendshem qe nuk lidhet direkt me nje fature shitjeje.</p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="glass min-h-[400px] border-border shadow-xl">
            <CardHeader className="mb-4 border-b border-border">
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5 text-primary" />
                Statusi i Stokut
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <Spinner />
                </div>
              ) : pageError ? (
                <div className="flex h-64 flex-col items-center justify-center space-y-4 text-center">
                  <AlertCircle className="h-12 w-12 text-destructive/70" />
                  <p className="max-w-md text-sm text-muted-foreground">{pageError}</p>
                  <Button type="button" variant="outline" onClick={() => void fetchStock()}>
                    Provo perseri
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredStock.map((item) => (
                    <div key={item.id} className="glass-card group flex items-center justify-between rounded-2xl p-4 !border-border transition-all hover:border-primary/30">
                      <div className="space-y-1">
                        <h3 className="font-bold text-foreground">{item.item_name}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${item.quantity > 5 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="0"
                          className="h-9 w-20 bg-background/50 text-center font-bold"
                          placeholder="Sasia"
                          value={consumingItems[item.id] || ""}
                          onChange={(event) => setConsumingItems((prev) => ({ ...prev, [item.id]: Number(event.target.value) }))}
                        />
                        <Button
                          size="icon"
                          className="h-9 w-9 rounded-lg bg-destructive text-white shadow-lg hover:bg-destructive/90 hover:shadow-destructive/20"
                          disabled={activeItemId === item.id}
                          onClick={() => void handleConsume(item.id, item.quantity, item.item_name)}
                        >
                          {activeItemId === item.id ? <Spinner /> : <Minus className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && !pageError && filteredStock.length === 0 && (
                <div className="flex h-64 flex-col items-center justify-center space-y-4 text-muted-foreground">
                  <Search className="h-12 w-12 opacity-20" />
                  <p>Nuk u gjet asnje artikull ne stok.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
