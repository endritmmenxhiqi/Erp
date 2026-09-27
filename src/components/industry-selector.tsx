"use client"

import React, { useState } from "react"
import { useBusinessMode, INDUSTRIES, BusinessType } from "./business-mode-provider"
import { ChevronDown, Check, Sparkles, Building2 } from "lucide-react"

export function IndustrySelector() {
  const { businessType, setBusinessType, currentIndustry } = useBusinessMode()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-card border border-border hover:border-primary/50 text-xs font-semibold shadow-xs transition-all"
        title="Zgjidh Profilin e Biznesit"
      >
        <span className="text-base">{currentIndustry.icon}</span>
        <div className="text-left hidden sm:block">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider leading-none">
            Lloji i Biznesit
          </div>
          <div className="text-foreground font-bold mt-0.5">{currentIndustry.name}</div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-card border border-border p-2 shadow-2xl z-50 animate-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-border/80 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary" /> Zgjidh Industrinë tënde
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Menutë dhe veglat do të filtrohen vetëm për biznesin tënd.
              </p>
            </div>

            <div className="space-y-1 max-h-80 overflow-y-auto">
              {INDUSTRIES.map((ind) => {
                const isSelected = ind.id === businessType
                return (
                  <button
                    key={ind.id}
                    onClick={() => {
                      setBusinessType(ind.id)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group ${
                      isSelected 
                        ? "bg-primary/15 text-primary font-bold" 
                        : "hover:bg-accent/60 text-foreground"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="text-lg">{ind.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs truncate">{ind.name}</div>
                        <div className="text-[10px] text-muted-foreground font-normal truncate">
                          {ind.description}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
