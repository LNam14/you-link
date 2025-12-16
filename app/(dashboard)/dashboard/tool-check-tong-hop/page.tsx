"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import type React from "react"
import { useExtensionData } from "@/hooks/useExtensionData"
import { useAuth } from "@/hooks/useAuth"
import { useHeader } from "@/app/(dashboard)/contexts/HeaderContext"

import HotTableComponent, { type Column } from "@/components/table/HotTable"
import type Handsontable from "handsontable"
import type { HotTableRef } from "@handsontable/react-wrapper"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import {
    Search,
    RefreshCw,
    Filter,
    ChevronLeft,
    ChevronRight,
    Inbox,
    Globe,
    User,
} from "lucide-react"

interface ExtensionData {
    Extension: string
    NCC: string
    Domains: string
    Note: string
    DR: string
    DA: string
    TF: string
    Spam: string
    Traffic: string
    LinkOut: string
    GiaBanGP: string
    GiaBanText: string
    MaSP: string
    TenNCC: string
    GiaMuaGP: string
    GiaMuaText: string
    HHGP: string
    HHText: string
    KeGP: string
    KeText: string
}

type SearchType = "Site" | "NCC"
type PriceType = "GP" | "Text"

type RendererFunction = (
    instance: Handsontable,
    td: HTMLTableCellElement,
    row: number,
    col: number,
    prop: string | number,
    value: any,
    cellProperties?: Handsontable.CellMeta,
) => HTMLTableCellElement

