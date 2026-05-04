"use client"

import { Button } from "@/components/ui/button"
import type { MainTab } from "@/lib/main-tab"
import { Home, Camera, History, User } from "lucide-react"

interface BottomNavProps {
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "home" as const, icon: Home, label: "Inicio" },
    { id: "scan" as const, icon: Camera, label: "Escanear" },
    { id: "history" as const, icon: History, label: "Historial" },
    { id: "profile" as const, icon: User, label: "Perfil" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="flex justify-around gap-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => onTabChange(tab.id)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 h-auto py-2 px-1 ${
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                <span className="max-w-full truncate text-[10px] sm:text-xs">{tab.label}</span>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
