"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EatyMarkAnimated } from "./eaty-logo";

const SEEN_KEY = "eaty-intro-seen";
const WORD = "Eaty".split("");

/** Bloque de marca animado: logo + nombre + lema. Se reutiliza en la carga. */
export function BrandIntro({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Halo que se expande detrás del logo */}
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-[30%] bg-primary/25"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.9], opacity: [0, 0.55, 0] }}
            transition={{ duration: 1.1, delay: 0.25, ease: "easeOut" }}
          />
        )}
        <EatyMarkAnimated className={compact ? "h-16 w-16" : "h-24 w-24 sm:h-28 sm:w-28"} />
      </div>

      <div
        className={`mt-5 flex overflow-hidden font-display font-bold tracking-tight ${
          compact ? "text-3xl" : "text-5xl sm:text-6xl"
        }`}
        aria-label="Eaty"
      >
        {WORD.map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={reduce ? false : { y: "110%", rotate: 8 }}
            animate={{ y: "0%", rotate: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 26, delay: reduce ? 0 : 1.0 + i * 0.07 }}
            className="inline-block"
          >
            {ch}
          </motion.span>
        ))}
      </div>

      {!compact && (
        <motion.p
          className="mt-2 text-sm text-muted-foreground"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: reduce ? 0 : 1.45 }}
        >
          Nutrición con IA, sin contar a mano
        </motion.p>
      )}
    </div>
  );
}

/**
 * Pantalla de entrada: se muestra una vez por sesión del navegador al abrir la
 * app y se desvanece revelando la interfaz que hay debajo.
 */
export function SplashIntro() {
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      seen = false;
    }
    if (seen) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), reduce ? 700 : 2300);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          role="presentation"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: "easeInOut" } }}
          onClick={() => setVisible(false)}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,var(--color-accent)_0%,transparent_70%)] opacity-60"
          />
          <motion.div exit={{ scale: 1.08, y: -10, transition: { duration: 0.45 } }} className="relative">
            <BrandIntro />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
