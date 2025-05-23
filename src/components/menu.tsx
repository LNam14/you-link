"use client"

import type React from "react"
import { useCallback, useEffect, useState, useRef, memo, useMemo } from "react"
import { Dropdown, Avatar, Modal, message, Table, Tag, QRCode } from "antd"
import getUserInfo from "./userInfo"
import {
    Globe,
    LogOut,
    UserRound,
    UsersRound,
    DollarSign,
    Download,
    UserRoundIcon as UserRoundPen,
    Mail,
    Wallet,
    CreditCard,
    Phone,
    Key,
    Plus,
    History,
    ArrowUpCircle,
    Copy,
    CheckCircle2,
    AlertCircle,
    User,
} from "lucide-react"
import CurrencyConverterModal from "./CurrencyConverterModal"
import { z } from "zod"
import transactionApiRequest from "@/apiRequests/transactions"
import authApiRequest from "@/apiRequests/auth"
import { ref, onValue, update, get } from "firebase/database"
import { database } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import sheetApiRequest from "@/apiRequests/sheet"

interface UserInfo {
    id: number
    name: string
    email: string
    phone: string
    role: string
    work: string
    wage: number | null
    status: string
    createdAt: string
    updatedAt: string
    active: number
}

// Mock data for deposit history
interface DepositHistory {
    id: number
    amount: number
    date: string
    status: "Đang chờ" | "Hoàn thành" | "Lỗi"
    method: string
    transactionId: string
}

interface MenuAvatarProps {
    userInfo?: UserInfo
}

// Define Zod schema for user edit form validation
const userSchema = z.object({
    id: z.number().optional(),
    name: z.string().min(2, { message: "Tên phải có ít nhất 2 ký tự" }),
    email: z.string().email({ message: "Email không hợp lệ" }),
    password: z.string().optional(),
    phone: z.string().min(10, { message: "Số điện thoại không hợp lệ" }).optional(),
    money: z.number().optional().default(0),
})

// Define Zod schema for deposit form validation
const depositSchema = z.object({
    amount: z
        .number()
        .int({ message: "Số tiền phải là số nguyên" })
        .min(10, { message: "Số tiền nạp tối thiểu là 10 USDT" })
        .max(10000, { message: "Số tiền nạp tối đa là 10,000 USDT" }),
    paymentMethod: z.string().min(1, { message: "Vui lòng chọn phương thức thanh toán" }),
})

const withdrawSchema = z.object({
    amount: z
        .number()
        .int({ message: "Số tiền phải là số nguyên" })
        .min(10, { message: "Số tiền rút tối thiểu là 10 USDT" })
        .max(10000, { message: "Số tiền rút tối đa là 10,000 USDT" }),
    binanceAddress: z.string().min(1, { message: "Vui lòng nhập địa chỉ ví Binance" }),
    network: z.string().min(1, { message: "Vui lòng chọn mạng lưới" }),
})

// Memoized BinanceWalletComponent to prevent re-renders
const BinanceWalletComponent = memo(() => {
    const walletAddress = "THEe5ywtLPwMWmCWKAQzMxDT694Sa2oNYZ"
    const [copySuccess, setCopySuccess] = useState("")

    // Function to copy text to clipboard
    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text).then(
            () => {
                setCopySuccess("wallet")
                setTimeout(() => setCopySuccess(""), 3000)
                message.success("Đã sao chép địa chỉ ví thành công!")
            },
            () => {
                message.error("Không thể sao chép!")
            },
        )
    }, [])

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
                    {/* Use a key to ensure stable rendering */}
                    <QRCode
                        key="wallet-qr-code"
                        value={walletAddress}
                        size={150}
                        bordered={false}
                        icon="https://cryptologos.cc/logos/tether-usdt-logo.png"
                    />
                    <p className="text-xs text-center mt-2">Quét mã QR để chuyển tiền</p>
                </div>
            </div>
        </div>
    )
})

// Ensure display name is set for memo component
BinanceWalletComponent.displayName = "BinanceWalletComponent"

// Memoized BankTransferComponent
const BankTransferComponent = memo(() => {
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
})

BankTransferComponent.displayName = "BankTransferComponent"

