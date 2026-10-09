"use client";

import { useMemo, useState } from "react";
import { Beef, Carrot, Check, Droplet, Plus, Search, Wheat, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  INGREDIENT_CATALOG,
  INGREDIENT_CATEGORY_LABEL,
  makeCustomIngredient,
  type AllowedIngredient,
  type IngredientCategory,
} from "@/lib/diet-builder";

const CATEGORIES: { id: IngredientCategory; icon: typeof Beef; tone: string }[] = [
  { id: "protein", icon: Beef, tone: "text-protein" },
  { id: "vegetable", icon: Carrot, tone: "text-primary" },
  { id: "fat", icon: Droplet, tone: "text-fat" },
  { id: "carb", icon: Wheat, tone: "text-carbs" },
];

interface IngredientPickerProps {
  selected: AllowedIngredient[];
  onChange: (next: AllowedIngredient[]) => void;
}

/** Selector de alimentos permitidos: búsqueda, filtro por categoría y alimentos propios. */
export function IngredientPicker({ selected, onChange }: IngredientPickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IngredientCategory | "all">("all");
  const [customOpen, setCustomOpen] = useState(false);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);
  const customs = selected.filter((s) => s.custom);
  const all = useMemo(() => [...INGREDIENT_CATALOG, ...customs], [customs]);

  const normalized = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const visible = all.filter(
    (i) =>
      (category === "all" || i.category === category) &&
      (!query.trim() || normalized(i.name).includes(normalized(query.trim())))
  );

  const toggle = (ing: AllowedIngredient) => {
    onChange(selectedIds.has(ing.id) ? selected.filter((s) => s.id !== ing.id) : [...selected, ing]);
  };

  const counts = CATEGORIES.map((c) => ({ ...c, n: selected.filter((s) => s.category === c.id).length }));

  return (
    <div>
      {/* Resumen de selección */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {counts.map(({ id, icon: Icon, tone, n }) => (
          <div key={id} className="rounded-xl bg-muted/60 px-2.5 py-2">
            <Icon className={cn("h-4 w-4", tone)} />
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{INGREDIENT_CATEGORY_LABEL[id]}</p>
            <p className="font-display text-lg font-semibold tabular">{n}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar alimento…"
          className="h-11 pl-10"
          aria-label="Buscar alimento"
        />
      </div>

      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {(["all", ...CATEGORIES.map((c) => c.id)] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              category === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
            )}
          >
            {c === "all" ? "Todos" : INGREDIENT_CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visible.map((ing) => {
          const on = selectedIds.has(ing.id);
          const meta = CATEGORIES.find((c) => c.id === ing.category)!;
          return (
            <li key={ing.id} className="min-w-0">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(ing)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors",
                  on ? "border-primary ring-2 ring-primary/20" : "border-border hover:bg-muted/40"
                )}
              >
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted", meta.tone)}>
                  <meta.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{ing.name}</span>
                  <span className="block truncate text-xs text-muted-foreground tabular">
                    {ing.per100g.kcal} kcal · P {ing.per100g.protein} · G {ing.per100g.fat} · C {ing.per100g.netCarbs} /100 g
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  )}
                >
                  {on ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">No hay alimentos con ese nombre. Añádelo como propio.</p>
      ) : null}

      {customOpen ? (
        <CustomIngredientForm
          initialName={query}
          onCancel={() => setCustomOpen(false)}
          onCreate={(ing) => {
            onChange([...selected.filter((s) => s.id !== ing.id), ing]);
            setCustomOpen(false);
            setQuery("");
          }}
        />
      ) : (
        <Button variant="outline" className="mt-4 w-full" onClick={() => setCustomOpen(true)}>
          <Plus className="h-4 w-4" />
          Añadir un alimento propio
        </Button>
      )}
    </div>
  );
}

function CustomIngredientForm({
  initialName,
  onCreate,
  onCancel,
}: {
  initialName: string;
  onCreate: (ing: AllowedIngredient) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<IngredientCategory>("protein");
  const [v, setV] = useState({ kcal: "", protein: "", fat: "", netCarbs: "" });
  const num = (s: string) => Math.max(0, Number.parseFloat(s.replace(",", ".")) || 0);
  const valid = name.trim().length > 1 && num(v.kcal) > 0;

  return (
    <div className="surface mt-4 p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Alimento propio</p>
        <button type="button" onClick={onCancel} aria-label="Cerrar" className="rounded-full p-1 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">Valores por 100 g (mira la etiqueta nutricional).</p>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="mt-3" aria-label="Nombre del alimento" />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              category === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border"
            )}
          >
            {INGREDIENT_CATEGORY_LABEL[c.id]}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {(
          [
            ["kcal", "kcal"],
            ["protein", "Prot."],
            ["fat", "Grasa"],
            ["netCarbs", "Carb."],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="text-xs text-muted-foreground">
            {label}
            <Input
              inputMode="decimal"
              value={v[k]}
              onChange={(e) => setV((p) => ({ ...p, [k]: e.target.value }))}
              className="mt-1 h-9 px-2 tabular"
            />
          </label>
        ))}
      </div>
      <Button
        className="mt-3 w-full"
        disabled={!valid}
        onClick={() =>
          onCreate(
            makeCustomIngredient({
              name,
              category,
              kcal: num(v.kcal),
              protein: num(v.protein),
              fat: num(v.fat),
              netCarbs: num(v.netCarbs),
            })
          )
        }
      >
        Añadir
      </Button>
    </div>
  );
}
