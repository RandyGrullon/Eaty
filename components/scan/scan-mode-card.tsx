"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      type="button"
      onClick={onClick}
      className="surface group flex w-full min-w-0 items-center gap-4 p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 sm:flex-col sm:items-start sm:p-5"
    >
      <div className="flex shrink-0 items-start justify-between sm:w-full">
        <span
          className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconWrapClassName)}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="hidden rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground sm:inline-flex">
          {badge}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:hidden"
        aria-hidden
      />
    </motion.button>
  );
}
