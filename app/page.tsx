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
    // Check token first - if token exists, user might be authenticated
    const token = localStorage.getItem("auth-token");
    
    // If we have a token, check if user is authenticated
    if (token) {
      // If authenticated, redirect immediately (no delay)
      if (isAuthenticated) {
        const isRedirecting = sessionStorage.getItem("auth-redirecting") === "true";
        if (!isRedirecting) {
          sessionStorage.setItem("auth-redirecting", "true");
          // Redirect immediately without delay
          window.location.href = "/dashboard";
        }
        return;
      }
      // If token exists but not authenticated yet, wait for auth check
      // Don't show login modal yet
      if (isLoading) {
        return;
      }
    }
    
    // Only show login modal if no token and not loading
    if (!isLoading && !token) {
      setShowLoginModal(true);
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

