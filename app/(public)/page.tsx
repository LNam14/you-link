"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function HomePage() {
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

  return (
    <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
      {/* User Info Banner */}
      {!isChecking && user && (
        <div className="mb-8 rounded-lg bg-indigo-50 border border-indigo-200 p-4 dark:bg-indigo-900/20 dark:border-indigo-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                Bạn đã đăng nhập với tài khoản: <span className="font-bold">{user.fullname}</span>
              </p>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                Vai trò: {user.role}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="primary" size="sm">
                  Vào Dashboard
                </Button>
              </Link>
              <Button variant="danger" size="sm" onClick={handleLogout}>
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          Welcome to You Link
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
          Create and manage your links with ease. Share your content with the
          world.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/dashboard"
            className="rounded-md bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Get started
          </Link>
          <Link
            href="/about"
            className="text-base font-semibold leading-6 text-gray-900 dark:text-white"
          >
            Learn more <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Easy to Use
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Simple and intuitive interface for managing your links.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Fast & Reliable
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Lightning-fast performance with 99.9% uptime guarantee.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Secure
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Your data is protected with industry-standard security.
          </p>
        </div>
      </div>
    </div>
  );
}

