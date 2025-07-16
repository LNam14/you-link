"use client"
import { useMemo, useEffect, useState, useCallback, useRef, memo } from "react"
import { HotTable } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import Handsontable from "handsontable"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import "../style.css"
import { ref, onValue, set, get, update } from "firebase/database"
import getUserInfo from "@/components/userInfo"
import { database } from "@/app/firebase/firebase"
import { Modal, Button, message as antdMessage } from "antd"
import { toast } from "sonner"
import { Merge, Split } from "lucide-react"
import sheetApiRequest from "@/apiRequests/sheet"

type PageBodyProps = {
    supplierName: string | null,
    orderIndex?: number,
    onOrderUpdate?: () => void, // Add callback prop
    order?: any[], // Add order prop
    hiddenColumns?: number[], // Thêm prop để ẩn cột
    chietKhau?: number, // Thêm prop chiết khấu
}
// register Handsontable's modules
registerAllModules()
type NestedColumnHeader = {
    label: string
    colspan: number
}

type ColumnHeader = string

const RowHeader2: ColumnHeader[] = [
    "Mã",
    "Loại",
    "Ngày Bán",
    "Text",
    "Site",
    "Ghi Chú",
    "Giá Bán",
    "Giá Mua",
    "Hoa Hồng",
    "Giá Cuối",
    "TTNCC",
    "Lợi Nhuận",
    "Bài Viết",
    "Link KQ",
    "Anchor 1",
    "Link 1",
    "Anchor 2",
    "Link 2",
    "Ngày KT",
    "Index",
    "Tên NCC",
    "Link NCC",
    "KH",
    "NCC",
    "Trao đổi",
]

// Add column settings
const columnSettings: Record<string, any> = {
    Mã: {
        renderer: (
            instance: Handsontable,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string | number,
            value: string,
            cellProperties: Handsontable.CellProperties,
        ) => {
            Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties)
            td.style.backgroundColor = "#d3d3d3" // Light blue - Guest Post
            td.style.color = "#FF0000"
            td.style.fontWeight = "500" // Make text bold
        },
    },
    Loại: {
        type: "dropdown",
        source: ["GP", "Text", "Text Home", "Text Header"],
        renderer: (
            instance: Handsontable,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string | number,
            value: string,
            cellProperties: Handsontable.CellProperties,
        ) => {
            Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties)
            if (value === "GP") {
                td.style.backgroundColor = "#1890ff" // Light blue - Guest Post
                td.style.color = "#e6f7ff"
            } else if (value === "Text") {
                td.style.backgroundColor = "#52c41a" // Light green - Text Footer
                td.style.color = "#f6ffed"
            } else if (value === "Text Home") {
                td.style.backgroundColor = "#fa8c16" // Light orange - Text Home
                td.style.color = "#fff7e6"
            } else if (value === "Text Header") {
                td.style.backgroundColor = "#722ed1" // Light purple - Text Header
                td.style.color = "#f9f0ff"
            }
        },
    },
    Index: {
        type: "dropdown",
        source: ["Indexed", "No", "Mất - Index"],
        renderer: (
            instance: Handsontable,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string | number,
            value: string,
            cellProperties: Handsontable.CellProperties,
        ) => {
            Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties)
            if (value === "Indexed") {
                td.style.backgroundColor = "#52c41a" // Light green - Indexed
                td.style.color = "#f6ffed"
            } else if (value === "No") {
                td.style.backgroundColor = "#fa8c16" // Light orange - No
                td.style.color = "#fff7e6"
            } else if (value === "Mất - Index") {
                td.style.backgroundColor = "#f5222d" // Light red - Mất Index
                td.style.color = "#fff1f0"
            } else {
                td.style.backgroundColor = "#d3d3d3" // Light blue - Guest Post
            }
        },
    },
    KH: {
        type: "dropdown",
        source: [
            "Chưa nhập",
            "Đã nhập",
            "Hủy đơn",
            "Hủy - no index",
            "Hủy - đã index",
            "Hủy - 14 ngày không index",
            "Hủy - chưa lên bài",
            "Hủy - đã lên bài",
            "Hủy - 14 ngày chưa index",
            "Hủy - trước 12h",
            "Đơn OK",
        ],
        renderer: (
            instance: Handsontable,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string | number,
            value: string,
            cellProperties: Handsontable.CellProperties,
        ) => {
            Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties)
            if (value === "Chưa nhập") {
                td.style.backgroundColor = "#fa8c16" // Light orange - Chưa nhập
                td.style.color = "#fff7e6"
            } else if (value === "Đã nhập") {
                td.style.backgroundColor = "#52c41a" // Light green - Đã nhập
                td.style.color = "#f6ffed"
            } else if (value === "Đơn OK") {
                td.style.backgroundColor = "#52c41a" // Light green - Đơn OK
                td.style.color = "#f6ffed"
            } else if (
                value === "GP 80 ngày mất" ||
                value === "GP 30 ngày mất" ||
                value === "GP 20 ngày mất" ||
                value === "GP 15 ngày mất" ||
                value === "Text 1-3 ngày mất" ||
                value === "Text 3-7 ngày mất" ||
                value === "Text 7-14 ngày mất" ||
                value === "Text 14-21 ngày mất" ||
                value === "Text 21-25 ngày mất"
            ) {
                td.style.backgroundColor = "#FF1C7D" // Light green - Đơn OK
                td.style.color = "#FFC7DF"
            } else if (
                value === "Hủy đơn" ||
                value === "Hủy - no index" ||
                value === "Hủy - đã index" ||
                value === "Hủy - 14 ngày không index" ||
                value === "Hủy - chưa lên bài" ||
                value === "Hủy - đã lên bài" ||
                value === "Hủy - 14 ngày chưa index" ||
                value === "Hủy - trước 12h"
            ) {
                td.style.backgroundColor = "#f5222d" // Light red - Hủy đơn
                td.style.color = "#fff1f0"
            }
        },
    },
    NCC: {
        type: "dropdown",
        source: ["Chưa nhận đơn", "Đã lên bài", "Hủy đơn", "Từ chối hủy", "Đồng ý hủy"],
        renderer: (
            instance: Handsontable,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string | number,
            value: string,
            cellProperties: Handsontable.CellProperties,
        ) => {
            Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties)
            if (value === "Chưa nhận đơn") {
                td.style.backgroundColor = "#fa8c16" // Light orange - Chưa nhận đơn
                td.style.color = "#fff7e6"
            } else if (value === "Đã lên bài") {
                td.style.backgroundColor = "#52c41a" // Light green - Đã lên bài
                td.style.color = "#f6ffed"
            } else if (value === "Từ chối hoàn" || value === "Đồng ý hoàn") {
                td.style.backgroundColor = "#FF1C7D" // Light green - Đơn OK
                td.style.color = "#FFC7DF"
            } else if (value === "Hủy đơn" || value === "Đồng ý hủy") {
                td.style.backgroundColor = "#f5222d" // Light red - Hủy đơn
                td.style.color = "#fff1f0"
            } else if (value === "Từ chối hủy") {
                td.style.backgroundColor = "#FF26A1" // Light red - Hủy đơn
                td.style.color = "#fff1f0"
            }
        },
    },
    "Ngày Bán": {
        type: "date",
        dateFormat: "DD/MM/YYYY",
        correctFormat: true,
        className: "htCenter",
        renderer: (
            instance: any,
            td: any,
            row: number,
            col: number,
            prop: any,
            value: any
        ) => {
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
                                <span style="color:#2563EB;font-weight:500;">${day}/${month} 📅</span>
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
            const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
            if (dateRegex.test(value)) {
                callback(true)
                return
            }
            const date = new Date(value)
            if (!isNaN(date.getTime())) {
                callback(true)
                return
            }
            callback(false)
        },
    },
}

