"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Tabs, Table, Spin, Empty } from "antd"
import { ref, onValue } from "firebase/database"
import { database } from "@/app/firebase/firebase"
import type { TabsProps } from "antd"
import { DollarSign, Users, Briefcase, ArrowUpRight, ArrowDownRight, RefreshCw, ArrowUp } from "lucide-react"

interface MoneyData {
    amount: number
    pendingAmount: number
    doneAmount: number
    withdrawableAmount: number
}

interface CustomerData {
    key: string
    username: string
    totalDeposit: number
    doneAmount: number
    pendingAmount: number
    availableBalance: number
}

interface SupplierData {
    key: string
    username: string
    amount: number
    withdrawableAmount: number
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
                                {value.toLocaleString("vi-VN")} {suffix}
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

export default function MoneyManagementPage() {
    const [customers, setCustomers] = useState<CustomerData[]>([])
    const [suppliers, setSuppliers] = useState<SupplierData[]>([])
    const [totalProfit, setTotalProfit] = useState(0)
    const [totalCustomerDeposit, setTotalCustomerDeposit] = useState(0)
    const [totalSupplierAmount, setTotalSupplierAmount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("customers")
    const [refreshing, setRefreshing] = useState(false)

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
                let totalSupplierAmt = 0

                Object.entries(moneyData).forEach(([username, data]) => {
                    const moneyInfo = data as MoneyData

                    // Calculate customer data
                    const totalDeposit = (moneyInfo.amount || 0) + (moneyInfo.doneAmount || 0)
                    const doneAmount = moneyInfo.doneAmount || 0
                    const pendingAmount = moneyInfo.pendingAmount || 0
                    const availableBalance = (moneyInfo.amount || 0) - (moneyInfo.pendingAmount || 0)

                    if (username.startsWith("KH")) {
                        customerList.push({
                            key: username,
                            username,
                            totalDeposit,
                            doneAmount,
                            pendingAmount,
                            availableBalance,
                        })
                        totalCustomerDone += doneAmount
                        totalCustomerDeposits += totalDeposit
                    } else if (username.startsWith("N")) {
                        supplierList.push({
                            key: username,
                            username,
                            amount: moneyInfo.amount || 0,
                            withdrawableAmount: moneyInfo.withdrawableAmount || 0,
                        })
                        totalSupplierAmt += moneyInfo.amount || 0
                    }
                })

                setCustomers(customerList)
                setSuppliers(supplierList)
                setTotalProfit(totalCustomerDeposits - totalSupplierAmt)
                setTotalCustomerDeposit(totalCustomerDeposits)
                setTotalSupplierAmount(totalSupplierAmt)
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
            key: "username",
            width: 120,
            fixed: "left" as const,
            render: (text: string) => <span className="font-medium text-gray-800">{text}</span>,
        },
        {
            title: "Tiền nạp",
            dataIndex: "totalDeposit",
            key: "totalDeposit",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-emerald-600">{value.toLocaleString("vi-VN")} USDT</span>
            ),
            sorter: (a: CustomerData, b: CustomerData) => a.totalDeposit - b.totalDeposit,
        },
        {
            title: "Tiền OK",
            dataIndex: "doneAmount",
            key: "doneAmount",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-blue-600">{value.toLocaleString("vi-VN")} USDT</span>
            ),
            sorter: (a: CustomerData, b: CustomerData) => a.doneAmount - b.doneAmount,
        },
        {
            title: "Tiền treo",
            dataIndex: "pendingAmount",
            key: "pendingAmount",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-amber-600">{value.toLocaleString("vi-VN")} USDT</span>
            ),
            sorter: (a: CustomerData, b: CustomerData) => a.pendingAmount - b.pendingAmount,
        },
        {
            title: "Số dư",
            dataIndex: "availableBalance",
            key: "availableBalance",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-purple-600">{value.toLocaleString("vi-VN")} USDT</span>
            ),
            sorter: (a: CustomerData, b: CustomerData) => a.availableBalance - b.availableBalance,
        },
    ]

    const supplierColumns = [
        {
            title: "Mã NCC",
            dataIndex: "username",
            key: "username",
            width: 120,
            fixed: "left" as const,
            render: (text: string) => <span className="font-medium text-gray-800">{text}</span>,
        },
        {
            title: "Tổng tiền",
            dataIndex: "amount",
            key: "amount",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-emerald-600">{value.toLocaleString("vi-VN")} USDT</span>
            ),
            sorter: (a: SupplierData, b: SupplierData) => a.amount - b.amount,
        },
        {
            title: "Tiền đã rút",
            dataIndex: "withdrawableAmount",
            key: "withdrawableAmount",
            width: 150,
            render: (value: number) => (
                <span className="font-medium text-blue-600">{value.toLocaleString("vi-VN")} USDT</span>
            ),
            sorter: (a: SupplierData, b: SupplierData) => a.withdrawableAmount - b.withdrawableAmount,
        },
    ]

    return (
        <div className="h-[94vh] overflow-y-auto px-4 py-6 bg-gray-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Quản lý tài chính</h1>
                        <p className="text-gray-500 mt-1">Theo dõi tài chính của khách hàng và nhà cung cấp</p>
                    </div>
                    <div className="flex items-center space-x-3 mt-4 md:mt-0">
                        <button
                            onClick={handleRefresh}
                            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                            disabled={refreshing}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                            {refreshing ? "Đang làm mới..." : "Làm mới"}
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="w-full overflow-x-auto">
                    <div className="flex space-x-2 min-w-full">
                        {/* <div className="flex-1 min-w-[300px]">
                            <StatCard
                                title="Lợi nhuận"
                                value={totalProfit}
                                icon={<DollarSign className="h-5 w-5" />}
                                color="green"
                                loading={loading}
                            />
                        </div> */}
                        <div className="flex-1 min-w-[300px]">
                            <StatCard
                                title="Số dư KH"
                                value={totalCustomerDeposit}
                                icon={<ArrowUpRight className="h-5 w-5" />}
                                color="blue"
                                loading={loading}
                            />
                        </div>
                        <div className="flex-1 min-w-[300px]">
                            <StatCard
                                title="Số dư NCC"
                                value={totalSupplierAmount}
                                icon={<ArrowDownRight className="h-5 w-5" />}
                                color="amber"
                                loading={loading}
                            />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm p-4 mt-4 mb-4">
                    <Tabs
                        defaultActiveKey="customers"
                        items={[
                            {
                                key: "customers",
                                label: (
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        <span>Khách hàng ({customers.length})</span>
                                    </div>
                                ),
                                children: (
                                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                        {loading ? (
                                            <div className="flex items-center justify-center h-64">
                                                <Spin size="large" />
                                            </div>
                                        ) : customers.length > 0 ? (
                                            <Table
                                                dataSource={customers}
                                                columns={customerColumns}
                                                pagination={{
                                                    pageSize: 10,
                                                    showSizeChanger: true,
                                                    pageSizeOptions: ["10", "20", "50"],
                                                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} khách hàng`,
                                                }}
                                                scroll={{ x: "max-content", y: 500 }}
                                                className="custom-table"
                                                rowClassName={(record, index) => (index % 2 === 0 ? "bg-gray-50" : "")}
                                            />
                                        ) : (
                                            <Empty description="Không có dữ liệu khách hàng" />
                                        )}
                                    </div>
                                ),
                            },
                            {
                                key: "suppliers",
                                label: (
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4" />
                                        <span>NCC ({suppliers.length})</span>
                                    </div>
                                ),
                                children: (
                                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                        {loading ? (
                                            <div className="flex items-center justify-center h-64">
                                                <Spin size="large" />
                                            </div>
                                        ) : suppliers.length > 0 ? (
                                            <Table
                                                dataSource={suppliers}
                                                columns={supplierColumns}
                                                pagination={{
                                                    pageSize: 10,
                                                    showSizeChanger: true,
                                                    pageSizeOptions: ["10", "20", "50"],
                                                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} nhà cung cấp`,
                                                }}
                                                scroll={{ x: "max-content", y: 500 }}
                                                className="custom-table"
                                                rowClassName={(record, index) => (index % 2 === 0 ? "bg-gray-50" : "")}
                                            />
                                        ) : (
                                            <Empty description="Không có dữ liệu nhà cung cấp" />
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                        onChange={(key) => setActiveTab(key)}
                        className="custom-tabs"
                        tabBarStyle={{ marginBottom: 16 }}
                    />
                </div>

                {/* Scroll to Top Button */}
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="fixed bottom-6 right-6 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300"
                >
                    <ArrowUp className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
}
