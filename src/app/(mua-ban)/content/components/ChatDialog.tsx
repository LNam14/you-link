"use client"
import { memo, useState, useRef, useEffect } from "react"
import { Modal, Button } from "antd"
import { ref, onValue, get, set } from "firebase/database"
import { database } from "@/lib/firebase"
import getUserInfo from "@/components/userInfo"

interface ChatMessage {
    text: string
    sender: string
    senderRole: string
    timestamp: number
    ngayChat: string
    name?: string
    supplierName?: string
}

interface ChatDialogProps {
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
}

const ChatDialog = memo(({
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
}: ChatDialogProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        if (chatDialogOpen) {
            scrollToBottom()
        }
    }, [currentChatMessages, chatDialogOpen])

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp)
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${hours}:${minutes}`
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
                                            <div className={`text-xs mt-1 ${isOwnMessage ? "text-right" : "text-left"} text-gray-500`}>
                                                {msg.ngayChat} {formatTimestamp(msg.timestamp)}
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

            {/* Nhập tin nhắn */}
            <div className="flex items-center gap-2">
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
})

ChatDialog.displayName = "ChatDialog"

export default ChatDialog 