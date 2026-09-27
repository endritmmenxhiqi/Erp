"use client"

import React, { useState } from "react"
import { 
  Factory, 
  Plus, 
  Layers, 
  Scale, 
  Sparkles, 
  Boxes, 
  ArrowRight, 
  Trash2, 
  CheckCircle2, 
  Play 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Recipe {
  id: number
  recipe_name: string
  output_item: string
  output_quantity: number
  unit: string
  estimated_cost: number
  raw_materials: { name: string; quantity: number; unit: string }[]
}

const DEMO_RECIPES: Recipe[] = [
  {
    id: 1,
    recipe_name: "Bukë e Bardhë 500g",
    output_item: "Bukë e Bardhë",
    output_quantity: 100,
    unit: "copë",
    estimated_cost: 28.50,
    raw_materials: [
      { name: "Miell T-500", quantity: 35, unit: "kg" },
      { name: "Ujë", quantity: 20, unit: "litra" },
      { name: "Maja Buke", quantity: 1.2, unit: "kg" },
      { name: "Kripë", quantity: 0.8, unit: "kg" },
    ]
  },
  {
    id: 2,
    recipe_name: "Dritare Alumini 120x140",
    output_item: "Dritare Alumini Komplet",
    output_quantity: 1,
    unit: "copë",
    estimated_cost: 95.00,
    raw_materials: [
      { name: "Profil Alumini", quantity: 5.4, unit: "metra" },
      { name: "Xham Termopan 4+16+4", quantity: 1.68, unit: "m²" },
      { name: "Mekanizëm Hapës", quantity: 1, unit: "set" },
      { name: "Gomë Izoluese", quantity: 5.2, unit: "metra" },
    ]
  }
]

export default function ProductionPage() {
  const [recipes, setRecipes] = useState<Recipe[]>(DEMO_RECIPES)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    recipe_name: "",
    output_item: "",
    output_quantity: 1,
    unit: "copë",
    estimated_cost: 0,
    materialsText: "Miell (30 kg), Ujë (15 litra)"
  })

  function handleSaveRecipe(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.recipe_name || !formData.output_item) {
      toast.error("Emri i normativës dhe produkti final janë të detyrueshëm")
      return
    }

    const newR: Recipe = {
      id: Date.now(),
      recipe_name: formData.recipe_name,
      output_item: formData.output_item,
      output_quantity: Number(formData.output_quantity),
      unit: formData.unit,
      estimated_cost: Number(formData.estimated_cost),
      raw_materials: [
        { name: "Lëndë e parë bazë", quantity: 10, unit: "kg" }
      ]
    }

    setRecipes([newR, ...recipes])
    setIsModalOpen(false)
    toast.success("Normativa e prodhimit (BOM) u ruajt! 🏭")
  }

  function handleRunProduction(recipe: Recipe) {
    toast.success(`Urdhri i prodhimit për "${recipe.output_item}" u krye! Lënda e parë u zbrit automatikisht nga stoku. 📦✨`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Moduli Prodhim & Normativa</h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
              <Factory className="w-3.5 h-3.5" /> BOM & Fabrikim
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Definoni normativat e lëndës së parë, shpenzimet e prodhimit dhe llogaritjen e kostos për njësi.
          </p>
        </div>

        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Krijo Normativë të Re
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Receta / Normativa Aktive</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-foreground">{recipes.length}</div>
          <div className="text-xs text-purple-400 font-semibold mt-1">Gati për urdhër prodhimi</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Automatizim Stoku</div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-emerald-400">100%</div>
          <div className="text-xs text-muted-foreground mt-1">Lënda e parë zbret në kohë reale</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 to-indigo-950/20 border border-purple-800/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> AI Kosto & Mbetje
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              AI analizon mbetjet gjatë prerjes/prodhimit dhe optimizon normativën për 12% kursim lënde të parë!
            </p>
          </div>
          <span className="text-[11px] font-semibold text-purple-400 mt-2">Optimizim Prodhimi</span>
        </div>
      </div>

      {/* Recipes Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recipes.map((r) => (
          <div 
            key={r.id}
            className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-semibold text-xs border border-purple-500/30">
                  Normativë
                </span>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  Kosto e vlerësuar: €{r.estimated_cost.toFixed(2)}
                </span>
              </div>

              <h3 className="font-extrabold text-lg text-foreground">{r.recipe_name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prodhon: <b>{r.output_quantity} {r.unit}</b> nga artikulli <b>{r.output_item}</b>
              </p>

              {/* Raw Materials List */}
              <div className="mt-4 pt-3 border-t border-border/80">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Lënda e parë e nevojshme (BOM):
                </div>
                <div className="space-y-1.5">
                  {r.raw_materials.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-accent/30">
                      <span className="text-foreground font-medium">{m.name}</span>
                      <span className="font-mono font-bold text-primary">{m.quantity} {m.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/80 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Zbritje automatike e magazinës</span>
              <Button
                size="sm"
                onClick={() => handleRunProduction(r)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                Ekzekuto Prodhimin
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add Recipe */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold text-foreground">Krijo Normativë Prodhimi (BOM)</h2>
            <form onSubmit={handleSaveRecipe} className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Emri i Normativës *</label>
                <Input 
                  required
                  placeholder="p.sh. Receta Bukë Fshati ose Dritare Plastike"
                  value={formData.recipe_name}
                  onChange={(e) => setFormData({ ...formData, recipe_name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Produkti Final që Del nga Prodhimi *</label>
                <Input 
                  required
                  placeholder="Emri i produktit përfundimtar"
                  value={formData.output_item}
                  onChange={(e) => setFormData({ ...formData, output_item: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Sasia e Prodhimit</label>
                  <Input 
                    type="number"
                    value={formData.output_quantity}
                    onChange={(e) => setFormData({ ...formData, output_quantity: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Kostoja e Përafërt (€)</label>
                  <Input 
                    type="number"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Anulo</Button>
                <Button type="submit" className="bg-primary">Ruaj Normativën</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
