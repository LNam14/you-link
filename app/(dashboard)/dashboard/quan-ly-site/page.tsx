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
    Eye,
    EyeOff,
    Globe,
} from "lucide-react"
import { toast } from "sonner"

type SearchType = "Site" | "NCC"
type CurrencyType = "USDT" | "VND"

// SiteData interface
interface SiteData {
    rowIndex: number
    sheetName: string
    cs: string
    site: string
    bong: string
    bet: string
    chuDe: string
    nuoc?: string
    ngay?: string
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
    tiGiaXGP?: string
    tiGiaXFooter?: string
    tiGiaHome?: string
    tiGiaHeader?: string
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
    const [duplicateSites, setDuplicateSites] = useState<{ [key: string]: SiteData[] }>({}) // Site trùng lặp theo domain
    const [searchInputDuplicates, setSearchInputDuplicates] = useState<
        Array<{ domain: string; count: number; examples: string[] }>
    >([]) // Site trùng lặp ngay trong ô tìm kiếm
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
    const [showTiGiaColumns, setShowTiGiaColumns] = useState<boolean>(false) // State để ẩn/hiện cột tiGia
    const mainTableRef = useRef<HotTableRef>(null)
    const duplicateTableRef = useRef<HotTableRef>(null) // Ref riêng cho duplicate table
    const selectionAnchorRef = useRef<{ row: number; col: number } | null>(null)
    const currencyConvertibleFields = useMemo(() => {
        // Chỉ convert các cột giá mua chính theo tỉ giá.
        // Các cột hoa hồng, lợi nhuận, chênh lệch... không bị ảnh hưởng khi đổi đơn vị hiển thị.
        return new Set<keyof SiteData>([
            "giaMuaGP",
            "giaMuaText",
            "giaMuaTextHome",
            "giaMuaTextHeader",
        ])
    }, [])

