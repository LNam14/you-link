"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Table, Spin, Empty } from "antd"
import { ref, onValue } from "firebase/database"
import { database } from "@/lib/firebase"
import { DollarSign, Users, Briefcase, ArrowUpRight, ArrowDownRight, RefreshCw, ArrowUp, Calculator, Wallet } from "lucide-react"

interface MoneyData {
    amount: number
    pendingAmount: number
    doneAmount: number
    withdrawableAmount: number
    deposit: number
    spend: number
    hang: number
    canuse: number
}

interface CustomerData {
    key: string
    username: string
    deposit: number
    spend: number
    hang: number
    canuse: number
    amount: number
}

interface SupplierData {
    key: string
    username: string
    amount: number
    withdrawableAmount: number
    totalProfit: number
}

interface StatCardProps {
    title: string
    value: number
    suffix?: string
    icon: React.ReactNode
    color: string
    trend?: number
    loading?: boolean
    subtitle?: string
}

const StatCard: React.FC<StatCardProps> = ({ title, value, suffix = "USDT", icon, color, trend, loading = false, subtitle }) => {
    const colorClasses = {
        green: "from-emerald-500/20 to-emerald-500/5 text-emerald-700 border-emerald-200",
        blue: "from-blue-500/20 to-blue-500/5 text-blue-700 border-blue-200",
        amber: "from-amber-500/20 to-amber-500/5 text-amber-700 border-amber-200",
        purple: "from-purple-500/20 to-purple-500/5 text-purple-700 border-purple-200",
    }

    const iconColorClasses = {
        green: "bg-emerald-500 text-white",
        blue: "bg-blue-500 text-white",
        amber: "bg-amber-500 text-white",
        purple: "bg-purple-500 text-white",
    }

    return (
        <div
            className={`relative bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md border ${colorClasses[color as keyof typeof colorClasses]}`}
        >
            <div
                className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} opacity-20`}
            ></div>
            <div className="relative p-5">
                {loading ? (
                    <div className="flex items-center justify-center h-24">
                        <Spin size="large" />
                    </div>
                ) : (
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-medium text-gray-700">{title}</h3>
                                {trend !== undefined && (
                                    <span
                                        className={`flex items-center text-xs font-medium ${trend > 0 ? "text-emerald-600" : "text-rose-600"}`}
                                    >
                                        {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                        {Math.abs(trend)}%
                                    </span>
                                )}
                            </div>
                            <p className="text-2xl font-bold mt-2">
                                {value.toLocaleString("en-US")} {suffix}
                            </p>
                            {subtitle && (
                                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                            )}
                        </div>
                        <div className={`p-3 rounded-lg ${iconColorClasses[color as keyof typeof iconColorClasses]}`}>{icon}</div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function PageBody() {
    const [customers, setCustomers] = useState<CustomerData[]>([])
    const [suppliers, setSuppliers] = useState<SupplierData[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [selectedType, setSelectedType] = useState<string>("NCC")
    const [totalDeposit, setTotalDeposit] = useState(0)
    const [totalDoneAmount, setTotalDoneAmount] = useState(0)
    const [totalPendingAmount, setTotalPendingAmount] = useState(0)
    const [totalSupplierWithdrawable, setTotalSupplierWithdrawable] = useState(0)
    const [totalSupplierAmount, setTotalSupplierAmount] = useState(0)
    const [totalAmount, setTotalAmount] = useState(0)

    const fetchData = () => {
        setRefreshing(true)
        // Fetch money data for all users
        const moneyRef = ref(database, "money")
        onValue(moneyRef, (snapshot) => {
            if (snapshot.exists()) {
                const moneyData = snapshot.val()
                const customerList: CustomerData[] = []
                const supplierList: SupplierData[] = []
                let totalCustomerDone = 0
                let totalCustomerDeposits = 0
                let totalCustomerPending = 0
                let totalCustomerAmount = 0
                let totalSupplierAmt = 0
                let totalSupplierWithdraw = 0

                Object.entries(moneyData).forEach(([username, data]) => {
                    const moneyInfo = data as MoneyData

                    if (username.startsWith("KH") || username.startsWith("BH")) {
                        const amount = Number(moneyInfo.amount || 0)
                        const hang = Number(moneyInfo.hang || 0)
                        customerList.push({
                            key: username,
                            username,
                            deposit: Number(moneyInfo.deposit || 0),
                            spend: Number(moneyInfo.spend || 0),
                            hang: hang,
                            canuse: amount - hang,
                            amount: amount,
                        })
                        totalCustomerDone += Number(moneyInfo.spend || 0)
                        totalCustomerDeposits += Number(moneyInfo.deposit || 0)
                        totalCustomerPending += Number(moneyInfo.hang || 0)
                        totalCustomerAmount += amount
                    } else if (username.startsWith("N") || username.startsWith("O")) {
                        const amount = Number(moneyInfo.amount || 0)
                        const withdrawableAmount = Number(moneyInfo.withdrawableAmount || 0)
                        supplierList.push({
                            key: username,
                            username,
                            amount: amount,
                            withdrawableAmount: withdrawableAmount,
                            totalProfit: amount + withdrawableAmount
                        })
                        totalSupplierAmt += Number(moneyInfo.amount || 0)
                        totalSupplierWithdraw += Number(moneyInfo.withdrawableAmount || 0)
                    }
                })

                setCustomers(customerList)
                setSuppliers(supplierList)
                setTotalDeposit(totalCustomerDeposits)
                setTotalDoneAmount(totalCustomerDone)
                setTotalPendingAmount(totalCustomerPending)
                setTotalSupplierWithdrawable(totalSupplierWithdraw)
                setTotalSupplierAmount(totalSupplierAmt)
                setTotalAmount(totalCustomerAmount)
            }
            setLoading(false)
            setRefreshing(false)
        })
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleRefresh = () => {
        fetchData()
    }

    const customerColumns = [
        {
            title: "Mã KH",
            dataIndex: "username",
            key: "username" as const,
            width: 120,
            fixed: "left" as const,
            render: (text: string) => <span className="font-medium text-gray-800">{text}</span>,
        },
        {
            title: "Tiền nạp",
            dataIndex: "deposit",
            key: "deposit",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-emerald-600">{value.toLocaleString("en-US")} USDT</span>
            ),
            sorter: (a: CustomerData, b: CustomerData) => a.deposit - b.deposit,
        },
        {
            title: "Tiền đã dùng",
            dataIndex: "spend",
            key: "spend",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-blue-600">{value.toLocaleString("en-US")} USDT</span>
            ),
            sorter: (a: CustomerData, b: CustomerData) => a.spend - b.spend,
        },
        {
            title: "Tiền treo",
            dataIndex: "hang",
            key: "hang",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-amber-600">{value.toLocaleString("en-US")} USDT</span>
            ),
            sorter: (a: CustomerData, b: CustomerData) => a.hang - b.hang,
        },
        {
            title: "Có thể sử dụng",
            dataIndex: "canuse",
            key: "canuse",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-purple-600">{value.toLocaleString("en-US")} USDT</span>
            ),
            sorter: (a: CustomerData, b: CustomerData) => a.canuse - b.canuse,
        },
        {
            title: "Số dư",
            dataIndex: "amount",
            key: "amount",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-gray-800">{value.toLocaleString("en-US")} USDT</span>
            ),
            sorter: (a: CustomerData, b: CustomerData) => a.amount - b.amount,
        },
    ]

    const supplierColumns = [
        {
            title: "Mã NCC",
            dataIndex: "username",
            key: "username" as const,
            width: 120,
            fixed: "left" as const,
            render: (text: string) => <span className="font-medium text-gray-800">{text}</span>,
        },
        {
            title: "Số dư",
            dataIndex: "amount",
            key: "amount",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-emerald-600">{value.toLocaleString("en-US")} USDT</span>
            ),
            sorter: (a: SupplierData, b: SupplierData) => a.amount - b.amount,
        },
        {
            title: "Đã rút",
            dataIndex: "withdrawableAmount",
            key: "withdrawableAmount",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-blue-600">{value.toLocaleString("en-US")} USDT</span>
            ),
            sorter: (a: SupplierData, b: SupplierData) => a.withdrawableAmount - b.withdrawableAmount,
        },
        {
            title: "Tổng tiền",
            dataIndex: "totalProfit",
            key: "totalProfit",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-purple-600">{value.toLocaleString("en-US")} USDT</span>
            ),
            sorter: (a: SupplierData, b: SupplierData) => a.totalProfit - b.totalProfit,
        },
    ]

    // Helper function to extract and compare numeric parts
    const getNumericPart = (username: string) => {
        const match = username.match(/\d+/)
        return match ? parseInt(match[0]) : 0
    }

    const sortByUsername = (a: CustomerData | SupplierData, b: CustomerData | SupplierData) => {
        // First compare the text part (KH, BH, ODR, etc.)
        const textA = a.username.replace(/\d+/g, '')
        const textB = b.username.replace(/\d+/g, '')

        if (textA !== textB) {
            return textA.localeCompare(textB)
        }

        // If text parts are the same, compare numeric parts
        return getNumericPart(a.username) - getNumericPart(b.username)
    }

    const filteredCustomers = customers
        .filter(customer => {
            if (selectedType === "Bán hàng") {
                return customer.username.startsWith("BH")
            } else if (selectedType === "Khách hàng") {
                return customer.username.startsWith("KH")
            }
            return true
        })
        .sort(sortByUsername)

    const sortedSuppliers = suppliers.sort(sortByUsername)

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-6 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Stats Cards */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${selectedType === "NCC" ? "lg:grid-cols-2" : "lg:grid-cols-4"} gap-4 mb-6`}>
                    {selectedType === "NCC" ? (
                        <>
                            <StatCard
                                title="Tổng Số Dư"
                                value={totalSupplierAmount}
                                icon={<DollarSign className="h-6 w-6" />}
                                color="green"
                                loading={loading}
                            />
                            <StatCard
                                title="Tổng Đã Rút"
                                value={totalSupplierWithdrawable}
                                icon={<ArrowUpRight className="h-6 w-6" />}
                                color="blue"
                                loading={loading}
                            />
                        </>
                    ) : (
                        <>
                            <StatCard
                                title="Tổng tiền nạp"
                                value={totalDeposit}
                                icon={<DollarSign className="h-6 w-6" />}
                                color="green"
                                loading={loading}
                            />
                            <StatCard
                                title="Tổng tiền đã dùng"
                                value={totalDoneAmount}
                                icon={<ArrowUpRight className="h-6 w-6" />}
                                color="blue"
                                loading={loading}
                            />
                            <StatCard
                                title="Tổng tiền treo"
                                value={totalPendingAmount}
                                icon={<ArrowDownRight className="h-6 w-6" />}
                                color="amber"
                                loading={loading}
                            />
                            <StatCard
                                title="Tổng số dư"
                                value={totalAmount}
                                icon={<Wallet className="h-6 w-6" />}
                                color="purple"
                                loading={loading}
                            />
                        </>
                    )}
                </div>

                {/* Header */}
                <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-blue-100 mb-6">
                    <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <DollarSign className="h-6 w-6" />
                                Quản lý tài chính
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setSelectedType("NCC")}
                                        className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedType === "NCC" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        <Wallet className="h-4 w-4 mr-1" />
                                        NCC
                                    </button>
                                    <button
                                        onClick={() => setSelectedType("Khách hàng")}
                                        className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedType === "Khách hàng" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        <Calculator className="h-4 w-4 mr-1" />
                                        Khách hàng
                                    </button>
                                    <button
                                        onClick={() => setSelectedType("Bán hàng")}
                                        className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedType === "Bán hàng" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        <Users className="h-4 w-4 mr-1" />
                                        Bán hàng
                                    </button>
                                </div>
                                <button
                                    onClick={handleRefresh}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 shadow-md"
                                    disabled={refreshing}
                                >
                                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Spin size="large" />
                            </div>
                        ) : selectedType === "NCC" ? (
                            sortedSuppliers.length > 0 ? (
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {supplierColumns.map((column) => (
                                                <th
                                                    key={column.key}
                                                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                >
                                                    {column.title}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sortedSuppliers.map((supplier) => (
                                            <tr key={supplier.key} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-900">{supplier.username}</td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-emerald-600 font-medium">
                                                    {supplier.amount.toLocaleString('en-US')} USDT
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-blue-600 font-medium">
                                                    {supplier.withdrawableAmount.toLocaleString('en-US')} USDT
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-purple-600 font-medium">
                                                    {supplier.totalProfit.toLocaleString('en-US')} USDT
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4">
                                    <div className="p-4 bg-gray-50 rounded-full mb-4">
                                        <Briefcase className="h-12 w-12 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">Không có dữ liệu</h3>
                                    <p className="text-sm text-gray-500 text-center max-w-sm">
                                        Không có dữ liệu nhà cung cấp nào được tìm thấy
                                    </p>
                                </div>
                            )
                        ) : (
                            filteredCustomers.length > 0 ? (
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {customerColumns.map((column) => (
                                                <th
                                                    key={column.key}
                                                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                >
                                                    {column.title}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredCustomers.map((customer) => (
                                            <tr key={customer.key} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-900">{customer.username}</td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-emerald-600 font-medium">
                                                    {customer.deposit.toLocaleString('en-US')} USDT
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-blue-600 font-medium">
                                                    {customer.spend.toLocaleString('en-US')} USDT
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-amber-600 font-medium">
                                                    {customer.hang.toLocaleString('en-US')} USDT
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-purple-600 font-medium">
                                                    {customer.canuse.toLocaleString('en-US')} USDT
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-800 font-medium">
                                                    {customer.amount.toLocaleString('en-US')} USDT
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4">
                                    <div className="p-4 bg-gray-50 rounded-full mb-4">
                                        <Users className="h-12 w-12 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">Không có dữ liệu</h3>
                                    <p className="text-sm text-gray-500 text-center max-w-sm">
                                        {selectedType === "Bán hàng"
                                            ? "Không có dữ liệu bán hàng nào được tìm thấy"
                                            : "Không có dữ liệu khách hàng nào được tìm thấy"
                                        }
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Scroll to Top Button */}
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300"
                >
                    <ArrowUp className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
}
