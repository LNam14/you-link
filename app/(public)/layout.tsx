"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoginModal from "@/components/auth/LoginModal";
import Button from "@/components/ui/Button";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
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
          setUser(data.data);
          // If user is logged in, redirect to dashboard
          window.location.href = "/dashboard";
          return;
        }
      } else {
        localStorage.removeItem("auth-token");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      localStorage.removeItem("auth-token");
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("auth-token");
      setUser(null);
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleLoginSuccess = () => {
    checkAuth();
    // Redirect to dashboard after successful login
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 100);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xl font-bold text-gray-900 dark:text-white"
          >
            You Link
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/about"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Contact
            </Link>
            {!isChecking && user && (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.fullname}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.role}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleLogout}
                    className="whitespace-nowrap"
                  >
                    Đăng xuất
                  </Button>
                </div>
              </div>
            )}
            {!isChecking && !user && (
              <Button
                size="sm"
                onClick={() => {
                  // Check auth again before opening modal
                  const token = localStorage.getItem("auth-token");
                  if (token) {
                    // If token exists, check if valid
                    fetch("/api/auth/me", {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                      credentials: "include",
                      cache: "no-store",
                    })
                      .then((res) => {
                        if (res.ok) {
                          // Already logged in, redirect to dashboard
                          window.location.href = "/dashboard";
                        } else {
                          // Token invalid, remove it and open modal
                          localStorage.removeItem("auth-token");
                          setIsLoginModalOpen(true);
                        }
                      })
                      .catch(() => {
                        localStorage.removeItem("auth-token");
                        setIsLoginModalOpen(true);
                      });
                  } else {
                    setIsLoginModalOpen(true);
                  }
                }}
              >
                Đăng nhập
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} You Link. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}

