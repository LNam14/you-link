"use client"

import { useEffect, useState, useCallback, memo, useMemo } from "react"
import { ref, onValue, update } from "firebase/database"
import { database } from "@/app/firebase/firebase"
import { HotTable } from "@handsontable/react"
import { registerAllModules } from "handsontable/registry"
import "handsontable/dist/handsontable.full.min.css"
import PageBody from "./DetailOrder"
import "../style.css"
import getUserInfo from "@/components/userInfo"
import {
    Filter,
    Users,
    Calendar,
    Clock,
    Building2,
    BarChart3,
    DollarSign,
    TrendingUp,
    ShoppingCart,
    AlertCircle,
} from "lucide-react"

registerAllModules()

// Add status options and colors
const TINH_TRANG_OPTIONS = {
    dang_lam: { label: "Đang làm", color: "#16A34A", bgColor: "#DCFCE7" }, // green
    don_xong: { label: "Đơn xong", color: "#2563EB", bgColor: "#DBEAFE" }, // blue
    da_bao_seo: { label: "Đã báo seo", color: "#D97706", bgColor: "#FEF3C7" }, // amber
    da_lap_phieu: { label: "Đã lập phiếu", color: "#7C3AED", bgColor: "#EDE9FE" }, // purple
    da_thanh_toan: { label: "Đã thanh toán", color: "#059669", bgColor: "#D1FAE5" }, // green
} as const

type TinhTrangType = keyof typeof TINH_TRANG_OPTIONS

const MemoizedPageBody = memo(PageBody)

// Add prop type for maKH
interface OrdersTableProps {
    maKH?: string
    hiddenColumns?: number[]
}

