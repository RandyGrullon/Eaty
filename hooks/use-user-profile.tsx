"use client";

import { useAppData } from "@/hooks/use-app-data";

/**
 * Adaptador estable sobre el store global (`useAppData`). Mantiene la API previa
 * (`userProfile`, `profileLoading`, `refreshUserProfile`) usada por ~varios
 * componentes, pero ahora el perfil es reactivo en tiempo real (onSnapshot).
 */
export function useUserProfile() {
  const { profile, profileLoading, refresh } = useAppData();
  return {
    userProfile: profile,
    profileLoading,
    refreshUserProfile: refresh,
  };
}
