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
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent sm:hidden">
      <nav className="mx-auto flex h-16 max-w-md items-center justify-around rounded-[24px] border border-border/40 bg-card/70 px-2 shadow-2xl shadow-black/5 backdrop-blur-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`group relative flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all duration-300 ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <div className="absolute inset-x-2 -top-1 h-1 rounded-full bg-primary/20 blur-[2px]" />
              )}
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
                isActive ? "bg-primary/10 scale-110 shadow-inner" : "group-hover:bg-accent/50"
              }`}>
                <Icon className={`h-5 w-5 ${isActive ? "fill-primary/10" : ""}`} />
              </div>
              <span className={`text-[10px] font-bold tracking-tight transition-all ${
                isActive ? "opacity-100 scale-100" : "opacity-70 scale-95"
              }`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