export default function OrdersTable({ maKH, hiddenColumns }: OrdersTableProps) {
    const [orders, setOrders] = useState<any[]>([])
    const [allOrders, setAllOrders] = useState<any[]>([])
    const [selectedOrderDetails, setSelectedOrderDetails] = useState<any[]>([])
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [selectedOrderDbIndex, setSelectedOrderDbIndex] = useState<number | null>(null) // Changed from selectedOrderIndex
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [selectedNDD, setSelectedNDD] = useState<string>("")
    const [selectedWeek, setSelectedWeek] = useState<string>("")
    const [selectedMonth, setSelectedMonth] = useState<string>("")
    const [selectedCustomer, setSelectedCustomer] = useState<string>("")
    const [filterType, setFilterType] = useState<"week" | "month">("week")
    const [summaryRow, setSummaryRow] = useState<any>(null)
    const [multiOrderDetails, setMultiOrderDetails] = useState<any[] | null>(null)
    const [showFilterModal, setShowFilterModal] = useState(false)
    const [selectedTenNCC, setSelectedTenNCC] = useState<string>("")
    const [showOnlyTTNCCGreaterThanGiaCuoi, setShowOnlyTTNCCGreaterThanGiaCuoi] = useState(false)
    // Only get userInfo if maKH is not provided
    const userInfo = !maKH ? getUserInfo() : undefined
    const isReadOnly = !userInfo;

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false)
        setSelectedOrderDbIndex(null) // Reset to null instead of 0
    }, [])

    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isModalOpen) {
                handleCloseModal()
            }
        }

        window.addEventListener("keydown", handleEscKey)
        return () => {
            window.removeEventListener("keydown", handleEscKey)
        }
    }, [isModalOpen, handleCloseModal])

    // Function to calculate order summary from ChiTietDonHang
    const calculateOrderSummary = useCallback((order: any) => {
        if (!order.ChiTietDonHang || !Array.isArray(order.ChiTietDonHang)) {
            return {
                totalTongTien: 0,
                totalGiaCuoi: 0,
                totalLoiNhuan: 0,
                totalSauCK: 0,
            }
        }

        let totalTongTien = 0
        let totalGiaCuoi = 0

        order.ChiTietDonHang.forEach((detail: any) => {
            // Skip canceled orders
            const isCanceled =
                detail.TinhTrangKH?.includes("Hủy") || detail.TinhTrangNCC === "Hủy đơn" || detail.TinhTrangNCC === "Đồng ý hủy"

            if (!isCanceled) {
                const giaBan =
                    Number(
                        detail.Loai === "GP"
                            ? detail.GiaBanGP
                            : detail.Loai === "Text"
                                ? detail.GiaBanText
                                : detail.Loai === "TextHome"
                                    ? detail.GiaBanTextHome
                                    : detail.GiaBanTextHeader,
                    ) || 0

                const giaMua =
                    Number(
                        detail.Loai === "GP"
                            ? detail.GiaMuaGP
                            : detail.Loai === "Text"
                                ? detail.GiaMuaText
                                : detail.Loai === "TextHome"
                                    ? detail.GiaMuaTextHome
                                    : detail.GiaMuaTextHeader,
                    ) || 0

                const hoaHong = Number(detail.Loai === "GP" ? detail.HoaHongGP : detail.HoaHongText) || 0
                const giaCuoi = Math.round(Number(giaMua) - (Number(giaMua) * Number(hoaHong)) / 100)

                totalTongTien += giaBan
                totalGiaCuoi += giaCuoi
            }
        })

        // Calculate SauCK based on the main order's discount percentage
        const chietKhau = Number(order.ChietKhau) || 0
        const totalSauCK = totalTongTien - (totalTongTien * chietKhau / 100)

        return {
            totalTongTien,
            totalGiaCuoi,
            totalLoiNhuan: totalSauCK - totalGiaCuoi,
            totalSauCK,
        }
    }, [])

    // Function to get week number from date
    const getWeekNumber = (dateStr: string) => {
        // Convert DD/MM/YYYY to Date object
        const [day, month, year] = dateStr.split("/").map(Number)
        const date = new Date(year, month - 1, day)
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    }

    // Function to get week range string
    const getWeekRange = (dateStr: string) => {
        const weekNumber = getWeekNumber(dateStr)
        return `Tuần ${weekNumber}`
    }

    // Function to get month range string
    const getMonthRange = (dateStr: string) => {
        const [day, month, year] = dateStr.split("/").map(Number)
        return `Tháng ${month}`
    }

    // Get current week/month
    const getCurrentPeriod = () => {
        const now = new Date()
        const day = String(now.getDate()).padStart(2, "0")
        const month = String(now.getMonth() + 1).padStart(2, "0")
        const year = now.getFullYear()
        const dateStr = `${day}/${month}/${year}`
        return filterType === "week" ? getWeekRange(dateStr) : getMonthRange(dateStr)
    }

    // Get unique weeks from orders
    const uniqueWeeks = useMemo(() => {
        const weeks = new Set<string>()
        allOrders.forEach((order) => {
            if (order.Ngay) {
                const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
                if (dateRegex.test(order.Ngay)) {
                    weeks.add(getWeekRange(order.Ngay))
                }
            }
        })
        const weeksArray = Array.from(weeks).sort((a, b) => {
            const weekA = Number.parseInt(a.match(/Tuần (\d+)/)?.[1] || "0")
            const weekB = Number.parseInt(b.match(/Tuần (\d+)/)?.[1] || "0")
            return weekB - weekA
        })
        return weeksArray
    }, [allOrders])

    // Get unique months from orders
    const uniqueMonths = useMemo(() => {
        const months = new Set<string>()
        allOrders.forEach((order) => {
            if (order.Ngay) {
                const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
                if (dateRegex.test(order.Ngay)) {
                    months.add(getMonthRange(order.Ngay))
                }
            }
        })
        const monthsArray = Array.from(months).sort((a, b) => {
            const monthA = Number.parseInt(a.match(/Tháng (\d+)/)?.[1] || "0")
            const monthB = Number.parseInt(b.match(/Tháng (\d+)/)?.[1] || "0")
            return monthB - monthA
        })
        return monthsArray
    }, [allOrders])

    // Calculate summary row
    const calculateSummaryRow = useCallback((orders: any[]) => {
        let totalTongTien = 0,
            totalGiaMua = 0,
            totalThanhToan = 0,
            totalLoiNhuan = 0,
            totalKhachNo = 0,
            totalChietKhau = 0,
            totalSauCK = 0
        orders.forEach((order) => {
            const tongTien = Number(order.TongTien) || 0
            const giaMua = Number(order.GiaMua) || 0
            const thanhToan = Number(order.ThanhToan) || 0
            const loiNhuan = Number(order.LoiNhuan) || 0
            const chietKhau = Number(order.SoTienChietKhau) || 0
            const sauCK = Number(order.SauCK) || 0

            totalTongTien += tongTien
            totalGiaMua += giaMua
            totalThanhToan += thanhToan
            totalLoiNhuan += loiNhuan
            totalKhachNo += sauCK - thanhToan
            totalChietKhau += chietKhau
            totalSauCK += sauCK
        })
        return {
            MaDon: "Tổng cộng",
            TongTien: totalTongTien,
            VND: orders.reduce((acc, order) => acc + (Number(order.VND) || 0), 0),
            ThanhToan: totalThanhToan,
            GiaMua: totalGiaMua,
            LoiNhuan: totalLoiNhuan,
            KhachNo: totalKhachNo,
            SoTienChietKhau: totalChietKhau,
            SauCK: totalSauCK
        }
    }, [])

    // Get unique customer codes
    const uniqueCustomers = useMemo(() => {
        const customers = new Set<string>()
        allOrders.forEach((order) => {
            if (order.MaDon) {
                const customerCode = order.MaDon.split("-")[0]
                if (customerCode) {
                    customers.add(customerCode)
                }
            }
        })
        return Array.from(customers).sort()
    }, [allOrders])

    // Lấy danh sách unique TenNCC từ ChiTietDonHang với điều kiện lọc
    const uniqueTenNCCs = useMemo(() => {
        const tenNCCs = new Set<string>();
        orders.forEach(order => {
            if (order.ChiTietDonHang) {
                order.ChiTietDonHang.forEach((detail: any) => {
                    if (!detail.TenNCC) return;

                    // Kiểm tra điều kiện TTKH
                    const validTTKH = ["Đã nhập", "Đơn OK", "Hủy đơn - đã lên bài"].includes(detail.TinhTrangKH);
                    if (!validTTKH) return;

                    // Kiểm tra điều kiện TTNCC
                    const validTTNCC = ["Đã lên bài", "Từ chối hủy"].includes(detail.TinhTrangNCC);
                    if (!validTTNCC) return;

                    // Kiểm tra điều kiện Loại và Index cho GP
                    if (detail.Loai === "GP" && detail.Index === "No") return;

                    // Tính giá cuối
                    const giaMua = Number(
                        detail.Loai === "GP"
                            ? detail.GiaMuaGP
                            : detail.Loai === "Text"
                                ? detail.GiaMuaText
                                : detail.Loai === "TextHome"
                                    ? detail.GiaMuaTextHome
                                    : detail.GiaMuaTextHeader
                    ) || 0;
                    const hoaHong = Number(detail.Loai === "GP" ? detail.HoaHongGP : detail.HoaHongText) || 0;
                    const giaCuoi = Math.round(giaMua - (giaMua * hoaHong / 100));

                    // Chỉ thêm NCC nếu có ít nhất 1 đơn có TTNCC khác Giá cuối
                    if (Number(detail.TTNCC) !== Number(giaCuoi)) {
                        tenNCCs.add(detail.TenNCC);
                    }
                });
            }
        });
        return Array.from(tenNCCs).sort();
    }, [orders]);

    useEffect(() => {
        const ordersRef = ref(database, "orders")
        const unsubscribe = onValue(ordersRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val()
                let ordersArray = Array.isArray(data) ? data : Object.values(data)

                // Lọc bỏ các orders có Status === 'Hủy'
                ordersArray = ordersArray.filter((order: any) => order.Status !== 'Hủy')

                // Store all orders for NDD options
                setAllOrders(ordersArray)

                let filteredOrders = ordersArray

                // If maKH is present, filter by maKH only (ignore userInfo)
                if (maKH) {
                    filteredOrders = filteredOrders.filter((order: any) => {
                        if (!order.MaDon) return false
                        const customerCode = order.MaDon.split("-")[0]
                        return customerCode === maKH
                    })
                } else if (userInfo) {
                    // Filter orders based on user role, selected NDD, selected period, and customer
                    filteredOrders =
                        userInfo.role === "Admin"
                            ? selectedNDD
                                ? ordersArray.filter((order: any) => order.NDD === selectedNDD)
                                : ordersArray
                            : ordersArray.filter((order: any) => order.NDD === userInfo.username)
                }

                // Apply period filter if selected
                if (filterType === "week" && selectedWeek) {
                    filteredOrders = filteredOrders.filter((order: any) => {
                        if (!order.Ngay) return false
                        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
                        return dateRegex.test(order.Ngay) && getWeekRange(order.Ngay) === selectedWeek
                    })
                } else if (filterType === "month" && selectedMonth) {
                    filteredOrders = filteredOrders.filter((order: any) => {
                        if (!order.Ngay) return false
                        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
                        return dateRegex.test(order.Ngay) && getMonthRange(order.Ngay) === selectedMonth
                    })
                }

                // Apply customer filter if selected (skip if maKH is set)
                if (selectedCustomer && !maKH) {
                    filteredOrders = filteredOrders.filter((order: any) => {
                        if (!order.MaDon) return false
                        const customerCode = order.MaDon.split("-")[0]
                        return customerCode === selectedCustomer
                    })
                }

                // Recalculate summary for each order
                const updatedOrders = filteredOrders.map((order: any) => {
                    const summary = calculateOrderSummary(order)
                    return {
                        ...order,
                        TongTien: summary.totalTongTien,
                        GiaMua: summary.totalGiaCuoi,
                        LoiNhuan: summary.totalLoiNhuan,
                        SauCK: summary.totalSauCK,
                    }
                })

                // Calculate and set summary row
                const summary = calculateSummaryRow(updatedOrders)
                setSummaryRow(summary)
                setOrders(updatedOrders)
            } else {
                setOrders([])
                setAllOrders([])
                setSummaryRow(null)
            }
        })

        return () => unsubscribe()
    }, [
        calculateOrderSummary,
        // Only include userInfo deps if maKH is not present
        ...(maKH ? [] : [userInfo?.role, userInfo?.username, selectedNDD]),
        selectedWeek,
        selectedMonth,
        selectedCustomer,
        filterType,
        calculateSummaryRow,
        maKH,
    ])

    // Set initial period when component mounts or filter type changes
    useEffect(() => {
        const currentPeriod = getCurrentPeriod()
        if (filterType === "week") {
            setSelectedWeek(currentPeriod)
            setSelectedMonth("")
        } else {
            setSelectedMonth(currentPeriod)
            setSelectedWeek("")
        }
    }, [filterType])

    // Get unique NDD values for the filter dropdown from all orders
    const uniqueNDDs = useMemo(() => {
        const ndds = new Set<string>()
        allOrders.forEach((order) => {
            if (order.NDD) {
                ndds.add(order.NDD)
            }
        })
        return Array.from(ndds).sort()
    }, [allOrders])

    const columns = [
        {
            data: "MaDon",
            title: "Mã Đơn",
            width: 60,
            readOnly: true,
            className: "readonly-column",
            renderer: (instance: any, td: any, row: number, col: number, prop: any, value: any) => {
                td.innerHTML = value || ""
                td.style.color = "#2563EB"
                td.style.fontWeight = "600"
                td.style.textAlign = "left"
                return td
            },
        },
        {
            data: "NDD",
            title: "Ng Đi Đơn",
            width: 80,
            readOnly: true,
            className: "readonly-column",
        },
        {
            data: "Ngay",
            title: "Ngày",
            width: 70,
            type: "date",
            dateFormat: "DD/MM/YYYY",
            correctFormat: true,
            className: "htCenter",
            renderer: (instance: any, td: any, row: number, col: number, prop: any, value: any) => {
                if (value) {
                    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
                    if (dateRegex.test(value)) {
                        const [day, month] = value.split("/")
                        td.innerHTML = `
                            <div class="flex items-center justify-center gap-1">
                                <span style="color:#2563EB;font-weight:500;">${day}/${month} 📅</span>
                            </div>
                        `
                    } else {
                        const date = new Date(value)
                        if (!isNaN(date.getTime())) {
                            const day = String(date.getDate()).padStart(2, "0")
                            const month = String(date.getMonth() + 1).padStart(2, "0")
                            td.innerHTML = `
                                <div class="flex items-center justify-center gap-1">
                                    <span style="color:#2563EB;font-weight:500;">${day}/${month}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#2563EB">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            `
                        } else {
                            td.innerHTML = value
                        }
                    }
                }
                td.classList.add("ngay-cell-custom")
                td.style.textAlign = "center"
                td.style.backgroundColor = ""
                td.style.color = ""
                td.style.padding = "4px"
                td.style.borderRadius = "4px"
                td.style.fontWeight = "500"
                td.style.cursor = "pointer"
                return td
            },
            validator: (value: any, callback: any) => {
                if (!value) {
                    callback(true)
                    return
                }

                // Check if the value is in DD/MM/YYYY format
                const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
                if (dateRegex.test(value)) {
                    callback(true)
                    return
                }

                // Check if the value is a valid date
                const date = new Date(value)
                if (!isNaN(date.getTime())) {
                    callback(true)
                    return
                }

                callback(false)
            },
        },
        { data: "TenNV", title: "Tên NV", width: 80 },
        { data: "IDNV", title: "ID NV", width: 80 },
        { data: "Domain", title: "Domain", width: 80 },
        { data: "HangMuc", title: "Hạng mục", width: 80 },
        { data: "Note1", title: "Ghi chú 1", width: 80 },
        {
            data: "TinhTrang",
            title: "Tình trạng",
            width: 80,
            type: "dropdown",
            source: Object.keys(TINH_TRANG_OPTIONS),
            strict: true,
            allowInvalid: false,
            readOnly: true,
            renderer: (instance: any, td: any, row: number, col: number, prop: any, value: TinhTrangType) => {
                const select = document.createElement("select")
                select.style.width = "100%"
                select.style.height = "100%"
                select.style.borderRadius = "4px"
                select.style.border = "1px solid #E5E7EB"
                select.style.backgroundColor = value ? TINH_TRANG_OPTIONS[value]?.bgColor : "white"
                select.style.color = value ? TINH_TRANG_OPTIONS[value]?.color : "#6B7280"
                select.style.cursor = "pointer"
                select.style.textAlign = "center"
                select.style.fontSize = "11px"
                select.style.appearance = "none"
                select.style.webkitAppearance = "none"
                select.style.transition = "all 0.2s ease"
                select.style.fontWeight = value ? "500" : "normal"
                select.style.pointerEvents = "auto"
                select.style.userSelect = "none"

                // Add empty option first
                const emptyOption = document.createElement("option")
                emptyOption.value = ""
                emptyOption.textContent = "---"
                select.appendChild(emptyOption)

                // Add status options
                Object.entries(TINH_TRANG_OPTIONS).forEach(([key, status]) => {
                    const option = document.createElement("option")
                    option.value = key
                    option.textContent = status.label
                    if (value === key) {
                        option.selected = true
                    }
                    select.appendChild(option)
                })

                // Prevent all keyboard input
                const preventInput = (e: Event) => {
                    e.preventDefault()
                    e.stopPropagation()
                    return false
                }

                select.addEventListener("keydown", preventInput)
                select.addEventListener("keypress", preventInput)
                select.addEventListener("keyup", preventInput)
                select.addEventListener("input", preventInput)
                select.addEventListener("paste", preventInput)
                select.addEventListener("cut", preventInput)
                select.addEventListener("copy", preventInput)
                select.addEventListener("contextmenu", preventInput)

                // Only allow change event
                select.addEventListener("change", (e) => {
                    const newValue = (e.target as HTMLSelectElement).value as TinhTrangType
                    instance.setDataAtCell(row, col, newValue)

                    // Update background and text color immediately
                    if (newValue) {
                        select.style.backgroundColor = TINH_TRANG_OPTIONS[newValue].bgColor
                        select.style.color = TINH_TRANG_OPTIONS[newValue].color
                        select.style.fontWeight = "500"
                    } else {
                        select.style.backgroundColor = "white"
                        select.style.color = "#6B7280"
                        select.style.fontWeight = "normal"
                    }
                })

                try {
                    if (td.innerHTML === "") {
                        td.appendChild(select)
                        td.style.textAlign = "center"
                        td.style.verticalAlign = "middle"
                        td.contentEditable = "false"
                    }
                } catch (error) {
                    console.warn("Failed to append select element:", error)
                }
            },
        },
        {
            data: "TongTien",
            title: "Tổng tiền",
            width: 80,
            className: "htRight readonly-column",
            readOnly: true,
        },
        {
            data: "ChietKhau",
            title: "CK (%)",
            width: 60,
            className: "htCenter",
            readOnly: isReadOnly,
            renderer: (instance: any, td: any, row: number, col: number, prop: any, value: any) => {
                if (value && value > 0) {
                    td.innerHTML = `
                        <div class="flex flex-col items-center">
                            <span class="text-xs font-medium text-green-600">${value}%</span>
                        </div>
                    `
                    td.style.backgroundColor = "#DCFCE7"
                } else {
                    td.innerHTML = ""
                    td.style.backgroundColor = "#F3F4F6"
                }
                return td
            },
        },
        {
            data: "SauCK",
            title: "Sau CK",
            width: 80,
            className: "htRight readonly-column",
            readOnly: true,
            renderer: (instance: any, td: any, row: number, col: number, prop: any, value: any) => {
                const order = instance.getSourceDataAtRow(row)
                const chietKhau = order?.ChietKhau || 0
                const usdt = order?.TongTien || 0
                const tongGoc = usdt - (usdt * chietKhau / 100)
                td.innerHTML = `
                        <div class="flex flex-col items-end">
                            <span class="text-xs font-medium text-gray-600 line-through">${tongGoc.toLocaleString("vi-VI")}</span>
                            <span class="text-xs text-gray-400">Gốc</span>
                        </div>
                    `
                return td
            },
        },
        {
            data: "TiGia",
            title: "Tỷ giá",
            width: 80,
            className: "htRight",
        },
        {
            data: "VND",
            title: "VND",
            width: 80,
            className: "htRight readonly-column",
            readOnly: true,
        },
        {
            data: "TKNhan",
            title: "TK nhận",
            width: 80,
            readOnly: isReadOnly,
        },
        {
            data: "ThanhToan",
            title: "Thanh toán",
            width: 80,
            className: "htRight",
            readOnly: isReadOnly,
        },
        {
            data: "LinkBill",
            title: "Link bill",
            width: 80,
            renderer: (instance: any, td: any, row: number, col: number, prop: any, value: any) => {
                if (value) {
                    const link = document.createElement("a")
                    link.href = value
                    link.target = "_blank"
                    link.style.color = "#2563EB"
                    link.style.textDecoration = "underline"
                    link.style.cursor = "pointer"
                    link.style.display = "block"
                    link.style.overflow = "hidden"
                    link.style.textOverflow = "ellipsis"
                    link.style.whiteSpace = "nowrap"
                    link.title = value
                    link.textContent = value
                    td.innerHTML = ""
                    td.appendChild(link)
                } else {
                    td.innerHTML = ""
                }
            },
        },
        { data: "Note2", title: "Ghi chú 2", width: 80 },
        {
            data: "KTXacNhan",
            title: "KTXN",
            width: 70,
            renderer: (instance: any, td: any, row: number, col: number, prop: any, value: any) => {
                if (!value) {
                    td.innerHTML =
                        '<button class="w-full h-full flex items-center justify-center px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600" style="min-width:unset;min-height:unset;">Xác nhận</button>'
                    td.style.padding = "0"
                    td.style.overflow = "hidden"
                    td.style.verticalAlign = "middle"
                    td.style.textAlign = "center"
                    td.addEventListener("click", async (e: any) => {
                        if (e.target.tagName === "BUTTON") {
                            const order = orders[row - 1] // Adjust for summary row
                            if (order && order.MaDon) {
                                // Find the database index for this order
                                const dbIndex = allOrders.findIndex((o) => o.MaDon === order.MaDon)
                                if (!isReadOnly && dbIndex !== -1) {
                                    try {
                                        await update(ref(database), {
                                            [`orders/${dbIndex}/KTXacNhan`]: "Đã xong",
                                        })
                                    } catch (error) {
                                        console.error("Error updating KTXN:", error)
                                    }
                                } else {

                                }
                            }
                        }
                    })
                } else {
                    td.style.backgroundColor = "#EF4444" // Light red background
                    td.style.color = "#FEF2F2" // Red text
                    td.style.fontWeight = "500"
                    td.style.textAlign = "center"
                    td.style.verticalAlign = "middle"
                    td.style.cursor = "not-allowed"
                    td.style.borderRadius = "4px"
                    td.innerHTML = value
                }
                return td
            },
            readOnly: true,
        },
        {
            data: "GiaMua",
            title: "Giá cuối",
            width: 70,
            className: "htRight readonly-column",
            readOnly: true,
        },
        {
            data: "LoiNhuan",
            title: "Lợi nhuận",
            width: 70,
            className: "htRight readonly-column",
            readOnly: true,
        },
        {
            data: "MaDon",
            title: "Chi Tiết",
            width: 50,
            renderer: (instance: any, td: any, row: number, col: number, prop: any, value: any) => {
                // Nếu có summaryRow, order bắt đầu từ row 1
                const dataRowIndex = summaryRow ? row - 1 : row
                const order = orders[dataRowIndex]
                // Xóa event listener cũ nếu có
                const newButton = document.createElement("button")
                newButton.className =
                    "w-full h-full flex items-center justify-center px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                newButton.style.minWidth = "unset"
                newButton.style.minHeight = "unset"
                newButton.setAttribute("data-madon", order?.MaDon ?? "")
                newButton.textContent = "Xem"
                newButton.onclick = (e: any) => {
                    const maDon = order?.MaDon
                    // Find the order in the original allOrders array to get the correct database index
                    const dbIndex = allOrders.findIndex((o) => o.MaDon === maDon)
                    const orderInDb = allOrders[dbIndex]

                    if (orderInDb && dbIndex !== -1) {
                        setSelectedOrder(orderInDb)
                        setSelectedOrderDbIndex(dbIndex)
                        setIsModalOpen(true)
                        setSelectedOrderDetails(
                            (orderInDb?.ChiTietDonHang || []).map((item: any, idx: number) => ({
                                ...item,
                                _dbIndex: idx,
                                _parentIndex: dbIndex,
                            })),
                        )
                    }
                }
                td.innerHTML = ""
                if (order) {
                    td.appendChild(newButton)
                }
                td.style.padding = "0"
                td.style.overflow = "hidden"
                td.style.verticalAlign = "middle"
                td.style.textAlign = "center"
                return td
            },
        },
    ]

    const handleAfterPaste = async (data: any, coords: any) => {
        const [startRow, startCol, endRow, endCol] = coords
        const updates: { [key: string]: any } = {}

        // Adjust row indices to account for summary row
        const adjustedStartRow = Math.max(startRow - 1, 0)
        const adjustedEndRow = Math.max(endRow - 1, 0)

        // Process each cell in the paste area
        for (let row = adjustedStartRow; row <= adjustedEndRow; row++) {
            const order = orders[row]
            if (!order || !order.MaDon) continue
            const dbIndex = allOrders.findIndex((o) => o.MaDon === order.MaDon)
            if (dbIndex === -1) continue

            const rowUpdates: { [key: string]: any } = {}
            for (let col = startCol; col <= endCol; col++) {
                const prop = columns[col].data
                if (prop === "MaDon") continue // Skip MaDon column

                const newValue = data[row - adjustedStartRow][col - startCol]
                if (newValue !== undefined) {
                    rowUpdates[prop] = newValue
                }
            }

            if (Object.keys(rowUpdates).length > 0) {
                updates[`orders/${dbIndex}`] = {
                    ...allOrders[dbIndex],
                    ...rowUpdates,
                }
            }
        }

        try {
            // Update Firebase
            if (Object.keys(updates).length > 0) {
                await update(ref(database), updates)
            }
        } catch (error) {
            console.error("Error updating data:", error)
        }
    }

    const handleAfterChange = async (changes: any, source: any) => {
        if (!changes || source === "loadData") return

        const updates: { [key: string]: any } = {}

        changes.forEach(([row, prop, oldValue, newValue]: [number, string, any, any]) => {
            // Skip if it's the summary row
            if (row === 0) return

            // Adjust row index to account for summary row
            const adjustedRow = row - 1
            const order = orders[adjustedRow]
            if (!order || !order.MaDon) return
            const dbIndex = allOrders.findIndex((o) => o.MaDon === order.MaDon)
            if (dbIndex === -1) return

            if (prop === "MaDon") return // Skip MaDon column

            // Update VND if TongTien or TiGia changes
            const updateObj: any = { [prop]: newValue }
            if (prop === "TongTien" || prop === "TiGia") {
                const usdt = prop === "TongTien" ? newValue : order.TongTien
                const tiGia = prop === "TiGia" ? newValue : order.TiGia
                const vnd = Number(usdt) * Number(tiGia)
                updateObj.VND = vnd
            }
            updates[`orders/${dbIndex}`] = {
                ...allOrders[dbIndex],
                ...updateObj,
            }
        })

        try {
            if (Object.keys(updates).length > 0) {
                await update(ref(database), updates)
            }
        } catch (error) {
            console.error("Error updating data:", error)
        }
    }

    // Tìm index các cột cần ẩn
    const tiGiaIndex = columns.findIndex((c) => c.data === "TiGia")
    const vndIndex = columns.findIndex((c) => c.data === "VND")
    const hiddenCols = [tiGiaIndex, vndIndex].filter((i) => i !== -1)

    return (
        <div>
            <style jsx global>{`
                .readonly-column {
                    background-color: #F3F4F6 !important;
                    color: #1a1a1a !important;
                    cursor: not-allowed !important;
                }
                .ngay-cell-custom {
                    background: none !important;
                    transition: background 0.2s;
                }
                .ngay-cell-custom:hover {
                    background: #dbeafe !important; /* blue-100 */
                    cursor: pointer;
                }
            `}</style>
            <div className="mb-3 space-y-3">
                {/* Compact Filter Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Filter className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Bộ lọc</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        {/* Sales Person Filter - Only show for Admin */}
                        {userInfo?.role === "Admin" && (
                            <div className="flex items-center gap-2">
                                <Users className="h-3 w-3 text-blue-500" />
                                <select
                                    value={selectedNDD}
                                    onChange={(e) => setSelectedNDD(e.target.value)}
                                    className="text-xs border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
                                >
                                    <option value="">Tất cả NV</option>
                                    {uniqueNDDs.map((ndd) => (
                                        <option key={ndd} value={ndd}>
                                            {ndd}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Period Type */}
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-green-500" />
                            <label className="flex items-center gap-1">
                                <input
                                    type="radio"
                                    name="filterType"
                                    checked={filterType === "week"}
                                    onChange={() => setFilterType("week")}
                                    className="h-3 w-3"
                                />
                                <span className="text-xs">Tuần</span>
                            </label>
                            <label className="flex items-center gap-1">
                                <input
                                    type="radio"
                                    name="filterType"
                                    checked={filterType === "month"}
                                    onChange={() => setFilterType("month")}
                                    className="h-3 w-3"
                                />
                                <span className="text-xs">Tháng</span>
                            </label>
                        </div>

                        {/* Period Selection */}
                        <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-purple-500" />
                            <select
                                value={filterType === "week" ? selectedWeek : selectedMonth}
                                onChange={(e) => {
                                    if (filterType === "week") {
                                        setSelectedWeek(e.target.value)
                                    } else {
                                        setSelectedMonth(e.target.value)
                                    }
                                }}
                                className="text-xs border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
                            >
                                {(filterType === "week" ? uniqueWeeks : uniqueMonths).map((period) => (
                                    <option key={period} value={period}>
                                        {period}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Customer Filter */}
                        {!maKH && (
                            <div className="flex items-center gap-2">
                                <Building2 className="h-3 w-3 text-orange-500" />
                                <select
                                    value={selectedCustomer}
                                    onChange={(e) => setSelectedCustomer(e.target.value)}
                                    className="text-xs border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
                                >
                                    <option value="">Tất cả KH</option>
                                    {uniqueCustomers.map((customer) => (
                                        <option key={customer} value={customer}>
                                            {customer}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Beautiful Compact Summary Section */}
                {!maKH && summaryRow && (
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-gray-200 p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm">
                                    <BarChart3 className="h-4 w-4 text-white" />
                                </div>
                                <span className="text-sm font-semibold text-gray-800">Tổng quan tài chính</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-green-700 font-medium">
                                        Tỷ lệ LN: {summaryRow.TongTien > 0 ? ((summaryRow.LoiNhuan / summaryRow.TongTien) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-blue-700 font-medium">Tổng đơn: {orders.length}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full -mr-4 -mt-4"></div>
                                <div className="flex items-center gap-2 mb-1">
                                    <DollarSign className="h-4 w-4" />
                                    <span className="text-xs font-medium opacity-90">DOANH THU</span>
                                </div>
                                <div className="text-lg font-bold">{summaryRow.SauCK?.toLocaleString("vi-VN")}</div>
                                <div className="text-xs opacity-75">USDT</div>
                            </div>

                            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 text-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full -mr-4 -mt-4"></div>
                                <div className="flex items-center gap-2 mb-1">
                                    <ShoppingCart className="h-4 w-4" />
                                    <span className="text-xs font-medium opacity-90">CHI PHÍ NCC</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowFilterModal(true)}
                                        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '4px', padding: '2px', marginLeft: '4px', cursor: 'pointer' }}
                                        title={`Xem chi tiết đơn hàng trong ${filterType === "week" ? selectedWeek : selectedMonth}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    </button>
                                </div>
                                {(() => {
                                    let totalGiaCuoi = 0;
                                    let totalTTNCC = 0;

                                    orders.forEach(order => {
                                        if (order.ChiTietDonHang) {
                                            order.ChiTietDonHang.forEach((detail: any) => {
                                                // Tính tổng TTNCC
                                                totalTTNCC += Number(detail.TTNCC) || 0;

                                                // Tính tổng giá cuối
                                                const giaMua = Number(
                                                    detail.Loai === "GP"
                                                        ? detail.GiaMuaGP
                                                        : detail.Loai === "Text"
                                                            ? detail.GiaMuaText
                                                            : detail.Loai === "TextHome"
                                                                ? detail.GiaMuaTextHome
                                                                : detail.GiaMuaTextHeader
                                                ) || 0;
                                                const hoaHong = Number(detail.Loai === "GP" ? detail.HoaHongGP : detail.HoaHongText) || 0;
                                                const giaCuoi = Math.round(giaMua - (giaMua * hoaHong / 100));
                                                totalGiaCuoi += giaCuoi;
                                            });
                                        }
                                    });

                                    const difference = totalGiaCuoi - totalTTNCC;

                                    return (
                                        <>
                                            <div className="text-lg font-bold">{difference.toLocaleString("vi-VN")}</div>
                                            <div className="text-xs opacity-75">USDT</div>
                                            <div className="mt-2 text-xs">
                                                <div className="flex justify-between opacity-75">
                                                    <span>Tổng giá cuối:</span>
                                                    <span>{totalGiaCuoi.toLocaleString("vi-VN")}</span>
                                                </div>
                                                <div className="flex justify-between opacity-75">
                                                    <span>Tổng TTNCC:</span>
                                                    <span>{totalTTNCC.toLocaleString("vi-VN")}</span>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-3 text-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full -mr-4 -mt-4"></div>
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="text-xs font-medium opacity-90">CÔNG NỢ</span>
                                </div>
                                <div className="text-lg font-bold">{summaryRow.KhachNo?.toLocaleString("vi-VN")}</div>
                                <div className="text-xs opacity-75">USDT</div>
                            </div>

                            <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 text-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full -mr-4 -mt-4"></div>
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-xs font-medium opacity-90">LỢI NHUẬN</span>
                                </div>
                                <div className="text-lg font-bold">{summaryRow.LoiNhuan?.toLocaleString("vi-VN")}</div>
                                <div className="text-xs opacity-75">USDT</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {orders.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <BarChart3 className="h-8 w-8 text-gray-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">Không có dữ liệu</h3>
                            <p className="text-sm text-gray-500">Không tìm thấy đơn hàng nào với bộ lọc hiện tại</p>
                        </div>
                    </div>
                </div>
            ) : (
                <HotTable
                    data={summaryRow ? [summaryRow, ...orders] : orders}
                    columns={columns}
                    colHeaders={true}
                    rowHeaders={false}
                    height="auto"
                    licenseKey="non-commercial-and-evaluation"
                    afterChange={handleAfterChange}
                    afterPaste={handleAfterPaste}
                    contextMenu={{
                        items: {
                            hidden_columns_hide: { name: "Ẩn cột" },
                            show_all_columns: {
                                name: "Hiện tất cả cột",
                                callback: function (key, selection, clickEvent) {
                                    const allIndexes = Array.from({ length: this.countCols() }, (_, i) => i)
                                    this.getPlugin("hiddenColumns").showColumns(allIndexes)
                                },
                            },
                            delete_order: {
                                name: "Xóa đơn",
                                callback: async function (this: any, key: string, selection: any[], clickEvent: MouseEvent) {
                                    // Only allow if right-clicked on a data row (not summary row)
                                    if (!selection || !selection.length) return;
                                    const row = selection[0].start.row;
                                    if (row === 0 && summaryRow) return; // Don't allow on summary row
                                    // Adjust for summary row
                                    const dataRow = summaryRow ? row - 1 : row;
                                    if (dataRow < 0 || dataRow >= orders.length) return;
                                    const order = orders[dataRow];
                                    if (!order || !order.MaDon) return;
                                    const dbIndex = allOrders.findIndex((o) => o.MaDon === order.MaDon);
                                    if (dbIndex === -1) return;
                                    try {
                                        await update(ref(database), {
                                            [`orders/${dbIndex}/Status`]: "Hủy",
                                        });
                                    } catch (error) {
                                        alert("Lỗi khi xóa đơn: " + error);
                                    }
                                },
                                disabled: function (this: any) {
                                    // Lấy selection từ this
                                    const sel = this.getSelectedLast && this.getSelectedLast();
                                    if (!sel) return true;
                                    const row = sel[0];
                                    if (row === 0 && summaryRow) return true;
                                    // Adjust for summary row
                                    const dataRow = summaryRow ? row - 1 : row;
                                    if (dataRow < 0 || dataRow >= orders.length) return true;
                                    return false;
                                },
                            },
                        },
                    }}
                    manualColumnResize={true}
                    manualRowResize={true}
                    stretchH="all"
                    themeName="ht-theme-main"
                    className="custom-table"
                    hiddenColumns={
                        hiddenColumns ? { columns: hiddenColumns, indicators: true } : { columns: hiddenCols, indicators: true }
                    }
                    beforeOnCellContextMenu={(event, coords) => {
                        // Chỉ chặn context menu ở header (row === -1)
                        if (coords.row === -1) {
                            event.stopImmediatePropagation();
                            event.preventDefault();
                            return false;
                        }
                    }}
                    cells={(row, col) => {
                        if (row === 0 && summaryRow) {
                            return {
                                className: "summary-row",
                                readOnly: true,
                                renderer: (instance, td, row, col, prop, value) => {
                                    if (["TongTien", "VND", "ThanhToan", "GiaMua", "LoiNhuan", "SoTienChietKhau", "SauCK"].includes(prop as string)) {
                                        td.style.fontWeight = "600"
                                        td.style.backgroundColor = "#fecaca"
                                        td.style.color = "#dc2626"
                                        td.style.textAlign = "right"
                                        td.innerHTML = value?.toLocaleString("vi-VN") || "0"
                                    } else if (prop === "MaDon") {
                                        td.style.fontWeight = "600"
                                        td.style.backgroundColor = "#fecaca"
                                        td.style.color = "#dc2626"
                                        td.style.textAlign = "left"
                                    } else if (prop === "TinhTrang" || prop === "ChietKhau") {
                                        td.style.fontWeight = "600"
                                        td.style.backgroundColor = "#fecaca"
                                        td.style.color = "#dc2626"
                                        td.style.textAlign = "center"
                                        td.innerHTML = prop === "TinhTrang" ? "Tổng" : summaryRow.SoTienChietKhau > 0 ? "CK" : ""
                                    } else {
                                        td.style.backgroundColor = "#fecaca"
                                        td.innerHTML = ""
                                    }
                                    return td
                                },
                            }
                        }
                        // Add styling for numeric columns in data rows
                        const prop = columns[col].data
                        if (["TongTien", "VND", "ThanhToan", "GiaMua", "LoiNhuan", "SoTienChietKhau", "SauCK"].includes(prop as string)) {
                            return {
                                renderer: (instance, td, row, col, prop, value) => {
                                    td.style.color = "#dc2626"
                                    td.style.textAlign = "right"
                                    td.style.fontWeight = "500"
                                    td.innerHTML = value?.toLocaleString("vi-VI") || "0"
                                    return td
                                },
                            }
                        }
                        return {}
                    }}
                />
            )}

            {isModalOpen && ((multiOrderDetails && multiOrderDetails.length > 0) || (selectedOrder && selectedOrderDbIndex !== null)) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                    <div className="bg-white rounded-lg w-full overflow-auto relative z-[1001]">
                        <div className="bg-[#2563eb] text-white flex items-center justify-center py-2 rounded-t-lg relative">
                            <h3 className="pt-10 font-semibold w-full text-center">
                                {multiOrderDetails ? `Chi tiết đơn hàng trong ${filterType === "week" ? selectedWeek : selectedMonth}` : `Chi tiết đơn hàng: ${selectedOrder.MaDon}`}
                            </h3>
                            <div className="absolute top-14 right-0 -translate-y-1/2 z-[1002]">
                                <button
                                    onClick={() => {
                                        handleCloseModal();
                                        setMultiOrderDetails(null);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                                    aria-label="Close"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path
                                            fillRule="evenodd"
                                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <MemoizedPageBody
                                order={multiOrderDetails || selectedOrderDetails}
                                supplierName={multiOrderDetails ? null : selectedOrder?.NDD}
                                orderIndex={multiOrderDetails ? -1 : (selectedOrderDbIndex || -1)}
                                chietKhau={multiOrderDetails ? undefined : selectedOrder?.ChietKhau}
                                onOrderUpdate={() => {
                                    setIsLoading(true);
                                    const ordersRef = ref(database, "orders");
                                    onValue(
                                        ordersRef,
                                        (snapshot) => {
                                            if (snapshot.exists()) {
                                                const data = snapshot.val();
                                                const ordersArray = Array.isArray(data) ? data : Object.values(data);

                                                const updatedOrders = ordersArray.map((order: any) => {
                                                    const summary = calculateOrderSummary(order);
                                                    return {
                                                        ...order,
                                                        TongTien: summary.totalTongTien,
                                                        GiaMua: summary.totalGiaCuoi,
                                                        LoiNhuan: summary.totalLoiNhuan,
                                                        SauCK: summary.totalSauCK,
                                                    };
                                                });

                                                setAllOrders(updatedOrders);
                                                if (!multiOrderDetails && selectedOrderDbIndex !== null && updatedOrders[selectedOrderDbIndex]) {
                                                    setSelectedOrder(updatedOrders[selectedOrderDbIndex]);
                                                    setSelectedOrderDetails(
                                                        (updatedOrders[selectedOrderDbIndex]?.ChiTietDonHang || []).map(
                                                            (item: any, idx: number) => ({
                                                                ...item,
                                                                _dbIndex: idx,
                                                                _parentIndex: selectedOrderDbIndex,
                                                            })
                                                        )
                                                    );
                                                }
                                            }
                                            setIsLoading(false);
                                        },
                                        { onlyOnce: true }
                                    );
                                }}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Filter Modal */}
            {showFilterModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001]">
                    <div className="bg-white rounded-lg p-6 w-96 relative">
                        <h3 className="text-lg font-semibold mb-4">Lọc chi tiết đơn hàng</h3>

                        {/* TenNCC Select */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tên NCC
                            </label>
                            <select
                                value={selectedTenNCC}
                                onChange={(e) => setSelectedTenNCC(e.target.value)}
                                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Tất cả NCC</option>
                                {uniqueTenNCCs.map((ncc) => (
                                    <option key={ncc} value={ncc}>
                                        {ncc}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowFilterModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => {
                                    setShowFilterModal(false);

                                    // Lọc orders theo tuần/tháng hiện tại
                                    const filteredOrders = orders.filter((order) => {
                                        if (!order.Ngay) return false;
                                        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
                                        if (!dateRegex.test(order.Ngay)) return false;

                                        if (filterType === "week") {
                                            return getWeekRange(order.Ngay) === selectedWeek;
                                        } else {
                                            return getMonthRange(order.Ngay) === selectedMonth;
                                        }
                                    });

                                    // Gộp và lọc ChiTietDonHang theo điều kiện
                                    const allDetails = filteredOrders.flatMap((order, orderIndex) => {
                                        // Tìm index thực trong mảng orders gốc
                                        const originalOrderIndex = allOrders.findIndex(o => o.MaDon === order.MaDon);

                                        return (order.ChiTietDonHang || [])
                                            .map((item: any, detailIndex: number) => ({
                                                item,
                                                originalIndex: detailIndex
                                            }))
                                            .filter(({ item }: { item: any }) => {
                                                // Lọc theo TenNCC nếu có chọn
                                                if (selectedTenNCC && item.TenNCC !== selectedTenNCC) {
                                                    return false;
                                                }

                                                // Kiểm tra điều kiện TTKH
                                                const validTTKH = ["Đã nhập", "Đơn OK", "Hủy đơn - đã lên bài"].includes(item.TinhTrangKH);
                                                if (!validTTKH) return false;

                                                // Kiểm tra điều kiện TTNCC
                                                const validTTNCC = ["Đã lên bài", "Từ chối hủy"].includes(item.TinhTrangNCC);
                                                if (!validTTNCC) return false;

                                                // Kiểm tra điều kiện Loại và Index cho GP
                                                if (item.Loai === "GP" && item.Index === "No") return false;

                                                // Tính và so sánh TTNCC với Giá cuối
                                                const giaMua = Number(
                                                    item.Loai === "GP"
                                                        ? item.GiaMuaGP
                                                        : item.Loai === "Text"
                                                            ? item.GiaMuaText
                                                            : item.Loai === "TextHome"
                                                                ? item.GiaMuaTextHome
                                                                : item.GiaMuaTextHeader
                                                ) || 0;
                                                const hoaHong = Number(item.Loai === "GP" ? item.HoaHongGP : item.HoaHongText) || 0;
                                                const giaCuoi = Math.round(giaMua - (giaMua * hoaHong / 100));

                                                return Number(item.TTNCC) !== Number(giaCuoi);
                                            })
                                            .map(({ item, originalIndex }: { item: any, originalIndex: number }) => ({
                                                ...item,
                                                _dbIndex: originalIndex,
                                                _parentIndex: originalOrderIndex,
                                                _orderInfo: {
                                                    MaDon: order.MaDon,
                                                    Ngay: order.Ngay,
                                                    NDD: order.NDD
                                                }
                                            }));
                                    });

                                    if (allDetails.length === 0) {
                                        alert(`Không có dữ liệu chi tiết đơn hàng phù hợp với điều kiện lọc`);
                                        return;
                                    }

                                    setMultiOrderDetails(allDetails);
                                    setIsModalOpen(true);
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Xem chi tiết
                            </button>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => setShowFilterModal(false)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-500"
                        >
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