type ChatMessage = {
    text: string
    sender: string
    name?: string
    supplierName?: string
    senderRole: string
    timestamp: number
    isComplaint?: boolean
    complaintStatus?: "pending" | "accepted" | "rejected"
    ngayChat?: string
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
        supplierName,
        user,
        orderIndex,
    }: {
        chatDialogOpen: boolean
        setChatDialogOpen: (open: boolean) => void
        currentChatOrderId: string | null
        currentChatMessages: ChatMessage[]
        newChatMessage: string
        setNewChatMessage: (message: string) => void
        sendChatMessage: () => void
        role: string
        supplierName: string | null
        user: any
        orderIndex: number | undefined
    }) => {
        const [isReported, setIsReported] = useState(false)
        const [isComplaintOpen, setIsComplaintOpen] = useState(false)
        const [currentOrder, setCurrentOrder] = useState<any>(null)
        const messagesEndRef: any = useRef(null)
        const complaintRef = useRef<HTMLDivElement>(null)

        const scrollToBottom = () => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }

        useEffect(() => {
            if (chatDialogOpen) {
                scrollToBottom()
            }
        }, [currentChatMessages, chatDialogOpen])

        // Load order data when chat dialog opens
        useEffect(() => {
            if (currentChatOrderId) {
                const ordersRef = ref(database, `orders/${orderIndex}/ChiTietDonHang`)
                onValue(ordersRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const ordersData = snapshot.val()
                        const ordersArray = Array.isArray(ordersData) ? ordersData : ordersData.orders || []
                        const order = ordersArray.find((order: any) => order.MaDon === currentChatOrderId)
                        if (order) {
                            setCurrentOrder(order)
                        }
                    }
                })
            }
        }, [currentChatOrderId])

        // Handle click outside to close complaint dropdown
        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (complaintRef.current && !complaintRef.current.contains(event.target as Node)) {
                    setIsComplaintOpen(false)
                }
            }

            document.addEventListener("mousedown", handleClickOutside)
            return () => {
                document.removeEventListener("mousedown", handleClickOutside)
            }
        }, [])

        const complaintOptions = useMemo(() => {
            if (!currentOrder) return []

            if (currentOrder.Loai === "GP") {
                return [
                    "GP 80 ngày mất - Hoàn 20% tiền",
                    "GP 30 ngày mất - Hoàn 40% tiền",
                    "GP 30 ngày mất - Hoàn 60% tiền",
                    "GP 20 ngày mất - Hoàn 80% tiền",
                    "GP 15 ngày mất - Hoàn 100% tiền",
                ]
            } else {
                return [
                    "Text 1-3 ngày mất - Hoàn 100% tiền",
                    "Text 3-7 ngày mất - Hoàn 75% tiền",
                    "Text 7-14 ngày mất - Hoàn 50% tiền",
                    "Text 14-21 ngày mất - Hoàn 25% tiền",
                    "Text 21-25 ngày mất - Hoàn 15% tiền",
                ]
            }
        }, [currentOrder])

        const handleComplaintResponse = async (message: ChatMessage, status: "accepted" | "rejected") => {
            if (!currentChatOrderId) return

            try {
                const ordersRef = ref(database, `orders/${orderIndex}/ChiTietDonHang`)
                const snapshot = await get(ordersRef)

                if (snapshot.exists()) {
                    const ordersData = snapshot.val()
                    const ordersArray = Array.isArray(ordersData) ? ordersData : ordersData.orders || []
                    const orderIndex = ordersArray.findIndex((order: any) => order.MaDon === currentChatOrderId)

                    if (orderIndex !== -1) {
                        const updatedOrder = {
                            ...ordersArray[orderIndex],
                            chat: ordersArray[orderIndex].chat.map((msg: ChatMessage) => {
                                if (msg.timestamp === message.timestamp) {
                                    return {
                                        ...msg,
                                        complaintStatus: status,
                                    }
                                }
                                return msg
                            }),
                        }

                        // Update TinhTrangNCC based on complaint response
                        if (status === "accepted") {
                            updatedOrder.TinhTrangNCC = "Đồng ý hoàn"

                            // Calculate refund amount based on complaint type
                            let refundAmount = 0
                            const complaintText = message.text

                            if (updatedOrder.Loai === "GP") {
                                const price = Number(updatedOrder.GiaBanGP || 0)
                                if (complaintText.includes("80 ngày")) {
                                    refundAmount = Math.round(price * 0.2) // 20% refund
                                } else if (complaintText.includes("30 ngày")) {
                                    if (complaintText.includes("60%")) {
                                        refundAmount = Math.round(price * 0.6) // 60% refund
                                    } else {
                                        refundAmount = Math.round(price * 0.4) // 40% refund
                                    }
                                } else if (complaintText.includes("20 ngày")) {
                                    refundAmount = Math.round(price * 0.8) // 80% refund
                                } else if (complaintText.includes("15 ngày")) {
                                    refundAmount = Math.round(price) // 100% refund
                                }
                            } else {
                                const price = Number(
                                    updatedOrder.Loai === "Text"
                                        ? updatedOrder.GiaBanText
                                        : updatedOrder.Loai === "TextHome"
                                            ? updatedOrder.GiaBanTextHome
                                            : updatedOrder.GiaBanTextHeader || 0,
                                )

                                if (complaintText.includes("1-3 ngày")) {
                                    refundAmount = Math.round(price) // 100% refund
                                } else if (complaintText.includes("3-7 ngày")) {
                                    refundAmount = Math.round(price * 0.75) // 75% refund
                                } else if (complaintText.includes("7-14 ngày")) {
                                    refundAmount = Math.round(price * 0.5) // 50% refund
                                } else if (complaintText.includes("14-21 ngày")) {
                                    refundAmount = Math.round(price * 0.25) // 25% refund
                                } else if (complaintText.includes("21-25 ngày")) {
                                    refundAmount = Math.round(price * 0.15) // 15% refund
                                }
                            }

                            // Only process refund if payment was previously processed and not refunded
                            if (
                                refundAmount > 0 &&
                                updatedOrder.paymentStatus === "paid" &&
                                updatedOrder.paymentStatus1 !== "refunded"
                            ) {
                                updatedOrder.paymentStatus1 = "refunded"
                                // sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Bạn đã đồng ý hoàn ${refundAmount}$ cho đơn hàng ${updatedOrder.MaDon}, kiểm tra tại https://www.ylink.shop/gp-text `)
                                // sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã được hoàn tiền, số tiền ${refundAmount}$ đã được cộng vào ví của bạn, kiểm tra tại https://www.ylink.shop/gp-text `)
                            }
                        } else {
                            updatedOrder.TinhTrangNCC = "Từ chối hoàn"
                            // sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Bạn đã từ chối yêu cầu hoàn tiền của đơn hàng ${updatedOrder.MaDon}`)
                            // sheetApiRequest.getIDKH(updatedOrder.TenKH, `Yêu cầu hoàn tiền đối với đơn hàng ${updatedOrder.MaDon} đã bị từ chối`)
                        }

                        ordersArray[orderIndex] = updatedOrder
                        await set(ordersRef, ordersArray)
                    }
                }
            } catch (error) {
                console.error("Error updating complaint status:", error)
            }
        }

        const handleComplaintSelect = async (option: string) => {
            if (!currentChatOrderId || !currentOrder) return

            // Check if this is a weekly order
            const isWeeklyOrder =
                currentOrder.Loai === "GP"
                    ? currentOrder.NgayKT &&
                    (currentOrder.TinhTrangKH === "Đã nhập" || currentOrder.TinhTrangKH === "Đơn OK") &&
                    (currentOrder.TinhTrangNCC === "Đã lên bài" || currentOrder.TinhTrangNCC === "Đơn OK") || (currentOrder.TinhTrangKH === "Hủy - đã index" || currentOrder.TinhTrangKH === "Hủy - đã lên bài")
                    : currentOrder.NgayBan &&
                    (currentOrder.TinhTrangKH === "Đã nhập" || currentOrder.TinhTrangKH === "Đơn OK") &&
                    (currentOrder.TinhTrangNCC === "Đã lên bài" || currentOrder.TinhTrangNCC === "Đơn OK") || (currentOrder.TinhTrangNCC === "Từ chối hủy")

            if (!isWeeklyOrder) {
                antdMessage.warning("Không thể khiếu nại đối với đơn hàng chưa hoàn thành")
                return
            }

            const hasExistingComplaint = currentOrder.chat?.some((msg: ChatMessage) => msg.isComplaint)
            if (hasExistingComplaint) {
                antdMessage.warning("Đơn hàng này đã được khiếu nại!")
                return
            }

            // Nếu là khách hàng thì không lấy user, để tên mặc định
            const message: ChatMessage = {
                text: option,
                sender: role === 'Khách hàng' ? 'Khách ẩn danh' : (user?.displayName || user?.email || 'Unknown User'),
                senderRole: role || 'NCC',
                timestamp: Date.now(),
                isComplaint: true,
                complaintStatus: 'pending',
            }
            if (role === 'NCC') {
                message.supplierName = supplierName || user?.name || user?.displayName || ''
            } else if (role === 'Khách hàng') {
                message.name = 'Khách hàng'
            }
            try {
                const ordersRef = ref(database, `orders/${orderIndex}/ChiTietDonHang`)
                const snapshot = await get(ordersRef)

                if (snapshot.exists()) {
                    const ordersData = snapshot.val()
                    const ordersArray = Array.isArray(ordersData) ? ordersData : ordersData.orders || []
                    const orderIndex = ordersArray.findIndex((order: any) => order.MaDon === currentChatOrderId)

                    if (orderIndex !== -1) {
                        const updatedOrder = {
                            ...ordersArray[orderIndex],
                            chat: [...(ordersArray[orderIndex].chat || []), message],
                            TinhTrangKH: option.split(" - ")[0], // Update TinhTrangKH with the complaint text
                        }

                        ordersArray[orderIndex] = updatedOrder
                        await set(ordersRef, ordersArray)
                        setIsComplaintOpen(false)
                    }
                }
            } catch (error) {
                console.error("Error sending complaint:", error)
            }
        }

        const handleClose = () => {
            setChatDialogOpen(false)
        }

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
                <div className="mb-4">
                    <button
                        onClick={() => setIsReported(!isReported)}
                        className={`inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full shadow-sm transition-colors duration-200 ${isReported ? "bg-red-500 text-white" : "bg-red-100 text-red-800 hover:bg-red-200"
                            }`}
                    >
                        {isReported && <span className="w-2 h-2 rounded-full bg-red-300 animate-pulse"></span>}
                        {isReported ? "Đã báo cáo Admin" : "Báo cáo Admin"}
                    </button>
                    <p className="mt-1 text-xs text-gray-500">
                        {isReported ? "Admin sẽ xem xét cuộc trao đổi này." : "Báo cáo cuộc trao đổi này cho Admin nếu có vấn đề."}
                    </p>
                </div>

                {/* Khu vực tin nhắn */}
                <div
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    className="h-[400px] overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg [&::-webkit-scrollbar]:hidden"
                >
                    {currentChatMessages.length === 0 ? (
                        <p className="text-center text-gray-400 italic">Chưa có tin nhắn nào</p>
                    ) : (
                        <div className="space-y-2">
                            {currentChatMessages.map((msg: ChatMessage, index: number) => {
                                const isOwnMessage = msg.senderRole === role
                                const isFirstInGroup = index === 0 || currentChatMessages[index - 1].senderRole !== msg.senderRole

                                return (
                                    <div key={index} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                        <div>
                                            {isFirstInGroup && (
                                                <div
                                                    className={`text-xs font-medium mb-1 ${isOwnMessage ? "text-right mr-2" : "text-left ml-2"} text-gray-600`}
                                                >
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
                                                {msg.isComplaint && (
                                                    <div className="mt-2">
                                                        {msg.senderRole === "Khách hàng" && (
                                                            <div className="text-xs text-gray-500">
                                                                {msg.complaintStatus === "pending" && "Đợi NCC trả lời"}
                                                                {msg.complaintStatus === "accepted" && "NCC đã đồng ý hoàn tiền"}
                                                                {msg.complaintStatus === "rejected" && "NCC từ chối hoàn tiền"}
                                                            </div>
                                                        )}
                                                        {msg.senderRole === "Khách hàng" && role === "NCC" && msg.complaintStatus === "pending" && (
                                                            <div className="flex gap-2 mt-2">
                                                                <button
                                                                    onClick={() => handleComplaintResponse(msg, "accepted")}
                                                                    className="px-3 py-1 text-xs font-medium text-white bg-green-500 rounded-full hover:bg-green-600"
                                                                >
                                                                    Đồng ý
                                                                </button>
                                                                <button
                                                                    onClick={() => handleComplaintResponse(msg, "rejected")}
                                                                    className="px-3 py-1 text-xs font-medium text-white bg-red-500 rounded-full hover:bg-red-600"
                                                                >
                                                                    Từ chối
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div
                                                    className={`text-[11px] text-right mt-1 ${isOwnMessage ? "text-blue-600" : "text-gray-500"}`}
                                                >
                                                    {new Date(msg.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Nhập tin nhắn và nút khiếu nại */}
                <div className="flex items-center gap-2">
                    {role === "Khách hàng" && (
                        <div className="relative" ref={complaintRef}>
                            <button
                                onClick={() => setIsComplaintOpen(!isComplaintOpen)}
                                className="p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        fillRule="evenodd"
                                        d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                            {isComplaintOpen && (
                                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                                    {complaintOptions.map((option, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleComplaintSelect(option)}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
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
                </div>
            </Modal>
        )
    },
)

ChatDialog.displayName = "ChatDialog"

export default function PageBody({ supplierName, orderIndex, onOrderUpdate, order, hiddenColumns, chietKhau }: PageBodyProps) {
    const [orders, setOrders] = useState<any[]>([])
    const [orderKeys, setOrderKeys] = useState<string[]>([])
    // Lấy userInfo, nhưng nếu là khách hàng thì để null
    const userInfo = typeof window !== 'undefined' && localStorage.getItem('role') === 'Khách hàng' ? null : getUserInfo()
    const [chatDialogOpen, setChatDialogOpen] = useState(false)
    const [currentChatOrderId, setCurrentChatOrderId] = useState<string | null>(null)
    const [currentChatMessages, setCurrentChatMessages] = useState<ChatMessage[]>([])
    const [newChatMessage, setNewChatMessage] = useState("")
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [maKHFilter, setMaKHFilter] = useState<string>("")
    const [tenNCCFilter, setTenNCCFilter] = useState<string>("")
    const [uniqueMaKHList, setUniqueMaKHList] = useState<string[]>([])
    const [uniqueTenNCCList, setUniqueTenNCCList] = useState<string[]>([])
    const [mergeMode, setMergeMode] = useState<boolean>(supplierName ? false : true) // Thay đổi mặc định thành true

    const updateOrderSummary = useCallback(async () => {
        if (orderIndex === undefined) return

        try {
            const orderRef = ref(database, `orders/${orderIndex}`)
            const snapshot = await get(orderRef)

            if (snapshot.exists()) {
                const orderData = snapshot.val()

                if (!orderData.ChiTietDonHang || !Array.isArray(orderData.ChiTietDonHang)) {
                    return
                }

                let totalUSDT = 0
                let totalGiaMua = 0

                orderData.ChiTietDonHang.forEach((detail: any) => {
                    // Skip canceled orders
                    const isCanceled =
                        detail.TinhTrangKH?.includes("Hủy") ||
                        detail.TinhTrangNCC === "Hủy đơn" ||
                        detail.TinhTrangNCC === "Đồng ý hủy"

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

                // Update the main order summary
                await update(orderRef, {
                    USDT: totalUSDT,
                    GiaMua: totalGiaMua,
                    LoiNhuan: totalUSDT - totalGiaMua,
                })

                // Call the callback to notify parent component
                if (onOrderUpdate) {
                    onOrderUpdate()
                }
            }
        } catch (error) {
            console.error("Error updating order summary:", error)
        }
    }, [orderIndex, onOrderUpdate])

    // Add function to extract MaKH from MaDon
    const extractMaKH = (maDon: string) => {
        const parts = maDon.split('-');
        return parts[0] || '';
    };

    // Update uniqueMaKHList and uniqueTenNCCList when orders change
    useEffect(() => {
        const uniqueMaKHs = Array.from(new Set(orders.map(order => extractMaKH(order.MaDon)))).sort();
        const uniqueTenNCCs = Array.from(new Set(orders.map(order => order.TenNCC))).filter(Boolean).sort();
        setUniqueMaKHList(uniqueMaKHs);
        setUniqueTenNCCList(uniqueTenNCCs);

        // Calculate totals
        const completed = orders.filter(order =>
            (order.TinhTrangKH === "Đơn OK" ||
                (order.TinhTrangKH === "Đã nhập" && order.TinhTrangNCC === "Đã lên bài")) &&
            order.Index === "Indexed"
        ).length;

        const notEntered = orders.filter(order =>
            order.TinhTrangKH === "Chưa nhập" ||
            !order.TinhTrangKH
        ).length;

        const canceled = orders.filter(order =>
            order.TinhTrangKH?.includes("Hủy") ||
            order.TinhTrangNCC === "Hủy đơn" ||
            order.TinhTrangNCC === "Đồng ý hủy"
        ).length;

        const notIndexed = orders.filter(order =>
            order.Loai === "GP" &&
            order.Index === "No" &&
            order.TinhTrangKH === "Đã nhập" &&
            order.TinhTrangNCC === "Đã lên bài"
        ).length;
    }, [orders]);

    // Filter orders based on filters
    const filteredOrders = useMemo(() => {
        if (!maKHFilter && !tenNCCFilter || (userInfo?.role !== "Admin" && userInfo?.role !== "Nhân viên")) {
            return orders;
        }
        return orders.filter(order => {
            const maKH = extractMaKH(order.MaDon);
            const matchesMaKH = !maKHFilter || maKH === maKHFilter;
            const matchesTenNCC = !tenNCCFilter || order.TenNCC === tenNCCFilter;
            return matchesMaKH && matchesTenNCC;
        });
    }, [orders, maKHFilter, tenNCCFilter, userInfo?.role]);

    const handleContextMenuAction = async (row: number, action: string) => {
        // Skip if this is a summary row
        const isSummaryRow =
            data[row][0]?.includes("Tổng") ||
            data[row][0]?.includes("Chưa Index") ||
            data[row][0]?.includes("Chưa NNhập") ||
            data[row][0]?.includes("Đơn hủy")

        if (isSummaryRow) return

        // Get the order code (Mã đơn) from the current row
        const orderCode = data[row][0]
        if (!orderCode) return

        // Find the matching order in the orders array by Mã đơn
        const orderIdx = orders.findIndex((order) => order.MaDon === orderCode)
        if (orderIdx === -1) return

        // Always use _parentIndex and _dbIndex from the order item
        const detail = orders[orderIdx];
        const parentIndex = detail._parentIndex;
        const dbIndex = detail._dbIndex;
        if (typeof parentIndex !== 'number' || typeof dbIndex !== 'number') return;

        const orderRef = ref(database, `orders/${parentIndex}/ChiTietDonHang/${dbIndex}`)
        const updatedOrder = { ...orders[orderIdx] }

        if (action === "ok") {
            updatedOrder.TinhTrangKH = "Đơn OK"
        } else if (action === "cancel") {
            if (updatedOrder.Loai === "GP") {
                if (!updatedOrder.BaiViet) {
                    updatedOrder.TinhTrangKH = "Hủy đơn"
                } else if (!updatedOrder.LinkKQ) {
                    updatedOrder.TinhTrangKH = "Hủy - chưa lên bài"
                } else if (updatedOrder.Index === "No" || !updatedOrder.Index) {
                    updatedOrder.TinhTrangKH = "Hủy - no index"
                } else if (updatedOrder.Index === "Indexed") {
                    updatedOrder.TinhTrangKH = "Hủy - đã index"
                }
            } else {
                // Non-GP order cancellation logic
                if (updatedOrder.TinhTrangKH === "Chưa nhập" || !updatedOrder.TinhTrangKH) {
                    updatedOrder.TinhTrangKH = "Hủy đơn"
                } else if (updatedOrder.TinhTrangKH === "Đã nhập" && updatedOrder.TinhTrangNCC === "Chưa nhận đơn") {
                    updatedOrder.TinhTrangKH = "Hủy - chưa lên bài"
                } else if (updatedOrder.TinhTrangNCC === "Đã lên bài") {
                    if (updatedOrder.NgayBan) {
                        const [day, month] = updatedOrder.NgayBan.split("/")
                        const now = new Date()
                        const ngayBan = new Date(now.getFullYear(), Number(month) - 1, Number(day))
                        const diffInDays = (now.getTime() - ngayBan.getTime()) / (1000 * 60 * 60 * 24)
                        if (diffInDays < 1) {
                            updatedOrder.TinhTrangKH = "Hủy - trước 12h"
                            const price = Number(
                                updatedOrder.Loai === "GP"
                                    ? updatedOrder.GiaBanGP || 0
                                    : updatedOrder.Loai === "Text"
                                        ? updatedOrder.GiaBanText || 0
                                        : updatedOrder.Loai === "TextHome"
                                            ? updatedOrder.GiaBanTextHome || 0
                                            : updatedOrder.GiaBanTextHeader || 0,
                            )
                            updatedOrder.paymentStatus1 = "refunded"
                        } else {
                            updatedOrder.TinhTrangKH = "Hủy - đã lên bài"
                        }
                    }
                }
            }
        } else if (action === "ncc_cancel") {
            updatedOrder.TinhTrangNCC = "Hủy đơn"
        } else if (action === "ncc_ok") {
            updatedOrder.TinhTrangNCC = "Đã lên bài"
            const now = new Date()
            const day = String(now.getDate()).padStart(2, "0")
            const month = String(now.getMonth() + 1).padStart(2, "0")
            updatedOrder.NgayBan = `${day}/${month}`
        } else if (action === "ncc_accept_cancel") {
            updatedOrder.TinhTrangNCC = "Đồng ý hủy"
            const price = Number(
                updatedOrder.Loai === "GP"
                    ? updatedOrder.GiaBanGP || 0
                    : updatedOrder.Loai === "Text"
                        ? updatedOrder.GiaBanText || 0
                        : updatedOrder.Loai === "TextHome"
                            ? updatedOrder.GiaBanTextHome || 0
                            : updatedOrder.GiaBanTextHeader || 0,
            )
            updatedOrder.paymentStatus1 = "refunded"
        } else if (action === "ncc_reject_cancel") {
            updatedOrder.TinhTrangNCC = "Từ chối hủy"
        }

        // Update the order in Firebase
        update(orderRef, updatedOrder)
            .then(() => {
                console.log(`Successfully updated order status for ${orderCode}`)
                if (onOrderUpdate) onOrderUpdate();
            })
            .catch((error) => {
                console.error(`Error updating order status for ${orderCode}:`, error)
            })
    }

    // --- Tách riêng menu items cho NCC và Khách hàng ---
    const nccMenuItems = {
        ncc_cancel: {
            name: userInfo?.role === "Admin" ? "Hủy đơn (NCC)" : "Hủy đơn",
            callback: function (this: Handsontable, key: string, selection: any) {
                const selected = this.getSelectedLast()
                if (selected) {
                    handleContextMenuAction(selected[0], "ncc_cancel")
                }
            },
            hidden: function (this: Handsontable): boolean {
                const selected = this.getSelectedLast()
                if (selected) {
                    const row = selected[0]
                    if (!data || !Array.isArray(data) || row < 0 || row >= data.length) return true
                    const orderCode = data[row][0]
                    if (!orderCode || typeof orderCode !== "string") return true
                    if (
                        orderCode.includes("Tổng") ||
                        orderCode.includes("Chưa Index") ||
                        orderCode.includes("Đang Xử Lý") ||
                        orderCode.includes("Đơn hủy")
                    ) {
                        return true
                    }
                    const order = orders.find((o) => o.MaDon === orderCode)
                    if (!order) return true
                    return order?.TinhTrangKH !== "Đã nhập" || order?.TinhTrangNCC !== "Chưa nhận đơn"
                }
                return true
            },
        },
        ncc_ok: {
            name: "Đơn OK",
            callback: function (this: Handsontable, key: string, selection: any) {
                const selected = this.getSelectedLast()
                if (selected) {
                    handleContextMenuAction(selected[0], "ncc_ok")
                }
            },
            hidden: function (this: Handsontable): boolean {
                const selected = this.getSelectedLast()
                if (selected) {
                    const row = selected[0]
                    if (!data || !Array.isArray(data) || row < 0 || row >= data.length) return true
                    const orderCode = data[row][0]
                    if (!orderCode || typeof orderCode !== "string") return true
                    if (
                        orderCode.includes("Tổng") ||
                        orderCode.includes("Chưa Index") ||
                        orderCode.includes("Đang Xử Lý") ||
                        orderCode.includes("Đơn hủy")
                    ) {
                        return true
                    }
                    const order = orders.find((o) => o.MaDon === orderCode)
                    if (!order) return true
                    return !(
                        order?.Loai !== "GP" &&
                        order?.TinhTrangKH === "Đã nhập" &&
                        order?.TinhTrangNCC === "Chưa nhận đơn"
                    )
                }
                return true
            },
        },
        ncc_accept_cancel: {
            name: "Đồng ý hủy",
            callback: function (this: Handsontable, key: string, selection: any) {
                const selected = this.getSelectedLast()
                if (selected) {
                    handleContextMenuAction(selected[0], "ncc_accept_cancel")
                }
            },
            hidden: function (this: Handsontable): boolean {
                const selected = this.getSelectedLast()
                if (selected) {
                    const row = selected[0]
                    if (!data || !Array.isArray(data) || row < 0 || row >= data.length) return true
                    const orderCode = data[row][0]
                    if (!orderCode || typeof orderCode !== "string") return true
                    if (
                        orderCode.includes("Tổng") ||
                        orderCode.includes("Chưa Index") ||
                        orderCode.includes("Đang Xử Lý") ||
                        orderCode.includes("Đơn hủy")
                    ) {
                        return true
                    }
                    const order = orders.find((o) => o.MaDon === orderCode)
                    if (!order) return true
                    return (
                        !(order?.TinhTrangKH === "Hủy - đã index" || order?.TinhTrangKH === "Hủy - đã lên bài") ||
                        !(order?.TinhTrangNCC === "Đã lên bài")
                    )
                }
                return true
            },
        },
        ncc_reject_cancel: {
            name: "Từ chối hủy",
            callback: function (this: Handsontable, key: string, selection: any) {
                const selected = this.getSelectedLast()
                if (selected) {
                    handleContextMenuAction(selected[0], "ncc_reject_cancel")
                }
            },
            hidden: function (this: Handsontable): boolean {
                const selected = this.getSelectedLast()
                if (selected) {
                    const row = selected[0]
                    if (!data || !Array.isArray(data) || row < 0 || row >= data.length) return true
                    const orderCode = data[row][0]
                    if (!orderCode || typeof orderCode !== "string") return true
                    if (
                        orderCode.includes("Tổng") ||
                        orderCode.includes("Chưa Index") ||
                        orderCode.includes("Đang Xử Lý") ||
                        orderCode.includes("Đơn hủy")
                    ) {
                        return true
                    }
                    const order = orders.find((o) => o.MaDon === orderCode)
                    if (!order) return true
                    return (
                        !(order?.TinhTrangKH === "Hủy - đã index" || order?.TinhTrangKH === "Hủy - đã lên bài") ||
                        !(order?.TinhTrangNCC === "Đã lên bài")
                    )
                }
                return true
            },
        },
    };
    const khMenuItems = {
        ok: {
            name: "Đơn OK",
            callback: function (this: Handsontable, key: string, selection: any) {
                const selected = this.getSelectedLast()
                if (selected) {
                    handleContextMenuAction(selected[0], "ok")
                }
            },
            hidden: function (this: Handsontable): boolean {
                const selected = this.getSelectedLast()
                if (selected) {
                    const row = selected[0]
                    if (!data || !Array.isArray(data) || row < 0 || row >= data.length) return true
                    const orderCode = data[row][0]
                    if (!orderCode || typeof orderCode !== "string") return true
                    if (
                        orderCode.includes("Tổng") ||
                        orderCode.includes("Chưa Index") ||
                        orderCode.includes("Đang Xử Lý") ||
                        orderCode.includes("Đơn hủy")
                    ) {
                        return true
                    }
                    const order = orders.find((o) => o.MaDon === orderCode)
                    if (!order) return true
                    if (order.Loai === "GP") {
                        return !(
                            order.Index === "Indexed" &&
                            order.TinhTrangKH === "Đã nhập" &&
                            order.TinhTrangNCC === "Đã lên bài"
                        )
                    }
                    return !(order.TinhTrangKH === "Đã nhập" && order.TinhTrangNCC === "Đã lên bài")
                }
                return true
            },
        },
        cancel: {
            name: userInfo?.role === "Admin" ? "Hủy đơn (KH)" : "Hủy đơn",
            callback: function (this: Handsontable, key: string, selection: any) {
                const selected = this.getSelectedLast()
                if (selected) {
                    handleContextMenuAction(selected[0], "cancel")
                }
            },
            hidden: function (this: Handsontable): boolean {
                const selected = this.getSelectedLast()
                if (selected) {
                    const row = selected[0]
                    if (!data || !Array.isArray(data) || row < 0 || row >= data.length) return true
                    const orderCode = data[row][0]
                    if (!orderCode || typeof orderCode !== "string") return true
                    if (
                        orderCode.includes("Tổng") ||
                        orderCode.includes("Chưa Index") ||
                        orderCode.includes("Đang Xử Lý") ||
                        orderCode.includes("Đơn hủy")
                    ) {
                        return true
                    }
                    const order = orders.find((o) => o.MaDon === orderCode)
                    if (!order) return true
                    return (
                        order?.TinhTrangKH === "Đơn OK" ||
                        order?.TinhTrangNCC === "Hủy đơn" ||
                        order?.TinhTrangKH.includes("Hủy")
                    )
                }
                return true
            },
        },
    };

    let contextMenuItems;
    if (userInfo?.role === "Admin") {
        contextMenuItems = { items: { ...nccMenuItems, ...khMenuItems } };
    } else if (userInfo?.role === "NCC") {
        contextMenuItems = { items: nccMenuItems };
    } else {
        contextMenuItems = { items: khMenuItems };
    }

    // Load orders data
    useEffect(() => {
        if (order) {
            setOrders(order.map(o => ({ ...o })));
            setOrderKeys(order.map((_, index) => index.toString()))
        }
    }, [order])

    const checkOrderStatus = useCallback((order: any) => {
        if (!order.NgayOrder || !order.BaiViet) return order.TinhTrangNCC

        const orderTime = new Date(order.NgayOrder)
        const now = new Date()
        const hoursElapsed = (now.getTime() - orderTime.getTime()) / (1000 * 60 * 60)

        if (order.TinhTrangNCC !== "Đã lên bài") {
            // if (hoursElapsed >= 3) return "Delay 48h"
            // if (hoursElapsed >= 2) return "Delay 24h"
            // if (hoursElapsed >= 1) return "Delay 12h"
        }

        return order.TinhTrangNCC
    }, [])

    // Set up interval to check order status
    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         orders.forEach((order, index) => {
    //             const orderKey = orderKeys[index]
    //             if (orderKey) {
    //                 const newStatus = checkOrderStatus(order)
    //                 if (newStatus !== order.TinhTrangNCC) {
    //                     const orderRef = ref(database, `orders/${orderIndex}/ChiTietDonHang/${orderKey}`)
    //                     set(orderRef, { ...order, TinhTrangNCC: newStatus })
    //                 }

    //                 // Check for 14-day auto-cancellation for GP orders with no index
    //                 if (
    //                     order.Loai === "GP" &&
    //                     order.NgayOrder &&
    //                     (order.Index === "No" || !order.Index) &&
    //                     order.TinhTrangKH !== "Hủy - 14 ngày không index" &&
    //                     order.TinhTrangKH !== "Hủy đơn" &&
    //                     order.TinhTrangKH !== "Hủy - no index" &&
    //                     order.TinhTrangKH !== "Hủy - đã index" &&
    //                     order.TinhTrangKH !== "Hủy - 14 ngày chưa index"
    //                 ) {
    //                     const orderDate = new Date(order.NgayOrder)
    //                     const now = new Date()
    //                     const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))

    //                     if (daysDiff >= 14) {
    //                         const orderRef = ref(database, `orders/${orderIndex}/ChiTietDonHang/${orderKey}`)
    //                         // set(orderRef, { ...order, TinhTrangKH: "Hủy - 14 ngày không index" })
    //                     }
    //                 }

    //                 // Check for 14-day auto-cancellation for GP orders with Index = "No"
    //                 if (
    //                     order.Loai === "GP" &&
    //                     order.NgayOrder &&
    //                     order.Index === "No" &&
    //                     order.TinhTrangKH !== "Hủy - 14 ngày chưa index" &&
    //                     order.TinhTrangKH !== "Hủy đơn" &&
    //                     order.TinhTrangKH !== "Hủy - no index" &&
    //                     order.TinhTrangKH !== "Hủy - đã index" &&
    //                     order.TinhTrangKH !== "Hủy - 14 ngày không index"
    //                 ) {
    //                     const orderDate = new Date(order.NgayOrder)
    //                     const now = new Date()
    //                     const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))

    //                     if (daysDiff >= 14) {
    //                         const orderRef = ref(database, `orders/${orderIndex}/ChiTietDonHang/${orderKey}`)
    //                         // set(orderRef, { ...order, TinhTrangKH: "Hủy - 14 ngày chưa index" })
    //                     }
    //                 }
    //             }
    //         })
    //     }, 60000) // Check every minute

    //     return () => clearInterval(interval)
    // }, [orders, orderKeys, checkOrderStatus])

    const handleAfterChange = (changes: any, source: any) => {
        if (source === "edit" && Array.isArray(changes)) {
            // Process each change separately
            changes.forEach(async ([row, prop, oldValue, newValue]) => {
                // Skip update if new value is the same as old value
                if (oldValue === newValue) return

                // Skip if this is a summary row
                const isSummaryRow =
                    data[row][0]?.includes("Tổng") ||
                    data[row][0]?.includes("Chưa Index") ||
                    data[row][0]?.includes("Chưa nhập") ||
                    data[row][0]?.includes("Đơn hủy")

                if (isSummaryRow) return

                // Get the order code (Mã đơn) from the current row
                const orderCode = data[row][0]
                if (!orderCode) return

                // Find the matching order in the orders array by Mã đơn
                const orderIdx = orders.findIndex((order) => order.MaDon === orderCode)
                if (orderIdx === -1) return

                // Lấy _parentIndex và _dbIndex từ từng phần tử order
                const detail = orders[orderIdx];
                const parentIndex = detail._parentIndex;
                const dbIndex = detail._dbIndex;
                if (typeof parentIndex !== 'number' || typeof dbIndex !== 'number') return;

                // Get the current order data
                const updatedOrder = { ...orders[orderIdx] }
                const columnName = RowHeader2[Number(prop)]

                // Map table columns to Firebase fields
                switch (columnName) {
                    case "Mã":
                        updatedOrder.MaDon = newValue
                        break
                    case "Loại":
                        updatedOrder.Loai = newValue
                        // Reset status when type changes
                        if (newValue === "GP") {
                            updatedOrder.TinhTrangKH = "Chưa nhập"
                            updatedOrder.TinhTrangNCC = "Chưa nhận đơn"
                        } else {
                            updatedOrder.TinhTrangKH = "Chưa nhập"
                            updatedOrder.TinhTrangNCC = "Chưa nhận đơn"
                        }
                        break
                    case "Ngày Bán":
                        updatedOrder.NgayBan = newValue
                        break
                    case "Text":
                        updatedOrder.TimeText = newValue
                        break
                    case "Site":
                        updatedOrder.Site = newValue
                        break
                    case "Ghi Chú":
                        updatedOrder.Note = newValue
                        break
                    case "Giá Bán":
                        if (updatedOrder.Loai === "GP") {
                            updatedOrder.GiaBanGP = newValue
                        } else if (updatedOrder.Loai === "Text") {
                            updatedOrder.GiaBanText = newValue
                        } else if (updatedOrder.Loai === "Text Home") {
                            updatedOrder.GiaBanTextHome = newValue
                        } else if (updatedOrder.Loai === "Text Header") {
                            updatedOrder.GiaBanTextHeader = newValue
                        }
                        break
                    case "Giá Mua":
                        if (updatedOrder.Loai === "GP") {
                            updatedOrder.GiaMuaGP = newValue
                        } else if (updatedOrder.Loai === "Text") {
                            updatedOrder.GiaMuaText = newValue
                        } else if (updatedOrder.Loai === "Text Home") {
                            updatedOrder.GiaMuaTextHome = newValue
                        } else if (updatedOrder.Loai === "Text Header") {
                            updatedOrder.GiaMuaTextHeader = newValue
                        }
                        break
                    case "Hoa Hồng":
                        if (updatedOrder.Loai === "GP") {
                            updatedOrder.HoaHongGP = newValue
                        } else if (updatedOrder.Loai === "Text") {
                            updatedOrder.HoaHongText = newValue
                        }
                        break
                    case "TTNCC":
                        updatedOrder.TTNCC = newValue
                        break
                    case "Bài Viết":
                        updatedOrder.BaiViet = newValue
                        if (updatedOrder.Loai === "GP") {
                            if (updatedOrder.BaiViet) {
                                updatedOrder.TinhTrangKH = "Đã nhập"
                                // Add NgayOrder when BaiViet is entered
                                const now = new Date()
                                const day = String(now.getDate()).padStart(2, "0")
                                const month = String(now.getMonth() + 1).padStart(2, "0")
                                const year = now.getFullYear()
                                updatedOrder.NgayOrder = `${day}/${month}/${year}`
                                sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Vui lòng truy cập vào https://www.ylink.shop/gp-text để xử lý đơn hàng ${updatedOrder.MaDon}`)
                            } else {
                                updatedOrder.TinhTrangKH = "Chưa nhập"
                            }
                        }
                        break
                    case "Link KQ":
                        updatedOrder.LinkKQ = newValue
                        if (updatedOrder.Loai === "GP") {
                            if (updatedOrder.LinkKQ) {
                                updatedOrder.TinhTrangNCC = "Đã lên bài"
                                const now = new Date()
                                const day = String(now.getDate()).padStart(2, "0")
                                const month = String(now.getMonth() + 1).padStart(2, "0")
                                updatedOrder.NgayBan = `${day}/${month}`
                                // sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã được xử lý, kiểm tra tại https://www.ylink.shop/gp-text/${updatedOrder.MaDon.split("-")[0]}`)
                            } else {
                                updatedOrder.TinhTrangNCC = "Chưa nhận đơn"
                                updatedOrder.NgayBan = ""
                            }
                        }
                        break
                    case "Anchor 1":
                        updatedOrder.Anchor1 = newValue
                        if (updatedOrder.Loai !== "GP") {
                            if (updatedOrder.Anchor1 && updatedOrder.Link1) {
                                updatedOrder.TinhTrangKH = "Đã nhập"
                            } else {
                                updatedOrder.TinhTrangKH = "Chưa nhập"
                            }
                        }
                        break
                    case "Link 1":
                        updatedOrder.Link1 = newValue
                        if (updatedOrder.Loai !== "GP") {
                            if (updatedOrder.Anchor1 && updatedOrder.Link1) {
                                updatedOrder.TinhTrangKH = "Đã nhập"
                                sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Vui lòng truy cập vào https://www.ylink.shop/gp-text để xử lý đơn hàng ${updatedOrder.MaDon}`)
                            } else {
                                updatedOrder.TinhTrangKH = "Chưa nhập"
                            }
                        }
                        break
                    case "Anchor 2":
                        updatedOrder.Anchor2 = newValue
                        if (updatedOrder.Loai !== "GP") {
                            if (updatedOrder.Anchor2 && updatedOrder.Link2) {
                                updatedOrder.TinhTrangKH = "Đã nhập"
                            } else {
                                updatedOrder.TinhTrangKH = "Chưa nhập"
                            }
                        }
                        break
                    case "Link 2":
                        updatedOrder.Link2 = newValue
                        if (updatedOrder.Loai !== "GP") {
                            if (updatedOrder.Anchor2 && updatedOrder.Link2) {
                                updatedOrder.TinhTrangKH = "Đã nhập"
                            } else {
                                updatedOrder.TinhTrangKH = "Chưa nhập"
                            }
                        }
                        break
                    case "Ngày KT":
                        updatedOrder.NgayKT = newValue
                        break
                    case "Index":
                        updatedOrder.Index = newValue
                        const now = new Date()
                        const day = String(now.getDate()).padStart(2, "0")
                        const month = String(now.getMonth() + 1).padStart(2, "0")
                        updatedOrder.NgayKT = `${day}/${month}`

                        // Handle money balance changes based on Index status
                        if (newValue === "Indexed") {
                            // Only process payment if it hasn't been processed before
                            if (!updatedOrder.paymentStatus || updatedOrder.paymentStatus !== "paid") {
                                // Deduct money when Indexed
                                const price = Number(
                                    updatedOrder.Loai === "GP"
                                        ? updatedOrder.GiaBanGP || 0
                                        : updatedOrder.Loai === "Text"
                                            ? updatedOrder.GiaBanText || 0
                                            : updatedOrder.Loai === "TextHome"
                                                ? updatedOrder.GiaBanTextHome || 0
                                                : updatedOrder.GiaBanTextHeader || 0,
                                )
                                updatedOrder.paymentStatus = "paid"
                                // sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã Indexed, kiểm tra tại https://www.ylink.shop/gp-text/${updatedOrder.MaDon.split("-")[0]}`)
                                // sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Đơn hàng ${updatedOrder.MaDon} đã Indexed, số tiền ${price}$ đã được cộng vào ví của bạn, kiểm tra tại https://www.ylink.shop/gp-text `)
                            }
                        } else if (updatedOrder.Index === "Indexed" && newValue !== "Indexed") {
                            // Only process refund if payment was previously processed
                            if (updatedOrder.paymentStatus === "paid") {
                                // Add money back when changing from Indexed to something else
                                const price = Number(
                                    updatedOrder.Loai === "GP"
                                        ? updatedOrder.GiaBanGP || 0
                                        : updatedOrder.Loai === "Text"
                                            ? updatedOrder.GiaBanText || 0
                                            : updatedOrder.Loai === "TextHome"
                                                ? updatedOrder.GiaBanTextHome || 0
                                                : updatedOrder.GiaBanTextHeader || 0,
                                )
                                updatedOrder.paymentStatus1 = "refunded"
                            }
                        }
                        break
                    case "Tên NCC":
                        updatedOrder.TenNCC = newValue
                        break
                    case "Link NCC":
                        updatedOrder.TeleNCC = newValue
                        break
                    case "KH":
                        updatedOrder.TinhTrangKH = newValue;
                        break;
                    case "NCC":
                        updatedOrder.TinhTrangNCC = newValue;
                        // Update NgayBan for non-GP orders when TinhTrangNCC changes to 'Đã lên bài'
                        if (updatedOrder.Loai !== "GP" && updatedOrder.TinhTrangNCC === "Đã lên bài") {
                            const now = new Date();
                            const day = String(now.getDate()).padStart(2, "0");
                            const month = String(now.getMonth() + 1).padStart(2, "0");
                            updatedOrder.NgayBan = `${day}/${month}`;

                            // Only process payment if it hasn't been processed before
                            if (!updatedOrder.paymentStatus || updatedOrder.paymentStatus !== "paid") {
                                // Handle money balance changes when NCC marks as Đã lên bài
                                const price = Number(
                                    updatedOrder.Loai === "GP"
                                        ? updatedOrder.GiaBanGP || 0
                                        : updatedOrder.Loai === "Text"
                                            ? updatedOrder.GiaBanText || 0
                                            : updatedOrder.Loai === "TextHome"
                                                ? updatedOrder.GiaBanTextHome || 0
                                                : updatedOrder.GiaBanTextHeader || 0,
                                );
                                updatedOrder.paymentStatus = "paid";
                                // sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Đơn hàng ${updatedOrder.MaDon} đã hoàn thành, kiểm tra tại https://www.ylink.shop/gp-text`)
                                // sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã hoàn thành, kiểm tra tại https://www.ylink.shop/gp-text/${updatedOrder.MaDon.split("-")[0]}`)
                            }
                        }
                        break;
                }

                // Update the order in Firebase, dùng parentIndex làm index cha
                const orderRef = ref(database, `orders/${parentIndex}/ChiTietDonHang/${dbIndex}`)
                update(orderRef, updatedOrder)
                    .then(() => {
                        if (onOrderUpdate) onOrderUpdate();
                    })
                    .catch((error) => {
                        console.error(`Error updating order ${orderCode}:`, error)
                    })
            })
        }
    }

    // Function to calculate summary rows
    const calculateSummaryRows = useCallback((orders: any[]) => {
        // Initialize summary objects
        const canceledOrders = {
            count: 0,
            totalGiaBan: 0,
            totalGiaMua: 0,
            totalHoaHong: 0,
            totalGiaCuoi: 0,
            totalLoiNhuan: 0,
            totalTTNCC: 0,
        }

        const nonIndexedOrders = {
            count: 0,
            totalGiaBan: 0,
            totalGiaMua: 0,
            totalHoaHong: 0,
            totalGiaCuoi: 0,
            totalLoiNhuan: 0,
            totalTTNCC: 0,
        }

        // Group remaining orders by week
        const weeklyOrders: Record<
            string,
            {
                count: number
                totalGiaBan: number
                totalGiaMua: number
                totalHoaHong: number
                totalGiaCuoi: number
                totalLoiNhuan: number
                totalTTNCC: number
            }
        > = {}

        orders.forEach((order) => {
            const giaBan =
                order.Loai === "GP"
                    ? order.GiaBanGP
                    : order.Loai === "Text"
                        ? order.GiaBanText
                        : order.Loai === "TextHome"
                            ? order.GiaBanTextHome
                            : order.GiaBanTextHeader

            const giaMua =
                order.Loai === "GP"
                    ? order.GiaMuaGP
                    : order.Loai === "Text"
                        ? order.GiaMuaText
                        : order.Loai === "TextHome"
                            ? order.GiaMuaTextHome
                            : order.GiaMuaTextHeader

            const hoaHong = order.Loai === "GP" ? order.HoaHongGP : order.HoaHongText
            const giaCuoi = Math.round(Number(giaMua) - (Number(giaMua) * Number(hoaHong)) / 100)
            const loiNhuan = Math.round(Number(giaBan) - giaCuoi)
            const ttncc = order.TTNCC || 0

            // Check if order is canceled
            const isCanceled =
                order.TinhTrangKH?.includes("Hủy") || order.TinhTrangNCC === "Hủy đơn" || order.TinhTrangNCC === "Đồng ý hủy"

            // Check if order is non-indexed
            const isNonIndexed =
                order.Index === "No" && order.TinhTrangKH === "Đã nhập" && order.TinhTrangNCC === "Đã lên bài"

            if (isCanceled) {
                canceledOrders.count++
                canceledOrders.totalGiaBan += Number(giaBan) || 0
                canceledOrders.totalGiaMua += Number(giaMua) || 0
                canceledOrders.totalHoaHong += Number(hoaHong) || 0
                canceledOrders.totalGiaCuoi += Number(giaCuoi) || 0
                canceledOrders.totalLoiNhuan += Number(loiNhuan) || 0
                canceledOrders.totalTTNCC += Number(ttncc) || 0
            } else if (isNonIndexed) {
                nonIndexedOrders.count++
                nonIndexedOrders.totalGiaBan += Number(giaBan) || 0
                nonIndexedOrders.totalGiaMua += Number(giaMua) || 0
                nonIndexedOrders.totalHoaHong += Number(hoaHong) || 0
                nonIndexedOrders.totalGiaCuoi += Number(giaCuoi) || 0
                nonIndexedOrders.totalLoiNhuan += Number(loiNhuan) || 0
                nonIndexedOrders.totalTTNCC += Number(ttncc) || 0
            } else if (order.NgayKT) {
                // Group by week based on NgayKT
                // Format: DD/MM
                const [day, month] = order.NgayKT.split("/")
                if (day && month) {
                    const date = new Date(2023, Number(month) - 1, Number(day))
                    const weekNumber = getWeekNumber(date)
                    const weekKey = `Tổng`

                    if (!weeklyOrders[weekKey]) {
                        weeklyOrders[weekKey] = {
                            count: 0,
                            totalGiaBan: 0,
                            totalGiaMua: 0,
                            totalHoaHong: 0,
                            totalGiaCuoi: 0,
                            totalLoiNhuan: 0,
                            totalTTNCC: 0,
                        }
                    }

                    weeklyOrders[weekKey].count++
                    weeklyOrders[weekKey].totalGiaBan += Number(giaBan) || 0
                    weeklyOrders[weekKey].totalGiaMua += Number(giaMua) || 0
                    weeklyOrders[weekKey].totalHoaHong += Number(hoaHong) || 0
                    weeklyOrders[weekKey].totalGiaCuoi += Number(giaCuoi) || 0
                    weeklyOrders[weekKey].totalLoiNhuan += Number(loiNhuan) || 0
                    weeklyOrders[weekKey].totalTTNCC += Number(ttncc) || 0
                }
            }
        })

        // Convert weekly orders to array
        const weeklyOrdersArray = Object.entries(weeklyOrders).map(([week, data]) => ({
            week,
            ...data,
        }))

        return {
            canceledOrders,
            nonIndexedOrders,
            weeklyOrders: weeklyOrdersArray,
        }
    }, [])

    // Helper function to get week number
    const getWeekNumber = (date: Date) => {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
    }

    const data = useMemo(() => {
        // Calculate summary data
        const summary = calculateSummaryRows(filteredOrders)

        // Group orders by category
        const weeklyOrders: Record<string, any[]> = {}
        const nonIndexedOrders: any[] = []
        const notEnteredOrders: any[] = []
        const canceledOrders: any[] = []
        const otherOrders: any[] = []

        filteredOrders.forEach((order) => {
            // Check if order is canceled
            const isCanceled =
                order.TinhTrangKH === "Hủy đơn" ||
                order.TinhTrangNCC === "Hủy đơn" ||
                (order.TinhTrangKH === "Hủy - đã index" && order.TinhTrangNCC === "Đồng ý hủy") ||
                order.TinhTrangKH === "Hủy - 14 ngày không index" ||
                order.TinhTrangKH === "Hủy - trước 12h" ||
                order.TinhTrangKH === "Hủy - chưa lên bài" ||
                (order.TinhTrangKH === "Hủy - đã lên bài" && order.TinhTrangNCC === "Đồng ý hủy")

            // Check if order is non-indexed
            const isNonIndexed =
                order.Loai === "GP" &&
                order.Index === "No" &&
                order.TinhTrangKH === "Đã nhập" &&
                order.TinhTrangNCC === "Đã lên bài"

            // Check if order belongs to weekly section
            const isGPWeeklyOrder =
                order.Loai === "GP" &&
                (order.Index === "Indexed" || order.Index === "Mất - Index") &&
                (order.TinhTrangKH === "Đã nhập" ||
                    order.TinhTrangKH === "Đơn OK" ||
                    order.TinhTrangKH === "Hủy - đã index" ||
                    order.TinhTrangKH === "GP 15 ngày mất" ||
                    order.TinhTrangKH === "GP 20 ngày mất" ||
                    order.TinhTrangKH === "GP 30 ngày mất" ||
                    order.TinhTrangKH === "GP 80 ngày mất") &&
                (order.TinhTrangNCC === "Đã lên bài" ||
                    order.TinhTrangNCC === "Đơn OK" ||
                    order.TinhTrangNCC === "Từ chối hủy" ||
                    order.TinhTrangNCC === "Đồng ý hoàn" ||
                    order.TinhTrangNCC === "Từ chối hoàn") &&
                order.NgayKT

            const isNonGPWeeklyOrder =
                order.Loai !== "GP" &&
                (order.TinhTrangKH === "Đã nhập" ||
                    order.TinhTrangKH === "Đơn OK" ||
                    order.TinhTrangKH === "Hủy - đã lên bài" ||
                    order.TinhTrangKH === "Text 1-3 ngày mất" ||
                    order.TinhTrangKH === "Text 3-7 ngày mất" ||
                    order.TinhTrangKH === "Text 7-14 ngày mất" ||
                    order.TinhTrangKH === "Text 14-21 ngày mất" ||
                    order.TinhTrangKH === "Text 21-25 ngày mất") &&
                (order.TinhTrangNCC === "Đã lên bài" ||
                    order.TinhTrangNCC === "Đơn OK" ||
                    order.TinhTrangNCC === "Đồng ý hoàn" ||
                    order.TinhTrangNCC === "Từ chối hoàn") &&
                order.NgayBan

            const isWeeklyOrder = isGPWeeklyOrder || isNonGPWeeklyOrder

            if (isCanceled) {
                canceledOrders.push(order)
            } else if (isNonIndexed) {
                nonIndexedOrders.push(order)
            } else if (isWeeklyOrder) {
                // Group by week based on NgayKT for GP orders and NgayBan for non-GP orders
                const dateStr = order.Loai === "GP" ? order.NgayKT : order.NgayBan
                if (dateStr) {
                    const [day, month] = dateStr.split("/")
                    if (day && month) {
                        const date = new Date(2023, Number(month) - 1, Number(day))
                        const weekNumber = getWeekNumber(date)
                        const weekKey = `Tổng`

                        if (!weeklyOrders[weekKey]) {
                            weeklyOrders[weekKey] = []
                        }

                        weeklyOrders[weekKey].push(order)
                    }
                }
            } else {
                notEnteredOrders.push(order)
            }
        })

        // Create the final data array with summary rows and their corresponding order rows
        const finalData: any[] = []

        if (mergeMode) {
            // Merge mode: Combine all non-canceled orders into a single "Tổng" section
            const allNonCanceledOrders = [
                ...Object.values(weeklyOrders).flat(),
                ...nonIndexedOrders,
                ...notEnteredOrders
            ]

            if (allNonCanceledOrders.length > 0) {
                // Sort allNonCanceledOrders by MaDon (Mã) A-Z
                allNonCanceledOrders.sort((a, b) => {
                    if (!a.MaDon) return 1;
                    if (!b.MaDon) return -1;
                    return a.MaDon.localeCompare(b.MaDon, undefined, { numeric: true, sensitivity: 'base' });
                });

                // Calculate totals for all non-canceled orders
                const mergedSummary = allNonCanceledOrders.reduce(
                    (acc, order) => {
                        const giaBan =
                            Number(
                                order.Loai === "GP"
                                    ? order.GiaBanGP
                                    : order.Loai === "Text"
                                        ? order.GiaBanText
                                        : order.Loai === "TextHome"
                                            ? order.GiaBanTextHome
                                            : order.GiaBanTextHeader,
                            ) || 0

                        const giaMua =
                            Number(
                                order.Loai === "GP"
                                    ? order.GiaMuaGP
                                    : order.Loai === "Text"
                                        ? order.GiaMuaText
                                        : order.Loai === "TextHome"
                                            ? order.GiaMuaTextHome
                                            : order.GiaMuaTextHeader,
                            ) || 0

                        const hoaHong = Number(order.Loai === "GP" ? order.HoaHongGP : order.HoaHongText) || 0
                        const giaCuoi = Math.round(Number(giaMua) - (Number(giaMua) * Number(hoaHong)) / 100)
                        const loiNhuan = Math.round(giaBan - giaCuoi)
                        const ttncc = Number(order.TTNCC) || 0

                        acc.count++
                        acc.totalGiaBan += giaBan
                        acc.totalGiaMua += giaMua
                        acc.totalHoaHong += hoaHong
                        acc.totalGiaCuoi += giaCuoi
                        acc.totalLoiNhuan += loiNhuan
                        acc.totalTTNCC += ttncc

                        return acc
                    },
                    {
                        count: 0,
                        totalGiaBan: 0,
                        totalGiaMua: 0,
                        totalHoaHong: 0,
                        totalGiaCuoi: 0,
                        totalLoiNhuan: 0,
                        totalTTNCC: 0,
                    },
                )

                // Add merged summary row
                finalData.push([
                    "Tổng",
                    "",
                    "",
                    "",
                    "",
                    `CK (${chietKhau || 0}%)`,
                    chietKhau ? mergedSummary.totalGiaBan - (mergedSummary.totalGiaBan * chietKhau / 100) : mergedSummary.totalGiaBan,
                    mergedSummary.totalGiaMua,
                    mergedSummary.totalHoaHong,
                    mergedSummary.totalGiaCuoi,
                    mergedSummary.totalTTNCC,
                    chietKhau ? Math.round(((mergedSummary.totalGiaBan - (mergedSummary.totalGiaBan * chietKhau / 100)) - mergedSummary.totalGiaCuoi) * 100) / 100 : Math.round(mergedSummary.totalLoiNhuan * 100) / 100,
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
                    "",
                    "bg-blue-300", // Add background color for merged summary
                ])

                // Add all non-canceled orders (already sorted)
                allNonCanceledOrders.forEach((order) => {
                    const giaBan =
                        Number(
                            order.Loai === "GP"
                                ? order.GiaBanGP
                                : order.Loai === "Text"
                                    ? order.GiaBanText
                                    : order.Loai === "TextHome"
                                        ? order.GiaBanTextHome
                                        : order.GiaBanTextHeader,
                        ) || 0

                    const giaMua =
                        Number(
                            order.Loai === "GP"
                                ? order.GiaMuaGP
                                : order.Loai === "Text"
                                    ? order.GiaMuaText
                                    : order.Loai === "TextHome"
                                        ? order.GiaMuaTextHome
                                        : order.GiaMuaTextHeader,
                        ) || 0

                    const hoaHong = Number(order.Loai === "GP" ? order.HoaHongGP : order.HoaHongText) || 0
                    const giaCuoi = Math.round(Number(giaMua) - (Number(giaMua) * Number(hoaHong)) / 100)
                    const loiNhuan = Math.round(giaBan - giaCuoi)
                    const timeText = order.Loai === "GP" ? "" : order.TimeText
                    const index = order.Loai === "GP" ? order.Index : ""

                    finalData.push([
                        order.MaDon,
                        order.Loai,
                        order.NgayBan,
                        timeText,
                        order.Site,
                        order.Note,
                        giaBan,
                        giaMua,
                        hoaHong,
                        giaCuoi,
                        order.TTNCC || "",
                        loiNhuan,
                        order.BaiViet,
                        order.LinkKQ,
                        order.Anchor1,
                        order.Link1,
                        order.Anchor2,
                        order.Link2,
                        order.NgayKT,
                        index,
                        order.TenNCC,
                        order.TeleNCC,
                        order.TinhTrangKH || "Chưa nhập",
                        order.TinhTrangNCC || "Chưa nhận đơn",
                        order.TraoDoi,
                    ])
                })
            }
        } else {
            // Normal mode: Show separate sections
            // Add weekly summaries and their orders
            Object.entries(weeklyOrders)
                .sort(([weekA], [weekB]) => {
                    // Extract week numbers from "Tổng X" format
                    const weekNumA = Number.parseInt(weekA.split(" ")[1])
                    const weekNumB = Number.parseInt(weekB.split(" ")[1])
                    return weekNumA - weekNumB
                })
                .forEach(([weekKey, weekOrders]) => {
                    // Calculate totals for this week
                    const weekSummary = weekOrders.reduce(
                        (acc, order) => {
                            const giaBan =
                                Number(
                                    order.Loai === "GP"
                                        ? order.GiaBanGP
                                        : order.Loai === "Text"
                                            ? order.GiaBanText
                                            : order.Loai === "TextHome"
                                                ? order.GiaBanTextHome
                                                : order.GiaBanTextHeader,
                                ) || 0

                            const giaMua =
                                Number(
                                    order.Loai === "GP"
                                        ? order.GiaMuaGP
                                        : order.Loai === "Text"
                                            ? order.GiaMuaText
                                            : order.Loai === "TextHome"
                                                ? order.GiaMuaTextHome
                                                : order.GiaMuaTextHeader,
                                ) || 0

                            const hoaHong = Number(order.Loai === "GP" ? order.HoaHongGP : order.HoaHongText) || 0
                            const giaCuoi = Math.round(Number(giaMua) - (Number(giaMua) * Number(hoaHong)) / 100)
                            const loiNhuan = Math.round(Number(giaBan) - giaCuoi)
                            const ttncc = Number(order.TTNCC) || 0

                            acc.count++
                            acc.totalGiaBan += giaBan
                            acc.totalGiaMua += giaMua
                            acc.totalHoaHong += hoaHong
                            acc.totalGiaCuoi += giaCuoi
                            acc.totalLoiNhuan += loiNhuan
                            acc.totalTTNCC += ttncc

                            return acc
                        },
                        {
                            count: 0,
                            totalGiaBan: 0,
                            totalGiaMua: 0,
                            totalHoaHong: 0,
                            totalGiaCuoi: 0,
                            totalLoiNhuan: 0,
                            totalTTNCC: 0,
                        },
                    )

                    // Only add weekly summary row if there are orders
                    if (weekSummary.count > 0) {
                        // Add weekly summary row
                        finalData.push([
                            weekKey,
                            "",
                            "",
                            "",
                            "",
                            `CK (${chietKhau || 0}%)`,
                            chietKhau ? weekSummary.totalGiaBan - (weekSummary.totalGiaBan * chietKhau / 100) : weekSummary.totalGiaBan,
                            weekSummary.totalGiaMua,
                            weekSummary.totalHoaHong,
                            weekSummary.totalGiaCuoi,
                            weekSummary.totalTTNCC,
                            chietKhau ? Math.round(((weekSummary.totalGiaBan - (weekSummary.totalGiaBan * chietKhau / 100)) - weekSummary.totalGiaCuoi) * 100) / 100 : Math.round(weekSummary.totalLoiNhuan * 100) / 100,
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
                            "bg-green-300", // Add background color for weekly summary
                        ])

                        // Add orders for this week
                        weekOrders.forEach((order) => {
                            const giaBan =
                                Number(
                                    order.Loai === "GP"
                                        ? order.GiaBanGP
                                        : order.Loai === "Text"
                                            ? order.GiaBanText
                                            : order.Loai === "TextHome"
                                                ? order.GiaBanTextHome
                                                : order.GiaBanTextHeader,
                                ) || 0

                            const giaMua =
                                Number(
                                    order.Loai === "GP"
                                        ? order.GiaMuaGP
                                        : order.Loai === "Text"
                                            ? order.GiaMuaText
                                            : order.Loai === "TextHome"
                                                ? order.GiaMuaTextHome
                                                : order.GiaMuaTextHeader,
                                ) || 0

                            const hoaHong = Number(order.Loai === "GP" ? order.HoaHongGP : order.HoaHongText) || 0
                            const giaCuoi = Math.round(Number(giaMua) - (Number(giaMua) * Number(hoaHong)) / 100)
                            const loiNhuan = Math.round(Number(giaBan) - giaCuoi)
                            const timeText = order.Loai === "GP" ? "" : order.TimeText
                            const index = order.Loai === "GP" ? order.Index : ""

                            // // Update Status to "Đã hoàn thành" for weekly orders
                            // if (order.Status !== "Đã hoàn thành") {
                            //     const orderRef = ref(database, `orders/${orderIndex}/ChiTietDonHang/${orderKeys[orders.findIndex((o) => o.MaDon === order.MaDon)]}`)
                            //     set(orderRef, { ...order, Status: "Đã hoàn thành" })
                            // }

                            finalData.push([
                                order.MaDon,
                                order.Loai,
                                order.NgayBan,
                                timeText,
                                order.Site,
                                order.Note,
                                giaBan,
                                giaMua,
                                hoaHong,
                                giaCuoi,
                                order.TTNCC || "",
                                loiNhuan,
                                order.BaiViet,
                                order.LinkKQ,
                                order.Anchor1,
                                order.Link1,
                                order.Anchor2,
                                order.Link2,
                                order.NgayKT,
                                index,
                                order.TenNCC,
                                order.TeleNCC,
                                order.TinhTrangKH || "Chưa nhập",
                                order.TinhTrangNCC || "Chưa nhận đơn",
                                order.TraoDoi,
                            ])
                        })
                    }
                })

            // Only add non-indexed summary if there are non-indexed orders
            if (nonIndexedOrders.length > 0) {
                const nonIndexedSummary = nonIndexedOrders.reduce(
                    (acc, order) => {
                        const giaBan =
                            Number(
                                order.Loai === "GP"
                                    ? order.GiaBanGP
                                    : order.Loai === "Text"
                                        ? order.GiaBanText
                                        : order.Loai === "TextHome"
                                            ? order.GiaBanTextHome
                                            : order.GiaBanTextHeader,
                            ) || 0

                        const giaMua =
                            Number(
                                order.Loai === "GP"
                                    ? order.GiaMuaGP
                                    : order.Loai === "Text"
                                        ? order.GiaMuaText
                                        : order.Loai === "TextHome"
                                            ? order.GiaMuaTextHome
                                            : order.GiaBanTextHeader,
                            ) || 0

                        const hoaHong = Number(order.Loai === "GP" ? order.HoaHongGP : order.HoaHongText) || 0
                        const giaCuoi = Math.round(Number(giaMua) - (Number(giaMua) * Number(hoaHong)) / 100)
                        const loiNhuan = Math.round(Number(giaBan) - giaCuoi)
                        const ttncc = Number(order.TTNCC) || 0

                        acc.count++
                        acc.totalGiaBan += giaBan
                        acc.totalGiaMua += giaMua
                        acc.totalHoaHong += hoaHong
                        acc.totalGiaCuoi += giaCuoi
                        acc.totalLoiNhuan += loiNhuan
                        acc.totalTTNCC += ttncc

                        return acc
                    },
                    {
                        count: 0,
                        totalGiaBan: 0,
                        totalGiaMua: 0,
                        totalHoaHong: 0,
                        totalGiaCuoi: 0,
                        totalLoiNhuan: 0,
                        totalTTNCC: 0,
                    },
                )

                finalData.push([
                    `Chưa Index`,
                    "",
                    "",
                    "",
                    "",
                    `CK (${chietKhau || 0}%)`,
                    chietKhau ? nonIndexedSummary.totalGiaBan - (nonIndexedSummary.totalGiaBan * chietKhau / 100) : nonIndexedSummary.totalGiaBan,
                    nonIndexedSummary.totalGiaMua,
                    nonIndexedSummary.totalHoaHong,
                    nonIndexedSummary.totalGiaCuoi,
                    nonIndexedSummary.totalTTNCC,
                    chietKhau ? Math.round(((nonIndexedSummary.totalGiaBan - (nonIndexedSummary.totalGiaBan * chietKhau / 100)) - nonIndexedSummary.totalGiaCuoi) * 100) / 100 : Math.round(nonIndexedSummary.totalLoiNhuan * 100) / 100,
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
                    "bg-purple-300", // Add background color for non-indexed summary
                ])

                // Add non-indexed orders
                nonIndexedOrders.forEach((order) => {
                    const giaBan =
                        Number(
                            order.Loai === "GP"
                                ? order.GiaBanGP
                                : order.Loai === "Text"
                                    ? order.GiaBanText
                                    : order.Loai === "TextHome"
                                        ? order.GiaBanTextHome
                                        : order.GiaBanTextHeader,
                        ) || 0

                    const giaMua =
                        Number(
                            order.Loai === "GP"
                                ? order.GiaMuaGP
                                : order.Loai === "Text"
                                    ? order.GiaMuaText
                                    : order.Loai === "TextHome"
                                        ? order.GiaMuaTextHome
                                        : order.GiaMuaTextHeader,
                        ) || 0

                    const hoaHong = Number(order.Loai === "GP" ? order.HoaHongGP : order.HoaHongText) || 0
                    const giaCuoi = Math.round(Number(giaMua) - (Number(giaMua) * Number(hoaHong)) / 100)
                    const loiNhuan = Math.round(Number(giaBan) - giaCuoi)
                    const timeText = order.Loai === "GP" ? "" : order.TimeText
                    const index = order.Loai === "GP" ? order.Index : ""

                    finalData.push([
                        order.MaDon,
                        order.Loai,
                        order.NgayBan,
                        timeText,
                        order.Site,
                        order.Note,
                        giaBan,
                        giaMua,
                        hoaHong,
                        giaCuoi,
                        order.TTNCC || "",
                        loiNhuan,
                        order.BaiViet,
                        order.LinkKQ,
                        order.Anchor1,
                        order.Link1,
                        order.Anchor2,
                        order.Link2,
                        order.NgayKT,
                        index,
                        order.TenNCC,
                        order.TeleNCC,
                        order.TinhTrangKH || "Chưa nhập",
                        order.TinhTrangNCC || "Chưa nhận đơn",
                        order.TraoDoi,
                    ])
                })
            }

            // Only add not entered summary if there are not entered orders
            if (notEnteredOrders.length > 0) {
                const notEnteredSummary = notEnteredOrders.reduce(
                    (acc, order) => {
                        const giaBan =
                            Number(
                                order.Loai === "GP"
                                    ? order.GiaBanGP
                                    : order.Loai === "Text"
                                        ? order.GiaBanText
                                        : order.Loai === "TextHome"
                                            ? order.GiaBanTextHome
                                            : order.GiaBanTextHeader,
                            ) || 0

                        const giaMua =
                            Number(
                                order.Loai === "GP"
                                    ? order.GiaMuaGP
                                    : order.Loai === "Text"
                                        ? order.GiaMuaText
                                        : order.Loai === "TextHome"
                                            ? order.GiaMuaTextHome
                                            : order.GiaMuaTextHeader,
                            ) || 0

                        const hoaHong = Number(order.Loai === "GP" ? order.HoaHongGP : order.HoaHongText) || 0
                        const giaCuoi = Math.round(Number(giaMua) - (Number(giaMua) * Number(hoaHong)) / 100)
                        const loiNhuan = Math.round(Number(giaBan) - giaCuoi)
                        const ttncc = Number(order.TTNCC) || 0

                        acc.count++
                        acc.totalGiaBan += giaBan
                        acc.totalGiaMua += giaMua
                        acc.totalHoaHong += hoaHong
                        acc.totalGiaCuoi += giaCuoi
                        acc.totalLoiNhuan += loiNhuan
                        acc.totalTTNCC += ttncc

                        return acc
                    },
                    {
                        count: 0,
                        totalGiaBan: 0,
                        totalGiaMua: 0,
                        totalHoaHong: 0,
                        totalGiaCuoi: 0,
                        totalLoiNhuan: 0,
                        totalTTNCC: 0,
                    },
                )

                finalData.push([
                    `Chưa nhập`,
                    "",
                    "",
                    "",
                    "",
                    `CK (${chietKhau || 0}%)`,
                    chietKhau ? notEnteredSummary.totalGiaBan - (notEnteredSummary.totalGiaBan * chietKhau / 100) : notEnteredSummary.totalGiaBan,
                    notEnteredSummary.totalGiaMua,
                    notEnteredSummary.totalHoaHong,
                    notEnteredSummary.totalGiaCuoi,
                    notEnteredSummary.totalTTNCC,
                    chietKhau ? Math.round(((notEnteredSummary.totalGiaBan - (notEnteredSummary.totalGiaBan * chietKhau / 100)) - notEnteredSummary.totalGiaCuoi) * 100) / 100 : Math.round(notEnteredSummary.totalLoiNhuan * 100) / 100,
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
                    "bg-orange-300", // Add background color for not entered summary
                ])

                // Add not entered orders
                notEnteredOrders.forEach((order) => {
                    const giaBan =
                        Number(
                            order.Loai === "GP"
                                ? order.GiaBanGP
                                : order.Loai === "Text"
                                    ? order.GiaBanText
                                    : order.Loai === "TextHome"
                                        ? order.GiaBanTextHome
                                        : order.GiaBanTextHeader,
                        ) || 0

                    const giaMua =
                        Number(
                            order.Loai === "GP"
                                ? order.GiaMuaGP
                                : order.Loai === "Text"
                                    ? order.GiaMuaText
                                    : order.Loai === "TextHome"
                                        ? order.GiaMuaTextHome
                                        : order.GiaMuaTextHeader,
                        ) || 0

                    const hoaHong = Number(order.Loai === "GP" ? order.HoaHongGP : order.HoaHongText) || 0
                    const giaCuoi = Math.round(Number(giaMua) - (Number(giaMua) * Number(hoaHong)) / 100)
                    const loiNhuan = Math.round(Number(giaBan) - giaCuoi)
                    const timeText = order.Loai === "GP" ? "" : order.TimeText
                    const index = order.Loai === "GP" ? order.Index : ""

                    finalData.push([
                        order.MaDon,
                        order.Loai,
                        order.NgayBan,
                        timeText,
                        order.Site,
                        order.Note,
                        giaBan,
                        giaMua,
                        hoaHong,
                        giaCuoi,
                        order.TTNCC || "",
                        loiNhuan,
                        order.BaiViet,
                        order.LinkKQ,
                        order.Anchor1,
                        order.Link1,
                        order.Anchor2,
                        order.Link2,
                        order.NgayKT,
                        index,
                        order.TenNCC,
                        order.TeleNCC,
                        order.TinhTrangKH || "Chưa nhập",
                        order.TinhTrangNCC || "Chưa nhận đơn",
                        order.TraoDoi,
                    ])
                })
            }
        }

        // Only add canceled orders summary if there are canceled orders
        if (canceledOrders.length > 0) {
            const canceledSummary = canceledOrders.reduce(
                (acc, order) => {
                    const giaBan =
                        Number(
                            order.Loai === "GP"
                                ? order.GiaBanGP
                                : order.Loai === "Text"
                                    ? order.GiaBanText
                                    : order.Loai === "TextHome"
                                        ? order.GiaBanTextHome
                                        : order.GiaBanTextHeader,
                        ) || 0

                    const giaMua =
                        Number(
                            order.Loai === "GP"
                                ? order.GiaMuaGP
                                : order.Loai === "Text"
                                    ? order.GiaMuaText
                                    : order.Loai === "TextHome"
                                        ? order.GiaMuaTextHome
                                        : order.GiaMuaTextHeader,
                        ) || 0

                    const hoaHong = Number(order.Loai === "GP" ? order.HoaHongGP : order.HoaHongText) || 0
                    const giaCuoi = Math.round(Number(giaMua) - (Number(giaMua) * Number(hoaHong)) / 100)
                    const loiNhuan = Math.round(Number(giaBan) - giaCuoi)
                    const ttncc = Number(order.TTNCC) || 0

                    acc.count++
                    acc.totalGiaBan += giaBan
                    acc.totalGiaMua += giaMua
                    acc.totalHoaHong += hoaHong
                    acc.totalGiaCuoi += giaCuoi
                    acc.totalLoiNhuan += loiNhuan
                    acc.totalTTNCC += ttncc

                    return acc
                },
                {
                    count: 0,
                    totalGiaBan: 0,
                    totalGiaMua: 0,
                    totalHoaHong: 0,
                    totalGiaCuoi: 0,
                    totalLoiNhuan: 0,
                    totalTTNCC: 0,
                },
            )

            finalData.push([
                `Đơn hủy`,
                "",
                "",
                "",
                "",
                "",
                canceledSummary.totalGiaBan,
                canceledSummary.totalGiaMua,
                canceledSummary.totalHoaHong,
                canceledSummary.totalGiaCuoi,
                canceledSummary.totalTTNCC,
                canceledSummary.totalLoiNhuan,
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
                "bg-red-300", // Add background color for canceled orders summary
            ])

            // Add canceled orders
            canceledOrders.forEach((order) => {
                const giaBan =
                    Number(
                        order.Loai === "GP"
                            ? order.GiaBanGP
                            : order.Loai === "Text"
                                ? order.GiaBanText
                                : order.Loai === "TextHome"
                                    ? order.GiaBanTextHome
                                    : order.GiaBanTextHeader,
                    ) || 0

                const giaMua =
                    Number(
                        order.Loai === "GP"
                            ? order.GiaMuaGP
                            : order.Loai === "Text"
                                ? order.GiaMuaText
                                : order.Loai === "TextHome"
                                    ? order.GiaMuaTextHome
                                    : order.GiaMuaTextHeader,
                    ) || 0

                const hoaHong = Number(order.Loai === "GP" ? order.HoaHongGP : order.HoaHongText) || 0
                const giaCuoi = Math.round(Number(giaMua) - (Number(giaMua) * Number(hoaHong)) / 100)
                const loiNhuan = Math.round(Number(giaBan) - giaCuoi)
                const timeText = order.Loai === "GP" ? "" : order.TimeText
                const index = order.Loai === "GP" ? order.Index : ""

                finalData.push([
                    order.MaDon,
                    order.Loai,
                    order.NgayBan,
                    timeText,
                    order.Site,
                    order.Note,
                    giaBan,
                    giaMua,
                    hoaHong,
                    giaCuoi,
                    order.TTNCC || "",
                    loiNhuan,
                    order.BaiViet,
                    order.LinkKQ,
                    order.Anchor1,
                    order.Link1,
                    order.Anchor2,
                    order.Link2,
                    order.NgayKT,
                    index,
                    order.TenNCC,
                    order.TeleNCC,
                    order.TinhTrangKH || "Chưa nhập",
                    order.TinhTrangNCC || "Chưa nhận đơn",
                    order.TraoDoi,
                ])
            })
        }

        return finalData
    }, [filteredOrders, calculateSummaryRows, orders, orderKeys, mergeMode, chietKhau])

    // Load chat messages when currentChatOrderId changes
    useEffect(() => {
        if (!currentChatOrderId) return

        const ordersRef = ref(database, `orders/${orderIndex}/ChiTietDonHang`)

        const onOrdersChange = (snapshot: any) => {
            if (snapshot.exists()) {
                const ordersData = snapshot.val()
                const ordersArray = Array.isArray(ordersData) ? ordersData : ordersData.orders || []

                // Find the order with matching MaDon
                const order = ordersArray.find((order: any) => order.MaDon === currentChatOrderId)

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

    // Function to send a new chat message
    const sendChatMessage = useCallback(async () => {
        if (!currentChatOrderId || !newChatMessage.trim()) return

        // Get current date in DD/MM/YYYY format
        const now = new Date()
        const day = String(now.getDate()).padStart(2, "0")
        const month = String(now.getMonth() + 1).padStart(2, "0")
        const year = now.getFullYear()
        const ngayChat = `${day}/${month}/${year}`

        // Nếu là khách hàng thì không có userInfo, tạo message với tên mặc định
        let message: ChatMessage
        if (userInfo?.role === "Khách hàng" || (!userInfo && (typeof window !== 'undefined' && localStorage.getItem('role') === 'Khách hàng'))) {
            message = {
                text: newChatMessage.trim(),
                sender: "Khách ẩn danh",
                senderRole: "Khách hàng",
                timestamp: Date.now(),
                ngayChat: ngayChat,
                name: "Khách ẩn danh",
            }
        } else {
            message = {
                text: newChatMessage.trim(),
                sender: userInfo?.displayName || userInfo?.username || "Unknown User",
                senderRole: userInfo?.role || "NCC",
                timestamp: Date.now(),
                ngayChat: ngayChat,
            }
            if (userInfo?.role === "NCC") {
                message.supplierName = supplierName || userInfo?.name || userInfo?.displayName || ""
            } else if (userInfo?.role === "Khách hàng") {
                message.name = userInfo?.username || userInfo?.name || userInfo?.displayName || "Khách ẩn danh"
            }
        }

        try {
            // Get the current orders array
            const ordersRef = ref(database, `orders/${orderIndex}/ChiTietDonHang`)
            const snapshot = await get(ordersRef)

            if (snapshot.exists()) {
                const ordersData = snapshot.val()

                // Handle both array and object structures
                let ordersArray: any[] = []
                if (Array.isArray(ordersData)) {
                    ordersArray = ordersData
                } else if (ordersData.orders && Array.isArray(ordersData.orders)) {
                    ordersArray = ordersData.orders
                } else {
                    // If it's an object with numeric keys, convert to array
                    ordersArray = Object.values(ordersData)
                }

                // Find the order with matching MaDon
                const orderIndex = ordersArray.findIndex((order: any) => order.MaDon === currentChatOrderId)

                if (orderIndex !== -1) {
                    // Create or update the chat array for this order
                    const updatedOrder = {
                        ...ordersArray[orderIndex],
                        chat: [...(ordersArray[orderIndex].chat || []), message],
                    }

                    // Update the order in the array
                    ordersArray[orderIndex] = updatedOrder
                    // Send notification based on sender role
                    if (userInfo?.role === "Khách hàng") {
                        // sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `KH đơn ${currentChatOrderId} - ` + newChatMessage.trim())
                    } else if (userInfo?.role === "NCC") {
                        // sheetApiRequest.getIDKH(updatedOrder.TenKH, `NCC đơn ${currentChatOrderId} - ` + newChatMessage.trim())
                    }
                    // Save the updated orders array back to Firebase
                    await update(ordersRef, ordersArray)
                    setNewChatMessage("")


                } else {
                    console.error("Order not found:", currentChatOrderId)
                }
            }
        } catch (error) {
            console.error("Error sending message:", error)
        }
    }, [currentChatOrderId, newChatMessage, userInfo, supplierName])

    // Add this function to handle order selection
    const handleOrderSelect = (order: any) => {
        setSelectedOrder(order)
    }

    // Modify the chatRenderer to update selected order
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
            // Get the physical row index
            const physicalRow = instance.toPhysicalRow(row)

            // Get the full row data from the data array
            const fullRowData: any = instance.getDataAtRow(physicalRow)

            // Skip if this is a summary row
            const isSummaryRow =
                fullRowData[0]?.includes("Tổng") ||
                fullRowData[0]?.includes("Chưa Index") ||
                fullRowData[0]?.includes("Chưa nhập") ||
                fullRowData[0]?.includes("Đơn hủy")

            if (isSummaryRow) {
                td.innerHTML = ""
                return td
            }

            // Get the order code (Mã đơn) from the current row
            const orderCode = fullRowData[0]
            if (!orderCode) {
                td.innerHTML = ""
                return td
            }

            // Create a button element
            const button = document.createElement("button")
            button.textContent = "Trao đổi"
            button.className = "bg-green-600 hover:bg-green-700 text-white px-4 py-0.5 rounded"

            // Add a click event listener to open the chat dialog
            button.addEventListener("click", () => {

                // Find the order in the orders array
                const order = orders.find((o) => o.MaDon === orderCode)
                if (order) {
                    handleOrderSelect(order)
                }

                // Open the chat dialog
                setCurrentChatOrderId(orderCode)
                setChatDialogOpen(true)
            })

            // Clear the cell content and append the button
            td.innerHTML = ""
            td.appendChild(button)

            return td
        },
        [setCurrentChatOrderId, setChatDialogOpen, orders],
    )

    const RowHeader1: NestedColumnHeader[] = [
        { label: `Tên: ${userInfo?.username}`, colspan: 2 },
        { label: "Time", colspan: 2 },
        { label: "Thông Tin WEB", colspan: 2 },
        { label: "TIỀN NÈ", colspan: 6 },
        { label: "INFO Bài", colspan: 6 },
        { label: "Kiểm Tra", colspan: 2 },
        { label: "Người Bán", colspan: 2 },
        { label: "Tình Trạng", colspan: 2 },
    ]

    // Xác định các cột cần ẩn nếu không có role hoặc không có userInfo
    const columnsToHideIfNoRole = [
        RowHeader2.indexOf("Giá Mua"),
        RowHeader2.indexOf("Hoa Hồng"),
        RowHeader2.indexOf("Giá Cuối"),
        RowHeader2.indexOf("TTNCC"),
        RowHeader2.indexOf("Lợi Nhuận"),
        RowHeader2.indexOf("Tên NCC"),
        RowHeader2.indexOf("Link NCC"),
    ].filter(i => i !== -1);

    return (
        <>
            {/* Floating toggle button for merge mode */}
            <div className="fixed top-1 left-1 z-50">
                <button
                    onClick={() => setMergeMode(!mergeMode)}
                    className={`px-3 py-2 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 text-white font-medium ${mergeMode
                        ? "bg-orange-600 text-white hover:bg-orange-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                    title={mergeMode ? "Tắt gộp dữ liệu" : "Bật gộp dữ liệu"}
                >
                    <span className="text-xs">
                        {mergeMode ? "Tách dữ liệu" : "Gộp dữ liệu"}
                    </span>
                    {mergeMode ? (
                        <Split size={16} />
                    ) : (
                        <Merge size={16} />
                    )}
                </button>
            </div>

            <HotTable
                themeName="ht-theme-main"
                colHeaders={RowHeader2}
                filters={true}
                width="auto"
                autoColumnSize={true}
                manualColumnResize={true}
                height="100vh"
                stretchH="all"
                manualRowMove={true}
                manualColumnMove={true}
                manualRowResize={true}
                className="custom-table"
                hiddenColumns={
                    (!userInfo?.role || !userInfo)
                        ? { columns: columnsToHideIfNoRole, indicators: true }
                        : (hiddenColumns ? { columns: hiddenColumns, indicators: true } : undefined)
                }
                licenseKey="non-commercial-and-evaluation"
                nestedHeaders={[RowHeader1, RowHeader2]}
                data={data}
                afterChange={handleAfterChange}
                afterPaste={(pastedData, coords) => {
                    // Skip if no data or coordinates
                    if (!pastedData || !coords) return;

                    // Get the start row and column
                    const startRow = coords[0].startRow;
                    const startCol = coords[0].startCol;

                    // Create a copy of the current data
                    const newData = [...data];

                    // Process each row of pasted data
                    pastedData.forEach((row, rowIndex) => {
                        // Get the physical row index
                        const physicalRow = startRow + rowIndex;

                        // Skip if this is a summary row
                        const isSummaryRow =
                            newData[physicalRow]?.[0]?.includes("Tổng") ||
                            newData[physicalRow]?.[0]?.includes("Chưa Index") ||
                            newData[physicalRow]?.[0]?.includes("Chưa nhập") ||
                            newData[physicalRow]?.[0]?.includes("Đơn hủy");

                        if (isSummaryRow) return;

                        // Get the order code (Mã đơn) from the current row
                        const orderCode = newData[physicalRow]?.[0];
                        if (!orderCode) return;

                        // Find the matching order in the orders array
                        const orderIdx = orders.findIndex((order) => order.MaDon === orderCode);
                        if (orderIdx === -1) return;

                        // Lấy _parentIndex và _dbIndex từ từng phần tử order
                        const detail = orders[orderIdx];
                        const parentIndex = detail._parentIndex;
                        const dbIndex = detail._dbIndex;
                        if (typeof parentIndex !== 'number' || typeof dbIndex !== 'number') return;

                        // Get the current order data
                        const updatedOrder = { ...orders[orderIdx] };

                        // Process each column in the row
                        row.forEach((value, colIndex) => {
                            const columnName = RowHeader2[startCol + colIndex];
                            if (!columnName) return;

                            // Map table columns to Firebase fields
                            switch (columnName) {
                                case "Mã":
                                    updatedOrder.MaDon = value;
                                    break;
                                case "Loại":
                                    updatedOrder.Loai = value;
                                    // Reset status when type changes
                                    if (value === "GP") {
                                        updatedOrder.TinhTrangKH = "Chưa nhập";
                                        updatedOrder.TinhTrangNCC = "Chưa nhận đơn";
                                    } else {
                                        updatedOrder.TinhTrangKH = "Chưa nhập";
                                        updatedOrder.TinhTrangNCC = "Chưa nhận đơn";
                                    }
                                    break;
                                case "Ngày Bán":
                                    updatedOrder.NgayBan = value;
                                    break;
                                case "Text":
                                    updatedOrder.TimeText = value;
                                    break;
                                case "Site":
                                    updatedOrder.Site = value;
                                    break;
                                case "Ghi Chú":
                                    updatedOrder.Note = value;
                                    break;
                                case "Giá Bán":
                                    if (updatedOrder.Loai === "GP") {
                                        updatedOrder.GiaBanGP = value;
                                    } else if (updatedOrder.Loai === "Text") {
                                        updatedOrder.GiaBanText = value;
                                    } else if (updatedOrder.Loai === "Text Home") {
                                        updatedOrder.GiaBanTextHome = value;
                                    } else if (updatedOrder.Loai === "Text Header") {
                                        updatedOrder.GiaBanTextHeader = value;
                                    }
                                    break;
                                case "Giá Mua":
                                    if (updatedOrder.Loai === "GP") {
                                        updatedOrder.GiaMuaGP = value;
                                    } else if (updatedOrder.Loai === "Text") {
                                        updatedOrder.GiaMuaText = value;
                                    } else if (updatedOrder.Loai === "Text Home") {
                                        updatedOrder.GiaMuaTextHome = value;
                                    } else if (updatedOrder.Loai === "Text Header") {
                                        updatedOrder.GiaMuaTextHeader = value;
                                    }
                                    break;
                                case "Hoa Hồng":
                                    if (updatedOrder.Loai === "GP") {
                                        updatedOrder.HoaHongGP = value;
                                    } else if (updatedOrder.Loai === "Text") {
                                        updatedOrder.HoaHongText = value;
                                    }
                                    break;
                                case "TTNCC":
                                    updatedOrder.TTNCC = value;
                                    break;
                                case "Bài Viết":
                                    updatedOrder.BaiViet = value;
                                    if (updatedOrder.Loai === "GP") {
                                        if (updatedOrder.BaiViet) {
                                            updatedOrder.TinhTrangKH = "Đã nhập";
                                            // Add NgayOrder when BaiViet is entered
                                            const now = new Date();
                                            const day = String(now.getDate()).padStart(2, "0");
                                            const month = String(now.getMonth() + 1).padStart(2, "0");
                                            const year = now.getFullYear();
                                            updatedOrder.NgayOrder = `${day}/${month}/${year}`;
                                        } else {
                                            updatedOrder.TinhTrangKH = "Chưa nhập";
                                        }
                                    }
                                    break;
                                case "Link KQ":
                                    updatedOrder.LinkKQ = value;
                                    if (updatedOrder.Loai === "GP") {
                                        if (updatedOrder.LinkKQ) {
                                            updatedOrder.TinhTrangNCC = "Đã lên bài";
                                            const now = new Date();
                                            const day = String(now.getDate()).padStart(2, "0");
                                            const month = String(now.getMonth() + 1).padStart(2, "0");
                                            updatedOrder.NgayBan = `${day}/${month}`;
                                        } else {
                                            updatedOrder.TinhTrangNCC = "Chưa nhận đơn";
                                            updatedOrder.NgayBan = "";
                                        }
                                    }
                                    break;
                                case "Anchor 1":
                                    updatedOrder.Anchor1 = value;
                                    if (updatedOrder.Loai !== "GP") {
                                        if (updatedOrder.Anchor1 && updatedOrder.Link1) {
                                            updatedOrder.TinhTrangKH = "Đã nhập";
                                        } else {
                                            updatedOrder.TinhTrangKH = "Chưa nhập";
                                        }
                                    }
                                    break;
                                case "Link 1":
                                    updatedOrder.Link1 = value;
                                    if (updatedOrder.Loai !== "GP") {
                                        if (updatedOrder.Anchor1 && updatedOrder.Link1) {
                                            updatedOrder.TinhTrangKH = "Đã nhập";
                                        } else {
                                            updatedOrder.TinhTrangKH = "Chưa nhập";
                                        }
                                    }
                                    break;
                                case "Anchor 2":
                                    updatedOrder.Anchor2 = value;
                                    if (updatedOrder.Loai !== "GP") {
                                        if (updatedOrder.Anchor2 && updatedOrder.Link2) {
                                            updatedOrder.TinhTrangKH = "Đã nhập";
                                        } else {
                                            updatedOrder.TinhTrangKH = "Chưa nhập";
                                        }
                                    }
                                    break;
                                case "Link 2":
                                    updatedOrder.Link2 = value;
                                    if (updatedOrder.Loai !== "GP") {
                                        if (updatedOrder.Anchor2 && updatedOrder.Link2) {
                                            updatedOrder.TinhTrangKH = "Đã nhập";
                                        } else {
                                            updatedOrder.TinhTrangKH = "Chưa nhập";
                                        }
                                    }
                                    break;
                                case "Ngày KT":
                                    updatedOrder.NgayKT = value;
                                    break;
                                case "Index":
                                    updatedOrder.Index = value;
                                    const now = new Date();
                                    const day = String(now.getDate()).padStart(2, "0");
                                    const month = String(now.getMonth() + 1).padStart(2, "0");
                                    updatedOrder.NgayKT = `${day}/${month}`;

                                    // Handle money balance changes based on Index status
                                    if (value === "Indexed") {
                                        if (!updatedOrder.paymentStatus || updatedOrder.paymentStatus !== "paid") {
                                            const price = Number(
                                                updatedOrder.Loai === "GP"
                                                    ? updatedOrder.GiaBanGP || 0
                                                    : updatedOrder.Loai === "Text"
                                                        ? updatedOrder.GiaBanText || 0
                                                        : updatedOrder.Loai === "TextHome"
                                                            ? updatedOrder.GiaBanTextHome || 0
                                                            : updatedOrder.GiaBanTextHeader || 0,
                                            );
                                            updatedOrder.paymentStatus = "paid";
                                        }
                                    } else if (updatedOrder.Index === "Indexed" && value !== "Indexed") {
                                        if (updatedOrder.paymentStatus === "paid") {
                                            const price = Number(
                                                updatedOrder.Loai === "GP"
                                                    ? updatedOrder.GiaBanGP || 0
                                                    : updatedOrder.Loai === "Text"
                                                        ? updatedOrder.GiaBanText || 0
                                                        : updatedOrder.Loai === "TextHome"
                                                            ? updatedOrder.GiaBanTextHome || 0
                                                            : updatedOrder.GiaBanTextHeader || 0,
                                            );
                                            updatedOrder.paymentStatus1 = "refunded";
                                        }
                                    }
                                    break;
                                case "Tên NCC":
                                    updatedOrder.TenNCC = value;
                                    break;
                                case "Link NCC":
                                    updatedOrder.TeleNCC = value;
                                    break;
                                case "KH":
                                    updatedOrder.TinhTrangKH = value;
                                    break;
                                case "NCC":
                                    updatedOrder.TinhTrangNCC = value;
                                    if (updatedOrder.Loai !== "GP" && updatedOrder.TinhTrangNCC === "Đã lên bài") {
                                        const now = new Date();
                                        const day = String(now.getDate()).padStart(2, "0");
                                        const month = String(now.getMonth() + 1).padStart(2, "0");
                                        updatedOrder.NgayBan = `${day}/${month}`;
                                        if (!updatedOrder.paymentStatus || updatedOrder.paymentStatus !== "paid") {
                                            const price = Number(
                                                updatedOrder.Loai === "GP"
                                                    ? updatedOrder.GiaBanGP || 0
                                                    : updatedOrder.Loai === "Text"
                                                        ? updatedOrder.GiaBanText || 0
                                                        : updatedOrder.Loai === "TextHome"
                                                            ? updatedOrder.GiaBanTextHome || 0
                                                            : updatedOrder.GiaBanTextHeader || 0,
                                            );
                                            updatedOrder.paymentStatus = "paid";
                                        }
                                    }
                                    break;
                            }
                        });

                        // Update the order in Firebase, dùng parentIndex làm index cha
                        const orderRef = ref(database, `orders/${parentIndex}/ChiTietDonHang/${dbIndex}`);
                        update(orderRef, updatedOrder)
                            .then(() => {
                                if (onOrderUpdate) onOrderUpdate();
                            })
                            .catch((error) => {
                                console.error(`Error updating order ${orderCode}:`, error);
                            });
                    });
                }}
                contextMenu={contextMenuItems}
                columns={RowHeader2.map((header, index) => {
                    const columnSetting = columnSettings[header]

                    // Basic read-only settings based on user role
                    let isReadOnly = false

                    // Nếu không có userInfo thì không thể sửa các cột Mã, Site, Ngày Bán, Text và Giá Bán
                    if (!userInfo && ["Mã", "Site", "Ngày Bán", "Text", "Giá Bán"].includes(header)) {
                        isReadOnly = true;
                    }

                    if (userInfo?.role === "NCC") {
                        // NCC can only edit Link KQ
                        isReadOnly = header !== "Link KQ"
                    } else if (userInfo?.role === "Khách hàng") {
                        // Khách hàng can edit these columns
                        isReadOnly = !["Bài Viết", "Anchor 1", "Link 1", "Anchor 2", "Link 2", "Index"].includes(header)
                    } else if (userInfo) {
                        // Other roles can edit all columns
                        isReadOnly = false
                    } else {
                        // If no userInfo, only allow editing of certain columns
                        isReadOnly = !["Loại", "Text", "Ghi Chú", "Giá Mua", "Hoa Hồng", "TTNCC", "Lợi Nhuận", "Bài Viết", "Link KQ", "Anchor 1", "Link 1", "Anchor 2", "Link 2", "Ngày KT", "Index", "Tên NCC", "Link NCC", "KH", "NCC", "Trao đổi"].includes(header)
                    }

                    // Đảm bảo cột 'Loại' luôn có thể chọn
                    if (header === "Loại") {
                        isReadOnly = false;
                    }

                    return {
                        data: index,
                        title: header,
                        width:
                            header === "Mã" ? 70 :
                                header === "Loại" ? 70 :
                                    header === "Ngày Bán" ? 0 :
                                        header === "Text" ? 0 :
                                            header === "Site" ? 120 :
                                                header === "Ghi Chú" ? 60 :
                                                    header === "Giá Bán" ? 60 :
                                                        header === "Giá Mua" ? 60 :
                                                            header === "Hoa Hồng" ? 60 :
                                                                header === "Giá Cuối" ? 60 :
                                                                    header === "TTNCC" ? 60 :
                                                                        header === "Lợi Nhuận" ? 60 :
                                                                            header === "Bài Viết" ? 70 :
                                                                                header === "Link KQ" ? 70 :
                                                                                    header === "Anchor 1" ? 60 :
                                                                                        header === "Link 1" ? 60 :
                                                                                            header === "Anchor 2" ? 60 :
                                                                                                header === "Link 2" ? 60 :
                                                                                                    header === "Ngày KT" ? 60 :
                                                                                                        header === "Index" ? 60 :
                                                                                                            header === "Tên NCC" ? 60 :
                                                                                                                header === "Link NCC" ? 60 :
                                                                                                                    header === "KH" ? 60 :
                                                                                                                        header === "NCC" ? 60 :
                                                                                                                            header === "Trao đổi" ? 100 : // Tăng width cho cột Trao đổi
                                                                                                                                undefined,
                        readOnly: isReadOnly || (userInfo?.role === "Khách hàng" && header === "KH"),
                        renderer: header === "Trao đổi" ? chatRenderer : undefined,
                        ...columnSetting,
                    }
                })}
                cells={(row, col, prop) => {
                    const header = RowHeader2[col];

                    // Find if this is a summary row
                    const isSummaryRow =
                        row < data.length &&
                        (data[row][0]?.includes("Tổng") ||
                            data[row][0]?.includes("Chưa Index") ||
                            data[row][0]?.includes("Chưa nhập") ||
                            data[row][0]?.includes("Đơn hủy"));

                    if (isSummaryRow) {
                        return {
                            readOnly: true,
                            renderer: (instance, td, row, col, prop, value, cellProperties) => {
                                Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties);
                                td.style.backgroundColor = "#FFB3B3";
                                td.style.color = "#FF0000";
                                td.style.fontWeight = "500";
                                if (col >= 6 && col <= 11 && value !== "") {
                                    td.style.textAlign = "right";
                                }
                            },
                        };
                    }

                    if (row < data.length) {
                        const rowData = data[row];
                        const orderCode = rowData[0];

                        if (
                            !orderCode ||
                            typeof orderCode !== "string" ||
                            orderCode.includes("Tổng") ||
                            orderCode.includes("Chưa Index") ||
                            orderCode.includes("Chưa nhập") ||
                            orderCode.includes("Đơn hủy")
                        ) {
                            return {};
                        }

                        const order = orders.find((o) => o.MaDon === orderCode);
                        if (!order) return {};

                        // Đặc biệt xử lý cột "Trao đổi" để luôn sử dụng chatRenderer
                        if (header === "Trao đổi") {
                            return {
                                readOnly: true, // Cột "Trao đổi" không cho phép chỉnh sửa trực tiếp
                                renderer: chatRenderer, // Sử dụng chatRenderer để hiển thị nút
                            };
                        }

                        // Đảm bảo cột 'Loại' luôn có thể chọn nếu không phải dòng tổng kết và không phải trạng thái hoàn thành
                        if (header === "Loại" && order.Status !== "Đã hoàn thành") {
                            return {
                                readOnly: false,
                                ...columnSettings[header],
                            };
                        }

                        // Xử lý các cột khác
                        if (rowData[1] !== "GP" && (header === "Bài Viết" || header === "Link KQ")) {
                            return {
                                readOnly: true,
                                renderer: (instance, td, row, col, prop, value, cellProperties) => {
                                    if (columnSettings[header]?.renderer) {
                                        columnSettings[header].renderer(instance, td, row, col, prop, value, cellProperties);
                                    } else {
                                        Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties);
                                    }
                                    if (!td.style.backgroundColor) {
                                        td.style.backgroundColor = "#d3d3d3";
                                        td.style.color = "#000000";
                                    }
                                },
                            };
                        }

                        if (order.Status === "Đã hoàn thành" && header === "Loại") {
                            return {
                                readOnly: true,
                                renderer: (instance, td, row, col, prop, value, cellProperties) => {
                                    if (columnSettings[header]?.renderer) {
                                        columnSettings[header].renderer(instance, td, row, col, prop, value, cellProperties);
                                    } else {
                                        Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties);
                                    }
                                    if (!td.style.backgroundColor) {
                                        td.style.backgroundColor = "#d3d3d3";
                                        td.style.color = "#000000";
                                    }
                                },
                            };
                        }

                        const isReadOnly =
                            (!userInfo && ["Mã", "Site", "Ngày Bán", "Text", "Giá Bán", "KH", "NCC"].includes(header)) ||
                            (userInfo?.role === "NCC" && header !== "Index" && header !== "Link KQ") ||
                            (userInfo?.role === "Khách hàng" &&
                                !["Bài Viết", "Anchor 1", "Link 1", "Anchor 2", "Link 2", "Index", "Loại"].includes(header)) ||
                            (userInfo?.role === "Khách hàng" && header === "KH")

                        if (isReadOnly) {
                            return {
                                readOnly: true,
                                renderer: (instance, td, row, col, prop, value, cellProperties) => {
                                    if (columnSettings[header]?.renderer) {
                                        columnSettings[header].renderer(instance, td, row, col, prop, value, cellProperties);
                                    } else {
                                        Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties);
                                    }
                                    if (!td.style.backgroundColor) {
                                        td.style.backgroundColor = "#d3d3d3";
                                        td.style.color = "#000000";
                                    }
                                },
                            };
                        } else {
                            return {
                                renderer: (instance, td, row, col, prop, value, cellProperties) => {
                                    if (columnSettings[header]?.renderer) {
                                        columnSettings[header].renderer(instance, td, row, col, prop, value, cellProperties);
                                    } else {
                                        Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties);
                                    }
                                    if (!td.style.backgroundColor) {
                                        td.style.backgroundColor = "#ffffff";
                                    }
                                },
                            };
                        }
                    }
                    return {};
                }}
            />
            <ChatDialog
                chatDialogOpen={chatDialogOpen}
                setChatDialogOpen={setChatDialogOpen}
                currentChatOrderId={currentChatOrderId}
                currentChatMessages={currentChatMessages}
                newChatMessage={newChatMessage}
                setNewChatMessage={setNewChatMessage}
                sendChatMessage={sendChatMessage}
                role={userInfo?.role || (typeof window !== 'undefined' && localStorage.getItem('role'))}
                supplierName={supplierName}
                user={userInfo?.role === 'Khách hàng' || (!userInfo && (typeof window !== 'undefined' && localStorage.getItem('role') === 'Khách hàng')) ? null : userInfo}
                orderIndex={orderIndex}
            />
        </>
    )
}
