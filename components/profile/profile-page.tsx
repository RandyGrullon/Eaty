"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useProfileStats } from "@/hooks/use-profile-stats";
import { useToast } from "@/hooks/use-toast";
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
      <div className="min-h-screen bg-background pb-28 md:pb-10">
        <div className="h-40 border-b border-border/60 bg-muted/30" />
        <div className="flex justify-center py-24">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-4 pb-28 pt-16 text-center md:pb-10">
        <p className="text-sm font-medium text-destructive">{error}</p>
        <Button onClick={reload} variant="outline" className="mt-6 rounded-xl">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-500">
      <ProfileHeader
        user={user}
        userProfile={userProfile}
        onEdit={() => setEditModalOpen(true)}
        onLogout={logout}
        onSettingsClick={() => onTabChange?.("settings")}
      />

      <div className="mx-auto max-w-4xl space-y-12 px-4 py-8 sm:px-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
          <ProfileStatsSection
            stats={stats}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            userProfile={userProfile}
          />
        </div>
        
        {user && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
            <ProfileUpdateProgress
              userId={user.uid}
              userProfile={userProfile}
              onSaved={refreshUserProfile}
            />
          </div>
        )}
        
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
          <ProfileAchievements unlockedIds={userProfile?.achievements} />
        </div>
      </div>

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
