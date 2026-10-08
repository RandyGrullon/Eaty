"use client";

import type { MainTab } from "@/lib/main-tab";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";
import { EatyLogo } from "@/components/app/eaty-logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { NAV_ITEMS } from "./nav-items";

interface SidebarNavProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

export function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6">
      <EatyLogo className="px-2" subtitle="Nutrición con IA" />

      <button
        type="button"
        onClick={() => onTabChange("scan")}
        className="mt-8 flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-left text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/15">
          <Camera className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Registrar comida</span>
          <span className="block text-xs opacity-80">Foto, texto o código</span>
        </span>
      </button>

      <nav aria-label="Navegación principal" className="mt-6 flex-1 space-y-1">
        {NAV_ITEMS.filter((t) => t.id !== "scan").map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", isActive && "text-primary")} strokeWidth={isActive ? 2.4 : 2} />
              {tab.label}
              {isActive ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center justify-between rounded-2xl border border-sidebar-border bg-card px-3 py-2.5">
        <div>
          <p className="text-xs font-semibold">Apariencia</p>
          <p className="text-[11px] text-muted-foreground">Claro u oscuro</p>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
