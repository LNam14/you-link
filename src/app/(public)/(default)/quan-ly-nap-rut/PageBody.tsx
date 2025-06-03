"use client"

import { useState, useEffect } from "react"
import moment from "moment"
import "moment/locale/vi"
import { toast, Toaster } from "sonner"
import {
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Wallet,
    Calculator,
    Calendar,
    CheckCircle2,
    XCircle,
    Coins,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    X,
    Inbox,
} from "lucide-react"
import transactionApiRequest, { Transaction, TransactionResponse } from "@/apiRequests/transactions"
import { database, ref, update } from "@/app/firebase/firebase"
import { get } from "firebase/database"

export default function AttendanceTracker() {
    const [data, setData] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState<string>("")
    const [currentMonth, setCurrentMonth] = useState(moment())
    const [selectedType, setSelectedType] = useState<string>("deposit")
    const [processingTransactionId, setProcessingTransactionId] = useState<string | null>(null)

    // Thiết lập locale tiếng Việt cho moment
    useEffect(() => {
        moment.locale("vi")
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const response: any = await transactionApiRequest.get()
            console.log(response.data)
            if (response.data) {
                setData(response.data || [])
                // Set default selected month to the most recent month
                if (response.data && response.data.length > 0) {
                    const firstTransaction = response.data[0]
                    const firstMonth = moment(firstTransaction.deposit_date).format("YYYY-MM")
                    setSelectedMonth(firstMonth)
                    setCurrentMonth(moment(firstMonth))
                }
            }
        } catch (error) {
            toast.error("Không thể tải dữ liệu")
            setData([]) // Set empty array on error
        } finally {
            setLoading(false)
        }
    }

    const previousMonth = () => {
        const newMonth = moment(currentMonth).subtract(1, "month")
        const monthKey = newMonth.format("YYYY-MM")
        if (data.some((transaction) => moment(transaction.deposit_date).format("YYYY-MM") === monthKey)) {
            setCurrentMonth(newMonth)
            setSelectedMonth(monthKey)
        }
    }

    const nextMonth = () => {
        const newMonth = moment(currentMonth).add(1, "month")
        const monthKey = newMonth.format("YYYY-MM")
        if (data.some((transaction) => moment(transaction.deposit_date).format("YYYY-MM") === monthKey)) {
            setCurrentMonth(newMonth)
            setSelectedMonth(monthKey)
        }
    }

    const refreshData = async () => {
        setLoading(true)
        await fetchData()
        toast.success("Dữ liệu đã được cập nhật")
        setLoading(false)
    }

    const handleUpdateStatus = async (transactionId: string, newStatus: "Hoàn thành" | "Lỗi") => {
        try {
            setProcessingTransactionId(transactionId)
            // First get the transaction details to know the amount and username
            const transaction: any = data.find(t => t.id === transactionId);
            if (!transaction) {
                toast.error("Không tìm thấy giao dịch");
                return;
            }

            // Update transaction status in the API
            const response: any = await transactionApiRequest.update({
                transaction_id: transactionId,
                status: newStatus
            });

            if (response.success) {
                // If transaction is approved, update user's money and deposit in Firebase
                if (newStatus === "Hoàn thành" && transaction.type === "deposit") {
                    const userRef = ref(database, `money/${transaction.name}`);

                    // Get current user data
                    const snapshot = await get(userRef);
                    const currentData = snapshot.val() || { amount: 0, deposit: 0 };

                    // Update user's money and deposit
                    await update(userRef, {
                        amount: (currentData.amount || 0) + parseInt(transaction.amount),
                        deposit: (currentData.deposit || 0) + parseInt(transaction.amount)
                    });
                } else if (newStatus === "Hoàn thành" && transaction.type === "withdraw") {
                    const userRef = ref(database, `money/${transaction.name}`);

                    // Get current user data
                    const snapshot = await get(userRef);
                    const currentData = snapshot.val() || { amount: 0, withdraw: 0 };

                    // Update user's money and withdraw
                    await update(userRef, {
                        amount: (currentData.amount || 0) - parseInt(transaction.amount),
                        pendingAmount: (currentData.pendingAmount || 0) - parseInt(transaction.amount),
                        withdraw: (currentData.withdraw || 0) + parseInt(transaction.amount)
                    });
                }

                toast.success(`Cập nhật trạng thái thành công`);
                // Refresh data after successful update
                await fetchData();
            } else {
                toast.error(response.message || "Có lỗi xảy ra khi cập nhật");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Không thể cập nhật trạng thái");
        } finally {
            setProcessingTransactionId(null);
        }
    };

    console.log(data)
    const filteredTransactions = (data || []).filter(
        (transaction) =>
            moment(transaction.deposit_date).format("YYYY-MM") === selectedMonth &&
            (selectedType === "all" || transaction.type === selectedType)
    )

    // Calculate totals
    const calculateTotals = () => {
        const totals = filteredTransactions.reduce((acc, transaction: any) => {
            const amount = parseInt(transaction.amount);
            if (transaction.status === "Hoàn thành") {
                acc.success += amount;
                acc.successCount += 1;
            } else if (transaction.status === "Lỗi") {
                acc.failed += amount;
                acc.failedCount += 1;
            }
            return acc;
        }, { success: 0, failed: 0, successCount: 0, failedCount: 0 });
        return totals;
    };

    const totals = calculateTotals();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-6 px-4">
            <Toaster position="top-right" expand={true} richColors />

            <div className="max-w-7xl mx-auto">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-md p-6 border border-green-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Tổng tiền nạp thành công</p>
                                <p className="text-2xl font-bold text-green-600 mt-1">
                                    {totals.success.toLocaleString('en-US')} $
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6 border border-red-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Tổng tiền giao dịch lỗi</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">
                                    {totals.failed.toLocaleString('en-US')} $
                                </p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertCircle className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6 border border-green-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Số giao dịch thành công</p>
                                <p className="text-2xl font-bold text-green-600 mt-1">
                                    {totals.successCount.toLocaleString('en-US')}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6 border border-red-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Số giao dịch lỗi</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">
                                    {totals.failedCount.toLocaleString('en-US')}
                                </p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-full">
                                <X className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-blue-100">
                    <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Coins className="h-6 w-6" />
                                Quản lý Nạp Rút
                            </h2>

                            <div className="flex items-center gap-2">
                                <div className="flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setSelectedType("deposit")}
                                        className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedType === "deposit" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                            }`}
                                    >
                                        <Wallet className="h-4 w-4 mr-1" />
                                        Nạp tiền
                                    </button>
                                    <button
                                        onClick={() => setSelectedType("withdraw")}
                                        className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedType === "withdraw" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                            }`}
                                    >
                                        <Calculator className="h-4 w-4 mr-1" />
                                        Rút tiền
                                    </button>
                                </div>
                                <button
                                    onClick={refreshData}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 shadow-md"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Month Navigation */}
                    <div className="bg-gradient-to-r from-blue-100 to-blue-100 px-6 py-2">
                        <div className="flex items-center justify-between">
                            <button
                                className="p-2 rounded-full bg-white/70 hover:bg-white transition-colors text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
                                onClick={previousMonth}
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                            <h2 className="text-lg md:text-xl font-bold text-blue-800 capitalize flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                {currentMonth.format("MMMM YYYY")}
                            </h2>
                            <button
                                className="p-2 rounded-full bg-white/70 hover:bg-white transition-colors text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
                                onClick={nextMonth}
                            >
                                <ChevronRight className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Transaction Table */}
                    <div className="overflow-x-auto">
                        {filteredTransactions.length > 0 ? (
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tên</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {selectedType === "withdraw" ? "Mạng" : "Phương thức"}
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {selectedType === "withdraw" ? "Địa chỉ ví" : "Mô tả"}
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredTransactions.map((transaction: any) => (
                                        <tr key={transaction.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {parseFloat(transaction.amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} $
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {selectedType === "withdraw" ? transaction.address : transaction.method}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {selectedType === "withdraw" ? transaction.wallet : transaction.description}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {moment(transaction.deposit_date).format("YYYY/MM/DD")}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${transaction.status === "Hoàn thành"
                                                    ? "bg-green-100 text-green-800"
                                                    : transaction.status === "Lỗi"
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-yellow-100 text-yellow-800"
                                                    }`}>
                                                    {transaction.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleUpdateStatus(transaction.id, "Hoàn thành")}
                                                        disabled={transaction.status !== "Đang chờ" || processingTransactionId === transaction.id}
                                                        className={`inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors
                                                            ${transaction.status === "Đang chờ" && processingTransactionId !== transaction.id
                                                                ? "text-green-700 bg-green-100 hover:bg-green-200 cursor-pointer"
                                                                : "text-gray-400 bg-gray-100 cursor-not-allowed opacity-50"}`}
                                                    >
                                                        {processingTransactionId === transaction.id ? (
                                                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="h-4 w-4 mr-1" />
                                                        )}
                                                        Phê duyệt
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(transaction.id, "Lỗi")}
                                                        disabled={transaction.status !== "Đang chờ" || processingTransactionId === transaction.id}
                                                        className={`inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors
                                                            ${transaction.status === "Đang chờ" && processingTransactionId !== transaction.id
                                                                ? "text-red-700 bg-red-100 hover:bg-red-200 cursor-pointer"
                                                                : "text-gray-400 bg-gray-100 cursor-not-allowed opacity-50"}`}
                                                    >
                                                        {processingTransactionId === transaction.id ? (
                                                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                                        ) : (
                                                            <XCircle className="h-4 w-4 mr-1" />
                                                        )}
                                                        Từ chối
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                <div className="p-4 bg-gray-50 rounded-full mb-4">
                                    <Inbox className="h-12 w-12 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">Không có dữ liệu</h3>
                                <p className="text-sm text-gray-500 text-center max-w-sm">
                                    {selectedMonth
                                        ? `Không có giao dịch nào trong tháng ${moment(selectedMonth).format("MMMM YYYY")}`
                                        : "Không có giao dịch nào được tìm thấy"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
