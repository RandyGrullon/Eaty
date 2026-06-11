"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const scanCardClass =
  "group relative flex flex-col items-start gap-4 overflow-hidden rounded-[2.5rem] border border-border/40 bg-card/40 p-6 text-left shadow-2xl shadow-black/[0.03] backdrop-blur-md transition-all duration-300 hover:shadow-primary/10 hover:bg-card active:scale-[0.98]";

interface ScanModeCardProps {
  icon: LucideIcon;
  badge: string;
  title: string;
  description: string;
  iconWrapClassName: string;
  onClick: () => void;
  index: number;
}

export function ScanModeCard({
  icon: Icon,
  badge,
  title,
  description,
  iconWrapClassName,
  onClick,
  index,
}: ScanModeCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      type="button"
      onClick={onClick}
      className={scanCardClass}
    >
      <div className="flex w-full items-start justify-between">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-transform group-hover:scale-110 duration-300",
            iconWrapClassName
          )}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <span className="rounded-full border border-border/40 bg-background/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
          {badge}
        </span>
      </div>
      <div>
        <p className="text-xl font-black tracking-tight text-foreground">{title}</p>
        <p className="mt-1.5 text-xs font-medium leading-relaxed text-muted-foreground/80">
          {description}
        </p>
      </div>
      {/* Decorative gradient corner */}
      <div className="absolute -bottom-6 -right-6 h-12 w-12 bg-primary/10 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.button>
  );
}
