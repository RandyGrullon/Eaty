"use client"

import { Button } from "@/components/ui/button"
import { Home, Camera, History, User } from "lucide-react"

interface BottomNavProps {
  activeTab: "home" | "scan" | "history" | "profile"
  onTabChange: (tab: "home" | "scan" | "history" | "profile") => void
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
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{tab.label}</span>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
