"use client"

import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"

interface WalletButtonProps {
  onClick: () => void
}

export function WalletButton({ onClick }: WalletButtonProps) {
  return (
    <Button onClick={onClick} className="w-full">
      <Wallet className="mr-2 h-4 w-4" />
      Connect Wallet
    </Button>
  )
}
