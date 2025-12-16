import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useAuthGuard() {
  const { isLoading, isAuthenticated, checkAuth } = useAuth();
  const hasRedirectedRef = useRef(false);
  const hasCheckedOnMountRef = useRef(false);

  // Force check auth when entering dashboard (in case token was just set)
  useEffect(() => {
    if (!hasCheckedOnMountRef.current && !isLoading) {
      hasCheckedOnMountRef.current = true;
      // Only check if not already authenticated and not currently loading
      if (!isAuthenticated) {
        // On mobile, wait a bit longer before checking to ensure localStorage is ready
        const isMobile = typeof window !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
        const delay = isMobile ? 200 : 100;
        setTimeout(() => {
          checkAuth(true);
        }, delay);
      }
    }
  }, [checkAuth, isAuthenticated, isLoading]);

  // Redirect to home if not authenticated (only once)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasRedirectedRef.current) {
      // Give more time on mobile to allow checkAuth to complete
      // Mobile browsers may need more time for localStorage operations
      const isMobile = typeof window !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
      const delay = isMobile ? 1000 : 500;
      
      const timer = setTimeout(() => {
        // Double-check authentication status before redirecting
        const token = localStorage.getItem("auth-token");
        if (!token && !isAuthenticated) {
          hasRedirectedRef.current = true;
          window.location.href = "/";
        }
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated]);

  // Don't render if redirecting
  const shouldRender = isLoading || isAuthenticated;

  return {
    shouldRender,
    isLoading,
    isAuthenticated,
  };
}

