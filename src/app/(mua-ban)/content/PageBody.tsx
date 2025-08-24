"use client"
import { useEffect, useMemo, useState } from "react"
import { HotTable } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import "./custom-table.css"
import type Handsontable from "handsontable"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import { Toaster } from "sonner"
import { Modal } from "antd"
import { database, onValue, ref, set } from "@/lib/firebase"
import { Users, Package, Filter, BarChart3, X, Home } from "lucide-react"
import Link from "next/link"
import getUserInfo from "@/components/userInfo"
import sheetApiRequest from "@/apiRequests/sheet"

registerAllModules()

type NestedColumnHeader = {
    label: string
    colspan: number
}

const getVietnamWeekDates = (date: Date) => {
    // Tạo bản sao của date để không làm thay đổi date gốc
    const dateCopy = new Date(date)
    const day = dateCopy.getDay()

    // Tính ngày thứ 2 của tuần (Monday = 1, Sunday = 0)
    // Nếu là chủ nhật (day = 0), lùi về 6 ngày để đến thứ 2
    // Nếu là thứ 2 đến thứ 7 (day = 1-6), lùi về (day - 1) ngày để đến thứ 2
    const daysToMonday = day === 0 ? 6 : day - 1
    const monday = new Date(dateCopy)
    monday.setDate(dateCopy.getDate() - daysToMonday)

    // Thứ 2 + 6 ngày = Chủ nhật
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return {
        start: monday.toISOString().split("T")[0],
        end: sunday.toISOString().split("T")[0],
        label: `${monday.getDate()}/${monday.getMonth() + 1} - ${sunday.getDate()}/${sunday.getMonth() + 1}`,
    }
}

// Hàm chuyển đổi format ngày từ DD/MM/YYYY sang Date object
const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null

    // Xử lý format DD/MM/YYYY
    if (dateStr.includes("/")) {
        const parts = dateStr.split("/")
        if (parts.length === 3) {
            const day = parseInt(parts[0])
            const month = parseInt(parts[1]) - 1 // Month index từ 0-11
            const year = parseInt(parts[2])

            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                return new Date(year, month, day)
            }
        }
    }

    // Thử parse với Date constructor
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
        return date
    }

    return null
}

const generateWeekOptions = (orders: any[]) => {
    const weeks: Array<{
        value: string
        label: string
        start: string
        end: string
        count: number
    }> = []
    const weekMap = new Map<string, number>() // Map để lưu trữ tuần và đếm đơn hàng

    // Duyệt qua tất cả đơn hàng để tìm các tuần có dữ liệu
    orders.forEach((order) => {
        if (!order.NgayOrder) return

        try {
            const orderDate = parseDate(order.NgayOrder)
            if (!orderDate) return

            // Tìm tuần chứa ngày đơn hàng
            const week = getVietnamWeekDates(orderDate)
            const weekKey = `${week.start}_${week.end}`

            // Debug: log để kiểm tra
            console.log(`Order date: ${order.NgayOrder} -> Parsed: ${orderDate.toISOString()} -> Week: ${week.start} to ${week.end}`)
            console.log(`Week key: ${weekKey}`)

            if (weekMap.has(weekKey)) {
                weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1)
            } else {
                weekMap.set(weekKey, 1)
            }
        } catch (error) {
            return
        }
    })

    // Chuyển đổi map thành array và tạo options
    weekMap.forEach((orderCount, weekKey) => {
        const [start, end] = weekKey.split('_')

        // Tính số tuần ISO của năm theo chuẩn ISO 8601
        const weekStart = new Date(start)
        const getISOWeek = (date: Date) => {
            const target = new Date(date.valueOf())
            const dayNr = (date.getDay() + 6) % 7
            target.setDate(target.getDate() - dayNr + 3)
            const firstThursday = target.valueOf()
            const yearStart = new Date(target.getFullYear(), 0, 1)
            const weekNr = 1 + Math.ceil((firstThursday - yearStart.valueOf()) / 604800000)
            return weekNr
        }

        const weekNumber = getISOWeek(weekStart)

        weeks.push({
            value: weekKey,
            label: `Tuần ${weekNumber}`,
            start: start,
            end: end,
            count: orderCount,
        })
    })

    // Sắp xếp theo thứ tự thời gian (mới nhất trước)
    return weeks.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
}

const getCurrentWeekKey = () => {
    const today = new Date()
    const week = getVietnamWeekDates(today)
    return `${week.start}_${week.end}`
}

