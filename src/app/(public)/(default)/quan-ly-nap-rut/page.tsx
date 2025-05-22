"use client"

import { useEffect, useState } from "react"
import getUserInfo from "@/components/userInfo"
import PageBody from "./PageBody"
import { Loader2, ShieldAlert, LogIn } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

export default function SitesPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  // Check if user is not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700"
        >
          <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <LogIn className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-400">Vui lòng đăng nhập</h2>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mt-1">
                  Bạn cần đăng nhập để truy cập trang này
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <p className="text-slate-600 dark:text-slate-300 text-center mb-6">
              Tính năng này yêu cầu người dùng phải đăng nhập. Vui lòng đăng nhập bạn để tiếp tục.
            </p>
            <div className="flex justify-center">
              <Link href="/login" className="flex items-center bg-primary hover:bg-primary/80 text-white gap-2 px-6 py-2 rounded-md">
                <LogIn className="h-4 w-4" />
                <span>Đăng nhập</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // Check if user doesn't have required role
  if (user.role !== "Admin") {
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
                  Bạn không có quyền truy cập vào đường dẫn này
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <p className="text-slate-600 dark:text-slate-300 text-center mb-6">
              Tài khoản của bạn không có quyền truy cập vào trang này. Vui lòng liên hệ với quản trị viên để được hỗ trợ.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6">
              Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ với quản trị viên để được hỗ trợ.
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  // Only render PageBody for users with appropriate roles
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
    >
      <PageBody />
    </motion.div>
  )
} 