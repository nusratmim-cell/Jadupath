"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  type SessionUser,
  type TeacherProfile,
} from "@/lib/auth";

interface UseAuthOptions {
  requireAuth?: boolean;
  requireOnboarding?: boolean;
  redirectTo?: string;
}

interface UseAuthReturn {
  user: SessionUser | null;
  profile: TeacherProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  logout: () => void;
  refreshAuth: () => void;
}

export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const {
    requireAuth = true,
    requireOnboarding = true,
    redirectTo,
  } = options;

  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);

    if (currentUser) {
      const teacherProfile = getProfileByUserId(currentUser.id);
      setProfile(teacherProfile);
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser && requireAuth) {
      setUser(null);
      setIsLoading(false);
      router.push(redirectTo || "/");
      return;
    }

    if (currentUser && !currentUser.onboardingCompleted && requireOnboarding) {
      setUser(currentUser);
      setIsLoading(false);
      router.push("/onboarding");
      return;
    }

    if (currentUser) {
      const teacherProfile = getProfileByUserId(currentUser.id);

      if (!teacherProfile && requireOnboarding) {
        setUser(currentUser);
        setProfile(teacherProfile);
        setIsLoading(false);
        router.push("/onboarding");
        return;
      }

      // Batch state updates at the end
      setUser(currentUser);
      setProfile(teacherProfile);
      setIsLoading(false);
      return;
    }

    setUser(currentUser);
    setIsLoading(false);
  }, [router, requireAuth, requireOnboarding, redirectTo]);

  const logout = useCallback(() => {
    // Clear localStorage with correct keys
    localStorage.removeItem("shikho_current_user");
    // Also clear other auth-related data
    setUser(null);
    setProfile(null);
    router.push("/");
  }, [router]);

  return {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    isOnboarded: !!profile && !!user?.onboardingCompleted,
    logout,
    refreshAuth,
  };
}

// Hook for pages that don't require auth (like login page)
export function usePublicAuth() {
  return useAuth({
    requireAuth: false,
    requireOnboarding: false,
  });
}

// Hook for checking if user should be redirected from login page
export function useRedirectIfAuthenticated(redirectTo: string = "/dashboard") {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.onboardingCompleted) {
      router.push(redirectTo);
    }
    setIsChecking(false);
  }, [router, redirectTo]);

  return { isChecking };
}
