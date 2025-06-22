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

registerAllModules()

// Add status options and colors
const TINH_TRANG_OPTIONS = {
    da_lam: { label: "Đang làm", color: "#16A34A", bgColor: "#DCFCE7" }, // green
    don_xong: { label: "Đơn xong", color: "#2563EB", bgColor: "#DBEAFE" }, // blue
    da_bao_seo: { label: "Đã báo seo", color: "#D97706", bgColor: "#FEF3C7" }, // amber
    da_lap_phieu: { label: "Đã lập phiếu", color: "#7C3AED", bgColor: "#EDE9FE" }, // purple
    da_thanh_toan: { label: "Đã thanh toán", color: "#059669", bgColor: "#D1FAE5" }, // green
} as const

type TinhTrangType = keyof typeof TINH_TRANG_OPTIONS

const MemoizedPageBody = memo(PageBody)

export default function OrdersTable() {
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
    const userInfo = getUserInfo()

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
                totalUSDT: 0,
                totalGiaMua: 0,
                totalLoiNhuan: 0,
            }
        }

        let totalUSDT = 0
        let totalGiaMua = 0

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

                totalUSDT += giaBan
                totalGiaMua += giaMua
            }
        })

        return {
            totalUSDT,
            totalGiaMua,
            totalLoiNhuan: totalUSDT - totalGiaMua,
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
        let totalUSDT = 0,
            totalGiaMua = 0,
            totalThanhToan = 0,
            totalLoiNhuan = 0,
            totalKhachNo = 0
        orders.forEach((order) => {
            const usdt = Number(order.USDT) || 0
            const giaMua = Number(order.GiaMua) || 0
            const thanhToan = Number(order.ThanhToan) || 0
            const loiNhuan = Number(order.LoiNhuan) || 0
            totalUSDT += usdt
            totalGiaMua += giaMua
            totalThanhToan += thanhToan
            totalLoiNhuan += loiNhuan
            totalKhachNo += usdt - thanhToan
        })
        return {
            MaDon: "Tổng cộng",
            USDT: totalUSDT,
            VND: orders.reduce((acc, order) => acc + (Number(order.VND) || 0), 0),
            ThanhToan: totalThanhToan,
            GiaMua: totalGiaMua,
            LoiNhuan: totalLoiNhuan,
            KhachNo: totalKhachNo,
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

    useEffect(() => {
        const ordersRef = ref(database, "orders")
        const unsubscribe = onValue(ordersRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val()
                const ordersArray = Array.isArray(data) ? data : Object.values(data)

                // Store all orders for NDD options
                setAllOrders(ordersArray)

                // Filter orders based on user role, selected NDD, selected period, and customer
                let filteredOrders =
                    userInfo.role === "Admin"
                        ? selectedNDD
                            ? ordersArray.filter((order: any) => order.NDD === selectedNDD)
                            : ordersArray
                        : ordersArray.filter((order: any) => order.NDD === userInfo.username)

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

                // Apply customer filter if selected
                if (selectedCustomer) {
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
                        USDT: summary.totalUSDT,
                        GiaMua: summary.totalGiaMua,
                        LoiNhuan: summary.totalLoiNhuan,
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
        userInfo.role,
        userInfo.username,
        selectedNDD,
        selectedWeek,
        selectedMonth,
        selectedCustomer,
        filterType,
        calculateSummaryRow,
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
            data: "USDT",
            title: "USDT",
            width: 80,
            className: "htRight readonly-column",
            readOnly: true,
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
        { data: "TKNhan", title: "TK nhận", width: 80 },
        {
            data: "ThanhToan",
            title: "Thanh toán",
            width: 80,
            className: "htRight",
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
                                if (dbIndex !== -1) {
                                    try {
                                        await update(ref(database), {
                                            [`orders/${dbIndex}/KTXacNhan`]: "Đã xong",
                                        })
                                    } catch (error) {
                                        console.error("Error updating KTXN:", error)
                                    }
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
            title: "Giá mua",
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
                newButton.className = "w-full h-full flex items-center justify-center px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
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
                            (orderInDb?.ChiTietDonHang || []).map(function (item: any, idx: number) {
                                return {
                                    ...item,
                                    _dbIndex: idx
                                };
                            })
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

            // Update VND if USDT or TiGia changes
            const updateObj: any = { [prop]: newValue }
            if (prop === "USDT" || prop === "TiGia") {
                const usdt = prop === "USDT" ? newValue : order.USDT
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
            <div className="mb-4 flex items-center gap-4">
                {userInfo.role === "Admin" && (
                    <div className="flex items-center gap-2">
                        <label htmlFor="nddFilter" className="text-sm font-medium text-gray-700">
                            Bán hàng:
                        </label>
                        <select
                            id="nddFilter"
                            value={selectedNDD}
                            onChange={(e) => setSelectedNDD(e.target.value)}
                            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                            <option value="">Tất cả</option>
                            {uniqueNDDs.map((ndd) => (
                                <option key={ndd} value={ndd}>
                                    {ndd}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="radio"
                            id="weekFilter"
                            name="filterType"
                            checked={filterType === "week"}
                            onChange={() => setFilterType("week")}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="weekFilter" className="text-sm font-medium text-gray-700">
                            Theo tuần
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="radio"
                            id="monthFilter"
                            name="filterType"
                            checked={filterType === "month"}
                            onChange={() => setFilterType("month")}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="monthFilter" className="text-sm font-medium text-gray-700">
                            Theo tháng
                        </label>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="periodFilter" className="text-sm font-medium text-gray-700">
                        {filterType === "week" ? "Tuần:" : "Tháng:"}
                    </label>
                    <select
                        id="periodFilter"
                        value={filterType === "week" ? selectedWeek : selectedMonth}
                        onChange={(e) => {
                            if (filterType === "week") {
                                setSelectedWeek(e.target.value)
                            } else {
                                setSelectedMonth(e.target.value)
                            }
                        }}
                        className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                        {(filterType === "week" ? uniqueWeeks : uniqueMonths).map((period) => (
                            <option key={period} value={period}>
                                {period}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="customerFilter" className="text-sm font-medium text-gray-700">
                        Khách hàng:
                    </label>
                    <select
                        id="customerFilter"
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                        <option value="">Tất cả</option>
                        {uniqueCustomers.map((customer) => (
                            <option key={customer} value={customer}>
                                {customer}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {/* 4 khối tổng quan */}
            {summaryRow && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="rounded-lg bg-blue-100 p-4 flex flex-col items-center">
                        <div className="text-xs text-blue-700 font-semibold uppercase">Doanh thu</div>
                        <div className="text-2xl font-bold text-blue-700">{summaryRow.USDT?.toLocaleString("vi-VN")}</div>
                    </div>
                    <div className="rounded-lg bg-purple-100 p-4 flex flex-col items-center">
                        <div className="text-xs text-purple-700 font-semibold uppercase">Mua NCC</div>
                        <div className="text-2xl font-bold text-purple-700">{summaryRow.GiaMua?.toLocaleString("vi-VN")}</div>
                    </div>
                    <div className="rounded-lg bg-orange-100 p-4 flex flex-col items-center">
                        <div className="text-xs text-orange-700 font-semibold uppercase">Khách nợ</div>
                        <div className="text-2xl font-bold text-orange-700">{summaryRow.KhachNo?.toLocaleString("vi-VN")}</div>
                    </div>
                    <div className="rounded-lg bg-green-100 p-4 flex flex-col items-center">
                        <div className="text-xs text-green-700 font-semibold uppercase">Lợi nhuận</div>
                        <div className="text-2xl font-bold text-green-700">{summaryRow.LoiNhuan?.toLocaleString("vi-VN")}</div>
                    </div>
                </div>
            )}
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
                    },
                }}
                manualColumnResize={true}
                manualRowResize={true}
                stretchH="all"
                themeName="ht-theme-main"
                className="custom-table"
                hiddenColumns={{ columns: hiddenCols, indicators: true }}
                beforeOnCellContextMenu={(event, coords) => {
                    if (coords.row !== -1) {
                        event.stopImmediatePropagation()
                        event.preventDefault()
                        return false
                    }
                }}
                cells={(row, col) => {
                    if (row === 0 && summaryRow) {
                        return {
                            className: "summary-row",
                            readOnly: true,
                            renderer: (instance, td, row, col, prop, value) => {
                                if (["USDT", "VND", "ThanhToan", "GiaMua", "LoiNhuan"].includes(prop as string)) {
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
                                } else if (prop === "TinhTrang") {
                                    td.style.fontWeight = "600"
                                    td.style.backgroundColor = "#fecaca"
                                    td.style.color = "#dc2626"
                                    td.style.textAlign = "center"
                                    td.innerHTML = "Tổng"
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
                    if (["USDT", "VND", "ThanhToan", "GiaMua", "LoiNhuan"].includes(prop as string)) {
                        return {
                            renderer: (instance, td, row, col, prop, value) => {
                                td.style.color = "#dc2626"
                                td.style.textAlign = "right"
                                td.style.fontWeight = "500"
                                td.innerHTML = value?.toLocaleString("vi-VN") || "0"
                                return td
                            },
                        }
                    }
                    return {}
                }}
            />

            {isModalOpen && selectedOrder && selectedOrderDbIndex !== null && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                    <div className="bg-white rounded-lg w-full overflow-auto relative z-[1001]">
                        <div className="bg-[#2563eb] text-white flex items-center justify-center py-2 rounded-t-lg relative">
                            <h3 className="pt-10 font-semibold w-full text-center">Chi tiết đơn hàng: {selectedOrder.MaDon}</h3>
                            <div className="absolute top-14 right-0 -translate-y-1/2 z-[1002]">
                                <button
                                    onClick={handleCloseModal}
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
                                order={selectedOrderDetails}
                                supplierName={selectedOrder.NDD}
                                orderIndex={selectedOrderDbIndex} // Pass the database index instead of filtered table index
                                onOrderUpdate={() => {
                                    setIsLoading(true)
                                    // Force refresh of orders when details are updated
                                    const ordersRef = ref(database, "orders")
                                    onValue(
                                        ordersRef,
                                        (snapshot) => {
                                            if (snapshot.exists()) {
                                                const data = snapshot.val()
                                                const ordersArray = Array.isArray(data) ? data : Object.values(data)

                                                const updatedOrders = ordersArray.map((order: any) => {
                                                    const summary = calculateOrderSummary(order)
                                                    return {
                                                        ...order,
                                                        USDT: summary.totalUSDT,
                                                        GiaMua: summary.totalGiaMua,
                                                        LoiNhuan: summary.totalLoiNhuan,
                                                    }
                                                })

                                                setAllOrders(updatedOrders)
                                                // Update selectedOrder with the latest data from database
                                                if (selectedOrderDbIndex !== null && updatedOrders[selectedOrderDbIndex]) {
                                                    setSelectedOrder(updatedOrders[selectedOrderDbIndex])
                                                    setSelectedOrderDetails(
                                                        (updatedOrders[selectedOrderDbIndex]?.ChiTietDonHang || []).map(function (item: any, idx: number) {
                                                            return {
                                                                ...item,
                                                                _dbIndex: idx
                                                            };
                                                        })
                                                    )
                                                }
                                            }
                                            setIsLoading(false)
                                        },
                                        { onlyOnce: true },
                                    )
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
