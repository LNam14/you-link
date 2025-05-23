"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Modal, message } from "antd"
import { AlertCircle, Wallet } from "lucide-react"
import { z } from "zod"
import transactionApiRequest from "@/apiRequests/transactions"
import { database } from "@/lib/firebase"
import { ref, update } from "firebase/database"
import { get } from "firebase/database"

// Define Zod schema for withdraw form validation
const withdrawSchema = z.object({
    amount: z
        .number()
        .int({ message: "Số tiền phải là số nguyên" })
        .min(10, { message: "Số tiền rút tối thiểu là 10 USDT" })
        .max(10000, { message: "Số tiền rút tối đa là 10,000 USDT" }),
    binanceAddress: z.string().min(1, { message: "Vui lòng nhập địa chỉ ví Binance" }),
    network: z.string().min(1, { message: "Vui lòng chọn mạng lưới" }),
})

interface WithdrawModalProps {
    isVisible: boolean
    onClose: () => void
    username?: string
    currentBalance: number
    pendingAmount: number
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({
    isVisible,
    onClose,
    username,
    currentBalance,
    pendingAmount,
}) => {
    const [withdrawAmount, setWithdrawAmount] = useState<string>("")
    const [binanceAddress, setBinanceAddress] = useState<string>("")
    const [network, setNetwork] = useState<string>("TRC20")
    const [withdrawErrors, setWithdrawErrors] = useState<{ [key: string]: string }>({})
    const [isWithdrawSubmitting, setIsWithdrawSubmitting] = useState(false)

    // Send message to Telegram
    const handleMessageNCC = useCallback(
        async (amount: number, network: string) => {
            const chatId = "-4618711960" // Chỉ gửi đến ID này

            // Tạo nội dung tin nhắn với thông tin người dùng và số tiền
            const messageText = `${username} đã yêu cầu rút ${amount} USDT về địa chỉ ${binanceAddress} (${network}). Vui lòng kiểm tra và xác nhận.`

            // Token bot Telegram
            const botToken = "7678598532:AAFeyTmZacHfu1_8AaX7ugs5bUdSvt67G8U"

            try {
                // Gửi tin nhắn qua Telegram API
                const url = `https://api.telegram.org/bot${botToken}/sendMessage`
                const params = new URLSearchParams({
                    chat_id: chatId,
                    text: messageText,
                })

                console.log("Sending message to chat ID:", chatId)
                const res = await fetch(`${url}?${params.toString()}`)
                const responseData = await res.json()

                console.log("Telegram API response:", responseData)

                if (responseData.ok) {
                    console.log(`Đã gửi tin nhắn thành công đến nhóm!`)
                } else {
                    console.error(`Gửi tin nhắn thất bại: ${responseData.description}`)
                }
            } catch (error) {
                console.error("Error sending message:", error)
            }
        },
        [username, binanceAddress],
    )

    const handleWithdrawSubmit = useCallback(async () => {
        setIsWithdrawSubmitting(true)
        setWithdrawErrors({})

        try {
            // Parse amount to number - remove commas first
            const parsedAmount = Number.parseInt(withdrawAmount.replace(/,/g, ""), 10)

            // Validate with Zod
            const validatedData: any = withdrawSchema.parse({
                amount: parsedAmount,
                binanceAddress,
                network,
            })

            // Check if user has enough balance
            if (parsedAmount > currentBalance) {
                setWithdrawErrors({ amount: "Số dư không đủ để rút" })
                return
            }

            // Get current pendingAmount from Firebase
            if (!username) {
                setWithdrawErrors({ amount: "Không tìm thấy thông tin người dùng" })
                return
            }

            const userBalanceRef = ref(database, `money/${username}`)
            const snapshot = await get(userBalanceRef)
            const currentData = snapshot.val() || {}
            const currentPendingAmount = currentData.pendingAmount || 0

            // Check if total pending amount (current + new) would exceed available balance
            if (currentPendingAmount + parsedAmount > currentBalance) {
                setWithdrawErrors({
                    amount: `Số tiền rút vượt quá số dư khả dụng. Đang có ${currentPendingAmount} USDT đang chờ xử lý.`,
                })
                return
            }

            // Simulate network delay for better UX
            await new Promise((resolve) => setTimeout(resolve, 1000))

            // Create withdrawal request using transactions API
            const res: any = await transactionApiRequest.create({
                ...validatedData,
                type: "withdraw",
                status: "pending",
                username: username,
            })

            if (res.success) {
                // Update pendingAmount in Firebase
                await update(userBalanceRef, {
                    pendingAmount: currentPendingAmount + parsedAmount,
                })

                // Send notification to admin
                await handleMessageNCC(parsedAmount, network)

                Modal.success({
                    title: "Yêu cầu rút tiền thành công",
                    content: `Yêu cầu rút ${parsedAmount} USDT đã được gửi. Vui lòng chờ xác nhận.`,
                    onOk: () => {
                        handleClose()
                    },
                    okButtonProps: {
                        className: "bg-green-600 hover:bg-green-700 text-white",
                    },
                })
            } else {
                message.error("Có lỗi xảy ra, vui lòng thử lại sau!")
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors: { [key: string]: string } = {}
                error.errors.forEach((err) => {
                    if (err.path) {
                        errors[err.path[0]] = err.message
                    }
                })
                setWithdrawErrors(errors)
            } else {
                message.error("Có lỗi xảy ra, vui lòng thử lại sau!")
            }
        } finally {
            setIsWithdrawSubmitting(false)
        }
    }, [withdrawAmount, binanceAddress, network, currentBalance, username, handleMessageNCC, pendingAmount])

    // Reset form when modal is closed
    const handleClose = useCallback(() => {
        setWithdrawAmount("")
        setBinanceAddress("")
        setNetwork("TRC20")
        setWithdrawErrors({})
        onClose()
    }, [onClose])

    return (
        <Modal
            title={
                <div className="flex items-center text-lg font-semibold">
                    <Wallet className="mr-2 h-5 w-5 text-red-500" />
                    Rút tiền
                </div>
            }
            open={isVisible}
            onCancel={handleClose}
            footer={[
                <button
                    key="cancel"
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Hủy
                </button>,
                <button
                    key="submit"
                    onClick={handleWithdrawSubmit}
                    disabled={isWithdrawSubmitting}
                    className="ml-3 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                    {isWithdrawSubmitting ? (
                        <>
                            <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            Đang xử lý...
                        </>
                    ) : (
                        "Xác nhận rút tiền"
                    )}
                </button>,
            ]}
            width={600}
        >
            <div className="mt-4 space-y-4">
                {/* Amount Input */}
                <div>
                    <label htmlFor="withdrawAmount" className="block text-sm font-medium text-gray-700 mb-1">
                        Số tiền rút <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-md shadow-sm">
                        <input
                            type="text"
                            id="withdrawAmount"
                            value={withdrawAmount}
                            onChange={(e) => {
                                const value = e.target.value
                                if (/^[0-9,]*$/.test(value) || value === "") {
                                    const plainValue = value.replace(/,/g, "")
                                    if (plainValue === "") {
                                        setWithdrawAmount("")
                                    } else {
                                        setWithdrawAmount(plainValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","))
                                    }
                                }
                            }}
                            className={`block w-full pr-20 border ${withdrawErrors.amount ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"} rounded-md py-2 px-3 focus:outline-none focus:ring-1 sm:text-sm`}
                            placeholder="Nhập số tiền"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center">
                            <span className="h-full inline-flex items-center px-3 border-l border-gray-300 bg-gray-50 text-gray-500 sm:text-sm rounded-r-md">
                                USDT
                            </span>
                        </div>
                    </div>
                    {withdrawErrors.amount && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {withdrawErrors.amount}
                        </p>
                    )}
                </div>

                {/* Binance Address */}
                <div>
                    <label htmlFor="binanceAddress" className="block text-sm font-medium text-gray-700 mb-1">
                        Địa chỉ ví Binance <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-md shadow-sm">
                        <input
                            type="text"
                            id="binanceAddress"
                            value={binanceAddress}
                            onChange={(e) => setBinanceAddress(e.target.value)}
                            className={`block w-full border ${withdrawErrors.binanceAddress ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"} rounded-md py-2 px-3 focus:outline-none focus:ring-1 sm:text-sm`}
                            placeholder="Nhập địa chỉ ví Binance"
                        />
                    </div>
                    {withdrawErrors.binanceAddress && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {withdrawErrors.binanceAddress}
                        </p>
                    )}
                </div>

                {/* Network Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mạng lưới</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div
                            className={`border rounded-lg p-4 flex items-center cursor-pointer hover:border-blue-500 ${network === "TRC20" ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
                            onClick={() => setNetwork("TRC20")}
                        >
                            <span>TRC20</span>
                        </div>
                    </div>
                    {withdrawErrors.network && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {withdrawErrors.network}
                        </p>
                    )}
                </div>

                <div className="text-sm text-gray-500">
                    <p>Lưu ý quan trọng:</p>
                    <ul className="list-disc pl-5 mt-1">
                        <li>Số tiền rút tối thiểu: 10 USDT</li>
                        <li>Số tiền rút tối đa: 10,000 USDT</li>
                        <li>Vui lòng kiểm tra kỹ địa chỉ ví trước khi rút</li>
                        <li>Thời gian xử lý: 24-48 giờ</li>
                    </ul>
                </div>
            </div>
        </Modal>
    )
}

export default WithdrawModal
