"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: string;
  className?: string;
}

export function StatTile({ icon: Icon, label, value, sub, className }: StatTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group rounded-[2rem] border border-border/40 bg-card/60 p-5 sm:p-6 shadow-2xl shadow-black/[0.03] backdrop-blur-md",
        "flex flex-col justify-between min-h-[140px] transition-shadow duration-300 hover:shadow-primary/5",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner transition-transform group-hover:scale-110">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 pt-1">
          {label}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-3xl sm:text-4xl font-black tabular-nums tracking-tighter text-foreground">
          {value}
        </p>
        {sub ? (
          <p className="text-xs font-medium text-muted-foreground mt-1.5 leading-snug">{sub}</p>
        ) : null}
      </div>
    </motion.div>
  );
}
