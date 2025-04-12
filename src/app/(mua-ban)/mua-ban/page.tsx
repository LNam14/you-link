"use client"

import { useEffect, useState } from "react"
import getUserInfo from "@/components/userInfo"
import PageBody from "./components/PageBody"

export default function MuaBanPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userInfo = getUserInfo()
    setUser(userInfo)
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  // Only render PageBody for Admin or Khách hàng roles
  if (user && (user.role === "Admin" || user.role === "Khách hàng")) {
    return <PageBody supplierName={null} />
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Không có quyền truy cập</h1>
      <p>Bạn không có quyền xem trang này.</p>
    </div>
  )
}

