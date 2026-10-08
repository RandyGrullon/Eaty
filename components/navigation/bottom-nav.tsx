"use client";

import type { MainTab } from "@/lib/main-tab";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";

interface BottomNavProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

/** Ajustes vive dentro de Perfil en móvil: se marca Perfil como activo. */
const MOBILE_ITEMS = NAV_ITEMS.filter((t) => t.id !== "settings");

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const current = activeTab === "settings" ? "profile" : activeTab;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-6 bg-gradient-to-t from-background via-background/80 to-transparent md:hidden">
      <nav
        aria-label="Navegación principal"
        className="pointer-events-auto mx-auto flex h-[68px] max-w-md items-center justify-between rounded-[28px] border border-border bg-card/90 px-2 shadow-[var(--shadow-soft)] backdrop-blur-xl"
      >
        {MOBILE_ITEMS.map((tab) => {
          const Icon = tab.icon;
          const isActive = current === tab.id;

          if (tab.id === "scan") {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange("scan")}
                aria-label="Escanear comida"
                aria-current={isActive ? "page" : undefined}
                className="relative -mt-7 flex flex-col items-center gap-1"
              >
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95",
                    isActive && "scale-105"
                  )}
                >
                  <Camera className="h-6 w-6" />
                </span>
                <span className={cn("text-[11px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                  Escanear
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                  isActive && "bg-primary/12"
                )}
              >
                <Icon className="h-[20px] w-[20px]" strokeWidth={isActive ? 2.4 : 2} />
              </span>
              <span className={cn("text-[11px]", isActive ? "font-semibold" : "font-medium")}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
