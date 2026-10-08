"use client";

import { useEffect, useRef, useState } from 'react';
import { useAuth } from './use-auth';
import { getPendingMeals, deletePendingMeal } from '@/lib/offline-storage';
import { saveMeal, updateStreak } from '@/lib/meals';
import { useToast } from './use-toast';
import { logger } from '@/lib/logger';

type PendingExtras = { plannedDate?: unknown; recordedAt?: unknown };

function toValidDate(v: unknown): Date | undefined {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

export function useOfflineSync(onSyncSuccess?: () => void) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  // Candado síncrono: evita dos sincronizaciones simultáneas (montaje + evento
  // `online`, o re-ejecución del efecto) que duplicarían comidas.
  const syncLockRef = useRef(false);
  const onSyncSuccessRef = useRef(onSyncSuccess);
  onSyncSuccessRef.current = onSyncSuccess;

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    const syncOfflineMeals = async () => {
      if (syncLockRef.current || !navigator.onLine) return;
      syncLockRef.current = true;
      let successCount = 0;

      try {
        const pendingMeals = await getPendingMeals(uid);
        if (pendingMeals.length === 0) return;

        setIsSyncing(true);

        for (const meal of pendingMeals) {
          try {
            // Re-crear el File desde el Blob guardado para subirlo a Storage.
            let imageFile: File | undefined;
            if (meal.imageBlob) {
              const type = meal.imageBlob.type || 'image/jpeg';
              const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
              imageFile = new File([meal.imageBlob], `offline-meal-${meal.id}.${ext}`, { type });
            }

            const extras = meal.mealData as typeof meal.mealData & PendingExtras;
            await saveMeal(uid, meal.mealData, {
              imageFile,
              plannedDate:
                toValidDate(extras.plannedDate) ??
                toValidDate(extras.recordedAt) ??
                new Date(meal.createdAt),
            });
            await deletePendingMeal(meal.id);
            successCount++;
          } catch (err) {
            logger.error(`Failed to sync meal ${meal.id}`, err);
          }
        }
      } catch (err) {
        logger.error('Offline sync failed', err);
      } finally {
        syncLockRef.current = false;
        setIsSyncing(false);
      }

      if (successCount > 0) {
        toast({
          title: "Sincronización completada",
          description: `Se han sincronizado ${successCount} comidas que tenías pendientes.`,
        });

        void updateStreak(uid).catch((e) =>
          logger.error("Error updating streak after sync", e)
        );

        onSyncSuccessRef.current?.();
      }
    };

    // Sincronizar al montar si hay conexión
    void syncOfflineMeals();

    // Sincronizar al recuperar la conexión
    const onOnline = () => void syncOfflineMeals();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [user, toast]);

  return { isSyncing };
}
