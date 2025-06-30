"use client"

import { useEffect, useState, type FormEvent, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import getUserInfo from "@/components/userInfo"
import PageBody from "./components/DetailOrder"
import { Loader2, ShieldAlert, LogIn, Eye, EyeOff } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import OrdersTable from "./components/OrdersTable"
import OrderNCC from "./components/OrderNCC"
import { message } from "antd"
import authApiRequest from "@/apiRequests/auth"

interface FormData {
  username: string
  password: string
}

interface FormErrors {
  username: string
  password: string
}

export default function MuaBanPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
  })
  const [errors, setErrors] = useState<FormErrors>({
    username: "",
    password: "",
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userInfo = getUserInfo()
        setUser(userInfo)
      } catch (error) {
        console.error("Error fetching user info:", error)
      } finally {
        // Add a small delay to prevent flash of loading state
        setTimeout(() => setLoading(false), 600)
      }
    }

    fetchUserData()
  }, [])

  /**
   * Handle input field changes
   */
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error when user types
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    let isValid = true
    const newErrors = { ...errors }

    // Validate username
    if (!formData.username.trim()) {
      newErrors.username = "Vui lòng nhập họ và tên!"
      isValid = false
    }

    // Validate password
    if (!formData.password.trim()) {
      newErrors.password = "Vui lòng nhập mật khẩu!"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setLoginLoading(true)
      const result: any = await authApiRequest.login({
        username: formData.username,
        password: formData.password,
      })

      if (result.success) {
        message.success("Đăng nhập thành công!")

        // Refresh user data after successful login
        const userInfo = getUserInfo()
        setUser(userInfo)

        // Clear form
        setFormData({ username: "", password: "" })
      } else {
        message.error(result.message || "Tài khoản hoặc mật khẩu không đúng!")
      }
    } catch (error) {
      console.error("Login error :", error)
      message.error("Có lỗi xảy ra khi đăng nhập!")
    } finally {
      setLoginLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center p-8 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-lg"
        >
          <div className="relative">
            <Loader2 className="h-14 w-14 animate-spin text-primary mx-auto mb-5" />
            <div className="absolute inset-0 animate-pulse opacity-30 blur-xl bg-primary rounded-full" />
          </div>
          <h3 className="text-xl font-medium text-slate-700 dark:text-slate-200">Đang tải dữ liệu</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Hệ thống đang xử lý yêu cầu của bạn...</p>
        </motion.div>
      </div>
    )
  }

  // Check if user has one of the required roles: Admin, NCC, or Khách hàng
  if (!user || !["Admin", "NCC", "Khách hàng", "Nhân viên"].includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700"
        >
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">Quyền truy cập bị từ chối</h2>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                  Bạn không có quyền truy cập vào trang này
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#0d3b6e] text-center mb-2">
                Chào mừng đến với <span className="text-[#ff6600]">You Link</span>
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-center text-sm">
                Để sử dụng tính năng này, bạn cần đăng nhập với tài khoản có quyền truy cập phù hợp.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username"
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#0d3b6e] dark:bg-slate-700 dark:border-slate-600 dark:text-white ${errors.username ? "border-red-500" : "border-gray-300 dark:border-slate-600"
                    }`}
                />
                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#0d3b6e] dark:bg-slate-700 dark:border-slate-600 dark:text-white ${errors.password ? "border-red-500" : "border-gray-300 dark:border-slate-600"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 px-4 bg-gradient-to-t from-blue-600 to-blue-500 text-white font-medium rounded-md shadow hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
                aria-label="Đăng nhập"
              >
                {loginLoading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Đang xử lý...
                  </div>
                ) : (
                  "Đăng nhập"
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                className="text-sm text-gray-700 dark:text-gray-300 underline hover:no-underline hover:text-blue-600 transition-colors"
                href="/reset-password"
              >
                Quên mật khẩu?
              </Link>
              <div className="mt-2">
                Chưa có tài khoản?{" "}
                <Link className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors" href="/register">
                  Đăng ký ngay
                </Link>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6">
              Nếu bạn đã đăng nhập nhưng vẫn gặp vấn đề, vui lòng liên hệ với quản trị viên để được hỗ trợ.
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  // Only render PageBody for users with appropriate roles
  if (user?.role === "NCC") {
    return <OrderNCC supplierName={user?.username} />
  }
  return (
    <OrdersTable />
  )
}
