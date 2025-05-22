"use client"

import { useState, useEffect, useMemo } from "react"
import moment from "moment"
import "moment/locale/vi"
import { ChevronLeft, ChevronRight, Calendar, User, CheckCircle, DollarSign, Coins, Table } from "lucide-react"
import auth from "@/apiRequests/attendance"
import getUserInfo from "@/components/userInfo"
import { toast, Toaster } from "sonner"
import authApiRequest from "@/apiRequests/auth"

// Định nghĩa kiểu dữ liệu cho bản ghi chấm công
interface AccountRecord {
    username: string
    date: string
}

export default function AccountTracker() {
    // Thiết lập locale tiếng Việt cho moment
    useEffect(() => {
        moment.locale("vi")
    }, [])

    const [currentMonth, setCurrentMonth] = useState(moment())
    const [allAccountData, setAllAccountData] = useState<AccountRecord[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedUsername, setSelectedUsername] = useState<string>("")
    const [uniqueUsernames, setUniqueUsernames] = useState<string[]>([])
    const today = moment().format("YYYY-MM-DD")
    const userInfo = getUserInfo()
    const username = userInfo?.username
    const role = userInfo?.role
    const dailyRate = 302 // Mức lương hàng ngày
    const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar')

    // const fetchAccountData = async () => {
    //     try {
    //         setIsLoading(true)
    //         setError(null)
    //         const response = await authApiRequest.fetchData()
    //         console.log(response)

    //     } catch (error: any) {
    //         console.error("Error fetching attendance data:", error)
    //         toast.error(error.response?.data?.error || "Có lỗi xảy ra khi tải dữ liệu điểm danh")
    //     } finally {
    //         setIsLoading(false)
    //     }
    // }
    // useEffect(() => {
    //     fetchAccountData()
    // }, [])

    return (
        <div className="min-h-screen py-6 px-4">
            <Toaster position="top-right" expand={true} richColors />
            {isLoading && !allAccountData.length && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-700 font-medium">Đang tải dữ liệu...</p>
                    </div>
                </div>
            )}
            <div className="w-full max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-t-xl shadow-xl overflow-hidden border border-blue-100">
                    <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Calendar className="h-6 w-6" />
                                Quản Lý Tài Khoản
                            </h2>

                        </div>
                    </div>

                </div>


            </div>
        </div>
    )
}
