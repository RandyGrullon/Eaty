import { Home, Camera, History, User, Salad, Settings, type LucideIcon } from "lucide-react";
import type { MainTab } from "@/lib/main-tab";

export type NavItem = { id: MainTab; icon: LucideIcon; label: string };

export const NAV_ITEMS: NavItem[] = [
  { id: "home", icon: Home, label: "Inicio" },
  { id: "diets", icon: Salad, label: "Dietas" },
  { id: "scan", icon: Camera, label: "Escanear" },
  { id: "history", icon: History, label: "Historial" },
  { id: "profile", icon: User, label: "Perfil" },
  { id: "settings", icon: Settings, label: "Ajustes" },
];
