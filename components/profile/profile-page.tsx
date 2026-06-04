"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useProfileStats } from "@/hooks/use-profile-stats";
import { useToast } from "@/hooks/use-toast";
import { deleteUserAccountData } from "@/lib/meals";
import { exportUserData, downloadBlob } from "@/lib/gdpr-export";
import { logger } from "@/lib/logger";
import { ProfileHeader } from "./profile-header";
import { ProfileStatsSection } from "./profile-stats-section";
import { ProfileIntegrations } from "./profile-integrations";
import { ProfileAchievements } from "./profile-achievements";
import {
  ProfileBodyMatter,
  ProfileDangerZone,
} from "./profile-account-actions";
import { ProfileEditModal } from "./profile-edit-modal";

export function ProfilePage() {
  const { user, logout } = useAuth();
  const { userProfile, refreshUserProfile } = useUserProfile();
  const { toast } = useToast();
  const { stats, loading, error, selectedPeriod, setSelectedPeriod, reload } =
    useProfileStats(user?.uid);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const zipBlob = await exportUserData(user.uid);
      downloadBlob(zipBlob, `eaty-datos-${user.uid.slice(0, 5)}.zip`);
      toast({
        title: "Exportación lista",
        description: "Se ha descargado un archivo ZIP con todos tus datos.",
      });
    } catch (error) {
      logger.error("Error exporting data", error);
      toast({
        title: "Error al exportar",
        description: "No se pudieron generar tus archivos de datos.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      "¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible y perderás todo tu historial de comidas y fotos."
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      await deleteUserAccountData(user.uid);
      await logout();
      toast({
        title: "Cuenta eliminada",
        description: "Todos tus datos han sido borrados de nuestros servidores.",
      });
    } catch (error) {
      logger.error("Error deleting account", error);
      toast({
        title: "Error",
        description:
          "No se pudieron eliminar todos tus datos. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading || deleting) {
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
    <div className="min-h-screen bg-background pb-32">
      <ProfileHeader
        user={user}
        userProfile={userProfile}
        onEdit={() => setEditModalOpen(true)}
        onLogout={logout}
      />

      <div className="mx-auto max-w-4xl space-y-12 px-4 py-8 sm:px-8">
        <ProfileStatsSection
          stats={stats}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
        <ProfileIntegrations />
        <ProfileAchievements unlockedIds={userProfile?.achievements} />
        <ProfileBodyMatter />
        <ProfileDangerZone
          exporting={exporting}
          onExport={handleExportData}
          onDelete={handleDeleteAccount}
        />
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
