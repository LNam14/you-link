import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useAuthGuard() {
  const { isLoading, isAuthenticated, checkAuth } = useAuth();
  const hasRedirectedRef = useRef(false);
  const hasCheckedOnMountRef = useRef(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const checkAuthTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Force check auth when entering dashboard (in case token was just set)
  useEffect(() => {
    // Check if we have a token but user is not authenticated yet
    const token = localStorage.getItem("auth-token");
    const isRedirecting = sessionStorage.getItem("auth-redirecting") === "true";
    
    // If we have a token but not authenticated, and not already checking, check auth
    if (token && !isAuthenticated && !isLoading && !isCheckingAuth && !isRedirecting) {
      if (!hasCheckedOnMountRef.current) {
        hasCheckedOnMountRef.current = true;
        // On mobile, wait a bit longer before checking to ensure localStorage is ready
        const isMobile = typeof window !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
        const delay = isMobile ? 200 : 100;
        
        setIsCheckingAuth(true);
        checkAuthTimeoutRef.current = setTimeout(async () => {
          try {
            await checkAuth(true);
          } finally {
            // Wait a bit more after checkAuth completes before allowing redirect
            const isMobile = typeof window !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
            setTimeout(() => {
              setIsCheckingAuth(false);
            }, isMobile ? 300 : 150);
          }
        }, delay);
      }
    } else if (!token && !isAuthenticated && !isLoading) {
      // No token and not authenticated, mark as checked
      hasCheckedOnMountRef.current = true;
    }
    
    return () => {
      if (checkAuthTimeoutRef.current) {
        clearTimeout(checkAuthTimeoutRef.current);
      }
    };
  }, [checkAuth, isAuthenticated, isLoading, isCheckingAuth]);

  // Redirect to home if not authenticated (only once, and only after checkAuth completes)
  useEffect(() => {
    // Don't redirect if still loading, checking auth, or already redirected
    if (isLoading || isCheckingAuth || hasRedirectedRef.current) {
      return;
    }
    
    // Only redirect if definitely not authenticated after all checks
    if (!isAuthenticated) {
      // Give more time on mobile to allow checkAuth to complete
      // Mobile browsers may need more time for localStorage operations
      const isMobile = typeof window !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
      const delay = isMobile ? 1500 : 800; // Increased delay to ensure checkAuth completes
      
      const timer = setTimeout(() => {
        // Triple-check: token, isAuthenticated state, and check if we're in redirect loop
        const token = localStorage.getItem("auth-token");
        const isRedirecting = sessionStorage.getItem("auth-redirecting") === "true";
        
        // Don't redirect if token exists (might still be validating) or already redirecting
        if (!token && !isAuthenticated && !isRedirecting) {
          hasRedirectedRef.current = true;
          sessionStorage.setItem("auth-redirecting", "true");
          // Clear the flag after a short delay to allow normal navigation
          setTimeout(() => {
            sessionStorage.removeItem("auth-redirecting");
          }, 1000);
          window.location.href = "/";
        }
      }, delay);
      
      return () => clearTimeout(timer);
    } else {
      // If authenticated, clear any redirect flags
      sessionStorage.removeItem("auth-redirecting");
    }
  }, [isLoading, isAuthenticated, isCheckingAuth]);

  // Render logic:
  // - Always render if loading (show loading state)
  // - Always render if authenticated (show content)
  // - Render if checking auth (don't show blank screen during check)
  // - Only don't render if definitely not authenticated AND not checking
  const shouldRender = isLoading || isAuthenticated || isCheckingAuth;

  return {
    shouldRender,
    isLoading: isLoading || isCheckingAuth, // Show loading during check
    isAuthenticated,
  };
}

