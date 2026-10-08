"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/*
 * Marca de Eaty: una "e" minúscula. El aro es un plato al que le falta un
 * mordisco (arriba a la derecha) y el travesaño es una hoja.
 * Geometría en un lienzo de 64×64.
 */
const RING = "M47 32 A15 15 0 1 0 43.6 41.6";
const LEAF = "M17.5 32 C23 24.5 39 23.5 47 32 C39 37 25 38 17.5 32 Z";
const VEIN = "M20 32 C28 30.6 36 30.6 44 31.6";
const BITES = [
  { cx: 44.5, cy: 15.5, r: 4.6 },
  { cx: 50, cy: 20.5, r: 3.9 },
];

/** Colores fijos de marca: el logo se ve igual en tema claro y oscuro. */
export const BRAND = { green: "#0b8a55", greenDeep: "#06703f", lime: "#c8f07a", white: "#ffffff" };

type Tone = { tile: string; ring: string; leaf: string; vein: string };

const TONES: Record<"default" | "inverted", Tone> = {
  default: { tile: BRAND.green, ring: BRAND.white, leaf: BRAND.lime, vein: BRAND.greenDeep },
  inverted: { tile: BRAND.white, ring: BRAND.green, leaf: BRAND.lime, vein: BRAND.greenDeep },
};

export function EatyMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  const id = useId().replace(/:/g, "");
  const t = TONES[inverted ? "inverted" : "default"];
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("h-8 w-8", className)}>
      <defs>
        <mask id={`bite-${id}`}>
          <rect width="64" height="64" fill="white" />
          {BITES.map((b) => (
            <circle key={b.cx} {...b} fill="black" />
          ))}
        </mask>
      </defs>
      <rect width="64" height="64" rx="19" fill={t.tile} />
      <g mask={`url(#bite-${id})`}>
        <path d={RING} fill="none" strokeWidth="6.5" strokeLinecap="round" stroke={t.ring} />
      </g>
      <path d={LEAF} fill={t.leaf} />
      <path d={VEIN} fill="none" strokeWidth="1.4" strokeLinecap="round" stroke={t.vein} opacity={0.55} />
    </svg>
  );
}

/**
 * Versión animada (pantalla de entrada): la ficha aparece con rebote, el plato
 * se dibuja, brota la hoja y por último se le da el mordisco.
 */
export function EatyMarkAnimated({ className, delay = 0 }: { className?: string; delay?: number }) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const t = TONES.default;
  const d = (s: number) => (reduce ? 0 : delay + s);

  return (
    <motion.svg
      viewBox="0 0 64 64"
      aria-hidden
      className={cn("h-24 w-24 overflow-visible", className)}
      initial={reduce ? false : { scale: 0.4, rotate: -14, opacity: 0 }}
      animate={
        reduce
          ? undefined
          : { scale: [0.4, 1.08, 1, 0.93, 1], rotate: [-14, 3, 0, 0, 0], opacity: 1 }
      }
      transition={{ duration: 1.5, delay: d(0), times: [0, 0.3, 0.45, 0.82, 1], ease: "easeOut" }}
    >
      <defs>
        <mask id={`bite-a-${id}`}>
          <rect width="64" height="64" fill="white" />
          {BITES.map((b, i) => (
            <motion.circle
              key={b.cx}
              cx={b.cx}
              cy={b.cy}
              fill="black"
              initial={reduce ? false : { r: 0 }}
              animate={{ r: b.r }}
              transition={{ type: "spring", stiffness: 520, damping: 16, delay: d(1.15 + i * 0.08) }}
            />
          ))}
        </mask>
        <linearGradient id={`tile-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.22" />
          <stop offset="60%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="19" fill={t.tile} />
      <rect width="64" height="64" rx="19" fill={`url(#tile-${id})`} />

      <g mask={`url(#bite-a-${id})`}>
        <motion.path
          d={RING}
          fill="none"
          strokeWidth="6.5"
          strokeLinecap="round"
          stroke={t.ring}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.75, delay: d(0.3), ease: [0.65, 0, 0.35, 1] }}
        />
      </g>

      <motion.g
        style={{ transformOrigin: "17.5px 32px" }}
        initial={reduce ? false : { scale: 0, rotate: -35 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 14, delay: d(0.75) }}
      >
        <path d={LEAF} fill={t.leaf} />
        <motion.path
          d={VEIN}
          fill="none"
          strokeWidth="1.4"
          strokeLinecap="round"
          stroke={t.vein}
          opacity={0.55}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: d(0.95) }}
        />
      </motion.g>

      {/* Migas que salen del mordisco */}
      {!reduce &&
        [
          { x: 8, y: -9, s: 2.1 },
          { x: 12, y: -2, s: 1.6 },
          { x: 3, y: -12, s: 1.4 },
        ].map((c, i) => (
          <motion.circle
            key={i}
            cx={47}
            cy={18}
            r={c.s}
            fill={BRAND.lime}
            initial={{ opacity: 0, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], x: c.x, y: c.y }}
            transition={{ duration: 0.6, delay: d(1.2 + i * 0.05), ease: "easeOut" }}
          />
        ))}
    </motion.svg>
  );
}

export function EatyLogo({
  className,
  subtitle,
  inverted,
}: {
  className?: string;
  subtitle?: string;
  inverted?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <EatyMark inverted={inverted} className="h-9 w-9" />
      <div className="leading-none">
        <span className="font-display text-xl font-bold tracking-tight">Eaty</span>
        {subtitle ? <p className="mt-1 text-[11px] opacity-70">{subtitle}</p> : null}
      </div>
    </div>
  );
}
