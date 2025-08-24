"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ShoppingCart, Package, Loader2, Plus, Minus } from "lucide-react"
import { toast, Toaster } from "sonner"
import getUserInfo from "@/components/userInfo"
import { getDatabase, ref, push, set, get } from "firebase/database"
import { database } from "@/lib/firebase"
import { useRouter } from "next/navigation"

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
    const router = useRouter()

    useEffect(() => {
        const countOrdersByTenKH = async () => {
            try {
                const ordersRef = ref(database, 'orderContent')
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

    const handleOrder = async (item: ContentItem): Promise<void> => {
        const quantity = quantities[item.MaNCC] || 1
        if (quantity <= 0) {
            toast.error("Vui lòng nhập số lượng lớn hơn 0", {
                description: "Số lượng phải lớn hơn 0 để đặt hàng",
            })
            return
        }

        try {
            // Validate required fields
            if (!item.TenSP || !item.GiaBan || !item.MaNCC) {
                throw new Error("Thiếu thông tin sản phẩm bắt buộc")
            }

            // Calculate prices (convert from comma to dot format)
            const giaBan = parseFloat(item.GiaBan.toString().replace(',', '.'))
            const giaMua = parseFloat(item.GiaMua.toString().replace(',', '.'))

            // Get existing orders
            const ordersRef = ref(database, 'orderContent')
            const snapshot = await get(ordersRef)
            const orders = snapshot.val() || {}

            // Find the highest order number for current user
            let maxOrderNumber = 0
            Object.keys(orders).forEach((orderId) => {
                if (orderId.startsWith(`${userInfo?.username}-`)) {
                    const orderNumber = parseInt(orderId.split('-')[1])
                    if (!isNaN(orderNumber) && orderNumber > maxOrderNumber) {
                        maxOrderNumber = orderNumber
                    }
                }
            })

            // Create a single order containing items[] and top-level totals
            maxOrderNumber++
            const newOrderId = `${userInfo?.username}-${maxOrderNumber}`

            const itemsArray = Array.from({ length: quantity }, (_, index) => ({
                MaDon: `${newOrderId}-${index + 1}`,
                KHNote1: "",
                KHNote2: "",
                ChuDe: "",
                Anchor1: "",
                URL1: "",
                Anchor2: "",
                URL2: "",
                LinkKQ: "",
                Deadline: ""
            }))

            const orderData = {
                MaDon: newOrderId,
                NgayOrder: new Date().toLocaleDateString('en-GB'),
                TenSP: item.TenSP || "",
                SoLuong: quantity,
                DonGiaMua: giaMua,
                DonGiaBan: giaBan,
                TongTienMua: Number((giaMua * quantity).toFixed(2)),
                TongTienBan: Number((giaBan * quantity).toFixed(2)),
                IDNhom: item.IDNhom || "",
                MaNCC: item.MaNCC || "",
                Note: item.Note || "",
                MaKH: userInfo?.username || "",
                TinhTrang: "Chưa nhập",
                items: itemsArray,
            }

            // Add new order with the generated ID
            await set(ref(database, `orderContent/${newOrderId}`), orderData)

            toast.success("Đặt hàng thành công", {
                description: `Đã đặt ${quantity} ${item.TenSP}`,
            })

            // Redirect to /content page after successful order
            router.push('/content')
        } catch (error) {
            toast.error("Đặt hàng thất bại", {
                description: error instanceof Error ? error.message : "Vui lòng thử lại sau",
            })
            console.error("Error placing order:", error)
        }
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Toaster position="top-right" expand={true} richColors />

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
                                            value={quantities[item.MaNCC] || 1}
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
