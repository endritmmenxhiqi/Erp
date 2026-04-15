import React from "react"
import { LucideIcon, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  className?: string
}

export function EmptyState({ 
  title, 
  description, 
  icon: Icon = Search, 
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in zoom-in duration-500",
      className
    )}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 mb-4">
        <Icon className="h-10 w-10 text-primary opacity-40" />
      </div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-[280px]">
          {description}
        </p>
      )}
    </div>
  )
}
