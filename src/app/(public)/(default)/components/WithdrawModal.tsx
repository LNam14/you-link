"use client"

import type React from "react"
import { useState, useCallback, useEffect } from "react"
import { Modal, message } from "antd"
import { AlertCircle, Wallet, ArrowRight } from "lucide-react"
import { z } from "zod"
import transactionApiRequest from "@/apiRequests/transactions"

// Define Zod schema for withdraw form validation
const withdrawSchema = z.object({
    amount: z
        .number()
        .positive({ message: "Số tiền phải lớn hơn 0" }),
    binanceAddress: z.string().min(1, { message: "Vui lòng nhập địa chỉ ví Binance" }),
    network: z.string().min(1, { message: "Vui lòng chọn mạng lưới" }),
})

interface WithdrawModalProps {
    isVisible: boolean
    onClose: () => void
    username?: string
    currentBalance: number
    pendingAmount: number
    completedOrdersAmount?: number
    week?: string | number
    network?: string
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({
    isVisible,
    onClose,
    username,
    currentBalance,
    pendingAmount,
    completedOrdersAmount = 0,
    week,
    network: propNetwork,
}) => {
    const [withdrawAmount, setWithdrawAmount] = useState<string>(completedOrdersAmount.toString())
    const [binanceAddress, setBinanceAddress] = useState<string>("")
    const [network, setNetwork] = useState<string>(propNetwork || "TRC20")
    const [withdrawErrors, setWithdrawErrors] = useState<{ [key: string]: string }>({})
    const [isWithdrawSubmitting, setIsWithdrawSubmitting] = useState(false)

    // Update withdrawAmount when completedOrdersAmount changes
    useEffect(() => {
        setWithdrawAmount(completedOrdersAmount.toString())
        if (propNetwork) setNetwork(propNetwork)
    }, [completedOrdersAmount, propNetwork])

    // Send message to Telegram
    const handleMessageNCC = useCallback(
        async (amount: number, network: string, week: string | number) => {
            const chatId = "-4618711960"
            const messageText = `${username} đã yêu cầu rút ${amount} USDT tuần ${week} về địa chỉ ${binanceAddress} (${network}). Vui lòng kiểm tra và xác nhận.`
            const botToken = "7678598532:AAFeyTmZacHfu1_8AaX7ugs5bUdSvt67G8U"

            try {
                const url = `https://ylink.qctl44.workers.dev/bot${botToken}/sendMessage`
                const params = new URLSearchParams({
                    chat_id: chatId,
                    text: messageText,
                })

                const res = await fetch(`${url}?${params.toString()}`)
                const responseData = await res.json()

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
            const parsedAmount = Number.parseFloat(withdrawAmount.replace(/,/g, "."))

            if (!username) {
                setWithdrawErrors({ amount: "Không tìm thấy thông tin người dùng" })
                return
            }
            console.log(
                "ok", {
                type: "withdraw",
                wallet: binanceAddress,
                address: network,
                week: week,
                name: username,
                amount: parsedAmount
            }
            );


            const res: any = await transactionApiRequest.create({
                type: "withdraw",
                amount: Number(parsedAmount.toFixed(2)),
                paymentMethod: network,
                wallet: binanceAddress?.toString(),
                week: week,
                address: network,
            })

            if (res.success) {
                handleMessageNCC(Number(parsedAmount.toFixed(2)), network, week?.toString() || "")
                Modal.success({
                    title: "Yêu cầu rút tiền thành công",
                    content: `Yêu cầu rút ${parsedAmount.toFixed(2)} USDT đã được gửi. Vui lòng chờ xác nhận.`,
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
    }, [withdrawAmount, binanceAddress, network, currentBalance, username, week])

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
                <div className="flex items-center text-lg font-semibold text-gray-800">
                    <Wallet className="mr-2 h-5 w-5 text-emerald-600" />
                    Yêu cầu thanh toán
                </div>
            }
            open={isVisible}
            onCancel={handleClose}
            footer={null}
            width={500}
        >
            <div className="space-y-6 pt-4">
                {/* Amount Display */}
                <div className="rounded-lg bg-emerald-50 p-4 text-center">
                    <p className="text-sm text-gray-600 mb-2">Số tiền thanh toán</p>
                    <p className="text-3xl font-bold text-emerald-600">{completedOrdersAmount.toFixed(2)} USDT</p>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    {/* Network Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mạng lưới <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={network}
                            onChange={(e) => setNetwork(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                            <option value="TRC20">TRC20 (TRON)</option>
                            <option value="BEP20">BEP20 (BSC)</option>
                            <option value="ERC20">ERC20 (Ethereum)</option>
                        </select>
                    </div>

                    {/* Binance Address */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Địa chỉ ví Binance <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={binanceAddress}
                            onChange={(e) => setBinanceAddress(e.target.value)}
                            className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${withdrawErrors.binanceAddress
                                ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                                : "border-gray-300 focus:border-emerald-500 focus:ring-emerald-500/20"
                                }`}
                            placeholder="Nhập địa chỉ ví Binance"
                        />
                        {withdrawErrors.binanceAddress && (
                            <p className="mt-1 flex items-center text-sm text-red-600">
                                <AlertCircle className="mr-1 h-4 w-4" />
                                {withdrawErrors.binanceAddress}
                            </p>
                        )}
                    </div>
                </div>

                {/* Error Display */}
                {withdrawErrors.amount && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <p className="flex items-center text-sm text-red-800">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            {withdrawErrors.amount}
                        </p>
                    </div>
                )}

                {/* Note */}
                <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="font-medium mb-1">Lưu ý:</p>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                        <li>Kiểm tra kỹ địa chỉ ví trước khi gửi</li>
                        <li>Thời gian xử lý: 24-48 giờ</li>
                    </ul>
                </div>

                {/* Buttons */}
                <div className="flex space-x-3">
                    <button
                        onClick={handleClose}
                        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleWithdrawSubmit}
                        disabled={isWithdrawSubmitting || !binanceAddress}
                        className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isWithdrawSubmitting ? (
                            <div className="flex items-center justify-center">
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"></div>
                                Đang xử lý...
                            </div>
                        ) : (
                            <div className="flex items-center justify-center">
                                Xác nhận
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default WithdrawModal
