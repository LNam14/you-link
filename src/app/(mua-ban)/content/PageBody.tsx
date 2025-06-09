"use client"
import { HotTable } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import "./custom-table.css"
import Handsontable from "handsontable"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import { useEffect, useState, useCallback } from "react"
import contentApiRequest from "@/apiRequests/content"
import sheetApiRequest from "@/apiRequests/sheet"
import getUserInfo from "@/components/userInfo"
import ChatDialog from "./components/ChatDialog"
import WithdrawModal from "@/app/(public)/(default)/components/WithdrawModal"
import { useBatchUpdate } from "@/hook/use-batch-update"
import { formatDateTime } from "@/hook/date-utils"
import type { CellChange } from "handsontable/common"
import { toast, Toaster } from "sonner"

registerAllModules()

type NestedColumnHeader = {
    label: string
    colspan: number
}

interface ContentApiResponse {
    success: boolean
    data: Array<{
        id: number
        ma_don: string
        loai: string
        ngay_order: string | null
        note_kh1: string | null
        note_kh2: string | null
        chu_de: string | null
        anchor1: string | null
        url1: string | null
        anchor2: string | null
        url2: string | null
        link_kq: string | null
        deadline: string | null
        note: string | null
        gia_ban: number
        gia_mua: number
        loi_nhuan: number
        tt_ncc: string | null
        ten_ncc: string | null
        ma_ncc: string | null
        tt_kh: string | null
        chat: Array<{
            role: string
            name?: string
            time: string
            message: string
        }> | null
    }>
    transaction?: Array<{
        week: number
        name: string
        status: string
    }>
}

interface ChatMessage {
    role: string
    name: string
    message: string
    time: string
}

type TableChange = CellChange

