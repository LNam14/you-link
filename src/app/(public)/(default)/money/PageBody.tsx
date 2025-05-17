"use client"

import { useState, useEffect } from "react"
import moment from "moment"
import "moment/locale/vi"
import moneyApiRequest from "@/apiRequests/money"
import { toast, Toaster } from "sonner"
import {
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Users,
    Coins,
    BarChart4,
    Wallet,
    Calculator,
    Calendar,
    List,
} from "lucide-react"

export default function AttendanceTracker() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState<string>("")
    const [currentMonth, setCurrentMonth] = useState(moment())

    // Thiết lập locale tiếng Việt cho moment
    useEffect(() => {
        moment.locale("vi")
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const response = await moneyApiRequest.get()
            if (response.data) {
                setData(response.data)
                // Set default selected month to the most recent month
                if (response.data.length > 0) {
                    const firstMonth = Object.keys(response.data[0])[0]
                    setSelectedMonth(firstMonth)
                    setCurrentMonth(moment(firstMonth))
                }
            }
        } catch (error) {
            toast.error("Không thể tải dữ liệu")
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount)
    }

    const sortEmployees = (employees: [string, any][]) => {
        return employees.sort((a, b) => {
            const numA = Number.parseInt(a[0].replace("BH", ""))
            const numB = Number.parseInt(b[0].replace("BH", ""))
            return numA - numB
        })
    }

    const previousMonth = () => {
        const newMonth = moment(currentMonth).subtract(1, "month")
        const monthKey = newMonth.format("YYYY-MM")
        if (data.some((monthData) => Object.keys(monthData)[0] === monthKey)) {
            setCurrentMonth(newMonth)
            setSelectedMonth(monthKey)
        }
    }

    const nextMonth = () => {
        const newMonth = moment(currentMonth).add(1, "month")
        const monthKey = newMonth.format("YYYY-MM")
        if (data.some((monthData) => Object.keys(monthData)[0] === monthKey)) {
            setCurrentMonth(newMonth)
            setSelectedMonth(monthKey)
        }
    }

    const refreshData = async () => {
        setLoading(true)
        await fetchData()
        toast.success("Dữ liệu đã được cập nhật")
        setLoading(false)
    }

    const getSelectedMonthData = () => {
        if (!selectedMonth) return null
        return data.find((monthData) => Object.keys(monthData)[0] === selectedMonth)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-6 px-4">
            <Toaster position="top-right" expand={true} richColors />

            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-blue-100">
                    <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Coins className="h-6 w-6" />
                                Bảng Lương và Thưởng
                            </h2>

                            <button
                                onClick={refreshData}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 shadow-md"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Làm mới dữ liệu
                            </button>
                        </div>
                    </div>

                    {/* Month Navigation */}
                    <div className="bg-gradient-to-r from-blue-100 to-blue-100 px-6 py-2">
                        <div className="flex items-center justify-between">
                            <button
                                className="p-2 rounded-full bg-white/70 hover:bg-white transition-colors text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
                                onClick={previousMonth}
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                            <h2 className="text-lg md:text-xl font-bold text-blue-800 capitalize flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                {currentMonth.format("MMMM YYYY")}
                            </h2>
                            <button
                                className="p-2 rounded-full bg-white/70 hover:bg-white transition-colors text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
                                onClick={nextMonth}
                            >
                                <ChevronRight className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        (() => {
                            const monthData = getSelectedMonthData()
                            if (!monthData) return null

                            const month = Object.keys(monthData)[0]
                            const monthInfo = monthData[month]
                            const employees = sortEmployees(Object.entries(monthInfo))

                            return (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full bg-white">
                                        <thead>
                                            <tr className="bg-blue-600 text-white">
                                                <th className="px-6 py-4 border-b border-blue-500 text-left text-xs font-medium uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <List className="h-4 w-4" />
                                                        <span>STT</span>
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 border-b border-blue-500 text-left text-xs font-medium uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4" />
                                                        <span>Tên NV</span>
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 border-b border-blue-500 text-left text-xs font-medium uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <BarChart4 className="h-4 w-4" />
                                                        <span>Vòng quay</span>
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 border-b border-blue-500 text-left text-xs font-medium uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Wallet className="h-4 w-4" />
                                                        <span>Lương</span>
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 border-b border-blue-500 text-left text-xs font-medium uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Calculator className="h-4 w-4" />
                                                        <span>Tổng tiền</span>
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-indigo-50">
                                            {employees.map(([username, info]: [string, any], index) => {
                                                // Calculate total
                                                const total = info.wheel + info.wage

                                                return (
                                                    <tr
                                                        key={username}
                                                        className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-blue-50"}`}
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{index + 1}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-800">
                                                            {username}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                            {formatCurrency(info.wheel)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                            {formatCurrency(info.wage)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-700 bg-blue-50/50 rounded-lg">
                                                            <div className="flex items-center gap-1">
                                                                <Coins className="h-4 w-4 text-blue-500" />
                                                                {formatCurrency(total)}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        })()
                    )}
                </div>
            </div>
        </div>
    )
}
