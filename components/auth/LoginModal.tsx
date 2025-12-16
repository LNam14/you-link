"use client";

import { useState, FormEvent, useEffect } from "react";
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("auth-token");
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
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Đăng nhập thất bại");
      }

      // Lưu token vào localStorage
      if (data.data?.token) {
        console.log("Saving token to localStorage");
        localStorage.setItem("auth-token", data.data.token);
        console.log("Token saved");
        
        // Trigger storage event để useAuth hook có thể detect token mới
        window.dispatchEvent(new StorageEvent("storage", {
          key: "auth-token",
          newValue: data.data.token,
          storageArea: localStorage,
        }));
      } else {
        console.error("No token in response:", data);
        throw new Error("Không nhận được token từ server");
      }

      // Reset form
      setFormData({ username: "", password: "" });
      setError("");

      // Close modal
      onClose();

      // Wait a bit to ensure token is saved and useAuth has time to check, then redirect
      setTimeout(() => {
        console.log("Redirecting to dashboard");
        // Use window.location.href instead of router.push to ensure full page reload
        // This ensures useAuth hook will check auth again
        window.location.href = "/dashboard";
      }, 300);
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ username: "", password: "" });
    setError("");
    setIsLoggedIn(false);
    onClose();
  };

  if (!isOpen) return null;

  // If already logged in, show logout option instead
  if (isLoggedIn && !isChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Bạn đã đăng nhập
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mb-6 rounded-md bg-blue-50 p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              Bạn đã đăng nhập rồi. Vui lòng đăng xuất trước khi đăng nhập lại với tài khoản khác.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleLogout}
            >
              Đăng xuất ngay
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Đóng
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Đăng nhập
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tên đăng nhập"
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            placeholder="Nhập tên đăng nhập"
            required
            autoFocus
          />

          <Input
            label="Mật khẩu"
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            placeholder="Nhập mật khẩu"
            required
          />

          <div className="flex gap-2 pt-2">
            <Button 
              type="submit" 
              className="flex-1" 
              isLoading={isLoading}
              disabled={isChecking}
            >
              Đăng nhập
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading || isChecking}
            >
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

