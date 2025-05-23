"use client"

import React, { useState, useEffect, useMemo } from "react"
import { message, Modal, Badge, Tooltip } from "antd"
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

export default function GPTextVN({
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
        if (!user) return

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
    }, [user])

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
                        .map((term) => extractDomain(term.trim()))
                        .filter(Boolean)

                    const results = data.filter((item: any) => terms.some((term) => extractDomain(item.Site).includes(term)))

                    setDataColumn(results)

                    const nonExistent = terms.filter(
                        (term) => isValidDomain(term) && !data.some((item: any) => extractDomain(item.Site).includes(term)),
                    )

                    if (nonExistent.length > 0) {
                        setNotFoundSites(nonExistent)
                    }
                }
            }, 300),
        [data],
    )

    useEffect(() => {
        debouncedSearch(searchTerm)
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
                if (key === "Đi Bóng" || key === "Đi BET") {
                    console.log(value, item[key])
                    return item[key].toLowerCase() === value.toLowerCase()
                }
                if (key === "Site") {
                    const domain = extractDomain(item[key])
                    return domain.endsWith(".vn") === (value === "yes")
                }
                if (key === "Tình trạng") {
                    return value === "bình thường"
                        ? item[key].toLowerCase() === "bình thường"
                        : item[key].toLowerCase() !== "bình thường"
                }
                if (key === "Chủ đề") {
                    return item[key].toLowerCase() === value.toLowerCase()
                }
                if (key === "Giá GP" || key === "Giá Footer") {
                    const selectedValue = Number.parseInt(value)
                    const itemValue = Number.parseInt(item[key])
                    const priceRanges = [20, 40, 80, 160]
                    const currentIndex = priceRanges.indexOf(selectedValue)

                    if (currentIndex === 0) {
                        return itemValue < selectedValue
                    } else {
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

                <Modal
                    title={
                        <div className="flex items-center gap-2 text-gray-900">
                            <FaFilter className="text-orange-500" />
                            <h2 className="text-xl font-bold">Bộ lọc nâng cao</h2>
                        </div>
                    }
                    onCancel={() => setShowFilters(false)}
                    footer={null}
                    open={showFilters}
                    width={800}
                    className="filter-modal"
                    closeIcon={<span className="text-gray-500 hover:text-gray-700 text-xl">&times;</span>}
                >
                    <div className="p-6 bg-white space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="filter-group">
                                <h3 className="text-xs font-semibold text-gray-700 mb-2">Đi Bóng</h3>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-orange-500 focus:ring-orange-500"
                                            name="diBong"
                                            value="có"
                                            checked={filters["Đi Bóng"] === "có"}
                                            onChange={(e) => handleFilterChange("Đi Bóng", e.target.value)}
                                        />
                                        <span className="ml-2">Có</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-orange-500 focus:ring-orange-500"
                                            name="diBong"
                                            value="ko"
                                            checked={filters["Đi Bóng"] === "ko"}
                                            onChange={(e) => handleFilterChange("Đi Bóng", e.target.value)}
                                        />
                                        <span className="ml-2">Không</span>
                                    </label>
                                </div>
                            </div>
                            <div className="filter-group">
                                <h3 className="text-xs font-semibold text-gray-700 mb-2">Đi BET</h3>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-orange-500 focus:ring-orange-500"
                                            name="diBET"
                                            value="có"
                                            checked={filters["Đi BET"] === "có"}
                                            onChange={(e) => handleFilterChange("Đi BET", e.target.value)}
                                        />
                                        <span className="ml-2">Có</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-orange-500 focus:ring-orange-500"
                                            name="diBET"
                                            value="ko"
                                            checked={filters["Đi BET"] === "ko"}
                                            onChange={(e) => handleFilterChange("Đi BET", e.target.value)}
                                        />
                                        <span className="ml-2">Không</span>
                                    </label>
                                </div>
                            </div>
                            <div className="filter-group">
                                <h3 className="text-xs font-semibold text-gray-700 mb-2">Site .vn</h3>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-orange-500 focus:ring-orange-500"
                                            name="siteVN"
                                            value="yes"
                                            checked={filters["Site"] === "yes"}
                                            onChange={(e) => handleFilterChange("Site", e.target.value)}
                                        />
                                        <span className="ml-2">Có</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-orange-500 focus:ring-orange-500"
                                            name="siteVN"
                                            value="no"
                                            checked={filters["Site"] === "no"}
                                            onChange={(e) => handleFilterChange("Site", e.target.value)}
                                        />
                                        <span className="ml-2">Không</span>
                                    </label>
                                </div>
                            </div>
                            <div className="filter-group">
                                <h3 className="text-xs font-semibold text-gray-700 mb-2">Tình trạng</h3>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-orange-500 focus:ring-orange-500"
                                            name="StatusVN"
                                            value="bình thường"
                                            checked={filters["Tình trạng"] === "bình thường"}
                                            onChange={(e) => handleFilterChange("Tình trạng", e.target.value)}
                                        />
                                        <span className="ml-2">Bình thường</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-orange-500 focus:ring-orange-500"
                                            name="StatusVN"
                                            value="other"
                                            checked={filters["Tình trạng"] !== "bình thường"}
                                            onChange={(e) => handleFilterChange("Tình trạng", e.target.value)}
                                        />
                                        <span className="ml-2">Khác</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="filter-group">
                                <h3 className="text-xs font-semibold text-gray-700 mb-2">Traffic Tool</h3>
                                <select
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    value={filters["Traffic Tool"]}
                                    onChange={(e) => handleFilterChange("Traffic Tool", e.target.value)}
                                >
                                    <option value="">Chọn lựa chọn</option>
                                    <option value="1000">&gt; 1,000</option>
                                    <option value="10000">&gt; 10,000</option>
                                    <option value="100000">&gt; 100,000</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <h3 className="text-xs font-semibold text-gray-700 mb-2">Giá GP</h3>
                                <select
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    value={filters["Giá GP"]}
                                    onChange={(e) => handleFilterChange("Giá GP", e.target.value)}
                                >
                                    <option value="">Chọn lựa chọn</option>
                                    <option value="20">&lt; 20</option>
                                    <option value="40">&lt; 40</option>
                                    <option value="80">&lt; 80</option>
                                    <option value="160">&lt; 160</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="filter-group">
                                <h3 className="text-xs font-semibold text-gray-700 mb-2">Chủ đề</h3>
                                <select
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    value={filters["Chủ đề"] || ""}
                                    onChange={(e) => handleFilterChange("Chủ đề", e.target.value)}
                                >
                                    <option value="">Chọn chủ đề</option>
                                    <option value="Thể thao">Thể thao</option>
                                    <option value="Giải trí">Giải trí</option>
                                    <option value="Công nghệ">Công nghệ</option>
                                    <option value="Kinh doanh">Kinh doanh</option>
                                    <option value="Giáo dục">Giáo dục</option>
                                    <option value="Sức khỏe">Sức khỏe</option>
                                    <option value="Du lịch">Du lịch</option>
                                    <option value="Ẩm thực">Ẩm thực</option>
                                    <option value="Thời trang">Thời trang</option>
                                    <option value="Làm đẹp">Làm đẹp</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <h3 className="text-xs font-semibold text-gray-700 mb-2">DR</h3>
                                <select
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    value={filters["DR"]}
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
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="filter-group">
                                <h3 className="text-xs font-semibold text-gray-700 mb-2">Giá Text</h3>
                                <select
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    value={filters["Giá Text"]}
                                    onChange={(e) => handleFilterChange("Giá Text", e.target.value)}
                                >
                                    <option value="">Chọn lựa chọn</option>
                                    <option value="20">&gt; 20</option>
                                    <option value="40">&gt; 40</option>
                                    <option value="80">&gt; 80</option>
                                    <option value="160">&gt; 160</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end space-x-4">
                            <button
                                onClick={resetFilters}
                                className="px-5 py-3 border border-gray-200 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all duration-300 flex items-center gap-2"
                            >
                                <FaUndo className="w-4 h-4" />
                                Làm mới
                            </button>
                            <button
                                onClick={applyFilters}
                                className="px-5 py-3 rounded-lg text-white bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                <FaFilter className="w-4 h-4" />
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </Modal>
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
