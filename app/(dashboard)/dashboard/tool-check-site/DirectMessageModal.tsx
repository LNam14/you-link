"use client"

import { useState } from "react"
import { X, Send } from "lucide-react"

interface DirectMessageModalProps {
    show: boolean
    loading: boolean
    onClose: () => void
    onSend: (message: string) => void
}

export default function DirectMessageModal({
    show,
    loading,
    onClose,
    onSend,
}: DirectMessageModalProps) {
    const [message, setMessage] = useState("")

    if (!show) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (message.trim()) {
            onSend(message.trim())
            setMessage("")
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-500 text-gray-800">Soạn tin nhắn</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                        disabled={loading}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Nhập tin nhắn bạn muốn gửi..."
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400 bg-white resize-none"
                        disabled={loading}
                    />

                    <div className="flex justify-end space-x-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !message.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Đang gửi...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Gửi tin nhắn
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

