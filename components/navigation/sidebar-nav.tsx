"use client"

import { Button } from "@/components/ui/button"
import { Home, Camera, History, User } from "lucide-react"

interface SidebarNavProps {
  activeTab: "home" | "scan" | "history" | "profile"
  onTabChange: (tab: "home" | "scan" | "history" | "profile") => void
}

export function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  const tabs = [
    { id: "home" as const, icon: Home, label: "Inicio" },
    { id: "scan" as const, icon: Camera, label: "Escanear" },
    { id: "history" as const, icon: History, label: "Historial" },
    { id: "profile" as const, icon: User, label: "Perfil" },
  ]

  return (
    <div className="w-64 bg-background border-r border-border h-screen fixed left-0 top-0 p-4">
      <div className="space-y-2">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-primary">Eaty</h1>
        </div>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "ghost"}
              size="lg"
              onClick={() => onTabChange(tab.id)}
              className={`w-full justify-start gap-3 ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}