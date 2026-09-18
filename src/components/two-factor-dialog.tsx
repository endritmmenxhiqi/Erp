"use client"

import { useState } from "react"
import { useTranslation } from "@/components/language-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShieldAlert, KeyRound } from "lucide-react"
import { StaffService } from "@/lib/services/staff"
import { toast } from "sonner"
import { Spinner } from "@/components/spinner"

interface TwoFactorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  onSuccess: () => void
}

export function TwoFactorDialog({
  open,
  onOpenChange,
  title,
  description,
  onSuccess,
}: TwoFactorDialogProps) {
  const { t } = useTranslation()
  const [pin, setPin] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!pin.trim()) {
      setError(true)
      return
    }

    setIsLoading(true)
    setError(false)
    try {
      const isValid = await StaffService.verifyManagerPin(pin)
      if (isValid) {
        toast.success(t("two_step_verified"))
        setPin("")
        onOpenChange(false)
        onSuccess()
      } else {
        setError(true)
        toast.error(t("incorrect_pin"))
      }
    } catch {
      setError(true)
      toast.error(t("incorrect_pin"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border rounded-3xl max-w-md">
        <form onSubmit={handleVerify} className="space-y-6">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-2">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black text-center text-foreground">
              {title || t("manager_pin_required")}
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              {description || t("enter_manager_pin")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                maxLength={8}
                autoFocus
                placeholder="PIN (Psh. 1234)"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value)
                  setError(false)
                }}
                className={`pl-10 text-center font-mono tracking-widest text-xl h-12 bg-background/50 rounded-xl ${
                  error ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
            </div>
            {error && (
              <p className="text-xs text-destructive text-center font-bold">
                {t("incorrect_pin")}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPin("")
                setError(false)
                onOpenChange(false)
              }}
              className="rounded-xl border-border flex-1"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !pin.trim()}
              className="primary-gradient font-bold rounded-xl flex-1"
            >
              {isLoading ? <Spinner className="mr-2" /> : t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
