"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
      <p className="mt-1.5 text-muted-foreground">{description}</p>
    </div>
  );
}

interface OptionCardProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  /** Clase del fondo del icono (p. ej. "bg-protein/12 text-protein"). */
  tone?: string;
  layout?: "row" | "tile";
  extra?: ReactNode;
}

/** Opción seleccionable del onboarding (radio visual accesible). */
export function OptionCard({
  icon: Icon,
  label,
  description,
  selected,
  onSelect,
  tone = "bg-primary/10 text-primary",
  layout = "row",
  extra,
}: OptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative w-full rounded-2xl border bg-card text-left transition-all",
        layout === "row" ? "flex items-center gap-4 p-4" : "flex flex-col items-center gap-2 p-4 text-center",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/40 hover:bg-muted/40"
      )}
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className={cn("min-w-0", layout === "row" && "flex-1")}>
        <span className="block font-semibold">{label}</span>
        {description ? <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span> : null}
        {extra}
      </span>
      {layout === "row" ? (
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
          )}
        >
          {selected ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
      ) : null}
    </button>
  );
}
