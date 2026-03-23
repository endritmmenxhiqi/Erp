"use client"

import * as React from "react"
import { Languages } from "lucide-react"
import { useTranslation } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageToggle() {
  const { language, setLanguage } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all" />}>
        <Languages className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle language</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass border-border">
        <DropdownMenuItem onClick={() => setLanguage("sq")} className="cursor-pointer hover:bg-primary/10 flex items-center justify-between">
          Shqip
          {language === "sq" && <div className="w-1.5 h-1.5 rounded-full bg-primary ml-2" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer hover:bg-primary/10 flex items-center justify-between">
          English
          {language === "en" && <div className="w-1.5 h-1.5 rounded-full bg-primary ml-2" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
