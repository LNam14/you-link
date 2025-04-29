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
import HelpButton from "./HelpButton"
import { updateUserBalance } from "@/app/firebase/firebase"
import sheetApiRequest from "@/apiRequests/sheet"

type PageBodyProps = {
    supplierName: string | null
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

// Add type definitions for renderer function
type RendererFunction = (
    instance: Handsontable,
    td: HTMLTableCellElement,
    row: number,
    col: number,
    prop: string | number,
    value: string,
    cellProperties: Handsontable.CellProperties,
) => void

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
                const ordersRef = ref(database, "orders")
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
                const ordersRef = ref(database, "orders")
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
                                await updateUserBalance(updatedOrder.KHMua, refundAmount, updatedOrder.TenNCC)
                                updatedOrder.paymentStatus1 = "refunded"
                                sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Bạn đã đồng ý hoàn ${refundAmount}$ cho đơn hàng ${updatedOrder.MaDon}, số tiền trên đã được trừ khỏi ví của bạn`)
                                sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã được hoàn tiền, số tiền ${refundAmount}$ đã được cộng vào ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban `)
                            }
                        } else {
                            updatedOrder.TinhTrangNCC = "Từ chối hoàn"
                            sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Bạn đã từ chối yêu cầu hoàn tiền của đơn hàng ${updatedOrder.MaDon}`)
                            sheetApiRequest.getIDKH(updatedOrder.TenKH, `Yêu cầu hoàn tiền đối với đơn hàng ${updatedOrder.MaDon} đã bị từ chối`)
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
            sheetApiRequest.getIDNCC(currentOrder.TenNCC, `Khách hàng yêu cầu hoàn tiền đối với trường hợp ${option} cho đơn hàng ${currentChatOrderId}, kiểm tra tại https://www.ylink.shop/mua-ban`)
            sheetApiRequest.getIDKH(currentOrder.TenKH, `Yêu cầu hoàn tiền đối với trường hợp ${option} cho đơn hàng ${currentChatOrderId} đã được gửi`)
            if (role === "NCC") {
                message.supplierName = supplierName || user?.name || user?.displayName || ""
            } else if (role === "Khách hàng") {
                message.name = user?.username || user?.name || user?.displayName || ""
            }
            try {
                const ordersRef = ref(database, "orders")
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

export default function PageBody({ supplierName }: PageBodyProps) {
    const [orders, setOrders] = useState<any[]>([])
    const [orderKeys, setOrderKeys] = useState<string[]>([])
    const userInfo = getUserInfo()
    const [chatDialogOpen, setChatDialogOpen] = useState(false)
    const [currentChatOrderId, setCurrentChatOrderId] = useState<string | null>(null)
    const [currentChatMessages, setCurrentChatMessages] = useState<ChatMessage[]>([])
    const [newChatMessage, setNewChatMessage] = useState("")
    const [khMuaIB, setKhMuaIB] = useState<string>("")
    const [tenNBIB, setTenNBIB] = useState<string>("")
    const [selectedOrder, setSelectedOrder] = useState<any>(null)

    const handleContextMenuAction = async (row: number, action: string) => {
        // Skip if this is a summary row
        const isSummaryRow =
            data[row][0]?.includes("Tuần") ||
            data[row][0]?.includes("Chưa Index") ||
            data[row][0]?.includes("Chưa NNhập") ||
            data[row][0]?.includes("Đơn hủy")

        if (isSummaryRow) return

        // Get the order code (Mã đơn) from the current row
        const orderCode = data[row][0]
        if (!orderCode) return

        // Find the matching order in the orders array by Mã đơn
        const orderIndex = orders.findIndex((order) => order.MaDon === orderCode)
        if (orderIndex === -1) return

        // Get the Firebase key for this order
        const orderKey = orderKeys[orderIndex]
        if (!orderKey) return

        const orderRef = ref(database, `orders/${orderKey}`)
        const updatedOrder = { ...orders[orderIndex] }

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
                    sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Khách hàng đang yêu cầu hủy đơn ${updatedOrder.MaDon}, xử lý tại https://www.ylink.shop/mua-ban`)
                    sheetApiRequest.getIDKH(updatedOrder.TenKH, `Yêu cầu hủy đơn hàng ${updatedOrder.MaDon} đã được gửi, vui lòng chờ phản hồi`)
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
                            await updateUserBalance(updatedOrder.KHMua, price, updatedOrder.TenNCC)
                            updatedOrder.paymentStatus1 = "refunded"
                            sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Khách hàng đã hủy đơn ${updatedOrder.MaDon}, đây là đơn hàng ${updatedOrder.Loai} và được yêu cầu hủy trước 12h. Hệ thống đã tự động phê duyệt yêu cầu, số tiền ${price}$ đã bị trừ khỏi ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban`)
                            sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã được hủy thành công, số tiền ${price}$ đã được cộng vào vào ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban`)
                        } else {
                            updatedOrder.TinhTrangKH = "Hủy - đã lên bài"
                            sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Khách hàng đang yêu cầu hủy đơn ${updatedOrder.MaDon}, xử lý tại https://www.ylink.shop/mua-ban`)
                            sheetApiRequest.getIDKH(updatedOrder.TenKH, `Yêu cầu hủy đơn hàng ${updatedOrder.MaDon} đã được gửi, vui lòng chờ phản hồi`)
                        }
                    }
                }
            }
        } else if (action === "ncc_cancel") {
            updatedOrder.TinhTrangNCC = "Hủy đơn"
            sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Đơn hàng ${updatedOrder.MaDon} đã được hủy thành công`)
            sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã bị hủy, đặt đơn mới tại https://www.ylink.shop`)

        } else if (action === "ncc_ok") {
            updatedOrder.TinhTrangNCC = "Đã lên bài"
            const now = new Date()
            const day = String(now.getDate()).padStart(2, "0")
            const month = String(now.getMonth() + 1).padStart(2, "0")
            updatedOrder.NgayBan = `${day}/${month}`

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
                )

                // Deduct from customer's pendingAmount and add to money
                const customerPendingRef = ref(database, `pendingAmount/${updatedOrder.KHMua}`);
                const customerMoneyRef = ref(database, `money/${updatedOrder.KHMua}`);
                const supplierMoneyRef = ref(database, `money/${updatedOrder.TenNCC}`);

                // Get current balances
                const [customerPendingSnapshot, customerMoneySnapshot, supplierMoneySnapshot] = await Promise.all([
                    get(customerPendingRef),
                    get(customerMoneyRef),
                    get(supplierMoneyRef)
                ]);

                let customerPendingAmount = 0;
                let customerMoneyAmount = 0;
                let supplierMoneyAmount = 0;

                if (customerPendingSnapshot.exists()) {
                    customerPendingAmount = customerPendingSnapshot.val().amount || 0;
                }
                if (customerMoneySnapshot.exists()) {
                    customerMoneyAmount = customerMoneySnapshot.val().amount || 0;
                }
                if (supplierMoneySnapshot.exists()) {
                    supplierMoneyAmount = supplierMoneySnapshot.val().amount || 0;
                }

                // Update balances
                await Promise.all([
                    update(customerPendingRef, { amount: customerPendingAmount - price }),
                    update(customerMoneyRef, {
                        amount: customerMoneyAmount + price,
                        pendingAmount: customerMoneySnapshot.val()?.pendingAmount || 0,
                        doneAmount: customerMoneySnapshot.val()?.doneAmount || 0
                    }),
                    update(supplierMoneyRef, {
                        amount: supplierMoneyAmount + price
                    })
                ]);

                updatedOrder.paymentStatus = "paid"
                sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Đơn hàng ${updatedOrder.MaDon} đã hoàn thành, số tiền ${price}$ đã được cộng vào ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban`)
                sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã được xử lý, số tiền ${price}$ đã được chuyển từ pendingAmount sang money trong ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban`)
            }
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
            await updateUserBalance(updatedOrder.KHMua, price, updatedOrder.TenNCC)
            updatedOrder.paymentStatus1 = "refunded"
            sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Bạn đã đồng ý yêu cầu hủy đơn ${updatedOrder.MaDon}, số tiền ${price}$ đã bị trừ khỏi vào ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban`)
            sheetApiRequest.getIDKH(updatedOrder.TenKH, `Yêu cầu hủy đơn ${updatedOrder.MaDon} thành công, số tiền ${price}$ đã được cộng vào vào ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban`)
        } else if (action === "ncc_reject_cancel") {
            updatedOrder.TinhTrangNCC = "Từ chối hủy"
            sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Bạn đã từ chối yêu cầu hủy đơn ${updatedOrder.MaDon}`)
            sheetApiRequest.getIDKH(updatedOrder.TenKH, `Yêu cầu hủy đơn ${updatedOrder.MaDon} đã bị từ chối`)
        }

        // Update the order in Firebase
        set(orderRef, updatedOrder)
            .then(() => {
                console.log(`Successfully updated order status for ${orderCode}`)
            })
            .catch((error) => {
                console.error(`Error updating order status for ${orderCode}:`, error)
            })
    }

    const contextMenuItems =
        userInfo?.role === "Khách hàng" || userInfo?.role === "Admin"
            ? {
                items: {
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
                                // Get the order code from the data array
                                if (!data || !Array.isArray(data) || row < 0 || row >= data.length) return true
                                const orderCode = data[row][0]
                                if (!orderCode || typeof orderCode !== "string") return true

                                // Skip if this is a summary row
                                if (
                                    orderCode.includes("Tuần") ||
                                    orderCode.includes("Chưa Index") ||
                                    orderCode.includes("Đang Xử Lý") ||
                                    orderCode.includes("Đơn hủy")
                                ) {
                                    return true
                                }

                                // Find the matching order in the orders array
                                const order = orders.find((o) => o.MaDon === orderCode)
                                if (!order) return true

                                // Condition 1: For GP orders
                                if (order.Loai === "GP") {
                                    return !(
                                        order.Index === "Indexed" &&
                                        order.TinhTrangKH === "Đã nhập" &&
                                        order.TinhTrangNCC === "Đã lên bài"
                                    )
                                }

                                // For non-GP orders
                                return !(order.TinhTrangKH === "Đã nhập" && order.TinhTrangNCC === "Đã lên bài")
                            }
                            return true
                        },
                    },
                    cancel: {
                        name: "Hủy đơn",
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
                                // Get the order code from the data array
                                if (!data || !Array.isArray(data) || row < 0 || row >= data.length) return true
                                const orderCode = data[row][0]
                                if (!orderCode || typeof orderCode !== "string") return true

                                // Skip if this is a summary row
                                if (
                                    orderCode.includes("Tuần") ||
                                    orderCode.includes("Chưa Index") ||
                                    orderCode.includes("Đang Xử Lý") ||
                                    orderCode.includes("Đơn hủy")
                                ) {
                                    return true
                                }

                                // Find the matching order in the orders array
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
                },
            }
            : userInfo?.role === "NCC" || userInfo?.role === "Admin"
                ? {
                    items: {
                        ncc_cancel: {
                            name: "Hủy đơn",
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
                                    // Get the order code from the data array
                                    if (!data || !Array.isArray(data) || row < 0 || row >= data.length) return true
                                    const orderCode = data[row][0]
                                    if (!orderCode || typeof orderCode !== "string") return true

                                    // Skip if this is a summary row
                                    if (
                                        orderCode.includes("Tuần") ||
                                        orderCode.includes("Chưa Index") ||
                                        orderCode.includes("Đang Xử Lý") ||
                                        orderCode.includes("Đơn hủy")
                                    ) {
                                        return true
                                    }

                                    // Find the matching order in the orders array
                                    const order = orders.find((o) => o.MaDon === orderCode)
                                    console.log(order)

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
                                    // Get the order code from the data array
                                    if (!data || !Array.isArray(data) || row < 0 || row >= data.length) return true
                                    const orderCode = data[row][0]
                                    if (!orderCode || typeof orderCode !== "string") return true

                                    // Skip if this is a summary row
                                    if (
                                        orderCode.includes("Tuần") ||
                                        orderCode.includes("Chưa Index") ||
                                        orderCode.includes("Đang Xử Lý") ||
                                        orderCode.includes("Đơn hủy")
                                    ) {
                                        return true
                                    }

                                    // Find the matching order in the orders array
                                    const order = orders.find((o) => o.MaDon === orderCode)
                                    if (!order) return true
                                    // Condition 1: Show if Loai !== GP and TinhTrangKH === Đã nhập
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
                                    // Get the order code from the data array
                                    if (!data || !Array.isArray(data) || row < 0 || row >= data.length) return true
                                    const orderCode = data[row][0]
                                    if (!orderCode || typeof orderCode !== "string") return true

                                    // Skip if this is a summary row
                                    if (
                                        orderCode.includes("Tuần") ||
                                        orderCode.includes("Chưa Index") ||
                                        orderCode.includes("Đang Xử Lý") ||
                                        orderCode.includes("Đơn hủy")
                                    ) {
                                        return true
                                    }

                                    // Find the matching order in the orders array
                                    const order = orders.find((o) => o.MaDon === orderCode)
                                    if (!order) return true
                                    // Condition 3: Show if TinhTrangKH === Hủy - đã index or Hủy - đã lên bài
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
                                    // Get the order code from the data array
                                    if (!data || !Array.isArray(data) || row < 0 || row >= data.length) return true
                                    const orderCode = data[row][0]
                                    if (!orderCode || typeof orderCode !== "string") return true

                                    // Skip if this is a summary row
                                    if (
                                        orderCode.includes("Tuần") ||
                                        orderCode.includes("Chưa Index") ||
                                        orderCode.includes("Đang Xử Lý") ||
                                        orderCode.includes("Đơn hủy")
                                    ) {
                                        return true
                                    }

                                    // Find the matching order in the orders array
                                    const order = orders.find((o) => o.MaDon === orderCode)
                                    if (!order) return true
                                    // Condition 4: Show if TinhTrangKH === Hủy - đã index or Hủy - đã lên bài
                                    return (
                                        !(order?.TinhTrangKH === "Hủy - đã index" || order?.TinhTrangKH === "Hủy - đã lên bài") ||
                                        !(order?.TinhTrangNCC === "Đã lên bài")
                                    )
                                }
                                return true
                            },
                        },
                    } as any,
                }
                : undefined

    useEffect(() => {
        const ordersRef = ref(database, "orders")
        onValue(ordersRef, (snapshot) => {
            const data = snapshot.val()
            if (data) {
                const ordersArray = Object.values(data)
                const keysArray = Object.keys(data)

                // Filter orders based on user role
                const filteredOrders = ordersArray.filter((order: any) => {
                    if (userInfo?.role === "Khách hàng") {
                        return order.TenKH === userInfo.username
                    } else if (userInfo?.role === "NCC") {
                        return order.TenNCC === userInfo.username
                    }
                    return true // Admin can see all orders
                })
                setOrders(filteredOrders)
                setOrderKeys(keysArray.slice(0, filteredOrders.length))
            }
        })
    }, [userInfo?.role, userInfo?.username])

    const checkOrderStatus = useCallback((order: any) => {
        if (!order.NgayOrder || !order.BaiViet) return order.TinhTrangNCC

        const orderTime = new Date(order.NgayOrder)
        const now = new Date()
        const hoursElapsed = (now.getTime() - orderTime.getTime()) / (1000 * 60 * 60)

        if (order.TinhTrangNCC !== "Đã lên bài") {
            if (hoursElapsed >= 3) return "Delay 48h"
            if (hoursElapsed >= 2) return "Delay 24h"
            if (hoursElapsed >= 1) return "Delay 12h"
        }

        return order.TinhTrangNCC
    }, [])

    // Set up interval to check order status
    useEffect(() => {
        const interval = setInterval(() => {
            orders.forEach((order, index) => {
                const orderKey = orderKeys[index]
                if (orderKey) {
                    const newStatus = checkOrderStatus(order)
                    if (newStatus !== order.TinhTrangNCC) {
                        const orderRef = ref(database, `orders/${orderKey}`)
                        set(orderRef, { ...order, TinhTrangNCC: newStatus })
                    }

                    // Check for 14-day auto-cancellation for GP orders with no index
                    if (
                        order.Loai === "GP" &&
                        order.NgayOrder &&
                        (order.Index === "No" || !order.Index) &&
                        order.TinhTrangKH !== "Hủy - 14 ngày không index" &&
                        order.TinhTrangKH !== "Hủy đơn" &&
                        order.TinhTrangKH !== "Hủy - no index" &&
                        order.TinhTrangKH !== "Hủy - đã index" &&
                        order.TinhTrangKH !== "Hủy - 14 ngày chưa index"
                    ) {
                        const orderDate = new Date(order.NgayOrder)
                        const now = new Date()
                        const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))

                        if (daysDiff >= 14) {
                            const orderRef = ref(database, `orders/${orderKey}`)
                            set(orderRef, { ...order, TinhTrangKH: "Hủy - 14 ngày không index" })
                        }
                    }

                    // Check for 14-day auto-cancellation for GP orders with Index = "No"
                    if (
                        order.Loai === "GP" &&
                        order.NgayOrder &&
                        order.Index === "No" &&
                        order.TinhTrangKH !== "Hủy - 14 ngày chưa index" &&
                        order.TinhTrangKH !== "Hủy đơn" &&
                        order.TinhTrangKH !== "Hủy - no index" &&
                        order.TinhTrangKH !== "Hủy - đã index" &&
                        order.TinhTrangKH !== "Hủy - 14 ngày không index"
                    ) {
                        const orderDate = new Date(order.NgayOrder)
                        const now = new Date()
                        const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))

                        if (daysDiff >= 14) {
                            const orderRef = ref(database, `orders/${orderKey}`)
                            set(orderRef, { ...order, TinhTrangKH: "Hủy - 14 ngày chưa index" })
                        }
                    }
                }
            })
        }, 60000) // Check every minute

        return () => clearInterval(interval)
    }, [orders, orderKeys, checkOrderStatus])

    const handleAfterChange = (changes: any, source: any) => {
        if (source === "edit" && Array.isArray(changes)) {
            // Process each change separately
            changes.forEach(async ([row, prop, oldValue, newValue]) => {
                // Skip update if new value is the same as old value
                if (oldValue === newValue) return

                // Skip if this is a summary row
                const isSummaryRow =
                    data[row][0]?.includes("Tuần") ||
                    data[row][0]?.includes("Chưa Index") ||
                    data[row][0]?.includes("Chưa nhập") ||
                    data[row][0]?.includes("Đơn hủy")

                if (isSummaryRow) return

                // Get the order code (Mã đơn) from the current row
                const orderCode = data[row][0]
                if (!orderCode) return

                // Find the matching order in the orders array by Mã đơn
                const orderIndex = orders.findIndex((order) => order.MaDon === orderCode)
                if (orderIndex === -1) return

                // Get the Firebase key for this order
                const orderKey = orderKeys[orderIndex]
                if (!orderKey) return

                // Get the current order data
                const updatedOrder = { ...orders[orderIndex] }
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
                    case "Time Text":
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
                                sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Vui lòng truy cập vào https://www.ylink.shop/mua-ban để xử lý đơn hàng ${updatedOrder.MaDon}`)
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
                                sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã được xử lý, kiểm tra tại https://www.ylink.shop/mua-ban`)
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
                                sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Vui lòng truy cập vào https://www.ylink.shop/mua-ban để xử lý đơn hàng ${updatedOrder.MaDon}`)
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
                                await updateUserBalance(updatedOrder.KHMua, -price, updatedOrder.TenNCC)
                                updatedOrder.paymentStatus = "paid"
                                sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã Indexed, số tiền ${price}$ đã được trừ khỏi ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban `)
                                sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Đơn hàng ${updatedOrder.MaDon} đã Indexed, số tiền ${price}$ đã được cộng vào ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban `)
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
                                await updateUserBalance(updatedOrder.KHMua, price, updatedOrder.TenNCC)
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
                        updatedOrder.TinhTrangKH = newValue
                        break
                    case "NCC":
                        updatedOrder.TinhTrangNCC = newValue
                        // Update NgayBan for non-GP orders when TinhTrangNCC changes to 'Đã lên bài'
                        if (updatedOrder.Loai !== "GP" && newValue === "Đã lên bài") {
                            const now = new Date()
                            const day = String(now.getDate()).padStart(2, "0")
                            const month = String(now.getMonth() + 1).padStart(2, "0")
                            updatedOrder.NgayBan = `${day}/${month}`

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
                                )

                                // Deduct from customer's pendingAmount and add to money
                                const customerPendingRef = ref(database, `pendingAmount/${updatedOrder.KHMua}`);
                                const customerMoneyRef = ref(database, `money/${updatedOrder.KHMua}`);
                                const supplierMoneyRef = ref(database, `money/${updatedOrder.TenNCC}`);

                                // Get current balances
                                const [customerPendingSnapshot, customerMoneySnapshot, supplierMoneySnapshot] = await Promise.all([
                                    get(customerPendingRef),
                                    get(customerMoneyRef),
                                    get(supplierMoneyRef)
                                ]);

                                let customerPendingAmount = 0;
                                let customerMoneyAmount = 0;
                                let supplierMoneyAmount = 0;

                                if (customerPendingSnapshot.exists()) {
                                    customerPendingAmount = customerPendingSnapshot.val().amount || 0;
                                }
                                if (customerMoneySnapshot.exists()) {
                                    customerMoneyAmount = customerMoneySnapshot.val().amount || 0;
                                }
                                if (supplierMoneySnapshot.exists()) {
                                    supplierMoneyAmount = supplierMoneySnapshot.val().amount || 0;
                                }

                                // Update balances
                                await Promise.all([
                                    update(customerPendingRef, { amount: customerPendingAmount - price }),
                                    update(customerMoneyRef, {
                                        amount: customerMoneyAmount + price,
                                        pendingAmount: customerMoneySnapshot.val()?.pendingAmount || 0,
                                        doneAmount: customerMoneySnapshot.val()?.doneAmount || 0
                                    }),
                                    update(supplierMoneyRef, {
                                        amount: supplierMoneyAmount + price
                                    })
                                ]);

                                updatedOrder.paymentStatus = "paid"
                                sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Đơn hàng ${updatedOrder.MaDon} đã hoàn thành, số tiền ${price}$ đã được cộng vào ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban`)
                                sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã được xử lý, số tiền ${price}$ đã được chuyển từ pendingAmount sang money trong ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban`)
                            }
                        }
                        break
                }

                // Update the order in Firebase
                const orderRef = ref(database, `orders/${orderKey}`)
                set(orderRef, updatedOrder)
                    .then(() => {
                        console.log(`Successfully updated order ${orderCode}`)
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
            const giaCuoi = giaMua - (giaMua * hoaHong) / 100
            const loiNhuan = giaBan - giaCuoi
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
                    const weekKey = `Tuần ${weekNumber}`

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
        const summary = calculateSummaryRows(orders)

        // Group orders by category
        const weeklyOrders: Record<string, any[]> = {}
        const nonIndexedOrders: any[] = []
        const notEnteredOrders: any[] = []
        const canceledOrders: any[] = []
        const otherOrders: any[] = []

        orders.forEach((order) => {
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
                        const weekKey = `Tuần ${weekNumber}`

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

        // Add weekly summaries and their orders
        Object.entries(weeklyOrders)
            .sort(([weekA], [weekB]) => {
                // Extract week numbers from "Tuần X" format
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
                        const giaCuoi = giaMua - (giaMua * hoaHong) / 100
                        const loiNhuan = giaBan - giaCuoi
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
                        "",
                        weekSummary.totalGiaBan,
                        weekSummary.totalGiaMua,
                        weekSummary.totalHoaHong,
                        weekSummary.totalGiaCuoi,
                        weekSummary.totalTTNCC,
                        weekSummary.totalLoiNhuan,
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
                        const giaCuoi = giaMua - (giaMua * hoaHong) / 100
                        const loiNhuan = giaBan - giaCuoi
                        const timeText = order.Loai === "GP" ? "" : order.TimeText
                        const index = order.Loai === "GP" ? order.Index : ""

                        // Update Status to "Đã hoàn thành" for weekly orders
                        if (order.Status !== "Đã hoàn thành") {
                            const orderRef = ref(database, `orders/${orderKeys[orders.findIndex((o) => o.MaDon === order.MaDon)]}`)
                            set(orderRef, { ...order, Status: "Đã hoàn thành" })
                        }

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
                    const giaCuoi = giaMua - (giaMua * hoaHong) / 100
                    const loiNhuan = giaBan - giaCuoi
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
                "",
                nonIndexedSummary.totalGiaBan,
                nonIndexedSummary.totalGiaMua,
                nonIndexedSummary.totalHoaHong,
                nonIndexedSummary.totalGiaCuoi,
                nonIndexedSummary.totalTTNCC,
                nonIndexedSummary.totalLoiNhuan,
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
                const giaCuoi = giaMua - (giaMua * hoaHong) / 100
                const loiNhuan = giaBan - giaCuoi
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
                    const giaCuoi = giaMua - (giaMua * hoaHong) / 100
                    const loiNhuan = giaBan - giaCuoi
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
                "",
                notEnteredSummary.totalGiaBan,
                notEnteredSummary.totalGiaMua,
                notEnteredSummary.totalHoaHong,
                notEnteredSummary.totalGiaCuoi,
                notEnteredSummary.totalTTNCC,
                notEnteredSummary.totalLoiNhuan,
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
                const giaCuoi = giaMua - (giaMua * hoaHong) / 100
                const loiNhuan = giaBan - giaCuoi
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
                    const giaCuoi = giaMua - (giaMua * hoaHong) / 100
                    const loiNhuan = giaBan - giaCuoi
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
                `Đơn hủy (${canceledSummary.count})`,
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
                const giaCuoi = giaMua - (giaMua * hoaHong) / 100
                const loiNhuan = giaBan - giaCuoi
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
    }, [orders, calculateSummaryRows])

    // Load chat messages when currentChatOrderId changes
    useEffect(() => {
        if (!currentChatOrderId) return

        const ordersRef = ref(database, "orders")

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
            message.supplierName = supplierName || userInfo?.name || userInfo?.displayName || ""
        } else if (userInfo?.role === "Khách hàng") {
            message.name = userInfo?.username || userInfo?.name || userInfo?.displayName || ""
        }

        try {
            // Get the current orders array
            const ordersRef = ref(database, "orders")
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
                        sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `KH đơn ${currentChatOrderId} - ` + newChatMessage.trim())
                    } else if (userInfo?.role === "NCC") {
                        sheetApiRequest.getIDKH(updatedOrder.TenKH, `NCC đơn ${currentChatOrderId} - ` + newChatMessage.trim())
                    }
                    // Save the updated orders array back to Firebase
                    await set(ordersRef, ordersArray)
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
                fullRowData[0]?.includes("Tuần") ||
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
                // Set KH and NCC information
                setKhMuaIB(fullRowData[23])
                setTenNBIB(fullRowData[21])

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
        { label: "Thời Gian", colspan: 2 },
        { label: "Thông Tin WEB", colspan: 2 },
        { label: "TIỀN NÈ", colspan: 6 },
        { label: "INFO Bài", colspan: 6 },
        { label: "Kiểm Tra", colspan: 2 },
        { label: "Người Bán", colspan: 2 },
        { label: "Tình Trạng", colspan: 2 },
    ]

    return (
        <>
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
                hiddenColumns={{
                    indicators: true,
                    columns:
                        userInfo?.role === "Khách hàng"
                            ? [7, 8, 9, 10, 11, 20, 21] // Giá mua, Hoa hồng, Giá cuối, TTNCC, Lợi nhuận, Tên NCC, Link NCC
                            : userInfo?.role === "NCC"
                                ? [6, 11, 20, 21] // Giá bán, Lợi nhuận
                                : [],
                }}
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
                            newData[physicalRow]?.[0]?.includes("Tuần") ||
                            newData[physicalRow]?.[0]?.includes("Chưa Index") ||
                            newData[physicalRow]?.[0]?.includes("Chưa nhập") ||
                            newData[physicalRow]?.[0]?.includes("Đơn hủy");

                        if (isSummaryRow) return;

                        // Get the order code (Mã đơn) from the current row
                        const orderCode = newData[physicalRow]?.[0];
                        if (!orderCode) return;

                        // Find the matching order in the orders array
                        const orderIndex = orders.findIndex((order) => order.MaDon === orderCode);
                        if (orderIndex === -1) return;

                        // Get the Firebase key for this order
                        const orderKey = orderKeys[orderIndex];
                        if (!orderKey) return;

                        // Process each column in the row
                        row.forEach(async (value, colIndex) => {
                            const columnName = RowHeader2[startCol + colIndex];
                            if (!columnName) return;

                            // Get the current order data
                            const updatedOrder = { ...orders[orderIndex] };

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
                                case "Time Text":
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
                                            sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Vui lòng truy cập vào https://www.ylink.shop/mua-ban để xử lý đơn hàng ${updatedOrder.MaDon}`)
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
                                            sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã được xử lý, kiểm tra tại https://www.ylink.shop/mua-ban`)
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
                                            sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Vui lòng truy cập vào https://www.ylink.shop/mua-ban để xử lý đơn hàng ${updatedOrder.MaDon}`)
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
                                            );
                                            updateUserBalance(updatedOrder.KHMua, -price, updatedOrder.TenNCC);
                                            updatedOrder.paymentStatus = "paid";
                                            sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã Indexed, số tiền ${price}$ đã được trừ khỏi ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban `)
                                            sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Đơn hàng ${updatedOrder.MaDon} đã Indexed, số tiền ${price}$ đã được cộng vào ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban `)
                                        }
                                    } else if (updatedOrder.Index === "Indexed" && value !== "Indexed") {
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
                                            );
                                            updateUserBalance(updatedOrder.KHMua, price, updatedOrder.TenNCC)
                                            updatedOrder.paymentStatus1 = "refunded"
                                        }
                                    }
                                    break
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
                                    updatedOrder.TinhTrangNCC = value
                                    // Update NgayBan for non-GP orders when TinhTrangNCC changes to 'Đã lên bài'
                                    if (updatedOrder.Loai !== "GP" && value === "Đã lên bài") {
                                        const now = new Date()
                                        const day = String(now.getDate()).padStart(2, "0")
                                        const month = String(now.getMonth() + 1).padStart(2, "0")
                                        updatedOrder.NgayBan = `${day}/${month}`

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
                                            )

                                            // Deduct from customer's pendingAmount and add to money
                                            const customerPendingRef = ref(database, `pendingAmount/${updatedOrder.KHMua}`);
                                            const customerMoneyRef = ref(database, `money/${updatedOrder.KHMua}`);
                                            const supplierMoneyRef = ref(database, `money/${updatedOrder.TenNCC}`);

                                            // Get current balances
                                            const [customerPendingSnapshot, customerMoneySnapshot, supplierMoneySnapshot] = await Promise.all([
                                                get(customerPendingRef),
                                                get(customerMoneyRef),
                                                get(supplierMoneyRef)
                                            ]);

                                            let customerPendingAmount = 0;
                                            let customerMoneyAmount = 0;
                                            let supplierMoneyAmount = 0;

                                            if (customerPendingSnapshot.exists()) {
                                                customerPendingAmount = customerPendingSnapshot.val().amount || 0;
                                            }
                                            if (customerMoneySnapshot.exists()) {
                                                customerMoneyAmount = customerMoneySnapshot.val().amount || 0;
                                            }
                                            if (supplierMoneySnapshot.exists()) {
                                                supplierMoneyAmount = supplierMoneySnapshot.val().amount || 0;
                                            }

                                            // Update balances
                                            await Promise.all([
                                                update(customerPendingRef, { amount: customerPendingAmount - price }),
                                                update(customerMoneyRef, {
                                                    amount: customerMoneyAmount + price,
                                                    pendingAmount: customerMoneySnapshot.val()?.pendingAmount || 0,
                                                    doneAmount: customerMoneySnapshot.val()?.doneAmount || 0
                                                }),
                                                update(supplierMoneyRef, {
                                                    amount: supplierMoneyAmount + price
                                                })
                                            ]);

                                            updatedOrder.paymentStatus = "paid"
                                            sheetApiRequest.getIDNCC(updatedOrder.TenNCC, `Đơn hàng ${updatedOrder.MaDon} đã hoàn thành, số tiền ${price}$ đã được cộng vào ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban`)
                                            sheetApiRequest.getIDKH(updatedOrder.TenKH, `Đơn hàng ${updatedOrder.MaDon} đã được xử lý, số tiền ${price}$ đã được chuyển từ pendingAmount sang money trong ví của bạn, kiểm tra tại https://www.ylink.shop/mua-ban`)
                                        }
                                    }
                                    break;
                            }

                            // Update the order in Firebase
                            const orderRef = ref(database, `orders/${orderKey}`);
                            set(orderRef, updatedOrder)
                                .then(() => {
                                    console.log(`Successfully updated order ${orderCode}`);
                                })
                                .catch((error) => {
                                    console.error(`Error updating order ${orderCode}:`, error);
                                });
                        });
                    });
                }}
                contextMenu={contextMenuItems}
                columns={RowHeader2.map((header, index) => {
                    const columnSetting = columnSettings[header]

                    // Basic read-only settings based on user role
                    let isReadOnly = false

                    if (userInfo?.role === "NCC") {
                        // NCC can only edit Link KQ
                        isReadOnly = header !== "Link KQ"
                    } else if (userInfo?.role === "Khách hàng") {
                        // Khách hàng can edit these columns
                        isReadOnly = !["Bài Viết", "Anchor 1", "Link 1", "Anchor 2", "Link 2", "Index", "Loại"].includes(header)
                    } else {
                        // Other roles can edit all columns
                        isReadOnly = false
                    }

                    return {
                        data: index,
                        title: header,
                        width:
                            header === "Bài Viết" ||
                                header === "Site" ||
                                header === "Link KQ" ||
                                header === "Link 1" ||
                                header === "Link 2"
                                ? 100
                                : undefined,
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
                        (data[row][0]?.includes("Tuần") ||
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
                            orderCode.includes("Tuần") ||
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
                role={userInfo?.role}
                supplierName={supplierName}
                user={userInfo}
            />
            <HelpButton userRole={userInfo?.role} currentOrder={selectedOrder} />
        </>
    )
}
