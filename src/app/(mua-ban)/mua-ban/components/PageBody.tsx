"use client"
import { useRef, useMemo, useEffect, useState, useCallback, memo } from "react"
import { HotTable, HotColumn } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import "../style.css"
import { ref, onValue, set, push, get } from "firebase/database"
import getUserInfo from "@/components/userInfo"
import { database } from "@/app/firebase/firebase"
import type { JSX } from "react/jsx-runtime"
import sheetApiRequest from "@/apiRequests/sheet"
import { ExchangeButton } from '@/components/ui/ExchangeButton';
import { Button, Modal } from "antd"

// register Handsontable's modules
registerAllModules()

// Add these utility functions at the top of the file, after the imports but before the component definitions

// Simple encoding/decoding functions for supplier names
const encodeSupplierName = (name: string): string => {
    // Convert to base64 and then replace characters that might cause URL issues
    return btoa(name).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

declare global {
    interface Window {
        instance: any // Thay 'any' bằng kiểu dữ liệu chính xác nếu biết trước
    }
}
// Add this function to generate the encoded URL
const getEncodedSupplierUrl = (supplierName: string): string => {
    const encoded = encodeSupplierName(supplierName)
    return `/mua-ban/${encoded}` // Use relative path instead of hardcoded localhost
}

// Update the updateCustomerBalanceForCanceledOrder function to work with the correct money structure
// Replace the existing function with this updated version:

// Function to update customer balance when order status changes to canceled
const updateCustomerBalanceForCanceledOrder = async (khMua: string, giaBan: number, status: string, tenNb: string, maDon: string): Promise<void> => {
    // Only proceed if status is one of the cancellation types
    if (status !== "Đơn hủy" && status !== "Ko Index - Hủy") return Promise.resolve()

    console.log(`Processing refund for customer ${khMua}, amount: ${giaBan}, status: ${status}`)
    await sheetApiRequest.getIDKH(khMua, `Đơn ${maDon} đã bị hủy, số tiền ${giaBan} sẽ được hoàn vào ví của bạn`)
    await sheetApiRequest.getIDNCC(tenNb, `Đơn ${maDon} đã bị hủy`)
    // Reference to the customer's balance in Firebase
    const userBalanceRef = ref(database, `money/${khMua}/amount`)

    // Get current balance and update it
    return get(userBalanceRef).then((snapshot) => {
        // Get current balance or default to 0 if not exists
        const currentBalance = snapshot.exists() ? snapshot.val() : 0

        console.log(`Current balance for ${khMua}: ${currentBalance}`)

        // Add the order amount to the customer's balance
        const newBalance = currentBalance + Number(giaBan)

        // Update the balance in Firebase
        return set(userBalanceRef, newBalance)
            .then(() => {
                console.log(`Updated balance for ${khMua}: +${giaBan}, new balance: ${newBalance}`)
            })
            .catch((error) => {
                console.error(`Error updating balance for ${khMua}:`, error)
                throw error
            })
    })
}

// Define types
type DataRow = any
type RawData = DataRow[]
type WeekGroups = Record<string, DataRow[]>
type ColumnHeader = string
type NestedColumnHeader = {
    label: string
    colspan: number
}
type Role = "Admin" | "Khách hàng" | "NCC"
type CellProperties = {
    readOnly?: boolean
    renderer?: (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string | number,
        value: any,
        cellProperties: any,
    ) => HTMLTableCellElement
}

type ChatMessage = {
    text: string
    sender: string
    name?: string
    supplierName?: string
    senderRole: string
    timestamp: number
}

type PageBodyProps = {
    supplierName: string | null
}

// Function to parse Vietnamese date format (DD/MM)
const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr === "") return null

    const parts = dateStr.split("/")
    if (parts.length !== 2) return null

    const day = Number.parseInt(parts[0], 10)
    const month = Number.parseInt(parts[1], 10) - 1 // JavaScript months are 0-indexed

    // Assume current year for simplicity
    const currentYear = new Date().getFullYear()
    return new Date(currentYear, month, day)
}

// Function to get week number from date
const getWeekNumber = (date: Date | null): number | null => {
    if (!date) return null

    // Clone the date to avoid modifying the original
    const d = new Date(date)

    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))

    // Get first day of year
    const yearStart = new Date(d.getFullYear(), 0, 1)

    // Calculate full weeks to nearest Thursday
    const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)

    return weekNumber
}

// Function to format current date as DD/MM
const getCurrentDateFormatted = (): string => {
    const now = new Date()
    const day = now.getDate().toString().padStart(2, "0")
    const month = (now.getMonth() + 1).toString().padStart(2, "0") // +1 because months are 0-indexed
    return `${day}/${month}`
}

// Function to format timestamp to readable date/time
const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")

    return `${day}/${month} ${hours}:${minutes}`
}

// Original column headers
const originalColumnHeaders: ColumnHeader[] = [
    "Mã",
    "Loại",
    "Ngày Bán",
    "TMua",
    "TBán",
    "Site",
    "Ghi Chú",
    "Giá Bán",
    "Giá Mua",
    "Hoa Hồng",
    "Giá Cuối",
    "TT NCC", // Moved here next to Giá Cuối
    "Lợi Nhuận",
    "Bài Viết",
    "Link KQ",
    "Anchor 1",
    "Link 1",
    "Anchor 2",
    "Link 2",
    "Ngày KT",
    "Kết quả",
    "Tên NCC",
    "Link NCC",
    "KH Mua",
    "Tình Trạng",
    "Trao đổi",
]

// Update the nested headers to include the new column in the "TIỀN NÈ" group
// Update the nested headers structure to correctly align columns
// The issue is with the colspan values in the nested headers

// Replace the originalColumnHeaders1 definition with this corrected version:
const originalColumnHeaders1: NestedColumnHeader[] = [
    { label: `Tên: `, colspan: 2 },
    { label: "Thời Gian", colspan: 3 },
    { label: "Thông Tin WEB", colspan: 2 },
    { label: "TIỀN NÈ", colspan: 6 }, // Correctly set to 6 for the 6 money columns
    { label: "INFO Bài", colspan: 6 },
    { label: "Kiểm Tra", colspan: 2 },
    { label: "Người Bán", colspan: 2 },
    { label: "", colspan: 2 }, // Reduced from 3 to 2 since we removed a column
    { label: "Chat", colspan: 1 },
]

// Update the excluded columns for each role
interface ExcludedColumns {
    "Khách hàng": number[]
    NCC: number[]
    Admin: number[]
}

