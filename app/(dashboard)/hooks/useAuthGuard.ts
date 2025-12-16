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
        checkAuth(true);
      }
    }
  }, [checkAuth, isAuthenticated, isLoading]);

  // Redirect to home if not authenticated (only once)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasRedirectedRef.current) {
      // Give a small delay to allow checkAuth to complete
      const timer = setTimeout(() => {
        if (!isAuthenticated) {
          hasRedirectedRef.current = true;
          window.location.href = "/";
        }
      }, 500);
      
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

