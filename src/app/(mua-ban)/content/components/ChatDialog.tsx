"use client"
import { memo, useRef, useEffect, useCallback } from "react"
import type React from "react"

import { Modal, Button } from "antd"

interface ChatMessage {
    role: string
    name: string
    message: string
    time: string
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
    isUpdating?: boolean
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
        isUpdating = false,
    }: ChatDialogProps) => {
        const messagesEndRef = useRef<HTMLDivElement>(null)
        const inputRef = useRef<HTMLInputElement>(null)

        const scrollToBottom = useCallback(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }, [])

        useEffect(() => {
            if (chatDialogOpen) {
                scrollToBottom()
                // Focus on input when dialog opens
                setTimeout(() => {
                    inputRef.current?.focus()
                }, 100)
            }
        }, [currentChatMessages, chatDialogOpen, scrollToBottom])

        const handleClose = useCallback(() => {
            setChatDialogOpen(false)
        }, [setChatDialogOpen])

        const handleKeyDown = useCallback(
            (e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && !e.shiftKey && !isUpdating) {
                    e.preventDefault()
                    sendChatMessage()
                }
            },
            [sendChatMessage, isUpdating],
        )

        const handleSendClick = useCallback(() => {
            if (!isUpdating) {
                sendChatMessage()
            }
        }, [sendChatMessage, isUpdating])

        const getRoleDisplayName = useCallback(
            (msgRole: string, msgName: string) => {
                if (msgRole === "NCC") {
                    return supplierName || msgName || "Nhà cung cấp"
                }
                return msgName || msgRole || "Người dùng"
            },
            [supplierName],
        )

        const formatMessageTime = useCallback((timeString: string) => {
            try {
                // If it's already in the correct format, return as is
                if (timeString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                    return timeString
                }

                // Try to parse and format the date
                const date = new Date(timeString)
                if (!isNaN(date.getTime())) {
                    return date
                        .toLocaleString("vi-VN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: false,
                        })
                        .replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, "$3-$2-$1 $4:$5:$6")
                }

                return timeString
            } catch {
                return timeString
            }
        }, [])

        return (
            <Modal
                title={
                    <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold text-gray-800">
                            💬 Trao đổi về đơn hàng <span className="text-blue-600">#{currentChatOrderId}</span>
                        </div>
                        {isUpdating && (
                            <div className="flex items-center text-sm text-blue-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                Đang gửi...
                            </div>
                        )}
                    </div>
                }
                open={chatDialogOpen}
                onCancel={handleClose}
                footer={null}
                width={800}
                destroyOnClose
                maskClosable={!isUpdating}
            >
                {/* Khu vực tin nhắn */}
                <div
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    className="h-[400px] overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg [&::-webkit-scrollbar]:hidden"
                >
                    {currentChatMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-center text-gray-400 italic">Chưa có tin nhắn nào</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {currentChatMessages.map((msg: ChatMessage, index: number) => {
                                const isOwnMessage = msg.role === role
                                const isFirstInGroup = index === 0 || currentChatMessages[index - 1].role !== msg.role
                                const displayName = getRoleDisplayName(msg.role, msg.name)

                                return (
                                    <div key={index} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                        <div className="max-w-[70%]">
                                            {isFirstInGroup && (
                                                <div
                                                    className={`text-xs font-medium mb-1 ${isOwnMessage ? "text-right mr-2" : "text-left ml-2"
                                                        } text-gray-600`}
                                                >
                                                    {displayName}
                                                </div>
                                            )}
                                            <div
                                                className={`relative px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md
                                            ${isOwnMessage
                                                        ? "bg-blue-500 text-white rounded-tr-md"
                                                        : "bg-white text-gray-800 border border-gray-200 rounded-tl-md"
                                                    }`}
                                            >
                                                <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</div>
                                                <div className={`text-xs mt-2 ${isOwnMessage ? "text-blue-100" : "text-gray-500"}`}>
                                                    {formatMessageTime(msg.time)}
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
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newChatMessage}
                        onChange={(e) => setNewChatMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập tin nhắn..."
                        disabled={isUpdating}
                        className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Button
                        type="primary"
                        onClick={handleSendClick}
                        disabled={!newChatMessage.trim() || isUpdating}
                        loading={isUpdating}
                        className="flex items-center justify-center w-12 h-12 rounded-full !min-w-0 !p-0 transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                        size="large"
                    >
                        {!isUpdating && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                            </svg>
                        )}
                    </Button>
                </div>

                {/* Message count indicator */}
                {currentChatMessages.length > 0 && (
                    <div className="text-xs text-gray-500 mt-2 text-center">{currentChatMessages.length} tin nhắn</div>
                )}
            </Modal>
        )
    },
)

ChatDialog.displayName = "ChatDialog"

export default ChatDialog
