"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Modal, message, Table, Tag } from "antd"
import { AlertCircle, ArrowUpCircle, CheckCircle2, Copy, CreditCard, History, Plus, Wallet } from "lucide-react"
import { z } from "zod"
import transactionApiRequest from "@/apiRequests/transactions"
import sheetApiRequest from "@/apiRequests/sheet"

// Define Zod schema for deposit form validation
const depositSchema = z.object({
    amount: z
        .number()
        .int({ message: "Số tiền phải là số nguyên" })
        .min(10, { message: "Số tiền nạp tối thiểu là 10 USDT" })
        .max(10000, { message: "Số tiền nạp tối đa là 10,000 USDT" }),
    paymentMethod: z.string().min(1, { message: "Vui lòng chọn phương thức thanh toán" }),
    type: z.literal("deposit"),
})

// Memoized BinanceWalletComponent
const BinanceWalletComponent = ({ onCopySuccess }: { onCopySuccess: () => void }) => {
    const walletAddress = "THEe5ywtLPwMWmCWKAQzMxDT694Sa2oNYZ"
    const [copySuccess, setCopySuccess] = useState("")

    // Function to copy text to clipboard
    const copyToClipboard = useCallback(
        (text: string) => {
            navigator.clipboard.writeText(text).then(
                () => {
                    setCopySuccess("wallet")
                    setTimeout(() => setCopySuccess(""), 3000)
                    onCopySuccess()
                },
                () => {
                    message.error("Không thể sao chép!")
                },
            )
        },
        [onCopySuccess],
    )

    return (
        <div className="bg-gray-50 p-4 rounded-lg mt-4">
            <div className="flex flex-col md:flex-row justify-between items-start">
                <div className="w-full md:w-2/3 mb-4 md:mb-0 md:pr-4">
                    <h3 className="font-medium mb-3">Thông tin ví Binance</h3>

                    <div className="space-y-3">
                        <div>
                            <p className="text-sm mb-1">Địa chỉ ví:</p>
                            <div className="flex items-center">
                                <input
                                    value={walletAddress}
                                    readOnly
                                    className="w-full font-mono text-sm border border-gray-300 rounded-md p-2 resize-none"
                                />
                                <button
                                    onClick={() => copyToClipboard(walletAddress)}
                                    className="ml-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md flex items-center justify-center"
                                    type="button"
                                >
                                    {copySuccess === "wallet" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm mb-1">Mạng:</p>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                TRC20
                            </span>
                        </div>

                        <hr className="my-3" />

                        <div className="text-sm text-gray-500">
                            <p>Lưu ý quan trọng:</p>
                            <ul className="list-disc pl-5 mt-1">
                                <li>Vui lòng chỉ gửi USDT qua mạng TRC20</li>
                                <li>Gửi sai mạng có thể dẫn đến mất tiền vĩnh viễn</li>
                                <li>Thời gian xác nhận từ 10-30 phút sau khi giao dịch được xác nhận trên blockchain</li>
                                <li>Số tiền tối thiểu: 10 USDT</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-1/3 flex flex-col items-center">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <img
                            src="/qr-code-binance.png"
                            alt="QR Code Binance"
                            className="w-32 h-32 object-contain"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src =
                                    "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=THEe5ywtLPwMWmCWKAQzMxDT694Sa2oNYZ"
                            }}
                        />
                    </div>
                    <p className="text-xs text-center mt-2">Quét mã QR để chuyển tiền</p>
                </div>
            </div>
        </div>
    )
}

// Memoized BankTransferComponent
const BankTransferComponent = () => {
    return (
        <div className="bg-gray-50 p-4 rounded-lg mt-4">
            <div className="flex flex-col items-center justify-center py-8">
                <CreditCard className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">Chức năng đang phát triển</h3>
                <p className="text-gray-500 text-center max-w-md">
                    Tính năng chuyển khoản ngân hàng đang trong quá trình phát triển và sẽ sớm được ra mắt. Vui lòng sử dụng
                    phương thức thanh toán khác.
                </p>
            </div>
        </div>
    )
}

