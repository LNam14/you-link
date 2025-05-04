"use client"

import type React from "react"

import { useCallback, useEffect, useState, useMemo } from "react"
import {
    CheckCircle,
    XCircle,
    Search,
    Filter,
    ArrowUp,
    RefreshCw,
    Download,
    CreditCard,
    DollarSign,
    Clock,
    Users,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react"
import { Modal, message } from "antd"
import transactionApiRequest, { type Transaction } from "@/apiRequests/transactions"
import { onValue, ref, set } from "firebase/database"
import { database } from "@/app/firebase/firebase"
import moment from "moment"
import "moment/locale/vi"
import sheetApiRequest from "@/apiRequests/sheet"
import { useRouter } from "next/navigation"

moment.locale("vi")

// Types
type FilterType = "week" | "month" | "year" | "customer"
type TransactionType = "recharge" | "withdraw" | "all"
type TransactionStatus = "Hoàn thành" | "Lỗi" | "Đang chờ"

interface DashboardCardProps {
    title: string
    amount: number
    icon: React.ElementType
    color: string
    trend?: number
    subtitle?: string
}

interface StatusBadgeProps {
    status: TransactionStatus
}

// Components
const DashboardCard: React.FC<DashboardCardProps> = ({ title, amount, icon: Icon, color, trend = 0, subtitle }) => {
    const formatCurrency = (amount: number) => "$" + amount.toLocaleString("en-US")

    const colorMap: Record<string, string> = {
        emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-700",
        amber: "from-amber-500/20 to-amber-500/5 text-amber-700",
        rose: "from-rose-500/20 to-rose-500/5 text-rose-700",
        indigo: "from-indigo-500/20 to-indigo-500/5 text-indigo-700",
        blue: "from-blue-500/20 to-blue-500/5 text-blue-700",
        purple: "from-purple-500/20 to-purple-500/5 text-purple-700",
    }

    const iconColorMap: Record<string, string> = {
        emerald: "bg-emerald-500 text-white",
        amber: "bg-amber-500 text-white",
        rose: "bg-rose-500 text-white",
        indigo: "bg-indigo-500 text-white",
        blue: "bg-blue-500 text-white",
        purple: "bg-purple-500 text-white",
    }

    return (
        <div className="relative bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[color]} opacity-20`}></div>
            <div className="relative p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-medium text-gray-700">{title}</h3>
                            {trend !== 0 && (
                                <span
                                    className={`flex items-center text-xs font-medium ${trend > 0 ? "text-emerald-600" : "text-rose-600"}`}
                                >
                                    {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {Math.abs(trend)}%
                                </span>
                            )}
                        </div>
                        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                        <p className="text-2xl font-bold mt-2">{formatCurrency(amount)}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${iconColorMap[color]}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </div>
        </div>
    )
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const statusStyles: Record<TransactionStatus, { bg: string; text: string; icon: React.ReactNode }> = {
        "Hoàn thành": {
            bg: "bg-emerald-100 border-emerald-200",
            text: "text-emerald-700",
            icon: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />,
        },
        Lỗi: {
            bg: "bg-rose-100 border-rose-200",
            text: "text-rose-700",
            icon: <XCircle className="h-3.5 w-3.5 text-rose-500" />,
        },
        "Đang chờ": {
            bg: "bg-amber-100 border-amber-200",
            text: "text-amber-700",
            icon: <Clock className="h-3.5 w-3.5 text-amber-500" />,
        },
    }

    const style = statusStyles[status]

    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text}`}
        >
            {style.icon}
            <span className="ml-1.5">{status}</span>
        </span>
    )
}

const TransactionRow: React.FC<{
    item: Transaction
    formatCurrency: (amount: number) => string
    handleAction: (item: Transaction, action: "approve" | "reject") => void
}> = ({ item, formatCurrency, handleAction }) => {
    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-center">
                    <div className={`p-2 rounded-full mr-3 ${item.type === "recharge" ? "bg-emerald-100" : "bg-blue-100"}`}>
                        {item.type === "recharge" ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        ) : (
                            <ArrowDownRight className="h-4 w-4 text-blue-600" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-800">{item.id}</p>
                        <p className="text-xs text-gray-500">{item.type === "recharge" ? "Nạp tiền" : "Rút tiền"}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className={`text-sm font-semibold ${item.type === "recharge" ? "text-emerald-600" : "text-blue-600"}`}>
                    {item.type === "recharge" ? "+" : "-"}
                    {formatCurrency(Number.parseFloat(item.amount))}
                </span>
            </td>
            <td className="px-6 py-4">
                <div className="text-sm text-gray-700">{moment(item.deposit_date).format("DD/MM/YYYY")}</div>
                <div className="text-xs text-gray-500">{moment(item.deposit_date).format("HH:mm")}</div>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center">
                    <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700">{item.method}</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <p className="text-sm text-gray-700 max-w-xs truncate">{item.description}</p>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium mr-2">
                        {item.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <StatusBadge status={item.status as TransactionStatus} />
            </td>
            <td className="px-6 py-4">
                <div className="flex space-x-2">
                    <button
                        className={`p-2 rounded-lg text-white ${item.status !== "Đang chờ"
                            ? "bg-gray-200 cursor-not-allowed"
                            : "bg-emerald-500 hover:bg-emerald-600 shadow-sm hover:shadow transition-all"
                            }`}
                        onClick={() => handleAction(item, "approve")}
                        disabled={item.status !== "Đang chờ"}
                        title="Xác nhận"
                    >
                        <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                        className={`p-2 rounded-lg text-white ${item.status !== "Đang chờ"
                            ? "bg-gray-200 cursor-not-allowed"
                            : "bg-rose-500 hover:bg-rose-600 shadow-sm hover:shadow transition-all"
                            }`}
                        onClick={() => handleAction(item, "reject")}
                        disabled={item.status !== "Đang chờ"}
                        title="Từ chối"
                    >
                        <XCircle className="h-4 w-4" />
                    </button>
                </div>
            </td>
        </tr>
    )
}

const EmptyState = ({ loading }: { loading: boolean }) => {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            {loading ? (
                <>
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                    <p className="text-gray-500 text-lg">Đang tải dữ liệu...</p>
                </>
            ) : (
                <>
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                        <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-1">Không tìm thấy dữ liệu</h3>
                    <p className="text-gray-500 text-center max-w-md">
                        Không có giao dịch nào phù hợp với bộ lọc hiện tại. Hãy thử thay đổi bộ lọc hoặc tải lại dữ liệu.
                    </p>
                </>
            )}
        </div>
    )
}

export default function PageBody() {
    const [data, setData] = useState<Transaction[]>([])
    const [selectedItem, setSelectedItem] = useState<Transaction | null>(null)
    const [dialogAction, setDialogAction] = useState<"approve" | "reject" | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()
    const [filterType, setFilterType] = useState<FilterType>("week")
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
    const [filteredData, setFilteredData] = useState<Transaction[]>([])
    const [activeTab, setActiveTab] = useState<TransactionType>("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const router = useRouter()
    const [refreshKey, setRefreshKey] = useState(0)

    const formatCurrency = useCallback((amount: number) => "$" + amount.toLocaleString("en-US"), [])

    const applyFilters = useCallback(
        (dataToFilter = data) => {
            if (!dataToFilter.length) {
                setFilteredData([])
                return
            }

            let filtered = [...dataToFilter].filter((item) => moment(item.deposit_date).year() === selectedYear)

            // Apply tab filter
            if (activeTab !== "all") {
                filtered = filtered.filter((item) => item.type === activeTab)
            }

            // Apply search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                filtered = filtered.filter(
                    (item) =>
                        item.id.toLowerCase().includes(query) ||
                        item.name.toLowerCase().includes(query) ||
                        item.description.toLowerCase().includes(query) ||
                        item.method.toLowerCase().includes(query),
                )
            }

            // Apply other filters
            switch (filterType) {
                case "week":
                    if (selectedWeek !== null) {
                        filtered = filtered.filter((item) => moment(item.deposit_date).week() === selectedWeek)
                    }
                    break
                case "month":
                    if (selectedMonth !== null) {
                        filtered = filtered.filter((item) => moment(item.deposit_date).month() === selectedMonth)
                    }
                    break
                case "customer":
                    if (selectedCustomer) {
                        filtered = filtered.filter((item) => item.name === selectedCustomer)
                    }
                    break
            }

            setFilteredData(filtered)
        },
        [data, filterType, selectedWeek, selectedMonth, selectedYear, selectedCustomer, activeTab, searchQuery],
    )

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const response = await transactionApiRequest.get()
            const transactionData = Array.isArray(response?.data) ? response.data : []
            setData(transactionData || [])

            // Apply filters immediately after fetching data
            applyFilters(transactionData)
        } catch (error) {
            console.error("Error fetching data:", error)
            messageApi.error("Không thể tải dữ liệu. Vui lòng thử lại sau.")
            setData([])
            setFilteredData([])
        } finally {
            setLoading(false)
        }
    }, [messageApi, applyFilters])

    const handleAction = useCallback((item: Transaction, action: "approve" | "reject") => {
        setSelectedItem(item)
        setDialogAction(action)
        setIsModalOpen(true)
    }, [])

    const confirmAction = useCallback(async () => {
        if (!selectedItem || !dialogAction) return

        setLoading(true)
        try {
            const newStatus = dialogAction === "approve" ? "Hoàn thành" : "Lỗi"

            if (dialogAction === "approve") {
                const userId = selectedItem.name
                const amountToProcess = Number.parseFloat(selectedItem.amount)
                const moneyRef = ref(database, `money/${userId}`)

                let currentMoney = { amount: 0, withdrawableAmount: 0, pendingAmount: 0 }
                await new Promise((resolve) => {
                    onValue(
                        moneyRef,
                        (snapshot) => {
                            if (snapshot.exists()) {
                                currentMoney = {
                                    amount: snapshot.val().amount || 0,
                                    withdrawableAmount: snapshot.val().withdrawableAmount || 0,
                                    pendingAmount: snapshot.val().pendingAmount || 0,
                                }
                            }
                            resolve(null)
                        },
                        { onlyOnce: true },
                    )
                })

                if (selectedItem.type === "withdraw") {
                    await set(moneyRef, {
                        amount: currentMoney.amount - amountToProcess,
                        withdrawableAmount: currentMoney.withdrawableAmount + amountToProcess,
                        pendingAmount: currentMoney.pendingAmount - amountToProcess,
                    })
                } else {
                    await set(moneyRef, {
                        amount: currentMoney.amount + amountToProcess,
                        withdrawableAmount: currentMoney.withdrawableAmount,
                        pendingAmount: currentMoney.pendingAmount,
                    })
                }
            }

            await transactionApiRequest.update({
                transaction_id: selectedItem.id,
                status: newStatus,
            })

            if (selectedItem.type === "withdraw") {
                await sheetApiRequest.getIDNCC(
                    selectedItem.name,
                    dialogAction === "approve"
                        ? `Yêu cầu rút ${selectedItem.amount}$ đã được phê duyệt`
                        : `Yêu cầu rút ${selectedItem.amount}$ đã bị từ chối`,
                )
            } else {
                await sheetApiRequest.getIDKH(
                    selectedItem.name,
                    dialogAction === "approve"
                        ? `Yêu cầu nạp ${selectedItem.amount}$ đã được phê duyệt`
                        : `Yêu cầu nạp ${selectedItem.amount}$ đã bị từ chối`,
                )
            }

            await fetchData()
            messageApi.success({
                content: dialogAction === "approve" ? "Xác nhận giao dịch thành công!" : "Từ chối giao dịch thành công!",
                icon:
                    dialogAction === "approve" ? (
                        <CheckCircle className="text-emerald-500" />
                    ) : (
                        <XCircle className="text-rose-500" />
                    ),
            })
            setRefreshKey((prev) => prev + 1)
        } catch (error) {
            console.error("Error:", error)
            messageApi.error("Có lỗi xảy ra khi xử lý giao dịch!")
        } finally {
            setLoading(false)
            setIsModalOpen(false)
        }
    }, [selectedItem, dialogAction, fetchData, messageApi])

    const cancelAction = useCallback(() => {
        setIsModalOpen(false)
    }, [])

    const getUniqueCustomers = useMemo(() => Array.from(new Set(data.map((item) => item.name).filter(Boolean))), [data])

    const getTotalAmount = useCallback(
        (status: TransactionStatus, type?: TransactionType) => {
            let dataToCalculate = filteredData

            if (type && type !== "all") {
                dataToCalculate = dataToCalculate.filter((item) => item.type === type)
            }

            return dataToCalculate
                .filter((item) => item.status === status)
                .reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)
        },
        [filteredData],
    )

    const getTransactionCounts = useCallback(() => {
        const completed = filteredData.filter((item) => item.status === "Hoàn thành").length
        const pending = filteredData.filter((item) => item.status === "Đang chờ").length
        const failed = filteredData.filter((item) => item.status === "Lỗi").length

        return { completed, pending, failed, total: filteredData.length }
    }, [filteredData])

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        applyFilters()
    }, [applyFilters, activeTab, filterType, selectedWeek, selectedMonth, selectedYear, selectedCustomer, searchQuery])

    const { completed, pending, failed, total } = getTransactionCounts()

    const dashboardCards = useMemo(
        () => [
            {
                title: "Số tiền nạp",
                amount: getTotalAmount("Hoàn thành", "recharge"),
                icon: ArrowUpRight,
                color: "emerald",
                subtitle: "Tổng tiền nạp thành công",
            },
            {
                title: "Số tiền rút",
                amount: getTotalAmount("Hoàn thành", "withdraw"),
                icon: ArrowDownRight,
                color: "blue",
                subtitle: "Tổng tiền rút thành công",
            },
            {
                title: "Đang chờ xử lý",
                amount: getTotalAmount("Đang chờ"),
                icon: Clock,
                color: "amber",
                subtitle: `${pending} giao dịch đang chờ`,
            },
            {
                title: "Số tiền hủy",
                amount: getTotalAmount("Lỗi"),
                icon: XCircle,
                color: "rose",
                subtitle: `${failed} giao dịch bị hủy`,
            },
        ],
        [getTotalAmount, pending, failed],
    )

    return (
        <div className="h-[94vh] overflow-y-auto px-4 py-6 bg-gray-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {contextHolder}

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Quản lý giao dịch</h1>
                        <p className="text-gray-500 mt-1">Quản lý và theo dõi tất cả các giao dịch nạp và rút tiền</p>
                    </div>
                    <div className="flex items-center space-x-3 mt-4 md:mt-0">
                        <button
                            onClick={fetchData}
                            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Làm mới
                        </button>
                        <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                            <Download className="h-4 w-4 mr-2" />
                            Xuất dữ liệu
                        </button>
                    </div>
                </div>

                {/* Dashboard Cards */}
                <div className="w-full overflow-x-auto">
                    <div className="flex space-x-2 min-w-full">
                        {dashboardCards.map((card, idx) => (
                            <div key={idx} className="flex-1 min-w-[300px]">
                                <DashboardCard {...card} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tabs and Search */}
                <div className="bg-white rounded-xl shadow-sm p-4 mt-4 mb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex space-x-1 mb-4 md:mb-0">
                            <button
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "all" ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
                                    }`}
                                onClick={() => setActiveTab("all")}
                            >
                                Tất cả
                            </button>
                            <button
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "recharge" ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-100"
                                    }`}
                                onClick={() => setActiveTab("recharge")}
                            >
                                Nạp tiền
                            </button>
                            <button
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "withdraw" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                                    }`}
                                onClick={() => setActiveTab("withdraw")}
                            >
                                Rút tiền
                            </button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <div className="relative flex-grow">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Tìm kiếm giao dịch..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`p-2 rounded-lg border ${isFilterOpen ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                            >
                                <Filter className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Filter Section */}
                    {isFilterOpen && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại lọc</label>
                                    <select
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={filterType}
                                        onChange={(e) => {
                                            setFilterType(e.target.value as FilterType)
                                            setSelectedWeek(null)
                                            setSelectedMonth(null)
                                            setSelectedCustomer(null)
                                        }}
                                    >
                                        <option value="week">Theo tuần</option>
                                        <option value="month">Theo tháng</option>
                                        <option value="customer">Theo khách hàng</option>
                                    </select>
                                </div>
                                {filterType === "week" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Chọn tuần</label>
                                        <select
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            value={selectedWeek || ""}
                                            onChange={(e) => setSelectedWeek(e.target.value ? Number(e.target.value) : null)}
                                        >
                                            <option value="">Chọn tuần</option>
                                            {Array.from({ length: 53 }, (_, i) => (
                                                <option key={i} value={i + 1}>
                                                    Tuần {i + 1}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {filterType === "month" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Chọn tháng</label>
                                        <select
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            value={selectedMonth !== null ? selectedMonth : ""}
                                            onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : null)}
                                        >
                                            <option value="">Chọn tháng</option>
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i} value={i}>
                                                    Tháng {i + 1}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {filterType === "customer" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Chọn khách hàng</label>
                                        <select
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            value={selectedCustomer || ""}
                                            onChange={(e) => setSelectedCustomer(e.target.value || null)}
                                        >
                                            <option value="">Chọn khách hàng</option>
                                            {getUniqueCustomers.map((name) => (
                                                <option key={name} value={name}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            setFilterType("week")
                                            setSelectedWeek(null)
                                            setSelectedMonth(null)
                                            setSelectedYear(new Date().getFullYear())
                                            setSelectedCustomer(null)
                                            setSearchQuery("")
                                        }}
                                        className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-sm"
                                    >
                                        Đặt lại bộ lọc
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-800">Danh sách giao dịch</h2>
                            <div className="text-sm text-gray-500">
                                Hiển thị <span className="font-medium">{filteredData.length}</span> giao dịch
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {filteredData.length > 0 ? (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {[
                                            "Mã giao dịch",
                                            "Số tiền",
                                            "Thời gian",
                                            "Phương thức",
                                            "Nội dung",
                                            activeTab === "withdraw" ? "NCC" : "Khách hàng",
                                            "Trạng thái",
                                            "Hành động",
                                        ].map((header) => (
                                            <th
                                                key={header}
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredData.map((item) => (
                                        <TransactionRow
                                            key={item.id}
                                            item={item}
                                            formatCurrency={formatCurrency}
                                            handleAction={handleAction}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <EmptyState loading={loading} />
                        )}
                    </div>

                    {filteredData.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                                Hiển thị <span className="font-medium">{filteredData.length}</span> trong tổng số{" "}
                                <span className="font-medium">{data.length}</span> giao dịch
                            </div>
                            <div className="flex items-center space-x-2">
                                <button className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Trước
                                </button>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-medium rounded-md">1</span>
                                <button className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Sau
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Scroll to Top Button */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="fixed bottom-6 right-6 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300"
            >
                <ArrowUp className="h-5 w-5" />
            </button>

            {/* Modal */}
            <Modal
                title={
                    <div className="flex items-center">
                        {dialogAction === "approve" ? (
                            <>
                                <CheckCircle className="h-5 w-5 text-emerald-500 mr-2" />
                                <span>Xác nhận giao dịch</span>
                            </>
                        ) : (
                            <>
                                <XCircle className="h-5 w-5 text-rose-500 mr-2" />
                                <span>Từ chối giao dịch</span>
                            </>
                        )}
                    </div>
                }
                open={isModalOpen}
                onOk={confirmAction}
                onCancel={cancelAction}
                okText={dialogAction === "approve" ? "Xác nhận" : "Từ chối"}
                cancelText="Hủy"
                confirmLoading={loading}
                okButtonProps={{
                    className: `${dialogAction === "approve" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"} text-white`,
                }}
            >
                <div className="py-2">
                    <p className="text-gray-700 mb-4">
                        {dialogAction === "approve"
                            ? "Bạn có chắc chắn muốn xác nhận giao dịch này không?"
                            : "Bạn có chắc chắn muốn từ chối giao dịch này không?"}
                    </p>
                    {selectedItem && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-gray-500">Thông tin giao dịch</span>
                                <StatusBadge status={selectedItem.status as TransactionStatus} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Mã giao dịch:</span>
                                    <span className="text-sm font-medium text-gray-800">{selectedItem.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Khách hàng:</span>
                                    <span className="text-sm font-medium text-gray-800">{selectedItem.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Loại giao dịch:</span>
                                    <span
                                        className={`text-sm font-medium ${selectedItem.type === "recharge" ? "text-emerald-600" : "text-blue-600"}`}
                                    >
                                        {selectedItem.type === "recharge" ? "Nạp tiền" : "Rút tiền"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Số tiền:</span>
                                    <span
                                        className={`text-sm font-medium ${selectedItem.type === "recharge" ? "text-emerald-600" : "text-blue-600"}`}
                                    >
                                        {formatCurrency(Number.parseFloat(selectedItem.amount))}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Phương thức:</span>
                                    <span className="text-sm font-medium text-gray-800">{selectedItem.method}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Thời gian:</span>
                                    <span className="text-sm font-medium text-gray-800">{selectedItem.deposit_date}</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-200">
                                <p className="text-xs text-gray-500">
                                    {dialogAction === "approve"
                                        ? "Khi xác nhận, giao dịch sẽ được chuyển sang trạng thái 'Hoàn thành' và số tiền sẽ được cập nhật vào tài khoản khách hàng."
                                        : "Khi từ chối, giao dịch sẽ được chuyển sang trạng thái 'Lỗi' và sẽ không được xử lý."}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}