    const parsePureNumericInput = useCallback((value: unknown): number | null => {
        const cleaned = String(value ?? "").replace(",", ".").trim()
        if (!cleaned) return null
        if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null

        const parsed = Number.parseFloat(cleaned)
        return Number.isFinite(parsed) ? parsed : null
    }, [])

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
            site: siteValue,
            bong: "",
            bet: "",
            chuDe: "",
            nuoc: "",
            ngay: "",
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
            tiGiaXGP: "",
            tiGiaXFooter: "",
            tiGiaHome: "",
            tiGiaHeader: "",
        }
    }, [])

    // Apply currency conversion helper
    const applyCurrencyConversion = useCallback((dataToConvert: SiteData[]): SiteData[] => {
        return dataToConvert.map((item) => {
            const newItem = { ...item }
            if (selectedCurrency === "VND") {
                const rate = Number.parseFloat(exchangeRate)
                if (!isNaN(rate)) {
                    // Convert money fields (đơn vị gốc trong sheet là USDT).
                    // Lưu ý: chỉ convert các cột giá mua chính; hoa hồng, lợi nhuận, "Giá chênh lệch" (tiGia*) không convert theo tỉ giá.
                    const priceFields: Array<keyof SiteData> = [
                        "giaMuaGP",
                        "giaMuaText",
                        "giaMuaTextHome",
                        "giaMuaTextHeader",
                    ]
                    priceFields.forEach((field) => {
                        const numericValue = parsePureNumericInput(newItem[field])
                        if (numericValue === null) return
                        ;(newItem as any)[field] = (numericValue * rate).toString()
                    })
                }
            }
            return newItem
        })
    }, [selectedCurrency, exchangeRate, parsePureNumericInput])

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

                // Tính trùng lặp ngay trong input (giữ nguyên count theo domain đã normalize)
                const inputCountMap = new Map<string, { count: number; examples: Set<string> }>()
                rawTerms.forEach((rawTerm, idx) => {
                    const normalized = normalizedTerms[idx]
                    if (!normalized) return
                    const existing = inputCountMap.get(normalized)
                    if (existing) {
                        existing.count += 1
                        existing.examples.add(rawTerm)
                    } else {
                        inputCountMap.set(normalized, { count: 1, examples: new Set([rawTerm]) })
                    }
                })
                const inputDuplicates = Array.from(inputCountMap.entries())
                    .filter(([, info]) => info.count > 1)
                    .map(([domain, info]) => ({
                        domain,
                        count: info.count,
                        examples: Array.from(info.examples).slice(0, 5),
                    }))
                    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
                setSearchInputDuplicates(inputDuplicates)

                const siteMap = new Map<string, SiteData[]>() // Đổi thành array để lưu tất cả các site cùng domain

                // Map nhanh để lấy tất cả các site có cùng domain
                sourceData.forEach((item) => {
                    const key = normalizeUrl(item.site || "")
                    if (key) {
                        if (!siteMap.has(key)) {
                            siteMap.set(key, [])
                        }
                        siteMap.get(key)!.push(item)
                    }
                })

                // Duyệt theo thứ tự người dùng nhập để giữ nguyên thứ tự hiển thị
                let mainItems: SiteData[] = []
                let newDuplicateSites: { [key: string]: SiteData[] } = {}
                const seenDomains = new Set<string>()

                rawTerms.forEach((term, idx) => {
                    const normalizedTerm = normalizedTerms[idx]
                    if (normalizedTerm && seenDomains.has(normalizedTerm)) {
                        return
                    }
                    if (normalizedTerm) {
                        const matched = siteMap.get(normalizedTerm)
                        if (matched && matched.length > 0) {
                            if (matched.length === 1) {
                                // Chỉ có 1 site, thêm vào mainItems
                                mainItems.push(matched[0])
                            } else {
                                // Có nhiều site trùng, tìm site có giá thấp nhất
                                const priceField = "giaMuaGP" // Sử dụng GP làm tiêu chí so sánh giá

                                // Tìm tất cả giá hợp lệ (không phải 0 và không phải NaN)
                                const validPriceItems = matched.filter(item => {
                                    const price = Number.parseFloat((item as any)[priceField] || "0") || 0
                                    return price > 0 && !isNaN(price)
                                })

                                let minPriceItem: SiteData

                                if (validPriceItems.length > 0) {
                                    // Nếu có giá hợp lệ, chọn site có giá thấp nhất
                                    minPriceItem = validPriceItems.reduce((minItem, currentItem) => {
                                        const minPrice = Number.parseFloat((minItem as any)[priceField] || "0") || 0
                                        const currentPrice = Number.parseFloat((currentItem as any)[priceField] || "0") || 0
                                        return currentPrice < minPrice ? currentItem : minItem
                                    })
                                } else {
                                    // Nếu tất cả giá đều không hợp lệ, chọn site đầu tiên
                                    minPriceItem = matched[0]
                                }

                                // Thêm site có giá thấp nhất vào mainItems
                                mainItems.push(minPriceItem)

                                // Các site còn lại vào duplicateSites
                                const duplicates = matched.filter(item => item !== minPriceItem)
                                if (duplicates.length > 0) {
                                    newDuplicateSites[normalizedTerm] = duplicates
                                }
                            }
                            seenDomains.add(normalizedTerm)
                        } else {
                            // Không tìm thấy -> tạo dòng rỗng chỉ với site
                            mainItems.push(createPlaceholderRow(term))
                        }
                    } else {
                        // Term không hợp lệ
                        mainItems.push(createPlaceholderRow(term))
                    }
                })

                filtered = mainItems
                // Lưu duplicateSites để hiển thị ở table dưới (áp dụng chuyển đổi tiền tệ giống table chính)
                const convertedDuplicateSites = Object.fromEntries(
                    Object.entries(newDuplicateSites).map(([domain, sites]) => [
                        domain,
                        applyCurrencyConversion(sites),
                    ]),
                ) as { [key: string]: SiteData[] }
                setDuplicateSites(convertedDuplicateSites)
            } else {
                // Khi tìm theo NCC không dùng duplicate table -> clear để tránh giữ dữ liệu cũ
                setDuplicateSites({})
                setSearchInputDuplicates([])
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
                setDuplicateSites({})
                setHasSearched(false)
                // Xóa newRows khi search rỗng (reset)
                setNewRows([])
                setNewRowsSheetMap(new Map())
                return
            }

            const searchTerms = value.split(/[,\n\s]+/).filter((term) => term.trim() !== "")
            if (searchTerms.length === 0) {
                setFilteredData([])
                setDuplicateSites({})
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
            setDuplicateSites({})
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
                title: "Game",
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
                title: "Nước",
                data: "nuoc",
                width: 60,
                className: "htMiddle text-center",
                renderer: createCellRenderer(),
            },
            {
                title: "Ngày",
                data: "ngay",
                width: 60,
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
            // Chênh lệch giá group
            {
                title: "GP",
                data: "tiGiaXGP",
                width: 60,
                className: "htMiddle",
                renderer: createPriceRenderer("tiGiaXGP"),
            },
            {
                title: "Footer",
                data: "tiGiaXFooter",
                width: 70,
                className: "htMiddle",
                renderer: createPriceRenderer("tiGiaXFooter"),
            },
            {
                title: "Home",
                data: "tiGiaHome",
                width: 60,
                className: "htMiddle",
                renderer: createPriceRenderer("tiGiaHome"),
            },
            {
                title: "Header",
                data: "tiGiaHeader",
                width: 60,
                className: "htMiddle",
                renderer: createPriceRenderer("tiGiaHeader"),
            },
        ]

        return columns
    }, [createCellRenderer, createPriceRenderer])

    // Generate nested headers
    const generateNestedHeaders = useCallback((columns: any[]) => {
        const firstRow: Array<{ label: string; colspan: number }> = []
        const secondRow: string[] = []

        const infoCols = columns.slice(0, 11)
        const noteCols = columns.slice(11, 13)
        const giaCols = columns.slice(13, 17)
        const hoaHongCols = columns.slice(17, 19)
        const keThemCols = columns.slice(19, 21)
        const nccCols = columns.slice(21, 23)
        const tiGiaCols = columns.slice(23, 27)

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

        firstRow.push({ label: "Giá chênh lệch", colspan: tiGiaCols.length })
        tiGiaCols.forEach((col) => secondRow.push(col.title))

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

        // Tính toán bounding box của tất cả các selection
        let minRow = Number.POSITIVE_INFINITY,
            minCol = Number.POSITIVE_INFINITY,
            maxRow = Number.NEGATIVE_INFINITY,
            maxCol = Number.NEGATIVE_INFINITY
        
        // Normalize selection ranges
        const normalizedRanges: Array<[number, number, number, number]> = []
        selected.forEach((range: any) => {
            const [startRow, startCol, endRow, endCol] = range
            const rowStart = Math.min(startRow, endRow)
            const rowEnd = Math.max(startRow, endRow)
            const colStart = Math.min(startCol, endCol)
            const colEnd = Math.max(startCol, endCol)
            
            normalizedRanges.push([rowStart, colStart, rowEnd, colEnd])
            
            minRow = Math.min(minRow, rowStart)
            minCol = Math.min(minCol, colStart)
            maxRow = Math.max(maxRow, rowEnd)
            maxCol = Math.max(maxCol, colEnd)
        })

        const numRows = maxRow - minRow + 1
        const numCols = maxCol - minCol + 1
        const copiedDataArray: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(""))

        // Lấy dữ liệu từ tất cả các range đã chọn
        normalizedRanges.forEach(([rowStart, colStart, rowEnd, colEnd]) => {
            for (let r = rowStart; r <= rowEnd; r++) {
                for (let c = colStart; c <= colEnd; c++) {
                    // Sử dụng getDataAtCell để lấy giá trị thực tế từ data source
                    const cellValue = mainTableInstance.getDataAtCell(r, c)
                    const displayValue = cellValue !== null && cellValue !== undefined 
                        ? String(cellValue).trim() 
                        : ""
                    
                    // Tính toán vị trí trong mảng kết quả (relative to bounding box)
                    const relativeRow = r - minRow
                    const relativeCol = c - minCol
                    
                    // Đảm bảo vị trí hợp lệ
                    if (relativeRow >= 0 && relativeRow < numRows && 
                        relativeCol >= 0 && relativeCol < numCols) {
                        // Luôn ghi đè để đảm bảo tất cả các selection được copy
                        copiedDataArray[relativeRow][relativeCol] = displayValue
                    }
                }
            }
        })

        // Tạo chuỗi dữ liệu với tab separator
        const finalData = copiedDataArray.map((row) => row.join("\t")).join("\n")

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(finalData)
                toast.success(`Đã copy ${numRows} dòng, ${numCols} cột`)
            } else {
                const textArea = document.createElement("textarea")
                textArea.value = finalData
                textArea.style.position = "fixed"
                textArea.style.left = "-999999px"
                document.body.appendChild(textArea)
                textArea.select()
                document.execCommand("copy")
                document.body.removeChild(textArea)
                toast.success(`Đã copy ${numRows} dòng, ${numCols} cột`)
            }
        } catch (err) {
            console.error("Copy failed:", err)
            toast.error("Không thể copy dữ liệu")
        }
    }, [])

    // Copy danh sách site không có trong dữ liệu (mỗi site một dòng)
    const handleCopyMissingSites = useCallback(async () => {
        const missingSites = filteredData.filter(
            (item) => !item.sheetName && !!item.site,
        )
        
        if (missingSites.length === 0) {
            toast.warning("Không có site nào để copy")
            return
        }

        // Mỗi site trên một dòng để paste vào Google Sheets
        const sitesText = missingSites.map((item) => item.site).join("\n")

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(sitesText)
                toast.success(`Đã copy ${missingSites.length} site (mỗi site một dòng)`)
            } else {
                const textArea = document.createElement("textarea")
                textArea.value = sitesText
                textArea.style.position = "fixed"
                textArea.style.left = "-999999px"
                document.body.appendChild(textArea)
                textArea.select()
                document.execCommand("copy")
                document.body.removeChild(textArea)
                toast.success(`Đã copy ${missingSites.length} site (mỗi site một dòng)`)
            }
        } catch (err) {
            console.error("Copy failed:", err)
            toast.error("Không thể copy dữ liệu")
        }
    }, [filteredData])

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
            // Lấy thông tin user để gửi kèm trong request (format: username-fullname)
            const username = userInfo?.username || ""
            const fullname = userInfo?.fullname || ""
            const userDisplayName = `${username}-${fullname}`

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
                            username: userDisplayName, // Gửi username-fullname
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
                
                // Lấy thông tin user để gửi kèm trong request
                const username = userInfo?.username || ""
                const fullname = userInfo?.fullname || ""
                const userDisplayName = fullname ? `${username}-${fullname}` : username

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
                                username: userDisplayName, // Gửi username-fullname
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
    }, [userInfo])

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

                // Chỉ cho phép chỉnh sửa trong phạm vi kết quả tìm kiếm (filteredData) hoặc newRows
                // Duplicate sites được xử lý bởi handleDuplicateAfterChange riêng
                if (!isNewRow && row >= mergedData.length) {
                    console.warn(`[handleAfterChange] Chỉnh sửa ngoài phạm vi kết quả tìm kiếm bị bỏ qua (row ${row})`)
                    continue
                }

                const sheetNameForNewRow = isNewRow ? newRowsSheetMap.get(newRowIndex) : undefined

                const updates: Partial<SiteData> = {
                    [columnProp]: newValue,
                }

                let processedUpdates = { ...updates }
                if (selectedCurrency === "VND") {
                    const rate = Number.parseFloat(exchangeRate)
                    const field = columnProp as keyof SiteData
                    if (!isNaN(rate) && rate > 0 && currencyConvertibleFields.has(field)) {
                        const inputValue = String(newValue ?? "").trim()
                        if (inputValue !== "") {
                            const vndValue = parsePureNumericInput(inputValue)
                            if (vndValue !== null && vndValue !== 0) {
                                const usdtValue = Math.round(vndValue / rate)
                                ; (processedUpdates as any)[field] = usdtValue.toString()
                            }
                        }
                    }
                }

                if (isNewRow) {
                    if (!sheetNameForNewRow) {
                        console.warn(`[handleAfterChange] Missing sheetName for new row index ${newRowIndex}, skip save queue`)
                        continue
                    }

                    // UI: giữ đúng giá người dùng nhập (VND). Lưu: dùng giá đã quy đổi (USDT).
                    const uiRowData = { ...rowData, ...updates }
                    const savedRowData = { ...rowData, ...processedUpdates }
                    updatedNewRows[newRowIndex] = uiRowData
                    newRowsChanged = true

                    const key = `add-${sheetNameForNewRow}-${newRowIndex}`
                    updated.set(key, {
                        type: "add",
                        key,
                        sheetName: sheetNameForNewRow,
                        rowIndex: savedRowData.rowIndex,
                        rowData: savedRowData,
                    })
                } else {
                    // Xử lý cập nhật cho các dòng trong filteredData
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

    // Handler riêng cho duplicate table - chỉ xử lý các dòng trong duplicateSites
    const handleDuplicateAfterChange = useCallback((changes: any[] | null, source: string) => {
        if (source === "loadData") return
        if (!Array.isArray(changes) || changes.length === 0) return

        const allDuplicates = Object.values(duplicateSites).flat()
        
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

                // Lấy dữ liệu từ duplicateSites theo row index
                if (row < 0 || row >= allDuplicates.length) {
                    console.warn(`[handleDuplicateAfterChange] Row ${row} out of bounds for duplicate table`)
                    continue
                }

                const rowData = allDuplicates[row]
                if (!rowData) continue

                    const siteToFind = columnProp === "site" ? (oldValue || rowData.site) : rowData.site
                    if (!siteToFind || siteToFind.trim() === "") continue

                // Sử dụng rowIndex và sheetName trực tiếp từ duplicateSites
                const rowIndex = rowData.rowIndex
                const sheetName = rowData.sheetName
                    const maNCC = rowData.MaNCC || undefined

                // Validation: đảm bảo có đủ thông tin để cập nhật
                if (!rowIndex || rowIndex < 3 || !sheetName) {
                    console.warn(`[handleDuplicateAfterChange] Missing valid rowIndex or sheetName for duplicate site "${siteToFind}". Skipping queueing update.`)
                    continue
                }

                const updates: Partial<SiteData> = {
                    [columnProp]: newValue,
                }

                let processedUpdates = { ...updates }
                if (selectedCurrency === "VND") {
                    const rate = Number.parseFloat(exchangeRate)
                    const field = columnProp as keyof SiteData
                    if (!isNaN(rate) && rate > 0 && currencyConvertibleFields.has(field)) {
                        const inputValue = String(newValue ?? "").trim()
                        if (inputValue !== "") {
                            const vndValue = parsePureNumericInput(inputValue)
                            if (vndValue !== null && vndValue !== 0) {
                                const usdtValue = Math.round(vndValue / rate)
                                ; (processedUpdates as any)[field] = usdtValue.toString()
                            }
                        }
                    }
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

                // Cập nhật duplicateSites với dữ liệu mới
                setDuplicateSites((prev) => {
                    const updated = { ...prev }
                    // UI: khi đang ở VND, giữ nguyên giá người dùng nhập (VND).
                    // Lưu: đã được queue trong pendingChanges bằng processedUpdates (USDT).
                    const uiUpdates = selectedCurrency === "VND" ? updates : processedUpdates
                    for (const [domain, sites] of Object.entries(updated)) {
                        updated[domain] = sites.map(site =>
                            site.sheetName === rowData.sheetName &&
                            site.rowIndex === rowData.rowIndex &&
                            normalizeUrl(site.site) === normalizeUrl(rowData.site)
                                ? { ...site, ...uiUpdates }
                                : site
                        )
                    }
                    return updated
                })
            }

            return updated
        })
    }, [duplicateSites, mappedColumns, selectedCurrency, exchangeRate, normalizeUrl])

    // Save all queued changes to server
    const handleSaveChanges = useCallback(async () => {
        if (pendingChanges.size === 0) {
            toast.warning("Không có thay đổi nào cần lưu")
            return
        }

        // Hỏi xác nhận trước khi cập nhật
        const updateCount = Array.from(pendingChanges.values()).filter(change => change.type === "update").length
        const addCount = Array.from(pendingChanges.values()).filter(change => change.type === "add").length

        const confirmMessage = `Bạn có chắc chắn muốn lưu ${pendingChanges.size} thay đổi?` +
            (addCount > 0 ? `\n- Thêm ${addCount} dòng mới` : '') +
            (updateCount > 0 ? `\n- Cập nhật ${updateCount} dòng hiện có` : '') +
            `\n\nHành động này không thể hoàn tác!`

        const confirmed = window.confirm(confirmMessage)
        if (!confirmed) {
            toast.info("Đã hủy lưu dữ liệu")
            return
        }

        setIsSaving(true)
        try {
            const addedRowsRaw: SiteData[] = []
            const updatedRowsRaw: SiteData[] = []
            const newRowIndicesToRemove: number[] = []
            const updateDetailLines: string[] = []

            const toRawMoneyFieldsIfVnd = (row: SiteData): SiteData => {
                if (selectedCurrency !== "VND") return row
                const rate = Number.parseFloat(exchangeRate)
                if (!Number.isFinite(rate) || rate <= 0) return row

                const next = { ...row }
                for (const field of currencyConvertibleFields) {
                    const n = parsePureNumericInput((row as any)?.[field])
                    if (n === null) continue
                    ;(next as any)[field] = Math.round(n / rate).toString()
                }
                return next
            }

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

                // Khi đang hiển thị VND, `filteredData` đã bị convert để hiển thị.
                // Ưu tiên lấy dữ liệu gốc (USDT) từ `allData` để tránh nhân tỉ giá lại khi merge/cache.
                if (selectedCurrency === "VND") {
                    const matchAll = allData.find((item) => {
                        const itemKey = getRowKey(item.sheetName, item.rowIndex, item.site)
                        if (key && itemKey === key) return true
                        return normalizedSite && normalizeUrl(item.site || "") === normalizedSite
                    })
                    if (matchAll) return matchAll
                }

                const matchFiltered = filteredData.find((item) => {
                    const itemKey = getRowKey(item.sheetName, item.rowIndex, item.site)
                    if (key && itemKey === key) return true
                    return normalizedSite && normalizeUrl(item.site || "") === normalizedSite
                })
                if (matchFiltered) {
                    // `filteredData` là dữ liệu UI (có thể đã convert sang VND). Trước khi merge, đảm bảo dùng giá gốc USDT.
                    return toRawMoneyFieldsIfVnd(matchFiltered)
                }

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
                            site: site || "",
                            bong: "",
                            bet: "",
                            chuDe: "",
                            nuoc: "",
                            ngay: "",
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
                            MaNCC: maNCC || "",
                            tiGiaXGP: "",
                            tiGiaXFooter: "",
                            tiGiaHome: "",
                            tiGiaHeader: "",
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
            
            // Cập nhật state local với dữ liệu mới đã lưu thành công để hiển thị ngay
            if (addedRowsRaw.length > 0) {
                setLocalAddedRows(prev => [...prev, ...addedRowsRaw])
                // Thêm vào filteredData để hiển thị ngay lập tức
                setFilteredData(prev => {
                    // Tránh duplicate nếu đã có
                    const existingKeys = new Set(prev.map(r => getRowKey(r.sheetName, r.rowIndex, r.site)))
                    const uniqueNewRaw = addedRowsRaw.filter(r => !existingKeys.has(getRowKey(r.sheetName, r.rowIndex, r.site)))
                    const uniqueNewUi = applyCurrencyConversion(uniqueNewRaw)
                    return [...prev, ...uniqueNewUi]
                })
                setHasSearched(true)
            }
            
            if (updatedRowsRaw.length > 0) {
                setLocalUpdatedRows(prev => {
                    const next = new Map(prev)
                    updatedRowsRaw.forEach(row => {
                        const key = getRowKey(row.sheetName, row.rowIndex, row.site)
                        if (key) next.set(key, row)
                    })
                    return next
                })
            }
            
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
                    const token = localStorage.getItem("auth-token")
                    const headers: Record<string, string> = { "Content-Type": "application/json" }
                    if (token) headers.Authorization = `Bearer ${token}`

                    await fetch("/api/telegram/summary", {
                        method: "POST",
                        headers,
                        credentials: "include",
                        body: JSON.stringify({
                            addLines,
                            updateLines,
                            username: userInfo ? `${userInfo.username}-${userInfo.fullname}` : undefined,
                        }),
                    })
                }
            } catch (telegramError) {
                console.error("Telegram summary error:", telegramError)
            }

            // Tải lại dữ liệu ở background thay vì chờ đợi
            // Sử dụng catch để không crash nếu lỗi, và không await để không block UI
            refetch("", selectedSearchType, undefined, true)
                .catch((refreshError: any) => {
                    console.error("Background refresh after save failed:", refreshError)
                })

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
        selectedCurrency,
        exchangeRate,
        currencyConvertibleFields,
        parsePureNumericInput,
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
        const invalidRows: number[] = []

        rowsToDelete.forEach((rowIdx) => {
            if (rowIdx < filteredData.length) {
                // Xóa các dòng trong kết quả tìm kiếm (filteredData)
                const rowData = filteredData[rowIdx]
                if (rowData?.sheetName && rowData?.rowIndex && rowData.rowIndex >= 3) {
                    existingRows.push(rowData)
                }
            } else if (rowIdx < mergedData.length) {
                // Xóa newRows (chưa lưu)
                const newRowIdx = rowIdx - filteredData.length
                if (newRowIdx >= 0 && newRowIdx < newRows.length) {
                    newRowIndexes.push(newRowIdx)
                } else {
                    invalidRows.push(rowIdx)
                }
            } else {
                // Dòng này nằm ngoài phạm vi dữ liệu (duplicate sites được xử lý bởi handleDeleteDuplicateRows)
                invalidRows.push(rowIdx)
            }
        })

        if (invalidRows.length > 0) {
            console.warn(`[delete] Bỏ qua ${invalidRows.length} dòng nằm ngoài phạm vi kết quả tìm kiếm:`, invalidRows)
        }

        if (!existingRows.length && !newRowIndexes.length) {
            toast.warning("Không có dòng hợp lệ để xóa. Chỉ có thể xóa các dòng trong kết quả tìm kiếm và site trùng lặp.")
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

                // Gửi thông báo Telegram về việc xóa site (tương tự như khi chỉnh sửa)
                try {
                    const deleteLines = existingRows.map((row) => {
                        const site = row.site?.toString().trim() || "(trống)"
                        const traffic = row.trafficTool?.toString().trim()
                        const sheetInfo = row.sheetName ? ` (Sheet ${row.sheetName})` : ""
                        return traffic ? `${site} - Traffic ${traffic}${sheetInfo}` : `${site}${sheetInfo}`
                    })

                    if (deleteLines.length > 0) {
                        const token = localStorage.getItem("auth-token")
                        const headers: Record<string, string> = { "Content-Type": "application/json" }
                        if (token) headers.Authorization = `Bearer ${token}`

                        await fetch("/api/telegram/summary", {
                            method: "POST",
                            headers,
                            credentials: "include",
                            body: JSON.stringify({
                                deleteLines,
                                username: userInfo ? `${userInfo.username}-${userInfo.fullname}` : undefined,
                            }),
                        })
                    }
                } catch (telegramError) {
                    console.error("Telegram delete notification error:", telegramError)
                    // Không throw error để không ảnh hưởng đến quá trình xóa
                }
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

                // Cập nhật duplicateSites: loại bỏ các site đã xóa
                setDuplicateSites((prev) => {
                    const updated = { ...prev }
                    Object.keys(updated).forEach((domain) => {
                        updated[domain] = updated[domain].filter((item) => {
                            const key = getRowKey(item.sheetName, item.rowIndex, item.site)
                            return key && !removedKeys.has(key)
                        })
                        // Nếu không còn site trùng nào, xóa domain khỏi duplicateSites
                        if (updated[domain].length === 0) {
                            delete updated[domain]
                        }
                    })
                    return updated
                })
            }

            // Reload lại dữ liệu ở background (không await)
            if (hasSearched && searchTerm.trim() !== "") {
                refetch("", selectedSearchType, undefined, true)
                    .catch((refreshError: any) => {
                        console.error("Background refresh after delete failed:", refreshError)
                    })
            } else {
                refetch()
                    .catch((refreshError: any) => {
                        console.error("Background refresh after delete failed:", refreshError)
                    })
            }

            toast.success("Đã xóa dòng thành công")
        } catch (error: any) {
            console.error("Delete rows error:", error)
            toast.error(`Xóa dữ liệu thất bại: ${error?.message || "Không thể xóa"}`)
        } finally {
            setIsDeleting(false)
            setIsSearching(false)
        }
    }, [filteredData, newRows, newRowsSheetMap, selectedSearchType, getRowsFromSelection, getRowKey, hasSearched, searchTerm, refetch])

    // Handler xóa riêng cho duplicate table
    const handleDeleteDuplicateRows = useCallback(async (selectionOverride?: any[]) => {
        const hotInstance = duplicateTableRef.current?.hotInstance
        const allDuplicates = Object.values(duplicateSites).flat()

        if (!hotInstance || allDuplicates.length === 0) {
            toast.warning("Không có dữ liệu để xóa")
            return
        }

        const selection = selectionOverride || hotInstance.getSelected()
        if (!selection || selection.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một dòng để xóa")
            return
        }

        const rowsToDelete = getRowsFromSelection(selection, allDuplicates.length)
        console.log("[delete duplicate] raw selection:", selection)
        console.log("[delete duplicate] rowsToDelete:", Array.from(rowsToDelete))

        if (!rowsToDelete.size) {
            toast.warning("Không tìm thấy dòng hợp lệ để xóa")
            return
        }

        const existingRows: SiteData[] = []
        const invalidRows: number[] = []

        rowsToDelete.forEach((rowIdx) => {
            if (rowIdx >= 0 && rowIdx < allDuplicates.length) {
                const rowData = allDuplicates[rowIdx]
                if (rowData?.sheetName && rowData?.rowIndex && rowData.rowIndex >= 3) {
                    existingRows.push(rowData)
                } else {
                    invalidRows.push(rowIdx)
                }
            } else {
                invalidRows.push(rowIdx)
            }
        })

        if (invalidRows.length > 0) {
            console.warn(`[delete duplicate] Bỏ qua ${invalidRows.length} dòng không hợp lệ:`, invalidRows)
        }

        if (!existingRows.length) {
            toast.warning("Không có dòng hợp lệ để xóa")
            return
        }

        setIsDeleting(true)
        setIsSearching(true)
        try {
            console.log("[delete duplicate] deleting duplicate rows:", existingRows.map((r) => ({ sheetName: r.sheetName, rowIndex: r.rowIndex, site: r.site })))
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
                    console.log("[delete duplicate] api response:", { sheetName: row.sheetName, rowIndex: row.rowIndex, ok: response.ok, result })
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

            // Gửi thông báo Telegram về việc xóa site (tương tự như khi chỉnh sửa)
            try {
                const deleteLines = existingRows.map((row) => {
                    const site = row.site?.toString().trim() || "(trống)"
                    const traffic = row.trafficTool?.toString().trim()
                    const sheetInfo = row.sheetName ? ` (Sheet ${row.sheetName})` : ""
                    return traffic ? `${site} - Traffic ${traffic}${sheetInfo}` : `${site}${sheetInfo}`
                })

                if (deleteLines.length > 0) {
                    const token = localStorage.getItem("auth-token")
                    const headers: Record<string, string> = { "Content-Type": "application/json" }
                    if (token) headers.Authorization = `Bearer ${token}`

                    await fetch("/api/telegram/summary", {
                        method: "POST",
                        headers,
                        credentials: "include",
                        body: JSON.stringify({
                            deleteLines,
                            username: userInfo ? `${userInfo.username}-${userInfo.fullname}` : undefined,
                        }),
                    })
                }
            } catch (telegramError) {
                console.error("Telegram delete notification error:", telegramError)
                // Không throw error để không ảnh hưởng đến quá trình xóa
            }

            const removedKeys = new Set<string>()
            existingRows.forEach((row) => {
                const key = getRowKey(row.sheetName, row.rowIndex, row.site)
                if (key) removedKeys.add(key)
            })

            if (removedKeys.size) {
                // Cập nhật duplicateSites: loại bỏ các site đã xóa
                setDuplicateSites((prev) => {
                    const updated = { ...prev }
                    Object.keys(updated).forEach((domain) => {
                        updated[domain] = updated[domain].filter((item) => {
                            const key = getRowKey(item.sheetName, item.rowIndex, item.site)
                            return key && !removedKeys.has(key)
                        })
                        // Nếu không còn site trùng nào, xóa domain khỏi duplicateSites
                        if (updated[domain].length === 0) {
                            delete updated[domain]
                        }
                    })
                    return updated
                })
            }

            // Reload lại dữ liệu ở background (không await)
            if (hasSearched && searchTerm.trim() !== "") {
                refetch("", selectedSearchType, undefined, true)
                    .catch((refreshError: any) => {
                        console.error("Background refresh after delete duplicate failed:", refreshError)
                    })
            } else {
                refetch()
                    .catch((refreshError: any) => {
                        console.error("Background refresh after delete duplicate failed:", refreshError)
                    })
            }

            toast.success("Đã xóa dòng thành công")
        } catch (error: any) {
            console.error("Delete duplicate rows error:", error)
            toast.error(`Xóa dữ liệu thất bại: ${error?.message || "Không thể xóa"}`)
        } finally {
            setIsDeleting(false)
            setIsSearching(false)
        }
    }, [duplicateSites, getRowsFromSelection, getRowKey, hasSearched, searchTerm, refetch, selectedSearchType])

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
        
       
        const newRows: SiteData[] = Array.from({ length: numberOfRows }, () => ({
            rowIndex: 0,
            sheetName: "",
            cs: "",
            site: "",
            bong: "",
            bet: "",
            chuDe: "",
            nuoc: "",
            ngay: "",
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
            tiGiaXGP: "",
            tiGiaXFooter: "",
            tiGiaHome: "",
            tiGiaHeader: "",
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

    // Handle before copy - đảm bảo copy đúng tất cả các cột đã chọn
    const handleBeforeCopy = useCallback((data: string[][], coords: any[]) => {
        const mainTableInstance = mainTableRef.current?.hotInstance
        if (!mainTableInstance) return

        const selected = mainTableInstance.getSelected()
        if (!selected || selected.length === 0) return

        if (selected.length === 1) return

        // Tính toán bounding box của tất cả các selection
        let minRow = Number.POSITIVE_INFINITY,
            minCol = Number.POSITIVE_INFINITY,
            maxRow = Number.NEGATIVE_INFINITY,
            maxCol = Number.NEGATIVE_INFINITY
        
        const normalizedRanges: Array<[number, number, number, number]> = []
        selected.forEach((range: any) => {
            const [startRow, startCol, endRow, endCol] = range
            const rowStart = Math.min(startRow, endRow)
            const rowEnd = Math.max(startRow, endRow)
            const colStart = Math.min(startCol, endCol)
            const colEnd = Math.max(startCol, endCol)
            
            normalizedRanges.push([rowStart, colStart, rowEnd, colEnd])
            
            minRow = Math.min(minRow, rowStart)
            minCol = Math.min(minCol, colStart)
            maxRow = Math.max(maxRow, rowEnd)
            maxCol = Math.max(maxCol, colEnd)
        })

        const numRows = maxRow - minRow + 1
        const numCols = maxCol - minCol + 1
        const copiedDataArray: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(""))

        // Lấy dữ liệu từ tất cả các range đã chọn
        normalizedRanges.forEach(([rowStart, colStart, rowEnd, colEnd]) => {
            for (let r = rowStart; r <= rowEnd; r++) {
                for (let c = colStart; c <= colEnd; c++) {
                    const cellValue = mainTableInstance.getDataAtCell(r, c)
                    const displayValue = cellValue !== null && cellValue !== undefined 
                        ? String(cellValue).trim() 
                        : ""
                    
                    const relativeRow = r - minRow
                    const relativeCol = c - minCol
                    
                    if (relativeRow >= 0 && relativeRow < numRows && 
                        relativeCol >= 0 && relativeCol < numCols) {
                        copiedDataArray[relativeRow][relativeCol] = displayValue
                    }
                }
            }
        })

        // Cập nhật data array để Handsontable copy đúng
        data.length = 0
        copiedDataArray.forEach((row) => {
            data.push([...row])
        })
    }, [])

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

                    // Đếm số dòng hợp lệ để xóa (chỉ trong filteredData hoặc newRows)
                    let validCount = 0
                    rows.forEach((rowIdx) => {
                        if (rowIdx < filteredData.length) {
                            // Dòng trong filteredData - hợp lệ
                            validCount++
                        } else if (rowIdx < mergedData.length) {
                            // Dòng trong newRows - hợp lệ
                            const newRowIdx = rowIdx - filteredData.length
                            if (newRowIdx >= 0 && newRowIdx < newRows.length) {
                                validCount++
                            }
                        }
                        // Dòng ngoài phạm vi - không hợp lệ
                    })

                    if (validCount === 0) {
                        return "Không thể xóa (ngoài phạm vi tìm kiếm)"
                    }

                    return `Xóa ${validCount} dòng`
                },
                callback: (_key: string, selection: any[]) => {
                    handleDeleteRows(selection)
                },
                disabled: function(this: any, selection: any[]) {
                    const mergedData = [...filteredData, ...newRows]
                    const rows = getRowsFromSelection(selection || this?.getSelected?.(), mergedData.length)

                    // Kiểm tra xem có ít nhất một dòng hợp lệ để xóa không
                    for (const rowIdx of rows) {
                        if (rowIdx < filteredData.length) {
                            // Dòng trong filteredData - hợp lệ
                            return false
                        } else if (rowIdx < mergedData.length) {
                            // Dòng trong newRows - hợp lệ
                            const newRowIdx = rowIdx - filteredData.length
                            if (newRowIdx >= 0 && newRowIdx < newRows.length) {
                                return false
                            }
                        }
                    }
                    return true // Tất cả dòng đều không hợp lệ
                }
            },
        }
    }, [filteredData, newRows, getRowsFromSelection, handleDeleteRows])

    // Context menu riêng cho duplicate table
    const duplicateContextMenuCustomItems = useMemo(() => {
        return {
            delete_selected_rows: {
                name(this: any, selection: any[]) {
                    const allDuplicates = Object.values(duplicateSites).flat()
                    const rows = getRowsFromSelection(selection || this?.getSelected?.(), allDuplicates.length)

                    // Đếm số dòng hợp lệ để xóa
                    let validCount = 0
                    rows.forEach((rowIdx) => {
                        if (rowIdx >= 0 && rowIdx < allDuplicates.length) {
                            validCount++
                        }
                    })

                    if (validCount === 0) {
                        return "Không thể xóa"
                    }

                    return `Xóa ${validCount} dòng`
                },
                callback: (_key: string, selection: any[]) => {
                    handleDeleteDuplicateRows(selection)
                },
                disabled: function(this: any, selection: any[]) {
                    const allDuplicates = Object.values(duplicateSites).flat()
                    const rows = getRowsFromSelection(selection || this?.getSelected?.(), allDuplicates.length)

                    // Kiểm tra xem có ít nhất một dòng hợp lệ để xóa không
                    for (const rowIdx of rows) {
                        if (rowIdx >= 0 && rowIdx < allDuplicates.length) {
                            return false
                        }
                    }
                    return true // Tất cả dòng đều không hợp lệ
                }
            },
        }
    }, [duplicateSites, getRowsFromSelection, handleDeleteDuplicateRows])

    const renderHotTable = useCallback((data: SiteData[], options?: { 
        ref?: React.RefObject<HotTableRef | null>, 
        onAfterChange?: (changes: any[] | null, source: string) => void,
        key?: string,
        contextMenuCustomItems?: Record<string, any>
    }) => {
        if (!data || data.length === 0) return null

        const tableRef = options?.ref || mainTableRef
        const onAfterChangeHandler = options?.onAfterChange || handleAfterChange
        const tableKey = options?.key || "quan-ly-site"
        const customContextMenu = options?.contextMenuCustomItems || contextMenuCustomItems

        return (
            <div className="w-full">
                <HotTableComponent
                    ref={tableRef}
                    key={tableKey}
                    data={data}
                    columns={mappedColumns}
                    nestedHeaders={nestedHeaders}
                    contextMenuOptions={{ showAddRow: false, showRemoveRow: false }}
                    contextMenuCustomItems={customContextMenu}
                    height="auto"
                    width="100%"
                    licenseKey="non-commercial-and-evaluation"
                    stretchH="all"
                    autoWrapRow={true}
                    rowHeaders={false}
                    colHeaders={true}
                    copyPaste={true}
                    hiddenColumns={showTiGiaColumns ? [2,3] : [2, 3, 23, 24, 25, 26]}
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
                    onAfterChange={onAfterChangeHandler}
                    beforeCopy={handleBeforeCopy}
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
    }, [mappedColumns, nestedHeaders, handleAfterChange, handleBeforeCopy, handleBeforePaste, contextMenuCustomItems, showTiGiaColumns])

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
                                className="text-sm sm:text-base w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-48 text-gray-700 placeholder-gray-400 bg-white shadow-sm resize-none overflow-y-auto"
                            />
                            <div className="absolute right-3 top-3 flex items-center gap-2">
                                <button
                                    onClick={handleOpenModal}
                                    className="cursor-pointer flex items-center gap-2 px-3 py-2 sm:px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                                    aria-label="Thêm dữ liệu"
                                    title="Thêm dữ liệu"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden sm:inline">Thêm dữ liệu</span>
                                </button>
                                <button
                                    onClick={handleSaveChanges}
                                    disabled={isSaving || pendingChanges.size === 0 || loading || refreshing}
                                    className="cursor-pointer flex items-center gap-2 px-3 py-2 sm:px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm font-medium text-sm"
                                    aria-label={
                                        isSaving
                                            ? "Đang lưu dữ liệu"
                                            : `Lưu dữ liệu${pendingChanges.size > 0 ? ` (${pendingChanges.size})` : ""}`
                                    }
                                    title={
                                        isSaving
                                            ? "Đang lưu dữ liệu"
                                            : `Lưu dữ liệu${pendingChanges.size > 0 ? ` (${pendingChanges.size})` : ""}`
                                    }
                                >
                                    {isSaving ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            <span className="hidden sm:inline">Đang lưu...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            <span className="hidden sm:inline">
                                                Lưu dữ liệu {pendingChanges.size > 0 ? `(${pendingChanges.size})` : ""}
                                            </span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowTiGiaColumns(!showTiGiaColumns)}
                                    className="cursor-pointer flex items-center gap-2 px-3 py-2 sm:px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm font-medium text-sm"
                                    title={showTiGiaColumns ? "Ẩn cột chênh lệch giá" : "Hiện cột chênh lệch giá"}
                                    aria-label={showTiGiaColumns ? "Ẩn cột chênh lệch giá" : "Hiện cột chênh lệch giá"}
                                >
                                    {showTiGiaColumns ? (
                                        <>
                                            <EyeOff className="h-4 w-4" />
                                            <span className="hidden sm:inline">Ẩn chênh lệch</span>
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="h-4 w-4" />
                                            <span className="hidden sm:inline">Hiện chênh lệch</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleSearchClick}
                                    disabled={loading || refreshing || isSearching}
                                    className="cursor-pointer flex items-center gap-2 px-3 py-2 sm:px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm"
                                    aria-label={isSearching ? "Đang tìm kiếm" : "Tìm kiếm"}
                                    title={isSearching ? "Đang tìm kiếm" : "Tìm kiếm"}
                                >
                                    {isSearching ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            <span className="hidden sm:inline">Đang tìm kiếm</span>
                                        </>
                                    ) : (
                                        <>
                                    <Search className="h-4 w-4" />
                                    <span className="hidden sm:inline">Tìm kiếm</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Trùng lặp ngay trong danh sách site nhập vào ô tìm kiếm (hiển thị gọn dưới ô nhập) */}
                        {selectedSearchType === "Site" && searchInputDuplicates.length > 0 && (
                            <div className="mt-2">
                                <div className="text-[11px] sm:text-xs text-amber-800/90">
                                    Trùng trong ô tìm kiếm:
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1.5 max-h-16 overflow-auto">
                                    {searchInputDuplicates.map((d) => (
                                        <span
                                            key={d.domain}
                                            className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[11px] sm:text-xs font-medium"
                                            title={
                                                d.examples.length > 0
                                                    ? `Ví dụ: ${d.examples.join(", ")}`
                                                    : undefined
                                            }
                                        >
                                            <span className="max-w-[220px] sm:max-w-[340px] truncate">
                                                {d.domain}
                                            </span>
                                            <span className="text-amber-900/80">x{d.count}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table Display */}
            {(() => {
                // Merge filteredData và newRows để hiển thị
                const mergedData = [...filteredData, ...newRows]
                const hasData = mergedData.length > 0
                const hasDuplicates = Object.keys(duplicateSites).length > 0
                const duplicatesCount = Object.values(duplicateSites).flat().length

                // Danh sách các site không có trong dữ liệu (không được API trả về)
                const missingSites = filteredData.filter(
                    (item) => !item.sheetName && !!item.site,
                )
                const hasMissingSites = missingSites.length > 0

                if ((hasSearched || newRows.length > 0) && hasData) {
                    return (
                        <div className="w-full">
                            {/* Main Results Table */}
                            <div className="bg-white mt-4">
                                {renderHotTable(mergedData)}
                            </div>

                            {/* Danh sách site không có trong dữ liệu / không được API trả về */}
                            {hasMissingSites && (
                                <div className="mt-6 border-t border-gray-200 pt-4">
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                            <div className="flex-shrink-0 mr-0 sm:mr-3 p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-md self-start">
                                                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3 mb-1">
                                                    <h3 className="text-base sm:text-lg font-500 text-gray-800">
                                                        Site không có trong dữ liệu 
                                                    </h3>
                                                    <button
                                                        onClick={handleCopyMissingSites}
                                                        className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-xs sm:text-sm flex-shrink-0"
                                                        title="Copy danh sách site (mỗi site một dòng)"
                                                    >
                                                        <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                        <span className="hidden sm:inline">Copy</span>
                                                    </button>
                                                </div>
                                                <p className="text-xs sm:text-sm text-gray-600 break-words">
                                                    Các domain dưới đây không tồn tại trong dữ liệu hiện tại, bạn có
                                                    thể dùng thông tin này để kiểm tra hoặc thêm mới vào sheet nếu cần.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-blue-200/60 max-h-40 overflow-auto">
                                            <div className="flex flex-wrap gap-2">
                                                {missingSites.map((item, index) => (
                                                    <span
                                                        key={`${item.site}-${index}`}
                                                        className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium"
                                                    >
                                                        {item.site}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Enhanced Duplicates Table */}
                            {hasDuplicates && (
                                <div className="mt-8 border-t-2 border-gray-200 pt-6">
                                    <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 mb-4 shadow-sm">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                            <div className="flex-shrink-0 mr-0 sm:mr-3 p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-md self-start">
                                                <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-base sm:text-lg font-500 text-gray-800 mb-1">Site trùng lặp</h3>
                                                <p className="text-xs sm:text-sm text-gray-600 break-words">
                                                    Hiển thị {duplicatesCount} site có cùng domain nhưng giá khác nhau.
                                                    <span className="text-orange-600 font-medium ml-1 block sm:inline">
                                                        Site có giá thấp nhất đã được hiển thị ở bảng chính.
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white">
                                        {renderHotTable(Object.values(duplicateSites).flat(), {
                                            ref: duplicateTableRef,
                                            onAfterChange: handleDuplicateAfterChange,
                                            key: "duplicate-sites-table",
                                            contextMenuCustomItems: duplicateContextMenuCustomItems
                                        })}
                                    </div>
                                </div>
                            )}
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
