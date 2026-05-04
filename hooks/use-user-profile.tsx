"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { getUserProfile } from "@/lib/meals";
import { logger } from "@/lib/logger";
import type { UserProfile } from "@/types/meal";

type UserProfileContextValue = {
  userProfile: UserProfile | null;
  profileLoading: boolean;
  refreshUserProfile: () => Promise<void>;
};

const UserProfileContext = createContext<UserProfileContextValue | undefined>(
  undefined
);

export function UserProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const refreshUserProfile = useCallback(async () => {
    if (!user) {
      setUserProfile(null);
      return;
    }
    setProfileLoading(true);
    try {
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
    } catch (error) {
      logger.error("Error loading user profile", error);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }
    void refreshUserProfile();
  }, [user, authLoading, refreshUserProfile]);

  return (
    <UserProfileContext.Provider
      value={{ userProfile, profileLoading, refreshUserProfile }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (ctx === undefined) {
    throw new Error("useUserProfile must be used within UserProfileProvider");
  }
  return ctx;
}
