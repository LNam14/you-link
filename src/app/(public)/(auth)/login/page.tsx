"use client"

import { useState, type FormEvent, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { message } from "antd"
import authApiRequest from "@/apiRequests/auth"
import { Eye, EyeOff } from "lucide-react"

interface FormData {
  username: string
  password: string
}

interface FormErrors {
  username: string
  password: string
}

export default function SignIn() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
  })
  const [errors, setErrors] = useState<FormErrors>({
    username: "",
    password: "",
  })

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
      setLoading(true)
      const result: any = await authApiRequest.login({
        username: formData.username,
        password: formData.password,
      })

      if (result.success) {
        message.success("Đăng nhập thành công!")

        // Redirect to home page after successful login
        setTimeout(() => {
          router.push("/")
        }, 1000)
      } else {
        message.error(result.message || "Tài khoản hoặc mật khẩu không đúng!")
      }
    } catch (error) {
      console.error("Login error :", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[#0d3b6e]">
          Chào mừng đến với <span className="text-[#ff6600] text-5xl">You Link</span>
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            placeholder="Username"
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#0d3b6e] ${errors.username ? "border-red-500" : "border-gray-300"
              }`}
          />
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
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#0d3b6e] ${errors.password ? "border-red-500" : "border-gray-300"
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-t from-blue-600 to-blue-500 text-white font-medium rounded-md shadow hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
          aria-label="Đăng nhập"
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
            "Đăng nhập"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          className="text-sm text-gray-700 underline hover:no-underline hover:text-blue-600 transition-colors"
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
    </>
  )
}

