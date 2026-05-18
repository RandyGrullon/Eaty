"use client";

import React, { useState, useEffect } from "react";

interface LazyTabContentProps {
  isActive: boolean;
  children: React.ReactNode;
  className?: string;
  /** Si es true, una vez montado se mantiene en el DOM aunque deje de estar activo */
  keepMounted?: boolean;
}

export function LazyTabContent({
  isActive,
  children,
  className,
  keepMounted = true,
}: LazyTabContentProps) {
  const [hasBeenActive, setHasBeenActive] = useState(isActive);

  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  if (!hasBeenActive && !isActive) {
    return null;
  }

  // Si no queremos mantenerlo montado y no está activo, retornamos null
  if (!keepMounted && !isActive) {
    return null;
  }

  return <div className={className}>{children}</div>;
}
