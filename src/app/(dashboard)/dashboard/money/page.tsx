"use client"

import { useState, useEffect } from "react"
import { Tabs, Table, Card, Statistic } from "antd"
import { ref, onValue } from "firebase/database"
import { database } from "@/app/firebase/firebase"
import type { TabsProps } from "antd"

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

export default function MoneyManagementPage() {
    const [customers, setCustomers] = useState<CustomerData[]>([])
    const [suppliers, setSuppliers] = useState<SupplierData[]>([])
    const [totalProfit, setTotalProfit] = useState(0)

    useEffect(() => {
        // Fetch money data for all users
        const moneyRef = ref(database, "money")
        const unsubscribe = onValue(moneyRef, (snapshot) => {
            if (snapshot.exists()) {
                const moneyData = snapshot.val()
                const customerList: CustomerData[] = []
                const supplierList: SupplierData[] = []
                let totalCustomerDone = 0
                let totalSupplierAmount = 0

                Object.entries(moneyData).forEach(([username, data]) => {
                    const moneyInfo = data as MoneyData
                    console.log("username", username)
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
                            availableBalance
                        })
                        totalCustomerDone += doneAmount
                    } else if (username.startsWith("N")) {
                        supplierList.push({
                            key: username,
                            username,
                            amount: moneyInfo.amount || 0,
                            withdrawableAmount: moneyInfo.withdrawableAmount || 0
                        })
                        totalSupplierAmount += moneyInfo.amount || 0
                    }
                })

                setCustomers(customerList)
                setSuppliers(supplierList)
                setTotalProfit(totalCustomerDone - totalSupplierAmount)
            }
        })

        return () => unsubscribe()
    }, [])

    const customerColumns = [
        {
            title: "Mã KH",
            dataIndex: "username",
            key: "username",
        },
        {
            title: "Tiền nạp",
            dataIndex: "totalDeposit",
            key: "totalDeposit",
            render: (value: number) => value.toLocaleString("vi-VN") + " USDT",
        },
        {
            title: "Tiền OK",
            dataIndex: "doneAmount",
            key: "doneAmount",
            render: (value: number) => value.toLocaleString("vi-VN") + " USDT",
        },
        {
            title: "Tiền treo",
            dataIndex: "pendingAmount",
            key: "pendingAmount",
            render: (value: number) => value.toLocaleString("vi-VN") + " USDT",
        },
        {
            title: "Số dư",
            dataIndex: "availableBalance",
            key: "availableBalance",
            render: (value: number) => value.toLocaleString("vi-VN") + " USDT",
        },
    ]

    const supplierColumns = [
        {
            title: "Mã NCC",
            dataIndex: "username",
            key: "username",
            width: 120,
            align: "left" as const,
            render: (text: string) => (
                <span className="font-medium text-gray-800">{text}</span>
            ),
        },
        {
            title: "Tổng tiền",
            dataIndex: "amount",
            key: "amount",
            width: 150,
            align: "left" as const,
            render: (value: number) => (
                <span className="font-medium text-green-600">
                    {value.toLocaleString("vi-VN")} USDT
                </span>
            ),
        },
        {
            title: "Tiền đã rút",
            dataIndex: "withdrawableAmount",
            key: "withdrawableAmount",
            width: 150,
            align: "left" as const,
            render: (value: number) => (
                <span className="font-medium text-blue-600">
                    {value.toLocaleString("vi-VN")} USDT
                </span>
            ),
        }
    ]

    const items: TabsProps["items"] = [
        {
            key: "customers",
            label: "Khách hàng",
            children: (
                <Table
                    dataSource={customers}
                    columns={customerColumns}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: true }}
                />
            ),
        },
        {
            key: "suppliers",
            label: "NCC",
            children: (
                <Table
                    dataSource={suppliers}
                    columns={supplierColumns}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: true }}
                />
            ),
        },
    ]

    return (
        <div className="p-6">
            <div className="mb-6">
                <Card>
                    <Statistic
                        title="Tổng lợi nhuận công ty"
                        value={totalProfit}
                        precision={2}
                        suffix="USDT"
                        valueStyle={{ color: "#3f8600" }}
                    />
                </Card>
            </div>
            <Tabs defaultActiveKey="customers" items={items} />
        </div>
    )
} 