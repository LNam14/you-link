"use client"
import { HotTable } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import "./custom-table.css"
import Handsontable from "handsontable"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import { useEffect, useState, useCallback } from "react"
import { ref, onValue, update, get, set } from "firebase/database"
import { database } from "@/lib/firebase"
import getUserInfo from "@/components/userInfo"
import ChatDialog from "./components/ChatDialog"
import sheetApiRequest from "@/apiRequests/sheet"
import { toast, Toaster } from "sonner"

registerAllModules()

type NestedColumnHeader = {
    label: string
    colspan: number
}

interface ChatMessage {
    text: string
    sender: string
    senderRole: string
    timestamp: number
    ngayChat: string
    name?: string
    supplierName?: string
}

export default function PageBody() {
    const [tableData, setTableData] = useState<any[]>([])
    const [isMerged, setIsMerged] = useState(true)
    const [viewOptions, setViewOptions] = useState({
        total: true,
        pending: true,
        cancelled: true
    });
    const [selectedWeek, setSelectedWeek] = useState("")
    const [selectedUser, setSelectedUser] = useState("")
    const [selectedNCC, setSelectedNCC] = useState("")
    const [users, setUsers] = useState<string[]>([])
    const [nccs, setNCCs] = useState<string[]>([])
    const userInfo = getUserInfo()
    const [chatDialogOpen, setChatDialogOpen] = useState(false)
    const [currentChatOrderId, setCurrentChatOrderId] = useState<string | null>(null)
    const [currentChatMessages, setCurrentChatMessages] = useState<any[]>([])
    const [newChatMessage, setNewChatMessage] = useState("")
    const [blinkingChatOrders, setBlinkingChatOrders] = useState<Set<string>>(new Set())
    const [isFullscreen, setIsFullscreen] = useState(false)

    const parseNumberWithComma = (value: any): number => {
        if (typeof value === "number") return value
        if (!value) return 0
        // Thay thế dấu phẩy bằng dấu chấm và chuyển đổi thành số
        return Number.parseFloat(value.toString().replace(/,/g, "")) || 0
    }

    // Add function to get current week number
    const getCurrentWeek = () => {
        const now = new Date()
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1)
        // Adjust first day to be Monday (1) instead of Sunday (0)
        const firstDayOfWeek = firstDayOfYear.getDay() || 7 // Convert Sunday (0) to 7
        const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000
        // Adjust calculation to start from Monday
        return Math.ceil((pastDaysOfYear + firstDayOfWeek) / 7)
    }

    // Add function to get week number from date
    const getWeekNumber = (dateStr: string) => {
        if (!dateStr) return ""
        // Parse date from DD/MM/YYYY format
        const [day, month, year] = dateStr.split("/")
        const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
        // Adjust first day to be Monday (1) instead of Sunday (0)
        const firstDayOfWeek = firstDayOfYear.getDay() || 7 // Convert Sunday (0) to 7
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
        // Adjust calculation to start from Monday
        return Math.ceil((pastDaysOfYear + firstDayOfWeek) / 7)
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
            if (row[0] && !row[0].includes("Tổng")) {
                const giaBan = parseNumberWithComma(row[13]) || 0
                const tinhTrangKH = row[19]
                const tinhTrangNCC = row[20]

                // Filter by week if selected
                if (selectedWeek) {
                    const orderDate = row[2]
                    const weekNumber = getWeekNumber(orderDate)
                    if (weekNumber.toString() !== selectedWeek) return
                }

                // Filter by user if selected
                if (selectedUser) {
                    const MaKH = row[0]
                    const MaKHBeforeDash = MaKH.split("-")[0]
                    if (MaKHBeforeDash !== selectedUser) return
                }

                // Filter by NCC if selected
                if (selectedNCC && row[18] !== selectedNCC) return

                // Count total orders
                if (
                    (tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") &&
                    (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hoàn")
                ) {
                    stats.totalOrders++
                    stats.totalAmount += giaBan
                }

                // Count pending orders
                if ((tinhTrangKH === "Chưa nhập" || tinhTrangKH === "Đã nhập") && tinhTrangNCC === "Chưa nhận") {
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

    // Add useEffect to fetch users and NCCs
    useEffect(() => {
        if (userInfo?.role === "Admin") {
            const ordersRef = ref(database, "content")

            // Fetch orders to get unique MaKH and MaNCC
            onValue(ordersRef, (snapshot) => {
                const data = snapshot.val()
                if (data) {
                    const uniqueMaKH = new Set<string>()
                    const uniqueMaNCC = new Set<string>()

                    Object.entries(data).forEach(([orderId, order]: [string, any]) => {
                        // Extract MaKH from order ID (e.g., "BH5-4" -> "BH5" or "KH1-2" -> "KH1")
                        if (orderId) {
                            const maKH = orderId.split("-")[0]
                            if (maKH) {
                                // Only add if it starts with BH or KH
                                if (maKH.startsWith("BH") || maKH.startsWith("KH")) {
                                    uniqueMaKH.add(maKH)
                                }
                            }
                        }

                        // Add MaNCC if exists
                        if (order.MaNCC) uniqueMaNCC.add(order.MaNCC)
                    })

                    // Sort users by type (BH first, then KH) and then by number
                    const sortedUsers = Array.from(uniqueMaKH).sort((a, b) => {
                        const aType = a.startsWith("BH") ? 0 : 1
                        const bType = b.startsWith("BH") ? 0 : 1
                        if (aType !== bType) return aType - bType

                        const aNum = Number.parseInt(a.replace(/[^0-9]/g, "")) || 0
                        const bNum = Number.parseInt(b.replace(/[^0-9]/g, "")) || 0
                        return aNum - bNum
                    })

                    // Update users and NCCs lists with unique value
                    setUsers(sortedUsers)
                    setNCCs(Array.from(uniqueMaNCC))
                }
            })
        }
    }, [userInfo?.role])

    // Get current statistics
    const stats = getStatistics(tableData)

    // Add summary calculation function
    const calculateSummary = (data: any[]) => {
        const summary = {
            totalGiaBan: 0,
            totalGiaMua: 0,
            totalLN: 0,
            totalTTNCC: 0,
            count: 0,
            cancelledGiaBan: 0,
            cancelledGiaMua: 0,
            cancelledLN: 0,
            cancelledTTNCC: 0,
            cancelledCount: 0,
            pendingGiaBan: 0,
            pendingGiaMua: 0,
            pendingLN: 0,
            pendingTTNCC: 0,
            pendingCount: 0,
        }

        data.forEach((row) => {
            if (row[0] && !row[0].includes("Tổng")) {
                // Skip summary rows
                const giaBan = parseNumberWithComma(row[13]) || 0
                const giaMua = parseNumberWithComma(row[14]) || 0
                const ln = parseNumberWithComma(row[15]) || 0
                const ttncc = parseNumberWithComma(row[16]) || 0
                const tinhTrangKH = row[19]
                const tinhTrangNCC = row[20]

                // Calculate totals for all orders
                if (
                    (tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") &&
                    (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hoàn")
                ) {
                    summary.totalGiaBan += giaBan
                    summary.totalGiaMua += giaMua
                    summary.totalLN += ln
                    summary.totalTTNCC += ttncc
                    summary.count++
                }

                // Calculate totals for cancelled orders
                if (tinhTrangKH === "Hủy đơn" || (tinhTrangKH === "Y/C Hủy đơn" && tinhTrangNCC === "Đồng ý hoàn")) {
                    summary.cancelledGiaBan += giaBan
                    summary.cancelledGiaMua += giaMua
                    summary.cancelledLN += ln
                    summary.cancelledTTNCC += ttncc
                    summary.cancelledCount++
                }

                // Calculate totals for pending orders
                if (
                    (tinhTrangKH === "Chưa nhập" && tinhTrangNCC === "Đã nhận") ||
                    ((tinhTrangKH === "Chưa nhập" || tinhTrangKH === "Đã nhập") &&
                        (tinhTrangNCC === "Chưa nhận" || !tinhTrangNCC))
                ) {
                    summary.pendingGiaBan += giaBan
                    summary.pendingGiaMua += giaMua
                    summary.pendingLN += ln
                    summary.pendingTTNCC += ttncc
                    summary.pendingCount++
                }
            }
        })

        // Format numbers to 2 decimal places
        summary.totalGiaBan = Number(summary.totalGiaBan.toFixed(2))
        summary.totalGiaMua = Number(summary.totalGiaMua.toFixed(2))
        summary.totalLN = Number(summary.totalLN.toFixed(2))
        summary.totalTTNCC = Number(summary.totalTTNCC.toFixed(2))
        summary.cancelledGiaBan = Number(summary.cancelledGiaBan.toFixed(2))
        summary.cancelledGiaMua = Number(summary.cancelledGiaMua.toFixed(2))
        summary.cancelledLN = Number(summary.cancelledLN.toFixed(2))
        summary.cancelledTTNCC = Number(summary.cancelledTTNCC.toFixed(2))
        summary.pendingGiaBan = Number(summary.pendingGiaBan.toFixed(2))
        summary.pendingGiaMua = Number(summary.pendingGiaMua.toFixed(2))
        summary.pendingLN = Number(summary.pendingLN.toFixed(2))
        summary.pendingTTNCC = Number(summary.pendingTTNCC.toFixed(2))

        return summary
    }

    // Add filter function
    const filterTableData = (data: any[]) => {
        // First filter by week
        const weekFilteredData = data.filter((row) => {
            if (!row[0] || row[0].includes("Tổng")) return false // Remove all summary rows
            const orderDate = row[2]
            const weekNumber = getWeekNumber(orderDate)
            return weekNumber.toString() === selectedWeek
        })

        // Then filter by user (MaKH) if selected
        const userFilteredData = selectedUser
            ? weekFilteredData.filter((row) => {
                const orderId = row[0]
                if (!orderId) return false
                const maKH = orderId.split("-")[0]
                console.log("Filtering by user:", { orderId, maKH, selectedUser }) // Debug log
                return maKH === selectedUser
            })
            : weekFilteredData

        // Then filter by NCC if selected
        const nccFilteredData = selectedNCC
            ? userFilteredData.filter((row) => {
                const maNCC = row[18] // MaNCC is at index 18
                return maNCC === selectedNCC
            })
            : userFilteredData

        // Calculate summary for filtered data
        const summary = calculateSummary(nccFilteredData)

        // Create summary rows
        const totalRow = [
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "Tổng",
            summary.totalGiaBan.toFixed(2),
            summary.totalGiaMua.toFixed(2),
            summary.totalLN.toFixed(2),
            summary.totalTTNCC.toFixed(2),
            "",
            "",
            "",
            "",
            "",
        ]

        const pendingRow = [
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "Chưa nhập",
            summary.pendingGiaBan.toFixed(2),
            summary.pendingGiaMua.toFixed(2),
            summary.pendingLN.toFixed(2),
            summary.pendingTTNCC.toFixed(2),
            "",
            "",
            "",
            "",
            "",
        ]

        const cancelledRow = [
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "Đơn hủy",
            summary.cancelledGiaBan.toFixed(2),
            summary.cancelledGiaMua.toFixed(2),
            summary.cancelledLN.toFixed(2),
            summary.cancelledTTNCC.toFixed(2),
            "",
            "",
            "",
            "",
            "",
        ]

        // Create filtered data based on selected view options
        const filteredData = [];

        if (viewOptions.total) {
            filteredData.push(
                totalRow,
                ...nccFilteredData.filter(
                    (row) =>
                        (row[19] === "Đã nhập" || row[19] === "Đơn OK" || row[19] === "Y/C Hủy đơn") &&
                        (row[20] === "Đã lên bài" || row[20] === "Từ chối hoàn"),
                )
            );
        }

        if (viewOptions.pending) {
            filteredData.push(
                pendingRow,
                ...nccFilteredData.filter(
                    (row) => (row[19] === "Chưa nhập" || row[19] === "Đã nhập") && row[20] === "Chưa nhận",
                )
            );
        }

        if (viewOptions.cancelled) {
            filteredData.push(
                cancelledRow,
                ...nccFilteredData.filter(
                    (row) => row[19] === "Hủy đơn" || (row[19] === "Y/C Hủy đơn" && row[20] === "Đồng ý hoàn"),
                )
            );
        }

        return filteredData;
    };

    // Modify useEffect to store all data and apply filters
    useEffect(() => {
        const ordersRef = ref(database, "content")
        console.log(ordersRef, "ordersRef")
        const unsubscribe = onValue(ordersRef, (snapshot) => {
            const data = snapshot.val()
            console.log(data, "data")
            if (data) {
                // Transform the data into table format
                const formattedData = Object.entries(data)
                    .map(([orderId, order]: [string, any]) => {
                        const giaBan = parseNumberWithComma(order.GiaBan)
                        const giaMua = parseNumberWithComma(order.GiaMua)
                        const ln = giaBan - giaMua

                        return [
                            orderId,
                            order.TenSP || "",
                            order.NgayOrder || "",
                            order.KHNote1 || "",
                            order.KHNote2 || "",
                            order.ChuDe || "",
                            order.Anchor1 || "",
                            order.URL1 || "",
                            order.Anchor2 || "",
                            order.URL2 || "",
                            order.LinkKQ || "",
                            order.Deadline || "",
                            order.Note || "",
                            giaBan,
                            giaMua,
                            ln,
                            order.TTNCC || "",
                            order.TenNCC || "",
                            order.MaNCC || "",
                            order.TinhTrangKH || "",
                            order.TinhTrangNCC || "",
                        ]
                    })
                    .filter((row) => {
                        if (userInfo?.role === "NCC") {
                            return row[18] === userInfo?.username
                        } else if (userInfo?.role === "Khách hàng" || userInfo?.role === "Nhân viên") {
                            const MaKH = row[0]
                            const MaKHBeforeDash = MaKH.split("-")[0]
                            return MaKHBeforeDash === userInfo?.username
                        }
                        return true
                    })

                // Sort the formatted data
                formattedData.sort((a: any[], b: any[]) => {
                    const orderIdA = a[0]
                    const orderIdB = b[0]
                    const partsA = orderIdA.split("-")
                    const partsB = orderIdB.split("-")
                    for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
                        const numA = Number.parseInt(partsA[i].replace(/[^0-9]/g, ""))
                        const numB = Number.parseInt(partsB[i].replace(/[^0-9]/g, ""))
                        if (numA !== numB) {
                            return numA - numB
                        }
                        if (partsA[i] !== partsB[i]) {
                            return partsA[i].localeCompare(partsB[i])
                        }
                    }
                    return partsA.length - partsB.length
                })

                // Calculate summary
                const summary = calculateSummary(formattedData)

                // Create summary rows
                const totalRow = [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "Tổng",
                    summary.totalGiaBan,
                    summary.totalGiaMua,
                    summary.totalLN,
                    summary.totalTTNCC,
                    "",
                    "",
                    "",
                    "",
                    "",
                ]

                const cancelledRow = [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "Đơn hủy",
                    summary.cancelledGiaBan,
                    summary.cancelledGiaMua,
                    summary.cancelledLN,
                    summary.cancelledTTNCC,
                    "",
                    "",
                    "",
                    "",
                    "",
                ]

                const pendingRow = [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "Chưa nhập",
                    summary.pendingGiaBan,
                    summary.pendingGiaMua,
                    summary.pendingLN,
                    summary.pendingTTNCC,
                    "",
                    "",
                    "",
                    "",
                    "",
                ]

                // Combine all data with summary rows
                const finalData = [
                    totalRow,
                    ...formattedData.filter(
                        (row) =>
                            (row[19] === "Đã nhập" || row[19] === "Đơn OK" || row[19] === "Y/C Hủy đơn") &&
                            (row[20] === "Đã lên bài" || row[20] === "Từ chối hoàn"),
                    ),
                    pendingRow,
                    ...formattedData.filter(
                        (row) => (row[19] === "Chưa nhập" || row[19] === "Đã nhập") && row[20] === "Chưa nhận",
                    ),
                    cancelledRow,
                    ...formattedData.filter(
                        (row) => row[19] === "Hủy đơn" || (row[19] === "Y/C Hủy đơn" && row[20] === "Đồng ý hoàn"),
                    ),
                ]

                // Apply filters
                const filteredData = filterTableData(finalData)

                // If isMerged is true, merge the data
                if (isMerged) {
                    // Get the cancelled orders section
                    const cancelledSection = filteredData.filter(row => row[12] === "Đơn hủy" ||
                        (row[19] === "Hủy đơn" || (row[19] === "Y/C Hủy đơn" && row[20] === "Đồng ý hoàn")));

                    // Get the total row
                    const totalRow = filteredData.find(row => row[12] === "Tổng");

                    // Get all non-cancelled orders
                    const nonCancelledOrders = filteredData.filter(row =>
                        row[12] !== "Tổng" &&
                        row[12] !== "Đơn hủy" &&
                        row[12] !== "Chưa nhập" &&
                        !(row[19] === "Hủy đơn" || (row[19] === "Y/C Hủy đơn" && row[20] === "Đồng ý hoàn"))
                    );

                    // Sort non-cancelled orders by order ID
                    nonCancelledOrders.sort((a, b) => {
                        const orderIdA = a[0];
                        const orderIdB = b[0];
                        const partsA = orderIdA.split("-");
                        const partsB = orderIdB.split("-");
                        for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
                            const numA = Number.parseInt(partsA[i].replace(/[^0-9]/g, ""));
                            const numB = Number.parseInt(partsB[i].replace(/[^0-9]/g, ""));
                            if (numA !== numB) {
                                return numA - numB;
                            }
                            if (partsA[i] !== partsB[i]) {
                                return partsA[i].localeCompare(partsB[i]);
                            }
                        }
                        return partsA.length - partsB.length;
                    });

                    // Create merged data array
                    const mergedData = [
                        totalRow,
                        ...nonCancelledOrders,
                        ...cancelledSection
                    ];

                    setTableData(mergedData);
                } else {
                    setTableData(filteredData);
                }
            } else {
                setTableData([])
            }
        })

        return () => unsubscribe()
    }, [userInfo?.role, userInfo?.username, selectedWeek, viewOptions, selectedUser, selectedNCC, isMerged])

    // Load chat messages when currentChatOrderId changes
    useEffect(() => {
        if (!currentChatOrderId) return

        const ordersRef = ref(database, "content")

        const onOrdersChange = (snapshot: any) => {
            if (snapshot.exists()) {
                const data = snapshot.val()
                const order = data[currentChatOrderId]

                if (order && order.chat) {
                    const messages = Array.isArray(order.chat) ? order.chat : Object.values(order.chat)
                    messages.sort((a: any, b: any) => a.timestamp - b.timestamp)
                    setCurrentChatMessages(messages)
                } else {
                    setCurrentChatMessages([])
                }
            } else {
                setCurrentChatMessages([])
            }
        }

        const unsubscribe = onValue(ordersRef, onOrdersChange)

        return () => {
            unsubscribe()
        }
    }, [currentChatOrderId])

    // Add useEffect to check for new messages
    useEffect(() => {
        if (!userInfo?.role) return

        const ordersRef = ref(database, "content")
        const unsubscribe = onValue(ordersRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val()
                const newBlinkingOrders = new Set<string>()

                Object.entries(data).forEach(([orderId, order]: [string, any]) => {
                    if (order.chat && Array.isArray(order.chat)) {
                        const lastMessage = order.chat[order.chat.length - 1]
                        if (lastMessage) {
                            // Check if the last message is from the other party
                            const isFromOtherParty =
                                (userInfo.role === "NCC" && lastMessage.senderRole === "Khách hàng") ||
                                (userInfo.role === "Khách hàng" && lastMessage.senderRole === "NCC")

                            if (isFromOtherParty) {
                                newBlinkingOrders.add(orderId)
                            }
                        }
                    }
                })

                setBlinkingChatOrders(newBlinkingOrders)
            }
        })

        return () => unsubscribe()
    }, [userInfo?.role])

    const handleAfterChange = async (changes: any, source: any) => {
        // Chỉ xử lý khi thay đổi từ người dùng
        if (source !== "edit" && source !== "paste") return
        if (!changes) return

        const ordersRef = ref(database, "content")

        changes.forEach(async ([row, prop, oldValue, newValue]: [number, string, any, any]) => {
            const orderId = tableData[row][0] // Get the order ID from the first column
            const updates: any = {}

            // Map table columns to Firebase fields
            const fieldMap: { [key: number]: string } = {
                1: "TenSP",
                2: "NgayOrder",
                3: "KHNote1",
                4: "KHNote2",
                5: "ChuDe",
                6: "Anchor1",
                7: "URL1",
                8: "Anchor2",
                9: "URL2",
                10: "LinkKQ",
                11: "Deadline",
                12: "Note",
                13: "GiaBan",
                14: "GiaMua",
                16: "TTNCC",
                17: "TenNCC",
                18: "MaNCC",
                19: "TinhTrangKH",
                20: "TinhTrangNCC",
                21: "Chat",
            }

            const fieldName = fieldMap[prop as unknown as number]
            if (fieldName) {
                // Convert values to appropriate types
                let valueToUpdate = newValue
                if (fieldName === "GiaBan" || fieldName === "GiaMua") {
                    valueToUpdate = parseNumberWithComma(newValue)
                } else if (fieldName === "NgayOrder" || fieldName === "Deadline") {
                    // Xử lý ngày tháng
                    if (typeof newValue === "string" && newValue.includes("/")) {
                        const [day, month, year] = newValue.split("/")
                        valueToUpdate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
                    }
                } else if (fieldName === "Chat") {
                    // Xử lý trường chat
                    valueToUpdate = newValue || ""
                }

                updates[`${orderId}/${fieldName}`] = valueToUpdate

                // Update TinhTrangNCC when LinkKQ is entered
                if (fieldName === "LinkKQ" && newValue && newValue.trim() !== "") {
                    const currentTinhTrangNCC = tableData[row][20] // Get current TinhTrangNCC
                    if (currentTinhTrangNCC === "Chưa nhận") {
                        updates[`${orderId}/TinhTrangNCC`] = "Đã lên bài"
                        const MaKH = tableData[row][0]
                        const MaKHBeforeDash = MaKH.split("-")[0]
                        sheetApiRequest.getIDKH(MaKHBeforeDash, `Đơn ${orderId} đã xong, kiểm tra tại http://ylink.shop/content`)
                    }

                }

                // Kiểm tra và cập nhật TinhTrangKH khi thay đổi các trường liên quan
                if (["Anchor1", "URL1", "Anchor2", "URL2"].includes(fieldName)) {
                    const currentData = tableData[row]
                    const currentStatus = currentData[19] // Get current TinhTrangKH
                    console.log(currentStatus)

                    // Chỉ cập nhật TinhTrangKH nếu chưa ở trạng thái hủy
                    const hasAnchor1 = currentData[6] && currentData[6].trim() !== ""
                    const hasURL1 = currentData[7] && currentData[7].trim() !== ""
                    const hasAnchor2 = currentData[8] && currentData[8].trim() !== ""
                    const hasURL2 = currentData[9] && currentData[9].trim() !== ""

                    if ((hasAnchor1 && hasURL1) || (hasAnchor2 && hasURL2)) {
                        if (currentStatus === "Chưa nhập") {
                            updates[`${orderId}/TinhTrangKH`] = "Đã nhập"
                            const MaNCC = tableData[row][18]
                            sheetApiRequest.getIDNCC(
                                MaNCC,
                                `Đơn ${orderId} đang chờ được xử lý, vui lòng vào http://ylink.shop/content`,
                            )
                        }
                    } else {
                        if (currentStatus === "Đã nhập") {
                            updates[`${orderId}/TinhTrangKH`] = "Chưa nhập"
                        }
                    }
                }
            }

            if (Object.keys(updates).length > 0) {
                update(ordersRef, updates)
                    .then(() => {
                        console.log("Data updated successfully")
                    })
                    .catch((error) => {
                        console.error("Error updating data:", error)
                    })
            }
        })
    }

    const handleAfterPaste = async (data: any[][], coords: any[]) => {
        if (!data || !coords) return

        // Check if pasted data has more rows than available
        const startRow = coords[0].startRow
        const availableRows = tableData.length - startRow
        if (data.length > availableRows) {
            toast.error(`Không thể dán ${data.length} hàng vì chỉ còn ${availableRows} hàng trống`)
            return
        }

        const ordersRef = ref(database, "content")
        const updates: { [key: string]: any } = {}
        const nccUpdates: { [key: string]: number } = {} // Track NCC balance updates
        const linkKQUpdates: { [key: string]: { orderId: string, MaKH: string, MaNCC: string, giaMua: number } } = {} // Track LinkKQ updates

        coords.forEach(async (coord, index) => {
            const startRow = coord.startRow
            const startCol = coord.startCol
            const endRow = coord.endRow
            const endCol = coord.endCol

            // Map table columns to Firebase fields
            const fieldMap: { [key: number]: string } = {
                1: "TenSP",
                2: "NgayOrder",
                3: "KHNote1",
                4: "KHNote2",
                5: "ChuDe",
                6: "Anchor1",
                7: "URL1",
                8: "Anchor2",
                9: "URL2",
                10: "LinkKQ",
                11: "Deadline",
                12: "Note",
                13: "GiaBan",
                14: "GiaMua",
                16: "TTNCC",
                17: "TenNCC",
                18: "MaNCC",
                19: "TinhTrangKH",
                20: "TinhTrangNCC",
                21: "Chat",
            }

            // Xử lý từng ô trong vùng dán
            for (let row = startRow; row <= endRow; row++) {
                const orderId = tableData[row][0] // Get the order ID from the first column
                if (!orderId) continue

                if (!updates[orderId]) {
                    updates[orderId] = {}
                }

                // Lấy dữ liệu hiện tại từ Firebase cho đơn hàng này
                const currentOrderData = tableData[row]
                const currentFirebaseData: { [key: string]: any } = {
                    TenSP: currentOrderData[1] || "",
                    NgayOrder: currentOrderData[2] || "",
                    KHNote1: currentOrderData[3] || "",
                    KHNote2: currentOrderData[4] || "",
                    ChuDe: currentOrderData[5] || "",
                    Anchor1: currentOrderData[6] || "",
                    URL1: currentOrderData[7] || "",
                    Anchor2: currentOrderData[8] || "",
                    URL2: currentOrderData[9] || "",
                    LinkKQ: currentOrderData[10] || "",
                    Deadline: currentOrderData[11] || "",
                    Note: currentOrderData[12] || "",
                    GiaBan: parseNumberWithComma(currentOrderData[13]),
                    GiaMua: parseNumberWithComma(currentOrderData[14]),
                    TTNCC: currentOrderData[16] || "",
                    TenNCC: currentOrderData[17] || "",
                    MaNCC: currentOrderData[18] || "",
                    TinhTrangKH: currentOrderData[19] || "",
                    TinhTrangNCC: currentOrderData[20] || "",
                    Chat: currentOrderData[21] || "",
                }

                // Sao chép dữ liệu hiện tại vào updates
                updates[orderId] = { ...currentFirebaseData }

                for (let col = startCol; col <= endCol; col++) {
                    const fieldName = fieldMap[col]
                    if (fieldName) {
                        const dataRow = row - startRow
                        const dataCol = col - startCol
                        const newValue = data[dataRow]?.[dataCol]

                        if (newValue !== undefined && newValue !== null && newValue !== "") {
                            let valueToUpdate = newValue

                            // Xử lý các trường đặc biệt
                            if (fieldName === "GiaBan" || fieldName === "GiaMua") {
                                valueToUpdate = parseNumberWithComma(newValue)
                            } else if (fieldName === "NgayOrder" || fieldName === "Deadline") {
                                // Xử lý ngày tháng
                                if (typeof newValue === "string" && newValue.includes("/")) {
                                    const [day, month, year] = newValue.split("/")
                                    valueToUpdate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
                                }
                            } else if (fieldName === "Chat") {
                                // Xử lý trường chat
                                valueToUpdate = newValue || ""
                            }

                            updates[orderId][fieldName] = valueToUpdate

                            // Xử lý LinkKQ tương tự handleAfterChange
                            if (fieldName === "LinkKQ" && newValue && newValue.trim() !== "") {
                                const currentTinhTrangNCC = tableData[row][20] // Get current TinhTrangNCC
                                if (currentTinhTrangNCC === "Chưa nhận") {
                                    updates[orderId].TinhTrangNCC = "Đã lên bài"
                                    const MaKH = tableData[row][0]
                                    const MaKHBeforeDash = MaKH.split("-")[0]
                                    const MaNCC = tableData[row][18]
                                    const giaMua = parseNumberWithComma(tableData[row][14]) // Get GiaMua value

                                    sheetApiRequest.getIDKH(MaKHBeforeDash, `Đơn ${orderId} đã xong, kiểm tra tại http://ylink.shop/content`)
                                }
                            }
                        }
                    }
                }

                // Kiểm tra và cập nhật Tình trạng sau khi dán
                const hasAnchor1 = updates[orderId].Anchor1 && updates[orderId].Anchor1.trim() !== ""
                const hasURL1 = updates[orderId].URL1 && updates[orderId].URL1.trim() !== ""
                const hasAnchor2 = updates[orderId].Anchor2 && updates[orderId].Anchor2.trim() !== ""
                const hasURL2 = updates[orderId].URL2 && updates[orderId].URL2.trim() !== ""

                if ((hasAnchor1 && hasURL1) || (hasAnchor2 && hasURL2)) {
                    if (updates[orderId].TinhTrangKH === "Chưa nhập") {
                        updates[orderId].TinhTrangKH = "Đã nhập"
                        const MaNCC = updates[orderId].MaNCC
                        if (MaNCC) {
                            sheetApiRequest.getIDNCC(
                                MaNCC,
                                `Đơn ${orderId} đang chờ được xử lý, vui lòng vào http://ylink.shop/content`,
                            )
                        }
                    }
                } else {
                    if (updates[orderId].TinhTrangKH === "Đã nhập") {
                        updates[orderId].TinhTrangKH = "Chưa nhập"
                    }
                }
            }
        })

        try {
            // Send notifications for LinkKQ updates
            for (const { orderId, MaKH, MaNCC } of Object.values(linkKQUpdates)) {
                sheetApiRequest.getIDKH(
                    MaKH,
                    `Đơn ${orderId} đã xong, kiểm tra tại http://ylink.shop/content`
                )
            }

            // Update all order data
            if (Object.keys(updates).length > 0) {
                // Convert updates object to the correct format for Firebase
                const firebaseUpdates: { [key: string]: any } = {}
                Object.entries(updates).forEach(([orderId, data]) => {
                    firebaseUpdates[`${orderId}`] = data
                })

                await update(ordersRef, firebaseUpdates)
                toast.success("Dữ liệu đã được cập nhật thành công")
            }
        } catch (error) {
            console.error("Error updating data after paste:", error)
            toast.error("Có lỗi xảy ra khi cập nhật dữ liệu")
        }
    }

    const handleContextMenuAction = async (row: number, action: string) => {
        const orderId = tableData[row][0]
        const ordersRef = ref(database, `content/${orderId}`)
        const linkKQ = tableData[row][10] // Get LinkKQ value
        const MaNCC = tableData[row][18]
        const MaKH = tableData[row][0]
        const MaKHBeforeDash = MaKH.split("-")[0]
        const giaBan = parseNumberWithComma(tableData[row][13]) // Get GiaBan value
        const giaMua = parseNumberWithComma(tableData[row][14]) // Get GiaMua value

        try {
            if (action === "cancelOrder") {
                const newStatus = linkKQ && linkKQ.trim() !== "" ? "Y/C Hủy đơn" : "Hủy đơn"

                if (newStatus === "Hủy đơn") {
                    // Get crrent balance for customer only
                    sheetApiRequest.getIDKH(
                        MaKHBeforeDash,
                        `Đơn hàng ${orderId} đã bị hủy, kiểm tra tại http://ylink.shop/content`,
                    )
                } else {
                    // Just update status for cancellation request
                    await update(ordersRef, {
                        TinhTrangKH: newStatus,
                    })
                    sheetApiRequest.getIDNCC(
                        MaNCC,
                        `Khách hàng đã yêu cầu hủy đơn ${orderId}, xử lý tại http://ylink.shop/content`,
                    )
                }
            } else if (action === "approveRefund") {
                await Promise.all([
                    update(ordersRef, {
                        TinhTrangNCC: "Đồng ý hoàn",
                    })
                ])

                sheetApiRequest.getIDKH(
                    MaKHBeforeDash,
                    `NCC đã đồng ý hoàn tiền cho đơn ${orderId}, kiểm tra tại http://ylink.shop/content`,
                )
            } else if (action === "rejectRefund") {
                await update(ordersRef, {
                    TinhTrangNCC: "Từ chối hoàn",
                })
                sheetApiRequest.getIDKH(
                    MaKHBeforeDash,
                    `NCC đã từ chối hoàn tiền cho đơn ${orderId}, kiểm tra tại http://ylink.shop/content`,
                )
            } else if (action === "okOrder") {
                await update(ordersRef, {
                    TinhTrangKH: "Đơn OK",
                })
            }
        } catch (error) {
            console.error("Error updating order status:", error)
        }
    }

    const RowHeader1: NestedColumnHeader[] = [
        { label: `Đơn Hàng`, colspan: 3 },
        { label: "INFO Bài", colspan: 7 },
        { label: "Kểt Quả", colspan: 2 },
        { label: "", colspan: 1 },
        { label: "TIỀN NÈ", colspan: 4 },
        { label: "", colspan: 2 },
        { label: "Trạng Thái", colspan: 2 },
        { label: "Trao đổi", colspan: 1 },
    ]

    const RowHeader2 = [
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
        "TT NCC",
        "Tên NCC",
        "Mã NCC",
        "Khách Hàng",
        "NCC",
        "Chat",
    ]

    const getStatusColor = (status: string) => {
        switch (status) {
            // Khách hàng statuses
            case "Chưa nhập":
                return { bg: "#FFA500", text: "#FFF7ED" } // Orange bg, orange-50 text
            case "Đơn OK":
                return { bg: "#16A34A", text: "#F0FDF4" } // Green-600 bg, green-50 text
            case "Hủy đơn":
            case "Y/C Hủy đơn":
                return { bg: "#DC2626", text: "#FEF2F2" } // Red-600 bg, red-50 text
            case "Đã nhập":
                return { bg: "#9333EA", text: "#FAF5FF" } // Purple-600 bg, purple-50 text

            // NCC statuses
            case "Chưa nhận":
                return { bg: "#FFA500", text: "#FFF7ED" } // Orange bg, orange-50 text
            case "Đã lên bài":
                return { bg: "#16A34A", text: "#F0FDF4" } // Green-600 bg, green-50 text
            case "Từ chối hoàn":
                return { bg: "#DC2626", text: "#FEF2F2" } // Red-600 bg, red-50 text
            case "Đồng ý hoàn":
                return { bg: "#DC2626", text: "#FEF2F2" } // Red-600 bg, red-50 text

            default:
                return { bg: "", text: "" }
        }
    }

    const getHiddenColumns = () => {
        if (userInfo?.role === "NCC") {
            return {
                columns: [13, 15], // Giá Bán (13), LN (14)
                indicators: true,
            }
        } else if (userInfo?.role === "Khách hàng") {
            return {
                columns: [14, 15, 16, 17, 18], // Giá Mua (14), LN (15), TT NCC (16), Tên NCC (17)
                indicators: true,
            }
        }
        return {
            indicators: true,
        }
    }

    const isEditable = (col: number, row: number) => {
        // First check role-based permissions
        if (userInfo?.role === "NCC") {
            const tinhTrangKH = tableData[row]?.[19]
            const tinhTrangNCC = tableData[row]?.[20]

            // Check if the order is in a completed state
            const isCompletedOrder =
                (tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") &&
                (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hoàn")
            if (isCompletedOrder) {
                return null
            }
            return col === 10 // Only LinkKQ is editable for NCC
        } else if (userInfo?.role === "Khách hàng") {
            const tinhTrangKH = tableData[row]?.[19]
            const tinhTrangNCC = tableData[row]?.[20]
            const isCompletedOrder =
                (tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") &&
                (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hoàn")
            if (isCompletedOrder) {
                return null
            }
            const editableColumns = [2, 3, 4, 5, 6, 7, 8, 9, 11] // Ngày order, KH Note 1, KH Note 2, Chủ Đề, Anchor 1, URL 1, Anchor 2, URL 2, Deadline
            return editableColumns.includes(col)
        }

        return true // All columns editable for other roles and non-completed orders
    }

    // Function to send a new chat message
    const sendChatMessage = useCallback(async () => {
        if (!currentChatOrderId || !newChatMessage.trim()) return

        // Get current date in DD/MM/YYYY format
        const now = new Date()
        const day = String(now.getDate()).padStart(2, "0")
        const month = String(now.getMonth() + 1).padStart(2, "0")
        const year = now.getFullYear()
        const ngayChat = `${day}/${month}/${year}`

        // Create the message object with the appropriate name fields
        const message: ChatMessage = {
            text: newChatMessage.trim(),
            sender: userInfo?.displayName || userInfo?.username || "Unknown User",
            senderRole: userInfo?.role || "NCC",
            timestamp: Date.now(),
            ngayChat: ngayChat,
        }

        // Add the appropriate name field based on role
        if (userInfo?.role === "NCC") {
            message.supplierName = userInfo?.name || userInfo?.displayName || ""
        } else if (userInfo?.role === "Khách hàng") {
            message.name = userInfo?.username || userInfo?.name || userInfo?.displayName || ""
        }

        try {
            const ordersRef = ref(database, `content/${currentChatOrderId}`)
            const snapshot = await get(ordersRef)

            if (snapshot.exists()) {
                const order = snapshot.val()
                const updatedOrder = {
                    ...order,
                    chat: [...(order.chat || []), message],
                }

                await set(ordersRef, updatedOrder)
                setNewChatMessage("")

                // Send notification based on sender role
                const MaKH = currentChatOrderId.split("-")[0]
                const MaNCC = order.MaNCC

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
            }
        } catch (error) {
            console.error("Error sending message:", error)
        }
    }, [currentChatOrderId, newChatMessage, userInfo])

    // Add function to stop blinking when chat is opened
    const handleChatOpen = (orderId: string) => {
        setCurrentChatOrderId(orderId)
        setChatDialogOpen(true)
        setBlinkingChatOrders((prev) => {
            const newSet = new Set(prev)
            newSet.delete(orderId)
            return newSet
        })
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        // Handle both DD/MM/YYYY and YYYY-MM-DD formats
        if (dateStr.includes("/")) {
            const [day, month] = dateStr.split("/");
            return `${day}/${month}`;
        } else if (dateStr.includes("-")) {
            const [year, month, day] = dateStr.split("-");
            return `${day}/${month}`;
        }
        return dateStr;
    };

    // Add helper function to determine cell styling and editability
    const getCellStyle = (col: number, row: number, isCompletedOrder: boolean, tableData: any[]): { backgroundColor: string; color: string; isReadOnly: boolean } => {
        const style: { backgroundColor: string; color: string; isReadOnly: boolean } = {
            backgroundColor: "",
            color: "#000000",
            isReadOnly: false
        };

        // Mã ĐH column (col 0) is always gray and read-only
        if (col === 0) {
            style.backgroundColor = "#d3d3d3";
            style.isReadOnly = true;
            return style;
        }

        // LinkKQ column (col 10) - Check for duplicates
        if (col === 10) {
            const currentLinkKQ = tableData[row]?.[10];
            if (currentLinkKQ && currentLinkKQ.trim() !== "") {
                // Count how many times this LinkKQ appears
                const duplicateCount = tableData.filter(row =>
                    row[10] && row[10].trim() !== "" && row[10] === currentLinkKQ
                ).length;

                // If there are duplicates, apply a background color
                if (duplicateCount > 1) {
                    style.backgroundColor = "#FFE4E1"; // Light pink color for duplicates
                }
            }
        }

        // Status columns (19, 20) have their own colors
        if (col === 19 || col === 20) {
            const status = tableData[row]?.[col];
            const colors = getStatusColor(status);
            style.backgroundColor = colors.bg;
            style.color = colors.text;
            style.isReadOnly = true;
            return style;
        }

        // Chat column (21) is always read-only
        if (col === 21) {
            style.isReadOnly = true;
            return style;
        }

        // For completed orders, certain columns are gray and read-only
        if (isCompletedOrder && [6, 7, 8, 9].includes(col)) { // Anchor1, URL1, Anchor2, URL2
            style.backgroundColor = "#d3d3d3";
            style.isReadOnly = true;
            return style;
        }

        // Check if cell should be editable based on role and permissions
        const isEditableCell = isEditable(col, row);
        if (!isEditableCell) {
            style.backgroundColor = "#d3d3d3";
            style.isReadOnly = true;
            return style;
        }

        return style;
    };

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
            (tableData[row][12] === "Tổng" || tableData[row][12] === "Đơn hủy" || tableData[row][12] === "Chưa nhập")

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
                td.style.color = "#991b1b" // red-800
                td.style.fontWeight = "600"
                if (col >= 13 && col <= 16) {
                    // Giá Bán, Giá Mua, LN, TT NCC
                    td.style.textAlign = "right"
                    // Format number to 2 decimal places
                    if (value !== undefined && value !== null && value !== "") {
                        td.textContent = Number(value).toFixed(2)
                    }
                }
            }
            cellProperties.readOnly = true
            return cellProperties
        }

        // Get the current row's status
        const tinhTrangKH = tableData[row]?.[19]
        const tinhTrangNCC = tableData[row]?.[20]

        // Check if the order is in a completed state
        const isCompletedOrder =
            (tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") &&
            (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hoàn")

        // Get cell style and editability
        const cellStyle = getCellStyle(col, row, isCompletedOrder, tableData);

        // Apply cell styling and editability
        if (cellStyle) {
            cellProperties.readOnly = cellStyle.isReadOnly;
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
                // Clear existing content and set styles for td
                td.innerHTML = ""
                td.style.padding = "0"
                td.style.textAlign = "center"

                // Add chat button
                const button = document.createElement("button")
                const orderId = instance.getDataAtCell(row, 0)
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
                    td.style.backgroundColor = cellStyle.backgroundColor;
                    td.style.color = cellStyle.color;
                }

                // Format date for NgayOrder column (col 2)
                if (col === 2) {
                    td.textContent = formatDate(value)
                }

                // Apply fixed width styling
                const fixedWidthColumns = [10, 12] // LinkKQ, Note
                if (fixedWidthColumns.includes(col)) {
                    td.style.width = "150px"
                    td.style.maxWidth = "150px"
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.title = value || "" // Add tooltip with full text
                } else if (col === 0) {
                    td.style.width = "70px"
                    td.style.maxWidth = "70px"
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                } else {
                    td.style.width = "80px"
                    td.style.maxWidth = "80px"
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.title = value || "" // Add tooltip with full text
                }
            }
        }

        return cellProperties
    }

    // Add merge function
    const handleMergeData = () => {
        setIsMerged(!isMerged)
        if (!isMerged) {
            // Get the cancelled orders section
            const cancelledSection = tableData.filter(row => row[12] === "Đơn hủy" ||
                (row[19] === "Hủy đơn" || (row[19] === "Y/C Hủy đơn" && row[20] === "Đồng ý hoàn")));

            // Get the total row
            const totalRow = tableData.find(row => row[12] === "Tổng");

            // Get all non-cancelled orders
            const nonCancelledOrders = tableData.filter(row =>
                row[12] !== "Tổng" &&
                row[12] !== "Đơn hủy" &&
                row[12] !== "Chưa nhập" &&
                !(row[19] === "Hủy đơn" || (row[19] === "Y/C Hủy đơn" && row[20] === "Đồng ý hoàn"))
            );

            // Sort non-cancelled orders by order ID
            nonCancelledOrders.sort((a, b) => {
                const orderIdA = a[0];
                const orderIdB = b[0];
                const partsA = orderIdA.split("-");
                const partsB = orderIdB.split("-");
                for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
                    const numA = Number.parseInt(partsA[i].replace(/[^0-9]/g, ""));
                    const numB = Number.parseInt(partsB[i].replace(/[^0-9]/g, ""));
                    if (numA !== numB) {
                        return numA - numB;
                    }
                    if (partsA[i] !== partsB[i]) {
                        return partsA[i].localeCompare(partsB[i]);
                    }
                }
                return partsA.length - partsB.length;
            });

            // Create merged data array
            const mergedData = [
                totalRow,
                ...nonCancelledOrders,
                ...cancelledSection
            ];

            setTableData(mergedData);
        } else {
            // Reset to original data
            const ordersRef = ref(database, "content");
            onValue(ordersRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    // Transform the data into table format
                    const formattedData = Object.entries(data)
                        .map(([orderId, order]: [string, any]) => {
                            const giaBan = parseNumberWithComma(order.GiaBan);
                            const giaMua = parseNumberWithComma(order.GiaMua);
                            const ln = giaBan - giaMua;

                            return [
                                orderId,
                                order.TenSP || "",
                                order.NgayOrder || "",
                                order.KHNote1 || "",
                                order.KHNote2 || "",
                                order.ChuDe || "",
                                order.Anchor1 || "",
                                order.URL1 || "",
                                order.Anchor2 || "",
                                order.URL2 || "",
                                order.LinkKQ || "",
                                order.Deadline || "",
                                order.Note || "",
                                giaBan,
                                giaMua,
                                ln,
                                order.TTNCC || "",
                                order.TenNCC || "",
                                order.MaNCC || "",
                                order.TinhTrangKH || "",
                                order.TinhTrangNCC || "",
                            ];
                        })
                        .filter((row) => {
                            if (userInfo?.role === "NCC") {
                                return row[18] === userInfo?.username;
                            } else if (userInfo?.role === "Khách hàng" || userInfo?.role === "Nhân viên") {
                                const MaKH = row[0];
                                const MaKHBeforeDash = MaKH.split("-")[0];
                                return MaKHBeforeDash === userInfo?.username;
                            }
                            return true;
                        });

                    // Sort the formatted data
                    formattedData.sort((a: any[], b: any[]) => {
                        const orderIdA = a[0];
                        const orderIdB = b[0];
                        const partsA = orderIdA.split("-");
                        const partsB = orderIdB.split("-");
                        for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
                            const numA = Number.parseInt(partsA[i].replace(/[^0-9]/g, ""));
                            const numB = Number.parseInt(partsB[i].replace(/[^0-9]/g, ""));
                            if (numA !== numB) {
                                return numA - numB;
                            }
                            if (partsA[i] !== partsB[i]) {
                                return partsA[i].localeCompare(partsB[i]);
                            }
                        }
                        return partsA.length - partsB.length;
                    });

                    // Calculate summary
                    const summary = calculateSummary(formattedData);

                    // Create summary rows
                    const totalRow = [
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "Tổng",
                        summary.totalGiaBan,
                        summary.totalGiaMua,
                        summary.totalLN,
                        summary.totalTTNCC,
                        "",
                        "",
                        "",
                        "",
                        "",
                    ];

                    const cancelledRow = [
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "Đơn hủy",
                        summary.cancelledGiaBan,
                        summary.cancelledGiaMua,
                        summary.cancelledLN,
                        summary.cancelledTTNCC,
                        "",
                        "",
                        "",
                        "",
                        "",
                    ];

                    const pendingRow = [
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "Chưa nhập",
                        summary.pendingGiaBan,
                        summary.pendingGiaMua,
                        summary.pendingLN,
                        summary.pendingTTNCC,
                        "",
                        "",
                        "",
                        "",
                        "",
                    ];

                    // Combine all data with summary rows
                    const finalData = [
                        totalRow,
                        ...formattedData.filter(
                            (row) =>
                                (row[19] === "Đã nhập" || row[19] === "Đơn OK" || row[19] === "Y/C Hủy đơn") &&
                                (row[20] === "Đã lên bài" || row[20] === "Từ chối hoàn"),
                        ),
                        pendingRow,
                        ...formattedData.filter(
                            (row) => (row[19] === "Chưa nhập" || row[19] === "Đã nhập") && row[20] === "Chưa nhận",
                        ),
                        cancelledRow,
                        ...formattedData.filter(
                            (row) => row[19] === "Hủy đơn" || (row[19] === "Y/C Hủy đơn" && row[20] === "Đồng ý hoàn"),
                        ),
                    ];

                    // Apply filters
                    const filteredData = filterTableData(finalData);
                    setTableData(filteredData);
                } else {
                    setTableData([]);
                }
            });
        }
    };

    // Add this function to handle checkbox changes
    const handleViewOptionChange = (option: string) => {
        // If data is merged, don't allow disabling total or pending
        if (isMerged && (option === 'total' || option === 'pending')) {
            return;
        }

        setViewOptions(prev => ({
            ...prev,
            [option]: !prev[option as keyof typeof prev]
        }));
    };

    // Add useEffect to ensure total and pending are enabled when data is merged
    useEffect(() => {
        if (isMerged) {
            setViewOptions(prev => ({
                ...prev,
                total: true,
                pending: true
            }));
        }
    }, [isMerged]);

    return (
        <>
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
                                        onChange={() => handleViewOptionChange('total')}
                                        disabled={isMerged}
                                        className={`form-checkbox h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500 ${isMerged ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                    <span className={`ml-2 text-sm ${isMerged ? 'text-gray-500' : 'text-gray-700'}`}>Tổng</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={viewOptions.pending}
                                        onChange={() => handleViewOptionChange('pending')}
                                        disabled={isMerged}
                                        className={`form-checkbox h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500 ${isMerged ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                    <span className={`ml-2 text-sm ${isMerged ? 'text-gray-500' : 'text-gray-700'}`}>Chưa nhập</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={viewOptions.cancelled}
                                        onChange={() => handleViewOptionChange('cancelled')}
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
                                    const weekNumber = getCurrentWeek() - i;
                                    return (
                                        <option key={weekNumber} value={weekNumber}>
                                            Tuần {weekNumber}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {userInfo?.role === "Admin" && (
                            <>
                                <div className="flex items-center">
                                    <label className="text-sm font-medium text-gray-700 mr-2">Khách hàng:</label>
                                    <select
                                        value={selectedUser}
                                        onChange={(e) => setSelectedUser(e.target.value)}
                                        className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    >
                                        <option value="">Tất cả</option>
                                        {users.map((user) => (
                                            <option key={user} value={user}>
                                                {user}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center">
                                    <label className="text-sm font-medium text-gray-700 mr-2">NCC:</label>
                                    <select
                                        value={selectedNCC}
                                        onChange={(e) => setSelectedNCC(e.target.value)}
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
                            </>
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

                        <div className="ml-auto">
                            <button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="fixed flex items-center top-4 right-4 z-[9999] p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                            >
                                {isFullscreen ? (
                                    <div className="hidden">
                                    </div>
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
                                    if (!tableData[selectedRow] || !tableData[selectedRow][19]) return true
                                    const tinhTrang = tableData[selectedRow][19]
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
                {/* Nút thu nhỏ màn hình luôn nổi trên cùng khi fullscreen */}
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
                    sendChatMessage={sendChatMessage}
                    role={userInfo?.role}
                    supplierName={userInfo?.name}
                    user={userInfo}
                />
            </div>
        </>
    )
}
