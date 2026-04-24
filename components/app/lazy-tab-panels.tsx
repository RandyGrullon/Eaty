"use client";

import dynamic from "next/dynamic";

export const ScanScreenLazy = dynamic(
  () =>
    import("@/components/scan/scan-screen").then((m) => ({
      default: m.ScanScreen,
    })),
  { ssr: true }
);

export const MealHistoryLazy = dynamic(
  () =>
    import("@/components/history/meal-history").then((m) => ({
      default: m.MealHistory,
    })),
  { ssr: true }
);

export const ProfilePageLazy = dynamic(
  () =>
    import("@/components/profile/profile-page").then((m) => ({
      default: m.ProfilePage,
    })),
  { ssr: true }
);
