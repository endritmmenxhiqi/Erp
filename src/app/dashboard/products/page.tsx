"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "@/components/language-provider"
import { StockService } from "@/lib/services/stock"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/spinner"
import { Package, Search, Barcode, Tag, Save, CheckCircle2, RefreshCw, Wand2 } from "lucide-react"
import { EmptyState } from "@/components/EmptyState"
import { toast } from "sonner"

export default function ProductsPage() {
  const { t } = useTranslation()
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  // Generates a random EAN-13 style barcode
  const generateBarcode = (): string => {
    const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10))
    // EAN-13 checksum
    const checksum = (10 - (digits.reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10
    return [...digits, checksum].join('')
  }

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await StockService.getStock()
      setProducts(data)
    } catch (err) {
      console.error("Error fetching products:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleUpdate = async (id: any, barcode: string, selling_price: number) => {
    const idStr = String(id)
    setSavingId(idStr)
    try {
      await StockService.updateProduct(idStr, { barcode, selling_price })
      toast.success("Produkti u përditësua me sukses")
      setProducts(prev => prev.map(p => String(p.id) === idStr ? { ...p, barcode, selling_price } : p))
    } catch (err) {
      console.error("handleUpdate error:", err)
      toast.error("Gabim gjatë përditësimit")
    } finally {
      setSavingId(null)
    }
  }

  const handleGenerateBarcode = async (id: any) => {
    const idStr = String(id)
    setGeneratingId(idStr)
    try {
      const newBarcode = generateBarcode()
      await StockService.updateProduct(idStr, { barcode: newBarcode })
      setProducts(prev => prev.map(p => String(p.id) === idStr ? { ...p, barcode: newBarcode } : p))
      toast.success(`Barkodi u gjenerua: ${newBarcode}`)
    } catch (err) {
      console.error("handleGenerateBarcode error:", err)
      toast.error("Gabim gjatë gjenerimit të barkodit")
    } finally {
      setGeneratingId(null)
    }
  }

  const handleLocalChange = (id: string, field: string, value: any) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const filteredProducts = products.filter(product => 
    product.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchQuery))
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{t("products")}</h2>
          <p className="text-muted-foreground">Menaxhoni çmimet dhe barkodet e artikujve tuaj</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Kërko me emër ose barkod..." 
          className="h-12 pl-10 glass border-border shadow-sm max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Card className="glass border-border shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Package className="w-5 h-5 mr-2 text-primary" />
            Lista e Artikujve
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border bg-muted/30">
                    <TableHead className="w-[30%]">{t("item_name")}</TableHead>
                    <TableHead className="w-[25%]">Barkodi</TableHead>
                    <TableHead className="w-[20%]">Çmimi i Shitjes (EUR)</TableHead>
                    <TableHead className="w-[15%] text-right">Gjendja</TableHead>
                    <TableHead className="w-[10%] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} className="border-border hover:bg-primary/5 transition-colors">
                      <TableCell className="font-bold text-foreground">
                        <div className="flex items-center">
                          <Package className="w-4 h-4 mr-2 text-muted-foreground opacity-50" />
                          {product.item_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Barcode className="w-4 h-4 text-primary opacity-70 shrink-0" />
                          <div className="flex items-center gap-1 flex-1">
                            <Input 
                              value={product.barcode || ""} 
                              onChange={(e) => handleLocalChange(product.id, "barcode", e.target.value)}
                              className="h-9 bg-background/50 border-border/50 focus:border-primary font-mono text-sm"
                              placeholder="—"
                              readOnly={false}
                            />
                            <button
                              type="button"
                              title="Gjeneroni barkod automatikisht"
                              onClick={() => handleGenerateBarcode(product.id)}
                              disabled={generatingId === product.id}
                              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/15 text-primary transition-colors disabled:opacity-50"
                            >
                              {generatingId === product.id
                                ? <RefreshCw className="h-4 w-4 animate-spin" />
                                : <Wand2 className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Tag className="w-4 h-4 mr-2 text-primary opacity-70" />
                          <Input 
                            type="number"
                            step="0.01"
                            value={product.selling_price || ""} 
                            onChange={(e) => handleLocalChange(product.id, "selling_price", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            className="h-9 bg-background/50 border-border/50 focus:border-primary font-bold text-primary"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-black ${Number(product.quantity) <= 0 ? 'text-destructive' : 'text-foreground'}`}>
                          {product.quantity}
                        </span>
                        <span className="ml-1 text-[10px] uppercase font-bold text-muted-foreground">
                          {product.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9 text-primary hover:bg-primary/10"
                          onClick={() => handleUpdate(product.id, product.barcode, product.selling_price)}
                          disabled={savingId === product.id}
                        >
                          {savingId === product.id ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState 
              title="S'u gjet asnjë produkt" 
              description={searchQuery ? "Nuk ka rezultate për këtë kërkim." : "Ju nuk keni regjistruar asnjë produkt në stok ende."}
              icon={Package}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
