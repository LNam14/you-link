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
    Save,
} from "lucide-react"
import { toast } from "sonner"

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
    noteKH: string
    noteNB: string
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

type PendingChange =
    | {
        type: "update"
        key: string
        site: string
        sheetName: string
        rowIndex: number
        maNCC?: string
        updates: Partial<SiteData>
    }
    | {
        type: "add"
        key: string
        sheetName: string
        rowIndex: number
        rowData: SiteData
    }

export default function PageBody() {
    const [filteredData, setFilteredData] = useState<SiteData[]>([])
    const [newRows, setNewRows] = useState<SiteData[]>([]) // Các site mới thêm, luôn hiển thị
    const [localAddedRows, setLocalAddedRows] = useState<SiteData[]>([]) // Các site đã lưu thành công nhưng chưa refetch
    const [localUpdatedRows, setLocalUpdatedRows] = useState<Map<string, SiteData>>(new Map()) // Cache các dòng đã update để không cần refetch
    const [localRemovedKeys, setLocalRemovedKeys] = useState<Set<string>>(new Set()) // Cache các dòng đã xóa để ẩn ngay
    const [searchTerm, setSearchTerm] = useState("")
    const [hasSearched, setHasSearched] = useState(false)
    const [isSearching, setIsSearching] = useState(false) // State để track khi đang tìm kiếm
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [selectedSearchType, setSelectedSearchType] = useState<SearchType>("Site")
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>("USDT")
    const [exchangeRate, setExchangeRate] = useState<string>("28")
    const [isUpdating, setIsUpdating] = useState(false)
    const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map())
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [numberOfRows, setNumberOfRows] = useState<number>(1)
    const [regionType, setRegionType] = useState<"VN" | "NN">("VN")
    // Track new rows and their sheet (row index in newRows array -> sheet name)
    const [newRowsSheetMap, setNewRowsSheetMap] = useState<Map<number, string>>(new Map())
    const mainTableRef = useRef<HotTableRef>(null)
    const selectionAnchorRef = useRef<{ row: number; col: number } | null>(null)

    // Sử dụng hook tối ưu để fetch và cache dữ liệu
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

    const getRowKey = useCallback(
        (sheetName?: string, rowIndex?: number, site?: string): string => {
            if (sheetName && typeof rowIndex === "number") {
                return `${sheetName}-${rowIndex}`
            }
            const normalizedSite = normalizeUrl(site || "")
            return normalizedSite ? `site-${normalizedSite}` : ""
        },
        [normalizeUrl],
    )

    const applyLocalUpdates = useCallback(
        (data: SiteData[], overrides?: Map<string, SiteData>): SiteData[] => {
            const updateMap = overrides ?? localUpdatedRows
            if (!updateMap || updateMap.size === 0) return data

            return data.map((item) => {
                const key = getRowKey(item.sheetName, item.rowIndex, item.site)
                if (!key) return item
                const override = updateMap.get(key)
                return override ? { ...item, ...override } : item
            })
        },
        [getRowKey, localUpdatedRows],
    )

    // Create placeholder row when a searched site is not found
    const createPlaceholderRow = useCallback((siteValue: string): SiteData => {
        return {
            rowIndex: 0,
            sheetName: "",
            cs: "",
            tinhTrang: "",
            site: siteValue,
            bong: "",
            bet: "",
            chuDe: "",
            linkOut: "",
            DR: "",
            keywords: "",
            trafficTool: "",
            noteKH: "",
            noteNB: "",
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
        }
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

    // Flag tránh refetch lặp khi auto load
    const isLoadingDataRef = useRef(false)

    // Auto load toàn bộ dữ liệu khi vào trang (tham khảo tool-check-site)
    useEffect(() => {
        if (isLoadingDataRef.current) return
        if (!loading && !refreshing && allData.length === 0) {
            isLoadingDataRef.current = true
            // forceLoadAll = true để lấy toàn bộ dữ liệu gốc
            refetch("", selectedSearchType, undefined, true)
                .finally(() => {
                    isLoadingDataRef.current = false
                })
        }
    }, [allData.length, loading, refreshing, refetch, selectedSearchType])

    // Lọc dữ liệu theo từ khóa trên dữ liệu đã tải sẵn
    const filterDataBySearch = useCallback(
        (value: string, overrideUpdatedRows?: Map<string, SiteData>): SiteData[] => {
            const searchValue = value.trim()
            if (!searchValue) return []

            const rawTerms = searchValue
                .split(/[,\n\s]+/)
                .map((term) => term.trim())
                .filter((term) => term !== "")

            if (rawTerms.length === 0) return []

            const sourceData = applyLocalUpdates([...allData, ...localAddedRows], overrideUpdatedRows)
                .filter((item) => {
                    const key = getRowKey(item.sheetName, item.rowIndex, item.site)
                    if (!key) return true
                    return !localRemovedKeys.has(key)
                })

            let filtered: SiteData[] = []

            if (selectedSearchType === "Site") {
                // Chuẩn hóa domain để so sánh
                const normalizedTerms = rawTerms.map((t) => normalizeUrl(t))
                const siteMap = new Map<string, SiteData>()

                // Map nhanh để lấy đúng site đã có dữ liệu
                sourceData.forEach((item) => {
                    const key = normalizeUrl(item.site || "")
                    if (key && !siteMap.has(key)) {
                        siteMap.set(key, item)
                    }
                })

                // Duyệt theo thứ tự người dùng nhập để giữ nguyên thứ tự hiển thị
                filtered = rawTerms.map((term, idx) => {
                    const normalizedTerm = normalizedTerms[idx]
                    if (normalizedTerm) {
                        const matched = siteMap.get(normalizedTerm)
                        if (matched) return matched
                    }
                    // Không tìm thấy -> tạo dòng rỗng chỉ với site
                    return createPlaceholderRow(term)
                })
            } else {
                // Tìm theo NCC: theo mã NCC hoặc tên NCC (không phân biệt hoa thường)
                const lowerTerms = rawTerms.map((t) => t.toLowerCase())
                if (!sourceData || sourceData.length === 0) return []
                filtered = sourceData.filter((item: SiteData) => {
                    const nccName = (item.NCC || "").toLowerCase()
                    const nccCode = (item.MaNCC || "").toLowerCase()
                    return lowerTerms.some(
                        (term) =>
                            (term && nccName.includes(term)) ||
                            (term && nccCode.includes(term)),
                    )
                })
            }

            // Áp dụng chuyển đổi tiền tệ trên dữ liệu đã lọc
            return applyCurrencyConversion(filtered)
        },
        [
            allData,
            localAddedRows,
            selectedSearchType,
            normalizeUrl,
            applyCurrencyConversion,
            applyLocalUpdates,
            localRemovedKeys,
            createPlaceholderRow,
        ],
    )

    // Core search logic - tìm kiếm trên dữ liệu đã fetch sẵn (client-side)
    const runSearch = useCallback(
        async (value: string, skipFetch: boolean = false) => {
            // Reset pending changes khi bắt đầu tìm kiếm mới để tránh lưu nhầm dữ liệu cũ
            setPendingChanges(new Map())

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

            // Tìm kiếm trên dữ liệu đã tải sẵn (không gọi API)
            const filteredItems = filterDataBySearch(value)
            setFilteredData(filteredItems)
            setHasSearched(true)
        },
        [filterDataBySearch],
    )

    // Apply currency conversion when data or currency changes
    useEffect(() => {
        if (searchTerm.trim() && hasSearched) {
            // Khi dữ liệu gốc hoặc tỷ giá thay đổi, áp dụng lại lọc và chuyển đổi tiền tệ
            const filteredItems = filterDataBySearch(searchTerm)
            setFilteredData((prev) => {
                // Nếu kết quả không thay đổi (so sánh tham chiếu phần tử), tránh setState để ngăn loop
                if (
                    prev.length === filteredItems.length &&
                    prev.every((item, idx) => item === filteredItems[idx])
                ) {
                    return prev
                }
                return filteredItems
            })
        }
    }, [allData, filterDataBySearch, searchTerm, hasSearched])

    // Loại bỏ các dòng thêm mới khỏi cache tạm khi dữ liệu gốc đã chứa chúng (sau refetch)
    useEffect(() => {
        if (!localAddedRows.length) return

        const normalizedExisting = new Set(
            allData.map((item) => normalizeUrl(item.site || "")),
        )

        const remaining = localAddedRows.filter((row) => {
            const key = normalizeUrl(row.site || "")
            if (!key) return true
            return !normalizedExisting.has(key)
        })

        if (remaining.length !== localAddedRows.length) {
            setLocalAddedRows(remaining)
        }
    }, [allData, localAddedRows, normalizeUrl])

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

    // Fetch dữ liệu mới khi user click refresh (luôn fetch toàn bộ)
    const fetchData = useCallback(async () => {
        await refetch()
    }, [refetch])

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
                    toast.success(`Các domain sau không đúng định dạng:\n${invalidDomains.join("\n")}\n\nVui lòng nhập đúng định dạng domain (ví dụ: example.com, www.example.com, https://example.com)`)
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
                title: "Tình trạng",
                data: "tinhTrang",
                width: 70,
                className: "htMiddle text-center",
                renderer: createTinhTrangRenderer(),
                editor: "select",
                selectOptions: ["Bình thường", "Ngưng"],
            },
            {
                title: "Khách hàng",
                data: "noteKH",
                width: 100,
                className: "htMiddle text-center",
                renderer: createCellRenderer(),
            },
            {
                title: "Nội bộ",
                data: "noteNB",
                width: 60,
                className: "htMiddle text-center",
                renderer: createCellRenderer(),
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
        ]

        return columns
    }, [createCellRenderer, createPriceRenderer])

    // Generate nested headers
    const generateNestedHeaders = useCallback((columns: any[]) => {
        const firstRow: Array<{ label: string; colspan: number }> = []
        const secondRow: string[] = []

        const infoCols = columns.slice(0, 10)
        const noteCols = columns.slice(10, 12)
        const giaCols = columns.slice(12, 16)
        const hoaHongCols = columns.slice(16, 18)
        const keThemCols = columns.slice(18, 20)
        const nccCols = columns.slice(20, 22)

        firstRow.push({ label: "INFO", colspan: infoCols.length })
        infoCols.forEach((col) => secondRow.push(col.title))

        firstRow.push({ label: "Note", colspan: noteCols.length })
        noteCols.forEach((col) => secondRow.push(col.title))

        firstRow.push({ label: "Giá", colspan: giaCols.length })
        giaCols.forEach((col) => secondRow.push(col.title))

        firstRow.push({ label: "Hoa hồng", colspan: hoaHongCols.length })
        hoaHongCols.forEach((col) => secondRow.push(col.title))

        firstRow.push({ label: "Kê thêm", colspan: keThemCols.length })
        keThemCols.forEach((col) => secondRow.push(col.title))

        firstRow.push({ label: "NCC", colspan: nccCols.length })
        nccCols.forEach((col) => secondRow.push(col.title))

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
            toast.warning("Không tìm thấy bảng để copy")
            return
        }

        const selected = mainTableInstance.getSelected()
        if (!selected || selected.length === 0) {
            toast.warning("Vui lòng chọn ô cần copy")
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
                            "x-skip-telegram": "true", // Telegram sẽ gửi dạng batch sau
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
                        return result
                    } else {
                        throw new Error(result.message || "Failed to update")
                    }
                } catch (error: any) {
                    console.error("Update error:", error)
                    toast.error(`Lỗi cập nhật: ${error.message || "Không thể cập nhật dữ liệu"}`)
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
                                "x-skip-telegram": "true", // Telegram sẽ gửi dạng batch sau
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
            toast.error(`Lỗi cập nhật: ${error.message || "Không thể cập nhật dữ liệu"}`)
            throw error
        } finally {
            setIsUpdating(false)
        }
    }, [])

    // Handle cell changes in table - chỉ lưu vào danh sách chờ, cần bấm "Lưu dữ liệu" để đẩy lên server
    const handleAfterChange = useCallback((changes: any[] | null, source: string) => {
        if (source === "loadData") return
        if (!Array.isArray(changes) || changes.length === 0) return

        const mergedData = [...filteredData, ...newRows]
        let newRowsChanged = false
        const updatedNewRows = [...newRows]

        setPendingChanges((prev) => {
            const updated = new Map(prev)

            for (const [row, col, oldValue, newValue] of changes) {
                const normalizedOld = oldValue === null || oldValue === undefined ? "" : String(oldValue).trim()
                const normalizedNew = newValue === null || newValue === undefined ? "" : String(newValue).trim()
                if (normalizedOld === normalizedNew) continue

                // Determine property name
                let columnProp: string | undefined
                if (typeof col === "string") {
                    columnProp = col
                } else if (typeof col === "number") {
                    columnProp = mappedColumns[col]?.data as string
                }
                if (!columnProp) continue

                const rowData = mergedData[row]
                if (!rowData) continue

                const newRowIndex = row - filteredData.length
                const isNewRow = newRowIndex >= 0 && newRowIndex < newRows.length
                const sheetNameForNewRow = isNewRow ? newRowsSheetMap.get(newRowIndex) : undefined

                const updates: Partial<SiteData> = {
                    [columnProp]: newValue,
                }

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
                                        const usdtValue = vndValue / rate
                                        ; (processedUpdates as any)[field] = usdtValue.toString()
                                    }
                                }
                            }
                        })
                    }
                }

                if (isNewRow) {
                    if (!sheetNameForNewRow) {
                        console.warn(`[handleAfterChange] Missing sheetName for new row index ${newRowIndex}, skip save queue`)
                        continue
                    }

                    const fullRowData = { ...rowData, ...processedUpdates }
                    updatedNewRows[newRowIndex] = fullRowData
                    newRowsChanged = true

                    const key = `add-${sheetNameForNewRow}-${newRowIndex}`
                    updated.set(key, {
                        type: "add",
                        key,
                        sheetName: sheetNameForNewRow,
                        rowIndex: fullRowData.rowIndex,
                        rowData: fullRowData,
                    })
                } else {
                    const siteToFind = columnProp === "site" ? (oldValue || rowData.site) : rowData.site
                    if (!siteToFind || siteToFind.trim() === "") continue

                    let rowIndex = rowData.rowIndex
                    let sheetName = rowData.sheetName
                    const maNCC = rowData.MaNCC || undefined

                    if ((!rowIndex || !sheetName) && allData && allData.length > 0) {
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

                    if (!rowIndex || rowIndex < 3 || !sheetName) {
                        console.warn(`[handleAfterChange] Missing valid rowIndex or sheetName for site "${siteToFind}". Skipping queueing update.`)
                        continue
                    }

                    const key = `update-${sheetName}-${rowIndex}`
                    const existingChange = updated.get(key)
                    const mergedUpdates = existingChange && existingChange.type === "update"
                        ? { ...existingChange.updates, ...processedUpdates }
                        : processedUpdates

                    updated.set(key, {
                        type: "update",
                        key,
                        site: siteToFind as string,
                        sheetName,
                        rowIndex,
                        maNCC,
                        updates: mergedUpdates,
                    })
                }
            }

            return updated
        })

        if (newRowsChanged) {
            setNewRows(updatedNewRows)
        }
    }, [filteredData, newRows, mappedColumns, selectedCurrency, exchangeRate, newRowsSheetMap, allData, normalizeUrl])

    // Save all queued changes to server
    const handleSaveChanges = useCallback(async () => {
        if (pendingChanges.size === 0) {
            toast.warning("Không có thay đổi nào cần lưu")
            return
        }

        setIsSaving(true)
        try {
            const addedRowsRaw: SiteData[] = []
            const updatedRowsRaw: SiteData[] = []
            const newRowIndicesToRemove: number[] = []
            const updateDetailLines: string[] = []

            const findExistingRow = (
                sheetName?: string,
                rowIndex?: number,
                site?: string,
            ): SiteData | null => {
                const key = getRowKey(sheetName, rowIndex, site)
                if (key) {
                    const localOverride = localUpdatedRows.get(key)
                    if (localOverride) return localOverride
                }

                const normalizedSite = normalizeUrl(site || "")

                const matchLocalAdded = localAddedRows.find((item) => {
                    const itemKey = getRowKey(item.sheetName, item.rowIndex, item.site)
                    if (key && itemKey === key) return true
                    return normalizedSite && normalizeUrl(item.site || "") === normalizedSite
                })
                if (matchLocalAdded) return matchLocalAdded

                const matchFiltered = filteredData.find((item) => {
                    const itemKey = getRowKey(item.sheetName, item.rowIndex, item.site)
                    if (key && itemKey === key) return true
                    return normalizedSite && normalizeUrl(item.site || "") === normalizedSite
                })
                if (matchFiltered) return matchFiltered

                const matchAll = allData.find((item) => {
                    const itemKey = getRowKey(item.sheetName, item.rowIndex, item.site)
                    if (key && itemKey === key) return true
                    return normalizedSite && normalizeUrl(item.site || "") === normalizedSite
                })
                return matchAll || null
            }

            for (const change of pendingChanges.values()) {
                if (change.type === "add") {
                    const { rowData, sheetName } = change

                    if (!sheetName) {
                        console.warn(`[handleSaveChanges] Thiếu sheetName cho dòng mới, bỏ qua`)
                        continue
                    }
                  

                    const response = await fetch("/api/sheet/add", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-skip-telegram": "true", // Gửi gộp sau qua summary
                        },
                        body: JSON.stringify({
                            sheetName,
                            rowData,
                        }),
                    })
                    const result = await response.json()
                    if (!response.ok) {
                        throw new Error(result.message || "Failed to add row")
                    }

                    const parsedIndex = Number.parseInt(change.key.split("-").pop() || "", 10)
                    if (!Number.isNaN(parsedIndex)) {
                        newRowIndicesToRemove.push(parsedIndex)
                    }

                    const savedRow: SiteData = {
                        ...rowData,
                        sheetName,
                        rowIndex: result?.rowIndex ?? rowData.rowIndex ?? 0,
                    }
                    addedRowsRaw.push(savedRow)
                } else if (change.type === "update") {
                    const { site, updates, rowIndex, maNCC, sheetName } = change
                    const result = await updateSiteData(site, updates, rowIndex, maNCC, sheetName)

                    if (result?.site && Array.isArray(result?.changes) && result.changes.length > 0) {
                        updateDetailLines.push(`🌐 ${result.site}`)
                        for (const c of result.changes) {
                            const oldVal = c.oldValue === "" ? "(trống)" : String(c.oldValue)
                            const newVal = c.newValue === "" ? "(trống)" : String(c.newValue)
                            updateDetailLines.push(`  • ${c.displayName || c.field}: ${oldVal} → ${newVal}`)
                        }
                    } else if (site) {
                        updateDetailLines.push(`🌐 ${site}`)
                    }

                    const baseRow =
                        findExistingRow(sheetName, rowIndex, site) ||
                        ({
                            sheetName: sheetName || "",
                            rowIndex: rowIndex ?? 0,
                            cs: "",
                            tinhTrang: "",
                            site: site || "",
                            bong: "",
                            bet: "",
                            chuDe: "",
                            linkOut: "",
                            DR: "",
                            keywords: "",
                            trafficTool: "",
                            noteKH: "",
                            noteNB: "",
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
                            MaNCC: maNCC || ""
                        } as SiteData)

                    const mergedRow: SiteData = {
                        ...baseRow,
                        ...updates,
                        sheetName: sheetName || baseRow.sheetName,
                        rowIndex: rowIndex ?? baseRow.rowIndex,
                        MaNCC: (updates as any)?.MaNCC ?? baseRow.MaNCC ?? maNCC,
                    }

                    const updateKey = getRowKey(mergedRow.sheetName, mergedRow.rowIndex, mergedRow.site)
                    if (updateKey) {
                        const existingIndex = updatedRowsRaw.findIndex(
                            (row) => getRowKey(row.sheetName, row.rowIndex, row.site) === updateKey,
                        )
                        if (existingIndex >= 0) {
                            updatedRowsRaw[existingIndex] = mergedRow
                        } else {
                            updatedRowsRaw.push(mergedRow)
                        }
                    }
                }
            }

            // Dọn dẹp dòng tạm sau khi lưu (sẽ tải lại dữ liệu thay vì trộn local)
            setNewRows([])
            setNewRowsSheetMap(new Map())
            setLocalAddedRows([])
            setLocalUpdatedRows(new Map())
            setPendingChanges(new Map())

            // Gửi Telegram summary một lần cho cả thêm và cập nhật
            try {
                const addLines =
                    addedRowsRaw.length > 0
                        ? addedRowsRaw.map((row) => {
                            const site = row.site?.toString().trim() || "(trống)"
                            const traffic = row.trafficTool?.toString().trim()
                            return traffic ? `${site} - Traffic ${traffic}` : site
                        })
                        : []

                const updateLines = updateDetailLines

                if (addLines.length > 0 || updateLines.length > 0) {
                    await fetch("/api/telegram/summary", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            addLines,
                            updateLines,
                        }),
                    })
                }
            } catch (telegramError) {
                console.error("Telegram summary error:", telegramError)
            }

            // Luôn tải lại dữ liệu mới nhất thay vì trộn dữ liệu cục bộ
            try {
                await refetch("", selectedSearchType, undefined, true)
            } catch (refreshError: any) {
                console.error("Refresh after save failed:", refreshError)
                toast.error("Đã lưu nhưng tải lại dữ liệu thất bại, vui lòng thử lại")
                return
            }

            toast.success("Đã lưu dữ liệu thành công")
        } catch (error: any) {
            console.error("Save changes error:", error)
            toast.error(`Lưu dữ liệu thất bại: ${error?.message || "Không thể lưu"}`)
        } finally {
            setIsSaving(false)
        }
    }, [
        pendingChanges,
        updateSiteData,
        applyCurrencyConversion,
        normalizeUrl,
        getRowKey,
        filteredData,
        filterDataBySearch,
        hasSearched,
        refetch,
        selectedSearchType,
        allData,
    ])

    const getRowsFromSelection = useCallback((selection: any, totalRows: number): Set<number> => {
        const rows = new Set<number>()
        if (!selection) return rows

        const normalized: Array<any> = Array.isArray(selection) ? selection : [selection]

        normalized.forEach((item) => {
            if (Array.isArray(item)) {
                const [startRow, , endRow] = item
                if (typeof startRow === "number") {
                    const from = Math.max(0, Math.min(startRow, (typeof endRow === "number" ? endRow : startRow)))
                    const to = Math.min(totalRows - 1, Math.max(startRow, (typeof endRow === "number" ? endRow : startRow)))
                    for (let r = from; r <= to; r++) rows.add(r)
                }
            } else if (item && typeof item === "object") {
                // Handsontable selection may be { start: {row, col}, end: {row, col} }
                const startRow = (item as any).startRow ?? (item as any).start?.row
                const endRowRaw = (item as any).endRow ?? (item as any).end?.row
                const endRow = typeof endRowRaw === "number" ? endRowRaw : startRow

                if (typeof startRow === "number") {
                    const from = Math.max(0, Math.min(startRow, endRow))
                    const to = Math.min(totalRows - 1, Math.max(startRow, endRow))
                    for (let r = from; r <= to; r++) rows.add(r)
                }
            }
        })

        return rows
    }, [])

    const handleDeleteRows = useCallback(async (selectionOverride?: any[]) => {
        const hotInstance = mainTableRef.current?.hotInstance
        const mergedData = [...filteredData, ...newRows]

        if (!hotInstance || mergedData.length === 0) {
            toast.warning("Không có dữ liệu để xóa")
            return
        }

        const selection = selectionOverride || hotInstance.getSelected()
        if (!selection || selection.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một dòng để xóa")
            return
        }

        const rowsToDelete = getRowsFromSelection(selection, mergedData.length)
        console.log("[delete] raw selection:", selection)
        console.log("[delete] rowsToDelete:", Array.from(rowsToDelete))

        if (!rowsToDelete.size) {
            toast.warning("Không tìm thấy dòng hợp lệ để xóa")
            return
        }

        const existingRows: SiteData[] = []
        const newRowIndexes: number[] = []

        rowsToDelete.forEach((rowIdx) => {
            if (rowIdx < filteredData.length) {
                const rowData = filteredData[rowIdx]
                if (rowData?.sheetName && rowData?.rowIndex && rowData.rowIndex >= 3) {
                    existingRows.push(rowData)
                }
            } else {
                const newRowIdx = rowIdx - filteredData.length
                if (newRowIdx >= 0 && newRowIdx < newRows.length) {
                    newRowIndexes.push(newRowIdx)
                }
            }
        })

        if (!existingRows.length && !newRowIndexes.length) {
            toast.warning("Không có dòng hợp lệ để xóa")
            return
        }

        setIsDeleting(true)
        setIsSearching(true)
        try {
            if (newRowIndexes.length) {
                console.log("[delete] removing new rows (unsaved):", newRowIndexes)
                const removeSet = new Set(newRowIndexes)
                setNewRows((prev) => prev.filter((_, idx) => !removeSet.has(idx)))
                setNewRowsSheetMap((prev) => {
                    const remaining = Array.from(prev.entries())
                        .filter(([idx]) => !removeSet.has(idx))
                        .sort((a, b) => a[0] - b[0])
                    const remapped = new Map<number, string>()
                    remaining.forEach(([, sheet], idx) => {
                        remapped.set(idx, sheet)
                    })
                    return remapped
                })
                setPendingChanges((prev) => {
                    const updated = new Map(prev)
                    removeSet.forEach((idx) => {
                        const sheetName = newRowsSheetMap.get(idx)
                        if (sheetName) {
                            updated.delete(`add-${sheetName}-${idx}`)
                        }
                    })
                    return updated
                })
            }

            if (existingRows.length) {
                console.log("[delete] deleting existing rows:", existingRows.map((r) => ({ sheetName: r.sheetName, rowIndex: r.rowIndex, site: r.site })))
                await Promise.all(
                    existingRows.map(async (row) => {
                        const response = await fetch("/api/sheet/delete", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                sheetName: row.sheetName,
                                rowIndex: row.rowIndex,
                            }),
                        })

                        const result = await response.json().catch(() => ({}))
                        console.log("[delete] api response:", { sheetName: row.sheetName, rowIndex: row.rowIndex, ok: response.ok, result })
                        if (!response.ok) {
                            throw new Error(result.message || "Xóa thất bại")
                        }
                    }),
                )

                setPendingChanges((prev) => {
                    const updated = new Map(prev)
                    existingRows.forEach((row) => {
                        updated.delete(`update-${row.sheetName}-${row.rowIndex}`)
                    })
                    return updated
                })
            }

            const removedKeys = new Set<string>()
            existingRows.forEach((row) => {
                const key = getRowKey(row.sheetName, row.rowIndex, row.site)
                if (key) removedKeys.add(key)
            })

            if (removedKeys.size) {
                setLocalRemovedKeys((prev) => {
                    const next = new Set(prev)
                    removedKeys.forEach((k) => next.add(k))
                    return next
                })
                setFilteredData((prev) => prev.filter((item) => {
                    const key = getRowKey(item.sheetName, item.rowIndex, item.site)
                    if (!key) return true
                    return !removedKeys.has(key)
                }))
            }

            toast.success("Đã xóa dòng thành công")
        } catch (error: any) {
            console.error("Delete rows error:", error)
            toast.error(`Xóa dữ liệu thất bại: ${error?.message || "Không thể xóa"}`)
        } finally {
            setIsDeleting(false)
            setIsSearching(false)
        }
    }, [filteredData, newRows, newRowsSheetMap, selectedSearchType, getRowsFromSelection, getRowKey])

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
            toast.warning("Số lượng dòng phải từ 1 đến 100")
            return
        }
        
        const sheetName = regionType === "VN" ? "4" : "5"
        
        // Tạo mảng dữ liệu trống với số lượng dòng, mặc định tinhTrang = "Bình thường"
        const newRows: SiteData[] = Array.from({ length: numberOfRows }, () => ({
            rowIndex: 0,
            sheetName: "",
            cs: "",
            tinhTrang: "Bình thường",
            site: "",
            bong: "",
            bet: "",
            chuDe: "",
            linkOut: "",
            DR: "",
            keywords: "",
            trafficTool: "",
            noteKH: "",
            noteNB: "",
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
    const contextMenuCustomItems = useMemo(() => {
        return {
            delete_selected_rows: {
                name(this: any, selection: any[]) {
                    const mergedData = [...filteredData, ...newRows]
                    const rows = getRowsFromSelection(selection || this?.getSelected?.(), mergedData.length)
                    const count = rows.size || 0
                    return `Xóa ${count} dòng`
                },
                callback: (_key: string, selection: any[]) => {
                    handleDeleteRows(selection)
                },
            },
        }
    }, [filteredData, newRows, getRowsFromSelection, handleDeleteRows])

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
                    contextMenuOptions={{ showAddRow: false, showRemoveRow: false }}
                    contextMenuCustomItems={contextMenuCustomItems}
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
    }, [mappedColumns, nestedHeaders, handleAfterChange, handleBeforePaste, contextMenuCustomItems])

    // Show loading spinner when searching, loading, or refreshing
    const showLoading = isSearching || loading || refreshing

    return (
        <div className="relative">
            {/* Loading Overlay */}
            {showLoading && <LoadingSpinner />}
            
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
                                    onClick={handleSaveChanges}
                                    disabled={isSaving || pendingChanges.size === 0 || loading || refreshing}
                                    className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm font-medium text-sm"
                                >
                                    {isSaving ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Lưu dữ liệu {pendingChanges.size > 0 ? `(${pendingChanges.size})` : ""}
                                        </>
                                    )}
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

