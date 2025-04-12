"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle, XCircle, BarChart3, Calendar, AlertTriangle } from "lucide-react"
import { Modal, message, Select } from "antd"
import transactionApiRequest, { type Transaction } from "@/apiRequests/transactions"
import { onValue, ref, set } from "firebase/database"
import { database } from "@/app/firebase/firebase"
import httpService from "@/lib/http"
import moment from "moment"
import "moment/locale/vi"
import sheetApiRequest from "@/apiRequests/sheet"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

moment.locale("vi")

export default function PageBody() {
    const [data, setData] = useState<Transaction[]>([])
    const [selectedItem, setSelectedItem] = useState<Transaction | null>(null)
    const [dialogAction, setDialogAction] = useState<"approve" | "reject" | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()
    const [filterType, setFilterType] = useState<"week" | "month" | "year" | "customer">("week")
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
    const [filteredData, setFilteredData] = useState<Transaction[]>([])
    const isMounted = useRef(true)
    const router = useRouter()
    const [refreshKey, setRefreshKey] = useState(0)

    const fetchData = useCallback(
        async (forceRefresh = false) => {
            if (!isMounted.current) return
            setLoading(true)
            try {
                const response = await transactionApiRequest.get()
                if (isMounted.current) {
                    const transactionData = Array.isArray(response?.data) ? response.data : []
                    setData(transactionData || [])
                    setFilteredData(transactionData || [])
                }
            } catch (error) {
                if (isMounted.current) {
                    console.error("Error fetching data:", error)
                    messageApi.error("Không thể tải dữ liệu. Vui lòng thử lại sau.")
                    setData([])
                }
            } finally {
                if (isMounted.current) setLoading(false)
            }
        },
        [messageApi]
    )

    const applyFilters = useCallback(() => {
        if (!data.length) {
            setFilteredData([])
            return
        }

        let filtered = [...data].filter((item) => moment(item.deposit_date).year() === selectedYear)

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
    }, [data, filterType, selectedWeek, selectedMonth, selectedYear, selectedCustomer])

    useEffect(() => {
        isMounted.current = true
        fetchData()
        return () => {
            isMounted.current = false
            httpService.cancelAllRequests()
        }
    }, [fetchData])

    useEffect(() => applyFilters(), [applyFilters])

    const handleAction = (item: Transaction, action: "approve" | "reject") => {
        setSelectedItem(item)
        setDialogAction(action)
        setIsModalOpen(true)
    }

    const confirmAction = async () => {
        if (!selectedItem || !dialogAction) return

        setLoading(true)
        try {
            const newStatus = dialogAction === "approve" ? "Hoàn thành" : "Lỗi"

            if (dialogAction === "approve") {
                const userId = selectedItem.name
                const amountToAdd = Number.parseFloat(selectedItem.amount)
                const moneyRef = ref(database, `money/${userId}`)

                let currentAmount = 0
                await new Promise((resolve) => {
                    onValue(moneyRef, (snapshot) => {
                        if (snapshot.exists()) currentAmount = snapshot.val().amount || 0
                        resolve(null)
                    }, { onlyOnce: true })
                })
                await set(moneyRef, { amount: currentAmount + amountToAdd })
            }

            await transactionApiRequest.update({
                transaction_id: selectedItem.id,
                status: newStatus
            })

            await sheetApiRequest.getIDKH(
                selectedItem.name,
                dialogAction === "approve"
                    ? `Yêu cầu nạp ${selectedItem.amount}$ đã được phê duyệt`
                    : `Yêu cầu nạp ${selectedItem.amount}$ đã bị từ chối`
            )

            await fetchData(true)
            toast.success(dialogAction === "approve" ? "Xác nhận thành công!" : "Từ chối thành công!")
            setRefreshKey(prev => prev + 1)
            router.refresh()

        } catch (error) {
            console.error("Error:", error)
            toast.error("Có lỗi xảy ra!")
        } finally {
            setLoading(false)
            setIsModalOpen(false)
        }
    }

    const cancelAction = async () => {
        if (!selectedItem || !dialogAction) return

        setLoading(true)
        try {
            await transactionApiRequest.update({
                transaction_id: selectedItem.id,
                status: dialogAction === "approve" ? "Lỗi" : "Đang chờ"
            })

            await sheetApiRequest.getIDKH(
                selectedItem.name,
                dialogAction === "approve"
                    ? `Yêu cầu nạp ${selectedItem.amount}$ đã bị từ chối`
                    : `Yêu cầu nạp ${selectedItem.amount}$ đã được hủy`
            )

            await fetchData(true)
            toast.success(dialogAction === "approve" ? "Từ chối thành công!" : "Hủy thành công!")
            setRefreshKey(prev => prev + 1)
            router.refresh()

        } catch (error) {
            console.error("Error:", error)
            toast.error("Có lỗi xảy ra!")
        } finally {
            setLoading(false)
            setIsModalOpen(false)
        }
    }

    const getStatusBadge = (status: string) => {
        type StatusType = "Hoàn thành" | "Lỗi" | "Đang chờ"
        type StatusStyle = {
            bg: string
            text: string
            dot: string
        }

        const statusStyles: Record<StatusType, StatusStyle> = {
            "Hoàn thành": { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-400" },
            "Lỗi": { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-400" },
            "Đang chờ": { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-400" },
        }

        const defaultStyle: StatusStyle = {
            bg: "bg-slate-100",
            text: "text-slate-800",
            dot: "bg-slate-400"
        }

        const style = statusStyles[status as StatusType] || defaultStyle

        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
                <span className={`w-2 h-2 mr-2 rounded-full ${style.dot}`}></span>
                {status}
            </span>
        )
    }

    const formatCurrency = (amount: number) => "$" + amount.toLocaleString("en-US")

    const getUniqueCustomers = useCallback(() =>
        Array.from(new Set(data.map((item) => item.name).filter(Boolean))),
        [data]
    )

    const getTotalAmount = (status: string) =>
        filteredData
            .filter((item) => item.status === status)
            .reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)

    return (
        <div style={{ scrollbarWidth: "none", scrollBehavior: "smooth" }} className="h-[94vh] px-2 py-2 overflow-y-auto">
            {contextHolder}

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                {[
                    { title: "Số tiền thu vào", amount: getTotalAmount("Hoàn thành"), icon: BarChart3, color: "emerald" },
                    { title: "Số tiền đang chờ", amount: getTotalAmount("Đang chờ"), icon: Calendar, color: "amber" },
                    { title: "Số tiền hủy", amount: getTotalAmount("Lỗi"), icon: AlertTriangle, color: "rose" },
                ].map((card, idx) => (
                    <div
                        key={idx}
                        className={`relative bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-300 border-t-4 border-${card.color}-500`}
                    >
                        <div className={`p-6 bg-gradient-to-br from-${card.color}-50 to-${card.color}-100`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={`text-sm font-semibold text-${card.color}-700`}>{card.title}</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(card.amount)}</h3>
                                </div>
                                <div className={`p-3 bg-${card.color}-100 rounded-full shadow-md`}>
                                    <card.icon className={`h-6 w-6 text-${card.color}-600`} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-4 border-t-4 border-indigo-500">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Bộ lọc dữ liệu</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loại lọc</label>
                        <Select
                            className="w-full rounded-lg"
                            value={filterType}
                            onChange={(value) => {
                                setFilterType(value)
                                setSelectedWeek(null)
                                setSelectedMonth(null)
                                setSelectedCustomer(null)
                            }}
                            options={[
                                { value: "week", label: "Theo tuần" },
                                { value: "month", label: "Theo tháng" },
                                { value: "customer", label: "Theo khách hàng" },
                            ]}
                        />
                    </div>
                    {filterType === "week" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn tuần</label>
                            <Select
                                className="w-full rounded-lg"
                                value={selectedWeek}
                                onChange={setSelectedWeek}
                                allowClear
                                placeholder="Chọn tuần"
                                options={Array.from({ length: 53 }, (_, i) => ({ value: i + 1, label: `Tuần ${i + 1}` }))}
                            />
                        </div>
                    )}
                    {filterType === "month" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn tháng</label>
                            <Select
                                className="w-full rounded-lg"
                                value={selectedMonth}
                                onChange={setSelectedMonth}
                                allowClear
                                placeholder="Chọn tháng"
                                options={Array.from({ length: 12 }, (_, i) => ({ value: i, label: `Tháng ${i + 1}` }))}
                            />
                        </div>
                    )}
                    {filterType === "customer" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn khách hàng</label>
                            <Select
                                className="w-full rounded-lg"
                                value={selectedCustomer}
                                onChange={setSelectedCustomer}
                                allowClear
                                placeholder="Chọn khách hàng"
                                options={getUniqueCustomers().map((name) => ({ value: name, label: name }))}
                            />
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
                            }}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-md"
                        >
                            Đặt lại
                        </button>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-indigo-500">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Danh sách giao dịch</h2>
                <div className="overflow-x-auto max-h-[500px] rounded-lg border border-gray-200 shadow-inner">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                {["ID", "Số tiền", "Ngày nạp", "Phương thức", "Nội dung", "Khách hàng", "Trạng thái", "Hành động"].map(
                                    (header) => (
                                        <th
                                            key={header}
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            {header}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredData.length > 0 ? (
                                filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-700">{item.id}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                                            {formatCurrency(Number.parseFloat(item.amount))}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{item.deposit_date}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{item.method}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{item.description}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{item.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{getStatusBadge(item.status)}</td>
                                        <td className="px-6 py-4 text-sm space-x-2">
                                            <button
                                                className={`p-2 rounded-full shadow-md text-white bg-emerald-500 hover:bg-emerald-600 transition-colors ${item.status !== "Đang chờ" ? "opacity-50 cursor-not-allowed" : ""
                                                    }`}
                                                onClick={() => handleAction(item, "approve")}
                                                disabled={item.status !== "Đang chờ"}
                                            >
                                                <CheckCircle className="h-5 w-5" />
                                            </button>
                                            <button
                                                className={`p-2 rounded-full shadow-md text-white bg-rose-500 hover:bg-rose-600 transition-colors ${item.status !== "Đang chờ" ? "opacity-50 cursor-not-allowed" : ""
                                                    }`}
                                                onClick={() => handleAction(item, "reject")}
                                                disabled={item.status !== "Đang chờ"}
                                            >
                                                <XCircle className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                                        {loading ? "Đang tải..." : "Không có dữ liệu"}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Scroll to Top Button */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="fixed bottom-6 right-6 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                        fillRule="evenodd"
                        d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>

            {/* Modal */}
            <Modal
                title={dialogAction === "approve" ? "Xác nhận giao dịch" : "Từ chối giao dịch"}
                open={isModalOpen}
                onOk={confirmAction}
                onCancel={cancelAction}
                okText={dialogAction === "approve" ? "Xác nhận" : "Từ chối"}
                cancelText="Hủy"
                confirmLoading={loading}
                okButtonProps={{
                    className: dialogAction === "approve" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600",
                }}
            >
                <p className="text-gray-700">
                    {dialogAction === "approve"
                        ? "Bạn có chắc chắn muốn xác nhận giao dịch này?"
                        : "Bạn có chắc chắn muốn từ chối giao dịch này?"}
                </p>
                {selectedItem && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow-inner">
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">Khách hàng:</span> {selectedItem.name}
                        </p>
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">Số tiền:</span> {formatCurrency(Number.parseFloat(selectedItem.amount))}
                        </p>
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">Phương thức:</span> {selectedItem.method}
                        </p>
                    </div>
                )}
            </Modal>
        </div>
    )
}