export default function PageBody() {
    const [tableData, setTableData] = useState<any[]>([])
    const [allData, setAllData] = useState<any[]>([]) // Store all unfiltered data
    const [isMerged, setIsMerged] = useState(true)
    const [viewOptions, setViewOptions] = useState({
        total: true,
        pending: true,
        cancelled: true,
    })
    const [selectedWeek, setSelectedWeek] = useState("")
    const [selectedUser, setSelectedUser] = useState("")
    const [selectedNCC, setSelectedNCC] = useState("")
    const [users, setUsers] = useState<string[]>([])
    const [nccs, setNCCs] = useState<string[]>([])
    const [customerFilter, setCustomerFilter] = useState("")
    const [supplierFilter, setSupplierFilter] = useState("")
    const userInfo = getUserInfo()
    const [chatDialogOpen, setChatDialogOpen] = useState(false)
    const [currentChatOrderId, setCurrentChatOrderId] = useState<string | null>(null)
    const [currentChatMessages, setCurrentChatMessages] = useState<any[]>([])
    const [newChatMessage, setNewChatMessage] = useState("")
    const [blinkingChatOrders, setBlinkingChatOrders] = useState<Set<string>>(new Set())
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
    const [completedOrdersAmount, setCompletedOrdersAmount] = useState(0)
    const [transactions, setTransactions] = useState<any[]>([])

    // Batch update hook for smooth updates
    const { queueUpdate, isUpdating: isBatchUpdating } = useBatchUpdate(
        contentApiRequest.update,
        1000, // 1 second debounce
    )

    const parseNumberWithComma = (value: any): number => {
        if (typeof value === 'number') return value
        if (!value) return 0

        const strValue = value.toString()

        // If the value contains both dot and comma
        if (strValue.includes('.') && strValue.includes(',')) {
            // Remove dots (thousand separators) and replace comma with dot
            return Number(strValue.replace(/\./g, '').replace(',', '.')) || 0
        }

        // If the value contains only comma
        if (strValue.includes(',')) {
            return Number(strValue.replace(',', '.')) || 0
        }

        // If the value contains only dot, treat it as decimal point
        return Number(strValue) || 0
    }

    // Add function to get current week number
    const getCurrentWeek = () => {
        const now = new Date()
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1)
        const firstDayOfWeek = firstDayOfYear.getDay() || 7
        const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000
        return Math.ceil((pastDaysOfYear + firstDayOfWeek) / 7)
    }

    // Add function to get week number from date
    const getWeekNumber = (dateStr: string) => {
        if (!dateStr) return ""
        if (dateStr.includes("/")) {
            const [day, month, year] = dateStr.split("/")
            const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
            const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
            const firstDayOfWeek = firstDayOfYear.getDay() || 7
            const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
            return Math.ceil((pastDaysOfYear + firstDayOfWeek) / 7)
        } else if (dateStr.includes("-")) {
            const [year, month, day] = dateStr.split("-")
            const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
            const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
            const firstDayOfWeek = firstDayOfYear.getDay() || 7
            const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
            return Math.ceil((pastDaysOfYear + firstDayOfWeek) / 7)
        }
        return ""
    }

    // Set current week as default when component mounts
    useEffect(() => {
        setSelectedWeek(getCurrentWeek().toString())
    }, [])

    // Add function to get statistics
    const getStatistics = (data: any[]) => {



        const stats = {
            totalOrders: 0,
            totalAmount: 0,
            pendingOrders: 0,
            pendingAmount: 0,
            cancelledOrders: 0,
            cancelledAmount: 0,
        }

        data.forEach((row) => {
            if (row[0] && !row[0].toString().includes("Tổng")) {
                const giaBan = parseNumberWithComma(row[14]) || 0
                const tinhTrangKH = row[19]
                const tinhTrangNCC = row[20]

                // Filter by week if selected
                if (selectedWeek) {
                    const orderDate = row[3]
                    const weekNumber = getWeekNumber(orderDate)
                    if (weekNumber.toString() !== selectedWeek) {

                        return
                    }
                }

                // Filter by user if selected
                if (selectedUser) {
                    const MaKH = row[1]
                    const MaKHBeforeDash = MaKH.split("-")[0]
                    if (MaKHBeforeDash !== selectedUser) {

                        return
                    }
                }

                // Filter by NCC if selected
                if (selectedNCC && row[19] !== selectedNCC) {

                    return
                }

                // Count total orders
                if (
                    (tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") &&
                    (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hoàn")
                ) {
                    stats.totalOrders++
                    stats.totalAmount += giaBan
                }

                // Count pending orders
                if ((tinhTrangKH === "" || tinhTrangKH === "Chưa nhập") && (tinhTrangNCC === "" || tinhTrangNCC === "Chưa nhận")) {
                    stats.pendingOrders++
                    stats.pendingAmount += giaBan
                }

                // Count cancelled orders
                if (tinhTrangKH === "Hủy đơn" || (tinhTrangKH === "Y/C Hủy đơn" && tinhTrangNCC === "Đồng ý hoàn")) {
                    stats.cancelledOrders++
                    stats.cancelledAmount += giaBan
                }
            }
        })




        return stats
    }

    // Add summary calculation function
    const calculateSummary = (data: any[]) => {
        const summary = {
            totalGiaBan: 0,
            totalGiaMua: 0,
            totalLN: 0,
            count: 0,
            cancelledGiaBan: 0,
            cancelledGiaMua: 0,
            cancelledLN: 0,
            cancelledCount: 0,
            pendingGiaBan: 0,
            pendingGiaMua: 0,
            pendingLN: 0,
            pendingCount: 0,
        }

        data.forEach((row) => {
            if (row[0] && !row[0].toString().includes("Tổng")) {
                const giaBan = parseNumberWithComma(row[14]) || 0
                const giaMua = parseNumberWithComma(row[15]) || 0
                const ln = parseNumberWithComma(row[16]) || 0
                const tinhTrangKH = row[19]
                const tinhTrangNCC = row[20]

                // Calculate totals for all orders (including pending when merged)
                if (isMerged) {
                    if (
                        ((tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") &&
                            (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hoàn")) ||
                        ((tinhTrangKH === "Chưa nhập" || tinhTrangKH === "Đã nhập") && tinhTrangNCC === "Chưa nhận")
                    ) {
                        summary.totalGiaBan += giaBan
                        summary.totalGiaMua += giaMua
                        summary.totalLN += ln
                        summary.count++
                    }
                } else {
                    // Original logic for unmerged view
                    if (
                        (tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") &&
                        (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hoàn")
                    ) {
                        summary.totalGiaBan += giaBan
                        summary.totalGiaMua += giaMua
                        summary.totalLN += ln
                        summary.count++
                    }
                }

                // Calculate totals for cancelled orders
                if (tinhTrangKH === "Hủy đơn" || (tinhTrangKH === "Y/C Hủy đơn" && tinhTrangNCC === "Đồng ý hoàn")) {
                    summary.cancelledGiaBan += giaBan
                    summary.cancelledGiaMua += giaMua
                    summary.cancelledLN += ln
                    summary.cancelledCount++
                }

                // Calculate totals for pending orders (only for unmerged view)
                if (!isMerged) {
                    if (
                        (tinhTrangKH === "Chưa nhập" || tinhTrangKH === "Đã nhập") &&
                        tinhTrangNCC === "Chưa nhận"
                    ) {
                        summary.pendingGiaBan += giaBan
                        summary.pendingGiaMua += giaMua
                        summary.pendingLN += ln
                        summary.pendingCount++
                    }
                }
            }
        })

        // Format numbers to 2 decimal places
        Object.keys(summary).forEach((key) => {
            if (typeof summary[key as keyof typeof summary] === "number" && !key.includes("Count")) {
                ; (summary as any)[key] = Number(summary[key as keyof typeof summary].toFixed(2))
            }
        })

        return summary
    }

    // Add filter function
    const filterTableData = (data: any[]) => {





        // Apply filters: week, user, NCC
        const appliedFiltersData = data.filter(row => {
            if (!row || !row[0] || row[0].toString().includes("Tổng")) return false;

            // Filter by week if selected
            if (selectedWeek) {
                const orderDate = row[3]
                if (!orderDate) return false;
                const weekNumber = getWeekNumber(orderDate)
                if (weekNumber.toString() !== selectedWeek) return false;
            }

            // Filter by customer if selected (based on order ID prefix)
            if (customerFilter) {
                const orderMaKH = row[1] ? row[1].toString().split("-")[0] : ""
                if (orderMaKH !== customerFilter) return false
            }

            // Filter by supplier if selected
            if (supplierFilter && row[18] !== supplierFilter) {
                return false
            }

            return true;
        });
        // Calculate summary for filtered data
        const summary = calculateSummary(appliedFiltersData)

        // Create summary rows
        const totalRow = [
            "", "", "", "", "", "", "", "", "", "", "", "", "",
            "Tổng", summary.totalGiaBan.toFixed(2), summary.totalGiaMua.toFixed(2), summary.totalLN.toFixed(2),
            "", "", "", "", "",
        ]

        const pendingRow = [
            "", "", "", "", "", "", "", "", "", "", "", "", "",
            "Chưa nhập", summary.pendingGiaBan.toFixed(2), summary.pendingGiaMua.toFixed(2), summary.pendingLN.toFixed(2),
            "", "", "", "", "",
        ]

        const cancelledRow = [
            "", "", "", "", "", "", "", "", "", "", "", "", "",
            "Đơn hủy", summary.cancelledGiaBan.toFixed(2), summary.cancelledGiaMua.toFixed(2), summary.cancelledLN.toFixed(2),
            "", "", "", "", "",
        ]

        // Filter data based on view options and classify into groups
        const totalOrdersFiltered: typeof appliedFiltersData = [];
        const pendingOrdersFiltered: typeof appliedFiltersData = [];
        const cancelledOrdersFiltered: typeof appliedFiltersData = [];

        appliedFiltersData.forEach(row => {
            const ttKH = row[19] || "Chưa nhập";
            const ttNCC = row[20] || "Chưa nhận";

            // Classify cancelled orders first
            if (ttKH === "Hủy đơn" || (ttKH === "Y/C Hủy đơn" && ttNCC === "Đồng ý hoàn")) {
                if (viewOptions.cancelled) {
                    cancelledOrdersFiltered.push(row);
                }
                // Classify total/completed orders
            } else if (
                (ttKH === "Đã nhập" || ttKH === "Đơn OK" || ttKH === "Y/C Hủy đơn") &&
                (ttNCC === "Đã lên bài" || ttNCC === "Từ chối hoàn")
            ) {
                if (viewOptions.total) {
                    totalOrdersFiltered.push(row);
                }
                // Classify pending orders
            } else if (
                (ttKH === "Chưa nhập" || ttKH === "Đã nhập") && ttNCC === "Chưa nhận"
            ) {
                if (viewOptions.pending) {
                    pendingOrdersFiltered.push(row);
                }
            }
        });



        // Sort orders by order ID
        const sortOrders = (orders: any[]) => {
            return orders.sort((a, b) => {
                const orderIdA = a[1]?.toString() || ""
                const orderIdB = b[1]?.toString() || ""
                const partsA = orderIdA.split("-")
                const partsB = orderIdB.split("-")
                for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
                    const numA = Number.parseInt(partsA[i].replace(/[^0-9]/g, "")) || 0
                    const numB = Number.parseInt(partsB[i].replace(/[^0-9]/g, "")) || 0
                    if (numA !== numB) {
                        return numA - numB
                    }
                    if (partsA[i] !== partsB[i]) {
                        return partsA[i].localeCompare(partsB[i])
                    }
                }
                return partsA.length - partsB.length
            })
        }

        // Combine data based on view options and merge state
        const finalData = []

        if (isMerged) {
            if (viewOptions.total) {
                // In merged mode, total includes both completed and pending orders
                const totalOrders = [...totalOrdersFiltered, ...pendingOrdersFiltered];

                if (totalOrders.length > 0 || summary.count > 0) {
                    finalData.push(totalRow, ...sortOrders(totalOrders));
                }
            }

            if (viewOptions.cancelled) { // Keep filtering by viewOptions.cancelled even in merged mode
                const cancelledOrders = cancelledOrdersFiltered; // Use the already classified array
                if (cancelledOrders.length > 0 || summary.cancelledCount > 0) { // Only show cancelled section if there are cancelled orders
                    finalData.push(cancelledRow, ...sortOrders(cancelledOrders))
                }
            }

        } else {
            // In unmerged view, show separate sections based on view options
            if (viewOptions.total) {
                const totalOrders = totalOrdersFiltered; // Use the already classified array
                if (totalOrders.length > 0 || summary.count > 0) { // Only show total section if there are total orders
                    finalData.push(totalRow, ...sortOrders(totalOrders))
                }
            }
            if (viewOptions.pending) {
                const pendingOrders = pendingOrdersFiltered; // Use the already classified array
                if (pendingOrders.length > 0 || summary.pendingCount > 0) { // Only show pending section if there are pending orders
                    finalData.push(pendingRow, ...sortOrders(pendingOrders))
                }
            }
            if (viewOptions.cancelled) {
                const cancelledOrders = cancelledOrdersFiltered; // Use the already classified array
                if (cancelledOrders.length > 0 || summary.cancelledCount > 0) { // Only show cancelled section if there are cancelled orders
                    finalData.push(cancelledRow, ...sortOrders(cancelledOrders))
                }
            }
        }




        return finalData.filter(Boolean) // Remove any potential undefined entries
    }

    // Apply filters whenever dependencies change
    useEffect(() => {








        if (allData.length === 0) {

            setTableData([])
            return
        }

        // Apply filters
        const filteredData = filterTableData(allData)


        setTableData(filteredData)

    }, [allData, selectedWeek, viewOptions, selectedUser, selectedNCC, isMerged, customerFilter, supplierFilter])

    const handleSendChatMessage = useCallback(async () => {
        if (!newChatMessage.trim() || !currentChatOrderId) return

        try {
            setIsUpdating(true)

            // Find the order in tableData
            const orderIndex = tableData.findIndex((row) => row[1] === currentChatOrderId)
            if (orderIndex === -1) return

            // Create new chat message with proper format
            const newMessage: ChatMessage = {
                role: userInfo?.role || "",
                name: userInfo?.username || userInfo?.name || "",
                message: newChatMessage.trim(),
                time: formatDateTime(),
            }

            // Get current chat messages
            const currentChat = tableData[orderIndex][21] || []
            const updatedChat = [...currentChat, newMessage]

            // Update the order's chat messages locally first for immediate UI response
            const updatedTableData = [...tableData]
            updatedTableData[orderIndex][21] = updatedChat
            setTableData(updatedTableData)

            // Update current chat messages in dialog
            setCurrentChatMessages(updatedChat)

            // Clear input immediately for better UX
            setNewChatMessage("")

            // Send update to server using batch update - only send changed fields
            const order = tableData[orderIndex]
            const updateData = {
                id: order[0],
                chat: updatedChat,
            }

            // Use batch update for smoother performance
            queueUpdate(`chat_${order[0]}`, updateData)

            // Send notification based on sender role
            const MaKH = currentChatOrderId.split("-")[0]
            const MaNCC = order[19]

            if (userInfo?.role === "NCC") {
                // If NCC sends message, notify customer
                sheetApiRequest.getIDKH(
                    MaKH,
                    `NCC ${userInfo?.username || userInfo?.displayName} đã gửi tin nhắn cho đơn ${currentChatOrderId}: "${newChatMessage.trim()}"`,
                )
            } else if (userInfo?.role === "Khách hàng") {
                // If customer sends message, notify NCC
                sheetApiRequest.getIDNCC(
                    MaNCC,
                    `Khách hàng ${userInfo?.username || userInfo?.displayName} đã gửi tin nhắn cho đơn ${currentChatOrderId}: "${newChatMessage.trim()}"`,
                )
            }
        } catch (error) {
            console.error("Error sending chat message:", error)
            // Revert the UI change if there's an error
            const orderIndex = tableData.findIndex((row) => row[1] === currentChatOrderId)
            if (orderIndex !== -1) {
                const revertedTableData = [...tableData]
                revertedTableData[orderIndex][21] = currentChatMessages
                setTableData(revertedTableData)
                setCurrentChatMessages(currentChatMessages)
            }
        } finally {
            setIsUpdating(false)
        }
    }, [newChatMessage, currentChatOrderId, tableData, userInfo, currentChatMessages, queueUpdate])

    const handleAfterChange = useCallback(
        (changes: TableChange[] | null, source: string) => {
            if (source === "loadData" || !changes) return

            // Group changes by row to handle multiple field updates efficiently
            const changesByRow: { [key: number]: TableChange[] } = {}

            changes.forEach((change) => {
                const rowIndex = change[0]
                if (!changesByRow[rowIndex]) {
                    changesByRow[rowIndex] = []
                }
                changesByRow[rowIndex].push(change)
            })

            // Process each row's changes
            for (const rowIndex in changesByRow) {
                const rowChanges = changesByRow[rowIndex]
                const order = tableData[Number(rowIndex)]

                if (!order || !order[0]) continue

                // Map column indices to field names
                const columnToField: { [key: string]: string } = {
                    "2": "loai",
                    "3": "ngay_order",
                    "4": "note_kh1",
                    "5": "note_kh2",
                    "6": "chu_de",
                    "7": "anchor1",
                    "8": "url1",
                    "9": "anchor2",
                    "10": "url2",
                    "11": "link_kq",
                    "12": "deadline",
                    "13": "note",
                    "14": "gia_ban",
                    "15": "gia_mua",
                    "17": "ten_ncc",
                    "18": "ma_ncc",
                    "19": "tt_kh",
                    "20": "tt_ncc",
                }

                // Create update object with only id and changed fields
                const updateData: any = {
                    id: order[0],
                }

                // Track if Link KQ was updated
                let linkKQUpdated = false
                let newLinkKQ: string | null = null

                // Add only changed fields to update object
                rowChanges.forEach(([row, col, oldValue, newValue]) => {
                    const fieldName = columnToField[col.toString()]
                    if (fieldName) {
                        // Skip if value hasn't actually changed
                        if (oldValue === newValue) return

                        // Handle special cases for numeric fields
                        if (fieldName === "gia_ban" || fieldName === "gia_mua") {
                            const parsedNewValue = parseNumberWithComma(newValue)
                            const parsedOldValue = parseNumberWithComma(oldValue)
                            if (parsedNewValue !== parsedOldValue) {
                                updateData[fieldName] = parsedNewValue
                            }
                        } else if (fieldName === "deadline") {
                            // Convert date string to ISO format if it's a valid date
                            const newDate = new Date(newValue)
                            const oldDate = new Date(oldValue)
                            if (!isNaN(newDate.getTime()) && newDate.getTime() !== oldDate.getTime()) {
                                updateData[fieldName] = newDate.toISOString()
                            }
                        } else {
                            updateData[fieldName] = newValue
                        }

                        // Track Link KQ updates
                        if (fieldName === "link_kq") {
                            linkKQUpdated = true
                            newLinkKQ = newValue as string
                        }
                    }
                })

                // Handle Anchor/URL updates for status changes
                if (
                    ["anchor1", "url1", "anchor2", "url2"].includes(Object.keys(updateData).find((key) => key !== "id") || "")
                ) {
                    const currentData = order;
                    // Use the potentially updated values from updateData first, then fallback to currentData
                    const anchor1 = updateData.anchor1 !== undefined ? updateData.anchor1 : currentData[7] || "";
                    const anchor2 = updateData.anchor2 !== undefined ? updateData.anchor2 : currentData[9] || "";
                    const hasAnchor1 = typeof anchor1 === 'string' && anchor1.trim() !== "";
                    const hasAnchor2 = typeof anchor2 === 'string' && anchor2.trim() !== "";
                    const currentTTKH = currentData[20] || "";

                    // Determine the new status based on the presence of anchors
                    let newTTKH = currentTTKH; // Default to current status

                    if (hasAnchor1 || hasAnchor2) {
                        // If anchors exist, set status to "Đã nhập" only if it was empty or "Chưa nhập"
                        if (!currentTTKH || currentTTKH === "Chưa nhập") {
                            newTTKH = "Đã nhập";
                            const MaNCC = currentData[18]; // Get MaNCC from the current row
                            if (MaNCC) {
                                sheetApiRequest.getIDNCC(
                                    MaNCC,
                                    `Đơn ${currentData[0]} đang chờ được xử lý, vui lòng vào http://ylink.shop/content`
                                );
                            }
                        }
                    } else {
                        // If no anchors exist, set status to "Chưa nhập" only if it was "Đã nhập"
                        if (currentTTKH === "Đã nhập") {
                            newTTKH = "Chưa nhập";
                        }
                    }

                    // Update UI and updateData if status changed
                    if (newTTKH !== currentTTKH) {
                        // Update UI immediately
                        const updatedTableData = [...tableData];
                        updatedTableData[Number(rowIndex)][20] = newTTKH;
                        setTableData(updatedTableData);

                        // Include the change in updateData for the backend
                        updateData.tt_kh = newTTKH;
                    }
                }

                // Handle Link KQ updates
                if (linkKQUpdated) {
                    const currentData = order
                    const linkKQ = newLinkKQ || currentData[11] || ""
                    const hasLinkKQ = typeof linkKQ === 'string' && linkKQ.trim() !== ""
                    const currentTTNCC = currentData[20] || ""

                    // Only update tt_ncc if current status is empty or "Chưa nhận"
                    if (hasLinkKQ && (!currentTTNCC || currentTTNCC === "Chưa nhận")) {
                        // Update UI immediately
                        const updatedTableData = [...tableData]
                        updatedTableData[Number(rowIndex)][20] = "Đã lên bài"
                        updateData.tt_ncc = "Đã lên bài"
                        setTableData(updatedTableData)

                        const MaKH = order[1].split("-")[0]
                        if (MaKH) {
                            sheetApiRequest.getIDKH(
                                MaKH,
                                `Đơn ${order[0]} đã xong, kiểm tra tại http://ylink.shop/content`
                            )
                        }
                    }
                }

                // Handle initial empty states
                if (!updateData.tt_kh && !updateData.tt_ncc) {
                    const currentData = order
                    const anchor1 = currentData[7] || ""
                    const anchor2 = currentData[9] || ""
                    const linkKQ = currentData[11] || ""
                    const currentTTKH = currentData[19] || ""
                    const currentTTNCC = currentData[20] || ""

                    const hasAnchor1 = typeof anchor1 === 'string' && anchor1.trim() !== ""
                    const hasAnchor2 = typeof anchor2 === 'string' && anchor2.trim() !== ""
                    const hasLinkKQ = typeof linkKQ === 'string' && linkKQ.trim() !== ""

                    // Update UI immediately
                    const updatedTableData = [...tableData]

                    // Set tt_kh based on Anchor values only if current status is empty or "Chưa nhập"
                    if ((hasAnchor1 || hasAnchor2) && (!currentTTKH || currentTTKH === "Chưa nhập")) {
                        updatedTableData[Number(rowIndex)][19] = "Đã nhập"
                        updateData.tt_kh = "Đã nhập"
                    }

                    // Set tt_ncc based on LinkKQ value only if current status is empty or "Chưa nhận"
                    if (hasLinkKQ && (!currentTTNCC || currentTTNCC === "Chưa nhận")) {
                        updatedTableData[Number(rowIndex)][20] = "Đã lên bài"
                        updateData.tt_ncc = "Đã lên bài"
                    }

                    setTableData(updatedTableData)
                }

                // Only send update if there are actual changes
                if (Object.keys(updateData).length > 1) {
                    queueUpdate(`table_${order[0]}_${Date.now()}`, updateData)
                }
            }

            // Update local state immediately for responsiveness
            const newTableData = [...tableData]
            changes.forEach(([row, col, oldValue, newValue]) => {
                if (oldValue === newValue) return

                newTableData[row][Number(col)] = newValue

                // Update profit calculation if price fields changed
                if (col === 14 || col === 15) {
                    const giaBan = parseNumberWithComma(newTableData[row][14])
                    const giaMua = parseNumberWithComma(newTableData[row][15])
                    newTableData[row][16] = giaBan - giaMua
                }
            })
            setTableData(newTableData)
        },
        [tableData, queueUpdate],
    )

    const handleAfterPaste = useCallback(
        (data: any[], coords: any[]) => {
            if (!data || !coords) return

            const changes: TableChange[] = data.flatMap((row, rowIndex) => {
                return row.map((value: any, colIndex: number) => {
                    return [coords[0].startRow + rowIndex, coords[0].startCol + colIndex, null, value] as TableChange
                })
            })

            handleAfterChange(changes, "paste")
        },
        [handleAfterChange],
    )

    const handleContextMenuAction = async (row: number, action: string) => {
        const orderId = tableData[row][1]
        const linkKQ = tableData[row][11]
        const MaNCC = tableData[row][19]
        const MaKH = tableData[row][1]
        const MaKHBeforeDash = MaKH.split("-")[0]
        const giaBan = parseNumberWithComma(tableData[row][14])
        const giaMua = parseNumberWithComma(tableData[row][15])

        try {
            if (action === "cancelOrder") {
                const newStatus = linkKQ && linkKQ.trim() !== "" ? "Y/C Hủy đơn" : "Hủy đơn"

                // Update only tt_kh, tt_ncc remains unchanged by this action
                const updateData: any = {
                    id: tableData[row][0],
                    tt_kh: newStatus,
                }

                if (newStatus === "Hủy đơn") {
                    // Refund money to customer and update spend
                    await Promise.all([
                        contentApiRequest.update(updateData),
                        // contentApiRequest.updateBalance({
                        //     user_id: MaKHBeforeDash,
                        //     amount: giaBan,
                        //     type: "add",
                        // }),
                        // contentApiRequest.updateBalance({
                        //     user_id: MaKHBeforeDash,
                        //     amount: giaBan,
                        //     type: "subtract_spend",
                        // }),
                    ])

                    // Update UI immediately for tt_kh only
                    const updatedTableData = [...tableData]
                    updatedTableData[row][20] = newStatus // Update tt_kh
                    // updatedTableData[row][21] remains unchanged for tt_ncc
                    setTableData(updatedTableData)

                    sheetApiRequest.getIDKH(
                        MaKHBeforeDash,
                        `Đơn hàng ${orderId} đã bị hủy, kiểm tra tại http://ylink.shop/content`,
                    )
                } else {
                    await contentApiRequest.update(updateData)

                    // Update UI immediately for tt_kh only
                    const updatedTableData = [...tableData]
                    updatedTableData[row][20] = newStatus // Update tt_kh
                    // updatedTableData[row][21] remains unchanged for tt_ncc
                    setTableData(updatedTableData)

                    if (MaNCC) {
                        sheetApiRequest.getIDNCC(
                            MaNCC,
                            `Khách hàng đã yêu cầu hủy đơn ${orderId}, xử lý tại http://ylink.shop/content`,
                        )
                    }
                }
            } else if (action === "approveRefund") {
                await Promise.all([
                    contentApiRequest.update({
                        id: tableData[row][0],
                        tt_ncc: "Đồng ý hoàn",
                    }),
                ])

                if (MaKHBeforeDash) {
                    sheetApiRequest.getIDKH(
                        MaKHBeforeDash,
                        `NCC đã đồng ý hoàn cho đơn ${orderId}, kiểm tra tại http://ylink.shop/content`,
                    )
                }
            } else if (action === "rejectRefund") {
                await contentApiRequest.update({
                    id: tableData[row][0],
                    tt_ncc: "Từ chối hoàn",
                })
                if (MaKHBeforeDash) {
                    sheetApiRequest.getIDKH(
                        MaKHBeforeDash,
                        `NCC đã từ chối hoàn cho đơn ${orderId}, kiểm tra tại http://ylink.shop/content`,
                    )
                }
            } else if (action === "okOrder") {
                await contentApiRequest.update({
                    id: tableData[row][0],
                    tt_kh: "Đơn OK",
                })
            }
        } catch (error) {
            console.error("Error updating order status:", error)
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = (await contentApiRequest.get()) as ContentApiResponse




                if (response.success && response.data) {
                    // Log raw data before transformation

                    response.data.slice(0, 3).forEach((order, index) => {

                    })

                    // Filter data based on user role and username
                    let filteredData = response.data
                    if (userInfo?.role === "Nhân viên" || userInfo?.role === "Khách hàng") {
                        const userPrefix = userInfo?.username || ""
                        filteredData = response.data.filter(order => {
                            if (!order.ma_don) return false
                            const maDonPrefix = order.ma_don.split("-")[0]
                            return maDonPrefix === userPrefix
                        })

                    } else if (userInfo?.role === "NCC") {
                        const nccUsername = userInfo?.username || ""
                        filteredData = response.data.filter(order => {
                            return order.ma_ncc === nccUsername
                        })

                    }

                    // Extract unique customers and NCCs for all roles
                    const uniqueCustomers = getUniqueCustomers(response.data)
                    const uniqueNCCs = Array.from(new Set(response.data
                        .map(order => order.ma_ncc)
                        .filter((ncc): ncc is string => ncc !== null && ncc !== undefined)))
                        .sort()

                    setUsers(uniqueCustomers)
                    setNCCs(uniqueNCCs)




                    // Transform the filtered data into the desired format
                    const formattedData = filteredData.map((order) => {
                        const giaBan = parseNumberWithComma(order.gia_ban)
                        const giaMua = parseNumberWithComma(order.gia_mua)
                        const ln = giaBan - giaMua

                        const anchor1 = order.anchor1 || ""
                        const anchor2 = order.anchor2 || ""
                        const linkKq = order.link_kq || ""

                        // Determine tt_kh_status for initial display based on API value and Anchor presence
                        let tt_kh_status = order.tt_kh || "Chưa nhập"
                        if ((anchor1.trim() !== "" || anchor2.trim() !== "") && (tt_kh_status === "Chưa nhập")) {
                            tt_kh_status = "Đã nhập"
                        }

                        // Determine tt_ncc for initial display based on API value and LinkKQ presence
                        let tt_ncc = order.tt_ncc || "Chưa nhận"
                        if (linkKq.trim() !== "" && (tt_ncc === "Chưa nhận")) {
                            tt_ncc = "Đã lên bài"
                        }

                        return [
                            order.id,
                            order.ma_don || "",
                            order.loai || "",
                            order.ngay_order || "",
                            order.note_kh1 || "",
                            order.note_kh2 || "",
                            order.chu_de || "",
                            anchor1,
                            order.url1 || "",
                            anchor2,
                            order.url2 || "",
                            linkKq,
                            order.deadline || "",
                            order.note || "",
                            giaBan,
                            giaMua,
                            ln,
                            order.ten_ncc || "",
                            order.ma_ncc || "",
                            tt_kh_status,
                            tt_ncc,
                            order.chat || [],
                        ]
                    })

                    // Store all data for filtering
                    setAllData(formattedData)

                    // Check for new chat messages to set blinking
                    const newBlinkingOrders = new Set<string>()
                    formattedData.forEach((row) => {
                        const chat = row[21]
                        if (chat && Array.isArray(chat) && chat.length > 0) {
                            const lastMessage = chat[chat.length - 1]
                            if (lastMessage) {
                                const isFromOtherParty =
                                    (userInfo?.role === "NCC" && lastMessage.role === "Khách hàng") ||
                                    (userInfo?.role === "Khách hàng" && lastMessage.role === "NCC")

                                if (isFromOtherParty) {
                                    newBlinkingOrders.add(row[1].toString())
                                }
                            }
                        }
                    })
                    setBlinkingChatOrders(newBlinkingOrders)
                } else {

                    setAllData([])
                }
            } catch (error) {
                console.error("Error fetching data:", error)
                setAllData([])
            }
        }

        fetchData()
        // Set up polling every 30 seconds
        const intervalId = setInterval(fetchData, 30000)

        return () => clearInterval(intervalId)
    }, [userInfo?.role, userInfo?.username])

    // Get current statistics
    const stats = getStatistics(tableData)

    const RowHeader1: NestedColumnHeader[] = [
        { label: `Đơn Hàng`, colspan: 4 },
        { label: "INFO Bài", colspan: 7 },
        { label: "Kểt Quả", colspan: 2 },
        { label: "", colspan: 1 },
        { label: "TIỀN NÈ", colspan: 3 }, // Changed from 4 to 3
        { label: "", colspan: 2 },
        { label: "Trạng Thái", colspan: 2 },
        { label: "Trao đổi", colspan: 1 },
    ]

    const RowHeader2 = [
        "ID",
        "Mã ĐH",
        "Loại",
        "Ngày order",
        "KH Note 1",
        "KH Note 2",
        "Chủ Đề",
        "Anchor 1",
        "URL 1",
        "Anchor 2",
        "URL 2",
        "LINK KQ",
        "Deadline",
        "NOTE",
        "Giá Bán",
        "Giá Mua",
        "LN",
        "Tên NCC",
        "Mã NCC",
        "Khách Hàng",
        "NCC",
        "Chat",
    ]

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Chưa nhập":
                return { bg: "#FFA500", text: "#FFF7ED" }
            case "Đơn OK":
                return { bg: "#16A34A", text: "#F0FDF4" }
            case "Hủy đơn":
            case "Y/C Hủy đơn":
                return { bg: "#DC2626", text: "#FEF2F2" }
            case "Đã nhập":
                return { bg: "#9333EA", text: "#FAF5FF" }
            case "Chưa nhận":
                return { bg: "#FFA500", text: "#FFF7ED" }
            case "Đã lên bài":
                return { bg: "#16A34A", text: "#F0FDF4" }
            case "Từ chối hoàn":
            case "Đồng ý hoàn":
                return { bg: "#DC2626", text: "#FEF2F2" }
            default:
                return { bg: "", text: "" }
        }
    }

    const getHiddenColumns = () => {
        if (userInfo?.role === "NCC") {
            return {
                columns: [0, 14, 16],
                indicators: true,
            }
        } else if (userInfo?.role === "Khách hàng") {
            return {
                columns: [0, 15, 16, 17, 18, 19],
                indicators: true,
            }
        }
        return {
            columns: [0],
            indicators: true,
        }
    }

    const isEditable = (col: number, row: number) => {
        if (userInfo?.role === "NCC") {
            const tinhTrangKH = tableData[row]?.[19]
            const tinhTrangNCC = tableData[row]?.[20]

            const isCompletedOrder =
                (tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") &&
                (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hoàn")
            if (isCompletedOrder) {
                return null
            }
            return col === 11 // Only LinkKQ is editable for NCC
        } else if (userInfo?.role === "Khách hàng") {
            const tinhTrangKH = tableData[row]?.[19]
            const tinhTrangNCC = tableData[row]?.[20]
            const isCompletedOrder =
                (tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") &&
                (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hoàn")
            if (isCompletedOrder) {
                return null
            }
            const editableColumns = [3, 4, 5, 6, 7, 8, 9, 10, 12] // Ngày order, KH Note 1, KH Note 2, Chủ Đề, Anchor 1, URL 1, Anchor 2, URL 2, Deadline
            return editableColumns.includes(col)
        }

        return true
    }

    const handleChatOpen = useCallback(
        (orderId: string) => {
            setCurrentChatOrderId(orderId)
            setChatDialogOpen(true)
            setBlinkingChatOrders((prev) => {
                const newSet = new Set(prev)
                newSet.delete(orderId)
                return newSet
            })

            // Find the order and get its chat messages
            const order = tableData.find((row) => row[1] === orderId)
            if (order && order[21]) {
                const chatMessages = order[21].map((msg: any) => ({
                    role: msg.role,
                    name: msg.name || msg.role,
                    message: msg.message,
                    time: msg.time,
                }))
                setCurrentChatMessages(chatMessages)
            } else {
                setCurrentChatMessages([])
            }
        },
        [tableData],
    )

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ""
        if (dateStr.includes("/")) {
            const [day, month] = dateStr.split("/")
            return `${day}/${month}`
        } else if (dateStr.includes("-")) {
            const [year, month, day] = dateStr.split("-")
            return `${day}/${month}`
        }
        return dateStr
    }

    const getCellStyle = (
        col: number,
        row: number,
        isCompletedOrder: boolean,
        tableData: any[],
    ): { backgroundColor: string; color: string; isReadOnly: boolean } => {
        const style: { backgroundColor: string; color: string; isReadOnly: boolean } = {
            backgroundColor: "",
            color: "#000000",
            isReadOnly: false,
        }

        // ID column (col 0) is always gray and read-only
        if (col === 0) {
            style.backgroundColor = "#d3d3d3"
            style.isReadOnly = true
            return style
        }

        // LinkKQ column (col 11) - Check for duplicates
        if (col === 11) {
            const currentLinkKQ = tableData[row]?.[11]
            if (currentLinkKQ && currentLinkKQ.trim() !== "") {
                const duplicateCount = tableData.filter(
                    (row) => row[11] && row[11].trim() !== "" && row[11] === currentLinkKQ,
                ).length

                if (duplicateCount > 1) {
                    style.backgroundColor = "#FFE4E1"
                }
            }
        }

        // Status columns (20, 21) have their own colors
        if (col === 19 || col === 20) {
            const status = tableData[row]?.[col]
            const colors = getStatusColor(status)
            style.backgroundColor = colors.bg
            style.color = colors.text
            style.isReadOnly = true
            return style
        }

        // Chat column (21) is always read-only
        if (col === 21) {
            style.isReadOnly = true
            return style
        }

        // For completed orders, certain columns are gray and read-only
        if (isCompletedOrder && [7, 8, 9, 10].includes(col)) {
            // Anchor1, URL1, Anchor2, URL2
            style.backgroundColor = "#d3d3d3"
            style.isReadOnly = true
            return style
        }

        // Check if cell should be editable based on role and permissions
        const isEditableCell = isEditable(col, row)
        if (!isEditableCell) {
            style.backgroundColor = "#d3d3d3"
            style.isReadOnly = true
            return style
        }

        return style
    }

    const cells = function (
        this: Handsontable.CellProperties,
        row: number,
        col: number,
        prop: string | number,
    ): Handsontable.CellMeta {
        const cellProperties: Handsontable.CellMeta = {}

        // Check if this is a summary row
        const isSummaryRow =
            row < tableData.length &&
            (tableData[row][13] === "Tổng" || tableData[row][13] === "Đơn hủy" || tableData[row][13] === "Chưa nhập")

        if (isSummaryRow) {
            cellProperties.renderer = function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties,
            ) {
                Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties])
                td.style.backgroundColor = "#ffb3b3"
                td.style.color = "#991b1b"
                td.style.fontWeight = "600"
                if (col >= 14 && col <= 17) {
                    td.style.textAlign = "right"
                    if (value !== undefined && value !== null && value !== "") {
                        td.textContent = Number(value).toFixed(2)
                    }
                }
            }
            cellProperties.readOnly = true
            return cellProperties
        }

        // Make 'Mã ĐH' column (index 1) read-only
        if (col === 1) {
            cellProperties.readOnly = true;
        }

        // Get the current row's status
        const tinhTrangKH = tableData[row]?.[19]
        const tinhTrangNCC = tableData[row]?.[20]

        // Check if the order is in a completed state
        const isCompletedOrder =
            (tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") &&
            (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hoàn")

        // Get cell style and editability
        const cellStyle = getCellStyle(col, row, isCompletedOrder, tableData)

        // Apply cell styling and editability
        if (cellStyle) {
            cellProperties.readOnly = cellStyle.isReadOnly || cellProperties.readOnly; // Combine with existing readOnly
        }

        if (col === 21) {
            // Chat column
            cellProperties.renderer = (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties,
            ) => {
                td.innerHTML = ""
                td.style.padding = "0"
                td.style.textAlign = "center"

                const button = document.createElement("button")
                const orderId = instance.getDataAtCell(row, 1)
                button.textContent = "Chat"
                button.className = `w-full px-4 py-2 text-xs font-semibold rounded transition-colors duration-200 ${blinkingChatOrders.has(orderId)
                    ? "bg-green-500 hover:bg-green-600 text-white animate-pulse"
                    : "bg-green-600 hover:bg-green-700 text-green-50"
                    }`
                button.onclick = (e) => {
                    e.stopPropagation()
                    handleChatOpen(orderId)
                }

                td.appendChild(button)
            }
        } else {
            // For all other cells
            cellProperties.renderer = function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties,
            ) {
                Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties])

                // Apply cell style
                if (cellStyle) {
                    td.style.backgroundColor = cellStyle.backgroundColor
                    td.style.color = cellStyle.color
                }

                // Format date for NgayOrder column (col 3)
                if (col === 3) {
                    td.textContent = formatDate(value)
                }

                if (col === 0 || col === 1) {
                    td.style.width = "70px"
                    td.style.maxWidth = "70px"
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                } else if (col === 13) {
                    td.style.width = "90px"
                    td.style.maxWidth = "90px"
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.title = value || ""
                } else {
                    td.style.width = "80px"
                    td.style.maxWidth = "80px"
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.title = value || ""
                }

                // Add loading indicator for cells being updated
                if (isBatchUpdating) {
                    td.style.opacity = "0.7"
                } else {
                    td.style.opacity = "1"
                }
            }
        }

        return cellProperties
    }

    // Add merge function
    const handleMergeData = () => {
        setIsMerged(!isMerged)
    }

    // Add this function to handle checkbox changes
    const handleViewOptionChange = (option: string) => {
        if (isMerged && (option === "total" || option === "pending")) {
            return
        }

        setViewOptions((prev) => ({
            ...prev,
            [option]: !prev[option as keyof typeof prev],
        }))
    }

    // Add useEffect to ensure total and pending are enabled when data is merged
    useEffect(() => {
        if (isMerged) {
            setViewOptions((prev) => ({
                ...prev,
                total: true,
                pending: true,
            }))
        }
    }, [isMerged])

    // Add this function to extract unique customers from order IDs
    const getUniqueCustomers = (data: any[]) => {
        const uniqueCustomers = new Set<string>()
        data.forEach((order) => {
            if (order.ma_don) {
                const maDon = order.ma_don.toString()
                const maKH = maDon.split("-")[0] // Only take the part before the dash
                if (maKH && (maKH.startsWith("BH") || maKH.startsWith("KH"))) {
                    uniqueCustomers.add(maKH)
                }
            }
        })
        return Array.from(uniqueCustomers).sort((a, b) => {
            const aType = a.startsWith("BH") ? 0 : 1
            const bType = b.startsWith("BH") ? 0 : 1
            if (aType !== bType) return aType - bType
            const aNum = Number.parseInt(a.replace(/[^0-9]/g, "")) || 0
            const bNum = Number.parseInt(b.replace(/[^0-9]/g, "")) || 0
            return aNum - bNum
        })
    }

    // Add function to calculate completed orders amount
    const calculateCompletedOrdersAmount = useCallback((data: any[]) => {
        let total = 0
        data.forEach((row) => {
            if (row[0] && !row[0].toString().includes("Tổng")) {
                const tinhTrangKH = row[19]
                const tinhTrangNCC = row[20]
                const giaMua = parseNumberWithComma(row[15]) || 0

                // Count completed orders
                if (
                    (tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") &&
                    (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hoàn")
                ) {
                    total += giaMua
                }
            }
        })
        return total
    }, [])

    // Update completed orders amount when table data changes
    useEffect(() => {
        if (userInfo?.role === "NCC") {
            const amount = calculateCompletedOrdersAmount(tableData)
            setCompletedOrdersAmount(amount)
        }
    }, [tableData, userInfo?.role, calculateCompletedOrdersAmount])

    // Add function to handle withdrawal request
    const handleWithdrawRequest = () => {
        // Chuyển selectedWeek về dạng số để so sánh
        const selectedWeekNum = parseInt(selectedWeek);

        // Nếu đã có transaction cho tuần đang chọn thì hiển thị trạng thái và thoát
        const selectedWeekTransaction = transactions.find(t => String(t.week) === String(selectedWeekNum));
        if (selectedWeekTransaction) {
            toast.info(
                <>
                    <div className="font-semibold">Yêu cầu thanh toán tuần {selectedWeek} đã được gửi</div>
                    <div>Trạng thái: {selectedWeekTransaction.status}</div>
                </>
            );
            return;
        }

        const currentWeek = getCurrentWeek();

        // Không cho phép rút tiền cho tuần hiện tại
        if (selectedWeekNum === currentWeek) {
            toast.error(
                <>
                    <div className="font-semibold">Không thể yêu cầu thanh toán cho tuần hiện tại</div>
                    <div>Vui lòng chỉ yêu cầu thanh toán cho các đơn hàng đã hoàn tất của tuần trước.</div>
                </>
            );
            return;
        }

        // Đếm số đơn hoàn thành của tuần đang chọn
        const completedOrders = allData.filter(row => {
            const weekNumber = getWeekNumber(row[3]);
            const tinhTrangKH = row[19];
            const tinhTrangNCC = row[20];
            return (
                String(weekNumber) === String(selectedWeekNum) &&
                (tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") &&
                (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hoàn")
            );
        });

        if (completedOrders.length === 0) {
            toast.error(
                <>
                    <div className="font-semibold">Không có đơn hàng hoàn tất trong tuần {selectedWeek}</div>
                    <div>Tuần này không có đơn hàng đủ điều kiện để thanh toán.</div>
                </>
            );
            return;
        }

        setWithdrawModalOpen(true);
    };

    // Modify useEffect to fetch transactions
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = (await contentApiRequest.get()) as ContentApiResponse

                if (response.success && response.data) {
                    // Store transactions
                    if (response.transaction) {
                        setTransactions(response.transaction)
                    }

                    // Filter data based on user role and username
                    let filteredData = response.data
                    if (userInfo?.role === "Nhân viên" || userInfo?.role === "Khách hàng") {
                        const userPrefix = userInfo?.username || ""
                        filteredData = response.data.filter(order => {
                            if (!order.ma_don) return false
                            const maDonPrefix = order.ma_don.split("-")[0]
                            return maDonPrefix === userPrefix
                        })
                    } else if (userInfo?.role === "NCC") {
                        const nccUsername = userInfo?.username || ""
                        filteredData = response.data.filter(order => {
                            return order.ma_ncc === nccUsername
                        })
                    }

                    // Extract unique customers and NCCs for all roles
                    const uniqueCustomers = getUniqueCustomers(response.data)
                    const uniqueNCCs = Array.from(new Set(response.data
                        .map(order => order.ma_ncc)
                        .filter((ncc): ncc is string => ncc !== null && ncc !== undefined)))
                        .sort()

                    setUsers(uniqueCustomers)
                    setNCCs(uniqueNCCs)

                    // Transform the filtered data into the desired format
                    const formattedData = filteredData.map((order) => {
                        const giaBan = parseNumberWithComma(order.gia_ban)
                        const giaMua = parseNumberWithComma(order.gia_mua)
                        const ln = giaBan - giaMua

                        const anchor1 = order.anchor1 || ""
                        const anchor2 = order.anchor2 || ""
                        const linkKq = order.link_kq || ""

                        // Determine tt_kh_status for initial display based on API value and Anchor presence
                        let tt_kh_status = order.tt_kh || "Chưa nhập"
                        if ((anchor1.trim() !== "" || anchor2.trim() !== "") && (tt_kh_status === "Chưa nhập")) {
                            tt_kh_status = "Đã nhập"
                        }

                        // Determine tt_ncc for initial display based on API value and LinkKQ presence
                        let tt_ncc = order.tt_ncc || "Chưa nhận"
                        if (linkKq.trim() !== "" && (tt_ncc === "Chưa nhận")) {
                            tt_ncc = "Đã lên bài"
                        }

                        return [
                            order.id,
                            order.ma_don || "",
                            order.loai || "",
                            order.ngay_order || "",
                            order.note_kh1 || "",
                            order.note_kh2 || "",
                            order.chu_de || "",
                            anchor1,
                            order.url1 || "",
                            anchor2,
                            order.url2 || "",
                            linkKq,
                            order.deadline || "",
                            order.note || "",
                            giaBan,
                            giaMua,
                            ln,
                            order.ten_ncc || "",
                            order.ma_ncc || "",
                            tt_kh_status,
                            tt_ncc,
                            order.chat || [],
                            order.note || "",
                        ]
                    })

                    // Store all data for filtering
                    setAllData(formattedData)

                    // Check for new chat messages to set blinking
                    const newBlinkingOrders = new Set<string>()
                    formattedData.forEach((row) => {
                        const chat = row[21]
                        if (chat && Array.isArray(chat) && chat.length > 0) {
                            const lastMessage = chat[chat.length - 1]
                            if (lastMessage) {
                                const isFromOtherParty =
                                    (userInfo?.role === "NCC" && lastMessage.role === "Khách hàng") ||
                                    (userInfo?.role === "Khách hàng" && lastMessage.role === "NCC")

                                if (isFromOtherParty) {
                                    newBlinkingOrders.add(row[1].toString())
                                }
                            }
                        }
                    })
                    setBlinkingChatOrders(newBlinkingOrders)
                } else {
                    setAllData([])
                }
            } catch (error) {
                console.error("Error fetching data:", error)
                setAllData([])
            }
        }

        fetchData()
        // Set up polling every 30 seconds
        const intervalId = setInterval(fetchData, 30000)

        return () => clearInterval(intervalId)
    }, [userInfo?.role, userInfo?.username])

    return (
        <>
            <Toaster position="top-right" expand={true} richColors />
            <div className="mb-4 bg-white rounded-lg shadow-md p-4">
                <div className="flex flex-col space-y-4">
                    {/* Filter Controls Row */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center space-x-4">
                            <label className="text-sm font-medium text-gray-700">Hiển thị:</label>
                            <div className="flex items-center space-x-2">
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={viewOptions.total}
                                        onChange={() => handleViewOptionChange("total")}
                                        disabled={isMerged}
                                        className={`form-checkbox h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500 ${isMerged ? "opacity-50 cursor-not-allowed" : ""}`}
                                    />
                                    <span className={`ml-2 text-sm ${isMerged ? "text-gray-500" : "text-gray-700"}`}>Tổng</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={viewOptions.pending}
                                        onChange={() => handleViewOptionChange("pending")}
                                        disabled={isMerged}
                                        className={`form-checkbox h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500 ${isMerged ? "opacity-50 cursor-not-allowed" : ""}`}
                                    />
                                    <span className={`ml-2 text-sm ${isMerged ? "text-gray-500" : "text-gray-700"}`}>Chưa nhập</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={viewOptions.cancelled}
                                        onChange={() => handleViewOptionChange("cancelled")}
                                        className="form-checkbox h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Đơn hủy</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <label className="text-sm font-medium text-gray-700 mr-2">Tuần:</label>
                            <select
                                value={selectedWeek}
                                onChange={(e) => setSelectedWeek(e.target.value)}
                                className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                                {Array.from({ length: getCurrentWeek() }, (_, i) => {
                                    const weekNumber = getCurrentWeek() - i
                                    return (
                                        <option key={weekNumber} value={weekNumber}>
                                            Tuần {weekNumber}
                                        </option>
                                    )
                                })}
                            </select>
                        </div>
                        {/* Customer Filter - Hidden for Khách hàng and Nhân viên roles */}
                        {userInfo?.role !== "Khách hàng" && userInfo?.role !== "Nhân viên" && (
                            <div className="flex items-center">
                                <label className="text-sm font-medium text-gray-700 mr-2">Khách hàng:</label>
                                <select
                                    value={customerFilter}
                                    onChange={(e) => setCustomerFilter(e.target.value)}
                                    className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                >
                                    <option value="">Tất cả</option>
                                    {users.map((customer) => (
                                        <option key={customer} value={customer}>
                                            {customer}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Supplier Filter - Hidden for NCC role */}
                        {userInfo?.role !== "NCC" && (
                            <div className="flex items-center">
                                <label className="text-sm font-medium text-gray-700 mr-2">NCC:</label>
                                <select
                                    value={supplierFilter}
                                    onChange={(e) => setSupplierFilter(e.target.value)}
                                    className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                >
                                    <option value="">Tất cả</option>
                                    {nccs.map((ncc) => (
                                        <option key={ncc} value={ncc}>
                                            {ncc}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <button
                            onClick={handleMergeData}
                            disabled={!viewOptions.total || !viewOptions.pending}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isMerged
                                ? "bg-blue-500 hover:bg-blue-600 text-white"
                                : !viewOptions.total || !viewOptions.pending
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-300"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                                }`}
                        >
                            {isMerged ? "Tách dữ liệu" : "Gộp dữ liệu"}
                        </button>

                        {/* Add Withdraw button for NCC role */}
                        {userInfo?.role === "NCC" && (
                            <button
                                onClick={handleWithdrawRequest}
                                className="px-4 py-2 rounded-md text-sm font-medium bg-green-500 hover:bg-green-600 text-white transition-colors"
                            >
                                Y/C Thanh toán
                            </button>
                        )}

                        <div className="ml-auto">
                            <button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="fixed flex items-center top-4 right-4 z-[9999] p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                            >
                                {isFullscreen ? (
                                    <div className="hidden"></div>
                                ) : (
                                    <>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-4 w-4 mr-1"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                                            />
                                        </svg>
                                        Toàn màn hình
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-500 rounded-full mr-3">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700">Đơn hoàn thành</h3>
                                    <div className="flex items-baseline">
                                        <p className="text-2xl font-bold text-green-600">{stats.totalOrders}</p>
                                        <p className="ml-2 text-sm text-gray-600">đơn</p>
                                    </div>
                                    <p className="text-sm font-medium text-green-600">{stats.totalAmount.toLocaleString("vi-VN")} USDT</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                            <div className="flex items-center">
                                <div className="p-2 bg-yellow-500 rounded-full mr-3">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700">Đơn chờ xử lý</h3>
                                    <div className="flex items-baseline">
                                        <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                                        <p className="ml-2 text-sm text-gray-600">đơn</p>
                                    </div>
                                    <p className="text-sm font-medium text-yellow-600">
                                        {stats.pendingAmount.toLocaleString("vi-VN")} USDT
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                            <div className="flex items-center">
                                <div className="p-2 bg-red-500 rounded-full mr-3">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700">Đơn hủy</h3>
                                    <div className="flex items-baseline">
                                        <p className="text-2xl font-bold text-red-600">{stats.cancelledOrders}</p>
                                        <p className="ml-2 text-sm text-gray-600">đơn</p>
                                    </div>
                                    <p className="text-sm font-medium text-red-600">
                                        {stats.cancelledAmount.toLocaleString("vi-VN")} USDT
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={`${isFullscreen ? "fixed inset-0 z-50 bg-white" : "relative"}`}>
                {/* Loading indicator */}
                {(isUpdating || isBatchUpdating) && (
                    <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white px-3 py-1 rounded-full text-xs">
                        Đang cập nhật...
                    </div>
                )}

                <HotTable
                    themeName="ht-theme-main"
                    nestedHeaders={[RowHeader1, RowHeader2]}
                    data={tableData}
                    filters={true}
                    width="100%"
                    autoColumnSize={true}
                    manualColumnResize={true}
                    height={isFullscreen ? "calc(100vh - 40px)" : "calc(100vh - 240px)"}
                    stretchH="all"
                    manualRowMove={true}
                    manualColumnMove={true}
                    manualRowResize={true}
                    className="custom-table"
                    licenseKey="non-commercial-and-evaluation"
                    rowHeaders={false}
                    hiddenColumns={getHiddenColumns()}
                    cells={cells}
                    contextMenu={{
                        items: {
                            cancelOrder: {
                                name: "Hủy Đơn",
                                callback: function (this: any, key: string, selection: any, clickEvent: any) {
                                    const row = selection[0].start.row
                                    handleContextMenuAction(row, key)
                                },
                                hidden: function (this: any) {
                                    if (userInfo?.role === "NCC") return true
                                    const selected = this.getSelectedLast()
                                    if (!selected || !Array.isArray(selected) || selected.length < 4) return true
                                    const selectedRow = selected[0]
                                    if (selectedRow < 0 || selectedRow >= tableData.length) return true
                                    if (!tableData[selectedRow] || !tableData[selectedRow][20]) return true
                                    const tinhTrang = tableData[selectedRow][20]
                                    return tinhTrang === "Y/C Hủy đơn" || tinhTrang === "Hủy đơn" || tinhTrang === "Đơn OK"
                                },
                            },
                            okOrder: {
                                name: "Đơn OK",
                                callback: function (this: any, key: string, selection: any, clickEvent: any) {
                                    const row = selection[0].start.row
                                    handleContextMenuAction(row, key)
                                },
                                hidden: function (this: any) {
                                    if (userInfo?.role === "NCC") return true
                                    const selected = this.getSelectedLast()
                                    if (!selected || !Array.isArray(selected) || selected.length < 4) return true
                                    const selectedRow = selected[0]
                                    if (selectedRow < 0 || selectedRow >= tableData.length) return true
                                    if (!tableData[selectedRow] || !tableData[selectedRow][19]) return true
                                    const tinhTrang = tableData[selectedRow][19]
                                    const tinhTrangNCC = tableData[selectedRow][20]
                                    return (
                                        tinhTrang === "Đơn OK" ||
                                        tinhTrang === "Y/C Hủy đơn" ||
                                        tinhTrang === "Chưa nhập" ||
                                        tinhTrang === "Hủy đơn" ||
                                        tinhTrangNCC === "Chưa nhận"
                                    )
                                },
                            },
                            approveRefund: {
                                name: "Đồng ý hoàn",
                                callback: function (this: any, key: string, selection: any, clickEvent: any) {
                                    const row = selection[0].start.row
                                    handleContextMenuAction(row, key)
                                },
                                hidden: function (this: any) {
                                    if (userInfo?.role === "Khách hàng" || userInfo?.role === "Nhân viên") return true
                                    const selected = this.getSelectedLast()
                                    if (!selected || !Array.isArray(selected) || selected.length < 4) return true
                                    const selectedRow = selected[0]
                                    if (selectedRow < 0 || selectedRow >= tableData.length) return true
                                    if (!tableData[selectedRow] || !tableData[selectedRow][19]) return true
                                    const tinhTrangKH = tableData[selectedRow][19]
                                    const tinhTrangNCC = tableData[selectedRow][20]
                                    return (
                                        tinhTrangKH !== "Y/C Hủy đơn" || tinhTrangNCC === "Đồng ý hoàn" || tinhTrangNCC === "Từ chối hoàn"
                                    )
                                },
                            },
                            rejectRefund: {
                                name: "Từ chối hoàn",
                                callback: function (this: any, key: string, selection: any, clickEvent: any) {
                                    const row = selection[0].start.row
                                    handleContextMenuAction(row, key)
                                },
                                hidden: function (this: any) {
                                    if (userInfo?.role === "Khách hàng" || userInfo?.role === "Nhân viên") return true
                                    const selected = this.getSelectedLast()
                                    if (!selected || !Array.isArray(selected) || selected.length < 4) return true
                                    const selectedRow = selected[0]
                                    if (selectedRow < 0 || selectedRow >= tableData.length) return true
                                    if (!tableData[selectedRow] || !tableData[selectedRow][19]) return true
                                    const tinhTrangKH = tableData[selectedRow][19]
                                    const tinhTrangNCC = tableData[selectedRow][20]
                                    return (
                                        tinhTrangKH !== "Y/C Hủy đơn" || tinhTrangNCC === "Đồng ý hoàn" || tinhTrangNCC === "Từ chối hoàn"
                                    )
                                },
                            },
                        },
                    }}
                    dropdownMenu={false}
                    columnSorting={false}
                    columnHeaderHeight={30}
                    afterChange={handleAfterChange}
                    afterPaste={handleAfterPaste}
                />
            </div>
            {isFullscreen && (
                <button
                    onClick={() => setIsFullscreen(false)}
                    className="fixed top-4 right-4 z-[9999] p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
            <div className={isFullscreen ? "fixed bottom-4 right-4 z-50" : ""}>
                <ChatDialog
                    chatDialogOpen={chatDialogOpen}
                    setChatDialogOpen={setChatDialogOpen}
                    currentChatOrderId={currentChatOrderId}
                    currentChatMessages={currentChatMessages}
                    newChatMessage={newChatMessage}
                    setNewChatMessage={setNewChatMessage}
                    sendChatMessage={handleSendChatMessage}
                    role={userInfo?.role}
                    supplierName={userInfo?.name}
                    user={userInfo}
                    isUpdating={isUpdating}
                />
            </div>

            {/* Add WithdrawModal */}
            <WithdrawModal
                isVisible={withdrawModalOpen}
                onClose={() => setWithdrawModalOpen(false)}
                username={userInfo?.username}
                currentBalance={completedOrdersAmount}
                pendingAmount={0}
                completedOrdersAmount={completedOrdersAmount}
                week={selectedWeek}
            />
        </>
    )
}