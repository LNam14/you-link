"use client"

import React, { useState, useEffect, useMemo } from "react"
import { message, Badge, Tooltip } from "antd"
import { debounce } from "lodash"
import {
    FaSort,
    FaLink,
    FaFutbol,
    FaDice,
    FaTicketAlt,
    FaCalendarAlt,
    FaChartLine,
    FaKeyboard,
    FaTrafficLight,
    FaClipboardList,
    FaDollarSign,
    FaAlignLeft,
    FaClock,
    FaFootballBall,
    FaHeading,
    FaChevronLeft,
    FaChevronRight,
    FaFilter,
    FaUndo,
    FaShoppingCart,
    FaCheck,
} from "react-icons/fa"
import { X } from 'lucide-react'
import { get, ref, set, onValue } from "firebase/database"
import { database } from "@/app/firebase/firebase"
import getUserInfo from "@/components/userInfo"

const iconMap: any = {
    site: FaLink,
    soccer: FaFutbol,
    bet: FaDice,
    topic: FaTicketAlt,
    dateUpdated: FaCalendarAlt,
    dr: FaChartLine,
    keywords: FaKeyboard,
    trafficTool: FaTrafficLight,
    note: FaClipboardList,
    priceGB: FaDollarSign,
    lineGB: FaAlignLeft,
    timeGB: FaClock,
    textFooterMonth: FaFootballBall,
    timeText: FaClock,
    textKM: FaAlignLeft,
    textHome: FaAlignLeft,
    textHeader: FaHeading,
}

