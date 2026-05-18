"use client";

import { useEffect, useState } from 'react';
import { useAuth } from './use-auth';
import { getPendingMeals, deletePendingMeal } from '@/lib/offline-storage';
import { saveMeal, updateStreak } from '@/lib/meals';
import { useToast } from './use-toast';
import { logger } from '@/lib/logger';

export function useOfflineSync(onSyncSuccess?: () => void) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const syncOfflineMeals = async () => {
      if (isSyncing || !navigator.onLine) return;

      const pendingMeals = await getPendingMeals(user.uid);
      if (pendingMeals.length === 0) return;

      setIsSyncing(true);
      let successCount = 0;

      for (const meal of pendingMeals) {
        try {
          // Re-create File from Blob
          let imageFile: File | undefined;
          if (meal.imageBlob) {
            imageFile = new File([meal.imageBlob], `offline-meal-${meal.id}.jpg`, { type: meal.imageBlob.type });
          }

          await saveMeal(user.uid, meal.mealData, { imageFile });
          await deletePendingMeal(meal.id);
          successCount++;
        } catch (err) {
          logger.error(`Failed to sync meal ${meal.id}`, err);
        }
      }

      if (successCount > 0) {
        toast({
          title: "Sincronización completada",
          description: `Se han sincronizado ${successCount} comidas que tenías pendientes.`,
        });
        
        void updateStreak(user.uid).catch((e) =>
          logger.error("Error updating streak after sync", e)
        );

        if (onSyncSuccess) onSyncSuccess();
      }
      
      setIsSyncing(false);
    };

    // Sync on mount if online
    void syncOfflineMeals();

    // Sync when coming back online
    window.addEventListener('online', syncOfflineMeals);
    return () => window.removeEventListener('online', syncOfflineMeals);
  }, [user, isSyncing, toast, onSyncSuccess]);

  return { isSyncing };
}
