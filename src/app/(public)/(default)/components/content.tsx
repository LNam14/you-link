"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ShoppingCart, Package, Loader2, Plus, Minus } from "lucide-react"
import { toast, Toaster } from "sonner"
import getUserInfo from "@/components/userInfo"
import { getDatabase, ref, push, set, get } from "firebase/database"
import { database } from "@/lib/firebase"

interface ContentItem {
    TenSP: string
    GiaBan: number
    GiaMua: number
    IDNhom: string
    MaNCC: string
    Note: string
}

export default function Content({
    fetchData,
    data,
    loading,
}: {
    fetchData: any
    data: ContentItem[]
    loading: boolean
}): React.JSX.Element {
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({})
    const [orderCounts, setOrderCounts] = useState<{ [key: string]: number }>({})
    const userInfo = getUserInfo()

    useEffect(() => {
        const countOrdersByTenKH = async () => {
            try {
                const ordersRef = ref(database, 'content')
                const snapshot = await get(ordersRef)
                const orders = snapshot.val() || {}

                const counts: { [key: string]: number } = {}
                Object.values(orders).forEach((order: any) => {
                    const tenKH = order.TenKH
                    counts[tenKH] = (counts[tenKH] || 0) + 1
                })

                setOrderCounts(counts)
            } catch (error) {
                console.error("Error counting orders:", error)
            }
        }

        countOrdersByTenKH()
    }, [])

    const handleQuantityChange = (itemId: string, value: string) => {
        const numValue = Number.parseInt(value)
        if (!isNaN(numValue) && numValue >= 0) {
            setQuantities((prev) => ({
                ...prev,
                [itemId]: numValue,
            }))
        }
    }

    const handleQuantityIncrement = (itemId: string) => {
        setQuantities((prev) => ({
            ...prev,
            [itemId]: (prev[itemId] || 0) + 1,
        }))
    }

    const handleQuantityDecrement = (itemId: string) => {
        setQuantities((prev) => ({
            ...prev,
            [itemId]: Math.max(0, (prev[itemId] || 0) - 1),
        }))
    }

    const handleOrder = async (item: ContentItem) => {
        const quantity = quantities[item.MaNCC] || 1
        if (quantity <= 0) {
            toast.error("Please enter quantity greater than 0", {
                description: "Quantity must be greater than 0 to order",
            })
            return
        }

        try {
            // Validate required fields
            if (!item.TenSP || !item.GiaBan || !item.MaNCC) {
                throw new Error("Missing required product information")
            }

            // Get user's current balance from Firebase
            const userBalanceRef = ref(database, `money/${userInfo?.username}`)
            const balanceSnapshot = await get(userBalanceRef)

            let currentBalance = 0
            if (balanceSnapshot.exists()) {
                const balanceData = balanceSnapshot.val()
                // Convert balance from string with comma to number
                currentBalance = parseFloat(balanceData.amount.toString().replace(',', '.'))
                if (isNaN(currentBalance)) {
                    currentBalance = 0
                }
            }

            // Calculate total price for new orders, convert from comma to dot format
            const giaBan = parseFloat(item.GiaBan.toString().replace(',', '.'))
            const totalPrice = giaBan * quantity

            // Get existing orders
            const ordersRef = ref(database, 'content')
            const snapshot = await get(ordersRef)
            const orders = snapshot.val() || {}

            // Count orders for current user
            let orderCount = 0
            Object.values(orders).forEach((order: any) => {
                if (order.TenKH === userInfo?.username) {
                    orderCount++
                }
            })

            // Check if remaining balance is sufficient for new orders
            if (currentBalance < totalPrice) {
                toast.error("Insufficient balance", {
                    description: `Current balance: ${currentBalance.toLocaleString("vi-VN")} USDT, Required: ${totalPrice.toLocaleString("vi-VN")} USDT`,
                })
                return
            }

            // Create multiple orders based on quantity
            for (let i = 0; i < quantity; i++) {
                // Increment order count for each new order
                orderCount++
                const newOrderId = `${userInfo?.username}-${orderCount}`

                const orderData = {
                    TenSP: item.TenSP || "",
                    KHNote: "",
                    ChuDe: "",
                    Anchor1: "",
                    URL1: "",
                    Anchor2: "",
                    URL2: "",
                    LinkKQ: "",
                    Deadline: "",
                    TTNCC: "",
                    TinhTrangKH: "Chưa nhập",
                    TinhTrangNCC: "Chưa nhận",
                    GiaBan: giaBan,
                    GiaMua: parseFloat(item.GiaMua.toString().replace(',', '.')),
                    IDNhom: item.IDNhom || "",
                    MaNCC: item.MaNCC || "",
                    Note: item.Note || "",
                    TenKH: userInfo?.username || "",
                    NgayOrder: new Date().toLocaleDateString('en-GB')
                }

                // Add new order with the generated ID
                await set(ref(database, `content/${newOrderId}`), orderData)
            }

            // Deduct balance from user's account
            const newBalance = currentBalance - totalPrice

            console.log('Current Balance:', currentBalance)
            console.log('Total Price:', totalPrice)
            console.log('New Balance:', newBalance)

            if (isNaN(newBalance)) {
                throw new Error("Invalid balance calculation")
            }

            // Update balance in Firebase
            await set(ref(database, `money/${userInfo?.username}`), {
                amount: newBalance.toFixed(2)
            })

            toast.success("Order successful", {
                description: `Ordered ${quantity} ${item.TenSP}. Remaining balance: ${newBalance.toLocaleString("vi-VN")} USDT`,
            })
        } catch (error) {
            toast.error("Order failed", {
                description: error instanceof Error ? error.message : "Please try again later",
            })
            console.error("Error placing order:", error)
        }
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Toaster position="top-right" expand={true} richColors />

            <div className="mb-6 p-4 bg-white rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-2">Order Counts by Customer</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(orderCounts).map(([tenKH, count]) => (
                        <div key={tenKH} className="p-3 bg-orange-50 rounded-lg">
                            <p className="font-medium text-gray-800">{tenKH}</p>
                            <p className="text-[#ff6807] font-bold">{count} orders</p>
                        </div>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <div className="relative">
                        <Loader2 className="h-16 w-16 text-[#ff6807] animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-12 w-12 rounded-full border-4 border-[#ff6807]/20 animate-pulse"></div>
                        </div>
                    </div>
                    <p className="mt-4 text-lg font-medium text-gray-500 animate-pulse">Đang tải dữ liệu...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {data.map((item) => (
                        <div
                            key={item.MaNCC}
                            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:scale-[1.02] transform"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6807]/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            <div className="p-6 flex flex-col h-full relative">
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-gray-800 group-hover:text-[#ff6807] transition-colors duration-300">
                                        {item.TenSP}
                                    </h3>
                                    <div className="p-2 rounded-full bg-orange-50 group-hover:bg-[#ff6807]/10 transition-colors duration-300">
                                        <Package className="h-5 w-5 text-gray-400 group-hover:text-[#ff6807] transition-colors duration-300" />
                                    </div>
                                </div>

                                <div className="flex items-baseline gap-2 mb-4">
                                    <span className="text-2xl font-bold text-[#ff6807]">
                                        ${item.GiaBan.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-sm text-gray-500">USD</span>
                                </div>

                                {item.Note && (
                                    <div className="mb-6 flex-grow">
                                        <p className="text-gray-500 text-sm leading-relaxed">{item.Note}</p>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100">
                                    <div className="flex items-center rounded-full overflow-hidden bg-orange-400 shadow-sm">
                                        {/* Nút trừ */}
                                        <button
                                            onClick={() => handleQuantityDecrement(item.MaNCC)}
                                            className="h-10 w-10 flex items-center justify-center text-white hover:bg-orange-300 transition-all duration-200"
                                        >
                                            <Minus className="h-4 w-4" />
                                        </button>

                                        {/* Input số */}
                                        <input
                                            type="number"
                                            value={quantities[item.MaNCC] || 0}
                                            onChange={(e) => handleQuantityChange(item.MaNCC, e.target.value)}
                                            className="w-10 h-10 text-center bg-orange-50 text-gray-800 focus:outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                                        />

                                        {/* Nút cộng */}
                                        <button
                                            onClick={() => handleQuantityIncrement(item.MaNCC)}
                                            className="h-10 w-10 flex items-center justify-center text-white hover:bg-orange-300 transition-all duration-200"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>


                                    <button
                                        onClick={() => handleOrder(item)}
                                        className="flex-1 h-10 bg-gradient-to-r from-[#ff6807] to-orange-500 hover:from-[#ff6807]/90 hover:to-orange-500/90 text-white rounded-xl px-4 py-2 flex items-center justify-center gap-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 animate-pulse"
                                    >
                                        <ShoppingCart className="h-4 w-4" />
                                        <span>Order</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
