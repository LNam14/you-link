"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Don't redirect if we're in the middle of a redirect (prevent loop)
      const isRedirecting = sessionStorage.getItem("auth-redirecting") === "true";
      if (isRedirecting) {
        setIsChecking(false);
        return;
      }
      
      const token = localStorage.getItem("auth-token");
      if (!token) {
        setIsChecking(false);
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Already logged in, redirect to dashboard (with delay on mobile)
          const isMobile = typeof window !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
          const delay = isMobile ? 500 : 200;
          
          setTimeout(() => {
            if (!sessionStorage.getItem("auth-redirecting")) {
              sessionStorage.setItem("auth-redirecting", "true");
              window.location.href = "/dashboard";
            }
          }, delay);
          return;
        }
      }

      // Token invalid or not logged in, allow access to auth pages
      setIsChecking(false);
    } catch (error) {
      console.error("Auth check error:", error);
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Đang kiểm tra...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md px-6 py-8">
        <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
          {children}
        </div>
      </div>
    </div>
  );
}
