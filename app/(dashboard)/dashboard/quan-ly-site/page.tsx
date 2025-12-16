"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import type React from "react"
import { useSheetToolData } from "@/hooks/useSheetToolData"
import { useAuth } from "@/hooks/useAuth"
import { useHeader } from "@/app/(dashboard)/contexts/HeaderContext"

import HotTableComponent, { type Column } from "@/components/table/HotTable"
import type Handsontable from "handsontable"
import type { HotTableRef } from "@handsontable/react-wrapper"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import {
    Search,
    Inbox,
    Copy,
    RefreshCw,
    Plus,
    X,
} from "lucide-react"

type SearchType = "Site" | "NCC"
type CurrencyType = "USDT" | "VND"

// SiteData interface
interface SiteData {
    rowIndex: number
    sheetName: string
    cs: string
    tinhTrang: string
    site: string
    bong: string
    bet: string
    chuDe: string
    linkOut: string
    DR: string
    keywords?: string
    trafficTool: string
    ghiChu: string
    giaMuaGP: string
    giaMuaText: string
    giaMuaTextHome: string
    giaMuaTextHeader: string
    hoaHongGP: string
    hoaHongText: string
    KeGP: string
    KeText: string
    loiNhuanGP: string
    loiNhuanText: string
    NCC: string
    MaNCC: string
    GhiChuNCC: string
}

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
    const [filteredData, setFilteredData] = useState<SiteData[]>([])
    const [newRows, setNewRows] = useState<SiteData[]>([]) // Các site mới thêm, luôn hiển thị
    const [searchTerm, setSearchTerm] = useState("")
    const [hasSearched, setHasSearched] = useState(false)
    const [isSearching, setIsSearching] = useState(false) // State để track khi đang tìm kiếm
    const [selectedSearchType, setSelectedSearchType] = useState<SearchType>("Site")
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>("USDT")
    const [exchangeRate, setExchangeRate] = useState<string>("28")
    const [isUpdating, setIsUpdating] = useState(false)
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [numberOfRows, setNumberOfRows] = useState<number>(1)
    const [regionType, setRegionType] = useState<"VN" | "NN">("VN")
    // Track new rows and their sheet (row index in newRows array -> sheet name)
    const [newRowsSheetMap, setNewRowsSheetMap] = useState<Map<number, string>>(new Map())
    const mainTableRef = useRef<HotTableRef>(null)
    const selectionAnchorRef = useRef<{ row: number; col: number } | null>(null)

    // Sử dụng hook tối ưu để fetch và cache dữ liệu - chỉ fetch khi có search
    const { data: toolData, loading, refreshing, refetch, isStale } = useSheetToolData(false)
    const allData = toolData?.gpTextVN || []
    
    // Lấy thông tin user từ auth hook
    const { user: userInfo } = useAuth()
    
    // Sử dụng HeaderContext để set header
    const { setHeaderData } = useHeader()
    // Add click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            const isClickInsideTable = target.closest(".handsontable")
            const isClickOnMobileCopy = target.closest("#mobile-copy-btn")

            if (!isClickInsideTable && !isClickOnMobileCopy) {
                const mainTableInstance = mainTableRef.current?.hotInstance
                if (mainTableInstance) {
                    mainTableInstance.deselectCell()
                }
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    // Validate domain format - chấp nhận tất cả định dạng (https, http, www, subdomain, port, path, etc.)
    const validateDomain = useCallback((domain: string): boolean => {
        if (!domain || typeof domain !== "string") return false
        
        let cleanDomain = domain.trim()
        if (!cleanDomain) return false
        
        // Remove protocol (http://, https://, ftp://, ftps://, etc.)
        cleanDomain = cleanDomain.replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//i, "")
        
        // Remove www. prefix if present
        cleanDomain = cleanDomain.replace(/^www\./i, "")
        
        // Remove paths (everything after /)
        cleanDomain = cleanDomain.replace(/\/.*$/, "")
        
        // Remove query strings and fragments (everything after ? or #)
        cleanDomain = cleanDomain.replace(/[?#].*$/, "")
        
        // Remove port numbers (everything after :)
        cleanDomain = cleanDomain.replace(/:\d+$/, "")
        
        // Trim whitespace
        cleanDomain = cleanDomain.trim()
        
        if (!cleanDomain) return false
        
        // Domain hợp lệ phải có:
        // - Ít nhất một dấu chấm (.)
        // - Có phần TLD (ít nhất 2 ký tự sau dấu chấm cuối)
        // - Không có khoảng trắng
        // - Chỉ chứa chữ cái, số, dấu gạch ngang, dấu chấm
        // - Hỗ trợ TLD nhiều phần (như .co.uk, .com.vn)
        // - Mỗi phần domain không quá 63 ký tự
        // - Tổng độ dài không quá 253 ký tự
        
        // Kiểm tra độ dài tổng thể
        if (cleanDomain.length > 253) return false
        
        // Regex để validate domain format
        // Chấp nhận: example.com, subdomain.example.com, example.co.uk, example.com.vn
        const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
        
        // Kiểm tra từng phần của domain
        const parts = cleanDomain.split(".")
        if (parts.length < 2) return false // Phải có ít nhất domain và TLD
        
        // Kiểm tra mỗi phần không quá 63 ký tự và không bắt đầu/kết thúc bằng dấu gạch ngang
        for (const part of parts) {
            if (part.length === 0 || part.length > 63) return false
            if (part.startsWith("-") || part.endsWith("-")) return false
            if (!/^[a-zA-Z0-9\-]+$/.test(part)) return false
        }
        
        // Kiểm tra TLD cuối cùng phải có ít nhất 2 ký tự và chỉ chứa chữ cái
        const lastPart = parts[parts.length - 1]
        if (lastPart.length < 2 || !/^[a-zA-Z]+$/.test(lastPart)) return false
        
        return domainRegex.test(cleanDomain)
    }, [])

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

    // Apply currency conversion helper
    const applyCurrencyConversion = useCallback((dataToConvert: SiteData[]): SiteData[] => {
        return dataToConvert.map((item) => {
            const newItem = { ...item }
            if (selectedCurrency === "VND") {
                const rate = Number.parseFloat(exchangeRate)
                if (!isNaN(rate)) {
                    // Convert price fields
                    const priceFields: Array<keyof SiteData> = [
                        "giaMuaGP",
                        "giaMuaText",
                        "giaMuaTextHome",
                        "giaMuaTextHeader",
                        "hoaHongGP",
                        "hoaHongText",
                        "loiNhuanGP",
                        "loiNhuanText",
                    ]
                    priceFields.forEach((field) => {
                        const raw = newItem[field]?.toString() || ""
                        const numericValue = Number.parseFloat(raw)
                        if (!isNaN(numericValue)) {
                            ; (newItem as any)[field] = (numericValue * rate).toString()
                        }
                    })
                }
            }
            return newItem
        })
    }, [selectedCurrency, exchangeRate])

    // Core search logic - fetch từ API với search params
    const runSearch = useCallback(
        async (value: string, skipFetch: boolean = false) => {
            if (!value.trim()) {
                setFilteredData([])
                setHasSearched(false)
                // Xóa newRows khi search rỗng (reset)
                setNewRows([])
                setNewRowsSheetMap(new Map())
                return
            }

            const searchTerms = value.split(/[,\n\s]+/).filter((term) => term.trim() !== "")
            if (searchTerms.length === 0) {
                setFilteredData([])
                setHasSearched(false)
                // Xóa newRows khi search rỗng (reset)
                setNewRows([])
                setNewRowsSheetMap(new Map())
                return
            }

            // Fetch data from API with search params (only if not skipping)
            if (!skipFetch) {
                await refetch(value, selectedSearchType)
                // Khi tìm kiếm mới, xóa newRows (chỉ giữ lại khi đang edit)
                setNewRows([])
                setNewRowsSheetMap(new Map())
            }
            
            // Apply currency conversion to current data
            if (allData.length > 0) {
                const convertedItems = applyCurrencyConversion(allData)
                setFilteredData(convertedItems)
                setHasSearched(true)
            } else {
                setFilteredData([])
                setHasSearched(true)
            }
        },
        [refetch, selectedSearchType, allData, applyCurrencyConversion],
    )

    // Apply currency conversion when data or currency changes
    useEffect(() => {
        if (searchTerm.trim() && hasSearched) {
            // Nếu allData rỗng (không tìm thấy), set filteredData rỗng
            if (allData.length === 0) {
                setFilteredData([])
            } else {
                // Nếu có dữ liệu, apply currency conversion
                const convertedItems = applyCurrencyConversion(allData)
                setFilteredData(convertedItems)
            }
        }
    }, [allData, applyCurrencyConversion, searchTerm, hasSearched])

    // Use refs to store latest values to avoid dependency issues
    const searchTermRef = useRef(searchTerm)
    const runSearchRef = useRef(runSearch)

    // Update refs when values change
    useEffect(() => {
        searchTermRef.current = searchTerm
    }, [searchTerm])

    useEffect(() => {
        runSearchRef.current = runSearch
    }, [runSearch])

    // Fetch dữ liệu mới khi user click refresh
    const fetchData = useCallback(async () => {
        if (searchTermRef.current) {
            await refetch(searchTermRef.current, selectedSearchType)
        }
    }, [refetch, selectedSearchType])

    // Set header với title và custom controls
    useEffect(() => {
        setHeaderData({
            title: "Quản lý Site",
            subTitle: "Quản lý và xem thông tin chi tiết các site",
            customControls: {
                searchType: {
                    value: selectedSearchType,
                    onSearchTypeChange: (type) => setSelectedSearchType(type),
                },
                currency: {
                    value: selectedCurrency,
                    exchangeRate: exchangeRate,
                    onCurrencyChange: (currency) => setSelectedCurrency(currency),
                    onExchangeRateChange: (rate) => setExchangeRate(rate),
                },
            },
            refreshButton: true,
            onRefresh: fetchData,
        })
    }, [selectedSearchType, selectedCurrency, exchangeRate, setHeaderData, fetchData])

    // Debounce function
    const debounce = (func: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout
        return (...args: any) => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => func(...args), delay)
        }
    }

    // Manual search handler - only search when button is clicked
    const handleSearchClick = useCallback(async () => {
        if (searchTerm.trim()) {
            // Validate domain format nếu đang tìm kiếm Site
            if (selectedSearchType === "Site") {
                const searchTerms = searchTerm.split(/[,\n\s]+/).filter((term) => term.trim() !== "")
                const invalidDomains: string[] = []
                
                searchTerms.forEach((term) => {
                    if (!validateDomain(term.trim())) {
                        invalidDomains.push(term.trim())
                    }
                })
                
                if (invalidDomains.length > 0) {
                    alert(`Các domain sau không đúng định dạng:\n${invalidDomains.join("\n")}\n\nVui lòng nhập đúng định dạng domain (ví dụ: example.com, www.example.com, https://example.com)`)
                    return
                }
            }
            
            setIsSearching(true)
            try {
            await runSearch(searchTerm, false)
            } finally {
                setIsSearching(false)
            }
        } else {
            setFilteredData([])
            setHasSearched(false)
        }
    }, [searchTerm, runSearch, selectedSearchType, validateDomain])

    // Handle Enter key press in search input
    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter để submit, Ctrl+Enter hoặc Shift+Enter để xuống dòng
        if (e.key === "Enter") {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
                // Ctrl+Enter hoặc Shift+Enter: cho phép xuống dòng
                return
            } else {
                // Enter: submit tìm kiếm
            e.preventDefault()
            handleSearchClick()
            }
        }
    }, [handleSearchClick])

    // Update data immediately when currency or rate changes to avoid flicker (only convert, don't refetch)
    useEffect(() => {
        if (hasSearched && searchTerm && allData.length > 0) {
            runSearch(searchTerm, true) // Skip fetch, just convert currency
        }
    }, [selectedCurrency, exchangeRate, hasSearched, searchTerm, runSearch, allData])

    // Price renderer
    const createPriceRenderer = useCallback((field: string) => {
        return ((
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

            let displayValue = value || ""

            if (row === 0) {
                td.style.setProperty("color", "red", "important")
                td.style.fontWeight = "600"
            }

            td.title = displayValue
            td.textContent = displayValue
            return td
        }) as RendererFunction
    }, [])

    // Common cell renderer
    const createCellRenderer = useCallback(() => {
        return ((
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
        }) as RendererFunction
    }, [])

    // Tình trạng renderer với styling
    const createTinhTrangRenderer = useCallback(() => {
        return ((
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
            
            const displayValue = value || ""
            td.textContent = displayValue
            td.title = displayValue

            // Apply styling based on value
            if (displayValue === "Bình thường") {
                td.style.background = "#16a34a"
                td.style.color = "#ffffff"
                td.style.fontWeight = "500"
                td.style.textAlign = "center"
            } else if (displayValue === "Ngưng") {
                td.style.background = "#dc2626"
                td.style.color = "#ffffff"
                td.style.fontWeight = "500"
                td.style.textAlign = "center"
            } else {
                // Default styling for other values
                td.style.textAlign = "center"
            }

            return td
        }) as RendererFunction
    }, [])

    // Generate columns
    const generateColumns = useCallback(() => {
        const columns = [
            // INFO group
            {
                title: "CS",
                data: "cs",
                width: 40,
                className: "htMiddle text-center",
                renderer: createCellRenderer(),
            },
            {
                title: "Site",
                data: "site",
                width: 120,
                className: "htMiddle text-center",
                renderer: createCellRenderer(),
            },
            {
                title: "Bóng",
                data: "bong",
                width: 40,
                className: "htMiddle text-center",
                renderer: createCellRenderer(),
            },
            {
                title: "Bet",
                data: "bet",
                width: 40,
                className: "htMiddle text-center",
                renderer: createCellRenderer(),
            },
            {
                title: "Chủ đề",
                data: "chuDe",
                width: 70,
                className: "htMiddle text-center",
                renderer: createCellRenderer(),
            },
            {
                title: "Link out",
                data: "linkOut",
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

                    if (value && typeof value === "string" && value.trim() !== "" && value !== "No") {
                        const isUrl = /^https?:\/\//i.test(value.trim())
                        if (isUrl) {
                            td.onclick = (e: MouseEvent) => {
                                e.preventDefault()
                                window.open(value, "_blank")
                            }
                            td.style.color = "#2563EB"
                            td.style.textDecoration = "underline"
                            td.style.cursor = "pointer"
                            td.textContent = "Link"
                        } else {
                            td.textContent = value
                        }
                    } else {
                        td.textContent = value || ""
                    }

                    td.title = value || ""
                    return td
                }) as RendererFunction,
            },
            {
                title: "DR",
                data: "DR",
                width: 40,
                className: "htMiddle text-center",
                renderer: createCellRenderer(),
            },
            {
                title: "Keywords",
                data: "keywords",
                width: 80,
                className: "htMiddle text-center",
                renderer: createCellRenderer(),
            },
            {
                title: "Traffic Tool",
                data: "trafficTool",
                width: 70,
                className: "htMiddle text-center",
                renderer: createCellRenderer(),
            },
            {
                title: "Ghi chú",
                data: "ghiChu",
                width: 100,
                className: "htMiddle text-center",
                renderer: createCellRenderer(),
            },
            {
                title: "Tình trạng",
                data: "tinhTrang",
                width: 70,
                className: "htMiddle text-center",
                renderer: createTinhTrangRenderer(),
                editor: "select",
                selectOptions: ["Bình thường", "Ngưng"],
            },
            // Giá group
            {
                title: "GP",
                data: "giaMuaGP",
                width: 60,
                className: "htMiddle",
                renderer: createPriceRenderer("giaMuaGP"),
            },
            {
                title: "Footer",
                data: "giaMuaText",
                width: 60,
                className: "htMiddle",
                renderer: createPriceRenderer("giaMuaText"),
            },
            {
                title: "Home",
                data: "giaMuaTextHome",
                width: 60,
                className: "htMiddle",
                renderer: createPriceRenderer("giaMuaTextHome"),
            },
            {
                title: "Header",
                data: "giaMuaTextHeader",
                width: 60,
                className: "htMiddle",
                renderer: createPriceRenderer("giaMuaTextHeader"),
            },
            // Hoa hồng group
            {
                title: "GP",
                data: "hoaHongGP",
                width: 50,
                className: "htMiddle",
                renderer: createPriceRenderer("hoaHongGP"),
            },
            {
                title: "Text",
                data: "hoaHongText",
                width:50,
                className: "htMiddle",
                renderer: createPriceRenderer("hoaHongText"),
            },
            // Kê thêm group
            {
                title: "GP",
                data: "KeGP",
                width: 50,
                className: "htMiddle",
                renderer: createPriceRenderer("keGP"),
            },
            {
                title: "Text",
                data: "KeText",
                width: 50,
                className: "htMiddle",
                renderer: createPriceRenderer("KeText"),
            },
            // NCC group
            {
                title: "Tên",
                data: "NCC",
                width: 60,
                className: "htMiddle",
                renderer: createCellRenderer(),
            },
            {
                title: "NCC",
                data: "MaNCC",
                width: 60,
                className: "htMiddle",
                renderer: createCellRenderer(),
            },
            {
                title: "Note NB",
                data: "GhiChuNCC",
                width: 60,
                className: "htMiddle",
                renderer: createCellRenderer(),
            },
        ]

        return columns
    }, [createCellRenderer, createPriceRenderer])

    // Generate nested headers
    const generateNestedHeaders = useCallback((columns: any[]) => {
        const firstRow: Array<{ label: string; colspan: number }> = []
        const secondRow: string[] = []

        // INFO group: 11 columns
        firstRow.push({ label: "INFO", colspan: 11 })
        for (let i = 0; i < 11; i++) {
            secondRow.push(columns[i].title)
        }

        // Giá group: 4 columns
        firstRow.push({ label: "Giá", colspan: 4 })
        for (let i = 11; i < 15; i++) {
            secondRow.push(columns[i].title)
        }

        // Hoa hồng group: 2 columns
        firstRow.push({ label: "Hoa hồng", colspan: 2 })
        for (let i = 15; i < 17; i++) {
            secondRow.push(columns[i].title)
        }

        // Kê thêm group: 2 columns
        firstRow.push({ label: "Kê thêm", colspan: 2 })
        for (let i = 17; i < 19; i++) {
            secondRow.push(columns[i].title)
        }

        // NCC group: 3 columns
        firstRow.push({ label: "NCC", colspan: 3 })
        for (let i = 19; i < 22; i++) {
            secondRow.push(columns[i].title)
        }

        return [firstRow, secondRow]
    }, [])

    // Memoize columns
    const generatedColumns = useMemo(() => generateColumns(), [generateColumns])

    // Memoize nested headers
    const nestedHeaders = useMemo(() => generateNestedHeaders(generatedColumns), [generatedColumns, generateNestedHeaders])

    // Memoize columns mapping - cho phép edit tất cả các cột, không có validation
    const mappedColumns = useMemo(() => {
        return generatedColumns.map((col) => ({
            data: col.data,
            title: col.title,
            type: "text",
            readOnly: false, // Cho phép edit tất cả các cột
            editor: "text", // Enable editor cho tất cả các cột
            // Không set validator - cho phép nhập tự do
            width: col.width,
            className: col.className,
            renderer: col.renderer as any,
        }))
    }, [generatedColumns])

    // Mobile copy handler
    const handleMobileCopySelection = useCallback(async () => {
        const mainTableInstance = mainTableRef.current?.hotInstance
        if (!mainTableInstance) {
            alert("Không tìm thấy bảng để copy")
            return
        }

        const selected = mainTableInstance.getSelected()
        if (!selected || selected.length === 0) {
            alert("Vui lòng chọn ô cần copy")
            return
        }

        let minRow = Number.POSITIVE_INFINITY,
            minCol = Number.POSITIVE_INFINITY,
            maxRow = Number.NEGATIVE_INFINITY,
            maxCol = Number.NEGATIVE_INFINITY
        selected.forEach((range: any) => {
            const [startRow, startCol, endRow, endCol] = range
            minRow = Math.min(minRow, startRow, endRow)
            minCol = Math.min(minCol, startCol, endCol)
            maxRow = Math.max(maxRow, startRow, endRow)
            maxCol = Math.max(maxCol, startCol, endCol)
        })

        const numRows = maxRow - minRow + 1
        const numCols = maxCol - minCol + 1
        const copiedDataArray: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(""))

        selected.forEach((range: any) => {
            const [startRow, startCol, endRow, endCol] = range
            const rowStart = Math.min(startRow, endRow)
            const rowEnd = Math.max(startRow, endRow)
            const colStart = Math.min(startCol, endCol)
            const colEnd = Math.max(startCol, endCol)

            for (let r = rowStart; r <= rowEnd; r++) {
                for (let c = colStart; c <= colEnd; c++) {
                    const cellElement = mainTableInstance.getCell(r, c)
                    const cellValue = cellElement ? cellElement.textContent || "" : ""
                    copiedDataArray[r - minRow][c - minCol] = cellValue
                }
            }
        })

        const finalData = copiedDataArray.map((row) => row.join("\t")).join("\n")

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(finalData)
            } else {
                const textArea = document.createElement("textarea")
                textArea.value = finalData
                textArea.style.position = "fixed"
                textArea.style.left = "-999999px"
                document.body.appendChild(textArea)
                textArea.select()
                document.execCommand("copy")
                document.body.removeChild(textArea)
            }
        } catch (err) {
            console.error("Copy failed:", err)
        }
    }, [])

    /**
     * Cập nhật dữ liệu site trong Google Sheets
     * Tự động tìm sheet chứa site này trong các sheet 1, 2, 4, 5
     */
    const updateSiteData = useCallback(async (
        site: string,
        updates: Partial<SiteData>,
        rowIndex?: number,
        maNCC?: string,
        sheetName?: string
    ) => {
        setIsUpdating(true)
        try {
            // Nếu có rowIndex và sheetName, sử dụng trực tiếp (nhanh nhất - không cần tìm kiếm)
            if (rowIndex !== undefined && rowIndex !== null && sheetName) {
                console.log(`[updateSiteData] Using rowIndex ${rowIndex} directly in sheet ${sheetName}`)
                try {
                    const response = await fetch("/api/sheet/update", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            sheetName, // Chỉ cần sheetName và rowIndex
                            updates,
                            rowIndex,  // Sử dụng rowIndex trực tiếp
                            site,      // Optional, chỉ để logging
                            maNCC,     // Optional
                        }),
                    })

                    const result = await response.json()

                    if (response.ok) {
                        // Refresh data after successful update
                        if (searchTermRef.current) {
                            await refetch(searchTermRef.current, selectedSearchType)
                        } else {
                            await refetch()
                        }

                        return result
                    } else {
                        throw new Error(result.message || "Failed to update")
                    }
                } catch (error: any) {
                    console.error("Update error:", error)
                    alert(`Lỗi cập nhật: ${error.message || "Không thể cập nhật dữ liệu"}`)
                    throw error
                }
            } else {
                // Fallback: Tìm trong tất cả các sheet có thể (chỉ khi không có rowIndex/sheetName)
                console.warn(`[updateSiteData] Fallback: Missing rowIndex or sheetName. Searching for site "${site}" in all sheets (slow path - update by site search)`)
                // Fallback: Tìm trong tất cả các sheet có thể
                const possibleSheets: Array<"1" | "2" | "4" | "5"> = ["1", "2", "4", "5"]
                let updateSuccess = false
                let lastError: Error | null = null

                for (const sheet of possibleSheets) {
                    try {
                        const response = await fetch("/api/sheet/update", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                site,
                                sheetName: sheet,
                                updates,
                                rowIndex,
                                maNCC,
                            }),
                        })

                        const result = await response.json()

                        if (response.ok) {
                            updateSuccess = true
                            // Refresh data after successful update
                            if (searchTermRef.current) {
                                await refetch(searchTermRef.current, selectedSearchType)
                            } else {
                                await refetch()
                            }

                            return result
                        } else if (result.message?.includes("not found")) {
                            // Site không có trong sheet này, thử sheet tiếp theo
                            continue
                        } else {
                            lastError = new Error(result.message || "Failed to update")
                        }
                    } catch (error: any) {
                        lastError = error
                        continue
                    }
                }

                if (!updateSuccess) {
                    throw lastError || new Error("Site not found in any sheet")
                }
            }
        } catch (error: any) {
            console.error("Update error:", error)
            alert(`Lỗi cập nhật: ${error.message || "Không thể cập nhật dữ liệu"}`)
            throw error
        } finally {
            setIsUpdating(false)
        }
    }, [refetch])

    // Handle cell changes in table - gọi API ngay lập tức giống users/page.tsx
    const handleAfterChange = useCallback((changes: any[] | null, source: string) => {
        // Only skip loadData source, allow all other sources (edit, CopyPaste.paste, etc.)
        if (source === "loadData") {
            return;
        }
        
        // Ensure changes is an array
        if (!Array.isArray(changes) || changes.length === 0) {
            return;
        }

        const mainTableInstance = mainTableRef.current?.hotInstance
        if (!mainTableInstance) {
            return
        }

        // Process changes immediately - gọi API ngay lập tức
        for (const [row, col, oldValue, newValue] of changes) {
            // Skip if values are the same (normalize for comparison)
            const normalizedOld = oldValue === null || oldValue === undefined ? "" : String(oldValue).trim()
            const normalizedNew = newValue === null || newValue === undefined ? "" : String(newValue).trim()
            
            if (normalizedOld === normalizedNew) {
                continue
            }

            // Handle both column index (number) and property name (string)
            // When using object data, Handsontable passes property name as col
            let columnProp: string | undefined
            if (typeof col === "string") {
                // col is already the property name
                columnProp = col
            } else if (typeof col === "number") {
                // col is column index, need to map to property name
                columnProp = mappedColumns[col]?.data as string
            }

            if (!columnProp) {
                continue
            }

            // Merge filteredData và newRows để lấy rowData
            const mergedData = [...filteredData, ...newRows]
            const rowData = mergedData[row]
            if (!rowData) {
                continue
            }

            // Check if this is a new row (not yet saved to sheet)
            // New rows are at the end, so check if row index is in newRows range
            const newRowIndex = row - filteredData.length
            const isNewRow = newRowIndex >= 0 && newRowIndex < newRows.length
            const sheetName = isNewRow ? newRowsSheetMap.get(newRowIndex) : undefined

            // Prepare update data
            const updates: Partial<SiteData> = {
                [columnProp]: newValue,
            }

            // Convert giá nhập về USDT để lưu vào sheet
            // Nếu đang chọn VND: giá nhập là VND, cần chia cho tỷ giá để lưu USDT
            // Nếu đang chọn USDT: giá nhập là USDT, lưu trực tiếp
            let processedUpdates = { ...updates }
            if (selectedCurrency === "VND") {
                const rate = Number.parseFloat(exchangeRate)
                if (!isNaN(rate) && rate > 0) {
                    const priceFields: Array<keyof SiteData> = [
                        "giaMuaGP",
                        "giaMuaText",
                        "giaMuaTextHome",
                        "giaMuaTextHeader",
                        "hoaHongGP",
                        "hoaHongText",
                        "loiNhuanGP",
                        "loiNhuanText",
                    ]
                    priceFields.forEach((field) => {
                        if (processedUpdates[field] !== undefined) {
                            const inputValue = String(processedUpdates[field]).trim()
                            if (inputValue !== "") {
                                const vndValue = Number.parseFloat(inputValue)
                                if (!isNaN(vndValue) && vndValue !== 0) {
                                    // Chia cho tỷ giá để chuyển từ VND sang USDT
                                    const usdtValue = vndValue / rate
                                    ; (processedUpdates as any)[field] = usdtValue.toString()
                                }
                            }
                        }
                    })
                }
            }
            // Nếu chọn USDT, giá nhập đã là USDT rồi, lưu trực tiếp không cần convert

            // If this is a new row, use add API instead of update
            if (isNewRow && sheetName) {
                // Prepare full row data with the update
                const fullRowData = { ...rowData, ...processedUpdates }
                
                // Yêu cầu cả site và trafficTool phải có giá trị mới tính là thêm
                const site = fullRowData.site ? String(fullRowData.site).trim() : ""
                const trafficTool = fullRowData.trafficTool ? String(fullRowData.trafficTool).trim() : ""
                
                // Chỉ gọi API add khi cả site và trafficTool đều có giá trị
                if (!site || !trafficTool) {
                    // Chưa đủ điều kiện, không gọi API, chỉ cập nhật local state
                    continue
                }

                // Use add API for new rows
                fetch("/api/sheet/add", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        sheetName,
                        rowData: fullRowData,
                    }),
                })
                    .then(async (response) => {
                        const result = await response.json()
                        if (response.ok) {
                            // Refresh data - site mới sẽ xuất hiện trong filteredData nếu match searchTerm
                            // Giữ lại newRows cho đến khi user tìm kiếm mới hoặc load lại trang
                            if (searchTermRef.current) {
                                await refetch(searchTermRef.current, selectedSearchType)
                            } else {
                                await refetch()
                            }
                            // Note: Không xóa newRows ngay, để nó luôn hiển thị cho đến khi tìm kiếm mới
                            // newRows sẽ được xóa trong runSearch khi tìm kiếm mới
                        } else {
                            throw new Error(result.message || "Failed to add row")
                        }
                    })
                    .catch((error) => {
                        const errorMessage = error instanceof Error ? error.message : String(error)
                        // Revert change on error
                        // Use setDataAtRowProp if col is string (property name), otherwise use setDataAtCell
                        if (typeof col === "string") {
                            mainTableInstance.setDataAtRowProp(row, col, oldValue)
                        } else {
                            mainTableInstance.setDataAtCell(row, col, oldValue)
                        }
                        alert(`Lỗi khi lưu dữ liệu: ${errorMessage}`)
                    })
                // Continue to next change, don't process update API
                continue
            } else {
                // Existing row - use update API
                // Determine which site to use for finding the row
                // If updating site field, use oldValue (old site) to find the row
                // Otherwise, use current site from rowData
                const siteToFind = columnProp === "site" ? (oldValue || rowData.site) : rowData.site

                // If site is empty, skip update (this shouldn't happen for existing rows, but just in case)
                if (!siteToFind || siteToFind.trim() === "") {
                    // If site is empty, this might be a new row that wasn't tracked properly
                    // Skip update for now
                    continue
                }

                // Use rowIndex if available (faster), otherwise fallback to site + MaNCC search
                let rowIndex = rowData.rowIndex
                let sheetName = rowData.sheetName
                const maNCC = rowData.MaNCC || undefined

                // Nếu không có rowIndex hoặc sheetName, thử lấy từ allData (dữ liệu gốc)
                if ((!rowIndex || !sheetName) && allData && allData.length > 0) {
                    // Tìm trong allData dựa vào site
                    const normalizedSiteToFind = normalizeUrl(siteToFind)
                    const originalRow = allData.find((item: SiteData) => {
                        const normalizedSite = normalizeUrl(item.site)
                        return normalizedSite === normalizedSiteToFind
                    })
                    if (originalRow) {
                        rowIndex = (originalRow as any).rowIndex || rowIndex
                        sheetName = (originalRow as any).sheetName || sheetName
                    }
                }

                // Kiểm tra nếu rowIndex không hợp lệ (phải >= 3) hoặc không có sheetName
                // Đây có thể là dòng mới chưa được lưu, không nên gọi updateSiteData với tìm kiếm theo site
                if ((!rowIndex || rowIndex < 3) && !sheetName) {
                    console.warn(`[handleAfterChange] Invalid rowIndex (${rowIndex}) or missing sheetName for site "${siteToFind}". This might be a new row. Skipping update.`)
                    // Skip update for new rows that aren't tracked properly
                    continue
                }

                // Bắt buộc phải có rowIndex hợp lệ (>= 3) và sheetName để update theo index
                // Nếu không có, không gọi updateSiteData (tránh tìm kiếm theo site cho dòng mới)
                if (!rowIndex || rowIndex < 3 || !sheetName) {
                    console.warn(`[handleAfterChange] Missing valid rowIndex (>= 3) or sheetName for site "${siteToFind}". Skipping update to avoid searching by site for new rows.`)
                    // Skip update - không tìm kiếm theo site cho dòng mới
                    continue
                }

                // Gọi API ngay lập tức (không debounce)
                // Ưu tiên rowIndex và sheetName nếu có (nhanh hơn)
                updateSiteData(siteToFind, processedUpdates, rowIndex, maNCC, sheetName)
                    .then((result) => {
                        // Success - data will be refreshed automatically by updateSiteData
                        // Only show success message if there were actual updates
                        if (result && result.updatedCells > 0) {
                            // Silent success, no alert needed
                        }
                    })
                    .catch((error) => {
                        // Only show error if it's not a "no valid fields" error (which is handled as success)
                        const errorMessage = error instanceof Error ? error.message : String(error)
                        if (!errorMessage.includes("No valid fields") && !errorMessage.includes("No valid fields to update")) {
                            // Revert change on error
                            // Use setDataAtRowProp if col is string (property name), otherwise use setDataAtCell
                            if (typeof col === "string") {
                                mainTableInstance.setDataAtRowProp(row, col, oldValue)
                            } else {
                                mainTableInstance.setDataAtCell(row, col, oldValue)
                            }
                            alert(`Lỗi khi lưu dữ liệu: ${errorMessage}`)
                        }
                    })
            }
        }
    }, [filteredData, newRows, mappedColumns, updateSiteData, selectedCurrency, exchangeRate, newRowsSheetMap, refetch, allData])

    // Modal handlers
    const handleOpenModal = useCallback(() => {
        setIsModalOpen(true)
        setNumberOfRows(1)
        setRegionType("VN")
    }, [])

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false)
        setNumberOfRows(1)
        setRegionType("VN")
    }, [])

    const handleAddRows = useCallback(() => {
        if (numberOfRows < 1 || numberOfRows > 100) {
            alert("Số lượng dòng phải từ 1 đến 100")
            return
        }
        
        const sheetName = regionType === "VN" ? "4" : "5"
        
        // Tạo mảng dữ liệu trống với số lượng dòng, mặc định tinhTrang = "Bình thường"
        const newRows: SiteData[] = Array.from({ length: numberOfRows }, () => ({
            rowIndex: 0,
            sheetName: "",
            cs: "",
            tinhTrang: "Bình thường", // Mặc định là "Bình thường"
            site: "",
            bong: "",
            bet: "",
            chuDe: "",
            linkOut: "",
            DR: "",
            keywords: "",
            trafficTool: "",
            ghiChu: "",
            giaMuaGP: "",
            giaMuaText: "",
            giaMuaTextHome: "",
            giaMuaTextHeader: "",
            hoaHongGP: "",
            hoaHongText: "",
            KeGP: "",
            KeText: "",
            loiNhuanGP: "",
            loiNhuanText: "",
            NCC: "",
            MaNCC: "",
            GhiChuNCC: "",
        }))
        
        // Thêm vào newRows (riêng biệt, luôn hiển thị) và track new rows
        setNewRows((prev) => {
            const newData = [...prev, ...newRows]
            // Track new rows with their sheet (index trong newRows array)
            const newMap = new Map(newRowsSheetMap)
            const startIndex = prev.length
            for (let i = 0; i < newRows.length; i++) {
                newMap.set(startIndex + i, sheetName)
            }
            setNewRowsSheetMap(newMap)
            return newData
        })
        
        // Đánh dấu đã search để hiển thị bảng
        setHasSearched(true)
        
        // Đóng modal
        handleCloseModal()
    }, [numberOfRows, regionType, handleCloseModal, newRowsSheetMap])

    // Sync header and body scroll
    useEffect(() => {
        const mergedData = [...filteredData, ...newRows]
        if (!mergedData || mergedData.length === 0) return

        let cleanup: (() => void) | undefined

        // Wait for table to be rendered
        const timer = setTimeout(() => {
            const mainTableInstance = mainTableRef.current?.hotInstance
            if (!mainTableInstance) return

            const masterHolder = mainTableInstance.rootElement?.querySelector('.ht_master .wtHolder') as HTMLElement
            const topCloneHolder = mainTableInstance.rootElement?.querySelector('.ht_clone_top .wtHolder') as HTMLElement

            if (masterHolder && topCloneHolder) {
                const handleScroll = () => {
                    topCloneHolder.scrollLeft = masterHolder.scrollLeft
                }
                masterHolder.addEventListener('scroll', handleScroll)
                
                cleanup = () => {
                    masterHolder.removeEventListener('scroll', handleScroll)
                }
            }
        }, 300)

        return () => {
            clearTimeout(timer)
            if (cleanup) {
                cleanup()
            }
        }
    }, [filteredData, newRows])

    // Handle before paste - giới hạn số hàng paste theo số hàng hiện có
    const handleBeforePaste = useCallback((data: string[][], coords: any[]) => {
        if (!data || data.length === 0) return
        
        const mergedData = [...filteredData, ...newRows]
        const totalRows = mergedData.length
        if (totalRows === 0) return
        
        // Lấy hàng đầu tiên được chọn để paste
        const startRow = coords && coords.length > 0 ? coords[0][0] : 0
        
        // Tính số hàng có thể paste (từ startRow đến cuối bảng)
        const availableRows = totalRows - startRow
        
        // Nếu số hàng paste nhiều hơn số hàng có thể paste, chỉ lấy số hàng có thể paste
        if (data.length > availableRows) {
            // Cắt data để chỉ lấy số hàng có thể paste
            // Modify data array in place
            data.splice(availableRows)
        }
    }, [filteredData, newRows])

    // Render table
    const renderHotTable = useCallback((data: SiteData[]) => {
        if (!data || data.length === 0) return null

        return (
            <div className="w-full">
                <HotTableComponent
                    ref={mainTableRef}
                    key="quan-ly-site"
                    data={data}
                    columns={mappedColumns}
                    nestedHeaders={nestedHeaders}
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
                    readOnly={false}
                    allowInvalid={true}
                    skipRowOnPaste={false}
                    onAfterChange={handleAfterChange}
                    beforePaste={handleBeforePaste}
                    afterOnCellMouseDown={(event, coords) => {
                        // Prevent scroll when clicking on cell
                        if (event && event.preventDefault) {
                            event.preventDefault()
                        }
                    }}
                />
            </div>
        )
    }, [mappedColumns, nestedHeaders, handleAfterChange, handleBeforePaste])

    return (
        <div className="relative">
            {/* Loading Overlay */}
            {loading && !toolData && <LoadingSpinner />}
            
            {/* Refreshing indicator - subtle */}
            {refreshing && toolData && (
                <div className="fixed top-4 right-4 z-[9998] bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Đang làm mới dữ liệu...</span>
                </div>
            )}
            
            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-blue-100">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4">
                        <div className="relative">
                            <textarea
                                placeholder={
                                    selectedSearchType === "Site"
                                        ? "Tìm kiếm site (hỗ trợ mọi định dạng domain: example.com, https://example.com, www.example.com)\n\nNhấn Enter để tìm kiếm, Ctrl+Enter hoặc Shift+Enter để xuống dòng"
                                        : "Tìm kiếm NCC (nhập mã NCC hoặc tên NCC, ví dụ: N1, ABC, XYZ...)\n\nNhấn Enter để tìm kiếm, Ctrl+Enter hoặc Shift+Enter để xuống dòng"
                                }
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                rows={5}
                                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-48 text-gray-700 placeholder-gray-400 bg-white shadow-sm resize-none overflow-y-auto"
                            />
                            <div className="absolute right-3 top-3 flex items-center gap-2">
                                <button
                                    onClick={handleOpenModal}
                                    className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Thêm dữ liệu</span>
                                </button>
                                <button
                                    onClick={handleSearchClick}
                                    disabled={loading || refreshing || isSearching}
                                    className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm"
                                >
                                    {isSearching ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Đang tìm kiếm
                                        </>
                                    ) : (
                                        <>
                                    <Search className="h-4 w-4" />
                                    Tìm kiếm
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Display */}
            {(() => {
                // Merge filteredData và newRows để hiển thị
                const mergedData = [...filteredData, ...newRows]
                const hasData = mergedData.length > 0
                
                if (hasSearched && hasData) {
                    return (
                        <div className="w-full bg-white mt-4">
                            {renderHotTable(mergedData)}
                        </div>
                    )
                } else if (hasSearched) {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <div className="p-4 bg-gray-50 rounded-full mb-4">
                                <Inbox className="h-12 w-12 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">Không có dữ liệu</h3>
                            <p className="text-sm text-gray-500 text-center max-w-sm">
                                Không tìm thấy site nào phù hợp với từ khóa "{searchTerm}"
                            </p>
                        </div>
                    )
                } else {
                    return (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <div className="p-4 bg-gray-50 rounded-full mb-4">
                                <Search className="h-12 w-12 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">Nhập từ khóa tìm kiếm</h3>
                            <p className="text-sm text-gray-500 text-center max-w-sm">
                                {selectedSearchType === "Site"
                                    ? "Nhập domain để tìm kiếm (hỗ trợ mọi định dạng: example.com, https://example.com, www.example.com)"
                                    : "Nhập mã NCC hoặc tên NCC để tìm kiếm (ví dụ: N1, ABC, XYZ...)"}
                            </p>
                        </div>
                    )
                }
            })()}

            {/* Mobile-only floating copy button */}
            <button
                id="mobile-copy-btn"
                onClick={handleMobileCopySelection}
                className="md:hidden fixed bottom-4 right-4 z-[2000] bg-blue-600 text-white rounded-full shadow-lg p-3 active:scale-95"
                aria-label="Copy selection"
                title="Copy vùng đã chọn"
            >
                <Copy className="h-6 w-6" />
            </button>

            {/* Add Data Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-semibold text-gray-800">Thêm dữ liệu mới</h2>
                            <button
                                onClick={handleCloseModal}
                                className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label="Đóng"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Form để nhập số lượng dòng và chọn khu vực */}
                            <div className="space-y-6 max-w-md mx-auto">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Số lượng dòng cần thêm
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={numberOfRows}
                                        onChange={(e) => setNumberOfRows(Number.parseInt(e.target.value) || 1)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Khu vực
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="region"
                                                value="VN"
                                                checked={regionType === "VN"}
                                                onChange={(e) => setRegionType(e.target.value as "VN" | "NN")}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <span className="text-gray-700">Việt Nam (Sheet 4)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="region"
                                                value="NN"
                                                checked={regionType === "NN"}
                                                onChange={(e) => setRegionType(e.target.value as "VN" | "NN")}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <span className="text-gray-700">Nước Ngoài (Sheet 5)</span>
                                        </label>
                                    </div>
                                </div>

                                <button
                                    onClick={handleAddRows}
                                    className="cursor-pointer w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Thêm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