// Separate component for the deposit form to prevent re-renders
const DepositForm = memo(
    ({
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
                    {paymentMethod === "Ví điện tử" && <BinanceWalletComponent />}

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
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
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
    },
)

DepositForm.displayName = "DepositForm"

// Memoized DepositHistoryTab
const DepositHistoryTab = memo(
    ({
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
    ),
)

DepositHistoryTab.displayName = "DepositHistoryTab"

const MenuAvatar: React.FC<MenuAvatarProps> = () => {
    const userInfo = getUserInfo()
    const [messageApi, contextHolder] = message.useMessage()
    const [amount, setAmount] = useState(0)
    const [pendingAmount, setPendingAmount] = useState(0)
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const response: any = await transactionApiRequest.get()
            const transactionData = Array.isArray(response?.data) ? response.data : []
            setData(transactionData || [])

            // Also check Firebase for the latest balance
            if (userInfo?.username) {
                const userBalanceRef = ref(database, `money/${userInfo.username}`)
                console.log("userBalanceRef", userBalanceRef)
                const unsubscribe = onValue(userBalanceRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const balanceData = snapshot.val()
                        setAmount(balanceData.amount)
                        setPendingAmount(balanceData.pendingAmount || 0)
                    } else {
                        setAmount(0)
                    }
                })

                return () => unsubscribe()
            }
        } catch (error) {
            console.error("Error fetching data:", error)
            setData([])
        } finally {
            setLoading(false)
        }
    }, [userInfo?.id, userInfo?.name])

    // Add polling to check for updates every 10 seconds
    useEffect(() => {
        fetchData() // Initial fetch
    }, [])

    // Form state
    const [depositAmount, setDepositAmount] = useState<string>("")
    const [paymentMethod, setPaymentMethod] = useState<string>("Ví điện tử")
    const [depositErrors, setDepositErrors] = useState<{ [key: string]: string }>({})
    const [userFormData, setUserFormData] = useState({
        id: userInfo?.id || 0,
        name: userInfo?.name || "",
        email: userInfo?.email || "",
        phone: userInfo?.phone || "",
        password: "",
        money: 0,
    })
    const [userErrors, setUserErrors] = useState<{ [key: string]: string }>({})

    // UI state
    const [isConverterModalVisible, setIsConverterModalVisible] = useState(false)
    const [isDepositModalVisible, setIsDepositModalVisible] = useState(false)
    const [isEditUserModalVisible, setIsEditUserModalVisible] = useState(false)
    const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false)
    const [withdrawAmount, setWithdrawAmount] = useState<string>("")
    const [binanceAddress, setBinanceAddress] = useState<string>("")
    const [network, setNetwork] = useState<string>("TRC20")
    const [withdrawErrors, setWithdrawErrors] = useState<{ [key: string]: string }>({})
    const [isWithdrawSubmitting, setIsWithdrawSubmitting] = useState(false)
    const [activeDepositTab, setActiveDepositTab] = useState<string>("history")
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDepositSubmitting, setIsDepositSubmitting] = useState(false)

    // Add the handleMessageNCC function after the fetchData function
    const handleMessageNCC = useCallback(
        async (amount: number, paymentMethod: string, type: "deposit" | "withdraw" = "deposit") => {
            const chatId = "-4618711960" // Chỉ gửi đến ID này

            // Tạo nội dung tin nhắn với thông tin người dùng và số tiền
            const messageText = type === "deposit"
                ? `${userInfo?.username} đã nạp ${amount} USDT vào ví Binance. Vui lòng kiểm tra và xác nhận.`
                : `${userInfo?.username} đã yêu cầu rút ${amount} USDT về địa chỉ ${binanceAddress} (${network}). Vui lòng kiểm tra và xác nhận.`

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
        [userInfo?.username, binanceAddress, network],
    )

    const getRoleName = useCallback((role: string) => {
        switch (role) {
            case "Admin":
                return "Admin"
            case "Nhân viên":
                return "Nhân viên"
            case "Khách hàng":
                return "Khách hàng"
            case "NCC":
                return "Nhà cung cấp"
            default:
                return "Chưa xác định"
        }
    }, [])

    const router = useRouter()
    const handleLogout = useCallback(async () => {
        try {
            // Try to delete cookies with various configurations to ensure they're removed
            // Delete with default path
            document.cookie = "userInfo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
            document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

            // Delete with secure and SameSite attributes in case they were set with these
            document.cookie = "userInfo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict;"
            document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict;"

            // If the above client-side approach doesn't work for httpOnly cookies,
            // make a server request to clear the cookies
            try {
                await authApiRequest.logout() // Assuming you have a logout endpoint that clears cookies
            } catch (logoutError) {
                console.error("Server logout failed:", logoutError)
                // Continue with redirect even if server logout fails
            }

            router.push("/login")
        } catch (error) {
            console.error("Logout error:", error)
        }
    }, [router])

    const handleEditInfomation = useCallback(() => {
        // Set initial form values from userInfo
        setUserFormData({
            id: userInfo?.id || 0,
            name: userInfo?.name || "",
            email: userInfo?.email || "",
            phone: userInfo?.phone || "",
            password: "",
            money: amount,
        })

        // Open the edit modal
        setIsEditUserModalVisible(true)
    }, [userInfo, amount])

    // Format number with commas
    const formatNumber = useCallback((value: string) => {
        return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    }, [])

    // Modify the handleDepositSubmit function to call handleMessageNCC and add loading state
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


            // Simulate network delay for better UX
            await new Promise((resolve) => setTimeout(resolve, 1000))

            const res: any = await transactionApiRequest.create(validatedData)
            if (res.success) {
                fetchData()

                // Gửi thông báo đến Telegram nếu là nạp qua ví điện tử
                if (validatedData.paymentMethod === "Ví điện tử") {
                    await handleMessageNCC(validatedData.amount, validatedData.paymentMethod, "deposit")
                    await sheetApiRequest.getIDKH(userInfo?.username, `Yêu cầu nạp ${validatedData.amount}$ đang được xử lý`)
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
                        className: "bg-green-600 hover:bg-green-700 text-white"
                    }
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
    }, [depositAmount, paymentMethod, fetchData, handleMessageNCC])

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
            if (parsedAmount > amount) {
                setWithdrawErrors({ amount: "Số dư không đủ để rút" })
                return
            }

            // Get current pendingAmount from Firebase
            const userBalanceRef = ref(database, `money/${userInfo?.username}`)
            const snapshot = await get(userBalanceRef)
            const currentData = snapshot.val() || {}
            const currentPendingAmount = currentData.pendingAmount || 0

            // Check if total pending amount (current + new) would exceed available balance
            if (currentPendingAmount + parsedAmount > amount) {
                setWithdrawErrors({ amount: `Số tiền rút vượt quá số dư khả dụng. Đang có ${currentPendingAmount} USDT đang chờ xử lý.` })
                return
            }

            // Simulate network delay for better UX
            await new Promise((resolve) => setTimeout(resolve, 1000))

            // Create withdrawal request using transactions API
            const res: any = await transactionApiRequest.create({
                ...validatedData,
                type: "withdraw",
                status: "pending",
                username: userInfo?.username,
            })

            if (res.success) {
                // Update pendingAmount in Firebase
                await update(userBalanceRef, {
                    pendingAmount: currentPendingAmount + parsedAmount
                })

                // Send notification to admin
                await handleMessageNCC(parsedAmount, `Rút tiền về ${network}`, "withdraw")

                Modal.success({
                    title: "Yêu cầu rút tiền thành công",
                    content: `Yêu cầu rút ${parsedAmount} USDT đã được gửi. Vui lòng chờ xác nhận.`,
                    onOk: () => {
                        setIsWithdrawModalVisible(false)
                        setWithdrawAmount("")
                        setBinanceAddress("")
                        setNetwork("TRC20")
                        fetchData() // Refresh data
                    },
                    okButtonProps: {
                        className: "bg-green-600 hover:bg-green-700 text-white"
                    }
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
    }, [withdrawAmount, binanceAddress, network, amount, userInfo?.username, handleMessageNCC, fetchData])

    // Memoize dropdown items to prevent re-renders
    const items: any = useMemo(
        () =>
            [
                {
                    key: "0",
                    label: (
                        <div className="font-semibold text-lg flex flex-col">
                            <div>{userInfo?.username}</div>
                            <div className="text-sm">{getRoleName(userInfo?.role)}</div>
                            {(userInfo?.role === "Khách hàng" || userInfo?.role === "NCC" || userInfo?.role === "Nhân viên") && (
                                <div className="flex flex-col gap-1 mt-2">
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-600">Số dư:</span>
                                        <span className="text-sm font-semibold text-emerald-600 ml-2">{Number(amount || 0).toFixed(2)}</span>
                                        <DollarSign className="w-3 h-3 text-emerald-600 ml-1" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-600">Tiền treo:</span>
                                        <span className="text-sm font-semibold text-amber-600 ml-2">{Number(pendingAmount || 0).toFixed(2)}</span>
                                        <DollarSign className="w-3 h-3 text-amber-600 ml-1" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-600">Có thể sử dụng:</span>
                                        <span className="text-sm font-semibold text-blue-600 ml-2">{Number((amount || 0) - (pendingAmount || 0)).toFixed(2)}</span>
                                        <DollarSign className="w-3 h-3 text-blue-600 ml-1" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ),
                },
                {
                    key: "123",
                    icon: <UserRoundPen className="w-4 h-4" />,
                    label: (
                        <button
                            className="text-red-600 hover:text-green-800 bg-transparent border-none cursor-pointer px-2 py-1"
                            onClick={handleEditInfomation}
                        >
                            Chỉnh sửa thông tin
                        </button>
                    ),
                },
                (userInfo?.role === "Khách hàng" || userInfo?.role === "Nhân viên") && {
                    key: "deposit",
                    icon: <Wallet className="w-4 h-4" />,
                    label: (
                        <button
                            className="text-green-600 hover:text-green-800 bg-transparent border-none cursor-pointer px-2 py-1"
                            onClick={() => {
                                setActiveDepositTab("history")
                                setIsDepositModalVisible(true)
                            }}
                        >
                            Nạp tiền
                        </button>
                    ),
                },
                userInfo?.role === "NCC" && {
                    key: "withdraw",
                    icon: <Wallet className="w-4 h-4" />,
                    label: (
                        <button
                            className="text-red-600 hover:text-red-800 bg-transparent border-none cursor-pointer px-2 py-1"
                            onClick={() => setIsWithdrawModalVisible(true)}
                        >
                            Rút tiền
                        </button>
                    ),
                },
                {
                    key: "converter",
                    icon: <DollarSign className="w-4 h-4" />,
                    label: (
                        <button
                            className="text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer px-2 py-1"
                            onClick={() => setIsConverterModalVisible(true)}
                        >
                            Đổi mệnh giá
                        </button>
                    ),
                },
                (userInfo?.role === "Admin" || userInfo?.role === "Nhân viên" || userInfo?.role === "Khách hàng") && {
                    key: "5",
                    icon: <Globe className="w-4 h-4" />,
                    label: (
                        <button
                            className="text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer px-2 py-1"
                            onClick={() => window.open("/tool-check", "_blank")}
                        >
                            Check Site
                        </button>
                    ),
                },
                (userInfo?.role === "Admin" || userInfo?.role === "Nhân viên") && {
                    key: "11",
                    icon: <Mail className="w-4 h-4" />,
                    label: (
                        <button
                            className="text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer px-2 py-1"
                            onClick={() => window.open("/extort", "_blank")}
                        >
                            Tool check ăn chặn
                        </button>
                    ),
                },
                (userInfo?.role === "Admin" || userInfo?.role === "Nhân viên") && {
                    key: "1",
                    icon: <UsersRound className="w-4 h-4" />,
                    label: (
                        <button
                            className="text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer px-2 py-1"
                            onClick={() => window.open("/dashboard/transactions", "_blank")}
                        >
                            Trang Dashboard
                        </button>
                    ),
                },
                (userInfo?.role === "Admin" || userInfo?.role === "Nhân viên") && {
                    key: "111",
                    icon: <Download className="w-4 h-4" />,
                    label: (
                        <button
                            className="text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer px-2 py-1"
                            onClick={() =>
                                window.open(
                                    "https://drive.google.com/drive/folders/1dhNsD1N85VBO73yCKOsg2yniJyZDHR67?usp=drive_link",
                                    "_blank",
                                )
                            }
                        >
                            Check Anchor Link
                        </button>
                    ),
                },
                {
                    key: "3",
                    icon: <LogOut className="w-4 h-4" />,
                    label: (
                        <button
                            className="text-red-600 hover:text-red-800 bg-transparent border-none cursor-pointer px-2 py-1"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    ),
                },
            ].filter(Boolean),
        [userInfo, getRoleName, handleEditInfomation, handleLogout, amount],
    )

    // Handle tab change with useCallback to prevent re-renders
    const handleTabChange = useCallback((tab: string) => {
        setActiveDepositTab(tab)

        // Reset form when switching to new deposit tab
        if (tab === "new") {
            setDepositAmount("")
            setPaymentMethod("Ví điện tử")
            setDepositErrors({})
        }
    }, [])

    return (
        <>
            {contextHolder}
            <Dropdown menu={{ items }} trigger={["hover"]}>
                <button className="flex items-center" aria-label="User menu">
                    <Avatar size={34} icon={<UserRound />} />
                </button>
            </Dropdown>

            {/* Currency Converter Modal */}
            <CurrencyConverterModal isVisible={isConverterModalVisible} onClose={() => setIsConverterModalVisible(false)} />

            {/* Edit User Modal */}
            <Modal
                title={
                    <div className="flex items-center text-lg font-semibold">
                        <UserRoundPen className="mr-2 h-5 w-5 text-blue-500" />
                        Chỉnh sửa thông tin người dùng
                    </div>
                }
                open={isEditUserModalVisible}
                onCancel={() => {
                    setIsEditUserModalVisible(false)
                    setUserErrors({})
                }}
                footer={[
                    <button
                        key="cancel"
                        onClick={() => {
                            setIsEditUserModalVisible(false)
                            setUserErrors({})
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Hủy
                    </button>,
                    <button
                        key="submit"
                        onClick={() => { }}
                        disabled={isSubmitting}
                        className="ml-3 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                        {isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}
                    </button>,
                ]}
                width={600}
            >
                <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Tên <span className="text-red-500">*</span>
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserRound className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="name"
                                    value={userFormData.name}
                                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                                    className={`block w-full pl-10 border ${userErrors.name ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"} rounded-md py-2 px-3 focus:outline-none focus:ring-1 sm:text-sm`}
                                    placeholder="Nhập tên người dùng"
                                />
                            </div>
                            {userErrors.name && (
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    {userErrors.name}
                                </p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    value={userFormData.email}
                                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                                    className={`block w-full pl-10 border ${userErrors.email ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"} rounded-md py-2 px-3 focus:outline-none focus:ring-1 sm:text-sm`}
                                    placeholder="Nhập email"
                                />
                            </div>
                            {userErrors.email && (
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    {userErrors.email}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Mật khẩu
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Key className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    id="password"
                                    value={userFormData.password}
                                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                                    className={`block w-full pl-10 border ${userErrors.password ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"} rounded-md py-2 px-3 focus:outline-none focus:ring-1 sm:text-sm`}
                                    placeholder="Nhập mật khẩu mới"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Để trống nếu không thay đổi</p>
                        </div>

                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                Số điện thoại
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="phone"
                                    value={userFormData.phone}
                                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                                    className={`block w-full pl-10 border ${userErrors.phone ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"} rounded-md py-2 px-3 focus:outline-none focus:ring-1 sm:text-sm`}
                                    placeholder="Nhập số điện thoại"
                                />
                            </div>
                            {userErrors.phone && (
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    {userErrors.phone}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Deposit Modal with Tabs */}
            <Modal
                title={
                    <div className="flex items-center text-lg font-semibold">
                        <Wallet className="mr-2 h-5 w-5 text-green-500" />
                        Quản lý nạp tiền
                    </div>
                }
                open={isDepositModalVisible}
                onCancel={() => {
                    setIsDepositModalVisible(false)
                    setDepositAmount("")
                    setPaymentMethod("Ví điện tử")
                    setDepositErrors({})
                }}
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

            {/* Withdraw Modal */}
            <Modal
                title={
                    <div className="flex items-center text-lg font-semibold">
                        <Wallet className="mr-2 h-5 w-5 text-red-500" />
                        Rút tiền
                    </div>
                }
                open={isWithdrawModalVisible}
                onCancel={() => {
                    setIsWithdrawModalVisible(false)
                    setWithdrawAmount("")
                    setBinanceAddress("")
                    setNetwork("TRC20")
                    setWithdrawErrors({})
                }}
                footer={[
                    <button
                        key="cancel"
                        onClick={() => {
                            setIsWithdrawModalVisible(false)
                            setWithdrawAmount("")
                            setBinanceAddress("")
                            setNetwork("TRC20")
                            setWithdrawErrors({})
                        }}
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
                        {isWithdrawSubmitting ? "Đang xử lý..." : "Xác nhận rút tiền"}
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
        </>
    )
}

export default MenuAvatar

