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
    if (!isLoading) {
      if (isAuthenticated) {
        // Redirect to dashboard if already logged in
        router.push("/dashboard");
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

