"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Leaf, Sunrise } from "lucide-react";
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
        className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted"
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
          className="h-10 w-10 shrink-0"
          aria-label="Cambiar tema"
        >
          {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl p-1.5">
        <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer gap-2 rounded-xl">
          <Sun className="h-4 w-4" /> Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer gap-2 rounded-xl">
          <Moon className="h-4 w-4" /> Oscuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("theme-nature")} className="cursor-pointer gap-2 rounded-xl">
          <Leaf className="h-4 w-4" /> Océano
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("theme-sunset")} className="cursor-pointer gap-2 rounded-xl">
          <Sunrise className="h-4 w-4" /> Atardecer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
