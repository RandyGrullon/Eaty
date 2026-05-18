"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Palette, Leaf, Sunrise } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="h-10 w-10 shrink-0 animate-pulse rounded-xl border border-border/80 bg-muted/40"
        aria-hidden
      />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl border-border/80 bg-card/90 shadow-sm"
          aria-label="Cambiar tema"
        >
          <Palette className="h-4 w-4 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl p-2 border-border/40 shadow-2xl">
        <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-xl gap-2 font-bold cursor-pointer">
          <Sun className="h-4 w-4 text-amber-500" /> Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-xl gap-2 font-bold cursor-pointer">
          <Moon className="h-4 w-4 text-primary" /> Oscuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("theme-nature")} className="rounded-xl gap-2 font-bold cursor-pointer">
          <Leaf className="h-4 w-4 text-emerald-500" /> Naturaleza
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("theme-sunset")} className="rounded-xl gap-2 font-bold cursor-pointer">
          <Sunrise className="h-4 w-4 text-orange-500" /> Atardecer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
