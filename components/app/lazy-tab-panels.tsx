"use client";

import dynamic from "next/dynamic";

/** Esqueleto mientras se descarga el código de una pestaña. */
function PanelSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

export const ScanScreenLazy = dynamic(
  () =>
    import("@/components/scan/scan-screen").then((m) => ({
      default: m.ScanScreen,
    })),
  { ssr: true, loading: PanelSkeleton }
);

export const MealHistoryLazy = dynamic(
  () =>
    import("@/components/history/meal-history").then((m) => ({
      default: m.MealHistory,
    })),
  { ssr: true, loading: PanelSkeleton }
);

export const ProfilePageLazy = dynamic(
  () =>
    import("@/components/profile/profile-page").then((m) => ({
      default: m.ProfilePage,
    })),
  { ssr: true, loading: PanelSkeleton }
);

export const WeeklyPlannerLazy = dynamic(
  () =>
    import("@/components/planning/weekly-planner").then((m) => ({
      default: m.WeeklyPlanner,
    })),
  { ssr: true, loading: PanelSkeleton }
);

export const DietsScreenLazy = dynamic(
  () =>
    import("@/components/diets/diets-screen").then((m) => ({
      default: m.DietsScreen,
    })),
  { ssr: true, loading: PanelSkeleton }
);

export const SettingsPageLazy = dynamic(
  () =>
    import("@/components/settings/settings-page").then((m) => ({
      default: m.SettingsPage,
    })),
  { ssr: true, loading: PanelSkeleton }
);