export default function DataSite({
    fetchData,
    data,
    loading,
}: { fetchData: any; data: any; loading: any }): React.JSX.Element {
    const [searchTerm, setSearchTerm] = useState("")
    const [sortField, setSortField] = useState<string | null>(null)
    const [sortOrder, setSortOrder] = useState("asc")
    const [currentPage, setCurrentPage] = useState(1)
    const [productsPerPage, setProductPerPage] = useState(15)
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState<any>({})
    const [selectedRows, setSelectedRows] = useState<string[]>([])
    const [dataColumn, setDataColumn] = useState<any[]>([])
    const [notFoundSites, setNotFoundSites] = useState<string[]>([])
    const [cartItems, setCartItems] = useState<any[]>([])
    const [showCartPreview, setShowCartPreview] = useState(false)
    const [addedToCartAnimation, setAddedToCartAnimation] = useState(false)

    const user = getUserInfo()

    useEffect(() => {
        setDataColumn(data)
    }, [data])

    // Fetch cart items to know what's already in the cart
    useEffect(() => {
        if (!user?.id) return

        const cartRef = ref(database, `data/${user.id}/Products`)
        const unsubscribe = onValue(cartRef, (snapshot) => {
            if (snapshot.exists()) {
                const products = snapshot.val()
                if (Array.isArray(products)) {
                    const cartProducts = products.filter((product: any) => product.Status === "cart")
                    setCartItems(cartProducts)
                }
            } else {
                setCartItems([])
            }
        })

        return () => unsubscribe()
    }, [user?.id])

    const extractDomain = (url: string): string => {
        return url
            .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
            .split("/")[0]
            .toLowerCase()
    }

    const isValidDomain = (domain: string): boolean => {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
        return domainRegex.test(domain)
    }

    const debouncedSearch = useMemo(
        () =>
            debounce(async (searchValue: string) => {
                if (searchValue.trim() === "") {
                    setDataColumn(data)
                } else {
                    const terms = searchValue
                        .split(/[\s,\n]+/)
                        .map((term) => extractDomain(term.trim()).toLowerCase())
                        .filter(Boolean)

                    // Tạo map domain -> item để tìm nhanh
                    const domainToItem: Record<string, any> = {}
                    data.forEach((item: any) => {
                        const domain = extractDomain(item.Site).toLowerCase()
                        domainToItem[domain] = item
                    })

                    // Lấy kết quả đúng thứ tự nhập vào
                    const results = terms
                        .map((term) => domainToItem[term])
                        .filter(Boolean)

                    setDataColumn(results)

                    // Các site không tồn tại
                    const nonExistent = terms.filter(
                        (term) => isValidDomain(term) && !domainToItem[term],
                    )

                    if (nonExistent.length > 0) {
                        setNotFoundSites(nonExistent)
                    } else {
                        setNotFoundSites([])
                    }
                }
            }, 300),
        [data],
    )

    useEffect(() => {
        debouncedSearch(searchTerm)
        return () => {
            debouncedSearch.cancel()
        }
    }, [searchTerm, debouncedSearch])

    const filteredProducts = useMemo(() => {
        return dataColumn
    }, [dataColumn])

    const sortedProducts = useMemo(() => {
        if (!sortField) return filteredProducts
        return [...filteredProducts].sort((a, b) => {
            if (a[sortField] < b[sortField]) return sortOrder === "asc" ? -1 : 1
            if (a[sortField] > b[sortField]) return sortOrder === "asc" ? 1 : -1
            return 0
        })
    }, [filteredProducts, sortField, sortOrder])

    const indexOfLastProduct = currentPage * productsPerPage
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage
    const currentProducts = sortedProducts.slice(indexOfFirstProduct, indexOfLastProduct)

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            setSortOrder("asc")
        }
    }

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

    const totalPages = Math.ceil(sortedProducts.length / productsPerPage)

    const renderPaginationButtons = () => {
        const buttons = []

        buttons.push(
            <button
                key="first"
                onClick={() => paginate(1)}
                className={`px-3 py-2 mx-1 rounded ${currentPage === 1 ? "bg-blue-600 text-white border border-blue-600" : "bg-white text-blue-600 border border-blue-600"}`}
            >
                1
            </button>,
        )

        if (currentPage > 4) {
            buttons.push(
                <span key="ellipsis1" className="px-3 py-2 mx-1">
                    ...
                </span>,
            )
        }

        const start = Math.max(2, currentPage - 2)
        const end = Math.min(totalPages - 1, start + 4)

        for (let i = start; i <= end; i++) {
            buttons.push(
                <button
                    key={i}
                    onClick={() => paginate(i)}
                    className={`px-3 py-2 mx-1 rounded ${currentPage === i ? "bg-blue-600 text-white border border-blue-600" : "bg-white text-blue-600 border border-blue-600"}`}
                >
                    {i}
                </button>,
            )
        }

        if (currentPage < totalPages - 3) {
            buttons.push(
                <span key="ellipsis2" className="px-3 py-2 mx-1">
                    ...
                </span>,
            )
        }

        if (totalPages > 1) {
            buttons.push(
                <button
                    key="last"
                    onClick={() => paginate(totalPages)}
                    className={`px-3 py-2 mx-1 rounded ${currentPage === totalPages ? "bg-blue-600 text-white border border-blue-600" : "bg-white text-blue-600 border border-blue-600"}`}
                >
                    {totalPages}
                </button>,
            )
        }

        return buttons
    }

    const getCellWidth = (key: string) => {
        if (key === "Site") {
            return "min-w-[195px]"
        } else if (key === "Chủ đề" || key === "Ngày cập nhật") {
            return "min-w-[100px] max-w-[100px]"
        } else if (key === "Time Text" || key === "Text KM" || key === "Text Home" || key === "Text Header") {
            return "min-w-[60px] max-w-[60px]"
        }
        return "max-w-[80px] min-w-[80px]"
    }

    const truncateText = (text: string, maxLength: number) => {
        if (text && text.length > maxLength) {
            return `${text.substring(0, maxLength)}...`
        }
        return text
    }

    // Check if a site is already in the cart
    const isInCart = (site: string) => {
        return cartItems.some((item) => item.Site === site)
    }

    const handleRowSelect = (site: string) => {
        setSelectedRows((prev) => (prev.includes(site) ? prev.filter((s) => s !== site) : [...prev, site]))
    }

    // Check if a price is valid (not "Ngưng", not 0, and is a number)
    const isValidPrice = (price: any): boolean => {
        if (price === "Ngưng" || price === 0 || price === "0") return false
        return !isNaN(Number(price)) && Number(price) > 0
    }

    // Get the first valid price type for a product
    const getValidPriceType = (product: any): string | null => {
        if (isValidPrice(product["Giá GP"])) return "GP"
        if (isValidPrice(product["Giá Footer"])) return "Text"
        if (isValidPrice(product["Giá Header"])) return "TextHeader"
        if (isValidPrice(product["Giá Home"])) return "TextHome"
        return null
    }

    const KHMua = getUserInfo()?.username
    const handleAddCart = async () => {
        const id = getUserInfo()?.id
        if (!id) return message.success("Bạn cần đăng nhập để thêm vào giỏ hàng!")

        // Get the selected data at the time of the function call
        const selectedData = sortedProducts.filter((product: any) => selectedRows.includes(product.Site))

        if (!Array.isArray(selectedData) || selectedData.length === 0) {
            message.success("Không có sản phẩm nào được chọn để thêm vào giỏ hàng.")
            return
        }

        try {
            // Kiểm tra xem đã có sản phẩm trong giỏ hàng chưa
            const cartRef = ref(database, `data/${id}/Products`)
            const cartSnapshot = await get(cartRef)
            let existingProducts = []

            if (cartSnapshot.exists()) {
                existingProducts = cartSnapshot.val() || []
            }

            // Tạo mảng sản phẩm mới
            const newProducts = []
            const suspendedSites = []

            for (const item of selectedData) {
                // Check if the current type has a valid price
                const defaultType = "GP"
                const validType = getValidPriceType(item)

                if (!validType) {
                    // If no valid price type exists, add to suspended sites list
                    suspendedSites.push(item.Site)
                    continue
                }

                // Add product with valid price type
                newProducts.push({
                    ProductID: existingProducts.length + newProducts.length,
                    Loai: validType,
                    Site: item.Site,
                    Note: item["Ghi chú"],
                    GiaBanGP: isValidPrice(item["Giá GP"]) ? item["Giá GP"] : 0,
                    GiaBanText: isValidPrice(item["Giá Footer"]) ? item["Giá Footer"] : 0,
                    GiaBanTextHeader: isValidPrice(item["Giá Header"]) ? item["Giá Header"] : 0,
                    GiaBanTextHome: isValidPrice(item["Giá Home"]) ? item["Giá Home"] : 0,
                    GiaMuaGP: item.GiaMuaGP,
                    GiaMuaText: item.GiaMuaText,
                    GiaMuaTextHeader: item.GiaMuaTextHeader,
                    GiaMuaTextHome: item.GiaMuaTextHome,
                    HoaHongGP: item.HoaHongGP,
                    HoaHongText: item.HoaHongText,
                    BaiViet: "",
                    Anchor1: "",
                    Link1: "",
                    Anchor2: "",
                    Link2: "",
                    TenNCC: item.MaNCC || "NoMaNCC",
                    TeleNCC: item.NCC || "NoNCC",
                    TenKH: KHMua,
                    Status: "Đang xử lý",
                })
            }

            if (suspendedSites.length > 0) {
                message.warning(
                    `Các site sau tạm ngưng: ${suspendedSites.join(", ")}. Vui lòng chọn site khác.`
                )
            }

            if (newProducts.length === 0) {
                if (suspendedSites.length > 0) {
                    return // Already showed warning above
                }
                message.error("Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.")
                return
            }

            // Kết hợp sản phẩm hiện có với sản phẩm mới
            const updatedProducts = [...existingProducts, ...newProducts]

            // Lưu trực tiếp vào data/{id}/products
            await set(ref(database, `data/${id}/Products`), updatedProducts)

            // Show animation
            setAddedToCartAnimation(true)
            setTimeout(() => setAddedToCartAnimation(false), 1500)

            message.success(`Đã thêm ${newProducts.length} sản phẩm vào giỏ hàng thành công!`)
            console.log("Added to cart:", updatedProducts)
            setSelectedRows([]) // Xóa lựa chọn sau khi thêm thành công
        } catch (error) {
            console.error("Lỗi khi thêm vào giỏ hàng:", error)
            message.error("Có lỗi xảy ra khi thêm vào giỏ hàng. Vui lòng thử lại.")
        }
    }

    const displayedColumns = Object.keys(data[0] || {}).filter(
        (key) =>
            key !== "NCC" &&
            key !== "MaNCC" &&
            key !== "GiaMuaGP" &&
            key !== "GiaMuaText" &&
            key !== "HoaHongGP" &&
            key !== "Ghi chú" &&
            key !== "HoaHongText" &&
            key !== "GiaMuaText" &&
            key !== "GiaMuaTextHome" &&
            key !== "GiaMuaTextHeader",
    )

    const handleFilterChange = (field: string, value: any) => {
        setFilters((prev: any) => ({
            ...prev,
            [field]: value,
        }))
    }

    const applyFilters = () => {
        const filteredData = data.filter((item: any) => {
            return Object.entries(filters).every(([key, value]: [string, any]) => {
                if (!value) return true
                
                // Đi Bóng filter
                if (key === "Đi Bóng") {
                    return item[key] && item[key].toLowerCase() === value.toLowerCase()
                }
                
                // Đi BET filter
                if (key === "Đi BET") {
                    return item[key] && item[key].toLowerCase() === value.toLowerCase()
                }
                
                // Site .vn filter
                if (key === "Site") {
                    const domain = extractDomain(item[key])
                    return domain.endsWith(".vn") === (value === "yes")
                }
                
                // Chủ đề filter
                if (key === "Chủ đề") {
                    return item[key] && item[key].toLowerCase() === value.toLowerCase()
                }
                
                // Giá GP filter
                if (key === "Giá GP") {
                    const selectedValue = Number.parseInt(value)
                    const itemValue = Number.parseInt(item[key])
                    
                    if (isNaN(itemValue) || itemValue <= 0) return false
                    
                    return itemValue < selectedValue
                }
                
                
                // Traffic Tool filter
                if (key === "Traffic Tool") {
                    const selectedValue = Number.parseInt(value)
                    const itemValue = Number.parseInt(item[key])
                    
                    if (isNaN(itemValue) || itemValue <= 0) return false
                    
                    return itemValue > selectedValue
                }
                
                // DR filter
                if (key === "DR") {
                    const selectedValue = Number.parseInt(value)
                    const itemValue = Number.parseInt(item[key])
                    
                    if (isNaN(itemValue) || itemValue <= 0) return false
                    
                    const drRanges = [5, 10, 20, 40, 60]
                    const currentIndex = drRanges.indexOf(selectedValue)
                    
                    if (currentIndex === 0) {
                        // < 5: chỉ hiện < 5
                        return itemValue < selectedValue
                    } else {
                        // >= 5 và < 10, >= 10 và < 20, etc.
                        const lowerBound = drRanges[currentIndex - 1]
                        return itemValue >= lowerBound && itemValue < selectedValue
                    }
                }
                
                // Giá Text filter (maps to Giá Footer in data)
                if (key === "Giá Text") {
                    const selectedValue = Number.parseInt(value)
                    const itemValue = Number.parseInt(item["Giá Footer"])
                    
                    if (isNaN(itemValue) || itemValue <= 0) return false
                    
                    const priceRanges = [20, 40, 80, 160]
                    const currentIndex = priceRanges.indexOf(selectedValue)
                    
                    if (currentIndex === 0) {
                        // < 20: chỉ hiện < 20
                        return itemValue < selectedValue
                    } else {
                        // >= 20 và < 40, >= 40 và < 80, etc.
                        const lowerBound = priceRanges[currentIndex - 1]
                        return itemValue >= lowerBound && itemValue < selectedValue
                    }
                }

                return true
            })
        })
        setDataColumn(filteredData)
        setShowFilters(false)
    }

    const resetFilters = () => {
        setFilters({})
        fetchData()
        setShowFilters(false)
    }

    // Get available price types for a product
    const getAvailablePriceTypes = (product: any) => {
        const types = []
        if (isValidPrice(product["Giá GP"])) types.push("GP")
        if (isValidPrice(product["Giá Footer"])) types.push("Text")
        if (isValidPrice(product["Giá Header"])) types.push("TextHeader")
        if (isValidPrice(product["Giá Home"])) types.push("TextHome")
        return types
    }

    return (
        <div className="text-sm min-h-[600px]">
            <div className="mt-4 mb-2">
                {!loading && (
                    <div className="relative px-4 sm:px-6 mx-auto max-w-7xl">
                        <div className="flex flex-col space-y-4">
                            <div className="flex flex-col md:flex-row gap-2">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="h-11 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-[10px] hover:from-blue-600 hover:to-indigo-700 transition-all duration-300"
                                >
                                    <FaFilter className="w-4 h-4" />
                                    <span>Bộ lọc</span>
                                </button>

                                <div className="flex-1">
                                    <textarea
                                        placeholder="Tìm kiếm (phân cách nhiều site bằng dấu phẩy hoặc xuống dòng)"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onInput={(e) => {
                                            const target = e.target as HTMLTextAreaElement
                                            target.style.height = "auto" // Reset chiều cao để tránh lỗi khi thu nhỏ lại
                                            const maxRows = 5 // Giới hạn tối đa 5 hàng
                                            const lineHeight = 24 // Chiều cao của mỗi dòng (điều chỉnh nếu cần)
                                            const newHeight = Math.min(target.scrollHeight, maxRows * lineHeight)
                                            target.style.height = `${newHeight}px`
                                        }}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none shadow-sm"
                                        rows={1}
                                    />
                                </div>

                                <div className="relative">
                                    <button
                                        onClick={handleAddCart}
                                        disabled={selectedRows.length === 0}
                                        className="h-11 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-[10px] hover:from-orange-600 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:from-orange-500 disabled:hover:to-pink-600"
                                        onMouseEnter={() => setShowCartPreview(true)}
                                        onMouseLeave={() => setShowCartPreview(false)}
                                    >
                                        <FaShoppingCart className={`w-4 h-4 ${addedToCartAnimation ? "animate-bounce" : ""}`} />
                                        <span>Thêm vào giỏ hàng ({selectedRows.length})</span>
                                    </button>

                                    {/* Cart Preview Tooltip */}
                                    {showCartPreview && selectedRows.length > 0 && (
                                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl z-50 border border-gray-200 p-3 text-xs">
                                            <div className="font-medium text-gray-700 mb-2">Các site đã chọn:</div>
                                            <div className="max-h-40 overflow-y-auto">
                                                {selectedRows.map((site, index) => {
                                                    const product = sortedProducts.find(p => p.Site === site)
                                                    const availableTypes = product ? getAvailablePriceTypes(product) : []
                                                    const hasValidPrice = availableTypes.length > 0

                                                    return (
                                                        <div key={index} className="flex items-center py-1 border-b border-gray-100 last:border-0">
                                                            {hasValidPrice ? (
                                                                <>
                                                                    <FaCheck className="text-green-500 mr-2 flex-shrink-0" />
                                                                    <span className="truncate">{site}</span>
                                                                    {availableTypes.length > 0 && (
                                                                        <span className="ml-auto text-xs text-gray-500">
                                                                            {availableTypes.join(', ')}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <X className="text-red-500 w-4 h-4 mr-2 flex-shrink-0" />
                                                                    <span className="truncate text-red-500">{site}</span>
                                                                    <span className="ml-auto text-xs text-red-500">Tạm ngưng</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Custom Filter Panel */}
                {showFilters && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowFilters(false)
                            }
                        }}
                    >
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FaFilter className="w-6 h-6" />
                                        <h2 className="text-2xl font-bold">Bộ lọc nâng cao</h2>
                                    </div>
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="text-white hover:text-gray-200 transition-colors duration-200 p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Filter Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                                <div className="space-y-6">
                                    {/* Row 1: Các bộ lọc quan trọng nhất - 4 cột */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {/* Đi Bóng */}
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                                <FaFutbol className="w-4 h-4 text-orange-500" />
                                                Đi Bóng
                                            </h3>
                                            <div className="flex gap-3">
                                                <label className="flex items-center cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                        name="diBong"
                                                        value="có"
                                                        checked={filters["Đi Bóng"] === "có"}
                                                        onChange={(e) => handleFilterChange("Đi Bóng", e.target.value)}
                                                    />
                                                    <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                                                        Có
                                                    </span>
                                                </label>
                                                <label className="flex items-center cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                        name="diBong"
                                                        value="ko"
                                                        checked={filters["Đi Bóng"] === "ko"}
                                                        onChange={(e) => handleFilterChange("Đi Bóng", e.target.value)}
                                                    />
                                                    <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                                                        Không
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Đi BET */}
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                                <FaDice className="w-4 h-4 text-purple-500" />
                                                Đi BET
                                            </h3>
                                            <div className="flex gap-3">
                                                <label className="flex items-center cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                        name="diBET"
                                                        value="có"
                                                        checked={filters["Đi BET"] === "có"}
                                                        onChange={(e) => handleFilterChange("Đi BET", e.target.value)}
                                                    />
                                                    <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                                                        Có
                                                    </span>
                                                </label>
                                                <label className="flex items-center cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                        name="diBET"
                                                        value="ko"
                                                        checked={filters["Đi BET"] === "ko"}
                                                        onChange={(e) => handleFilterChange("Đi BET", e.target.value)}
                                                    />
                                                    <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                                                        Không
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Site .vn */}
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                                <FaLink className="w-4 h-4 text-green-500" />
                                                Site .vn
                                            </h3>
                                            <div className="flex gap-3">
                                                <label className="flex items-center cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                        name="siteVN"
                                                        value="yes"
                                                        checked={filters["Site"] === "yes"}
                                                        onChange={(e) => handleFilterChange("Site", e.target.value)}
                                                    />
                                                    <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                                                        Có
                                                    </span>
                                                </label>
                                                <label className="flex items-center cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                        name="siteVN"
                                                        value="no"
                                                        checked={filters["Site"] === "no"}
                                                        onChange={(e) => handleFilterChange("Site", e.target.value)}
                                                    />
                                                    <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                                                        Không
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Chủ đề */}
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                                <FaTicketAlt className="w-4 h-4 text-pink-500" />
                                                Chủ đề
                                            </h3>
                                            <select
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                                                value={filters["Chủ đề"] || ""}
                                                onChange={(e) => handleFilterChange("Chủ đề", e.target.value)}
                                            >
                                                <option value="">Chọn chủ đề</option>
                                                <option value="18+">18+</option>
                                                <option value="Agency">Agency</option>
                                                <option value="Ẩm Thực">Ẩm Thực</option>
                                                <option value="Bất Động Sản">Bất Động Sản</option>
                                                <option value="Công Nghệ">Công Nghệ</option>
                                                <option value="Công Nghiệp">Công Nghiệp</option>
                                                <option value="Du Lịch">Du Lịch</option>
                                                <option value="Động Vật">Động Vật</option>
                                                <option value="Đời Sống">Đời Sống</option>
                                                <option value="Edu">Edu</option>
                                                <option value="Game">Game</option>
                                                <option value="Game Làm Giàu">Game Làm Giàu</option>
                                                <option value="GOV">GOV</option>
                                                <option value="Luật">Luật</option>
                                                <option value="Nông nghiệp">Nông nghiệp</option>
                                                <option value="Nước ngoài">Nước ngoài</option>
                                                <option value="Phim">Phim</option>
                                                <option value="Tài Chính">Tài Chính</option>
                                                <option value="Thể thao">Thể thao</option>
                                                <option value="Thời trang">Thời trang</option>
                                                <option value="Tổng Hợp">Tổng Hợp</option>
                                                <option value="Truyện">Truyện</option>
                                                <option value="Việc Làm">Việc Làm</option>
                                                <option value="Xây Dựng">Xây Dựng</option>
                                                <option value="Xe">Xe</option>
                                                <option value="Xổ Số">Xổ Số</option>
                                                <option value="Y tế">Y tế</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Row 2: Các bộ lọc giá và số liệu - 4 cột */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {/* Traffic Tool */}
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                                <FaTrafficLight className="w-4 h-4 text-red-500" />
                                                Traffic Tool
                                            </h3>
                                            <select
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                                                value={filters["Traffic Tool"] || ""}
                                                onChange={(e) => handleFilterChange("Traffic Tool", e.target.value)}
                                            >
                                                <option value="">Chọn lựa chọn</option>
                                                <option value="1000">&gt; 1,000</option>
                                                <option value="10000">&gt; 10,000</option>
                                                <option value="100000">&gt; 100,000</option>
                                            </select>
                                        </div>

                                        {/* Giá GP */}
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                                <FaDollarSign className="w-4 h-4 text-green-500" />
                                                Giá GP
                                            </h3>
                                            <select
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                                                value={filters["Giá GP"] || ""}
                                                onChange={(e) => handleFilterChange("Giá GP", e.target.value)}
                                            >
                                                <option value="">Chọn lựa chọn</option>
                                                <option value="20">&lt; 20</option>
                                                <option value="40">&lt; 40</option>
                                                <option value="80">&lt; 80</option>
                                                <option value="160">&lt; 160</option>
                                            </select>
                                        </div>

                                        {/* DR */}
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                                <FaChartLine className="w-4 h-4 text-indigo-500" />
                                                DR
                                            </h3>
                                            <select
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                                                value={filters["DR"] || ""}
                                                onChange={(e) => handleFilterChange("DR", e.target.value)}
                                            >
                                                <option value="">Chọn lựa chọn</option>
                                                <option value="5">&lt; 5</option>
                                                <option value="10">&lt; 10</option>
                                                <option value="20">&lt; 20</option>
                                                <option value="40">&lt; 40</option>
                                                <option value="60">&lt; 60</option>
                                            </select>
                                        </div>

                                        {/* Giá Text */}
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                                <FaAlignLeft className="w-4 h-4 text-orange-500" />
                                                Giá Text
                                            </h3>
                                            <select
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                                                value={filters["Giá Text"] || ""}
                                                onChange={(e) => handleFilterChange("Giá Text", e.target.value)}
                                            >
                                                <option value="">Chọn lựa chọn</option>
                                                <option value="20">&lt; 20</option>
                                                <option value="40">&lt; 40</option>
                                                <option value="80">&lt; 80</option>
                                                <option value="160">&lt; 160</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-gray-600">
                                        {Object.keys(filters).filter(key => filters[key]).length > 0 && (
                                            <span>
                                                Đang áp dụng {Object.keys(filters).filter(key => filters[key]).length} bộ lọc
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={resetFilters}
                                            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2 font-medium"
                                        >
                                            <FaUndo className="w-4 h-4" />
                                            Làm mới
                                        </button>
                                        <button
                                            onClick={applyFilters}
                                            className="px-6 py-3 rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
                                        >
                                            <FaFilter className="w-4 h-4" />
                                            Áp dụng bộ lọc
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {loading ? (
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div className="overflow-x-auto" style={{ scrollbarWidth: "thin", scrollBehavior: "smooth" }}>
                    <table className="w-full bg-white rounded-lg overflow-hidden">
                        <thead className="bg-blue-600 text-xs text-white sticky top-0">
                            <tr>
                                <th className="border border-blue-500 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.length === currentProducts.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedRows(currentProducts.map((product: any) => product.Site))
                                            } else {
                                                setSelectedRows([])
                                            }
                                        }}
                                        className="form-checkbox h-4 w-4 text-blue-600"
                                    />
                                </th>
                                {displayedColumns.map((key) => (
                                    <th key={key} className={`border border-blue-500 px-2 py-2 text-center ${getCellWidth(key)}`}>
                                        <div className="flex items-center justify-center">
                                            {key}
                                            <button onClick={() => handleSort(key)} className="ml-1">
                                                <FaSort />
                                            </button>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {currentProducts.map((product: any, index: number) => {
                                const isSelected = selectedRows.includes(product.Site)
                                const isAlreadyInCart = isInCart(product.Site)
                                const hasValidPrice = getValidPriceType(product) !== null
                                const availableTypes = getAvailablePriceTypes(product)

                                return (
                                    <tr
                                        key={index}
                                        onClick={() => handleRowSelect(product.Site)}
                                        className={`
                      ${index % 2 === 0 ? "bg-gray-50" : "bg-white"} 
                      hover:bg-gray-100
                      ${isSelected ? "bg-blue-50 hover:bg-blue-100" : ""}
                      ${isAlreadyInCart ? "bg-green-50 hover:bg-green-100" : ""}
                      ${!hasValidPrice ? "bg-red-50 hover:bg-red-100" : ""}
                      transition-colors duration-200
                    `}
                                    >
                                        <td className="border px-1 py-1 text-center">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleRowSelect(product.Site)}
                                                    onClick={e => e.stopPropagation()}
                                                    className="form-checkbox h-4 w-4 text-blue-600"
                                                />
                                                {isAlreadyInCart && (
                                                    <Tooltip title="Đã có trong giỏ hàng">
                                                        <div className="absolute -top-1 -right-1">
                                                            <Badge status="success" />
                                                        </div>
                                                    </Tooltip>
                                                )}
                                                {!hasValidPrice && (
                                                    <Tooltip title="Site tạm ngưng">
                                                        <div className="absolute -top-1 -right-1">
                                                            <Badge status="error" />
                                                        </div>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </td>
                                        {displayedColumns.map((key) => (
                                            <td key={key} className={`border px-2 py-2 text-xs text-center ${getCellWidth(key)}`}>
                                                {key === "Site" ? (
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <a
                                                            href={product[key]}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {truncateText(product[key], 30)}
                                                        </a>
                                                        {isAlreadyInCart && (
                                                            <Tooltip title="Đã có trong giỏ hàng">
                                                                <FaShoppingCart className="text-green-500 text-xs" />
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="truncate">
                                                        {iconMap[key] && React.createElement(iconMap[key], { className: "inline mr-1" })}
                                                        {key.startsWith("Giá") && product[key] === "Ngưng" ? (
                                                            <span className="text-red-500">Ngưng</span>
                                                        ) : (
                                                            truncateText(product[key], 30)
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    <div className="mt-4 mb-4 flex justify-center gap-10 text-xs items-center">
                        <div className="flex items-center space-x-2">
                            <span>Hiển thị</span>
                            <select
                                className="text-black border py-1 px-1 rounded"
                                value={productsPerPage}
                                onChange={(e) => setProductPerPage(Number.parseInt(e.target.value))}
                                style={{ width: 70 }}
                            >
                                <option value={15}>15</option>
                                <option value={30}>30</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span>trên tổng số {sortedProducts.length} kết quả</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-2 py-2 rounded bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                <FaChevronLeft />
                            </button>
                            {renderPaginationButtons()}
                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-2 py-2 rounded bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                <FaChevronRight />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {notFoundSites.length > 0 && (
                <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4" role="message.success">
                    <p className="font-bold">Không tìm thấy các site sau:</p>
                    <ul className="list-disc list-inside">
                        {notFoundSites.map((site, index) => (
                            <li key={index}>{site}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Selected Items Floating Panel */}
            {selectedRows.length > 0 && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-lg shadow-xl border border-orange-300 p-4 z-50 max-w-5xl w-full">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium text-white text-lg">Đã chọn {selectedRows.length} site</h3>
                        <button onClick={() => setSelectedRows([])} className="text-white hover:text-orange-200">
                            <FaUndo className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {selectedRows.map((site, index) => {
                            const product = sortedProducts.find(p => p.Site === site)
                            const availableTypes = product ? getAvailablePriceTypes(product) : []
                            const hasValidPrice = availableTypes.length > 0

                            return (
                                <div
                                    key={index}
                                    className={`text-sm px-3 py-1.5 rounded-full flex items-center backdrop-blur-sm ${hasValidPrice
                                        ? "bg-white bg-opacity-20 text-white"
                                        : "bg-red-500 bg-opacity-20 text-white"
                                        }`}
                                >
                                    <span className="truncate max-w-[200px]">{site}</span>
                                    {hasValidPrice && availableTypes.length > 0 && (
                                        <span className="ml-2 text-xs bg-white bg-opacity-20 px-1.5 py-0.5 rounded-full">
                                            {availableTypes.join(', ')}
                                        </span>
                                    )}
                                    {!hasValidPrice && (
                                        <span className="ml-2 text-xs bg-red-600 bg-opacity-40 px-1.5 py-0.5 rounded-full">
                                            Tạm ngưng
                                        </span>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedRows((prev) => prev.filter((s) => s !== site))
                                        }}
                                        className="ml-2 text-white hover:text-orange-200"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
