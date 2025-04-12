"use client"

import type React from "react"

import { useState, useMemo, useCallback, useEffect } from "react"
import {
    Edit,
    Save,
    Eye,
    EyeOff,
    DollarSign,
    User,
    Filter,
    Calendar,
    CreditCard,
    Banknote,
    Building2,
    Wallet,
    PiggyBank,
    RefreshCw,
} from "lucide-react"
import Container from "@/components/Container"
import orderApiRequest from "@/apiRequests/order"
import { message, Spin } from "antd"

interface Products {
    ID: number
    OrderID: string
    Loai: string
    NgayBan: string | null
    TimeMua: number
    TimeBan: number
    Site: string
    GhiChu: string
    GiaBan: number
    GiaMua: number
    HoaHong: number
    BaiViet: string
    LinkKQ: string
    Anchor1: string
    Link1: string
    Anchor2: string
    Link2: string
    NgayKT: string | null
    IndexKT: string
    TenNB: string
    LinkNB: string
    NgDiDon: string
    DaThanhToanNCC: number
    GiaCuoi: number
    LoiNhuan: number
    ConNoNCC: number
    ThanhToanNCC: boolean
}

interface Order {
    ID: string
    Ngay: string
    NgDiDon: string
    TenNV: string
    MaNV: string
    IDNV: string
    Domain: string
    HangMuc: string
    LinkOrder: string
    NoiDung: string
    Duyet: string
    TinhTrang: string
    CK: number
    TiGia: string
    USDT: string
    NguoiNhan: string
    ThanhToan: string
    LinkBill: string
    Note: string
    KTXN: string
    Products: Products[]
    TongTien: string
}

