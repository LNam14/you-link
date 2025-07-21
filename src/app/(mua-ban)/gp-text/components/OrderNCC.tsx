"use client"
import { useEffect, useState, useMemo } from "react"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import "../style.css"
import { ref, onValue } from "firebase/database"
import { database } from "@/app/firebase/firebase"
import PageBody from "./DetailOrder"

type NCCPageProps = { supplierName: string }

export default function NCCPage({ supplierName }: NCCPageProps) {
    const [filteredOrders, setFilteredOrders] = useState<any[]>([])
    const [allDetails, setAllDetails] = useState<any[]>([])
    const [filterType, setFilterType] = useState<"week" | "month">("week")
    const [selectedWeek, setSelectedWeek] = useState<string>("")
    const [selectedMonth, setSelectedMonth] = useState<string>("")

    // Hàm lấy số tuần từ ngày
    const getWeekNumber = (dateStr: string) => {
        const [day, month, year] = dateStr.split("/").map(Number)
        const date = new Date(year, month - 1, day)
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    }

    const getWeekRange = (dateStr: string) => {
        if (!dateStr) return ""
        return `Tuần ${getWeekNumber(dateStr)}`
    }

    const getMonthRange = (dateStr: string) => {
        if (!dateStr) return ""
        const [day, month] = dateStr.split("/")
        return `Tháng ${month}`
    }

    // Lấy tất cả chi tiết đơn hàng của NCC này
    useEffect(() => {
        const ordersRef = ref(database, "orders")
        onValue(ordersRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val()
                let ordersArray = Array.isArray(data) ? data : Object.values(data)
                // Lọc bỏ các orders có Status === 'Hủy'
                ordersArray = ordersArray.filter((order: any) => order.Status !== "Hủy")
                // Lọc tất cả ChiTietDonHang có TenNCC === supplierName
                const details: any = []
                ordersArray.forEach((order, orderIdx) => {
                    if (Array.isArray(order.ChiTietDonHang)) {
                        order.ChiTietDonHang.forEach((detail: any, idx: number) => {
                            if (detail.TenNCC === supplierName) {
                                details.push({ ...detail, _dbIndex: idx, _parentIndex: orderIdx })
                            }
                        })
                    }
                })
                setAllDetails(details)
            } else {
                setAllDetails([])
            }
        })
    }, [supplierName])

    // Lấy danh sách tuần/tháng duy nhất từ allDetails
    const uniqueWeeks = useMemo(() => {
        const weeks = new Set<string>()
        allDetails.forEach((item: any) => {
            if (item.NgayBan) weeks.add(getWeekRange(item.NgayBan))
        })
        return Array.from(weeks).filter(Boolean).sort()
    }, [allDetails])

    const uniqueMonths = useMemo(() => {
        const months = new Set<string>()
        allDetails.forEach((item: any) => {
            if (item.NgayBan) months.add(getMonthRange(item.NgayBan))
        })
        return Array.from(months).filter(Boolean).sort()
    }, [allDetails])

    // Set giá trị tuần/tháng mặc định khi đổi loại filter hoặc khi allDetails thay đổi
    useEffect(() => {
        if (filterType === "week") {
            setSelectedWeek(uniqueWeeks[uniqueWeeks.length - 1] || "")
        } else {
            setSelectedMonth(uniqueMonths[uniqueMonths.length - 1] || "")
        }
    }, [filterType, uniqueWeeks, uniqueMonths])

    // Lọc dữ liệu theo tuần/tháng
    useEffect(() => {
        // Ẩn các đơn có TinhTrangKH hoặc TinhTrangNCC bắt đầu bằng 'Hủy', hoặc TinhTrangKH rỗng hoặc 'Chưa nhập'
        let filtered = allDetails.filter((item: any) => {
            const kh = typeof item.TinhTrangKH === "string" ? item.TinhTrangKH : ""
            const ncc = typeof item.TinhTrangNCC === "string" ? item.TinhTrangNCC : ""
            return !kh.startsWith("Hủy") && !ncc.startsWith("Hủy") && kh !== "" && kh !== "Chưa nhập"
        })

        if (filterType === "week" && selectedWeek) {
            filtered = filtered.filter((item: any) => {
                const isGP = item.Loai === "GP"
                const dateStr = isGP ? item.NgayKT : item.NgayBan
                if (!dateStr) {
                    const now = new Date()
                    const day = String(now.getDate()).padStart(2, "0")
                    const month = String(now.getMonth() + 1).padStart(2, "0")
                    const year = now.getFullYear()
                    const currentDateStr = `${day}/${month}/${year}`
                    const currentWeek = getWeekRange(currentDateStr)
                    return selectedWeek === currentWeek
                }
                const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
                if (!dateRegex.test(dateStr)) {
                    const now = new Date()
                    const day = String(now.getDate()).padStart(2, "0")
                    const month = String(now.getMonth() + 1).padStart(2, "0")
                    const year = now.getFullYear()
                    const currentDateStr = `${day}/${month}/${year}`
                    const currentWeek = getWeekRange(currentDateStr)
                    return selectedWeek === currentWeek
                }
                return getWeekRange(dateStr) === selectedWeek
            })

            const now = new Date()
            const day = String(now.getDate()).padStart(2, "0")
            const month = String(now.getMonth() + 1).padStart(2, "0")
            const year = now.getFullYear()
            const currentDateStr = `${day}/${month}/${year}`
            const currentWeek = getWeekRange(currentDateStr)
            if (selectedWeek === currentWeek) {
                const invalids = allDetails
                    .filter((item: any) => {
                        if (!item.NgayBan) return true
                        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
                        if (!dateRegex.test(item.NgayBan)) return true
                        return false
                    })
                    .filter((item: any) => {
                        const kh = typeof item.TinhTrangKH === "string" ? item.TinhTrangKH : ""
                        const ncc = typeof item.TinhTrangNCC === "string" ? item.TinhTrangNCC : ""
                        return !kh.startsWith("Hủy đơn") && !ncc.startsWith("Hủy đơn") && kh !== "" && kh !== "Chưa nhập"
                    })
                const ids = new Set(filtered.map((i: any) => i._dbIndex + "-" + i._parentIndex))
                filtered = [...filtered, ...invalids.filter((i: any) => !ids.has(i._dbIndex + "-" + i._parentIndex))]
            }
        } else if (filterType === "month" && selectedMonth) {
            filtered = filtered.filter((item: any) => {
                const isGP = item.Loai === "GP"
                const dateStr = isGP ? item.NgayKT : item.NgayBan
                if (!dateStr) {
                    const now = new Date()
                    const day = String(now.getDate()).padStart(2, "0")
                    const month = String(now.getMonth() + 1).padStart(2, "0")
                    const year = now.getFullYear()
                    const currentDateStr = `${day}/${month}/${year}`
                    const currentMonth = getMonthRange(currentDateStr)
                    return selectedMonth === currentMonth
                }
                const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
                if (!dateRegex.test(dateStr)) {
                    const now = new Date()
                    const day = String(now.getDate()).padStart(2, "0")
                    const month = String(now.getMonth() + 1).padStart(2, "0")
                    const year = now.getFullYear()
                    const currentDateStr = `${day}/${month}/${year}`
                    const currentMonth = getMonthRange(currentDateStr)
                    return selectedMonth === currentMonth
                }
                return getMonthRange(dateStr) === selectedMonth
            })

            const now = new Date()
            const day = String(now.getDate()).padStart(2, "0")
            const month = String(now.getMonth() + 1).padStart(2, "0")
            const year = now.getFullYear()
            const currentDateStr = `${day}/${month}/${year}`
            const currentMonth = getMonthRange(currentDateStr)
            if (selectedMonth === currentMonth) {
                const invalids = allDetails
                    .filter((item: any) => {
                        if (!item.NgayBan) return true
                        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
                        if (!dateRegex.test(item.NgayBan)) return true
                        return false
                    })
                    .filter((item: any) => {
                        const kh = typeof item.TinhTrangKH === "string" ? item.TinhTrangKH : ""
                        const ncc = typeof item.TinhTrangNCC === "string" ? item.TinhTrangNCC : ""
                        return !kh.startsWith("Hủy đơn") && !ncc.startsWith("Hủy đơn") && kh !== "" && kh !== "Chưa nhập"
                    })
                const ids = new Set(filtered.map((i: any) => i._dbIndex + "-" + i._parentIndex))
                filtered = [...filtered, ...invalids.filter((i: any) => !ids.has(i._dbIndex + "-" + i._parentIndex))]
            }
        }
        setFilteredOrders(filtered)
    }, [allDetails, filterType, selectedWeek, selectedMonth])

    return (
        <div className="space-y-3">
            {/* Beautiful Compact Filter Section */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 shadow-sm">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Left Section - Filter Controls */}
                        <div className="flex items-center gap-8">
                            {/* Filter Title with Icon */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Bộ lọc</h3>
                                    <p className="text-sm text-slate-500">Lọc đơn hàng theo thời gian</p>
                                </div>
                            </div>

                            {/* Time Period Selection */}
                            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                                <label
                                    className={`flex items-center px-4 py-2 rounded-md cursor-pointer transition-all duration-200 ${filterType === "week" ? "bg-blue-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="filterType"
                                        value="week"
                                        checked={filterType === "week"}
                                        onChange={() => setFilterType("week")}
                                        className="sr-only"
                                    />
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                    <span className="font-medium">Tuần</span>
                                </label>
                                <label
                                    className={`flex items-center px-4 py-2 rounded-md cursor-pointer transition-all duration-200 ${filterType === "month" ? "bg-blue-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="filterType"
                                        value="month"
                                        checked={filterType === "month"}
                                        onChange={() => setFilterType("month")}
                                        className="sr-only"
                                    />
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                        />
                                    </svg>
                                    <span className="font-medium">Tháng</span>
                                </label>
                            </div>

                            {/* Period Selector */}
                            <div className="relative">
                                <select
                                    value={filterType === "week" ? selectedWeek : selectedMonth}
                                    onChange={(e) => {
                                        if (filterType === "week") {
                                            setSelectedWeek(e.target.value)
                                        } else {
                                            setSelectedMonth(e.target.value)
                                        }
                                    }}
                                    className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2.5 pr-10 text-sm font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all cursor-pointer hover:border-slate-300"
                                >
                                    {(filterType === "week" ? [...uniqueWeeks].reverse() : [...uniqueMonths].reverse()).map((period) => (
                                        <option key={period} value={period}>
                                            {period}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Right Section - Info */}
                        <div className="flex items-center gap-6">
                            {/* Supplier Info */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-600">NCC:</span>
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-bold text-emerald-700">{supplierName}</span>
                                </div>
                            </div>

                            {/* Order Count */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-600">Hiển thị:</span>
                                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg px-4 py-2 shadow-sm">
                                    <span className="text-lg font-bold">{filteredOrders.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <PageBody supplierName={supplierName} order={filteredOrders} hiddenColumns={[6, 11]} />
            </div>
        </div>
    )
}
