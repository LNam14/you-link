import React, { useState } from "react"
import { X } from "lucide-react"

interface DirectMessageModalProps {
    show: boolean
    onClose: () => void
    onSend: (message: string) => void
    loading?: boolean
}

const DirectMessageModal: React.FC<DirectMessageModalProps> = ({ show, onClose, onSend, loading }) => {
    const [directMessage, setDirectMessage] = useState("")

    if (!show) return null

    const handleSend = () => {
        if (!directMessage.trim()) return
        onSend(directMessage)
        setDirectMessage("")
    }

    const handleClose = () => {
        setDirectMessage("")
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-500 text-gray-800">Gửi tin nhắn trực tiếp</h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="mb-4">
                    <p className="text-gray-600 mb-2">Tin nhắn sẽ được gửi đến tất cả NCC có IdGroup trong dữ liệu.</p>
                    <textarea
                        value={directMessage}
                        onChange={(e) => setDirectMessage(e.target.value)}
                        placeholder="Nhập tin nhắn cần gửi..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                        autoFocus
                    />
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!directMessage.trim() || loading}
                        className={`px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${!directMessage.trim() || loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                    >
                        {loading ? "Đang gửi..." : "Gửi tin nhắn"}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DirectMessageModal 