const ChatDialog = memo(
    ({
        chatDialogOpen,
        setChatDialogOpen,
        currentChatOrderId,
        currentChatMessages,
        newChatMessage,
        setNewChatMessage,
        sendChatMessage,
        role,
    }: any) => {
        const [isReported, setIsReported] = useState(false);
        const messagesEndRef: any = useRef(null);

        const scrollToBottom = () => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        };

        useEffect(() => {
            if (chatDialogOpen) {
                scrollToBottom();
            }
        }, [currentChatMessages, chatDialogOpen]);

        const reportChat = useCallback(() => {
            setIsReported((prev) => !prev);
            // Gọi API hoặc lưu trạng thái vào cơ sở dữ liệu tại đây nếu cần
        }, []);

        const handleClose = () => {
            setChatDialogOpen(false);
        };

        return (
            <Modal
                title={
                    <div className="text-lg font-semibold text-gray-800">
                        💬 Trao đổi về đơn hàng <span className="text-blue-600">#{currentChatOrderId}</span>
                    </div>
                }
                open={chatDialogOpen}
                onCancel={handleClose}
                footer={null}
                width={800}
                destroyOnClose
            >
                {/* Báo cáo Admin */}
                < div className="mb-4" >
                    <button
                        onClick={reportChat}
                        className={`inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full shadow-sm transition-colors duration-200 ${isReported
                            ? "bg-red-500 text-white"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                            }`}
                    >
                        {isReported && (
                            <span className="w-2 h-2 rounded-full bg-red-300 animate-pulse"></span>
                        )}
                        {isReported ? "Đã báo cáo Admin" : "Báo cáo Admin"}
                    </button>
                    <p className="mt-1 text-xs text-gray-500">
                        {isReported
                            ? "Admin sẽ xem xét cuộc trao đổi này."
                            : "Báo cáo cuộc trao đổi này cho Admin nếu có vấn đề."}
                    </p>
                </div >

                {/* Khu vực tin nhắn */}
                < div style={{ scrollbarWidth: "none" }} className="min-h-[300px] max-h-[50vh] overflow-y-auto mb-5 pr-1" >
                    {
                        currentChatMessages.length === 0 ? (
                            <p className="text-center text-gray-400 italic">Chưa có tin nhắn nào</p>
                        ) : (
                            <div className="space-y-2">
                                {currentChatMessages.map((msg: any, index: number) => {
                                    const isOwnMessage = msg.senderRole === role;
                                    const isFirstInGroup = index === 0 || currentChatMessages[index - 1].senderRole !== msg.senderRole;

                                    return (
                                        <div
                                            key={index}
                                            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                                        >
                                            <div className={`max-w-[75%] ${isFirstInGroup ? "mt-2" : "mt-1"}`}>
                                                {isFirstInGroup && (
                                                    <div className={`text-xs font-medium mb-1 ${isOwnMessage ? "text-right mr-2" : "text-left ml-2"} text-gray-600`}>
                                                        {msg.senderRole === "NCC" ? msg.supplierName || msg.sender : msg.name || msg.sender}
                                                    </div>
                                                )}
                                                <div
                                                    className={`relative px-3 py-2 rounded-xl shadow-sm
                                                    ${isOwnMessage
                                                            ? "bg-[#E3F2FD] text-gray-800 rounded-tr-none"
                                                            : "bg-gray-100 text-gray-800 rounded-tl-none"
                                                        }`}
                                                >
                                                    <div className="text-sm whitespace-pre-wrap break-words">{msg.text}</div>
                                                    <div className={`text-[11px] text-right mt-1 ${isOwnMessage ? "text-blue-600" : "text-gray-500"}`}>
                                                        {formatTimestamp(msg.timestamp)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        )
                    }
                </div >

                {/* Nhập tin nhắn */}
                < div className="flex items-center gap-2 mt-2 sticky bottom-0 bg-white pt-2 border-t" >
                    <input
                        type="text"
                        value={newChatMessage}
                        onChange={(e) => setNewChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                    />
                    <Button
                        type="primary"
                        onClick={sendChatMessage}
                        disabled={!newChatMessage.trim()}
                        className="flex items-center justify-center w-10 h-10 rounded-full !min-w-0 !p-0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                        </svg>
                    </Button>
                </div >
            </Modal >
        );
    }
);

ChatDialog.displayName = "ChatDialog";
const PageBody = ({ supplierName }: PageBodyProps): JSX.Element => {
    // 10. Fix the isEditing state initialization
    const [isEditing, setIsEditing] = useState(false)
    const [rawData, setRawData] = useState<RawData>([])
    const [localEdits, setLocalEdits] = useState<Map<string, any>>(new Map())
    const user = getUserInfo()
    // Get role from user info
    const role: Role = (user?.role as Role) || "NCC"
    // Use the supplierName prop if provided, otherwise use a default or from user info
    const nameNCC = supplierName || (role === "NCC" ? user?.name : "")
    const nameKH = role === "Khách hàng" ? user?.username : ""
    const hotTableRef = useRef<any>(null)
    const [chatDialogOpen, setChatDialogOpen] = useState(false)
    const [currentChatOrderId, setCurrentChatOrderId] = useState<string | null>(null)
    const [currentChatMessages, setCurrentChatMessages] = useState<ChatMessage[]>([])
    const [newChatMessage, setNewChatMessage] = useState("")
    const [khMuaIB, setKhMuaIB] = useState<string>("")
    const [tenNBIB, setTenNBIB] = useState<string>("")

    // Add a flag to track if data has been loaded
    const dataLoaded = useRef(false)
    // Add a debounce timer ref
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    // Add a ref to track if we're currently saving to Firebase
    const isSavingRef = useRef(false)

    // Update the first header to include the user's name
    const columnHeaders = useMemo(() => {
        const headers = [...originalColumnHeaders1]
        // Use supplier name if provided, otherwise use user name
        const displayName = supplierName || user?.name || ""
        headers[0] = { ...headers[0], label: `Tên: ${displayName}` }
        return headers
    }, [user, supplierName])

    // Memoize the Firebase data processing function to prevent unnecessary recalculations
    const processFirebaseData = useCallback((allData: any): RawData => {
        const ordersArray: any[] = []

        // Check if allData is an array
        if (Array.isArray(allData)) {
            // Process each order in the array
            allData.forEach((order, index) => {
                if (!order || typeof order !== "object") return

                // Add the order to our array
                ordersArray.push({
                    ...order,
                    arrayIndex: index, // Store the array index for later reference
                })
            })
        } else {
            console.error("Expected orders data to be an array, but got:", typeof allData)
        }

        // Convert the ordersArray to the format expected by the table
        return ordersArray.map((item: any) => {
            // Determine which price to use based on Type
            const type = item.Type || "Text" // Default to Text if Type is not specified

            const GiaBan =
                type === "GP"
                    ? item.GiaBanGP || 0
                    : type === "Text"
                        ? item.GiaBanText || 0
                        : type === "TextHome"
                            ? item.GiaBanTextHome || 0
                            : type === "TextHeader"
                                ? item.GiaBanTextHeader || 0
                                : 0

            const GiaMua =
                type === "GP"
                    ? item.GiaMuaGP || 0
                    : type === "Text"
                        ? item.GiaMuaText || 0
                        : type === "TextHome"
                            ? item.GiaMuaTextHome || 0
                            : type === "TextHeader"
                                ? item.GiaMuaTextHeader || 0
                                : 0

            const HoaHong = type === "GP" ? item.HoaHongGP : item.HoaHongText
            const GiaCuoi = Math.round(GiaMua - GiaMua * (Number(HoaHong) / 100))
            const LoiNhuan = Math.round(Number(GiaBan) - GiaCuoi)
            const Index = type === "GP" ? "No" : "Chưa xong"

            // Format chat messages for display if they exist
            let chatDisplay = ""
            if (item.chat && typeof item.chat === "object") {
                chatDisplay = "1"
            } else {
                chatDisplay = "0"
            }

            // Calculate TMua and TBan based on Kết quả
            let tMua = ""
            let tBan = ""

            if (item.Index === "Đã xong" && item.DateKT) {
                // Set TMua to the DateKT when Kết quả is "Đã xong"
                tMua = item.DateKT

                // Calculate TBan as 1 month after TMua
                const [day, month] = tMua.split("/").map(Number)
                const date = new Date()
                date.setMonth(month - 1) // JavaScript months are 0-indexed
                date.setDate(day)
                date.setMonth(date.getMonth() + 1) // Add 1 month

                // Format as DD/MM
                const newDay = date.getDate().toString().padStart(2, "0")
                const newMonth = (date.getMonth() + 1).toString().padStart(2, "0")
                tBan = `${newDay}/${newMonth}`
            }

            // Create row data without displaying the arrayIndex
            const rowData = [
                `${item.KHMua}-${item.id?.toString()}` || `${item.KHMua}-${item.ProductID?.toString()}` || "", // Mã Đơn
                item.Type || "Text", // Loại (default to Text)
                item.Date || "", // Ngày Bán
                tMua, // Time Mua - calculated based on Kết quả
                tBan, // Time Bán - calculated as 1 month after TMua
                item.Site || "", // Site
                item.Note || "", // Ghi Chú
                GiaBan?.toString() || "", // Giá Bán
                GiaMua?.toString() || "", // Giá Mua
                HoaHong?.toString() || "", // Hoa Hồng
                GiaCuoi.toString(), // Giá Cuối
                item.TTNCC?.toString() || "0", // TT NCC - Moved here
                LoiNhuan.toString(), // Lợi Nhuận
                item.BaiViet || "", // Bài Viết
                item.LinkKQ || "", // Link KO
                item.Anchor1 || "", // Anchor 1
                item.Link1 || "", // Link 1
                item.Anchor2 || "", // Anchor 2
                item.Link2 || "", // Link 2
                item.DateKT || "", // Ngày
                item.Index || Index, // Index - Set default to "No" if empty
                item.TenNB || "", // Tên
                item.LinkNB || "", // Link
                item.KHMua || "", // KH Mua
                item.Status || "", // TT
                chatDisplay, // Trao đổi - now just a flag
            ]

            // Store the array index as a hidden property on the row object
            Object.defineProperty(rowData, "_arrayIndex", {
                value: item.arrayIndex,
                enumerable: false,
                configurable: true,
            })

            // Store the order ID for chat reference
            Object.defineProperty(rowData, "_orderId", {
                value: item.id || item.ProductID,
                enumerable: false,
                configurable: true,
            })

            return rowData
        })
    }, [])

    // Fetch data from Firebase with debounce to prevent continuous calls
    useEffect(() => {
        const ordersRef = ref(database, "orders") // Path to the orders array

        // Create a single listener that won't be recreated
        const onDataChange = (snapshot: any) => {
            // Skip updates if we're currently editing or saving
            if (isEditing || isSavingRef.current) return

            if (snapshot.exists()) {
                const allData = snapshot.val()

                // Use debounce to prevent multiple rapid updates
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current)
                }

                debounceTimerRef.current = setTimeout(() => {
                    // Process data only if we need to
                    const formattedData = processFirebaseData(allData)

                    // Filter data based on role or supplierName
                    let filteredData = formattedData // Start with all data

                    if (supplierName) {
                        // If supplierName is provided, filter by that regardless of user role
                        filteredData = formattedData.filter((row) => {
                            // TenNB is at index 21
                            return row[21] === supplierName
                        })
                    } else if (role === "NCC" && user) {
                        // For logged-in NCC users without a specific supplierName
                        filteredData = formattedData.filter((row) => {
                            // TenNB is at index 21
                            return row[21] === nameNCC
                        })
                    } else if (role === "Khách hàng" && user) {
                        // Filter data for Khách hàng role based on KHMua field
                        filteredData = formattedData.filter((row) => {
                            // KHMua is at index 23
                            return row[23] === nameKH
                        })
                    }

                    setRawData((prevData) => {
                        // Only update if data has actually changed
                        if (JSON.stringify(prevData) !== JSON.stringify(filteredData)) {
                            return filteredData
                        }
                        return prevData
                    })

                    dataLoaded.current = true
                }, 100) // Reduced from 300ms to 100ms for faster updates
            } else {
                setRawData([])
                dataLoaded.current = true
            }
        }

        // Set up the Firebase listener only once
        const unsubscribe = onValue(ordersRef, onDataChange)

        // Clean up the listener and any pending debounce when the component unmounts
        return () => {
            unsubscribe()
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
        }
    }, [user, isEditing, processFirebaseData, role, nameNCC, nameKH, supplierName])

    // Load chat messages when currentChatOrderId changes
    useEffect(() => {
        if (!currentChatOrderId) return

        const chatRef = ref(database, `orders/${currentChatOrderId}/chat`)

        const onChatChange = (snapshot: any) => {
            if (snapshot.exists()) {
                const chatData = snapshot.val()
                const messages = Object.values(chatData) as ChatMessage[]
                messages.sort((a, b) => a.timestamp - b.timestamp)
                setCurrentChatMessages(messages)
            } else {
                setCurrentChatMessages([])
            }
        }

        const unsubscribe = onValue(chatRef, onChatChange)

        return () => {
            unsubscribe()
        }
    }, [currentChatOrderId])

    // Modify the organizeDataByWeeks function to handle rows without dates
    const organizeDataByWeeks = useCallback((data: RawData): DataRow[] => {
        if (!data || data.length === 0) return []

        // Create a special group for rows without dates
        const noDateRows: DataRow[] = []

        // Create special groups for not indexed items and items to be removed
        const notIndexedRows: DataRow[] = []
        const removeRows: DataRow[] = []

        // Sort data by date
        const sortedData = [...data].sort((a, b) => {
            const dateA = parseDate(a[2])
            const dateB = parseDate(b[2])

            if (!dateA && !dateB) return 0
            if (!dateA) return 1
            if (!dateB) return -1

            return dateA.getTime() - dateB.getTime()
        })

        // Group data by week and identify items for special sections
        const weekGroups: WeekGroups = {}
        sortedData.forEach((row) => {
            // Check if this is an item to be removed (Status is "Ko Index - Hủy" or "Đơn hủy")
            if (row[24] === "Ko Index - Hủy" || row[24] === "Đơn hủy") {
                removeRows.push(row)
                return
            }

            // Check if this is a not indexed item (Index is empty or "No")
            if (row[20] === "" || row[20] === "No" || row[20] === "Chưa xong") {
                notIndexedRows.push(row)
                return
            }

            const date = parseDate(row[19])
            if (!date) {
                // Add to the no-date group
                noDateRows.push(row)
                return
            }

            const weekNumber = getWeekNumber(date)
            if (!weekNumber) return

            if (!weekGroups[weekNumber]) {
                weekGroups[weekNumber] = []
            }

            weekGroups[weekNumber].push(row)
        })

        // Create final data with week separators and summaries
        const organizedData: DataRow[] = []

        // PART 1: First add the weeks with dates
        Object.keys(weekGroups)
            .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
            .forEach((weekNumber) => {
                // Calculate sums for price columns (7, 8, 9, 10, 11, 12)
                const weekData = weekGroups[weekNumber]
                const sumGiaBan = weekData.reduce((sum, row) => sum + (Number(row[7]) || 0), 0)
                const sumGiaMua = weekData.reduce((sum, row) => sum + (Number(row[8]) || 0), 0)
                const sumHoaHong = weekData.reduce((sum, row) => sum + (Number(row[9]) || 0), 0)
                const sumGiaCuoi = weekData.reduce((sum, row) => sum + (Number(row[10]) || 0), 0)
                // 3. Update the organizeDataByWeeks function to reflect the new column order
                // Find the sumTTNCC calculation in the organizeDataByWeeks function and update it:
                const sumTTNCC = weekData.reduce((sum, row) => sum + (Number(row[11]) || 0), 0) // Updated index for TT NCC
                const sumLoiNhuan = weekData.reduce((sum, row) => sum + (Number(row[12]) || 0), 0)
                // Add week separator with sums
                // Also update the weekRow array in the same function:
                const weekRow: DataRow = [
                    "",
                    "",
                    `Tuần ${weekNumber}`,
                    "",
                    "",
                    "",
                    "Tổng:",
                    sumGiaBan.toString(),
                    sumGiaMua.toString(),
                    sumHoaHong.toString(),
                    sumGiaCuoi.toString(),
                    sumTTNCC.toString(), // Updated position
                    sumLoiNhuan.toString(),
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
                    "",
                ]
                organizedData.push(weekRow)

                // Add week data
                weekGroups[weekNumber].forEach((row) => {
                    organizedData.push(row)
                })
            })

        // Then add the rows without dates if there are any
        if (noDateRows.length > 0) {
            // Add all rows without dates to the notIndexedRows array
            notIndexedRows.push(...noDateRows)
        }

        // PART 2: Add the not indexed items section
        if (notIndexedRows.length > 0) {
            // Calculate sums for the not-indexed group
            const sumGiaBan = notIndexedRows.reduce((sum, row) => sum + (Number(row[7]) || 0), 0)
            const sumGiaMua = notIndexedRows.reduce((sum, row) => sum + (Number(row[8]) || 0), 0)
            const sumHoaHong = notIndexedRows.reduce((sum, row) => sum + (Number(row[9]) || 0), 0)
            const sumGiaCuoi = notIndexedRows.reduce((sum, row) => sum + (Number(row[10]) || 0), 0)
            const sumTTNCC = notIndexedRows.reduce((sum, row) => sum + (Number(row[11]) || 0), 0) // Add sum for TT NCC
            const sumLoiNhuan = notIndexedRows.reduce((sum, row) => sum + (Number(row[12]) || 0), 0)

            // Add not-indexed separator with sums
            const notIndexedRow: DataRow = [
                "",
                "",
                "Chưa Index",
                "",
                "",
                "",
                "Tổng:",
                sumGiaBan.toString(),
                sumGiaMua.toString(),
                sumHoaHong.toString(),
                sumGiaCuoi.toString(),
                sumTTNCC.toString(), // Add TT NCC sum
                sumLoiNhuan.toString(),
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
                "",
            ]
            organizedData.push(notIndexedRow)

            // Add not-indexed data
            notIndexedRows.forEach((row) => {
                organizedData.push(row)
            })
        }

        // PART 3: Add the "Gỡ bài" section for items with Status "Ko Index - Hủy" or "Đơn hủy"
        if (removeRows.length > 0) {
            // Calculate sums for the remove group
            const sumGiaBan = removeRows.reduce((sum, row) => sum + (Number(row[7]) || 0), 0)
            const sumGiaMua = removeRows.reduce((sum, row) => sum + (Number(row[8]) || 0), 0)
            const sumHoaHong = removeRows.reduce((sum, row) => sum + (Number(row[9]) || 0), 0)
            const sumGiaCuoi = removeRows.reduce((sum, row) => sum + (Number(row[10]) || 0), 0)
            const sumTTNCC = removeRows.reduce((sum, row) => sum + (Number(row[11]) || 0), 0) // Add sum for TT NCC
            const sumLoiNhuan = removeRows.reduce((sum, row) => sum + (Number(row[12]) || 0), 0)

            // Add remove separator with sums
            const removeRow: DataRow = [
                "",
                "",
                "Gỡ bài",
                "",
                "",
                "",
                "Tổng:",
                // sumGiaBan.toString(),
                // sumGiaMua.toString(),
                // sumHoaHong.toString(),
                // sumGiaCuoi.toString(),
                // sumTTNCC.toString(), // Add TT NCC sum
                // sumLoiNhuan.toString(),
                0,
                0,
                0,
                0,
                0,
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
            ]
            organizedData.push(removeRow)

            // Add remove data
            removeRows.forEach((row) => {
                organizedData.push(row)
            })
        }

        return organizedData
    }, [])

    // Process data and organize by weeks
    const data: DataRow[] = useMemo(() => {
        const processedData = organizeDataByWeeks(rawData).filter((row) => {
            return row.some((cell: any) => cell !== "" && cell !== undefined && cell !== null)
        })

        // Add an empty row at the end
        const emptyRow = Array(originalColumnHeaders.length).fill("")
        return [...processedData, emptyRow]
    }, [rawData, organizeDataByWeeks])

    // Define which columns to show based on role
    const visibleColumns = useMemo<number[]>(() => {
        // Define column indices to exclude for each role
        const excludedColumns: ExcludedColumns = {
            "Khách hàng": [8, 9, 10, 11, 12, 21, 22, 23], // Hide Giá Mua, Hoa Hồng, Giá Cuối, Lợi nhuận, TT NCC, Người Bán
            NCC: [7, 12, 23], // Hide Giá Bán, Lợi nhuận, and KH Mua (updated index)
            Admin: [], // Show all columns
        }

        // Get the excluded columns for the current role or use NCC columns for supplier view
        const excluded = supplierName ? excludedColumns["NCC"] : excludedColumns[role] || []

        // Create an array of column indices to include
        return Array.from({ length: originalColumnHeaders.length })
            .map((_, i) => i)
            .filter((i) => !excluded.includes(i))
    }, [role, supplierName])

    // Define which columns are editable based on role
    const getEditableColumns = useMemo<number[] | null>(() => {
        if (role === "Admin") {
            // Admin can edit all columns
            return null // null means no restrictions (except for "Tuần" rows)
        } else if (role === "Khách hàng") {
            // Khách hàng can edit Bài Viết, Link 1, Anchor 1, Link 2, Anchor 2, Loại, Link KQ
            return [1, 13, 14, 15, 16, 17, 18, 20]
        } else {
            // NCC can edit Link KQ and Index - also apply this for supplier view
            return [14, 20]
        }
    }, [role, supplierName])

    // Filter the column headers
    const columnHeaders1 = useMemo<ColumnHeader[]>(() => {
        return visibleColumns.map((colIndex) => originalColumnHeaders[colIndex])
    }, [visibleColumns])

    // Adjust the nested headers based on visible columns
    const nestedHeaders = useMemo<NestedColumnHeader[]>(() => {
        // This is more complex as we need to recalculate the colspans
        // For simplicity, let's create a new structure

        // First, determine which column groups are visible
        const visibleGroups: NestedColumnHeader[] = []
        let currentIndex = 0

        for (const group of originalColumnHeaders1) {
            const startCol = currentIndex
            const endCol = currentIndex + group.colspan - 1

            // Check if any columns in this group are visible
            const visibleColsInGroup = visibleColumns.filter((colIndex) => colIndex >= startCol && colIndex <= endCol)

            if (visibleColsInGroup.length > 0) {
                visibleGroups.push({
                    label: group.label,
                    colspan: visibleColsInGroup.length,
                })
            }

            currentIndex += group.colspan
        }

        return visibleGroups
    }, [visibleColumns])

    // Status column renderer
    const statusRenderer = useCallback(
        (
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string | number,
            value: any,
            cellProperties: any,
        ): HTMLTableCellElement => {
            // Just display the status value
            td.innerHTML = value === null ? "" : value

            // Add some styling based on status value
            if (value === "Đã xong") {
                td.style.backgroundColor = "#16A34A"
                td.style.color = "#ECFDF5"
            } else if (value === "Đang xử lý") {
                td.style.backgroundColor = "#3B82F6"
                td.style.color = "#EFF6FF"
            } else if (value === "Đã đăng bài") {
                td.style.backgroundColor = "#8B5CF6" // Purple
                td.style.color = "#F5F3FF"
            } else if (value === "Ko Index - Hủy" || value === "Đơn hủy") {
                td.style.backgroundColor = "#EF4444"
                td.style.color = "#FEF2F2"
            }

            return td
        },
        [],
    )

    // Now we need to modify the linkRenderer function to use our encoding for supplier links
    // Find the linkRenderer function and update it:

    // Link renderer
    const linkRenderer = useCallback(
        (
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string | number,
            value: any,
            cellProperties: any,
        ): HTMLTableCellElement => {
            // Check if this is the TenNB column (Supplier Name) and we're in Admin role
            const originalColIndex = visibleColumns[col]
            const isSupplierNameColumn = originalColIndex === 21 && role === "Admin"

            // Check if the value is a valid URL or if this is a supplier name column
            if ((typeof value === "string" && value.startsWith("http")) || isSupplierNameColumn) {
                // Create a link element
                const link = document.createElement("a")

                if (isSupplierNameColumn && value) {
                    // For supplier name column, create an encoded URL
                    link.href = getEncodedSupplierUrl(value)
                    link.textContent = value // Display the original name
                } else {
                    // For regular URLs
                    link.href = value
                    link.textContent = value
                }

                link.target = "_blank" // Open in a new tab

                // Clear the cell content and append the link
                td.innerHTML = ""
                td.appendChild(link)
            } else {
                // If not a URL, just display the value
                td.innerHTML = value === null ? "" : value
            }

            return td
        },
        [visibleColumns, role],
    )

    // Chat renderer
    const chatRenderer = useCallback(
        (
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string | number,
            value: any,
            cellProperties: any,
        ): HTMLTableCellElement => {
            // Check if there are chat messages
            if (value !== "") {
                // Create a button element
                const button = document.createElement("button")
                button.textContent = "Trao đổi"
                button.className = "bg-green-600 hover:bg-green-700 text-white px-4 py-0.5 rounded"

                // Add a click event listener to open the chat dialog
                button.addEventListener("click", () => {
                    // Get the physical row index
                    const physicalRow = instance.toPhysicalRow(row)

                    // Get the full row data from the data array
                    const fullRowData: any = data[physicalRow]

                    // Get the order ID from the hidden property
                    const orderId = fullRowData._orderId

                    // Set KH and NCC information
                    setKhMuaIB(fullRowData[23]) // KHMua is at index 23
                    setTenNBIB(fullRowData[21]) // TenNB is at index 21

                    // Open the chat dialog
                    setCurrentChatOrderId(orderId)
                    setChatDialogOpen(true)
                })

                // Clear the cell content and append the button
                td.innerHTML = ""
                td.appendChild(button)
            } else {
                // If no chat messages, display an empty string
                td.innerHTML = ""
            }

            return td
        },
        [setCurrentChatOrderId, setChatDialogOpen, data],
    )

    // Update the coloredRowsRenderer to use the chatRenderer for the chat column
    const coloredRowsRenderer = useCallback(
        (
            instance: any,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string | number,
            value: any,
            cellProperties: CellProperties,
        ): HTMLTableCellElement => {
            // Add this line at the beginning of the function:
            const filteredData = data.map((row) => visibleColumns.map((colIndex) => row[colIndex]))

            // Map the visible column index back to the original column index
            const originalColIndex = visibleColumns[col]

            // Apply red background to rows with "Tuần", "Chưa có ngày", or "Chưa Index" in the third column (index 2)
            // We need to check the filtered data now
            const weekColIndex = visibleColumns.indexOf(2)
            const isHeaderRow =
                weekColIndex >= 0 &&
                row < filteredData.length &&
                filteredData[row][weekColIndex] &&
                typeof filteredData[row][weekColIndex] === "string" &&
                (filteredData[row][weekColIndex].includes("Tuần") ||
                    filteredData[row][weekColIndex] === "Chưa có ngày" ||
                    filteredData[row][weekColIndex] === "Chưa Index" ||
                    filteredData[row][weekColIndex] === "Gỡ bài")

            if (isHeaderRow) {
                td.style.backgroundColor = "#FFB7B7"
                td.style.fontWeight = "500"
                td.style.color = "red"

                // Make the summary values bold and slightly larger
                if (originalColIndex >= 7 && originalColIndex <= 12 && value !== "") {
                    // Updated to include column 12 (TT NCC)
                    td.style.fontSize = "12px"
                    td.style.textAlign = "right"
                }

                // Style the "Tổng:" text
                if (originalColIndex === 6 && value === "Tổng:") {
                    td.style.fontSize = "12px"
                    td.style.textAlign = "right"
                    td.style.paddingRight = "10px"
                }

                // Make the row non-editable
                cellProperties.readOnly = true

                // Add tooltip for non-editable header rows
                td.title = "Hàng tổng hợp không thể chỉnh sửa"
            } else {
                // Apply role-based editing permissions
                let isEditable = true

                if (getEditableColumns !== null) {
                    // If specific editable columns are defined for this role or supplier view
                    isEditable = getEditableColumns.includes(originalColIndex)
                    cellProperties.readOnly = !isEditable
                }

                // Apply visual styling based on editability (unless it has special styling)
                if (
                    !isEditable &&
                    value !== "Indexed" &&
                    value !== "No" &&
                    value !== "Gỡ" &&
                    originalColIndex !== 24 &&
                    originalColIndex !== 25
                ) {
                    td.style.backgroundColor = "#EEEEEE" // Darker gray for non-editable cells
                    td.title = "Bạn không được phép sửa ô này"
                } else if (isEditable) {
                    td.style.backgroundColor = "#ffffff" // White for editable cells
                }

                // Find the coloredRowsRenderer function and update the special handling for Index column (around line 1000)
                // Replace the existing Index column handling with this updated code:

                // Special handling for Index column
                if (originalColIndex === 20) {
                    cellProperties.readOnly = false
                    td.style.backgroundColor = "#ffffff"
                    td.title = "Bạn có thể chỉnh sửa cột Index"

                }
            }

            // Apply green background to cells with "Indexed"
            if (value === "Indexed" || value === "Đã xong") {
                td.style.backgroundColor = "#16A34A"
                td.style.color = "#ECFDF5"
            }

            if (value === "No" || value === "Chưa xong") {
                td.style.backgroundColor = "#FFCC4D"
                td.style.color = "#FFF2D1"
            }

            if (value === "Mất - Index") {
                td.style.backgroundColor = "#EF4444"
                td.style.color = "#FEF2F2"
            }

            if (value === "Text") {
                td.style.backgroundColor = "#FFCC4D"
                td.style.color = "#FFF2D1"
            }
            if (value === "GP") {
                td.style.backgroundColor = "#3b82f6"
                td.style.color = "#FFF2D1"
            }
            if (value === "Text Header") {
                td.style.backgroundColor = "#FF9292"
                td.style.color = "#FFF2D1"
            }
            if (value === "Text Home") {
                td.style.backgroundColor = "#16a34a"
                td.style.color = "#FFF2D1"
            }

            // Use status renderer for the Status column
            if (originalColIndex === 24) {
                return statusRenderer(instance, td, row, col, prop, value, cellProperties)
            }

            // Use chat renderer for the chat column
            if (originalColIndex === 25) {
                return chatRenderer(instance, td, row, col, prop, value, cellProperties)
            }

            // Apply default renderer
            if (typeof value === "string" && value.startsWith("http")) {
                return linkRenderer(instance, td, row, col, prop, value, cellProperties)
            } else {
                td.innerHTML = value === null ? "" : value
            }

            return td
        },
        [visibleColumns, data, getEditableColumns, role, linkRenderer, chatRenderer, statusRenderer, supplierName],
    )

    // Create HotColumn components dynamically based on visible columns
    const hotColumns = useMemo(() => {
        return visibleColumns.map((originalColIndex, index) => {
            // Determine if this column should be numeric
            const isNumeric = [7, 8, 9, 10, 11, 12].includes(originalColIndex)

            // Add dropdown for Index column
            if (originalColIndex === 20) {
                return <HotColumn key={index} data={index} type="dropdown" source={["Indexed", "No", "Mất - Index", "Đã xong", "Chưa xong"]} />
            }

            // Add dropdown for Loại column
            if (originalColIndex === 1) {
                return (
                    <HotColumn key={index} data={index} type="dropdown" source={["GP", "Text", "Text Header", "Text Home"]} />
                )
            }

            // Add dropdown for Tình Trạng column
            if (originalColIndex === 24) {
                return (
                    <HotColumn
                        key={index}
                        data={index}
                        type="dropdown"
                        source={["Đang xử lý", "Đã đăng bài", "Đã xong", "Ko Index - Hủy", "Đơn hủy"]}
                    />
                )
            }

            return <HotColumn key={index} data={index} type={isNumeric ? "numeric" : undefined} />
        })
    }, [visibleColumns])

    // Memoize the afterChange handler to prevent recreating it on every render
    // Modify the handleAfterChange function to batch updates by row
    const handleAfterChange = useCallback(
        (changes: any, source: string) => {
            // Process changes from edit, autofill (fill handle), and paste operations
            if ((source !== "edit" && source !== "autofill" && source !== "CopyPaste.paste") || !changes) return

            // Set editing flag to prevent Firebase listener from overriding our changes
            setIsEditing(true)

            // Mark that we're saving to Firebase
            isSavingRef.current = true

            // Get the current data
            const instance = hotTableRef.current
            if (!instance) {
                setIsEditing(false)
                isSavingRef.current = false
                return
            }

            // Group changes by row index to batch updates
            const changesByArrayIndex = new Map<number, { changes: any[]; physicalRow: number }>()

            // First, group all changes by their array index
            for (const [row, prop, oldValue, newValue] of changes) {
                try {
                    // Skip if the row is a header row
                    const weekColIndex = visibleColumns.indexOf(2)
                    const rowData = instance.getSourceDataAtRow(row)

                    if (
                        weekColIndex >= 0 &&
                        rowData &&
                        rowData[weekColIndex] &&
                        typeof rowData[weekColIndex] === "string" &&
                        (rowData[weekColIndex].includes("Tuần") ||
                            rowData[weekColIndex].includes("Chưa có ngày") ||
                            rowData[weekColIndex].includes("Chưa Index") ||
                            rowData[weekColIndex].includes("Gỡ bài"))
                    ) {
                        continue
                    }

                    // Get the physical row index
                    const physicalRow = instance.toPhysicalRow(row)

                    // Get the full row data from the data array
                    const fullRowData: any = data[physicalRow]

                    // Get the array index from the hidden property
                    const arrayIndex: any = fullRowData._arrayIndex

                    if (arrayIndex === "" || isNaN(Number(arrayIndex))) {
                        console.log("No array index found, cannot update", arrayIndex)
                        continue
                    }

                    // Add this change to the group for this array index
                    if (!changesByArrayIndex.has(Number(arrayIndex))) {
                        changesByArrayIndex.set(Number(arrayIndex), {
                            changes: [],
                            physicalRow,
                        })
                    }

                    changesByArrayIndex.get(Number(arrayIndex))?.changes.push([row, prop, oldValue, newValue])
                } catch (error) {
                    console.error("Error grouping changes:", error)
                }
            }

            // Now process each group of changes (by row)
            const updatePromises = Array.from(changesByArrayIndex.entries()).map(
                ([arrayIndex, { changes: rowChanges, physicalRow }]) => {
                    try {
                        // Get the row data
                        const rowData = instance.getSourceDataAtRow(rowChanges[0][0])

                        // Get the TenNB (Supplier Name)
                        const tenNBIndex = visibleColumns.indexOf(21)
                        const tenNB = tenNBIndex >= 0 ? rowData[tenNBIndex] : null

                        // Check permissions based on role - only need to check once per row
                        let canEdit = false
                        if (role === "Admin") {
                            canEdit = true
                        } else if (role === "Khách hàng") {
                            // For Khách hàng, we check if the KHMua field matches nameKH
                            const khMua = data[physicalRow][23]
                            canEdit = khMua === nameKH
                        } else if (role === "NCC") {
                            canEdit = tenNB === nameNCC
                        } else if (supplierName) {
                            canEdit = tenNB === supplierName
                        }

                        if (!canEdit) {
                            console.log("Permission denied: Cannot edit this data")
                            // Revert all changes for this row
                            rowChanges.forEach(([row, prop, oldValue]) => {
                                instance.setDataAtCell(row, Number(prop), oldValue, "auto")
                            })
                            return Promise.resolve()
                        }

                        // Prepare updates for this row
                        const updates: Record<string, any> = {}
                        const additionalUpdates: Record<string, any> = {}
                        const needsDateUpdate = false
                        const needsDateKTUpdate = false

                        // Track if status is changing to a canceled state
                        let isChangingToCanceledStatus = false
                        let newStatus = ""
                        let khMua = ""
                        let giaBan = 0
                        let tenNb = ""
                        let maDon = ""

                        // Process each change for this row
                        for (const [row, prop, oldValue, newValue] of rowChanges) {
                            // Get the original column index
                            const colIndex = Number.parseInt(prop.toString(), 10)
                            const originalColIndex = visibleColumns[colIndex]

                            // Check specific permissions for this column
                            let canEditColumn = true
                            if (role === "Khách hàng") {
                                if (originalColIndex === 20) {
                                    canEditColumn = oldValue === "No" && newValue === "Indexed"
                                } else {
                                    canEditColumn = [1, 13, 15, 16, 17, 18].includes(originalColIndex)
                                }
                            } else if (role === "NCC") {
                                // NCC can edit Index and LinkKQ without restrictions
                                canEditColumn = originalColIndex === 20 || originalColIndex === 14
                            } else if (supplierName) {
                                if (originalColIndex === 20) {
                                    canEditColumn = oldValue === "No" && newValue === "Indexed"
                                } else {
                                    canEditColumn = originalColIndex === 14
                                }
                            }

                            if (!canEditColumn) {
                                // Revert this specific change
                                instance.setDataAtCell(row, colIndex, oldValue, "auto")
                                continue
                            }

                            // Map the column index to the Firebase field name
                            const fieldMap: Record<number, string> = {
                                0: "id",
                                1: "Type",
                                2: "Date",
                                3: "TimeMua",
                                4: "TimeBan",
                                5: "Site",
                                6: "Note",
                                7: "GiaBanGP",
                                8: "GiaMuaGP",
                                9: "HoaHongGP",
                                10: "GiaCuoiGP",
                                11: "TTNCC",
                                12: "LoiNhuanGP",
                                13: "BaiViet",
                                14: "LinkKQ",
                                15: "Anchor1",
                                16: "Link1",
                                17: "Anchor2",
                                18: "Link2",
                                19: "DateKT",
                                20: "Index",
                                21: "TenNB",
                                22: "LinkNB",
                                23: "KHMua",
                                24: "Status",
                                25: "chat",
                            }

                            // Get the field name
                            const fieldName = fieldMap[originalColIndex]
                            if (!fieldName) continue

                            // Special handling for price fields based on Type
                            let updateField = fieldName
                            if (originalColIndex >= 7 && originalColIndex <= 9) {
                                // Get the Type value
                                const typeIndex = visibleColumns.indexOf(1)
                                const type = rowData[typeIndex]

                                if (type === "GP") {
                                    // Keep the default field names for GP
                                } else if (type === "Text") {
                                    updateField = fieldName.replace("GP", "Text")
                                } else if (type === "TextHome") {
                                    updateField = fieldName.replace("GP", "TextHome")
                                } else if (type === "TextHeader") {
                                    updateField = fieldName.replace("GP", "TextHeader")
                                }
                            }

                            // Add to updates
                            updates[updateField] = newValue

                            // Check if status is changing to a canceled state
                            if (originalColIndex === 24 && (newValue === "Ko Index - Hủy" || newValue === "Đơn hủy")) {
                                isChangingToCanceledStatus = true
                                newStatus = newValue

                                // Get KHMua and GiaBan for refund
                                khMua = data[physicalRow][23]
                                tenNb = data[physicalRow][21]
                                maDon = data[physicalRow][0]
                                giaBan = Number(data[physicalRow][7]) || 0
                            }

                            // Update Status when Link KQ is updated
                            if (originalColIndex === 14 && newValue && newValue !== oldValue) {
                                // When Link KQ is updated, set Status to "Đã đăng bài"
                                updates["Status"] = "Đã đăng bài"

                                // Update the Status cell in the table
                                const statusColIndex = visibleColumns.indexOf(24)
                                if (statusColIndex >= 0) {
                                    instance.setDataAtCell(row, statusColIndex, "Đã đăng bài", "auto")
                                }

                                // Update Ngày KT with current date if it's empty
                                const dateKTColIndex = visibleColumns.indexOf(19)
                                if (dateKTColIndex >= 0) {
                                    const currentDateKT = instance.getDataAtCell(row, dateKTColIndex)
                                    if (!currentDateKT || currentDateKT === "") {
                                        const today = getCurrentDateFormatted()
                                        instance.setDataAtCell(row, dateKTColIndex, today, "auto")

                                        // Add to updates
                                        updates["DateKT"] = today
                                    }
                                }
                            }

                            // Update Status when Index is changed
                            if (originalColIndex === 20 && newValue !== oldValue) {
                                if (newValue === "Indexed" || newValue === "Đã xong") {
                                    // When Index is set to "Indexed" or "Xong", set Status to "Đã xong"
                                    updates["Status"] = "Đã xong"

                                    // Update the Status cell in the table
                                    const statusColIndex = visibleColumns.indexOf(24)
                                    if (statusColIndex >= 0) {
                                        instance.setDataAtCell(row, statusColIndex, "Đã xong", "auto")
                                    }

                                    // If the Index is set to "Indexed", send notification to customer
                                    if (newValue === "Indexed") {
                                        // Get the order ID and customer ID
                                        const orderId = data[physicalRow][0] // Mã đơn is at index 0
                                        const khMua = data[physicalRow][23] // KHMua is at index 23
                                        if (khMua) {
                                            try {
                                                // Call the API to notify the customer
                                                sheetApiRequest
                                                    .getIDKH(khMua, `Đơn ${orderId} đã được index, kiểm tra tại https://ylink.shop/mua-ban`)
                                                    .then(() => {
                                                        console.log(`Successfully notified customer ${khMua} that order ${orderId} is indexed`)
                                                    })
                                                    .catch((error) => {
                                                        console.error(`Error notifying customer ${khMua}:`, error)
                                                    })
                                            } catch (error) {
                                                console.error("Error in customer notification:", error)
                                            }
                                        }
                                    }
                                } else if (newValue === "Mất - Index") {
                                    // Get the order ID and customer ID
                                    const orderId = data[physicalRow][0] // Mã đơn is at index 0
                                    const khMua = data[physicalRow][23] // KHMua is at index 23
                                    if (khMua) {
                                        try {
                                            // Call the API to notify the customer about lost index
                                            sheetApiRequest
                                                .getIDKH(khMua, `Đơn ${orderId} đã bị mất index, vui lòng liên hệ admin để được hỗ trợ`)
                                                .then(() => {
                                                    console.log(`Successfully notified customer ${khMua} that order ${orderId} lost index`)
                                                })
                                                .catch((error) => {
                                                    console.error(`Error notifying customer ${khMua}:`, error)
                                                })
                                        } catch (error) {
                                            console.error("Error in customer notification:", error)
                                        }
                                    }
                                }

                                // Always update Ngày KT with current date when Index is changed
                                const today = getCurrentDateFormatted()
                                updates["DateKT"] = today

                                // Update the DateKT cell in the table
                                const dateKTColIndex = visibleColumns.indexOf(19)
                                if (dateKTColIndex >= 0) {
                                    instance.setDataAtCell(row, dateKTColIndex, today, "auto")
                                }
                            }

                            // Special handling for BaiViet column - log TenNB when BaiViet is updated
                            if (originalColIndex === 13 && newValue !== oldValue) {
                                // Get the TenNB value
                                const tenNBIndex = visibleColumns.indexOf(21)
                                const tenNB = tenNBIndex >= 0 ? rowData[tenNBIndex] : null

                                if (tenNB) {
                                    console.log(`TenNB: ${tenNB} updated BaiViet to: ${newValue}`)
                                }

                                // Auto-fill the Ngày Bán (Date) column with current date if it's empty
                                const dateColIndex = visibleColumns.indexOf(2)
                                if (dateColIndex >= 0) {
                                    const currentDate = instance.getDataAtCell(row, dateColIndex)
                                    if (!currentDate || currentDate === "") {
                                        const today = getCurrentDateFormatted()
                                        instance.setDataAtCell(row, dateColIndex, today, "auto")

                                        // Add to updates
                                        updates["Date"] = today
                                    }
                                }
                            }

                            // Add automatic date filling for other specified columns
                            if ([15, 16, 17, 18].includes(originalColIndex) && newValue !== oldValue) {
                                // Auto-fill the Ngày Bán (Date) column with current date if it's empty
                                const dateColIndex = visibleColumns.indexOf(2)
                                if (dateColIndex >= 0) {
                                    const currentDate = instance.getDataAtCell(row, dateColIndex)
                                    if (!currentDate || currentDate === "") {
                                        const today = getCurrentDateFormatted()
                                        instance.setDataAtCell(row, dateColIndex, today, "auto")

                                        // Add to updates
                                        updates["Date"] = today
                                    }
                                }
                            }

                            // Add automatic status change for GP type orders after 21 days
                            const typeColIndex = visibleColumns.indexOf(1)
                            const dateColIndex = visibleColumns.indexOf(2)
                            const indexColIndex = visibleColumns.indexOf(20)
                            const statusColIndex = visibleColumns.indexOf(24)

                            if (typeColIndex >= 0 && dateColIndex >= 0 && indexColIndex >= 0 && statusColIndex >= 0) {
                                const type = rowData[typeColIndex]
                                const date = rowData[dateColIndex]
                                const index = rowData[indexColIndex]

                                if (type === "GP" && date && index !== "Indexed") {
                                    const [day, month] = date.split("/").map(Number)
                                    const saleDate = new Date()
                                    saleDate.setMonth(month - 1) // JavaScript months are 0-indexed
                                    saleDate.setDate(day)

                                    const today = new Date()
                                    const daysSinceSale = Math.floor((today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24))

                                    if (daysSinceSale > 21) {
                                        // Update status to "Ko Index - Hủy"
                                        updates["Status"] = "Ko Index - Hủy"
                                        isChangingToCanceledStatus = true
                                        newStatus = "Ko Index - Hủy"

                                        // Get KHMua and GiaBan for refund
                                        khMua = data[physicalRow][23]
                                        giaBan = Number(data[physicalRow][7]) || 0

                                        // Update the Status cell in the table
                                        instance.setDataAtCell(row, statusColIndex, "Ko Index - Hủy", "auto")
                                    }
                                }
                            }

                            // Let's add a more reliable approach that works for all roles
                            // Check if the field being updated is "BaiViet" regardless of column position
                            if ((updateField === "BaiViet" || updateField === "Link1") && newValue !== oldValue) {
                                // Get the TenNB value - we need to get it from the full data since it might be hidden
                                const tenNB = data[physicalRow][21] // TenNB is at index 21 in the original data

                                // Check if the Date field (Ngày bán) has data
                                const hasDateData = data[physicalRow][2] && data[physicalRow][2] !== ""
                                const maDon = data[physicalRow][0]
                                if (tenNB) {
                                    try {
                                        // Only call the API if the Date field is empty
                                        if (!hasDateData) {
                                            // Call the API but don't wait for it to complete
                                            sheetApiRequest
                                                .getIDNCC(tenNB || "NoNCC", `Đơn ${maDon} đang cần xử lý tại https://ylink.shop/mua-ban/${tenNB}`)
                                                .then(() => {
                                                    console.log(`Successfully notified NCC: ${tenNB}`)
                                                })
                                                .catch((error) => {
                                                    // Log the error but don't block the UI
                                                    console.error(`Error notifying NCC: ${tenNB}`, error)
                                                })
                                        } else {
                                            console.log(`Skipped API call for NCC: ${tenNB} because Date field already has data`)
                                        }

                                        // Log the update locally
                                        console.log(`TenNB: ${tenNB} updated BaiViet to: ${newValue}`)
                                    } catch (error) {
                                        // Catch any synchronous errors
                                        console.error("Error in BaiViet update notification:", error)
                                        // Continue with the update regardless of error
                                    }
                                }
                            }

                            // Special handling for LinkKQ column - call API when LinkKQ is updated
                            if (updateField === "LinkKQ" && newValue !== oldValue) {
                                // Get the KH Mua value - we need to get it from the full data since it might be hidden
                                const tenKH = data[physicalRow][23] // KHMua is at index 23 in the original data
                                const orderId = data[physicalRow][0]
                                if (tenKH) {
                                    try {
                                        // Call the API but don't wait for it to complete
                                        sheetApiRequest
                                            .getIDKH(tenKH, `Đơn ${orderId} đã được hoàn thành, kiểm tra tại https://ylink.shop/mua-ban`)
                                            .then(() => {
                                                console.log(`Successfully notified KH: ${tenKH}`)
                                            })
                                            .catch((error) => {
                                                // Log the error but don't block the UI
                                                console.error(`Error notifying KH: ${tenKH}`, error)
                                            })

                                        // Log the update locally
                                        console.log(`KH: ${tenKH} updated LinkKQ to: ${newValue}`)
                                    } catch (error) {
                                        // Catch any synchronous errors
                                        console.error("Error in LinkKQ update notification:", error)
                                        // Continue with the update regardless of error
                                    }
                                }
                            }

                            // Update local state immediately to reflect the change
                            setLocalEdits((prev) => {
                                const newMap = new Map(prev)
                                const key = `${arrayIndex}-${updateField}`
                                newMap.set(key, newValue)
                                return newMap
                            })
                        }

                        // Add automatic status updates based on date conditions
                        // This should be added after processing all changes, before saving to Firebase
                        // Add this right before the "// Merge all updates" line

                        // Check date conditions for automatic status updates
                        const dateColIndex = visibleColumns.indexOf(2) // Ngày Bán
                        const baiVietColIndex = visibleColumns.indexOf(13) // Bài Viết
                        const linkKQColIndex = visibleColumns.indexOf(14) // Link KQ
                        const statusColIndex = visibleColumns.indexOf(24) // Tình Trạng

                        if (dateColIndex >= 0 && statusColIndex >= 0) {
                            const saleDate = rowData[dateColIndex]
                            const baiViet = baiVietColIndex >= 0 ? rowData[baiVietColIndex] : null
                            const linkKQ = linkKQColIndex >= 0 ? rowData[linkKQColIndex] : null
                            const currentStatus = rowData[statusColIndex]

                            // Parse the sale date
                            const parsedSaleDate = parseDate(saleDate)

                            if (parsedSaleDate) {
                                // Check if more than 21 days have passed since sale date
                                const today = new Date()
                                const daysSinceSale = Math.floor((today.getTime() - parsedSaleDate.getTime()) / (1000 * 60 * 60 * 24))

                                if (daysSinceSale > 21) {
                                    // Update status to "Ko Index - Hủy"
                                    updates["Status"] = "Ko Index - Hủy"
                                    isChangingToCanceledStatus = true
                                    newStatus = "Ko Index - Hủy"

                                    // Get KHMua and GiaBan for refund
                                    khMua = data[physicalRow][23]
                                    giaBan = Number(data[physicalRow][7]) || 0

                                    // Update the Status cell in the table
                                    if (statusColIndex >= 0) {
                                        instance.setDataAtCell(rowChanges[0][0], statusColIndex, "Ko Index - Hủy", "auto")
                                    }
                                }
                            }

                            // Check if Bài Viết has data but Link KQ doesn't after 2 days
                            if (baiViet && (!linkKQ || linkKQ === "")) {
                                // Get the last modified date for Bài Viết
                                // Since we don't store modification dates, we'll use the current implementation's approach
                                // and check if the current date is at least 2 days after the sale date

                                if (parsedSaleDate) {
                                    const today = new Date()
                                    const daysSinceSale = Math.floor((today.getTime() - parsedSaleDate.getTime()) / (1000 * 60 * 60 * 24))

                                    if (daysSinceSale >= 2) {
                                        // Update status to "Đơn hủy"
                                        updates["Status"] = "Đơn hủy"
                                        isChangingToCanceledStatus = true
                                        newStatus = "Đơn hủy"

                                        // Get KHMua and GiaBan for refund
                                        khMua = data[physicalRow][23]
                                        giaBan = Number(data[physicalRow][7]) || 0

                                        // Update the Status cell in the table
                                        if (statusColIndex >= 0) {
                                            instance.setDataAtCell(rowChanges[0][0], statusColIndex, "Đơn hủy", "auto")
                                        }
                                    }
                                }
                            }
                        }

                        // Merge all updates
                        const allUpdates = { ...updates, ...additionalUpdates }

                        // If no valid updates, skip
                        if (Object.keys(allUpdates).length === 0) {
                            return Promise.resolve()
                        }

                        // Get a reference to the orders array
                        const ordersRef = ref(database, "orders")

                        // Update the Firebase data
                        return new Promise<void>((resolve, reject) => {
                            onValue(
                                ordersRef,
                                (snapshot) => {
                                    if (snapshot.exists()) {
                                        const orders = snapshot.val()

                                        // Update the item at the specified index
                                        if (Array.isArray(orders) && orders[arrayIndex]) {
                                            // Create a new orders array with the updated item
                                            const newOrders = [...orders]
                                            newOrders[arrayIndex] = {
                                                ...newOrders[arrayIndex],
                                                ...allUpdates,
                                            }

                                            // Update the orders array in Firebase
                                            set(ordersRef, newOrders)
                                                .then(() => {
                                                    console.log(
                                                        `Updated row at index ${arrayIndex} with ${Object.keys(allUpdates).length} fields`,
                                                    )

                                                    // If status changed to a canceled state, update customer balance
                                                    if (isChangingToCanceledStatus && khMua && giaBan > 0) {
                                                        updateCustomerBalanceForCanceledOrder(khMua, giaBan, newStatus, tenNb, maDon)
                                                            .then(() => {
                                                                console.log(`Successfully updated balance for ${khMua} with amount ${giaBan}`)
                                                            })
                                                            .catch((error) => {
                                                                console.error(`Error updating balance for ${khMua}:`, error)
                                                            })
                                                    }

                                                    resolve()
                                                })
                                                .catch((error) => {
                                                    console.error("Error updating data:", error)
                                                    // Revert all changes for this row
                                                    rowChanges.forEach(([row, prop, oldValue]) => {
                                                        instance.setDataAtCell(row, Number(prop), oldValue, "auto")
                                                    })
                                                    reject(error)
                                                })
                                        } else {
                                            console.error("Orders is not an array or index is out of bounds:", orders, arrayIndex)
                                            // Revert all changes for this row
                                            rowChanges.forEach(([row, prop, oldValue]) => {
                                                instance.setDataAtCell(row, Number(prop), oldValue, "auto")
                                            })
                                            reject(new Error("Orders data is not in the expected format"))
                                        }
                                    } else {
                                        console.error("No orders data found")
                                        // Revert all changes for this row
                                        rowChanges.forEach(([row, prop, oldValue]) => {
                                            instance.setDataAtCell(row, Number(prop), oldValue, "auto")
                                        })
                                        reject(new Error("No orders data found"))
                                    }
                                },
                                { onlyOnce: true },
                            ) // Only get the data once
                        })
                    } catch (error) {
                        console.error("Error in afterChange handler:", error)
                        return Promise.reject(error)
                    }
                },
            )

            // Wait for all updates to complete
            Promise.all(updatePromises)
                .then(() => {
                    // Reset editing flag after all updates are complete
                    setTimeout(() => {
                        setIsEditing(false)
                        isSavingRef.current = false
                    }, 200) // Reduced from 500ms to 200ms
                })
                .catch((error) => {
                    console.error("Error updating data:", error)
                    setIsEditing(false)
                    isSavingRef.current = false
                })
        },
        [role, visibleColumns, data, nameNCC, nameKH, supplierName],
    )

    // Memoize the beforeChange handler
    const handleBeforeChange: any = useCallback(
        (changes: [number, string | number, any, any][] | null, source: string) => {
            // If no changes, return
            if (!changes) return changes

            // Filter out changes based on role and column permissions
            return changes.filter(([row, prop, oldValue, newValue]) => {
                try {
                    const instance = hotTableRef.current
                    if (!instance) return true

                    const rowData = instance.getSourceDataAtRow(row)
                    if (!rowData) return false

                    // Check if this is a "Tuần", "Chưa có ngày", or "Chưa Index", or "Gỡ bài" row - these are always non-editable
                    const weekColIndex = visibleColumns.indexOf(2)
                    if (
                        weekColIndex >= 0 &&
                        rowData[weekColIndex] &&
                        typeof rowData[weekColIndex] === "string" &&
                        rowData &&
                        typeof rowData[weekColIndex] === "string" &&
                        (rowData[weekColIndex].includes("Tuần") ||
                            rowData[weekColIndex] === "Chưa có ngày" ||
                            rowData[weekColIndex] === "Chưa Index" ||
                            rowData[weekColIndex] === "Gỡ bài")
                    )
                        return false // Don't allow edits to these special rows

                    // If Admin, allow all edits (except for special rows)
                    if (role === "Admin") {
                        return true
                    }

                    // Get the column index\
                    const colIndex = Number.parseInt(prop.toString(), 10)

                    const originalColIndex = visibleColumns[colIndex]

                    // Get the physical row index
                    const physicalRow = instance.toPhysicalRow(row)

                    // For Khách hàng, check if the KHMua field matches nameKH
                    if (role === "Khách hàng") {
                        // Since KHMua might be filtered out, we need to get it from the original data
                        const khMua = data[physicalRow][23]

                        // Special handling for Index column - only allow changing from No to Indexed
                        if (originalColIndex === 20) {
                            return khMua === nameKH && oldValue === "No" && newValue === "Indexed"
                        }

                        // Allow editing Link KQ column
                        if (originalColIndex === 14) {
                            return khMua === nameKH
                        }

                        // Only allow editing if the KHMua matches nameKH
                        // AND the column is editable for Khách hàng
                        return khMua === nameKH && [1, 13, 15, 16, 17, 18].includes(originalColIndex)
                    }

                    // For NCC, check if the TenNB matches their username
                    if (role === "NCC") {
                        const tenNBIndex = visibleColumns.indexOf(21)
                        const tenNB = tenNBIndex >= 0 ? rowData[tenNBIndex] : null

                        // For Index column, check if the order type is not GP when trying to set "Xong"
                        if (originalColIndex === 20) {
                            if (newValue === "Xong") {
                                // Get the Type value
                                const typeIndex = visibleColumns.indexOf(1)
                                const type = rowData[typeIndex]

                                // Only allow "Xong" option when Type is not GP
                                return tenNB === nameNCC && type !== "GP"
                            }
                            return tenNB === nameNCC // Allow other Index changes
                        } else if (originalColIndex === 14) {
                            return tenNB === nameNCC // Allow Link KQ edits
                        } else {
                            return false // Don't allow edits to other columns
                        }
                    } else if (supplierName) {
                        const tenNBIndex = visibleColumns.indexOf(21)
                        const tenNB = tenNBIndex >= 0 ? rowData[tenNBIndex] : null

                        // Special handling for Index column
                        if (originalColIndex === 20) {
                            if (newValue === "Indexed") {
                                return tenNB === supplierName && oldValue === "No"
                            } else if (newValue === "Xong") {
                                // Get the Type value
                                const typeIndex = visibleColumns.indexOf(1)
                                const type = rowData[typeIndex]

                                // Only allow "Xong" option when Type is not GP
                                return tenNB === supplierName && type !== "GP"
                            }
                            return false
                        } else if (originalColIndex === 14) {
                            return tenNB === supplierName // Allow Link KQ edits
                        } else {
                            return false
                        }
                    }

                    // Default: don't allow edits
                    return false
                } catch (error) { }
            })
        },
        [visibleColumns, role, data, nameNCC, nameKH, supplierName],
    )

    // Function to send a new chat message
    const sendChatMessage = useCallback(async () => {
        if (!currentChatOrderId || !newChatMessage.trim()) return

        const chatRef = ref(database, `orders/${currentChatOrderId}/chat`)
        const newMessageRef = push(chatRef)

        // Create the message object with the appropriate name fields
        const message: ChatMessage = {
            text: newChatMessage.trim(),
            sender: user?.displayName || user?.email || "Unknown User",
            senderRole: role,
            timestamp: Date.now(),
        }

        // Add the appropriate name field based on role
        if (role === "NCC") {
            message.supplierName = supplierName || user?.name || user?.displayName || ""
            // Use khMuaIB instead of finding in data
            if (khMuaIB) {
                try {
                    sheetApiRequest.getIDKH(khMuaIB, `NCC của đơn KH-${currentChatOrderId} đã gửi tin nhắn: ${newChatMessage.trim()}`)
                    console.log(`Successfully notified customer ${khMuaIB} about new message`)
                } catch (error) {
                    console.error(`Error notifying customer ${khMuaIB}:`, error)
                }
            }
        } else if (role === "Khách hàng") {
            message.name = user?.username || user?.name || user?.displayName || ""
            // Use tenNBIB instead of finding in data
            if (tenNBIB) {
                try {
                    sheetApiRequest.getIDNCC(tenNBIB, `Khách hàng của đơn KH-${currentChatOrderId} đã gửi tin nhắn: ${newChatMessage.trim()}`)
                    console.log(`Successfully notified supplier ${tenNBIB} about new message`)
                } catch (error) {
                    console.error(`Error notifying supplier ${tenNBIB}:`, error)
                }
            }
        }

        try {
            await set(newMessageRef, message)
            setNewChatMessage("")
            return true
        } catch (error) {
            console.error("Error sending message:", error)
            return false
        }
    }, [currentChatOrderId, newChatMessage, user, role, supplierName, khMuaIB, tenNBIB])

    return (
        <>
            <HotTable
                themeName="ht-theme-main"
                data={data.map((row) => visibleColumns.map((colIndex) => row[colIndex]))}
                nestedHeaders={[nestedHeaders, columnHeaders1]}
                // rowHeaders={true}
                contextMenu={{
                    items: {
                        remove_row: {
                            name: "Xóa dòng",
                            disabled: function () {
                                // Get selected row
                                const selected = this.getSelected()
                                if (!selected) return true

                                const row = selected[0][0]
                                const rowData: any = this.getSourceDataAtRow(row)

                                // Don't allow removing header rows
                                if (
                                    rowData &&
                                    rowData[2] &&
                                    typeof rowData[2] === "string" &&
                                    (rowData[2].includes("Tuần") ||
                                        rowData[2] === "Chưa có ngày" ||
                                        rowData[2] === "Chưa Index" ||
                                        rowData[2] === "Gỡ bài")
                                ) {
                                    return true
                                }

                                // Only Admin and Khách hàng can remove rows
                                return role !== "Admin" && role !== "Khách hàng"
                            },
                        },
                    },
                }}
                colHeaders={true}
                filters={true}
                width="auto"
                autoColumnSize={true}
                manualColumnResize={true}
                height="100vh" /* Fixed height with viewport height */
                stretchH="all" /* Giãn đều cột */
                manualRowMove={true}
                manualColumnMove={true}
                manualRowResize={true}
                className="custom-table"
                hiddenColumns={{
                    indicators: true,
                }}
                cells={(row: number, col: number) => {
                    const cellProperties: CellProperties = {}
                    cellProperties.renderer = coloredRowsRenderer
                    return cellProperties
                }}
                ref={(hotTableComponent: any) => {
                    if (hotTableComponent) {
                        hotTableRef.current = hotTableComponent.hotInstance
                        window.instance = hotTableComponent.hotInstance
                    }
                }}
                afterPaste={(data: string[][], coords: any[]) => {
                    // Let Handsontable handle the paste operation normally first
                    // Then trigger our custom change handler to ensure changes are saved to Firebase
                    setTimeout(() => {
                        if (hotTableRef.current) {
                            const changes = []

                            // Process each pasted cell
                            for (let i = 0; i < coords.length; i++) {
                                for (let j = 0; j < coords[i].startRow.length; j++) {
                                    const row = coords[i].startRow[j]
                                    const startCol = coords[i].startCol[j]

                                    // For each row and column in the pasted range
                                    for (let r = 0; r < data.length; r++) {
                                        for (let c = 0; c < data[r].length; c++) {
                                            const targetRow = row + r
                                            const targetCol = startCol + c

                                            // Skip if we're out of bounds
                                            if (
                                                targetRow >= hotTableRef.current.countRows() ||
                                                targetCol >= hotTableRef.current.countCols()
                                            ) {
                                                continue
                                            }

                                            // Get the old value
                                            const oldValue = hotTableRef.current.getDataAtCell(targetRow, targetCol)
                                            const newValue = data[r][c]

                                            // Add to changes array
                                            changes.push([targetRow, targetCol, oldValue, newValue])
                                        }
                                    }
                                }
                            }

                            // Process the changes
                            if (changes.length > 0) {
                                handleAfterChange(changes, "edit")
                            }
                        }
                    }, 100)

                    return true
                }}
                fillHandle={false}
                // fillHandle={{
                //     autoInsertRow: false,
                //     direction: "vertical",
                //     copyPasteEnabled: true,
                // }}
                afterCreateRow={(index, amount) => {
                    console.log(`Created ${amount} row(s) at index ${index}`)
                    // You may need to add logic here to create new rows in Firebase
                }}
                afterRemoveRow={(index, amount) => {
                    console.log(`Removed ${amount} row(s) at index ${index}`)

                    // Get the physical row index
                    const physicalRow = hotTableRef.current?.toPhysicalRow(index)

                    // Check if physicalRow is undefined (which can happen for the last row)
                    if (physicalRow === undefined) {
                        // For the last row, we need to get the array index directly from the data
                        // Find the last non-header row in the data
                        let lastRowData = null
                        for (let i = data.length - 1; i >= 0; i--) {
                            const rowData = data[i]
                            if (
                                rowData &&
                                rowData[2] &&
                                typeof rowData[2] === "string" &&
                                !rowData[2].includes("Tuần") &&
                                rowData[2] !== "Chưa có ngày" &&
                                rowData[2] !== "Chưa Index" &&
                                rowData[2] !== "Gỡ bài"
                            ) {
                                lastRowData = rowData
                                break
                            }
                        }

                        if (lastRowData && lastRowData._arrayIndex !== undefined) {
                            const arrayIndex = lastRowData._arrayIndex

                            // Get a reference to the orders array
                            const ordersRef = ref(database, "orders")

                            // Set editing flag to prevent Firebase listener from overriding our changes
                            setIsEditing(true)
                            isSavingRef.current = true

                            // Get the current orders array
                            onValue(
                                ordersRef,
                                (snapshot) => {
                                    if (snapshot.exists()) {
                                        const orders = snapshot.val()

                                        if (Array.isArray(orders) && orders[arrayIndex]) {
                                            // Create a new orders array without the removed item
                                            const newOrders = [...orders]
                                            newOrders.splice(arrayIndex, 1)

                                            // Update the orders array in Firebase
                                            set(ordersRef, newOrders)
                                                .then(() => {
                                                    console.log(`Deleted last row at index ${arrayIndex} from Firebase`)
                                                    // Reset editing flag after update is complete
                                                    setTimeout(() => {
                                                        setIsEditing(false)
                                                        isSavingRef.current = false
                                                    }, 200)
                                                })
                                                .catch((error) => {
                                                    console.error("Error deleting data:", error)
                                                    setIsEditing(false)
                                                    isSavingRef.current = false
                                                })
                                        } else {
                                            console.error("Orders is not an array or index is out of bounds:", orders, arrayIndex)
                                            setIsEditing(false)
                                            isSavingRef.current = false
                                        }
                                    } else {
                                        console.error("No orders data found")
                                        setIsEditing(false)
                                        isSavingRef.current = false
                                    }
                                },
                                { onlyOnce: true },
                            )
                        }
                        return
                    }

                    if (physicalRow >= 0) {
                        // Get the full row data from the data array
                        const fullRowData = data[physicalRow]

                        // Skip if this is a header row (Tuần, Chưa có ngày, etc.)
                        if (
                            fullRowData &&
                            fullRowData[2] &&
                            typeof fullRowData[2] === "string" &&
                            (fullRowData[2].includes("Tuần") ||
                                fullRowData[2] === "Chưa có ngày" ||
                                fullRowData[2] === "Chưa Index" ||
                                fullRowData[2] === "Gỡ bài")
                        ) {
                            console.log("Cannot remove header rows")
                            return
                        }

                        // Get the array index from the hidden property
                        const arrayIndex = fullRowData?._arrayIndex

                        if (arrayIndex !== undefined) {
                            // Get a reference to the orders array
                            const ordersRef = ref(database, "orders")

                            // Set editing flag to prevent Firebase listener from overriding our changes
                            setIsEditing(true)
                            isSavingRef.current = true

                            // Get the current orders array
                            onValue(
                                ordersRef,
                                (snapshot) => {
                                    if (snapshot.exists()) {
                                        const orders = snapshot.val()

                                        if (Array.isArray(orders) && orders[arrayIndex]) {
                                            // Create a new orders array without the removed item
                                            const newOrders = [...orders]
                                            newOrders.splice(arrayIndex, 1)

                                            // Update the orders array in Firebase
                                            set(ordersRef, newOrders)
                                                .then(() => {
                                                    console.log(`Deleted row at index ${arrayIndex} from Firebase`)
                                                    // Reset editing flag after update is complete
                                                    setTimeout(() => {
                                                        setIsEditing(false)
                                                        isSavingRef.current = false
                                                    }, 200)
                                                })
                                                .catch((error) => {
                                                    console.error("Error deleting data:", error)
                                                    setIsEditing(false)
                                                    isSavingRef.current = false
                                                })
                                        } else {
                                            console.error("Orders is not an array or index is out of bounds:", orders, arrayIndex)
                                            setIsEditing(false)
                                            isSavingRef.current = false
                                        }
                                    } else {
                                        console.error("No orders data found")
                                        setIsEditing(false)
                                        isSavingRef.current = false
                                    }
                                },
                                { onlyOnce: true },
                            ) // Only get the data once
                        }
                    }
                }}
                afterSelectionEnd={(row, column, row2, column2, selectionLayerLevel) => {
                    // This will be triggered after a fill handle operation completes
                    if (hotTableRef.current && hotTableRef.current.getSelected()) {
                        // This is to fix the issue where the table is not updating after a fill handle operation
                        setTimeout(() => {
                            hotTableRef.current?.render()
                        }, 50)
                    }
                }}
                colWidths={
                    user?.role === "Admin"
                        ? [50, 70, 10, 10, 10, 60, 10, 10, 70, 70, 10, 10, 10, 10, 10, 10, 50, 10, 50, 30, 50, 50, 70, 20, 10]
                        : []
                }
                beforeChange={handleBeforeChange}
                afterChange={handleAfterChange}
                licenseKey="non-commercial-and-evaluation"
            // copyPaste={{
            //     copyable: true,
            //     pasteMode: "overwrite",
            // }}
            >
                {hotColumns}
            </HotTable>

            {/* Chat Dialog */}
            <ChatDialog
                chatDialogOpen={chatDialogOpen}
                setChatDialogOpen={setChatDialogOpen}
                currentChatOrderId={currentChatOrderId}
                currentChatMessages={currentChatMessages}
                newChatMessage={newChatMessage}
                setNewChatMessage={setNewChatMessage}
                sendChatMessage={sendChatMessage}
                role={role}
            />
        </>
    )
}

export default PageBody