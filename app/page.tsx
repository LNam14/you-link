"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import LoginModal from "@/components/auth/LoginModal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // Don't redirect if we're in the middle of a redirect (prevent loop)
    const isRedirecting = sessionStorage.getItem("auth-redirecting") === "true";
    if (isRedirecting) {
      return;
    }
    
    if (!isLoading) {
      if (isAuthenticated) {
        // Small delay to ensure state is stable, especially on mobile
        const isMobile = typeof window !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
        const delay = isMobile ? 300 : 100;
        
        setTimeout(() => {
          // Double-check authentication before redirecting
          if (isAuthenticated && !sessionStorage.getItem("auth-redirecting")) {
            sessionStorage.setItem("auth-redirecting", "true");
            // Use window.location.href for more reliable redirect on mobile
            window.location.href = "/dashboard";
          }
        }, delay);
      } else {
        // Show login modal if not logged in
        setShowLoginModal(true);
      }
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <LoadingSpinner />
      </div>
    );
  }

  const handleLoginSuccess = () => {
    // Redirect to dashboard after successful login
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          // Don't allow closing if not authenticated
          if (!isAuthenticated) {
            return;
          }
          setShowLoginModal(false);
        }}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}

