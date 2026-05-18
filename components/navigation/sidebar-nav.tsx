"use client"

import { Button } from "@/components/ui/button"
import type { MainTab } from "@/lib/main-tab"
import { Home, Camera, History, User, CalendarDays } from "lucide-react"

interface SidebarNavProps {
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
}

export function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  const tabs = [
    { id: "home" as const, icon: Home, label: "Inicio" },
    { id: "planning" as const, icon: CalendarDays, label: "Planificador" },
    { id: "scan" as const, icon: Camera, label: "Escanear" },
    { id: "history" as const, icon: History, label: "Historial" },
    { id: "profile" as const, icon: User, label: "Perfil" },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border/40 bg-card/30 backdrop-blur-xl p-6 transition-all">
      <div className="flex flex-col h-full">
        <div className="mb-10 px-2">
          <h1 className="text-2xl font-black tracking-tight text-primary flex items-center gap-2">
            <span className="bg-primary text-primary-foreground rounded-lg p-1.5 leading-none">E</span>
            Eaty
          </h1>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1 ml-1">Nutrición Inteligente</p>
        </div>
        
        <nav className="space-y-1.5 flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full group flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground hover:translate-x-1"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-border/40">
          <div className="px-2 py-4 bg-accent/50 rounded-2xl border border-border/40">
            <p className="text-[11px] font-bold text-primary uppercase tracking-tight mb-1">Eaty Pro</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Accede a análisis ilimitados y recetas personalizadas.</p>
          </div>
        </div>
      </div>
    </aside>
  )
}