function ProductTable({
    products,
    orderId,
    isEditing,
    onInputChange,
    changedFields,
}: {
    products: Products[]
    orderId: string
    isEditing: boolean
    onInputChange: (
        orderId: string,
        field: "product",
        value: string | number,
        productId: number,
        productField: keyof Products,
    ) => void
    changedFields: { [productId: number]: Set<string> }
}) {
    const columns = [
        "Mã Đơn",
        "Ngày Bán",
        "Time Mua",
        "Time Bán",
        "Site",
        "Ghi chú",
        "Giá Bán",
        "Giá Mua",
        "Hoa Hồng",
        "Giá Cuối",
        "Lợi Nhuận",
        "Đã TTNCC",
        "Còn nợ",
        "Bài Viết",
        "Link KQ",
        "Anchor 1",
        "Link 1",
        "Anchor 2",
        "Link 2",
        "Ngày KT",
        "Index",
        "Tên",
        "Link",
        "Ng đi đơn",
    ]

    const columnMapping: { [key: string]: keyof Products } = {
        "Mã Đơn": "OrderID",
        "Ngày Bán": "NgayBan",
        "Time Mua": "TimeMua",
        "Time Bán": "TimeBan",
        Site: "Site",
        "Ghi chú": "GhiChu",
        "Giá Bán": "GiaBan",
        "Giá Mua": "GiaMua",
        "Hoa Hồng": "HoaHong",
        "Giá Cuối": "GiaCuoi",
        "Lợi Nhuận": "LoiNhuan",
        "Đã TTNCC": "DaThanhToanNCC",
        "Còn nợ": "ConNoNCC",
        "Bài Viết": "BaiViet",
        "Link KQ": "LinkKQ",
        "Anchor 1": "Anchor1",
        "Link 1": "Link1",
        "Anchor 2": "Anchor2",
        "Link 2": "Link2",
        "Ngày KT": "NgayKT",
        Index: "IndexKT",
        Tên: "TenNB",
        Link: "LinkNB",
        "Ng đi đơn": "NgDiDon",
    }

    const renderCell = (product: Products, column: string) => {
        const isChanged = changedFields[product.ID]?.has(column)
        const fieldName = columnMapping[column]
        const value = product[fieldName]

        if (column === "Bài Viết") {
            return (
                <a
                    href={value?.toString() ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                >
                    {value?.toString() ?? ""}
                </a>
            )
        }

        if (isEditing && !["GiaCuoi", "LoiNhuan", "ConNoNCC"].includes(fieldName)) {
            return (
                <input
                    type={typeof value === "number" ? "number" : "text"}
                    value={value === null ? "" : typeof value === "number" ? value : (value?.toString() ?? "")}
                    onChange={(e) => onInputChange(orderId, "product", e.target.value, product.ID, fieldName)}
                    className={`pl-1 w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded ${isChanged ? "bg-yellow-100" : "bg-blue-100"
                        }`}
                />
            )
        } else {
            return (
                <div className={`${column === "Site" ? "w-20 truncate" : ""}`}>
                    {typeof value === "number" ? value : value === null ? "" : (value?.toString() ?? "")}
                </div>
            )
        }
    }

    return (
        <div className="text-center">
            <h3 className="text-md text-gray-50 bg-gradient-to-r from-blue-500 to-blue-800 font-semibold">
                Chi tiết đơn hàng
            </h3>
            <div style={{ scrollbarWidth: "thin" }} className="overflow-x-auto">
                <table className="w-full text-xs text-left text-gray-500">
                    <thead className="text-xs text-gray-50 bg-gradient-to-r from-blue-500 to-blue-800">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column}
                                    scope="col"
                                    className={`px-1 py-1.5 border whitespace-nowrap 
                                ${column === "Site" ? "w-16" : ""}
                                ${column === "Tên" ? "w-14" : ""}
                                ${column === "Index" ? "w-14" : ""}`}
                                >
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b bg-gray-50 font-semibold text-red-600">
                            {columns.map((column) => (
                                <td key={`total-${column}`} className="px-1 py-1.5 border whitespace-nowrap">
                                    {column === "Ghi chú"
                                        ? "Tổng"
                                        : ["Giá Bán", "Giá Mua", "Hoa Hồng", "Giá Cuối", "Lợi Nhuận", "Đã TTNCC", "Còn nợ"].includes(column)
                                            ? products.reduce((sum, product) => {
                                                const value = product[columnMapping[column] as keyof Products]
                                                return sum + (typeof value === "number" ? value : 0)
                                            }, 0)
                                            : ""}
                                </td>
                            ))}
                        </tr>
                        {products.map((product) => (
                            <tr key={product.ID} className="border-b hover:bg-gray-50">
                                {columns.map((column) => (
                                    <td
                                        key={`${product.ID}-${column}`}
                                        className="px-1 py-1.5 border whitespace-nowrap truncate max-w-[100px] overflow-hidden"
                                    >
                                        {renderCell(product, column)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(false)
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
    const [editingOrder, setEditingOrder] = useState<string | null>(null)
    const [filterOption, setFilterOption] = useState<string>("all")
    const [supplierFilter, setSupplierFilter] = useState<string>("all")
    const [customerFilter, setCustomerFilter] = useState<string>("all")
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all")
    const [supplierPaymentStatusFilter, setSupplierPaymentStatusFilter] = useState<string>("all")
    const [changedFields, setChangedFields] = useState<{
        [orderId: string]: { order: Set<string>; products: { [productId: number]: Set<string> } }
    }>({})
    const [isUpdating, setIsUpdating] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const data: any = await orderApiRequest.fetchData()
            console.log("data", data);

            setOrders(data?.data || [])
        } catch (error) {
            console.error("Error fetching data:", error)
            setOrders([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const calculateProductFields = useCallback((product: Products): Products => {
        const giaCuoi = product.GiaMua * (1 - product.HoaHong / 100)
        const loiNhuan = product.GiaBan - giaCuoi
        const conNoNCC = giaCuoi - product.DaThanhToanNCC
        const thanhToanNCC = conNoNCC <= 0

        return {
            ...product,
            GiaCuoi: giaCuoi,
            LoiNhuan: loiNhuan,
            ConNoNCC: conNoNCC,
            ThanhToanNCC: thanhToanNCC,
        }
    }, [])

    const calculatedOrders: any = useMemo(() => {
        return orders.map((order) => {
            // Add null check with optional chaining and fallback
            const products = order.Products || []
            const totalGiaBan = products.reduce((sum, product) => sum + (product.GiaBan || 0), 0) || 0
            const calculatedTongTien = (totalGiaBan * (1 - (order.CK || 0) / 100)).toFixed(2)
            return {
                ...order,
                Products: products.map(calculateProductFields) || [],
                TongTien: calculatedTongTien,
            }
        })
    }, [orders, calculateProductFields])


    const customerOrders = useMemo(() => {
        const groupedOrders: { [key: string]: (Order & { FilteredTotalValue: number; FilteredSupplierDebt: number })[] } =
            {}
        calculatedOrders.forEach((order: any) => {
            if (!groupedOrders[order.MaNV]) {
                groupedOrders[order.MaNV] = []
            }
            groupedOrders[order.MaNV].push(order)
        })
        return groupedOrders
    }, [calculatedOrders])

    const toggleOrderExpansion = useCallback(
        (orderId: string) => {
            setExpandedOrder(expandedOrder === orderId ? null : orderId)
        },
        [expandedOrder],
    )

    const handleEdit = useCallback((orderId: string) => {
        setEditingOrder(orderId)
        setChangedFields((prev) => ({ ...prev, [orderId]: { order: new Set(), products: {} } }))
    }, [])

    const handleSave = useCallback(
        async (order: Order) => {
            setIsUpdating(true)
            try {
                // Create an object to hold only the changed fields
                const changedData: any = { ID: order.ID }

                // Add changed order fields
                if (changedFields[order.ID]?.order) {
                    changedFields[order.ID].order.forEach((field) => {
                        changedData[field as keyof Order] = order[field as keyof Order]
                    })
                }

                // Add changed product fields
                if (changedFields[order.ID]?.products) {
                    const changedProducts: any[] = []

                    Object.entries(changedFields[order.ID].products).forEach(([productId, fields]) => {
                        const productIdNum = Number(productId)
                        const product = order.Products.find((p) => p.ID === productIdNum)

                        if (product && fields.size > 0) {
                            // Create an object with only the changed fields for this product
                            const changedProduct: any = {
                                ID: productIdNum,
                                OrderID: product.OrderID,
                            }

                            // Add only the changed fields
                            fields.forEach((field) => {
                                changedProduct[field] = product[field as keyof Products]
                            })

                            changedProducts.push(changedProduct)
                        }
                    })

                    if (changedProducts.length > 0) {
                        changedData.Products = changedProducts
                    }
                }

                // Only send the request if there are changes
                if (Object.keys(changedData).length > 1 || (changedData.Products && changedData.Products.length > 0)) {
                    console.log("Sending changed data:", changedData)
                    await orderApiRequest.update(changedData)

                    // Update the orders state with the saved changes
                    setOrders((prevOrders) => prevOrders.map((o) => (o.ID === order.ID ? order : o)))
                }

                // Reset editing state
                setEditingOrder(null)
                setChangedFields((prev: any) => ({ ...prev, [order.ID]: undefined }))
            } catch (error) {
                console.error("Error saving changes:", error)
                alert("Có lỗi xảy ra, thử lại sau")
            } finally {
                setIsUpdating(false)
            }
        },
        [changedFields],
    )

    const handleInputChange = useCallback(
        (
            orderId: string,
            field: keyof Order | "product",
            value: string | number,
            productId?: number,
            productField?: keyof Products,
        ) => {
            setOrders((prevOrders) =>
                prevOrders.map((order) => {
                    if (order.ID === orderId) {
                        if (field === "product" && productId !== undefined && productField !== undefined) {
                            // Add null check with optional chaining and fallback
                            const updatedProducts =
                                order.Products?.map((product) => {
                                    if (product.ID === productId) {
                                        const updatedProduct = { ...product, [productField]: value }
                                        return calculateProductFields(updatedProduct)
                                    }
                                    return product
                                }) || []

                            // Track changed product fields
                            setChangedFields((prev) => {
                                const newChangedFields = { ...prev }
                                if (!newChangedFields[orderId]) newChangedFields[orderId] = { order: new Set(), products: {} }
                                if (!newChangedFields[orderId].products[productId])
                                    newChangedFields[orderId].products[productId] = new Set()
                                newChangedFields[orderId].products[productId].add(productField)
                                return newChangedFields
                            })

                            const updatedOrder = { ...order, Products: updatedProducts }
                            if (field === "product" && productField === "GiaBan") {
                                // Add null check with optional chaining and fallback
                                const totalGiaBan = updatedOrder.Products?.reduce((sum, product) => sum + product.GiaBan, 0) || 0
                                updatedOrder.TongTien = (totalGiaBan * (1 - updatedOrder.CK / 100)).toFixed(2)
                            }

                            return updatedOrder
                        } else {
                            // Track changed order fields
                            setChangedFields((prev) => {
                                const newChangedFields = { ...prev }
                                if (!newChangedFields[orderId]) newChangedFields[orderId] = { order: new Set(), products: {} }
                                newChangedFields[orderId].order.add(field as string)
                                return newChangedFields
                            })

                            if (field === "CK" || (field === "product" && productField === "GiaBan")) {
                                const updatedOrder = { ...order }
                                if (field === "CK") {
                                    updatedOrder.CK = Number(value)
                                }
                                // Add null check with optional chaining and fallback
                                const totalGiaBan = updatedOrder.Products?.reduce((sum, product) => sum + product.GiaBan, 0) || 0
                                updatedOrder.TongTien = (totalGiaBan * (1 - updatedOrder.CK / 100)).toFixed(2)
                                return updatedOrder
                            }
                            const updatedOrder = { ...order, [field]: value }
                            return updatedOrder
                        }
                    }
                    return order
                }),
            )
        },
        [calculateProductFields],
    )

    const renderOrderTable = useCallback(
        (
            customerOrders: (Order & { FilteredTotalValue: number; FilteredSupplierDebt: number })[],
            customerName: string,
        ) => {
            return (
                <div key={customerName} className="bg-white rounded shadow  overflow-auto mb-2">
                    <h2 className="text-md font-bold p-1 bg-gradient-to-r from-blue-500 to-blue-800 text-white flex items-center">
                        <User className="inline-block mr-2" />
                        Mã KH: {customerName}
                    </h2>
                    <div style={{ scrollbarWidth: "thin" }} className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-gray-500">
                            <thead className="text-gray-50 bg-gradient-to-r from-blue-500 to-blue-800">
                                <tr>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        STT
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Ng Đi đơn
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Ngày
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Tên NV
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        ID NV
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Domain
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Hạng mục / SP
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Link order
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Ghi chú
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Tình trạng
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        USDT
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Tỉ giá
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        VND
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Người nhận
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Thanh toán
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Link bill
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Ghi chú
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        KTXN
                                    </th>
                                    <th scope="col" className="px-1 py-1.5 border whitespace-nowrap">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b bg-gray-50 font-semibold text-red-600">
                                    <td colSpan={7} className="px-1 py-1.5 border whitespace-nowrap"></td>
                                    <td className="px-1 py-1.5 border whitespace-nowrap">Tổng</td>
                                    <td className="px-1 py-1.5 border whitespace-nowrap">
                                        {customerOrders.reduce((sum, order) => sum + (Number.parseFloat(order.TongTien || "0") || 0), 0)}
                                    </td>
                                    <td className="px-1 py-1.5 border whitespace-nowrap">
                                        {customerOrders.reduce((sum, order) => sum + (Number.parseFloat(order.ThanhToan || "0") || 0), 0)}
                                    </td>
                                    <td className="px-1 py-1.5 border whitespace-nowrap"></td>
                                    <td className="px-1 py-1.5 border whitespace-nowrap">
                                        {customerOrders.reduce((sum, order) => sum + (Number.parseFloat(order.USDT || "0") || 0), 0)}
                                    </td>

                                    <td className="px-1 py-1.5 border whitespace-nowrap"></td>


                                    <td colSpan={4} className="px-1 py-1.5 border whitespace-nowrap"></td>
                                </tr>
                                {customerOrders.map((order, index) => (
                                    <tr key={order.ID} className="border-b hover:bg-gray-100">
                                        <td className="px-1 py-1.5 border whitespace-nowrap">{index + 1}</td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap">{order.ID}</td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap">
                                            {editingOrder === order.ID ? (
                                                <input
                                                    type="text"
                                                    value={order.Ngay ?? ""}
                                                    onChange={(e) => handleInputChange(order.ID, "Ngay", e.target.value)}
                                                    className="pl-1 w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-blue-100"
                                                />
                                            ) : (
                                                order.Ngay
                                            )}
                                        </td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap">
                                            {editingOrder === order.ID ? (
                                                <input
                                                    type="text"
                                                    value={order.MaNV ?? ""}
                                                    onChange={(e) => handleInputChange(order.ID, "MaNV", e.target.value)}
                                                    className="pl-1 w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-blue-100"
                                                />
                                            ) : (
                                                order.MaNV
                                            )}
                                        </td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap">
                                            {editingOrder === order.ID ? (
                                                <input
                                                    type="text"
                                                    value={order.TenNV ?? ""}
                                                    onChange={(e) => handleInputChange(order.ID, "TenNV", e.target.value)}
                                                    className="pl-1 w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-blue-100"
                                                />
                                            ) : (
                                                order.TenNV
                                            )}
                                        </td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap max-w-[100px] overflow-hidden">
                                            {editingOrder === order.ID ? (
                                                <input
                                                    type="text"
                                                    value={order.LinkOrder ?? ""}
                                                    onChange={(e) => handleInputChange(order.ID, "LinkOrder", e.target.value)}
                                                    className="pl-1 w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-blue-100"
                                                />
                                            ) : (
                                                <div className="truncate hover:text-clip hover:overflow-visible" title={order.LinkOrder}>
                                                    {order.LinkOrder}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap">
                                            {editingOrder === order.ID ? (
                                                <input
                                                    type="text"
                                                    value={order.NoiDung ?? ""}
                                                    onChange={(e) => handleInputChange(order.ID, "NoiDung", e.target.value)}
                                                    className="pl-1 w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-blue-100"
                                                />
                                            ) : (
                                                order.NoiDung
                                            )}
                                        </td>

                                        <td className="px-1 py-1.5 border whitespace-nowrap">
                                            {editingOrder === order.ID ? (
                                                <input
                                                    type="text"
                                                    value={order.TinhTrang ?? ""}
                                                    onChange={(e) => handleInputChange(order.ID, "TinhTrang", e.target.value)}
                                                    className="pl-1 w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-blue-100"
                                                />
                                            ) : (
                                                order.TinhTrang
                                            )}
                                        </td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap">{Number(order.TongTien)}</td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap">
                                            {editingOrder === order.ID ? (
                                                <input
                                                    type="text"
                                                    value={order.ThanhToan ?? ""}
                                                    onChange={(e) => handleInputChange(order.ID, "ThanhToan", e.target.value)}
                                                    className="pl-1 w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-blue-100"
                                                />
                                            ) : (
                                                order.ThanhToan
                                            )}
                                        </td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap">
                                            {editingOrder === order.ID ? (
                                                <input
                                                    type="text"
                                                    value={order.TiGia ?? ""}
                                                    onChange={(e) => handleInputChange(order.ID, "TiGia", e.target.value)}
                                                    className="pl-1 w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-blue-100"
                                                />
                                            ) : (
                                                order.TiGia
                                            )}
                                        </td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap">
                                            {editingOrder === order.ID ? (
                                                <input
                                                    type="text"
                                                    value={order.USDT ?? ""}
                                                    onChange={(e) => handleInputChange(order.ID, "USDT", e.target.value)}
                                                    className="pl-1 w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-blue-100"
                                                />
                                            ) : (
                                                order.USDT
                                            )}
                                        </td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap">
                                            {editingOrder === order.ID ? (
                                                <input
                                                    type="text"
                                                    value={order.NguoiNhan ?? ""}
                                                    onChange={(e) => handleInputChange(order.ID, "NguoiNhan", e.target.value)}
                                                    className="pl-1 w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-blue-100"
                                                />
                                            ) : (
                                                order.NguoiNhan
                                            )}
                                        </td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap">
                                            {editingOrder === order.ID ? (
                                                <input
                                                    type="text"
                                                    value={order.Note ?? ""}
                                                    onChange={(e) => handleInputChange(order.ID, "Note", e.target.value)}
                                                    className="pl-1 w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-blue-100"
                                                />
                                            ) : (
                                                order.Note
                                            )}
                                        </td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap">
                                            {editingOrder === order.ID ? (
                                                <input
                                                    type="text"
                                                    value={order.KTXN ?? ""}
                                                    onChange={(e) => handleInputChange(order.ID, "KTXN", e.target.value)}
                                                    className="pl-1 w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-blue-100"
                                                />
                                            ) : (
                                                order.KTXN
                                            )}
                                        </td>
                                        <td className="px-1 py-1.5 border whitespace-nowrap flex">
                                            <button
                                                onClick={() => toggleOrderExpansion(order.ID)}
                                                className="text-blue-600 hover:text-blue-800 mr-2 flex"
                                            >
                                                {expandedOrder === order.ID ? (
                                                    <EyeOff className="w-4 h-4 inline-block mr-1" />
                                                ) : (
                                                    <Eye className="w-4 h-4 inline-block mr-1" />
                                                )}
                                                {expandedOrder === order.ID ? "Ẩn" : "Xem"}
                                            </button>
                                            {/* {editingOrder === order.ID ? (
                                                <button
                                                    onClick={() => handleSave(order)}
                                                    className="text-green-600 hover:text-green-800 flex items-center"
                                                    disabled={isUpdating}
                                                >
                                                    {isUpdating ? (
                                                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                                                    ) : (
                                                        <Save className="w-4 h-4 inline-block mr-1" />
                                                    )}
                                                    Lưu
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleEdit(order.ID)}
                                                    className="text-yellow-600 hover:text-yellow-800 flex"
                                                >
                                                    <Edit className="w-4 h-4 inline-block mr-1" />
                                                    Sửa
                                                </button>
                                            )} */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {customerOrders.map(
                        (order) =>
                            expandedOrder === order.ID && (
                                <ProductTable
                                    key={`product-table-${order.ID}`}
                                    products={order.Products}
                                    orderId={order.ID}
                                    isEditing={editingOrder === order.ID}
                                    onInputChange={handleInputChange}
                                    changedFields={changedFields[order.ID]?.products || {}}
                                />
                            ),
                    )}
                </div>
            )
        },
        [
            expandedOrder,
            editingOrder,
            handleInputChange,
            toggleOrderExpansion,
            handleSave,
            handleEdit,
            changedFields,
            isUpdating,
        ],
    )

    return (
        <div className="">
            <Spin spinning={loading} className="space-y-8 min-h-80">
                {Object.keys(customerOrders).length === 0 && !loading && (
                    <div className="p-6 justify-center space-y-2 flex flex-col items-center rounded">
                        <img src="/images/cargo.png" alt="" className="w-16" />
                        <p className="text-gray-600 text-xs text-center">Không có đơn hàng nào</p>
                    </div>
                )}
                {Object.entries(customerOrders).map(([customerName, orders]) => renderOrderTable(orders, customerName))}
            </Spin>
        </div>
    )
}

