"use client"

import React, { useState, useEffect, useMemo } from "react"
import { message, Modal } from "antd"
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
    FaSearch,
    FaTimes,
} from "react-icons/fa"
import siteApiRequest from "@/apiRequests/site"
import { get, push, ref, set } from "firebase/database"
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

export default function GPTextNN({
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

    useEffect(() => {
        setDataColumn(data)
    }, [data])

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
                        await siteApiRequest.save(nonExistent)
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
                className={`px-3 py-2 mx-1 rounded ${currentPage === 1 ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-600"}`}
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
                    className={`px-3 py-2 mx-1 rounded ${currentPage === i ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-600"}`}
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
                    className={`px-3 py-2 mx-1 rounded ${currentPage === totalPages ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-600"}`}
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

    const handleRowSelect = (site: string) => {
        setSelectedRows((prev) => (prev.includes(site) ? prev.filter((s) => s !== site) : [...prev, site]))
    }

    const selectedData = sortedProducts.filter((product: any) => selectedRows.includes(product.Site))

    const handleAddCart = async () => {
        const id = getUserInfo()?.id
        if (!id) return message.success("Bạn cần đăng nhập để thêm vào giỏ hàng!")

        if (!Array.isArray(selectedData) || selectedData.length === 0) {
            message.success("Không có sản phẩm nào được chọn để thêm vào giỏ hàng.")
            return
        }

        try {
            const userRef = ref(database, `data/${id}`)
            const snapshot = await get(userRef)
            const existingData = snapshot.exists() ? snapshot.val() : {}

            // Tìm KH cuối cùng và kiểm tra status
            const existingKHKeys = Object.keys(existingData)
                .filter((key) => key.startsWith("KH"))
                .sort()
            const lastKH = existingKHKeys[existingKHKeys.length - 1]

            let newKHKey
            if (!lastKH || existingData[lastKH].Status === "wait") {
                // Nếu không có KH nào hoặc KH cuối cùng có status "wait", tạo KH mới
                newKHKey = lastKH ? `KH${Number.parseInt(lastKH.slice(2)) + 1}` : "KH1"
            } else {
                // Nếu KH cuối cùng không phải "wait", thêm sản phẩm vào KH đó
                newKHKey = lastKH
            }

            const existingProducts = existingData[newKHKey]?.Products || []
            const currentProductCount = existingProducts.length

            const newProducts = selectedData.map((item, index) => ({
                ProductID: currentProductCount + index,
                Type: "GP",
                TimeMua: 1,
                TimeBan: 1,
                Site: item.Site,
                Note: "",
                GiaBanGP: item["Giá GP"],
                GiaBanText: item["Giá Footer"],
                GiaBanTextHeader: item["Giá Header"],
                GiaBanTextHome: item["Giá Home"],
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
                TenNB: item.MaNCC || 'NoMaNCC',
                LinkNB: item.NCC || 'NoNCC'
            }))

            // Cập nhật hoặc tạo mới KH
            await set(ref(database, `data/${id}/${newKHKey}`), {
                Products: [...existingProducts, ...newProducts],
                Status: "cart",
            })

            message.success(existingProducts.length > 0 ? "Cập nhật giỏ hàng thành công!" : "Thêm vào giỏ hàng thành công!")
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
                    return value.includes(item[key])
                }
                if (key === "Traffic Tool" || key === "DR" || key === "Giá GP" || key === "Giá Text") {
                    const selectedValue = Number.parseInt(value)
                    const itemValue = Number.parseInt(item[key])
                    return itemValue > selectedValue
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

    return (
        <div className="text-xs min-h-[600px]">
            <div className="m-2 md:ml-[185px] md:m-0">
                {!loading && (
                    <div className="mb-6 relative max-w-7xl">
                        <div className="flex flex-col space-y-2">
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="w-[100px] flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300"
                                >
                                    <FaFilter />
                                    <span>Bộ lọc</span>
                                </button>
                                <textarea
                                    placeholder="Tìm kiếm (phân cách nhiều site bằng dấu phẩy hoặc xuống dòng)"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = "auto"; // Đặt lại chiều cao ban đầu
                                        target.style.height = `${Math.min(target.scrollHeight, 4 * 24)}px`; // Tối đa 5 hàng (24px mỗi hàng)
                                    }}
                                    className="w-full px-4 pt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                                    rows={2}
                                />

                                <button
                                    onClick={handleAddCart}
                                    disabled={selectedRows.length === 0}
                                    className="w-[190px] flex items-center justify-center space-x-2 px-4 py-1 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    <FaShoppingCart />
                                    <span>Thêm vào giỏ hàng ({selectedRows.length})</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <Modal
                    title={<h2 className="text-2xl font-bold text-gray-800">Bộ lọc nâng cao</h2>}
                    onCancel={() => setShowFilters(false)}
                    footer={null}
                    open={showFilters}
                    width={800}
                    className="filter-modal"
                >
                    <div className="p-6 bg-white space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="filter-group">
                                <h3 className="text-md font-semibold text-gray-700 mb-2">Đi Bóng</h3>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-blue-600"
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
                                            className="form-radio text-blue-600"
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
                                <h3 className="text-md font-semibold text-gray-700 mb-2">Đi BET</h3>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-blue-600"
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
                                            className="form-radio text-blue-600"
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
                                <h3 className="text-md font-semibold text-gray-700 mb-2">Site .vn</h3>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-blue-600"
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
                                            className="form-radio text-blue-600"
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
                                <h3 className="text-md font-semibold text-gray-700 mb-2">Tình trạng</h3>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-blue-600"
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
                                            className="form-radio text-blue-600"
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
                                <h3 className="text-md font-semibold text-gray-700 mb-2">Traffic Tool</h3>
                                <select
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                <h3 className="text-md font-semibold text-gray-700 mb-2">Giá GP</h3>
                                <select
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={filters["Giá GP"]}
                                    onChange={(e) => handleFilterChange("Giá GP", e.target.value)}
                                >
                                    <option value="">Chọn lựa chọn</option>
                                    <option value="500">&gt; 500</option>
                                    <option value="1000">&gt; 1,000</option>
                                    <option value="2000">&gt; 2,000</option>
                                    <option value="5000">&gt; 5,000</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="filter-group">
                                <h3 className="text-md font-semibold text-gray-700 mb-2">DR</h3>
                                <select
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={filters["DR"]}
                                    onChange={(e) => handleFilterChange("DR", e.target.value)}
                                >
                                    <option value="">Chọn lựa chọn</option>
                                    <option value="5">&gt; 5</option>
                                    <option value="10">&gt; 10</option>
                                    <option value="20">&gt; 20</option>
                                    <option value="40">&gt; 40</option>
                                    <option value="60">&gt; 60</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <h3 className="text-md font-semibold text-gray-700 mb-2">Giá Text</h3>
                                <select
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={filters["Giá Text"]}
                                    onChange={(e) => handleFilterChange("Giá Text", e.target.value)}
                                >
                                    <option value="">Chọn lựa chọn</option>
                                    <option value="500">&gt; 500</option>
                                    <option value="1000">&gt; 1,000</option>
                                    <option value="2000">&gt; 2,000</option>
                                    <option value="5000">&gt; 5,000</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end space-x-4">
                            <button
                                onClick={resetFilters}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                            >
                                <FaUndo className="inline-block mr-2" />
                                Làm mới
                            </button>
                            <button
                                onClick={applyFilters}
                                className="px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                            >
                                <FaFilter className="inline-block mr-2" />
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
                        <thead className="bg-blue-600 text-md text-white sticky top-0">
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
                            {currentProducts.map((product: any, index: number) => (
                                <tr
                                    key={index}
                                    onClick={() => handleRowSelect(product.Site)}
                                    className={`${index % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-gray-100`}
                                >
                                    <td className="border px-1 py-1 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.includes(product.Site)}
                                            onChange={() => handleRowSelect(product.Site)}
                                            className="form-checkbox h-4 w-4 text-blue-600"
                                        />
                                    </td>
                                    {displayedColumns.map((key) => (
                                        <td key={key} className={`border px-2 py-2 text-center ${getCellWidth(key)}`}>
                                            {key === "Site" ? (
                                                <a
                                                    href={product[key]}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {truncateText(product[key], 30)}
                                                </a>
                                            ) : (
                                                <div className="truncate">
                                                    {iconMap[key] && React.createElement(iconMap[key], { className: "inline mr-1" })}
                                                    {truncateText(product[key], 30)}
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-4 flex justify-center gap-10 items-center">
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
        </div>
    )
}

