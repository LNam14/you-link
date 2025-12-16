"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface User {
  id: number;
  username: string;
  fullname: string;
  role: string;
  position?: string;
  telegram?: string;
  active: boolean;
  team?: string;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkAuth: (force?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasCheckedRef = useRef(false);
  const isCheckingRef = useRef(false);

  const checkAuth = useCallback(async (force = false) => {
    // Prevent multiple simultaneous checks unless forced
    if (!force && (hasCheckedRef.current || isCheckingRef.current)) {
      return;
    }

    try {
      isCheckingRef.current = true;
      setIsLoading(true);
      
      // Longer delay on mobile to ensure localStorage is ready (especially after redirect)
      // Mobile browsers may need more time to persist localStorage
      const isMobile = typeof window !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
      const delay = isMobile ? 150 : 50;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Try to get token with retry logic for mobile
      let token: string | null = null;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries && !token) {
        try {
          token = localStorage.getItem("auth-token");
          if (!token && retries < maxRetries - 1) {
            // Wait a bit longer before retry on mobile
            await new Promise(resolve => setTimeout(resolve, isMobile ? 100 : 50));
          }
        } catch (e) {
          console.error("Error accessing localStorage:", e);
          if (retries < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, isMobile ? 100 : 50));
          }
        }
        retries++;
      }

      if (!token) {
        setUser(null);
        setIsLoading(false);
        if (!force) {
          hasCheckedRef.current = true;
        }
        isCheckingRef.current = false;
        return;
      }

      // Check token expiry before making API call
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const exp = payload.exp;
          if (exp && exp * 1000 < Date.now()) {
            // Token expired
            localStorage.removeItem("auth-token");
            setUser(null);
            setIsLoading(false);
            if (!force) {
              hasCheckedRef.current = true;
            }
            isCheckingRef.current = false;
            return;
          }
        }
      } catch (e) {
        // Invalid token format, continue to API check
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        // Only remove token if it's a 401 (unauthorized) error
        // Network errors or other errors should not cause logout
        if (response.status === 401) {
          localStorage.removeItem("auth-token");
          setUser(null);
        }
        setIsLoading(false);
        if (!force) {
          hasCheckedRef.current = true;
        }
        isCheckingRef.current = false;
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Set user first, then update loading state
        // This ensures isAuthenticated becomes true before isLoading becomes false
        setUser(data.data);
        // Mark as checked successfully
        if (!force) {
          hasCheckedRef.current = true;
        }
        // Small delay on mobile to ensure state is updated before setting isLoading = false
        const isMobile = typeof window !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
        if (isMobile) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        setIsLoading(false);
        isCheckingRef.current = false;
      } else {
        setUser(null);
        localStorage.removeItem("auth-token");
        setIsLoading(false);
        if (!force) {
          hasCheckedRef.current = true;
        }
        isCheckingRef.current = false;
      }
    } catch (error) {
      console.error("Auth check error:", error);
      // Only remove token on network/auth errors, not on other errors
      // This prevents logout on temporary network issues
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Invalid") || errorMessage.includes("expired") || errorMessage.includes("401")) {
        setUser(null);
        localStorage.removeItem("auth-token");
      }
      // Don't clear user on network errors - keep current state
      setIsLoading(false);
      if (!force) {
        hasCheckedRef.current = true;
      }
      isCheckingRef.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("auth-token");
      setUser(null);
      hasCheckedRef.current = false;
      isCheckingRef.current = false;
      window.location.href = "/";
    }
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      return { ...prevUser, ...userData };
    });
  }, []);

  useEffect(() => {
    // Check auth on mount
    if (!hasCheckedRef.current && !isCheckingRef.current) {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also check auth when token appears in localStorage (for login flow)
  // This handles the case when token is set in the same tab (storage event doesn't fire)
  useEffect(() => {
    // Only check if user is not set but token exists
    if (!user && !isCheckingRef.current && !hasCheckedRef.current) {
      const token = localStorage.getItem("auth-token");
      if (token) {
        // Token exists but user is not set, force check
        checkAuth(true);
      }
    }
  }, [user, checkAuth]);

  // Listen for storage events (when token is set in another tab/window)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth-token" && e.newValue && !isCheckingRef.current) {
        // Token was added, check auth again
        hasCheckedRef.current = false;
        checkAuth(true);
      } else if (e.key === "auth-token" && !e.newValue) {
        // Token was removed, clear user
        setUser(null);
        hasCheckedRef.current = false;
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [checkAuth]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    checkAuth,
    logout,
    updateUser,
  };
}

