"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { ShoppingCart, Save, Trash2 } from "lucide-react"
import getUserInfo from "@/components/userInfo"
import { onValue, ref, update, remove } from "firebase/database"
import { database } from "@/app/firebase/firebase"
import { message } from "antd"

interface Product {
    ProductID: string
    Type: "GP" | "Text Home" | "Text Header" | "Text Footer"
    TimeMua: number
    TimeBan: number
    Site: string
    Note: string
    GiaBanGP: string
    GiaBanText: string
    GiaBanTextHeader: string
    GiaBanTextHome: string
    GiaMuaGP: string
    GiaMuaText: string
    GiaMuaTextHeader: string
    GiaMuaTextHome: string
    HoaHongGP: string
    HoaHongText: string
    BaiViet: string
    Anchor1: string
    Link1: string
    Anchor2: string
    Link2: string
}

interface Order {
    OrderID: string
    Products: Product[]
    Status: string
}

export default function ShoppingCartComponent() {
    const [orders, setOrders] = useState<Order[]>([])
    const [totalPrice, setTotalPrice] = useState(0)
    const [editingCell, setEditingCell] = useState<{ orderId: string; productId: string; field: keyof Product } | null>(
        null,
    )
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})
    const [isPasting, setIsPasting] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const [applyToAll, setApplyToAll] = useState(true)

    const user = getUserInfo()

    useEffect(() => {
        if (!user?.id) return

        const dataRef = ref(database, `data/${user.id}`)
        const unsubscribe = onValue(
            dataRef,
            (snapshot) => {
                const data = snapshot.val()
                if (!data) {
                    setOrders([])
                    return
                }

                const cartOrders = Object.entries(data)
                    .filter(([key, value]: [string, any]) => key.startsWith("KH") && value.Status === "cart")
                    .map(([orderId, orderData]: [string, any]) => ({
                        OrderID: orderId,
                        Products: orderData.Products
                            ? Object.entries(orderData.Products).map(([productId, product]: [string, any]) => ({
                                ...product,
                                ProductID: productId,
                            }))
                            : [],
                        Status: orderData.Status,
                    }))

                setOrders(cartOrders)
            },
            (error) => {
                console.error("Error reading cart data:", error)
                message.error("Không thể tải dữ liệu giỏ hàng")
            },
        )

        return () => unsubscribe()
    }, [user?.id])

    const validateProducts = (products: Product[]): boolean => {
        const errors: { [key: string]: string } = {}
        let isValid = true

        products.forEach((product) => {
            if (product.Type === "GP" && !product.BaiViet.trim()) {
                errors[`${product.ProductID}-BaiViet`] = "Bài viết là bắt buộc cho loại GP"
                isValid = false
            } else if (product.Type !== "GP" && (!product.Anchor1.trim() || !product.Link1.trim())) {
                if (!product.Anchor1.trim()) {
                    errors[`${product.ProductID}-Anchor1`] = "Anchor 1 là bắt buộc"
                }
                if (!product.Link1.trim()) {
                    errors[`${product.ProductID}-Link1`] = "Link 1 là bắt buộc"
                }
                isValid = false
            }
        })

        setValidationErrors(errors)
        return isValid
    }

    const handleConfirmOrder = async () => {
        if (!user?.id) {
            message.error("Không thể xác nhận đơn hàng. Vui lòng đăng nhập lại.")
            return
        }

        const allProducts = orders.flatMap((order) => order.Products)
        if (!validateProducts(allProducts)) {
            message.error("Vui lòng kiểm tra lại các trường bắt buộc")
            return
        }

        const updates: { [key: string]: any } = {}

        orders.forEach((order) => {
            updates[`data/${user.id}/${order.OrderID}/Status`] = "wait"
            order.Products.forEach((product) => {
                Object.keys(product).forEach((key) => {
                    updates[`data/${user.id}/${order.OrderID}/Products/${product.ProductID}/${key}`] =
                        product[key as keyof Product]
                })
            })
        })

        try {
            await update(ref(database), updates)
            message.success("Xác nhận đơn hàng thành công!")
            setValidationErrors({})
            setOrders([]) // Clear the orders after confirmation
        } catch (error) {
            console.error("Error updating order:", error)
            message.error("Có lỗi xảy ra khi cập nhật đơn hàng. Vui lòng thử lại.")
        }
    }

    useEffect(() => {
        const newTotalPrice = orders.reduce(
            (sum, order) =>
                sum +
                order.Products.reduce((orderSum, product) => {
                    const price = Number.parseFloat(getGiaBan(product).replace(",", ".")) || 0
                    return orderSum + price
                }, 0),
            0,
        )
        setTotalPrice(newTotalPrice)
    }, [orders])

    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus()
        }
    }, [editingCell])

    const handleCellClick = (orderId: string, productId: string, field: keyof Product) => {
        setEditingCell({ orderId, productId, field })
    }

    const handleChange = (orderId: string, productId: string, field: keyof Product, value: string) => {
        setOrders((prevOrders) => {
            const newOrders = prevOrders.map((order) => {
                if (order.OrderID === orderId || (field === "Type" && applyToAll)) {
                    return {
                        ...order,
                        Products: order.Products.map((product) => {
                            if (product.ProductID === productId || (field === "Type" && applyToAll)) {
                                return { ...product, [field]: value }
                            }
                            return product
                        }),
                    }
                }
                return order
            })
            return newOrders
        })

        if (validationErrors[`${productId}-${field}`]) {
            setValidationErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors[`${productId}-${field}`]
                return newErrors
            })
        }

        // Automatically blur the select element after a change
        if (field === "Type") {
            setTimeout(() => {
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur()
                }
            }, 0)
        }
    }

    const handleBlur = () => {
        setEditingCell(null)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            setEditingCell(null)
        }
    }

    const handleDelete = async (orderId: string, productId: string) => {
        if (!user?.id) return
        console.log("Deleting product:", productId)

        try {
            const itemRef = ref(database, `data/${user.id}/${orderId}/Products/${productId}`)
            await remove(itemRef)
            message.success("Xóa sản phẩm thành công!")

            setOrders((prevOrders) =>
                prevOrders
                    .map((order) => {
                        if (order.OrderID === orderId) {
                            return {
                                ...order,
                                Products: order.Products.filter((product) => product.ProductID !== productId),
                            }
                        }
                        return order
                    })
                    .filter((order) => order.Products.length > 0),
            )
        } catch (error) {
            console.error("Error deleting product:", error)
            message.error("Có lỗi xảy ra khi xóa sản phẩm. Vui lòng thử lại.")
        }
    }

    const handlePaste = (
        e: React.ClipboardEvent<HTMLInputElement>,
        orderId: string,
        productId: string,
        field: keyof Product,
    ) => {
        e.preventDefault()
        const pastedText = e.clipboardData.getData("text")

        const rows = pastedText
            .trim()
            .split(/[\r\n]+/)
            .map((row) => row.trim())
            .filter(Boolean)

        const hasHorizontalData = rows.some((row) => row.includes("\t"))

        if (hasHorizontalData) {
            handleHorizontalPaste(rows, orderId, productId, field)
        } else {
            handleVerticalPaste(rows, orderId, productId, field)
        }
    }

    const handleHorizontalPaste = (rows: string[], orderId: string, productId: string, startField: keyof Product) => {
        const editableFields: (keyof Product)[] = ["BaiViet", "Anchor1", "Link1", "Anchor2", "Link2"]

        setOrders((prevOrders) => {
            const newOrders = [...prevOrders]

            rows.forEach((row, rowIndex) => {
                const values = row.split("\t").map((val) => val.trim())
                const currentProductIndex = newOrders
                    .flatMap((order) => order.Products)
                    .findIndex((product) => product.ProductID === productId)

                if (currentProductIndex + rowIndex >= 0) {
                    const targetProduct = newOrders.flatMap((order) => order.Products)[currentProductIndex + rowIndex]
                    if (targetProduct) {
                        const targetOrder = newOrders.find((order) =>
                            order.Products.some((p) => p.ProductID === targetProduct.ProductID),
                        )

                        if (targetOrder) {
                            const productIndex = targetOrder.Products.findIndex((p) => p.ProductID === targetProduct.ProductID)

                            values.forEach((value, colIndex) => {
                                const fieldIndex = editableFields.indexOf(startField)
                                const targetField = editableFields[fieldIndex + colIndex]

                                if (targetField && !isReadOnlyField(targetField)) {
                                    targetOrder.Products[productIndex] = {
                                        ...targetOrder.Products[productIndex],
                                        [targetField]: value,
                                    }
                                }
                            })
                        }
                    }
                }
            })

            return newOrders
        })
    }

    const handleVerticalPaste = (rows: string[], orderId: string, productId: string, field: keyof Product) => {
        setOrders((prevOrders) => {
            const newOrders = [...prevOrders]
            const allProducts = newOrders.flatMap((order) => order.Products)
            const currentProductIndex = allProducts.findIndex((product) => product.ProductID === productId)

            rows.forEach((value, index) => {
                const targetIndex = currentProductIndex + index
                if (targetIndex < allProducts.length) {
                    const targetProduct = allProducts[targetIndex]
                    const targetOrder = newOrders.find((order) =>
                        order.Products.some((p) => p.ProductID === targetProduct.ProductID),
                    )

                    if (targetOrder) {
                        const productIndex = targetOrder.Products.findIndex((p) => p.ProductID === targetProduct.ProductID)
                        if (!isReadOnlyField(field)) {
                            targetOrder.Products[productIndex] = {
                                ...targetOrder.Products[productIndex],
                                [field]: value,
                            }
                        }
                    }
                }
            })

            return newOrders
        })
    }

    const isReadOnlyField = (field: keyof Product): boolean => {
        return ["Site", "GiaBanGP", "GiaBanText", "GiaBanTextHeader", "GiaBanTextHome"].includes(field)
    }

    const renderCell = (order: Order, product: Product, field: keyof Product) => {
        const isEditing =
            editingCell?.orderId === order.OrderID &&
            editingCell?.productId === product.ProductID &&
            editingCell?.field === field

        const hasError = !!validationErrors[`${product.ProductID}-${field}`]

        const cellContent =
            field === "Type" ? (
                <select
                    value={product[field]}
                    onChange={(e) => handleChange(order.OrderID, product.ProductID, field, e.target.value)}
                    onBlur={handleBlur}
                    className={`w-full h-[32px] bg-transparent border-none focus:outline-none focus:ring-1 ${hasError ? "focus:ring-red-500" : "focus:ring-blue-500"
                        }`}
                >
                    {["GP", "Text Home", "Text Header", "Text Footer"].map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>
            ) : isEditing && !isReadOnlyField(field) ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={product[field] as string}
                    onChange={(e) => handleChange(order.OrderID, product.ProductID, field, e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onPaste={(e) => handlePaste(e, order.OrderID, product.ProductID, field)}
                    className={`text-center w-full h-[32px] px-1 bg-transparent border-none focus:outline-none focus:ring-1 ${hasError ? "focus:ring-red-500" : "focus:ring-blue-500"
                        }`}
                />
            ) : (
                <span
                    className={`block w-full truncate text-xs ${hasError ? "text-red-500" : ""}`}
                    title={product[field] as string}
                >
                    {product[field]}
                </span>
            )

        return (
            <div
                className={`w-full h-full min-h-[32px] flex items-center px-1 ${isReadOnlyField(field) ? "cursor-default" : "cursor-pointer"
                    } ${hasError ? "bg-red-100" : ""}`}
                onClick={() =>
                    !isReadOnlyField(field) && field !== "Type" && handleCellClick(order.OrderID, product.ProductID, field)
                }
            >
                {cellContent}
                {hasError && <span className="text-red-500 text-[9px] ml-1 flex-shrink-0">*</span>}
            </div>
        )
    }

    const getGiaBan = (product: Product) => {
        let price = "0"
        switch (product.Type) {
            case "GP":
                price = product.GiaBanGP
                break
            case "Text Home":
                price = product.GiaBanTextHome
                break
            case "Text Header":
                price = product.GiaBanTextHeader
                break
            case "Text Footer":
                price = product.GiaBanText
                break
        }
        return price
    }

    return (
        <div className="container my-auto mx-auto px-4 py-2">
            <div className="mb-2 flex items-center">
                <label className="flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={applyToAll}
                        onChange={(e) => setApplyToAll(e.target.checked)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Áp dụng Loại cho tất cả sản phẩm</span>
                </label>
            </div>
            <div className="w-full">
                <div className="w-full bg-white shadow-md rounded overflow-hidden">
                    <div className="max-h-[70vh] overflow-auto relative scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <div className="text-md flex items-center justify-between p-1 bg-gradient-to-r from-blue-500 to-blue-800 text-white flex items-center">
                            <h2 className="font-bold text-md">
                                <ShoppingCart className="inline-block mr-2 " />
                                Giỏ Hàng
                            </h2>
                            <span className="text-gray-50 text-xs">
                                ({orders.reduce((sum, order) => sum + order.Products.length, 0)} sản phẩm)
                            </span>
                        </div>
                        <table className="w-full table-fixed border-collapse">
                            <thead className="sticky top-0 z-20">
                                <tr className="bg-gradient-to-r from-blue-500 to-blue-800 text-gray-50">
                                    <th className="sticky left-0 z-30 w-36 px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider border border-gray-300 bg-gradient-to-r from-blue-500 to-blue-600">
                                        Site
                                    </th>
                                    <th className="sticky left-36 z-30 w-24 px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider border border-gray-300 bg-gradient-to-r from-blue-600 to-blue-700">
                                        Loại
                                    </th>
                                    <th className="w-24 px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider border border-gray-300">
                                        Giá bán
                                    </th>
                                    <th className="w-48 px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider border border-gray-300">
                                        Bài viết
                                    </th>
                                    <th className="w-28 px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider border border-gray-300">
                                        Anchor 1
                                    </th>
                                    <th className="w-36 px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider border border-gray-300">
                                        Link 1
                                    </th>
                                    <th className="w-28 px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider border border-gray-300">
                                        Anchor 2
                                    </th>
                                    <th className="w-36 px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider border border-gray-300">
                                        Link 2
                                    </th>
                                    <th className="w-20 px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider border border-gray-300">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {orders.length > 0 ? (
                                    orders.map((order) =>
                                        order.Products.map((product) => (
                                            <tr key={product.ProductID} className="hover:bg-gray-50">
                                                <td className="sticky left-0 z-20 max-w-[144px] text-center text-xs text-gray-900 border border-gray-300 bg-white">
                                                    {renderCell(order, product, "Site")}
                                                </td>
                                                <td className="sticky left-36 z-20 max-w-[96px] text-center text-xs text-gray-900 border border-gray-300 bg-white">
                                                    {renderCell(order, product, "Type")}
                                                </td>
                                                <td className="max-w-[96px] text-center text-xs text-gray-900 border border-gray-300">
                                                    {getGiaBan(product)}
                                                </td>
                                                <td className="max-w-[192px] text-center text-xs text-gray-900 border border-gray-300">
                                                    {renderCell(order, product, "BaiViet")}
                                                </td>
                                                <td className="max-w-[112px] text-center text-xs text-gray-900 border border-gray-300">
                                                    {renderCell(order, product, "Anchor1")}
                                                </td>
                                                <td className="max-w-[144px] text-center text-xs text-gray-900 border border-gray-300">
                                                    {renderCell(order, product, "Link1")}
                                                </td>
                                                <td className="max-w-[112px] text-center text-xs text-gray-900 border border-gray-300">
                                                    {renderCell(order, product, "Anchor2")}
                                                </td>
                                                <td className="max-w-[144px] text-center text-xs text-gray-900 border border-gray-300">
                                                    {renderCell(order, product, "Link2")}
                                                </td>
                                                <td className="w-20 whitespace-nowrap text-center text-xs font-semibold border border-gray-300">
                                                    <button
                                                        onClick={() => handleDelete(order.OrderID, product.ProductID)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )),
                                    )
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="text-center h-20 w-full">
                                            Không có đơn hàng
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="mt-2 flex justify-end items-center space-x-4 p-2 bg-gray-100 border-t border-gray-300 rounded-b">
                    <p className="text-sm font-semibold">
                        Tổng tiền: <span className="text-lg text-red-600">{totalPrice.toFixed(2).replace(".", ",")} Xu</span>
                    </p>
                    <button
                        onClick={handleConfirmOrder}
                        className="text-white text-sm py-1.5 px-4 rounded text-gray-50 bg-gradient-to-r from-blue-500 to-blue-800 hover:from-blue-800 hover:to-blue-500 transition-all duration-300 flex items-center"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Xác nhận đơn
                    </button>
                </div>
            </div>
        </div>
    )
}

