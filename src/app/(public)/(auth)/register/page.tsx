"use client"

import { useState, type FormEvent, type ChangeEvent, useEffect } from "react"
import { useRouter } from "next/navigation"
import { message } from "antd"
import moment from "moment"
import authApiRequest from "@/apiRequests/auth"
import { motion } from "framer-motion"
import { Loader2, UserPlus, Eye, EyeOff } from "lucide-react"

interface FormData {
  telegram: string
  username: string
  password: string
  repassword: string
}

interface FormErrors {
  telegram: string
  username: string
  password: string
  repassword: string
}

// Configuration constants
const TELEGRAM_BOT_TOKEN =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || "8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U"
const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || "-1002574745707"

export default function SignUp() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isUsernameLoading, setIsUsernameLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showRePassword, setShowRePassword] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    telegram: "",
    username: "",
    password: "",
    repassword: "",
  })
  const [errors, setErrors] = useState<FormErrors>({
    telegram: "",
    username: "",
    password: "",
    repassword: "",
  })

  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        setIsUsernameLoading(true)
        // Add timestamp to prevent caching
        const result: any = await authApiRequest.getCount()
        if (result && result.success) {
          const customerCount = result.count || 0
          setCount(customerCount)
          setFormData((prev) => ({
            ...prev,
            username: `KH${customerCount + 1}`,
          }))
        }
      } catch (error) {
        console.error("Error fetching customer count:", error)
        message.error("Không thể tạo username tự động. Vui lòng thử lại sau.")
      } finally {
        setIsUsernameLoading(false)
      }
    }

    fetchCount()
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

    // Validate telegram
    if (!formData.telegram.trim()) {
      newErrors.telegram = "Vui lòng nhập telegram"
      isValid = false
    } else if (!formData.telegram.startsWith("@") && !formData.telegram.includes("t.me/")) {
      newErrors.telegram = "Telegram phải bắt đầu bằng @ hoặc chứa t.me/"
      isValid = false
    }

    // Validate password
    if (!formData.password.trim()) {
      newErrors.password = "Vui lòng nhập mật khẩu!"
      isValid = false
    } else if (formData.password.length < 3) {
      newErrors.password = "Mật khẩu phải có ít nhất 3 ký tự!"
      isValid = false
    }

    // Validate password confirmation
    if (!formData.repassword.trim()) {
      newErrors.repassword = "Vui lòng xác nhận mật khẩu!"
      isValid = false
    } else if (formData.password !== formData.repassword) {
      newErrors.repassword = "Mật khẩu xác nhận không khớp!"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  /**
   * Send Telegram notification
   */
  const sendTelegramNotification = async (username: string, telegram: string): Promise<boolean> => {
    try {
      // Create message text with user's username and telegram handle
      const messageText = `${username} đã tạo tài khoản, vui lòng liên hệ ${telegram} để tạo nhóm`

      // Send message via Telegram API
      const url = `https://ylink.qctl44.workers.dev/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
      const params = new URLSearchParams({
        chat_id: TELEGRAM_CHAT_ID,
        text: messageText,
      })

      const response = await fetch(`${url}?${params.toString()}`)
      const responseData = await response.json()

      if (responseData.ok) {
        console.log("Telegram notification sent successfully")
        return true
      } else {
        console.error(`Failed to send Telegram notification: ${responseData.description}`)
        return false
      }
    } catch (error) {
      console.error("Error sending Telegram notification:", error)
      return false
    }
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setLoading(true)
      const data: any = [
        {
          role: "Khách hàng",
          telegram: formData.telegram,
          username: formData.username,
          password: formData.password,
          active: "Hoạt động",
        },
      ]

      const result: any = await authApiRequest.save(data)

      if (result && result.success) {
        message.success(result.message || "Đăng ký thành công!")

        // Send Telegram notification after successful registration
        await sendTelegramNotification(formData.username, formData.telegram)

        // Reset form
        setFormData({
          telegram: "",
          username: "",
          password: "",
          repassword: "",
        })

        router.push("/login")
      } else {
        message.error(result?.message || "Đăng ký không thành công. Vui lòng thử lại.")
      }
    } catch (error: any) {
      console.error("Registration error:", error)
      message.error(error?.response?.data?.message || "Đăng ký không thành công. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[#ff6807]">Tạo tài khoản</h1>
        <span className="text-[#023469] font-bold text-5xl">You Link</span>
      </div>

      {isUsernameLoading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <motion.div
            className="flex items-center justify-center relative"
            animate={{ rotate: 360 }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2, ease: "linear" }}
          >
            <div className="absolute animate-ping rounded-full bg-[#023469] w-14 h-14 opacity-20" />
            <Loader2 className="h-10 w-10 text-[#023469]" strokeWidth={2.5} />
          </motion.div>

          <div className="flex items-center gap-2 text-lg text-gray-600">
            <UserPlus className="h-5 w-5 text-[#023469]" />
            <span>Đang khởi tạo Username mới...</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              placeholder="Username"
              disabled
              onClick={() => message.info("Username không thể thay đổi")}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#023469] ${errors.username ? "border-red-500" : "border-gray-300"
                } bg-gray-100 cursor-not-allowed`}
            />
            <p className="text-sm text-gray-500 italic">Username được tạo tự động và không thể thay đổi</p>
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#023469] ${errors.password ? "border-red-500" : "border-gray-300"
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="repassword" className="block text-sm font-medium text-gray-700">
              Xác nhận Password
            </label>
            <div className="relative">
              <input
                id="repassword"
                name="repassword"
                type={showRePassword ? "text" : "password"}
                value={formData.repassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#023469] ${errors.repassword ? "border-red-500" : "border-gray-300"
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowRePassword(!showRePassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showRePassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.repassword && <p className="text-red-500 text-xs mt-1">{errors.repassword}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="telegram" className="block text-sm font-medium text-gray-700">
              Telegram
            </label>
            <input
              id="telegram"
              name="telegram"
              type="text"
              value={formData.telegram}
              onChange={handleChange}
              placeholder="@account"
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#023469] ${errors.telegram ? "border-red-500" : "border-gray-300"
                }`}
            />
            {errors.telegram && <p className="text-red-500 text-xs mt-1">{errors.telegram}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-t from-blue-600 to-blue-500 text-white font-medium rounded-md shadow hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
            aria-label="Đăng ký"
          >
            {loading ? (
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
              "Đăng ký"
            )}
          </button>

          {/* Bottom link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Bằng việc đăng ký, bạn đồng ý với{" "}
              <a
                className="whitespace-nowrap font-medium text-gray-700 underline hover:no-underline hover:text-blue-600 transition-colors"
                href="#0"
              >
                Điều khoản dịch vụ
              </a>{" "}
              và{" "}
              <a
                className="whitespace-nowrap font-medium text-gray-700 underline hover:no-underline hover:text-blue-600 transition-colors"
                href="#0"
              >
                Chính sách bảo mật
              </a>
              .
            </p>
          </div>
        </form>
      )}
    </>
  )
}