// Deposit Form Component
const DepositForm = ({
    depositAmount,
    setDepositAmount,
    paymentMethod,
    setPaymentMethod,
    depositErrors,
    isDepositSubmitting,
    onSubmit,
    onCancel,
}: {
    depositAmount: string
    setDepositAmount: (value: string) => void
    paymentMethod: string
    setPaymentMethod: (value: string) => void
    depositErrors: { [key: string]: string }
    isDepositSubmitting: boolean
    onSubmit: () => void
    onCancel: () => void
}) => {
    const amountInputRef = useRef<HTMLInputElement>(null)

    // Focus the input when the component mounts
    useEffect(() => {
        if (amountInputRef.current) {
            setTimeout(() => {
                amountInputRef.current?.focus()
            }, 100)
        }
    }, [])

    // Improved handleAmountChange function
    const handleAmountChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value
            // Only process if the input is a valid number or empty
            if (/^[0-9,]*$/.test(value) || value === "") {
                // Remove existing commas before processing
                const plainValue = value.replace(/,/g, "")

                if (plainValue === "") {
                    setDepositAmount("")
                } else {
                    // Format with commas
                    setDepositAmount(plainValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","))
                }
            }
        },
        [setDepositAmount],
    )

    return (
        <div className="mt-4">
            <div className="space-y-4">
                {/* Amount Input */}
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                        Số tiền nạp <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-md shadow-sm">
                        <input
                            type="text"
                            id="amount"
                            ref={amountInputRef}
                            value={depositAmount}
                            onChange={handleAmountChange}
                            className={`block w-full pr-20 border ${depositErrors.amount ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"} rounded-md py-2 px-3 focus:outline-none focus:ring-1 sm:text-sm`}
                            placeholder="Nhập số tiền"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center">
                            <span className="h-full inline-flex items-center px-3 border-l border-gray-300 bg-gray-50 text-gray-500 sm:text-sm rounded-r-md">
                                USDT
                            </span>
                        </div>
                    </div>
                    {depositErrors.amount && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {depositErrors.amount}
                        </p>
                    )}
                </div>

                {/* Payment Method */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phương thức thanh toán</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div
                            className={`border rounded-lg p-4 flex items-center cursor-pointer hover:border-blue-500 ${paymentMethod === "Ví điện tử" ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
                            onClick={() => setPaymentMethod("Ví điện tử")}
                        >
                            <Wallet className="h-5 w-5 mr-2 text-blue-500" />
                            <span>Ví Binance</span>
                        </div>
                        <div
                            className={`border rounded-lg p-4 flex items-center cursor-pointer hover:border-blue-500 ${paymentMethod === "Ngân hàng" ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
                            onClick={() => setPaymentMethod("Ngân hàng")}
                        >
                            <CreditCard className="h-5 w-5 mr-2 text-blue-500" />
                            <span>Chuyển khoản ngân hàng</span>
                        </div>
                    </div>
                    {depositErrors.paymentMethod && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {depositErrors.paymentMethod}
                        </p>
                    )}
                </div>

                {paymentMethod === "Ngân hàng" && <BankTransferComponent />}
                {paymentMethod === "Ví điện tử" && (
                    <BinanceWalletComponent onCopySuccess={() => message.success("Đã sao chép địa chỉ ví thành công!")} />
                )}

                <div className="flex justify-end mt-6 space-x-2">
                    <button
                        onClick={onCancel}
                        disabled={isDepositSubmitting}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        Quay lại
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={isDepositSubmitting}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center"
                    >
                        {isDepositSubmitting ? (
                            <>
                                <svg
                                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                            "Xác nhận nạp tiền"
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Deposit History Tab Component
const DepositHistoryTab = ({
    data,
    loading,
    onNewDeposit,
}: {
    data: any[]
    loading: boolean
    onNewDeposit: () => void
}) => (
    <div className="mt-4">
        <Table
            dataSource={data}
            columns={[
                {
                    title: "ID",
                    dataIndex: "id",
                    key: "id",
                    width: 70,
                },
                {
                    title: "Số tiền",
                    dataIndex: "amount",
                    key: "amount",
                    render: (amount: number) => <span className="font-medium">{amount} USDT</span>,
                },
                {
                    title: "Ngày nạp",
                    dataIndex: "deposit_date",
                    key: "deposit_date",
                },
                {
                    title: "Phương thức",
                    dataIndex: "method",
                    key: "method",
                },
                {
                    title: "Nội dung",
                    dataIndex: "description",
                    key: "description",
                },
                {
                    title: "Trạng thái",
                    dataIndex: "status",
                    key: "status",
                    render: (status: string) => {
                        let color = ""
                        let text = ""

                        switch (status) {
                            case "Hoàn thành":
                                color = "green"
                                text = "Hoàn thành"
                                break
                            case "Đang chờ":
                                color = "gold"
                                text = "Đang xử lý"
                                break
                            case "Lỗi":
                                color = "red"
                                text = "Thất bại"
                                break
                            default:
                                color = "default"
                                text = status
                        }

                        return (
                            <Tag className="my-0.5 rounded-full" color={color}>
                                {text}
                            </Tag>
                        )
                    },
                },
            ]}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            className="mt-4"
            loading={loading}
        />
        <div className="flex justify-center mt-4">
            <button
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center"
                onClick={onNewDeposit}
            >
                <Plus className="h-4 w-4 mr-1" />
                Nạp tiền mới
            </button>
        </div>
    </div>
)

interface DepositModalProps {
    isVisible: boolean
    onClose: () => void
    username?: string
}

const DepositModal: React.FC<DepositModalProps> = ({ isVisible, onClose, username }) => {
    // Form state
    const [depositAmount, setDepositAmount] = useState<string>("")
    const [paymentMethod, setPaymentMethod] = useState<string>("Ví điện tử")
    const [depositErrors, setDepositErrors] = useState<{ [key: string]: string }>({})
    const [isDepositSubmitting, setIsDepositSubmitting] = useState(false)
    const [activeDepositTab, setActiveDepositTab] = useState<string>("history")
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState([])

    // Fetch transaction data
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const response: any = await transactionApiRequest.get()
            const transactionData = Array.isArray(response?.data) ? response.data : []
            setData(transactionData || [])
        } catch (error) {
            console.error("Error fetching data:", error)
            setData([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (isVisible) {
            fetchData()
        }
    }, [isVisible, fetchData])

    // Handle tab change
    const handleTabChange = useCallback((tab: string) => {
        setActiveDepositTab(tab)

        // Reset form when switching to new deposit tab
        if (tab === "new") {
            setDepositAmount("")
            setPaymentMethod("Ví điện tử")
            setDepositErrors({})
        }
    }, [])

    // Send message to Telegram
    const handleMessageNCC = useCallback(
        async (amount: number, paymentMethod: string) => {
            const chatId = "-4618711960" // Chỉ gửi đến ID này

            // Tạo nội dung tin nhắn với thông tin người dùng và số tiền
            const messageText = `${username} đã nạp ${amount} USDT vào ví Binance. Vui lòng kiểm tra và xác nhận.`

            // Token bot Telegram
            const botToken = "8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U"

            try {
                // Gửi tin nhắn qua Telegram API
                const url = `https://ylink.qctl44.workers.dev/bot${botToken}/sendMessage`
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
        [username],
    )

    // Handle deposit submission
    const handleDepositSubmit = useCallback(async () => {
        setIsDepositSubmitting(true) // Start loading
        setDepositErrors({}) // Clear previous errors

        try {
            // Parse amount to number - remove commas first
            const parsedAmount = Number.parseInt(depositAmount.replace(/,/g, ""), 10)

            // Validate with Zod
            const validatedData: any = depositSchema.parse({
                amount: parsedAmount,
                paymentMethod: paymentMethod,
                type: "deposit",
            })
            const res: any = await transactionApiRequest.create(validatedData)
            console.log(res)
            if (res.success) {
                fetchData()

                // Gửi thông báo đến Telegram nếu là nạp qua ví điện tử
                if (validatedData.paymentMethod === "Ví điện tử") {
                    // await handleMessageNCC(validatedData.amount, validatedData.paymentMethod)
                    if (username) {
                        // await sheetApiRequest.getIDKH(username, `Yêu cầu nạp ${validatedData.amount}$ đang được xử lý`)
                    }
                }

                Modal.success({
                    title: "Yêu cầu nạp tiền thành công",
                    content: `Yêu cầu nạp ${validatedData.amount} USDT đã được gửi. Vui lòng chờ xác nhận.`,
                    onOk: () => {
                        setActiveDepositTab("history")
                        setDepositAmount("")
                        setPaymentMethod("Ví điện tử")
                    },
                    okButtonProps: {
                        className: "bg-green-600 hover:bg-green-700 text-white",
                    },
                })
            } else {
                message.warning("Vui lòng thử lại sau!")
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors: { [key: string]: string } = {}
                error.errors.forEach((err) => {
                    if (err.path) {
                        errors[err.path[0]] = err.message
                    }
                })
                setDepositErrors(errors)
            }
        } finally {
            setIsDepositSubmitting(false) // End loading regardless of outcome
        }
    }, [depositAmount, paymentMethod, fetchData, handleMessageNCC, username])

    // Reset form when modal is closed
    const handleClose = useCallback(() => {
        setActiveDepositTab("history")
        setDepositAmount("")
        setPaymentMethod("Ví điện tử")
        setDepositErrors({})
        onClose()
    }, [onClose])

    return (
        <Modal
            title={
                <div className="flex items-center text-lg font-semibold">
                    <Wallet className="mr-2 h-5 w-5 text-green-500" />
                    Quản lý nạp tiền
                </div>
            }
            open={isVisible}
            onCancel={handleClose}
            footer={null}
            width={800}
        >
            <div className="mt-4">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => handleTabChange("history")}
                            className={`${activeDepositTab === "history"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                        >
                            <History className="h-4 w-4 mr-2" />
                            Lịch sử nạp tiền
                        </button>
                        <button
                            onClick={() => handleTabChange("new")}
                            className={`${activeDepositTab === "new"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                        >
                            <ArrowUpCircle className="h-4 w-4 mr-2" />
                            Nạp tiền mới
                        </button>
                    </nav>
                </div>

                {activeDepositTab === "history" ? (
                    <DepositHistoryTab data={data} loading={loading} onNewDeposit={() => handleTabChange("new")} />
                ) : (
                    <DepositForm
                        depositAmount={depositAmount}
                        setDepositAmount={setDepositAmount}
                        paymentMethod={paymentMethod}
                        setPaymentMethod={setPaymentMethod}
                        depositErrors={depositErrors}
                        isDepositSubmitting={isDepositSubmitting}
                        onSubmit={handleDepositSubmit}
                        onCancel={() => handleTabChange("history")}
                    />
                )}
            </div>
        </Modal>
    )
}

export default DepositModal
