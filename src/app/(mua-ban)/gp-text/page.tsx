"use client"

import { useEffect, useState } from "react"
import getUserInfo from "@/components/userInfo"
import PageBody from "./components/PageBody"
import { Loader2, ShieldAlert, LogIn } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import OrdersTable from "./components/OrdersTable"

export default function MuaBanPage() {
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
            <p className="text-slate-600 dark:text-slate-300 text-center mb-6">
              Để sử dụng tính năng này, bạn cần đăng nhập với tài khoản có quyền truy cập phù hợp (Admin, Nhà cung cấp
              hoặc Khách hàng).
            </p>
            <div className="flex justify-center">
              <Link href="/login" className="flex items-center bg-primary hover:bg-primary/80 text-white gap-2 px-6 py-2 rounded-md">
                <LogIn className="h-4 w-4" />
                <span>Đăng nhập</span>
              </Link>
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
  return (
    <OrdersTable />
  )
}
