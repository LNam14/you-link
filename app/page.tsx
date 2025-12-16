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
    // Check token first
    const token = localStorage.getItem("auth-token");
    
    // If authenticated, redirect immediately
    if (isAuthenticated) {
      window.location.href = "/dashboard";
      return;
    }
    
    // If we have a token but not authenticated yet, wait for auth check
    // Don't show login modal while checking
    if (token && isLoading) {
      return;
    }
    
    // If no token and not loading, show login modal
    if (!token && !isLoading) {
      setShowLoginModal(true);
    }
    
    // If token exists but auth check failed (not loading, not authenticated), remove token and show modal
    if (token && !isLoading && !isAuthenticated) {
      // Token might be invalid, but wait a bit more for auth check to complete
      const timer = setTimeout(() => {
        if (!isAuthenticated) {
          setShowLoginModal(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading]);

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