export default function PageBody() {
    const RowHeader = [
        "Mã ĐH",
        "Ngày Order",
        "Tên SP",
        "Số Lượng",
        "Mua",
        "Bán",
        "Mua",
        "Bán",
        "Lợi Nhuận",
        "Mã NCC",
        "Mã KH",
        "Tình Trạng",
        "Hành Động",
    ]

    const topHeader: NestedColumnHeader[] = [
        { label: "", colspan: 2 },
        { label: "Thông Tin ĐH", colspan: 2 },
        { label: "Đơn Giá", colspan: 2 },
        { label: "Thành Tiền", colspan: 3 },
        { label: "Đối Tác", colspan: 2 },
        { label: "", colspan: 1 },
        { label: "", colspan: 1 },
    ]

    const nestedHeaders: (string | NestedColumnHeader)[][] = [topHeader, RowHeader]
    const userInfo = getUserInfo()
    const [orders, setOrders] = useState<any[]>([])
    const [showModal, setShowModal] = useState(false)
    const [selectedItems, setSelectedItems] = useState<any[]>([])
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

    const [filters, setFilters] = useState({
        maNCC: "",
        maKH: "",
        week: "", // Khởi tạo trống, sẽ được set trong useEffect
    })

    // Tạo tuần hiện tại làm giá trị mặc định
    const currentWeek = useMemo(() => {
        const today = new Date()
        const week = getVietnamWeekDates(today)
        return `${week.start}_${week.end}`
    }, [])

    // Cập nhật filter mặc định khi component mount (chỉ chạy 1 lần)
    useEffect(() => {
        let defaultFilters = { ...filters, week: currentWeek }

        // Tự động lọc theo role và username
        if (userInfo?.role === "NCC") {
            defaultFilters.maNCC = userInfo.username
        } else if (userInfo?.role === "Nhân viên") {
            defaultFilters.maKH = userInfo.username
        }

        setFilters(defaultFilters)
    }, []) // Chỉ chạy 1 lần khi component mount

    useEffect(() => {
        const ordersRef = ref(database, "orderContent")
        const unsubscribe = onValue(ordersRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val() || {}
                const list = Object.values(data) as any[]
                setOrders(list)
            } else {
                setOrders([])
            }
        })

        return () => {
            unsubscribe()
        }
    }, [])

    const filteredOrders = useMemo(() => {
        let filtered = orders

        // Debug: log filter hiện tại
        console.log("Current filters:", filters)
        console.log("Filter week:", filters.week)

        // Phân quyền dữ liệu theo role
        if (userInfo?.role === "Nhân viên") {
            filtered = filtered.filter((order) => order.MaKH === userInfo.username)
        } else if (userInfo?.role === "NCC") {
            filtered = filtered.filter(
                (order) =>
                    order.MaNCC === userInfo.username && (order.TinhTrang === "Đang chờ NCC" || order.TinhTrang === "Đã xong"),
            )
        }

        // Áp dụng các filter
        return filtered.filter((order) => {
            // Filter by Mã NCC
            if (filters.maNCC && order.MaNCC !== filters.maNCC) return false

            // Filter by Mã KH
            if (filters.maKH && order.MaKH !== filters.maKH) return false

            // Filter by week
            if (filters.week) {
                try {
                    const [weekStart, weekEnd] = filters.week.split("_")
                    if (!order.NgayOrder) return false

                    const orderDate = parseDate(order.NgayOrder)
                    if (!orderDate) return false

                    const orderDateStr = orderDate.toISOString().split("T")[0]

                    // Debug: log để kiểm tra filter tuần
                    console.log(`Filtering order: ${order.MaDon}, Date: ${order.NgayOrder} -> ${orderDateStr}, Week: ${weekStart} to ${weekEnd}`)
                    console.log(`Date comparison: ${orderDateStr} >= ${weekStart} = ${orderDateStr >= weekStart}, ${orderDateStr} <= ${weekEnd} = ${orderDateStr <= weekEnd}`)

                    // So sánh ngày chính xác hơn
                    const isInWeek = orderDateStr >= weekStart && orderDateStr <= weekEnd
                    if (!isInWeek) {
                        console.log(`Order ${order.MaDon} excluded: ${orderDateStr} not in week ${weekStart}-${weekEnd}`)
                        return false
                    } else {
                        console.log(`Order ${order.MaDon} included: ${orderDateStr} is in week ${weekStart}-${weekEnd}`)
                    }
                } catch (error) {
                    console.error("Error filtering by week:", error)
                    return false
                }
            }

            return true
        })
    }, [orders, filters, userInfo])



    const statistics = useMemo(() => {
        const completedOrders = filteredOrders.filter((order) => order.TinhTrang === "Đã xong")
        const cancelledOrders = filteredOrders.filter((order) => order.TinhTrang === "Đã hủy")
        const waitingNCCOrders = filteredOrders.filter((order) => order.TinhTrang === "Đang chờ NCC")
        const notEnteredOrders = filteredOrders.filter((order) => order.TinhTrang === "Chưa nhập")

        return {
            completedOrders: completedOrders.length,
            completedAmount: completedOrders.reduce((sum, order) => sum + (Number(order.TongTienMua) || 0), 0),
            cancelledOrders: cancelledOrders.length,
            cancelledAmount: cancelledOrders.reduce((sum, order) => sum + (Number(order.TongTienMua) || 0), 0),
            waitingNCCOrders: waitingNCCOrders.length,
            waitingNCCAmount: waitingNCCOrders.reduce((sum, order) => sum + (Number(order.TongTienMua) || 0), 0),
            notEnteredOrders: notEnteredOrders.length,
            notEnteredAmount: notEnteredOrders.reduce((sum, order) => sum + (Number(order.TongTienMua) || 0), 0),
        }
    }, [filteredOrders])

    const filterOptions = useMemo(() => {
        // Sử dụng filteredOrders (đã được filter theo tuần) để hiển thị options phù hợp
        const nccOptions = [...new Set(filteredOrders.map((order) => order.MaNCC).filter(Boolean))].sort()
        const khOptions = [...new Set(filteredOrders.map((order) => order.MaKH).filter(Boolean))].sort()
        const weekOptions = generateWeekOptions(orders) // Tuần vẫn lấy từ dữ liệu gốc để hiển thị tất cả

        return { nccOptions, khOptions, weekOptions }
    }, [filteredOrders, orders])

    const tableData = useMemo(() => {
        return filteredOrders.map((order: any) => [
            order.MaDon || "",
            order.NgayOrder || "",
            order.TenSP || "",
            order.SoLuong ?? "",
            order.DonGiaMua ?? "",
            order.DonGiaBan ?? "",
            order.TongTienMua ?? "",
            order.TongTienBan ?? "",
            typeof order.TongTienBan === "number" && typeof order.TongTienMua === "number"
                ? Number((order.TongTienBan - order.TongTienMua).toFixed(2))
                : "",
            order.MaNCC || "",
            order.MaKH || "",
            order.TinhTrang || "",
            "Xem chi tiết",
        ])
    }, [filteredOrders])

    const columnsSettings: Handsontable.ColumnSettings[] = useMemo(() => {
        const base = RowHeader.map((): Handsontable.ColumnSettings => ({ readOnly: true }))

        // Helper: money renderer with color
        const moneyRenderer = (picker: (o: any) => number | string | undefined, colorPicker: (n: number) => string) => {
            return (_i: any, td: HTMLTableCellElement, row: number) => {
                const order = filteredOrders[row]
                const raw = picker(order)
                const val = Number(raw ?? 0)
                if (!Number.isFinite(val)) {
                    td.textContent = ""
                    return
                }
                td.textContent = `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                td.style.color = colorPicker(val)
                td.style.fontWeight = "600"
                td.style.textAlign = "center"
            }
        }

        // Mã ĐH (red, bold)
        base[0] = {
            readOnly: true,
            renderer: (_i, td, row) => {
                td.textContent = filteredOrders[row]?.MaDon || ""
                td.style.color = "#ef4444" // red-500
                td.style.fontWeight = "700"
                td.style.textAlign = "center"
            },
        }

        // Ngày Order: show DD/MM with calendar icon
        base[1] = {
            readOnly: true,
            renderer: (_i, td, row) => {
                const raw = String(filteredOrders[row]?.NgayOrder || "")
                let ddmm = raw
                if (raw.includes("/")) {
                    const p = raw.split("/")
                    // try dd/mm(/yyyy)
                    ddmm = `${p[0] || ""}/${p[1] || ""}`
                }
                td.textContent = `📅 ${ddmm}`.trim()
                td.style.color = "#0f172a" // slate-900
                td.style.fontWeight = "500"
                td.style.textAlign = "center"
            },
        }

        // Default black centered text for common columns
        const blackCenterRenderer = (
            _i: any,
            td: HTMLTableCellElement,
            row: number,
            _col: number,
            _p?: any,
            value?: any,
        ) => {
            // Keep default text via value if provided
            if (value !== undefined && value !== null) td.textContent = String(value)
            td.style.color = "#111827" // slate-900
            td.style.textAlign = "center"
            td.style.fontWeight = "500"
        }

        base[2] = { readOnly: true, renderer: blackCenterRenderer }
        base[3] = { readOnly: true, renderer: blackCenterRenderer }
        base[9] = { readOnly: true, renderer: blackCenterRenderer }
        base[10] = { readOnly: true, renderer: blackCenterRenderer }

        // Đơn Giá Mua (red), Đơn Giá Bán (green)
        base[4] = {
            readOnly: true,
            renderer: moneyRenderer(
                (o) => o?.DonGiaMua,
                () => "#ef4444",
            ),
        }
        base[5] = {
            readOnly: true,
            renderer: moneyRenderer(
                (o) => o?.DonGiaBan,
                () => "#16a34a",
            ),
        }
        // Tổng Tiền Mua (red), Tổng Tiền Bán (green)
        base[6] = {
            readOnly: true,
            renderer: moneyRenderer(
                (o) => o?.TongTienMua,
                () => "#ef4444",
            ),
        }
        base[7] = {
            readOnly: true,
            renderer: moneyRenderer(
                (o) => o?.TongTienBan,
                () => "#16a34a",
            ),
        }
        // Lợi Nhuận: green if >=0 else red
        base[8] = {
            readOnly: true,
            renderer: moneyRenderer(
                (o) => {
                    const buy = Number(o?.TongTienMua ?? 0)
                    const sell = Number(o?.TongTienBan ?? 0)
                    return Number((sell - buy).toFixed(2))
                },
                (n) => (n >= 0 ? "#16a34a" : "#ef4444"),
            ),
        }

        // Tình Trạng color
        base[11] = {
            readOnly: true,
            renderer: (_i, td, row) => {
                const status = filteredOrders[row]?.TinhTrang || "Chưa nhập"
                td.textContent = status
                let color = "#f59e0b" // amber-500 for default
                let bg = "#fef3c7" // amber-100
                if (status === "Đã hủy") {
                    color = "#ef4444"
                    bg = "#fee2e2"
                } else if (status === "Đang chờ NCC") {
                    color = "#3b82f6"
                    bg = "#dbeafe"
                } else if (status === "Đã xong") {
                    color = "#16a34a"
                    bg = "#dcfce7"
                }
                td.style.color = color
                td.style.fontWeight = "700"
                td.style.textAlign = "center"
                td.style.backgroundColor = bg
                td.style.borderRadius = "4px"
                td.style.padding = "2px 6px"
            },
        }

        // Action column with button
        base[RowHeader.length - 1] = {
            readOnly: true,
            renderer: (_instance, td, row) => {
                td.textContent = ""
                td.style.padding = "0"
                const btn = document.createElement("button")

                // Tạo icon mắt SVG
                const eyeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
                eyeIcon.setAttribute("width", "16")
                eyeIcon.setAttribute("height", "16")
                eyeIcon.setAttribute("viewBox", "0 0 24 24")
                eyeIcon.setAttribute("fill", "none")
                eyeIcon.style.marginRight = "6px"

                // Tạo path cho icon mắt
                const eyePath = document.createElementNS("http://www.w3.org/2000/svg", "path")
                eyePath.setAttribute("d", "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z")
                eyePath.setAttribute("stroke", "currentColor")
                eyePath.setAttribute("stroke-width", "2")
                eyePath.setAttribute("stroke-linecap", "round")
                eyePath.setAttribute("stroke-linejoin", "round")

                // Tạo path cho con ngươi
                const pupilPath = document.createElementNS("http://www.w3.org/2000/svg", "circle")
                pupilPath.setAttribute("cx", "12")
                pupilPath.setAttribute("cy", "12")
                pupilPath.setAttribute("r", "3")
                pupilPath.setAttribute("stroke", "currentColor")
                pupilPath.setAttribute("stroke-width", "2")
                pupilPath.setAttribute("fill", "currentColor")

                eyeIcon.appendChild(eyePath)
                eyeIcon.appendChild(pupilPath)

                // Tạo text
                const text = document.createElement("span")
                text.textContent = "Xem"
                text.style.fontSize = "12px"
                text.style.fontWeight = "500"

                btn.appendChild(eyeIcon)
                btn.appendChild(text)

                btn.style.width = "100%"
                btn.style.height = "100%"
                btn.style.display = "flex"
                btn.style.alignItems = "center"
                btn.style.justifyContent = "center"
                btn.style.backgroundColor = "#3b82f6"
                btn.style.color = "white"
                btn.style.border = "none"
                btn.style.cursor = "pointer"
                btn.style.transition = "all 0.2s ease"

                // Hiệu ứng hover
                btn.onmouseover = () => {
                    btn.style.backgroundColor = "#2563eb"
                    btn.style.transform = "scale(1.02)"
                }
                btn.onmouseout = () => {
                    btn.style.backgroundColor = "#3b82f6"
                    btn.style.transform = "scale(1)"
                }

                btn.onclick = () => {
                    const order = filteredOrders[row]
                    const items = Array.isArray(order?.items) ? order.items : []
                    setSelectedOrder(order)
                    setSelectedItems(items)
                    setShowModal(true)
                }
                td.appendChild(btn)
            },
        }

        return base
    }, [RowHeader, filteredOrders])

    const itemHeaders = [
        "Mã đơn",
        "KH Note 1",
        "KH Note 2",
        "Deadline",
        "Chủ đề",
        "Anchor 1",
        "URL 1",
        "Anchor 2",
        "URL 2",
        "Link KQ",
        "Hành động",
    ]

    const itemsTableData = useMemo(() => {
        return (selectedItems || []).map((it: any) => [
            it.MaDon || "",
            it.KHNote1 || "",
            it.KHNote2 || "",
            it.Deadline || "",
            it.ChuDe || "",
            it.Anchor1 || "",
            it.URL1 || "",
            it.Anchor2 || "",
            it.URL2 || "",
            it.LinkKQ || "",
            "Xóa",
        ])
    }, [selectedItems])

    // Map only editable columns (exclude col 0: MaDon and last action col)
    const colIndexToKey = useMemo(
        () =>
            ({
                1: "KHNote1",
                2: "KHNote2",
                3: "Deadline",
                4: "ChuDe",
                5: "Anchor1",
                6: "URL1",
                7: "Anchor2",
                8: "URL2",
                9: "LinkKQ",
            }) as Record<number, string>,
        [],
    )

    // Keys that, when edited, should set TinhTrangKH to "Đã nhập"
    const khKeys = useMemo(() => new Set(["ChuDe", "Anchor1", "Anchor2", "URL1", "URL2"]), [])

    // Duplicate detector for columns: Anchor1, URL1, Anchor2, URL2, LinkKQ
    const duplicateSets = useMemo(() => {
        const keys = ["Anchor1", "URL1", "Anchor2", "URL2", "LinkKQ"] as const
        const counts: Record<string, Map<string, number>> = {}
        const dups: Record<string, Set<string>> = {}
        keys.forEach((k) => {
            counts[k] = new Map()
            dups[k] = new Set()
        })
        for (const it of selectedItems || []) {
            keys.forEach((k) => {
                const raw = (it?.[k] ?? "") as string
                const norm = raw.trim().toLowerCase()
                if (!norm) return
                counts[k].set(norm, (counts[k].get(norm) || 0) + 1)
            })
        }
        keys.forEach((k) => {
            for (const [val, cnt] of counts[k].entries()) {
                if (cnt > 1) dups[k].add(val)
            }
        })
        return dups
    }, [selectedItems])

    const persistSelectedOrder = async (newItems: any[]) => {
        if (!selectedOrder?.MaDon) return
        // Always renumber MaDon for items based on outer MaDon and index
        const normalizedItems = newItems.map((it, idx) => {
            const item = {
                ...it,
                MaDon: `${selectedOrder.MaDon}-${idx + 1}`,
            } as any
            // Derive KH status from key fields to be robust for first-row edits/pastes
            const hasKHInput = Boolean(
                (item.ChuDe && item.ChuDe !== "") ||
                (item.Anchor1 && item.Anchor1 !== "") ||
                (item.Anchor2 && item.Anchor2 !== "") ||
                (item.URL1 && item.URL1 !== "") ||
                (item.URL2 && item.URL2 !== ""),
            )
            if (hasKHInput) item.TinhTrangKH = "Đã nhập"
            // Derive NCC status from LinkKQ
            if (item.LinkKQ && item.LinkKQ !== "") item.TinhTrangNCC = "Đã nhập"
            return item
        })

        const soLuong = normalizedItems.length
        const donGiaMua = Number(selectedOrder.DonGiaMua || 0)
        const donGiaBan = Number(selectedOrder.DonGiaBan || 0)
        const tongTienMua = Number((donGiaMua * soLuong).toFixed(2))
        const tongTienBan = Number((donGiaBan * soLuong).toFixed(2))

        // Derive outer status
        let outerStatus = selectedOrder.TinhTrang || "Chưa nhập"
        const allKH = normalizedItems.length > 0 && normalizedItems.every((i: any) => i.TinhTrangKH === "Đã nhập")
        const allNCC = normalizedItems.length > 0 && normalizedItems.every((i: any) => i.TinhTrangNCC === "Đã nhập")

        // Chỉ gọi API khi trạng thái thực sự thay đổi
        let shouldCallAPI = false

        if (allNCC && outerStatus !== "Đã xong") {
            outerStatus = "Đã xong"
            shouldCallAPI = true
            const message = `Mã đơn ${selectedOrder.MaDon} : NCC ${selectedOrder.MaNCC} đã hoàn thành ${normalizedItems.length} bài.`
            sheetApiRequest.getIDKH(selectedOrder.MaKH, message)
        } else if (allKH && outerStatus !== "Đang chờ NCC") {
            outerStatus = "Đang chờ NCC"
            shouldCallAPI = true
            const message = `Mã đơn ${selectedOrder.MaDon} : ${selectedOrder.MaKH} đã gửi yêu cầu ${normalizedItems.length} bài. Vui lòng truy cập https://www.ylink.shop/content để xử lý.`
            sheetApiRequest.getIDNCC(selectedOrder.MaNCC, message)
        }

        const updatedOrder = {
            ...selectedOrder,
            SoLuong: soLuong,
            TongTienMua: tongTienMua,
            TongTienBan: tongTienBan,
            items: normalizedItems,
            TinhTrang: outerStatus,
        }

        await set(ref(database, `orderContent/${selectedOrder.MaDon}`), updatedOrder)

        setSelectedOrder(updatedOrder)
        setSelectedItems(normalizedItems)
    }

    return (
        <>
            <Toaster position="top-right" expand={true} richColors />

            <div className="min-h-screen bg-slate-50 p-2">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-900 rounded-lg shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <BarChart3 className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-blue-50">Quản Lý Đơn Hàng</h1>
                                    <p className="text-sm text-blue-100">Theo dõi và quản lý đơn hàng hiệu quả</p>
                                </div>
                            </div>
                            <Link
                                href="/"
                                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 border border-white/30 hover:border-white/50"
                            >
                                <Home className="w-4 h-4" />
                                <span className="text-sm font-medium">Về Trang Chủ</span>
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-emerald-600" />
                                        <div>
                                            <p className="text-sm font-semibold text-emerald-600">Đã Xong</p>
                                            <p className="text-xs text-emerald-600">{statistics.completedOrders} đơn hàng</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-emerald-600">
                                            ${statistics.completedAmount.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <X className="w-4 h-4 text-red-600" />
                                        <div>
                                            <p className="text-sm font-semibold text-red-600">Đã Hủy</p>
                                            <p className="text-xs text-red-600">{statistics.cancelledOrders} đơn hàng</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-red-600">${statistics.cancelledAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-amber-600" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-600">Chờ NCC</p>
                                            <p className="text-xs text-amber-600">{statistics.waitingNCCOrders} đơn hàng</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-amber-600">${statistics.waitingNCCAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-slate-600" />
                                        <div>
                                            <p className="text-sm font-semibold text-slate-600">Chưa Nhập</p>
                                            <p className="text-xs text-slate-600">{statistics.notEnteredOrders} đơn hàng</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-slate-600">${statistics.notEnteredAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md">
                                    <Filter className="w-4 h-4 text-blue-50" />
                                </div>
                                <span className="text-sm font-semibold text-blue-50">Bộ Lọc</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {/* Filter NCC - Chỉ Admin và Nhân viên mới thấy */}
                                {(userInfo?.role === "Admin" || userInfo?.role === "Nhân viên") && (
                                    <select
                                        className={`px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 ${userInfo?.role === "NCC"
                                            ? "border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                                            : "border-slate-300 bg-white hover:border-slate-400"
                                            }`}
                                        value={filters.maNCC}
                                        onChange={(e) => setFilters((prev) => ({ ...prev, maNCC: e.target.value }))}
                                        disabled={userInfo?.role === "NCC"}
                                    >
                                        <option value="">Tất cả NCC</option>
                                        {filterOptions.nccOptions.map((ncc) => (
                                            <option key={ncc} value={ncc}>
                                                {ncc}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {/* Filter KH - Chỉ Admin và NCC mới thấy */}
                                {(userInfo?.role === "Admin" || userInfo?.role === "NCC") && (
                                    <select
                                        className={`px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 ${userInfo?.role === "Nhân viên"
                                            ? "border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                                            : "border-slate-300 bg-white hover:border-slate-400"
                                            }`}
                                        value={filters.maKH}
                                        onChange={(e) => setFilters((prev) => ({ ...prev, maKH: e.target.value }))}
                                        disabled={userInfo?.role === "Nhân viên"}
                                    >
                                        <option value="">Tất cả KH</option>
                                        {filterOptions.khOptions.map((kh) => (
                                            <option key={kh} value={kh}>
                                                {kh}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                <select
                                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200 hover:border-slate-400"
                                    value={filters.week}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, week: e.target.value }))}
                                >

                                    {filterOptions.weekOptions.map((week) => {
                                        return (
                                            <option key={week.value} value={week.value}>
                                                {week.label}
                                            </option>
                                        )
                                    })}
                                </select>

                                {/* Nút xóa bộ lọc - chỉ reset các filter có thể thay đổi */}
                                {((userInfo?.role === "Admin" && (filters.maNCC || filters.maKH)) ||
                                    (userInfo?.role === "Nhân viên" && filters.maNCC) ||
                                    (userInfo?.role === "NCC" && filters.maKH)) && (
                                        <button
                                            onClick={() => {
                                                if (userInfo?.role === "Admin") {
                                                    setFilters((prev) => ({ ...prev, maNCC: "", maKH: "" }))
                                                } else if (userInfo?.role === "Nhân viên") {
                                                    setFilters((prev) => ({ ...prev, maNCC: "" }))
                                                } else if (userInfo?.role === "NCC") {
                                                    setFilters((prev) => ({ ...prev, maKH: "" }))
                                                }
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors duration-200 font-medium"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            Xóa bộ lọc
                                        </button>
                                    )}
                            </div>
                        </div>
                    </div>
                    <div>
                        <HotTable
                            themeName="ht-theme-main"
                            colHeaders={RowHeader}
                            nestedHeaders={nestedHeaders as any}
                            columns={columnsSettings}
                            data={tableData}
                            filters={true}
                            width="100%"
                            autoColumnSize={true}
                            manualColumnResize={true}
                            stretchH="all"
                            manualRowMove={true}
                            manualColumnMove={true}
                            manualRowResize={true}
                            className="custom-table"
                            licenseKey="non-commercial-and-evaluation"
                            rowHeaders={false}
                            dropdownMenu={false}
                            columnSorting={false}
                            hiddenColumns={{
                                columns: userInfo?.role === "NCC" ? [4, 6, 8] : undefined,
                            }}
                        />
                    </div>
                </div>
            </div>

            <Modal
                open={showModal}
                onCancel={() => setShowModal(false)}
                footer={
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
                        {userInfo?.role === "Admin" || userInfo?.role === "Nhân viên" ? (
                            <div className="text-center">
                                <p className="text-sm text-gray-700 font-medium">
                                    📋 <strong>Hướng dẫn cho Bán hàng:</strong>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    Yêu cầu nhập đủ đơn, nếu không đủ thì phải xóa để thực hiện xong việc lên đơn.
                                </p>
                            </div>
                        ) : userInfo?.role === "NCC" ? (
                            <div className="text-center">
                                <p className="text-sm text-gray-700 font-medium">
                                    🔗 <strong>Hướng dẫn cho NCC:</strong>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">Yêu cầu phải nhập đầy đủ Link KQ thì mới xong được.</p>
                            </div>
                        ) : null}
                    </div>
                }
                width={"80%"}
                styles={{
                    body: { padding: 0, borderRadius: "16px" },
                    content: { padding: 0, borderRadius: "16px" },
                    mask: { borderRadius: "16px" },
                }}
                className="[&_.ant-modal-content]:overflow-hidden [&_.ant-modal-body]:overflow-hidden"
                centered
                closeIcon={
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                        <X className="w-5 h-5 text-white" />
                    </div>
                }
            >
                <div className="bg-gradient-to-r from-blue-500 to-blue-900 rounded-xl overflow-hidden">
                    <div className="px-6 pt-3 border-t border-blue-400">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Danh sách chi tiết ({selectedItems.length} items)
                        </h3>
                        <p className="text-blue-100 text-sm mt-1">Quản lý thông tin chi tiết từng item trong đơn hàng</p>
                    </div>
                    <div className="px-6 py-1 space-y-3 [&_*]:scrollbar-hide">
                        {(() => {
                            const duplicateLinkKQItems = selectedItems.filter((item) => {
                                const linkKQ = (item.LinkKQ || "").trim().toLowerCase()
                                return linkKQ && duplicateSets.LinkKQ?.has(linkKQ)
                            })
                            if (duplicateLinkKQItems.length > 0) {
                                return (
                                    <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 rounded-lg p-3 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                            <span className="text-sm font-medium text-yellow-800">
                                                ⚠️ Phát hiện {duplicateLinkKQItems.length} Link KQ trùng lặp
                                            </span>
                                            <span className="text-xs text-yellow-700 bg-yellow-200 px-2 py-1 rounded-full">
                                                Cần kiểm tra và sửa
                                            </span>
                                        </div>
                                    </div>
                                )
                            }
                            return null
                        })()}

                        {/* Warning for incomplete KH entries - Admin/Nhân viên only need ONE field filled */}
                        {(() => {
                            if (userInfo?.role === "Admin" || userInfo?.role === "Nhân viên") {
                                const incompleteKHItems = selectedItems.filter(
                                    (item) => !item.ChuDe && !item.Anchor1 && !item.URL1 && !item.Anchor2 && !item.URL2,
                                )
                                if (incompleteKHItems.length > 0) {
                                    return (
                                        <div className="bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-lg p-3 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                                <span className="text-sm font-medium text-amber-800">
                                                    ⚠️ {incompleteKHItems.length} đơn chưa nhập thông tin
                                                </span>
                                                <span className="text-xs text-amber-700 bg-amber-200 px-2 py-1 rounded-full">
                                                    Cần ít nhất 1 trong: Chủ đề, Anchor, URL
                                                </span>
                                            </div>
                                        </div>
                                    )
                                }
                            }
                            return null
                        })()}

                        {/* Warning for missing LinkKQ from NCC */}
                        {(() => {
                            if (userInfo?.role === "NCC") {
                                const missingLinkKQItems = selectedItems.filter((item) => !item.LinkKQ)
                                if (missingLinkKQItems.length > 0) {
                                    return (
                                        <div className="bg-gradient-to-r from-red-100 to-pink-100 border border-red-300 rounded-lg p-3 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                <span className="text-sm font-medium text-red-800">
                                                    🔗 {missingLinkKQItems.length} đơn chưa có Link KQ
                                                </span>
                                                <span className="text-xs text-red-700 bg-red-200 px-2 py-1 rounded-full">
                                                    NCC cần cung cấp Link KQ
                                                </span>
                                            </div>
                                        </div>
                                    )
                                }
                            } else {
                                // For Admin/Nhân viên - show items that have info but missing LinkKQ
                                const missingLinkKQItems = selectedItems.filter(
                                    (item) => !item.LinkKQ && (item.ChuDe || item.Anchor1 || item.URL1 || item.Anchor2 || item.URL2),
                                )
                                if (missingLinkKQItems.length > 0) {
                                    return (
                                        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 rounded-lg p-3 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                <span className="text-sm font-medium text-blue-800">
                                                    ⏳ {missingLinkKQItems.length} đơn chờ NCC trả Link KQ
                                                </span>
                                                <span className="text-xs text-blue-700 bg-blue-200 px-2 py-1 rounded-full">
                                                    Đã có thông tin KH
                                                </span>
                                            </div>
                                        </div>
                                    )
                                }
                            }
                            return null
                        })()}

                        {/* Success message when all complete */}
                        {selectedItems.length > 0 &&
                            selectedItems.every(
                                (item) => item.ChuDe && item.Anchor1 && item.URL1 && item.Anchor2 && item.URL2 && item.LinkKQ,
                            ) && (
                                <div className="bg-green-100 border border-green-300 rounded-lg p-3 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-green-800">
                                                ✅ Tất cả {selectedItems.length} đơn hàng đã hoàn thành đầy đủ thông tin
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            )}
                    </div>
                    <div className="bg-white">
                        <HotTable
                            themeName="ht-theme-main"
                            colHeaders={itemHeaders}
                            columns={itemHeaders.map((_, idx): Handsontable.ColumnSettings => {
                                // Check if order status is "Đã xong" to make all columns readonly
                                const isOrderCompleted = selectedOrder?.TinhTrang === "Đã xong"

                                // Last column is action (delete)
                                if (idx === itemHeaders.length - 1) {
                                    return {
                                        readOnly: isOrderCompleted,
                                        renderer: (_inst, td, row) => {
                                            td.textContent = ""
                                            td.style.textAlign = "center"
                                            td.style.verticalAlign = "middle"
                                            td.style.padding = "0.5px"
                                            td.style.margin = "0"
                                            td.style.border = "none"

                                            const del = document.createElement("button")

                                            // Create SVG icon
                                            const svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
                                            svgIcon.setAttribute("width", "18")
                                            svgIcon.setAttribute("height", "18")
                                            svgIcon.setAttribute("viewBox", "0 0 24 24")
                                            svgIcon.setAttribute("fill", "none")
                                            svgIcon.style.marginRight = "6px"

                                            const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
                                            path.setAttribute(
                                                "d",
                                                "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
                                            )
                                            path.setAttribute("fill", "currentColor")

                                            svgIcon.appendChild(path)

                                            // Create text
                                            const text = document.createElement("span")
                                            text.textContent = "Xóa"
                                            text.style.fontWeight = "500"
                                            text.style.fontSize = "13px"

                                            del.appendChild(svgIcon)
                                            del.appendChild(text)

                                            del.style.width = "100%"
                                            del.style.height = "100%"
                                            del.style.borderRadius = "0"
                                            del.style.display = "flex"
                                            del.style.alignItems = "center"
                                            del.style.justifyContent = "center"
                                            del.style.backgroundColor = isOrderCompleted ? "#e5e7eb" : "#fee2e2"
                                            del.style.color = isOrderCompleted ? "#9ca3af" : "#dc2626"
                                            del.style.fontSize = "12px"
                                            del.style.lineHeight = "1"
                                            del.style.cursor = isOrderCompleted ? "not-allowed" : "pointer"
                                            del.style.transition = "all 0.2s ease"
                                            del.style.boxShadow = "none"
                                            del.style.padding = "0"
                                            del.style.margin = "0"
                                            if (!isOrderCompleted) {
                                                del.onmouseover = () => {
                                                    del.style.backgroundColor = "#fecaca"
                                                    del.style.color = "#b91c1c"
                                                }
                                                del.onmouseout = () => {
                                                    del.style.backgroundColor = "#fee2e2"
                                                    del.style.color = "#dc2626"
                                                }
                                            }

                                            if (isOrderCompleted) {
                                                del.onclick = null
                                            } else {
                                                del.onclick = async () => {
                                                    const newItems = [...selectedItems]
                                                    newItems.splice(row, 1)
                                                    await persistSelectedOrder(newItems)
                                                }
                                            }
                                            td.appendChild(del)
                                        },
                                    }
                                }

                                // Mã đơn column (idx 0) with enhanced styling
                                if (idx === 0) {
                                    return {
                                        readOnly: true,
                                        renderer: (_i, td, row) => {
                                            td.textContent = selectedItems[row]?.MaDon || ""
                                            td.style.color = "#dc2626"
                                            td.style.fontWeight = "600"
                                            td.style.textAlign = "center"
                                            td.style.backgroundColor = "#fef2f2"
                                        },
                                    }
                                }

                                // Column key mapping
                                const colIndexToKeyMap: Record<number, string> = {
                                    1: "KHNote1",
                                    2: "KHNote2",
                                    3: "Deadline",
                                    4: "ChuDe",
                                    5: "Anchor1",
                                    6: "URL1",
                                    7: "Anchor2",
                                    8: "URL2",
                                    9: "LinkKQ",
                                }

                                const key = colIndexToKeyMap[idx]

                                // Duplicate highlighting columns
                                const dupKeyByIndex: Record<number, string> = {
                                    5: "Anchor1",
                                    6: "URL1",
                                    7: "Anchor2",
                                    8: "URL2",
                                    9: "LinkKQ",
                                }

                                if (key) {
                                    const isDuplicateColumn = dupKeyByIndex[idx]

                                    return {
                                        readOnly: isOrderCompleted || (userInfo?.role === "NCC" && key !== "LinkKQ"),
                                        renderer: (_i, td, row) => {
                                            const raw = (selectedItems[row]?.[key] ?? "") as string
                                            const norm = raw.trim().toLowerCase()
                                            td.textContent = raw
                                            td.style.textAlign = "center"
                                            td.style.fontSize = "13px"

                                            // Enhanced styling based on content and column type
                                            if (key === "LinkKQ") {
                                                if (raw) {
                                                    // Tạo link clickable
                                                    const link = document.createElement("a")
                                                    link.href = raw
                                                    link.target = "_blank"
                                                    link.textContent = raw
                                                    link.style.color = "#2563eb"
                                                    link.style.textDecoration = "underline"
                                                    link.style.fontWeight = "600"
                                                    link.style.padding = "2px 6px"
                                                    link.style.borderRadius = "4px"
                                                    // Xóa nội dung cũ và thêm link
                                                    td.innerHTML = ""
                                                    td.appendChild(link)
                                                } else {
                                                    td.textContent = raw
                                                    td.style.color = "#dc2626"
                                                    td.style.fontWeight = "400"
                                                }
                                                td.style.textAlign = "left"
                                                td.style.backgroundColor = raw ? "#eff6ff" : "#f87171"
                                            } else if (["ChuDe", "Anchor1", "Anchor2"].includes(key)) {
                                                td.style.color = raw ? "#1f2937" : "#9ca3af"
                                                td.style.backgroundColor = raw ? "#f8fafc" : "#f1f5f9"
                                            } else if (["URL1", "URL2"].includes(key)) {
                                                if (raw) {
                                                    // Tạo link clickable cho URL
                                                    const link = document.createElement("a")
                                                    link.href = raw
                                                    link.target = "_blank"
                                                    link.textContent = raw
                                                    link.style.color = "#1f2937"
                                                    link.style.textDecoration = "underline"
                                                    link.style.fontWeight = "500"
                                                    // Xóa nội dung cũ và thêm link
                                                    td.innerHTML = ""
                                                    td.appendChild(link)
                                                } else {
                                                    td.textContent = raw
                                                    td.style.color = "#9ca3af"
                                                    td.style.fontWeight = "400"
                                                }
                                                td.style.textAlign = "left"
                                                td.style.backgroundColor = raw ? "#f8fafc" : "#f1f5f9"
                                            } else {
                                                td.style.color = "#374151"
                                                td.style.backgroundColor = "#f9fafb"
                                            }

                                            // Highlight duplicates with enhanced styling
                                            if (isDuplicateColumn && norm && duplicateSets[key]?.has(norm)) {
                                                const bgMap: Record<string, string> = {
                                                    ChuDe: "#fef3c7", // amber-100
                                                    Anchor1: "#fed7aa", // orange-200
                                                    URL1: "#e9d5ff", // violet-200
                                                    Anchor2: "#c7d2fe", // indigo-200
                                                    URL2: "#bae6fd", // sky-200
                                                    LinkKQ: "#a7f3d0", // emerald-200
                                                }
                                                td.style.backgroundColor = bgMap[key] || "#f3f4f6"
                                                // Loại bỏ border và borderRadius
                                            }
                                        },
                                    }
                                }

                                return {
                                    readOnly: isOrderCompleted || userInfo?.role === "NCC",
                                    renderer: (_i, td, row, _c, _p, value) => {
                                        if (value !== undefined && value !== null) td.textContent = String(value)
                                        td.style.textAlign = "center"
                                        td.style.color = "#374151"
                                        td.style.padding = "8px"
                                        td.style.fontSize = "13px"
                                        td.style.backgroundColor = "#f9fafb"
                                    },
                                }
                            })}
                            data={itemsTableData}
                            licenseKey="non-commercial-and-evaluation"
                            width="100%"
                            stretchH="all"
                            colWidths={[25, 20, 20, 20, 30, 30, 35, 30, 35, 40, 25]}
                            height={450}
                            hiddenColumns={
                                userInfo?.role === "NCC"
                                    ? {
                                        columns: [10],
                                    }
                                    : undefined
                            }
                            afterChange={async (changes, source) => {
                                if (!changes || !selectedOrder) return
                                if (source === "loadData") return

                                // Kiểm tra quyền của NCC
                                if (userInfo?.role === "NCC") {
                                    // NCC chỉ có thể thay đổi LinkKQ
                                    const hasUnauthorizedChanges = changes.some(([row, col, _oldVal, newVal]) => {
                                        const key = colIndexToKey[col as number]
                                        return key && key !== "LinkKQ"
                                    })

                                    if (hasUnauthorizedChanges) {
                                        // Nếu có thay đổi không được phép, bỏ qua
                                        return
                                    }
                                }

                                const newItems = [...selectedItems]
                                // Ensure we apply each change even if multiple target the same row 0
                                changes.forEach(([row, col, _oldVal, newVal]) => {
                                    const key = colIndexToKey[col as number]
                                    if (!key) return
                                    const base: any = newItems[row]
                                        ? { ...newItems[row] }
                                        : { MaDon: `${selectedOrder.MaDon}-${(row as number) + 1}` }
                                    const item: any = { ...base, [key]: newVal }
                                    if (khKeys.has(key)) item.TinhTrangKH = "Đã nhập"
                                    if (key === "LinkKQ" && newVal && newVal !== "") item.TinhTrangNCC = "Đã nhập"
                                    newItems[row] = item
                                })
                                await persistSelectedOrder(newItems)
                            }}
                            afterPaste={async (data, coords) => {
                                if (!coords?.length || !selectedOrder) return
                                const { startRow, startCol } = coords[0]
                                const newItems = [...selectedItems]

                                for (let r = 0; r < data.length; r++) {
                                    const rowIndex = startRow + r
                                    if (!newItems[rowIndex]) newItems[rowIndex] = { MaDon: `${selectedOrder.MaDon}-${rowIndex + 1}` }
                                    const rowData = data[r]

                                    for (let c = 0; c < rowData.length; c++) {
                                        const destCol = startCol + c
                                        const key = colIndexToKey[destCol]
                                        if (!key) continue // skip MaDon and action columns
                                        const value = rowData[c]
                                        const item: any = { ...newItems[rowIndex], [key]: value }
                                        if (khKeys.has(key)) item.TinhTrangKH = "Đã nhập"
                                        if (key === "LinkKQ" && value && value !== "") item.TinhTrangNCC = "Đã nhập"
                                        newItems[rowIndex] = item
                                    }
                                }

                                await persistSelectedOrder(newItems)
                            }}
                        />
                    </div>
                </div>
            </Modal>
        </>
    )
}
