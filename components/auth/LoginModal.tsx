"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSuccess,
}: LoginModalProps) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Check if user is already logged in when modal opens
  useEffect(() => {
    if (isOpen) {
      checkExistingAuth();
    }
  }, [isOpen]);

  const checkExistingAuth = async () => {
    try {
      setIsChecking(true);
      const token = localStorage.getItem("auth-token");
      if (!token) {
        setIsLoggedIn(false);
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
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
        localStorage.removeItem("auth-token");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsLoggedIn(false);
      localStorage.removeItem("auth-token");
    } finally {
      setIsChecking(false);
    }
  };

  const setClientCookie = (token: string) => {
    const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
    const maxAge = 60 * 60 * 24 * 3; // 3 ngày
    document.cookie = `auth-token=${token}; Path=/; SameSite=Lax; Max-Age=${maxAge}${isSecure ? "; Secure" : ""}`;
  };

  const clearClientCookie = () => {
    document.cookie = "auth-token=; Path=/; Max-Age=0; SameSite=Lax";
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      localStorage.removeItem("auth-token");
      clearClientCookie();
      setIsLoggedIn(false);
      setError("");
      // Reload page to update UI
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Cần include để nhận Set-Cookie (auth-token) từ server
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Đăng nhập thất bại");
      }

      // Lưu token vào localStorage
      if (data.data?.token) {
        console.log("Saving token to localStorage");
        try {
          localStorage.setItem("auth-token", data.data.token);
          // Đồng bộ cookie phía client để middleware đọc được ngay
          setClientCookie(data.data.token);
          console.log("Token saved to localStorage");
          
          // Verify token was saved (important for mobile)
          const savedToken = localStorage.getItem("auth-token");
          if (!savedToken || savedToken !== data.data.token) {
            console.error("Token verification failed after save");
            throw new Error("Không thể lưu token. Vui lòng thử lại.");
          }
          
          // Trigger storage event để useAuth hook có thể detect token mới
          window.dispatchEvent(new StorageEvent("storage", {
            key: "auth-token",
            newValue: data.data.token,
            storageArea: localStorage,
          }));
        } catch (storageError) {
          console.error("localStorage error:", storageError);
          throw new Error("Trình duyệt không hỗ trợ lưu trữ. Vui lòng kiểm tra cài đặt trình duyệt.");
        }
      } else {
        console.error("No token in response:", data);
        throw new Error("Không nhận được token từ server");
      }

      // Reset form
      setFormData({ username: "", password: "" });
      setError("");

      // Close modal
      onClose();

      // Immediately call checkAuth to update user state, then redirect
      // This ensures isAuthenticated is set before redirect
      const handleRedirect = async () => {
        try {
          // Import useAuth hook's checkAuth function dynamically
          // Or trigger it via custom event
          window.dispatchEvent(new CustomEvent("auth-token-set", { 
            detail: { token: data.data.token } 
          }));
          
          // Small delay to ensure event is processed
          const isMobile = typeof window !== "undefined" && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
          await new Promise(resolve => setTimeout(resolve, isMobile ? 300 : 200));
          
          // Verify token exists
          const savedToken = localStorage.getItem("auth-token");
          if (savedToken === data.data.token) {
            // Redirect immediately - useAuth will check on dashboard page
            window.location.href = "/dashboard";
          } else {
            throw new Error("Token không được lưu thành công");
          }
        } catch (err) {
          console.error("Redirect error:", err);
          // Still redirect even if check failed - token is saved
          window.location.href = "/dashboard";
        }
      };

      // Start redirect process immediately
      handleRedirect();
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // If already logged in, show logout option instead
  if (isLoggedIn && !isChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden transform transition-all duration-300 scale-100 border border-gray-100">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 px-10 py-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/25 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">
                    Bạn đã đăng nhập
                  </h2>
                  <p className="text-sm text-white/90 mt-1 font-medium">
                    Tài khoản đang hoạt động
                  </p>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
          </div>

          <div className="px-10 py-8 bg-gradient-to-b from-white to-gray-50/50">
            <div className="mb-6 rounded-xl bg-blue-50 border-l-4 border-blue-500 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-blue-800 font-medium leading-relaxed">
                  Bạn đã đăng nhập rồi. Vui lòng đăng xuất trước khi đăng nhập lại với tài khoản khác.
                </p>
              </div>
            </div>

            <Button
              variant="danger"
              className="w-full bg-gradient-to-r from-red-600 via-pink-600 to-red-600 hover:from-red-700 hover:via-pink-700 hover:to-red-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-base tracking-wide"
              onClick={handleLogout}
            >
              Đăng xuất ngay
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden transform transition-all duration-300 scale-100 border border-gray-100">
        {/* Header với gradient */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-10 py-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/25 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  Đăng nhập
                </h2>
                <p className="text-sm text-white/90 mt-1 font-medium">
                  Chào mừng bạn trở lại hệ thống
                </p>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
        </div>

        {/* Body */}
        <div className="px-10 py-8 bg-gradient-to-b from-white to-gray-50/50">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border-l-4 border-red-500 p-4 transition-all duration-200 shadow-sm">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div className="space-y-2.5">
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-gray-800 tracking-wide"
              >
                Tên đăng nhập
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-indigo-600">
                  <svg
                    className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="Nhập tên đăng nhập của bạn"
                  required
                  autoFocus
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 shadow-sm hover:border-gray-300 font-medium"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && formData.username && !formData.password) {
                      e.preventDefault();
                      passwordInputRef.current?.focus();
                    }
                  }}
                />
              </div>
            </div>

            {/* Password Input với show/hide */}
            <div className="space-y-2.5">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-800 tracking-wide"
              >
                Mật khẩu
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-indigo-600">
                  <svg
                    className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Nhập mật khẩu của bạn"
                  required
                  className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 shadow-sm hover:border-gray-300 font-medium"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && formData.username && formData.password && !isLoading) {
                      e.preventDefault();
                      const form = e.currentTarget.closest('form');
                      if (form) {
                        form.requestSubmit();
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-indigo-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-r-xl"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.29 3.29L12 12m-3.59-3.59l3.29 3.29M12 12l3.29 3.29m0 0a9.97 9.97 0 002.12 2.12m-3.29-3.29L12 12m3.59 3.59l-3.29-3.29M12 12l-3.29-3.29"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-base tracking-wide"
                isLoading={isLoading}
                disabled={isChecking}
              >
                {isLoading ? "Đang xử lý..." : "Đăng nhập"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