export default function PageBody() {
    const [filteredData, setFilteredData] = useState<ExtensionData[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [hasSearched, setHasSearched] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [searchCompleted, setSearchCompleted] = useState(false)
    const [selectedPriceType, setSelectedPriceType] = useState<PriceType>("GP")
    const [selectedSearchType, setSelectedSearchType] = useState<SearchType>("Site")
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const mainTableRef = useRef<HotTableRef>(null)
    const selectionAnchorRef = useRef<{ row: number; col: number } | null>(null)

    // Sử dụng hook để fetch và cache dữ liệu - tự động fetch khi mount
    const { data: extensionData, loading, refreshing, refetch, isStale } = useExtensionData(true)
    const allData = extensionData || []

    // Lấy thông tin user từ auth hook
    const { user: userInfo } = useAuth()

    // Sử dụng HeaderContext để set header
    const { setHeaderData } = useHeader()

    // Fetch dữ liệu mới khi user click refresh
    const fetchData = useCallback(async () => {
        await refetch(true)
    }, [refetch])

    // Tự động hiển thị tất cả dữ liệu khi đã load xong
    useEffect(() => {
        if (allData && allData.length > 0 && !loading && !refreshing && !hasSearched) {
            if (applySearchAndFiltersRef.current) {
                applySearchAndFiltersRef.current("")
            }
        }
    }, [allData, loading, refreshing, hasSearched])

    // Set header với title và custom controls
    useEffect(() => {
        setHeaderData({
            title: "Tool Check Tổng Hợp",
            subTitle: "Tìm kiếm và kiểm tra thông tin extension, giá cả và nhà cung cấp",
            customControls: {
                searchType: {
                    value: selectedSearchType,
                    onSearchTypeChange: (type) => setSelectedSearchType(type as SearchType),
                },
            },
            refreshButton: true,
        })
    }, [selectedSearchType, loading, refreshing, isStale, setHeaderData, fetchData])

    // Normalize URL for comparison
    const normalizeUrl = useCallback((url: string): string => {
        if (!url || typeof url !== "string") return ""
        let normalized = url.replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//, "")
        normalized = normalized.replace(/^www\./, "")
        normalized = normalized.replace(/\/.*$/, "")
        normalized = normalized.replace(/:\d+$/, "")
        normalized = normalized.toLowerCase().trim()
        return normalized
    }, [])

    // Use ref to store latest applySearchAndFilters function
    const applySearchAndFiltersRef = useRef<((searchValue: string) => void) | null>(null)

    // Combined function to apply both search and filters
    const applySearchAndFilters = useCallback((searchValue: string) => {
        const dataSource = allData

        if (!dataSource || dataSource.length === 0) {
            setFilteredData([])
            setHasSearched(false)
            setSearchCompleted(false)
            setIsSearching(false)
            return
        }

        let dataToProcess: ExtensionData[] = []
        const hasSearchTerm = searchValue && searchValue.trim().length > 0

        if (!hasSearchTerm) {
            dataToProcess = [...dataSource]
        } else {
            const searchTerms = searchValue.split(/[,\n\s]+/).filter((term) => term.trim() !== "")
            if (searchTerms.length === 0) {
                setFilteredData([])
                setHasSearched(false)
                setSearchCompleted(false)
                setIsSearching(false)
                return
            }

            let validTerms: string[] = []
            if (selectedSearchType === "Site") {
                validTerms = searchTerms.map((term) => normalizeUrl(term.trim())).filter((term) => term !== "")
            } else {
                validTerms = searchTerms
                    .filter((term) => term.trim().length > 0)
                    .map((term) => term.trim().toUpperCase())
            }

            if (validTerms.length === 0) {
                setFilteredData([])
                setHasSearched(true)
                setSearchCompleted(true)
                setIsSearching(false)
                return
            }

            // Collect matching items
            validTerms.forEach((term) => {
                const matchingItems = dataSource.filter((item) => {
                    if (selectedSearchType === "Site") {
                        const normalizedDomain = normalizeUrl(item.Domains || "")
                        return normalizedDomain === term
                    } else {
                        const normalizedTerm = term.toUpperCase().trim()
                        if (!normalizedTerm) return false

                        const normalizedNCC = String(item.NCC || "").toUpperCase().trim()
                        const normalizedTenNCC = String(item.TenNCC || "").toUpperCase().trim()

                        const matchNCC = normalizedNCC && (
                            normalizedNCC === normalizedTerm ||
                            normalizedNCC.startsWith(normalizedTerm)
                        )
                        const matchTenNCC = normalizedTenNCC && (
                            normalizedTenNCC === normalizedTerm ||
                            normalizedTenNCC.startsWith(normalizedTerm)
                        )

                        return matchNCC || matchTenNCC
                    }
                })
                dataToProcess.push(...matchingItems)
            })

            // Remove duplicates
            const seen = new Set<string>()
            dataToProcess = dataToProcess.filter((item) => {
                const key = selectedSearchType === "Site"
                    ? normalizeUrl(item.Domains || "")
                    : `${item.NCC}-${item.TenNCC}`
                if (seen.has(key)) return false
                seen.add(key)
                return true
            })
        }

        setFilteredData(dataToProcess)
        setHasSearched(true)
        setSearchCompleted(true)
        setIsSearching(false)
        setCurrentPage(1)
    }, [allData, selectedSearchType, normalizeUrl])

    // Update ref when applySearchAndFilters changes
    useEffect(() => {
        applySearchAndFiltersRef.current = applySearchAndFilters
    }, [applySearchAndFilters])

    // Manual search handler
    const handleSearchClick = useCallback(async () => {
        if (searchTerm.trim()) {
            setIsSearching(true)
            setHasSearched(true)
            setSearchCompleted(false)
            applySearchAndFilters(searchTerm)
        } else {
            applySearchAndFilters("")
        }
    }, [searchTerm, applySearchAndFilters])

    // Handle Enter key press in search input
    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
                return
            } else {
                e.preventDefault()
                handleSearchClick()
            }
        }
    }, [handleSearchClick])

    // Handle data update after fetch
    useEffect(() => {
        if (hasSearched && allData && allData.length > 0) {
            if (applySearchAndFiltersRef.current) {
                applySearchAndFiltersRef.current(searchTerm)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allData, hasSearched])

    // Generate columns
    const generateColumns = useCallback(() => {
        const priceColumn = selectedPriceType === "GP" ? "GP" : "Text"
        const giaBanColumn = `GiaBan${priceColumn}`
        const giaMuaColumn = `GiaMua${priceColumn}`
        const hhColumn = `HH${priceColumn}`
        const keColumn = `Ke${priceColumn}`

        const baseColumns: Column[] = [
            {
                title: "Đuôi",
                data: "Extension",
                width: 60,
                className: "htMiddle text-center",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.textAlign = "center"
                    td.title = value || ""
                    td.textContent = value || ""
                    return td
                }) as RendererFunction,
            },
            {
                title: "NCC",
                data: "NCC",
                width: 100,
                className: "htMiddle text-center",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.textAlign = "center"
                    td.title = value || ""
                    td.textContent = value || ""
                    return td
                }) as RendererFunction,
            },
            {
                title: "Domains",
                data: "Domains",
                width: 150,
                className: "htMiddle text-center",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.textAlign = "center"
                    td.title = value || ""
                    td.textContent = value || ""
                    return td
                }) as RendererFunction,
            },
            {
                title: "DR",
                data: "DR",
                width: 50,
                className: "htMiddle text-center",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.textAlign = "center"
                    td.title = value || ""
                    td.textContent = value || ""
                    return td
                }) as RendererFunction,
            },
            {
                title: "DA",
                data: "DA",
                width: 50,
                className: "htMiddle text-center",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.textAlign = "center"
                    td.title = value || ""
                    td.textContent = value || ""
                    return td
                }) as RendererFunction,
            },
            {
                title: "TF",
                data: "TF",
                width: 50,
                className: "htMiddle text-center",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.textAlign = "center"
                    td.title = value || ""
                    td.textContent = value || ""
                    return td
                }) as RendererFunction,
            },
            {
                title: "Traffic",
                data: "Traffic",
                width: 80,
                className: "htMiddle text-center",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.textAlign = "center"
                    td.title = value || ""
                    td.textContent = value || ""
                    return td
                }) as RendererFunction,
            },
            {
                title: "Bán",
                data: giaBanColumn,
                width: 60,
                className: "htMiddle",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.textAlign = "center"
                    if (row === 0) {
                        td.style.setProperty("color", "red", "important")
                        td.style.fontWeight = "600"
                    }
                    td.title = value || ""
                    td.textContent = value || ""
                    return td
                }) as RendererFunction,
            },
            {
                title: "Mua",
                data: giaMuaColumn,
                width: 60,
                className: "htMiddle",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.textAlign = "center"
                    if (row === 0) {
                        td.style.setProperty("color", "red", "important")
                        td.style.fontWeight = "600"
                    }
                    td.title = value || ""
                    td.textContent = value || ""
                    return td
                }) as RendererFunction,
            },
            {
                title: "HH",
                data: hhColumn,
                width: 50,
                className: "htMiddle",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.textAlign = "center"
                    if (row === 0) {
                        td.style.setProperty("color", "red", "important")
                        td.style.fontWeight = "600"
                    }
                    td.title = value || ""
                    td.textContent = value || ""
                    return td
                }) as RendererFunction,
            },
            {
                title: "Kê thêm",
                data: keColumn,
                width: 50,
                className: "htMiddle",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.textAlign = "center"
                    if (row === 0) {
                        td.style.setProperty("color", "red", "important")
                        td.style.fontWeight = "600"
                    }
                    td.title = value || ""
                    td.textContent = value || ""
                    return td
                }) as RendererFunction,
            },
            {
                title: "Tên NCC",
                data: "TenNCC",
                width: 120,
                className: "htMiddle",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.title = value || ""
                    td.textContent = value || ""
                    td.style.textAlign = "center"
                    return td
                }) as RendererFunction,
            },
            {
                title: "Mã SP",
                data: "MaSP",
                width: 100,
                className: "htMiddle",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.title = value || ""
                    td.textContent = value || ""
                    td.style.textAlign = "center"
                    return td
                }) as RendererFunction,
            },
        ]

        return baseColumns
    }, [selectedPriceType])

    // Calculate summary
    const calculateSummary = useCallback((data: ExtensionData[]) => {
        if (!data || data.length === 0) return null

        const priceColumn = selectedPriceType === "GP" ? "GP" : "Text"
        const giaBanColumn = `GiaBan${priceColumn}` as keyof ExtensionData
        const giaMuaColumn = `GiaMua${priceColumn}` as keyof ExtensionData
        const hhColumn = `HH${priceColumn}` as keyof ExtensionData
        const keColumn = `Ke${priceColumn}` as keyof ExtensionData

        const summary: any = {
            Extension: "Tổng",
            [giaBanColumn]: "0",
            [giaMuaColumn]: "0",
            [hhColumn]: "0",
            [keColumn]: "0",
        }

        const getNumericValue = (value: any): number => {
            if (value === null || value === undefined) return 0
            const strValue = value.toString().trim()
            const parsed = Number.parseFloat(strValue)
            return isNaN(parsed) ? 0 : parsed
        }

        data.forEach((item) => {
            const giaBanValue = getNumericValue(item[giaBanColumn])
            const giaMuaValue = getNumericValue(item[giaMuaColumn])
            const hhValue = getNumericValue(item[hhColumn])
            const keValue = getNumericValue(item[keColumn])

            summary[giaBanColumn] = (
                Number.parseFloat(summary[giaBanColumn]?.toString() || "0") + giaBanValue
            ).toString()
            summary[giaMuaColumn] = (
                Number.parseFloat(summary[giaMuaColumn]?.toString() || "0") + giaMuaValue
            ).toString()
            summary[hhColumn] = (
                Number.parseFloat(summary[hhColumn]?.toString() || "0") + hhValue
            ).toString()
            summary[keColumn] = (
                Number.parseFloat(summary[keColumn]?.toString() || "0") + keValue
            ).toString()
        })

        return summary as ExtensionData
    }, [selectedPriceType])

    // Memoize columns
    const generatedColumns = useMemo(() => generateColumns(), [generateColumns])

    // Memoize columns mapping
    const mappedColumns = useMemo(() => generatedColumns.map((col) => ({
        data: col.data,
        title: col.title,
        type: "text",
        readOnly: true,
        width: col.width,
        className: col.className,
        renderer: col.renderer as any,
    })), [generatedColumns])

    // Render table
    const renderHotTable = useCallback((data: ExtensionData[], tableKey: string) => {
        if (!data || data.length === 0) return null

        const summaryRow = calculateSummary(data)
        const dataWithSummary = summaryRow ? [summaryRow, ...data] : [...data]

        return (
            <div className="overflow-x-auto w-full">
                <HotTableComponent
                    ref={mainTableRef}
                    key={`${tableKey}-${selectedPriceType}`}
                    data={dataWithSummary}
                    columns={mappedColumns}
                    height="auto"
                    width="100%"
                    licenseKey="non-commercial-and-evaluation"
                    stretchH="all"
                    autoWrapRow={true}
                    rowHeaders={false}
                    colHeaders={true}
                    copyPaste={true}
                    columnSorting={false}
                    autoColumnSize={false}
                    preventOverflow="horizontal"
                    renderAllRows={false}
                    viewportRowRenderingOffset={20}
                    manualColumnResize={true}
                    manualRowResize={true}
                    className="custom-table"
                    themeName="ht-theme-main"
                    outsideClickDeselects={false}
                    fillHandle={true}
                    selectionMode="multiple"
                    readOnly={true}
                    showSummaryRowBorder={true}
                />
            </div>
        )
    }, [mappedColumns, selectedPriceType, calculateSummary])

    // Calculate pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedData = useMemo(() => {
        return filteredData.slice(startIndex, endIndex)
    }, [filteredData, startIndex, endIndex])

    // Reset to page 1 when filteredData changes
    useEffect(() => {
        const maxPage = Math.ceil(filteredData.length / itemsPerPage)
        if (filteredData.length > 0 && currentPage > maxPage) {
            setCurrentPage(1)
        }
    }, [filteredData.length, itemsPerPage, currentPage])

    useEffect(() => {
        setCurrentPage(1)
    }, [itemsPerPage])

    // Pagination handlers
    const goToPage = useCallback((page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [totalPages])

    const goToPreviousPage = useCallback(() => {
        if (currentPage > 1) {
            goToPage(currentPage - 1)
        }
    }, [currentPage, goToPage])

    const goToNextPage = useCallback(() => {
        if (currentPage < totalPages) {
            goToPage(currentPage + 1)
        }
    }, [currentPage, totalPages, goToPage])

    const showLoading = isSearching || loading || refreshing

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 relative">
            {showLoading && <LoadingSpinner />}

            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-blue-100">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4">
                        <div className="relative">
                            <textarea
                                placeholder={
                                    selectedSearchType === "Site"
                                        ? "Tìm kiếm domain (hỗ trợ mọi định dạng: example.com, https://example.com, www.example.com)\n\nNhấn Enter để tìm kiếm, Ctrl+Enter hoặc Shift+Enter để xuống dòng"
                                        : "Tìm kiếm NCC (nhập mã NCC hoặc tên NCC, ví dụ: N1, ABC, XYZ...)\n\nNhấn Enter để tìm kiếm, Ctrl+Enter hoặc Shift+Enter để xuống dòng"
                                }
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                rows={5}
                                className="w-full px-3 sm:px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-20 sm:pr-24 text-sm sm:text-base text-gray-700 placeholder-gray-400 bg-white shadow-sm resize-none overflow-y-auto"
                            />
                            <div className="absolute right-2 sm:right-3 top-2 sm:top-3 flex items-center gap-1 sm:gap-2">
                                <button
                                    onClick={handleSearchClick}
                                    disabled={loading || refreshing || isSearching}
                                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md font-medium text-xs sm:text-sm"
                                >
                                    {isSearching ? (
                                        <>
                                            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                            <span className="hidden sm:inline">Đang tìm kiếm</span>
                                        </>
                                    ) : (
                                        <>
                                            <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                                            <span className="hidden sm:inline">Tìm kiếm</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results */}
            {!isSearching && searchCompleted && hasSearched && filteredData.length > 0 ? (
                <div className="w-full bg-white">
                    <div className="mb-4 px-2 sm:px-4 pt-4">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex flex-col items-start gap-2 w-full md:w-auto">
                                    <div className="flex items-center w-full">
                                        <div className="mr-2 p-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md shadow-sm flex-shrink-0">
                                            <Inbox className="h-4 w-4 text-white" />
                                        </div>
                                        <h3 className="text-base sm:text-lg font-500 text-blue-700">Kết quả tìm kiếm</h3>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                                        <span className="text-xs text-gray-600 whitespace-nowrap">Loại giá:</span>
                                        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                                            {[
                                                { id: "GP", label: "GP", icon: "💰" },
                                                { id: "Text", label: "Text", icon: "📝" },
                                            ].map((type) => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setSelectedPriceType(type.id as PriceType)}
                                                    className={`flex items-center px-2 py-1 rounded text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 cursor-pointer ${
                                                        selectedPriceType === type.id
                                                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm"
                                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    }`}
                                                >
                                                    <span className="mr-1 text-xs">{type.icon}</span>
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pagination Info */}
                    {totalPages > 1 && (
                        <div className="px-2 sm:px-4 mb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="text-sm text-gray-600">
                                        Hiển thị <span className="font-semibold text-blue-600">{startIndex + 1}</span> - <span className="font-semibold text-blue-600">{Math.min(endIndex, filteredData.length)}</span> trong tổng số <span className="font-semibold text-blue-600">{filteredData.length}</span> kết quả
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-gray-600 whitespace-nowrap">Hiển thị:</label>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => setItemsPerPage(Number.parseInt(e.target.value))}
                                            className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={30}>30</option>
                                            <option value={40}>40</option>
                                            <option value={50}>50</option>
                                        </select>
                                        <span className="text-sm text-gray-600 whitespace-nowrap">dữ liệu/trang</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={goToPreviousPage}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                                        aria-label="Trang trước"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {(() => {
                                            const pages: (number | string)[] = []
                                            const maxVisible = 3

                                            if (totalPages <= 7) {
                                                for (let i = 1; i <= totalPages; i++) {
                                                    pages.push(i)
                                                }
                                            } else {
                                                pages.push(1)
                                                if (currentPage <= 3) {
                                                    for (let i = 2; i <= maxVisible + 1; i++) {
                                                        pages.push(i)
                                                    }
                                                    pages.push("...")
                                                    pages.push(totalPages - 1)
                                                    pages.push(totalPages)
                                                } else if (currentPage >= totalPages - 2) {
                                                    pages.push(2)
                                                    pages.push("...")
                                                    for (let i = totalPages - maxVisible; i <= totalPages; i++) {
                                                        pages.push(i)
                                                    }
                                                } else {
                                                    pages.push(2)
                                                    pages.push("...")
                                                    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                                                        pages.push(i)
                                                    }
                                                    pages.push("...")
                                                    pages.push(totalPages - 1)
                                                    pages.push(totalPages)
                                                }
                                            }

                                            return pages.map((page, index) => {
                                                if (page === "...") {
                                                    return (
                                                        <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                                                            ...
                                                        </span>
                                                    )
                                                }
                                                const pageNum = page as number
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => goToPage(pageNum)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                                            currentPage === pageNum
                                                                ? "bg-blue-600 text-white shadow-md"
                                                                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm"
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                )
                                            })
                                        })()}
                                    </div>
                                    <button
                                        onClick={goToNextPage}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                                        aria-label="Trang sau"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Results Table */}
                    {renderHotTable(
                        paginatedData,
                        `main-${selectedPriceType}-${selectedSearchType}-page-${currentPage}`,
                    )}
                    <div className="pb-4"></div>
                </div>
            ) : !isSearching && searchCompleted && hasSearched ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="p-4 bg-gray-50 rounded-full mb-4">
                        <Inbox className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Không có dữ liệu</h3>
                    <p className="text-sm text-gray-500 text-center max-w-sm">
                        {selectedSearchType === "Site"
                            ? `Không tìm thấy domain nào phù hợp với từ khóa "${searchTerm}"`
                            : `Không tìm thấy NCC nào phù hợp với từ khóa "${searchTerm}"`}
                    </p>
                </div>
            ) : null}
        </div>
    )
}
