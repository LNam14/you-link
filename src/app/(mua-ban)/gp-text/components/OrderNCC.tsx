"use client"
import { useEffect, useState, useMemo } from "react"
import { HelpCircle, X, MousePointer, Link, MessageSquare, XCircle } from "lucide-react"
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
    const [showGuideModal, setShowGuideModal] = useState(false)

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

    // Calculate total money for filtered orders
    const totalMoney = useMemo(() => {
        const includedOrderCodes: string[] = [];
        const total = filteredOrders.reduce((sum, item) => {
            // Chỉ tính các đơn hàng có TinhTrangKH là 'Đã nhập' hoặc 'Đơn OK' và TinhTrangNCC là 'Đã lên bài' hoặc 'Từ chối hủy'
            const kh = typeof item.TinhTrangKH === "string" ? item.TinhTrangKH : ""
            const ncc = typeof item.TinhTrangNCC === "string" ? item.TinhTrangNCC : ""
            const validKH = kh === "Đã nhập" || kh === "Đơn OK"
            const validNCC = ncc === "Đã lên bài" || ncc === "Từ chối hủy"
            if (!validKH || !validNCC) return sum
            if (item.MaDon) includedOrderCodes.push(item.MaDon)
            // Determine price field by type
            let price = 0
            if (item.Loai === "GP") {
                const giaMua = Number(item.GiaMuaGP) || 0;
                const hoaHong = Number(item.HoaHongGP);
                if (isNaN(hoaHong) || hoaHong === 0) {
                    price = Math.round(giaMua);
                } else {
                    price = Math.round(giaMua - (giaMua * hoaHong / 100));
                }
            } else if (item.Loai === "Text") {
                const giaMua = Number(item.GiaMuaText) || 0;
                const hoaHong = Number(item.HoaHongText);
                if (isNaN(hoaHong) || hoaHong === 0) {
                    price = Math.round(giaMua);
                } else {
                    price = Math.round(giaMua - (giaMua * hoaHong / 100));
                }
            } else if (item.Loai === "Text Home") {
                const giaMua = Number(item.GiaMuaTextHome) || 0;
                const hoaHong = Number(item.HoaHongText);
                if (isNaN(hoaHong) || hoaHong === 0) {
                    price = Math.round(giaMua);
                } else {
                    price = Math.round(giaMua - (giaMua * hoaHong / 100));
                }
            } else if (item.Loai === "Text Header") {
                const giaMua = Number(item.GiaMuaTextHeader) || 0;
                const hoaHong = Number(item.HoaHongText);
                if (isNaN(hoaHong) || hoaHong === 0) {
                    price = Math.round(giaMua);
                } else {
                    price = Math.round(giaMua - (giaMua * hoaHong / 100));
                }
            }
            return Math.round(sum + price)
        }, 0)
        console.log("Các mã đơn nằm trong phần totalMoney:", includedOrderCodes)
        return total
    }, [filteredOrders])

    return (
        <div>
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

                        {/* Right Section - Info and Help Button */}
                        <div className="flex items-center gap-6">
                            {/* Total Money - Compact Blue Design */}
                            {/* Supplier Info */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-600">Tổng tiền:</span>
                                <div className="flex items-center gap-4">
                                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg px-4 py-2.5 shadow-sm border border-blue-300 min-w-[140px]">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 16v-4m8-4h-4m-8 0H4"
                                                />
                                            </svg>
                                            <div className="text-center">
                                                <span className="text-lg font-bold text-white">{totalMoney.toLocaleString("vi-VN")}</span>
                                                <span className="text-xs text-white/90 font-medium ml-1">USDT</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Order Count */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-600">Hiển thị:</span>
                                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg px-4 py-2 shadow-sm">
                                    <span className="text-lg font-bold">{filteredOrders.length}</span>
                                </div>
                            </div>

                            {/* Help Button */}
                            <button
                                onClick={() => setShowGuideModal(true)}
                                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2.5 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md transform hover:scale-105"
                            >
                                <HelpCircle className="w-4 h-4" />
                                <span className="font-medium">Hướng dẫn</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <PageBody supplierName={supplierName} order={filteredOrders} hiddenColumns={[6, 11]} />
            </div>

            {/* Guide Modal */}
            {showGuideModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
                    <div
                        style={{ scrollbarWidth: "none" }}
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                                        <HelpCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">Hướng dẫn sử dụng</h2>
                                        <p className="text-blue-100 text-sm">Quy trình xử lý đơn hàng</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowGuideModal(false)}
                                    className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* GP Orders Section */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Link className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-green-800 mb-2">Trả kết quả cho đơn GP</h3>
                                        <p className="text-green-700 mb-3">Cập nhật kết quả cho đơn hàng GP</p>
                                        <div className="bg-white border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                                                    1
                                                </div>
                                                <span className="text-gray-800 font-medium">Nhập đường dẫn kết quả vào cột "Link KQ"</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Text Orders Section */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <MousePointer className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-blue-800 mb-2">Trả kết quả cho đơn Text</h3>
                                        <p className="text-blue-700 mb-3">Xác nhận hoàn thành đơn hàng Text</p>
                                        <div className="bg-white border border-blue-200 rounded-lg p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                                                    1
                                                </div>
                                                <span className="text-gray-800 font-medium">Nhấn chuột phải vào đơn hàng cần xử lý</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                                                    2
                                                </div>
                                                <span className="text-gray-800 font-medium">
                                                    Chọn tùy chọn{" "}
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">"Đơn OK"</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cancel Orders Section */}
                            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <XCircle className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-red-800 mb-2">Hủy đơn hàng</h3>
                                        <p className="text-red-700 mb-3">Thực hiện hủy đơn hàng khi cần thiết</p>
                                        <div className="bg-white border border-red-200 rounded-lg p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-sm">
                                                    1
                                                </div>
                                                <span className="text-gray-800 font-medium">Nhấn chuột phải vào đơn hàng cần hủy</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-sm">
                                                    2
                                                </div>
                                                <span className="text-gray-800 font-medium">
                                                    Chọn tùy chọn{" "}
                                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded font-semibold">"Hủy đơn"</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Communication Section */}
                            <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <MessageSquare className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-purple-800 mb-2">Trao đổi thông tin</h3>
                                        <p className="text-purple-700 mb-3">Liên hệ và trao đổi về đơn hàng cụ thể</p>
                                        <div className="bg-white border border-purple-200 rounded-lg p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                                                    !
                                                </div>
                                                <span className="text-gray-800 font-medium">
                                                    Sử dụng nút{" "}
                                                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-semibold">
                                                        "Trao đổi"
                                                    </span>{" "}
                                                    để gửi tin nhắn hoặc yêu cầu hỗ trợ cho từng đơn hàng
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Important Notes */}
                            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5">
                                <h3 className="text-lg font-bold text-amber-800 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                        />
                                    </svg>
                                    Lưu ý quan trọng
                                </h3>
                                <ul className="space-y-2 text-amber-800">
                                    <li className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span>Luôn kiểm tra kỹ thông tin trước khi xác nhận hoặc hủy đơn hàng</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span>Sử dụng chức năng trao đổi khi cần làm rõ thông tin đơn hàng</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span>Đảm bảo đường dẫn kết quả GP chính xác và có thể truy cập được</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl">
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowGuideModal(false)}
                                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    Đã hiểu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
