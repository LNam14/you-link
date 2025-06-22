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
import { useParams } from "next/navigation"
import PageBody from "../components/DetailOrder"
// import sheetApiRequest from "@/apiRequests/sheet"

type PageBodyProps = {
    supplierName: string | null,
    orderIndex?: number,
    onOrderUpdate?: () => void, // Add callback prop
    order?: any[] // Add order prop
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
    "Time Text",
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
                                // sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Bạn đã đồng ý hoàn ${refundAmount}$ cho đơn hàng ${updatedOrder.MaDon}, số tiền trên đã được trừ khỏi ví của bạn`)
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

            const message: ChatMessage = {
                text: option,
                sender: user?.displayName || user?.email || "Unknown User",
                senderRole: role || "NCC",
                timestamp: Date.now(),
                isComplaint: true,
                complaintStatus: "pending",
            }
            // sheetApiRequest.getIDNCC(currentOrder.TenNCC, `Khách hàng yêu cầu hoàn tiền đối với trường hợp ${option} cho đơn hàng ${currentChatOrderId}, kiểm tra tại https://www.ylink.shop/gp-text`)
            // sheetApiRequest.getIDKH(currentOrder.TenKH, `Yêu cầu hoàn tiền đối với trường hợp ${option} cho đơn hàng ${currentChatOrderId} đã được gửi`)
            if (role === "NCC") {
                message.supplierName = supplierName || user?.name || user?.displayName || ""
            } else if (role === "Khách hàng") {
                message.name = user?.username || user?.name || user?.displayName || ""
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

export default function NCCPage() {
    const { slug } = useParams()
    const [filteredOrders, setFilteredOrders] = useState([])

    useEffect(() => {
        const ordersRef = ref(database, "orders")
        onValue(ordersRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val()
                const ordersArray = Array.isArray(data) ? data : Object.values(data)
                // Lọc tất cả ChiTietDonHang có TenNCC === slug
                const allDetails: any = []
                ordersArray.forEach((order, orderIdx) => {
                    if (Array.isArray(order.ChiTietDonHang)) {
                        order.ChiTietDonHang.forEach((detail: any, idx: number) => {
                            if (detail.TenNCC === slug) {
                                allDetails.push({ ...detail, _dbIndex: idx, _parentIndex: orderIdx })
                            }
                        })
                    }
                })
                setFilteredOrders(allDetails)
            } else {
                setFilteredOrders([])
            }
        })
    }, [slug])

    return (
        <div>
            <PageBody supplierName={slug as string} order={filteredOrders} hiddenColumns={[6, 11]} />
        </div>
    )
}
