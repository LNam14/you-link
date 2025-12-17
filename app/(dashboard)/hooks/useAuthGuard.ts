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
    const isRedirecting = sessionStorage.getItem("auth-redirecting") === "true";
    
    // Nếu chưa authenticated và không bận check, luôn cưỡng bức checkAuth
    if (!isAuthenticated && !isLoading && !isCheckingAuth && !isRedirecting) {
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
        const isRedirecting = sessionStorage.getItem("auth-redirecting") === "true";
        
        // Don't redirect if we're already redirecting
        if (!isAuthenticated && !isRedirecting) {
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

  // Render logic: cho phép render khi đang loading/checking hoặc đã authenticated
  const shouldRender = isAuthenticated || isLoading || isCheckingAuth;

  const showLoading = (isLoading || isCheckingAuth) && !isAuthenticated;

  return {
    shouldRender,
    isLoading: showLoading,
    isAuthenticated,
  };
}

