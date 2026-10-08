"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useProfileStats } from "@/hooks/use-profile-stats";
import { ProfileHeader } from "./profile-header";
import { ProfileStatsSection } from "./profile-stats-section";
import { ProfileAchievements } from "./profile-achievements";
import { ProfileEditModal } from "./profile-edit-modal";
import { ProfileUpdateProgress } from "./profile-update-progress";
import type { MainTab } from "@/lib/main-tab";

interface ProfilePageProps {
  onTabChange?: (tab: MainTab) => void;
}


export function ProfilePage({ onTabChange }: ProfilePageProps) {
  const { user, logout } = useAuth();
  const { userProfile, refreshUserProfile } = useUserProfile();
  const { stats, loading, error, selectedPeriod, setSelectedPeriod, reload } =
    useProfileStats(user?.uid);

  const [editModalOpen, setEditModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-full bg-background pb-32 md:pb-12">
        <div className="mx-auto max-w-4xl space-y-4 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <div className="h-8 w-40 animate-pulse rounded-xl bg-muted" />
          <div className="h-36 animate-pulse rounded-2xl bg-muted" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-background pb-32 md:pb-12">
        <div className="mx-auto max-w-4xl px-4 pt-16 sm:px-6 lg:px-10">
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-3 font-medium">No se pudo cargar tu perfil</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button onClick={reload} variant="outline" className="mt-4 rounded-full">
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background pb-32 md:pb-12">
      <ProfileHeader
        user={user}
        userProfile={userProfile}
        onEdit={() => setEditModalOpen(true)}
        onLogout={logout}
        onSettingsClick={() => onTabChange?.("settings")}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-4xl space-y-10 px-4 pt-8 sm:px-6 lg:px-10"
      >
        <ProfileStatsSection
          stats={stats}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          userProfile={userProfile}
        />

        {user && (
          <ProfileUpdateProgress userId={user.uid} userProfile={userProfile} onSaved={refreshUserProfile} />
        )}

        <ProfileAchievements unlockedIds={userProfile?.achievements} />
      </motion.div>

      {user && (
        <ProfileEditModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          userId={user.uid}
          userProfile={userProfile}
          onSaved={refreshUserProfile}
        />
      )}
    </div>
  );
}
