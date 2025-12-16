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
    Check,
    MessageSquare,
    X,
    RefreshCw,
    DollarSign,
    CreditCard,
    Coins,
    Globe,
    User,
    Inbox,
    EyeOff,
    Eye,
    Copy,
    Filter,
    Calendar,
    TrendingUp,
    AlignLeft,
    Ticket,
    Undo2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"

// Update the SiteData interface to handle arrays for FileNCC and GroupNCC
interface SiteData {
    cs: string
    tinhTrang: string
    site: string
    bong: string
    bet: string
    chuDe: string
    linkOut: string
    DR: string
    trafficTool: string
    ghiChu: string
    giaBanGP: string
    giaBanText: string
    giaBanTextHome: string
    giaBanTextHeader: string
    giaBanGPLio: string
    giaBanTextLio: string
    giaBanTextHomeLio: string
    giaBanTextHeaderLio: string
    giaMuaGP: string
    giaMuaText: string
    giaMuaTextHome: string
    giaMuaTextHeader: string
    hoaHongGP: string
    hoaHongText: string
    giaCuoiGP: string
    giaCuoiText: string
    giaCuoiTextHome: string
    giaCuoiTextHeader: string
    loiNhuanGP: string
    loiNhuanText: string
    loiNhuanTextHome: string
    loiNhuanTextHeader: string
    loiNhuanGPLio: string
    loiNhuanTextLio: string
    loiNhuanTextHomeLio: string
    loiNhuanTextHeaderLio: string
    NCC: string
    MaNCC: string
    FileNCC: string[] | string
    GroupNCC: string[] | string
    GhiChuNCC: string
    timeText: string
    IdGroup?: string | number | null
}

type PriceType = "GP" | "Text" | "TextHome" | "TextHeader"
type BrandType = "F" | "X"
type CurrencyType = "USDT" | "VND"
type SearchType = "Site" | "NCC"

// Add type definition for renderer function
type RendererFunction = (
    instance: Handsontable,
    td: HTMLTableCellElement,
    row: number,
    col: number,
    prop: string | number,
    value: any,
    cellProperties?: Handsontable.CellMeta,
    ) => HTMLTableCellElement

const normalizeIdGroup = (value: SiteData["IdGroup"]): string => {
    if (value === undefined || value === null) return ""
    if (typeof value === "string") return value.trim()
    if (typeof value === "number") return value.toString().trim()

    try {
        return String(value).trim()
    } catch {
        return ""
    }
}

export default function PageBody() {
    const [filteredData, setFilteredData] = useState<SiteData[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [hasSearched, setHasSearched] = useState(false)
    const [isSearching, setIsSearching] = useState(false) // State để track khi đang tìm kiếm
    const [searchCompleted, setSearchCompleted] = useState(false) // State để track khi search đã hoàn thành
    const [selectedPriceType, setSelectedPriceType] = useState<PriceType>("GP")
    const [selectedBrand, setSelectedBrand] = useState<BrandType>("F")
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>("USDT")
    const [exchangeRate, setExchangeRate] = useState<string>("28")
    const [selectedSearchType, setSelectedSearchType] = useState<SearchType>("Site")
    const [duplicateSites, setDuplicateSites] = useState<{ [key: string]: SiteData[] }>({})
    const [showDirectMessageModal, setShowDirectMessageModal] = useState(false)
    const [showNccSelectionModal, setShowNccSelectionModal] = useState(false)
    const [selectedNCCs, setSelectedNCCs] = useState<Set<string>>(new Set())
    const [nccList, setNccList] = useState<Array<{ id: string; name: string }>>([])
    const [showDuplicates, setShowDuplicates] = useState(true)
    const [sendingMessage, setSendingMessage] = useState(false) // Loading state riêng cho việc gửi tin nhắn
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState<{ [key: string]: string | undefined }>({})
    const [selectedTopics, setSelectedTopics] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [localData, setLocalData] = useState<SiteData[]>([]) // Dữ liệu đã tải vào table
    const [dataLoaded, setDataLoaded] = useState(false) // Flag để biết đã tải dữ liệu chưa
    const mainTableRef = useRef<HotTableRef>(null)
    const duplicatesTableRef = useRef<HotTableRef>(null)
    const selectionAnchorRef = useRef<{ row: number; col: number } | null>(null)

    // Sử dụng hook tối ưu để fetch và cache dữ liệu
    const { data: toolData, loading, refreshing, refetch, isStale } = useSheetToolData(false) // Không auto-fetch
    const allData = toolData?.gpTextVN || []
    
    // Dữ liệu để tìm kiếm và lọc - sử dụng localData nếu đã tải,否则 dùng allData từ API
    const searchableData = dataLoaded && localData.length > 0 ? localData : allData
    
    // Lấy thông tin user từ auth hook
    const { user: userInfo } = useAuth()
    
    // Sử dụng HeaderContext để set header
    const { setHeaderData } = useHeader()

    // Fetch dữ liệu mới khi user click refresh - memoized
    const fetchData = useCallback(async () => {
        await refetch()
        // Note: After refresh, user needs to click search button again to search
    }, [refetch])

    // Hàm tải dữ liệu vào table
    const handleLoadData = useCallback(async () => {
        setIsSearching(true)
        setHasSearched(false)
        setSearchCompleted(false)
        isLoadingDataRef.current = true // Đánh dấu đang tải dữ liệu
        try {
            // Gọi API để lấy toàn bộ dữ liệu (không có search term và filter)
            // Truyền forceLoadAll = true để cho phép fetch khi không có search term
            // Không force refresh để sử dụng cache và tăng tốc độ
            await refetch("", selectedSearchType, undefined, true)
            // Dữ liệu sẽ được lưu vào allData và sau đó vào localData qua useEffect
        } catch (error) {
            console.error("Error loading data:", error)
            setIsSearching(false)
            isLoadingDataRef.current = false // Reset flag nếu có lỗi
        }
    }, [refetch, selectedSearchType])

    // Track khi đang tải dữ liệu từ nút "Tải dữ liệu"
    const isLoadingDataRef = useRef(false)

    // Lưu dữ liệu vào localData khi allData được fetch từ nút "Tải dữ liệu"
    useEffect(() => {
        // Kiểm tra nếu đây là kết quả từ nút "Tải dữ liệu"
        if (isLoadingDataRef.current && allData && allData.length > 0 && !loading && !refreshing) {
            // Đây là kết quả từ nút "Tải dữ liệu"
            setLocalData([...allData])
            setDataLoaded(true)
            setIsSearching(false)
            setHasSearched(true)
            setSearchCompleted(true)
            isLoadingDataRef.current = false // Reset flag
            // Hiển thị dữ liệu ngay khi tải xong
            if (applySearchAndFiltersRef.current) {
                applySearchAndFiltersRef.current("")
            }
        }
    }, [allData, loading, refreshing])

    // Set header với title và custom controls - memoized để tránh re-render không cần thiết
    useEffect(() => {
        setHeaderData({
            title: "Tool Check Site",
            subTitle: "Tìm kiếm và kiểm tra thông tin site, giá cả và nhà cung cấp",
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
                brand: {
                    value: selectedBrand,
                    onBrandChange: (brand) => setSelectedBrand(brand),
                },
            },
            refreshButton: true,
        })
    }, [selectedSearchType, selectedCurrency, selectedBrand, exchangeRate, loading, refreshing, isStale, setHeaderData, fetchData])

    // Add click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            const isClickInsideTable = target.closest(".handsontable")
            const isClickOnMobileCopy = target.closest("#mobile-copy-btn")

            if (!isClickInsideTable && !isClickOnMobileCopy) {
                // Clear selection for main table
                const mainTableInstance = mainTableRef.current?.hotInstance
                if (mainTableInstance) {
                    mainTableInstance.deselectCell()
                }

                // Clear selection for duplicates table
                const duplicatesTableInstance = duplicatesTableRef.current?.hotInstance
                if (duplicatesTableInstance) {
                    duplicatesTableInstance.deselectCell()
                }
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])


    // Note: Removed auto-search on data load - user must click search button

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

    // Normalize URL for comparison - memoized outside component
    const normalizeUrl = useCallback((url: string): string => {
        if (!url || typeof url !== "string") return ""

        // Remove protocol (http://, https://, ftp://, etc.)
        let normalized = url.replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//, "")

        // Remove www. prefix if present
        normalized = normalized.replace(/^www\./, "")

        // Remove trailing slashes and paths
        normalized = normalized.replace(/\/.*$/, "")

        // Remove port numbers
        normalized = normalized.replace(/:\d+$/, "")

        // Convert to lowercase for case-insensitive comparison
        normalized = normalized.toLowerCase().trim()

        return normalized
    }, [])

    // Function to check if a site matches any of the search terms and return the normalized value if it does
    const itemMatchesSearch = useCallback(
        (item: SiteData, searchTerms: string[]): string | false => {
            const searchField = selectedSearchType === "Site" ? item.site : item.MaNCC

            if (!searchField) return false

            if (selectedSearchType === "Site") {
                const normalizedSite = normalizeUrl(searchField)
                if (!normalizedSite) return false

                for (const term of searchTerms) {
                    const trimmedTerm = term.trim()
                    if (!trimmedTerm) continue

                    const normalizedTerm = normalizeUrl(trimmedTerm)
                    if (!normalizedTerm) continue

                    // Exact match for normalized domains
                    if (normalizedSite === normalizedTerm) {
                        return normalizedSite
                    }
                }
            } else {
                // For NCC search: tìm trong cả MaNCC (mã NCC) và NCC (tên NCC)
                const normalizedMaNCC = String(item.MaNCC || "").toUpperCase().trim()
                const normalizedNCC = String(item.NCC || "").toUpperCase().trim()

                for (const term of searchTerms) {
                    const trimmedTerm = term.trim()
                    if (!trimmedTerm) continue

                    const normalizedTerm = trimmedTerm.toUpperCase().trim()
                    if (!normalizedTerm) continue // Không tìm nếu term rỗng

                    // Chỉ match chính xác hoặc bắt đầu với từ khóa (không dùng includes để tránh match quá rộng)
                    // Ví dụ: "0A" chỉ match với "0A" hoặc "0A123", không match với "10A" hay "20A"
                    const matchMaNCC = normalizedMaNCC && (
                        normalizedMaNCC === normalizedTerm || 
                        normalizedMaNCC.startsWith(normalizedTerm)
                    )
                    const matchNCC = normalizedNCC && (
                        normalizedNCC === normalizedTerm || 
                        normalizedNCC.startsWith(normalizedTerm)
                    )
                    
                    if (matchMaNCC || matchNCC) {
                        return normalizedMaNCC || normalizedNCC
                    }
                }
            }

            return false
        },
        [selectedSearchType],
    )

    // Debounce function to prevent too many searches while typing
    const debounce = (func: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout
        return (...args: any) => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => func(...args), delay)
        }
    }

    // Filter handlers
    const handleFilterChange = useCallback((filterName: string, value: string) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            [filterName]: value === "" ? undefined : value,
        }))
    }, [])

    const handleTopicSelection = useCallback((topic: string) => {
        setSelectedTopics((prevTopics) => {
            const isSelected = prevTopics.includes(topic)
            const newTopics = isSelected
                ? prevTopics.filter((t) => t !== topic)
                : [...prevTopics, topic]
            
            // Update filters
            setFilters((prevFilters) => ({
                ...prevFilters,
                "Chủ đề": newTopics.length > 0 ? newTopics.join(",") : undefined,
            }))
            
            return newTopics
        })
    }, [])

    const resetFilters = useCallback(() => {
        setFilters({})
        setSelectedTopics([])
        // Clear results if no search term
        if (!searchTerm || !searchTerm.trim()) {
            setFilteredData([])
            setDuplicateSites({})
            setHasSearched(false)
            setSearchCompleted(false)
        } else {
            // Re-apply search without filters
            if (applySearchAndFiltersRef.current) {
                applySearchAndFiltersRef.current(searchTerm)
            }
        }
    }, [searchTerm])

    // Use ref to store latest applySearchAndFilters function
    const applySearchAndFiltersRef = useRef<((searchValue: string) => void) | null>(null)

    // Combined function to apply both search and filters
    // Sử dụng localData nếu đã tải, otherwise dùng allData từ API
    const applySearchAndFilters = useCallback((searchValue: string) => {
        // Sử dụng localData nếu đã tải, nếu không dùng allData
        const dataSource = dataLoaded && localData.length > 0 ? localData : searchableData
        
        if (!dataSource || dataSource.length === 0) {
            setFilteredData([])
            setDuplicateSites({})
            setHasSearched(false)
            setSearchCompleted(false)
            setIsSearching(false)
            return
        }

        // Start with data source
        let dataToProcess: SiteData[] = []

        // Check if we have active filters
        const hasActiveFilters = Object.keys(filters).some(key => filters[key] !== undefined && filters[key] !== "")
        const hasSearchTerm = searchValue && searchValue.trim().length > 0

        // If no search term and no filters, show all data
        if (!hasSearchTerm && !hasActiveFilters) {
            dataToProcess = [...dataSource]
        } else {
            // Apply search first if has search term
            if (hasSearchTerm) {
                const searchTerms = searchValue.split(/[,\n\s]+/).filter((term) => term.trim() !== "")
                if (searchTerms.length === 0) {
                    setFilteredData([])
                    setDuplicateSites({})
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
                    setDuplicateSites({})
                    setHasSearched(true)
                    setSearchCompleted(true)
                    setIsSearching(false)
                    return
                }

                // Collect matching items - giữ thứ tự tìm kiếm
                // Không loại bỏ site trùng ở đây, để xử lý sau khi group theo site
                validTerms.forEach((term) => {
                    const matchingItems = dataSource.filter((item) => {
                        if (selectedSearchType === "Site") {
                            const normalizedSite = normalizeUrl(item.site)
                            return normalizedSite === term
                        } else {
                            const normalizedTerm = term.toUpperCase().trim()
                            if (!normalizedTerm) return false
                            
                            const normalizedMaNCC = String(item.MaNCC || "").toUpperCase().trim()
                            const normalizedNCC = String(item.NCC || "").toUpperCase().trim()
                            
                            const matchMaNCC = normalizedMaNCC && (
                                normalizedMaNCC === normalizedTerm || 
                                normalizedMaNCC.startsWith(normalizedTerm)
                            )
                            const matchNCC = normalizedNCC && (
                                normalizedNCC === normalizedTerm || 
                                normalizedNCC.startsWith(normalizedTerm)
                            )
                            
                            return matchMaNCC || matchNCC
                        }
                    })
                    
                    // Thêm tất cả items match vào kết quả (không loại bỏ trùng ở đây)
                    dataToProcess.push(...matchingItems)
                })
            } else {
                // No search term, use all data
                dataToProcess = [...dataSource]
            }

            // Apply filters if any
            if (hasActiveFilters) {
                const filterFn = itemMatchesFiltersRef.current
                if (filterFn) {
                    dataToProcess = dataToProcess.filter(item => filterFn(item))
                }
            }
        }

        // Sort by selected price type if searching by Site - chỉ sort khi không có search term (giữ thứ tự tìm kiếm)
        // Khi có search term, giữ nguyên thứ tự tìm kiếm
        if (selectedSearchType === "Site" && !hasSearchTerm) {
            const getPriceColumnFn = getPriceColumnDataRef.current
            if (getPriceColumnFn) {
                const priceField = getPriceColumnFn(selectedPriceType, selectedBrand, "giaMua")
                // Pre-calculate price values to avoid repeated function calls during sort
                const itemsWithPrice = dataToProcess.map(item => ({
                    item,
                    price: Number.parseFloat((item as any)[priceField]) || 0
                }))
                
                itemsWithPrice.sort((a, b) => {
                    const isNumericA = !isNaN(a.price) && a.price !== 0
                    const isNumericB = !isNaN(b.price) && b.price !== 0
                    if (isNumericA && isNumericB) return a.price - b.price
                    if (isNumericA) return -1
                    if (isNumericB) return 1
                    return 0
                })
                
                dataToProcess = itemsWithPrice.map(({ item }) => item)
            }
        }

        // Apply currency conversion only if needed - optimize by checking first
        const needsConversion = selectedCurrency === "VND"
        const getPriceColumnFn = getPriceColumnDataRef.current
        const rate = needsConversion ? Number.parseFloat(exchangeRate) : 1
        const shouldConvert = needsConversion && getPriceColumnFn && !isNaN(rate) && rate !== 1
        
        const convertedItems = shouldConvert
            ? dataToProcess.map((item) => {
                const newItem = { ...item }
                const fieldsToConvert: Array<"giaBan" | "giaMua" | "giaCuoi" | "loiNhuan"> = [
                    "giaBan",
                    "giaMua",
                    "giaCuoi",
                    "loiNhuan",
                ]
                fieldsToConvert.forEach((fieldKey) => {
                    const fieldName = getPriceColumnFn(selectedPriceType, selectedBrand, fieldKey)
                    const raw = newItem[fieldName as keyof SiteData]?.toString() || ""
                    const numericValue = Number.parseFloat(raw)
                    if (!isNaN(numericValue) && numericValue !== 0) {
                        ; (newItem as any)[fieldName] = (numericValue * rate).toString()
                    }
                })
                return newItem
            })
            : dataToProcess

        // Handle duplicates for Site search type - optimize grouping
        let mainItems: SiteData[] = []
        let newDuplicateSites: { [key: string]: SiteData[] } = {}

        const hasSearchTermForDuplicates = searchValue && searchValue.trim().length > 0
        if (selectedSearchType === "Site" && hasSearchTermForDuplicates) {
            // Group by normalized site for search results - use Map for better performance
            const siteGroups = new Map<string, SiteData[]>()
            convertedItems.forEach((item) => {
                const normalizedSite = normalizeUrl(item.site)
                const group = siteGroups.get(normalizedSite) || []
                group.push(item)
                siteGroups.set(normalizedSite, group)
            })

            // Process groups - chọn item có giá thấp nhất vào mainItems
            const getPriceColumnFn = getPriceColumnDataRef.current
            siteGroups.forEach((items, normalizedSite) => {
                if (items.length > 0) {
                    if (items.length === 1) {
                        // Chỉ có 1 item, thêm vào mainItems
                        mainItems.push(items[0])
                    } else {
                        // Có nhiều item trùng, tìm item có giá thấp nhất
                        if (getPriceColumnFn) {
                            const priceField = getPriceColumnFn(selectedPriceType, selectedBrand, "giaMua")
                            
                            // Tìm item có giá thấp nhất (khác 0 và hợp lệ)
                            let minPriceItem = items[0]
                            let minPrice = Number.parseFloat((items[0] as any)[priceField] || "0") || 0
                            
                            // Nếu giá đầu tiên là 0 hoặc không hợp lệ, tìm giá hợp lệ đầu tiên
                            if (minPrice === 0 || isNaN(minPrice)) {
                                for (const item of items) {
                                    const price = Number.parseFloat((item as any)[priceField] || "0") || 0
                                    if (price > 0 && !isNaN(price)) {
                                        minPriceItem = item
                                        minPrice = price
                                        break
                                    }
                                }
                            }
                            
                            // Tìm item có giá thấp nhất trong các item còn lại
                            for (let i = 1; i < items.length; i++) {
                                const price = Number.parseFloat((items[i] as any)[priceField] || "0") || 0
                                if (price > 0 && !isNaN(price)) {
                                    if (minPrice === 0 || isNaN(minPrice) || price < minPrice) {
                                        minPrice = price
                                        minPriceItem = items[i]
                                    }
                                }
                            }
                            
                            // Nếu tất cả giá đều là 0 hoặc không hợp lệ, lấy item đầu tiên
                            if (minPrice === 0 || isNaN(minPrice)) {
                                minPriceItem = items[0]
                            }
                            
                            // Thêm item có giá thấp nhất vào mainItems
                            mainItems.push(minPriceItem)
                            
                            // Các item còn lại vào duplicateSites
                            const duplicates = items.filter(item => item !== minPriceItem)
                            if (duplicates.length > 0) {
                                newDuplicateSites[normalizedSite] = duplicates
                            }
                        } else {
                            // Không có getPriceColumnFn, lấy item đầu tiên
                            mainItems.push(items[0])
                            newDuplicateSites[normalizedSite] = items.slice(1)
                        }
                    }
                }
            })
        } else {
            // For filter-only or NCC search, show all items
            mainItems = convertedItems
        }

        setFilteredData(mainItems)
        setDuplicateSites(newDuplicateSites)
        setHasSearched(true)
        setSearchCompleted(true)
        setIsSearching(false)
        setCurrentPage(1) // Reset to first page when new data arrives
    }, [dataLoaded, localData, searchableData, filters, selectedSearchType, selectedCurrency, selectedBrand, selectedPriceType, exchangeRate])

    // Update ref when applySearchAndFilters changes
    useEffect(() => {
        applySearchAndFiltersRef.current = applySearchAndFilters
    }, [applySearchAndFilters])

    // Convert filters to API format - memoized to avoid recalculation
    const apiFilters = useMemo(() => {
        const result: any = {}
        
        if (filters["Đi Bóng"]) {
            result.diBong = filters["Đi Bóng"]
        }
        if (filters["Đi BET"]) {
            result.diBET = filters["Đi BET"]
        }
        if (filters["Site"]) {
            result.siteVN = filters["Site"]
        }
        if (filters["Traffic Tool"]) {
            result.trafficTool = filters["Traffic Tool"]
        }
        if (filters["Giá GP"]) {
            result.giaGP = filters["Giá GP"]
        }
        if (filters["DR"]) {
            result.DR = filters["DR"]
        }
        if (filters["Giá Text"]) {
            result.giaText = filters["Giá Text"]
        }
        if (filters["Ngày cập nhật"]) {
            result.ngayCapNhat = filters["Ngày cập nhật"]
        }
        if (filters["Chủ đề"] && selectedTopics.length > 0) {
            result.chuDe = selectedTopics.join(",")
        }
        
        return Object.keys(result).length > 0 ? result : undefined
    }, [filters, selectedTopics])

    const applyFilters = useCallback(() => {
        setShowFilters(false)
        
        // Nếu đã tải dữ liệu, chỉ cần áp dụng filter trên localData
        if (dataLoaded && localData.length > 0) {
            setIsSearching(true)
            // Apply filters on local data
            applySearchAndFilters(searchTerm)
        } else {
            // Nếu chưa tải dữ liệu, gọi API với filters
            setIsSearching(true)
            setHasSearched(true)
            setSearchCompleted(false)
            pendingSearchRef.current = searchTerm || ""
            
            refetch(searchTerm || "", selectedSearchType, apiFilters)
                .catch((error) => {
                    console.error("Error fetching data for filters:", error)
                    setIsSearching(false)
                    setSearchCompleted(false)
                })
        }
    }, [dataLoaded, localData, searchTerm, selectedSearchType, refetch, apiFilters, applySearchAndFilters])

    // Core search logic (immediate) - now uses combined function
    const runSearch = useCallback(
        (value: string) => {
            applySearchAndFilters(value)
        },
        [applySearchAndFilters]
    )

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
            setHasSearched(true)
            setSearchCompleted(false)
            
            // Nếu đã tải dữ liệu, chỉ tìm trong localData (không gọi API)
            if (dataLoaded && localData.length > 0) {
                applySearchAndFilters(searchTerm)
            } else {
                // Nếu chưa tải dữ liệu, gọi API
                pendingSearchRef.current = searchTerm
                lastProcessedDataRef.current = []
                try {
                    await refetch(searchTerm, selectedSearchType)
                    // runSearch will be called automatically when allData updates via useEffect
                } catch (error) {
                    setIsSearching(false)
                    setSearchCompleted(false)
                }
            }
        } else {
            // Nếu đã tải dữ liệu và searchTerm rỗng, hiển thị tất cả dữ liệu
            if (dataLoaded && localData.length > 0) {
                applySearchAndFilters("")
            } else {
                setFilteredData([])
                setDuplicateSites({})
                setHasSearched(false)
            }
        }
    }, [searchTerm, selectedSearchType, validateDomain, refetch, dataLoaded, localData, applySearchAndFilters])

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

    // Use ref to store latest runSearch function to avoid infinite loop
    const runSearchRef = useRef(runSearch)
    useEffect(() => {
        runSearchRef.current = runSearch
    }, [runSearch])

    // Use ref to store latest itemMatchesFilters function to avoid dependency issues
    const itemMatchesFiltersRef = useRef<((item: SiteData) => boolean) | null>(null)
    
    // Use ref to store latest getPriceColumnData function to avoid dependency issues
    const getPriceColumnDataRef = useRef<((priceType: PriceType, brand: BrandType, field: "giaBan" | "giaMua" | "giaCuoi" | "loiNhuan" | "hoaHong") => string) | null>(null)

    // Track when we're waiting for data after a search
    const pendingSearchRef = useRef<string | null>(null)
    const lastProcessedDataRef = useRef<any[]>([])

    // Update data immediately when currency, brand, price type, rate changes
    useEffect(() => {
        if (hasSearched && searchTerm && searchCompleted) {
            // Only run search when currency/brand/price type changes, not when allData changes
            runSearchRef.current(searchTerm)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCurrency, selectedBrand, selectedPriceType, exchangeRate])

    // Handle data update after fetch - separate effect to avoid infinite loop
    useEffect(() => {
        // Không xử lý nếu đang tải dữ liệu từ nút "Tải dữ liệu" (sẽ được xử lý bởi useEffect khác)
        if (isLoadingDataRef.current) {
            return
        }
        
        if (hasSearched && pendingSearchRef.current !== null) {
            // Check if allData actually changed (compare by reference and length)
            const dataChanged = lastProcessedDataRef.current !== allData && 
                               (lastProcessedDataRef.current.length !== allData.length)
            
            if (dataChanged) {
                // Data has been fetched, apply search and filters
                const currentSearchTerm = pendingSearchRef.current || ""
                if (applySearchAndFiltersRef.current) {
                    applySearchAndFiltersRef.current(currentSearchTerm)
                }
                lastProcessedDataRef.current = allData
                pendingSearchRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allData, hasSearched])

    // Don't auto-reapply when filters change - user must click "Áp dụng bộ lọc" button
    // This prevents unnecessary API calls and lag

    const handlePriceTypeChange = (priceType: PriceType) => {
        setSelectedPriceType(priceType)
    }

    // Function to convert price based on currency selection
    const convertPrice = (price: string): string => {
        if (selectedCurrency === "VND") {
            const rate = Number.parseFloat(exchangeRate)
            if (isNaN(rate)) return price
            const numericPrice = Number.parseFloat(price || "0") || 0
            return (numericPrice * rate).toString()
        }
        return price
    }

    const getPriceColumnData = useCallback((
        priceType: PriceType,
        brand: BrandType,
        field: "giaBan" | "giaMua" | "giaCuoi" | "loiNhuan" | "hoaHong",
    ) => {
        // For Giá Mua, always use F-ALL price (no Lio suffix)
        if (field === "giaMua") {
            const typeMap = {
                GP: "GP",
                Text: "Text",
                TextHome: "TextHome",
                TextHeader: "TextHeader",
            }
            return `giaMua${typeMap[priceType]}`
        }

        // For other fields, apply normal logic
        const suffix = brand === "X" ? "Lio" : ""
        const typeMap = {
            GP: "GP",
            Text: "Text",
            TextHome: "TextHome",
            TextHeader: "TextHeader",
        }

        // Special handling for hoaHong which only has GP and Text variants
        if (field === "hoaHong") {
            return priceType === "GP" ? "hoaHongGP" : "hoaHongText"
        }

        return `${field}${typeMap[priceType]}${suffix}`
    }, [])

    // Helper function to check if item matches filters
    const itemMatchesFilters = useCallback((item: SiteData): boolean => {
        // Đi Bóng filter
        if (filters["Đi Bóng"]) {
            const diBongValue = filters["Đi Bóng"]
            const itemBong = (item.bong || "").toLowerCase().trim()
            if (diBongValue === "có" && itemBong !== "có" && itemBong !== "yes" && itemBong !== "1") {
                return false
            }
            if (diBongValue === "ko" && (itemBong === "có" || itemBong === "yes" || itemBong === "1")) {
                return false
            }
        }

        // Đi BET filter
        if (filters["Đi BET"]) {
            const diBETValue = filters["Đi BET"]
            const itemBet = (item.bet || "").toLowerCase().trim()
            if (diBETValue === "có" && itemBet !== "có" && itemBet !== "yes" && itemBet !== "1") {
                return false
            }
            if (diBETValue === "ko" && (itemBet === "có" || itemBet === "yes" || itemBet === "1")) {
                return false
            }
        }

        // Site .vn filter
        if (filters["Site"]) {
            const siteValue = filters["Site"]
            const itemSite = (item.site || "").toLowerCase()
            const isVnSite = itemSite.endsWith(".vn")
            if (siteValue === "yes" && !isVnSite) {
                return false
            }
            if (siteValue === "no" && isVnSite) {
                return false
            }
        }

        // Traffic Tool filter
        if (filters["Traffic Tool"]) {
            const trafficValue = filters["Traffic Tool"]
            const itemTraffic = Number.parseFloat(item.trafficTool || "0") || 0
            const filterTraffic = Number.parseFloat(trafficValue) || 0
            if (itemTraffic <= filterTraffic) {
                return false
            }
        }

        // Giá GP filter
        if (filters["Giá GP"]) {
            const giaGPValue = filters["Giá GP"]
            const priceField = getPriceColumnData(selectedPriceType, selectedBrand, "giaMua")
            const itemPrice = Number.parseFloat((item as any)[priceField] || "0") || 0
            
            if (giaGPValue === "1") {
                if (itemPrice <= 1) return false
            } else if (giaGPValue === "20") {
                if (itemPrice >= 20) return false
            } else if (giaGPValue === "40") {
                if (itemPrice >= 40) return false
            } else if (giaGPValue === "80") {
                if (itemPrice >= 80) return false
            } else if (giaGPValue === "160") {
                if (itemPrice >= 160) return false
            }
        }

        // DR filter
        if (filters["DR"]) {
            const drValue = filters["DR"]
            const itemDR = Number.parseFloat(item.DR || "0") || 0
            
            if (drValue === "5" && itemDR >= 5) return false
            if (drValue === "10" && itemDR >= 10) return false
            if (drValue === "20" && itemDR >= 20) return false
            if (drValue === "40" && itemDR >= 40) return false
            if (drValue === "60" && itemDR >= 60) return false
            if (drValue === "gt20" && itemDR <= 20) return false
            if (drValue === "gt40" && itemDR <= 40) return false
            if (drValue === "gt60" && itemDR <= 60) return false
            if (drValue === "gt80" && itemDR <= 80) return false
        }

        // Giá Text filter
        if (filters["Giá Text"]) {
            const giaTextValue = filters["Giá Text"]
            const priceField = getPriceColumnData(selectedPriceType, selectedBrand, "giaMua")
            const itemPrice = Number.parseFloat((item as any)[priceField] || "0") || 0
            
            if (giaTextValue === "1") {
                if (itemPrice <= 1) return false
            } else if (giaTextValue === "20") {
                if (itemPrice >= 20) return false
            } else if (giaTextValue === "40") {
                if (itemPrice >= 40) return false
            } else if (giaTextValue === "80") {
                if (itemPrice >= 80) return false
            } else if (giaTextValue === "160") {
                if (itemPrice >= 160) return false
            }
        }

        // Ngày cập nhật filter
        if (filters["Ngày cập nhật"]) {
            const ngayCapNhatValue = filters["Ngày cập nhật"]
            const itemTimeText = item.timeText || ""
            
            if (ngayCapNhatValue === "today") {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const itemDate = new Date(itemTimeText)
                if (isNaN(itemDate.getTime()) || itemDate < today) {
                    return false
                }
            } else if (ngayCapNhatValue === "week") {
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                weekAgo.setHours(0, 0, 0, 0)
                const itemDate = new Date(itemTimeText)
                if (isNaN(itemDate.getTime()) || itemDate < weekAgo) {
                    return false
                }
            } else if (ngayCapNhatValue === "month") {
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                monthAgo.setHours(0, 0, 0, 0)
                const itemDate = new Date(itemTimeText)
                if (isNaN(itemDate.getTime()) || itemDate < monthAgo) {
                    return false
                }
            } else if (ngayCapNhatValue === "older") {
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                monthAgo.setHours(0, 0, 0, 0)
                const itemDate = new Date(itemTimeText)
                if (!isNaN(itemDate.getTime()) && itemDate >= monthAgo) {
                    return false
                }
            }
        }

        // Chủ đề filter
        if (filters["Chủ đề"] && selectedTopics.length > 0) {
            const itemChuDe = (item.chuDe || "").trim()
            if (!selectedTopics.includes(itemChuDe)) {
                return false
            }
        }

        return true
    }, [filters, selectedTopics, selectedPriceType, selectedBrand, getPriceColumnData])

    // Update ref when itemMatchesFilters changes
    useEffect(() => {
        itemMatchesFiltersRef.current = itemMatchesFilters
    }, [itemMatchesFilters])

    // Update ref when getPriceColumnData changes
    useEffect(() => {
        getPriceColumnDataRef.current = getPriceColumnData
    }, [getPriceColumnData])

    // Add a helper function to handle price column rendering - memoized
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

            // Nếu là cột hoa hồng, ép về 0 nếu không phải số hoặc khác 0
            if (field === "hoaHongGP" || field === "hoaHongText") {
                const numericValue = Number.parseFloat(value)
                if (isNaN(numericValue) || numericValue === 0) {
                    displayValue = "0"
                } else {
                    displayValue = numericValue.toString()
                }
            }

            // Make summary row values red with bold font
            if (row === 0) {
                td.style.setProperty("color", "red", "important")
                td.style.fontWeight = "600"
            }

            td.title = displayValue
            td.textContent = displayValue
            return td
        }) as RendererFunction
    }, [])

    // Generate nested headers for 2-level header structure - memoized
    const generateNestedHeaders = useCallback((columns: any[]) => {
        // First row: Group headers (top level)
        const firstRow: Array<{ label: string; colspan: number }> = []
        // Second row: Column titles (bottom level)
        const secondRow: string[] = []
        
        interface GroupInfo {
            label: string
            startCol: number
            colspan: number
        }
        let currentGroup: GroupInfo | null = null
        
        for (let index = 0; index < columns.length; index++) {
            const col = columns[index]
            const colData = col.data as string
            
            // Determine which group this column belongs to
            let groupLabel = ""
            if (colData.includes("giaBan") || colData.includes("giaMua") || colData.includes("hoaHong") || colData.includes("giaCuoi") || colData.includes("loiNhuan")) {
                groupLabel = "Giá cả"
            } else if (["NCC", "MaNCC", "FileNCC", "GroupNCC", "GhiChuNCC"].includes(colData)) {
                groupLabel = "Thông tin NCC"
            } else {
                groupLabel = ""
            }
            
            // If starting a new group or first column
            if (!currentGroup || currentGroup.label !== groupLabel) {
                // Close previous group if exists
                if (currentGroup) {
                    firstRow.push({
                        label: currentGroup.label,
                        colspan: currentGroup.colspan,
                    })
                    // Fill second row for previous group
                    for (let i = 0; i < currentGroup.colspan; i++) {
                        secondRow.push(columns[currentGroup.startCol + i].title)
                    }
                }
                // Start new group
                currentGroup = {
                    label: groupLabel,
                    startCol: index,
                    colspan: 1,
                }
            } else {
                // Continue current group
                currentGroup.colspan++
            }
        }
        
        // Close last group
        if (currentGroup) {
            firstRow.push({
                label: currentGroup.label,
                colspan: currentGroup.colspan,
            })
            // Fill second row for last group
            for (let i = 0; i < currentGroup.colspan; i++) {
                secondRow.push(columns[currentGroup.startCol + i].title)
            }
        }
        
        return [firstRow, secondRow]
    }, [])

    const generateColumns = useCallback(() => {
        const baseColumns = [
            {
                title: "CS",
                data: "cs",
                width: 40,
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
                title: "Tình Trạng",
                data: "tinhTrang",
                width: 70,
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
                title: "Bóng",
                data: "bong",
                width: 40,
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
                title: "BET",
                data: "bet",
                width: 40,
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
                title: "Site",
                data: "site",
                width: 120,
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
                title: "Chủ đề",
                data: "chuDe",
                width: 70,
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
                title: "Link Out",
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
                        // Check if it's a URL
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
                data: "trafficTool",
                width: 70,
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
                title: "Ghi Chú",
                data: "ghiChu",
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
                    // Make "Tổng" text red in summary row
                    if (row === 0 && value === "Tổng") {
                        td.style.setProperty("color", "red", "important")
                        td.style.fontWeight = "600"
                    }

                    td.title = value || ""
                    td.textContent = value || ""
                    return td
                }) as RendererFunction,
            },
        ]

        // Add single price column based on selected type and brand
        const sellPriceColumn = getPriceColumnData(selectedPriceType, selectedBrand, "giaBan")
        baseColumns.push({
            title: `Bán`,
            data: sellPriceColumn,
            width: 45,
            className: "htMiddle",
            renderer: createPriceRenderer(sellPriceColumn),
        })

        // Modified role check with more explicit conditions
        const isRestrictedUser = !userInfo || (userInfo.role !== "Admin" && userInfo.role !== "Nhân viên")

        if (isRestrictedUser) {
            // Filter columns to only show the specified ones
            const allowedColumns = [
                "tinhTrang",
                "bong",
                "bet",
                "site",
                "chuDe",
                "linkOut",
                "DR",
                "trafficTool",
                "ghiChu",
                sellPriceColumn,
            ]
            const filteredColumns = baseColumns.filter((col) => allowedColumns.includes(col.data as string))
            return filteredColumns
        }

        // Add remaining columns with the same configuration for Admin and Nhân viên
        const buyPriceColumn = getPriceColumnData(selectedPriceType, selectedBrand, "giaMua")
        const finalPriceColumn = getPriceColumnData(selectedPriceType, selectedBrand, "giaCuoi")
        const profitColumn = getPriceColumnData(selectedPriceType, selectedBrand, "loiNhuan")
        const commissionColumn = getPriceColumnData(selectedPriceType, selectedBrand, "hoaHong")

        const additionalColumns = [
            {
                title: `Mua`,
                data: buyPriceColumn,
                width: 45,
                className: "htMiddle",
                renderer: createPriceRenderer(buyPriceColumn),
            },
            {
                title: `HH`,
                data: commissionColumn,
                width: 40,
                className: "htMiddle",
                renderer: createPriceRenderer(commissionColumn),
            },
            {
                title: `Cuối`,
                data: finalPriceColumn,
                width: 45,
                className: "htMiddle",
                renderer: createPriceRenderer(finalPriceColumn),
            },
            {
                title: `LN`,
                data: profitColumn,
                width: 40,
                className: "htMiddle",
                renderer: createPriceRenderer(profitColumn),
            },
            {
                title: "Time",
                data: "timeText",
                width: 38,
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
                title: "Tên",
                data: "NCC",
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
                    td.title = value || ""
                    td.textContent = value || ""
                    td.style.textAlign = "center"
                    return td
                }) as RendererFunction,
            },
            {
                title: "Mã",
                data: "MaNCC",
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
                    td.title = value || ""
                    td.textContent = value || ""
                    td.style.textAlign = "center"
                    return td
                }) as RendererFunction,
            },
            {
                title: "File",
                data: "FileNCC",
                width: 60,
                className: "htMiddle",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                    cellProperties?: Handsontable.CellMeta,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.textAlign = "center"

                    // Check if this is the summary row (first row)
                    const isSummaryRow = row === 0

                    if (isSummaryRow) {
                        // If there are file URLs in the summary row, make them clickable
                        const fileUrls = (cellProperties?.instance?.getSourceDataAtRow(row) as any)?._fileUrls
                        if (fileUrls && fileUrls.length > 0) {
                            td.onclick = (e: MouseEvent) => {
                                e.preventDefault()
                                fileUrls.forEach((url: string) => {
                                    window.open(url, "_blank")
                                })
                            }
                            // Set textContent for copying
                            td.textContent = `File (${fileUrls.length})`
                            td.style.color = "#2563EB"
                        } else {
                            td.textContent = "No"
                            td.style.color = "#2563EB"
                        }
                    } else {
                        // For regular rows
                        if (Array.isArray(value) && value.length > 0) {
                            // Handle array of files
                            td.onclick = (e: MouseEvent) => {
                                e.preventDefault()
                                value.forEach((url: string) => {
                                    window.open(url, "_blank")
                                })
                            }
                            td.style.color = "#2563EB"
                            td.style.textDecoration = "underline"
                            td.style.cursor = "pointer"
                            td.textContent = "File"
                        } else if (value && typeof value === "string" && value.trim() !== "" && value !== "No") {
                            // Handle single file
                            td.onclick = (e: MouseEvent) => {
                                e.preventDefault()
                                window.open(value, "_blank")
                            }
                            td.style.color = "#2563EB"
                            td.style.textDecoration = "underline"
                            td.style.cursor = "pointer"
                            td.textContent = "File"
                        } else {
                            td.textContent = "No"
                            td.style.color = "#2563EB"
                        }
                    }

                    td.title = value || "No"
                    return td
                }) as RendererFunction,
            },
            {
                title: "Group",
                data: "GroupNCC",
                width: 80,
                className: "htMiddle",
                renderer: ((
                    instance: Handsontable,
                    td: HTMLTableCellElement,
                    row: number,
                    col: number,
                    prop: string | number,
                    value: any,
                    cellProperties?: Handsontable.CellMeta,
                ): HTMLTableCellElement => {
                    td.innerHTML = ""
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.textAlign = "center"

                    // Check if this is the summary row (first row)
                    const isSummaryRow = row === 0

                    if (isSummaryRow) {
                        // For summary row, make text red and 500
                        td.style.color = "red"

                        // If there are group URLs in the summary row, make them clickable
                        const groupUrls = (cellProperties?.instance?.getSourceDataAtRow(row) as any)?._groupUrls
                        if (groupUrls && groupUrls.length > 0) {
                            td.onclick = (e: MouseEvent) => {
                                e.preventDefault()
                                groupUrls.forEach((url: string) => {
                                    window.open(url, "_blank")
                                })
                            }
                            // Set textContent for copying
                            td.textContent = `Group (${groupUrls.length})`
                        } else {
                            td.textContent = "No"
                            td.style.color = "#999"
                        }
                    } else {
                        // For regular rows
                        if (Array.isArray(value) && value.length > 0) {
                            // Handle array of groups
                            td.onclick = (e: MouseEvent) => {
                                e.preventDefault()
                                value.forEach((url: string) => {
                                    window.open(url, "_blank")
                                })
                            }
                            // Set textContent for copying
                            td.style.color = "#2563EB"
                            td.style.textDecoration = "underline"
                            td.style.cursor = "pointer"
                            td.textContent = "Group"
                        } else if (value && typeof value === "string" && value.trim() !== "" && value !== "No Group") {
                            // Handle single group
                            td.onclick = (e: MouseEvent) => {
                                e.preventDefault()
                                window.open(value, "_blank")
                            }
                            // Set textContent for copying
                            td.style.color = "#2563EB"
                            td.style.textDecoration = "underline"
                            td.style.cursor = "pointer"
                            td.textContent = "Group"
                        } else {
                            td.textContent = "No"
                            td.style.color = "#999" // Gray color for "No" text
                        }
                    }

                    td.title = value || "No"
                    return td
                }) as RendererFunction,
            },
            {
                title: "Note",
                data: "GhiChuNCC",
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
                    td.title = value || ""
                    td.textContent = value || ""
                    td.style.textAlign = "center"
                    return td
                }) as RendererFunction,
            },
        ]

        return [...baseColumns, ...additionalColumns]
    }, [selectedPriceType, selectedBrand, userInfo?.role, getPriceColumnData, createPriceRenderer])

    // Add a function to calculate summary data - memoized
    const calculateSummary = useCallback((data: SiteData[]) => {
        if (!data || data.length === 0) return null

        // Get the correct price column based on selected type and brand
        const getPriceColumn = (
            type: PriceType,
            brand: BrandType,
            field: "giaBan" | "giaMua" | "hoaHong" | "giaCuoi" | "loiNhuan",
        ) => {
            const suffix = brand === "X" ? "Lio" : ""

            // Map field to its base name
            const fieldMap = {
                giaBan: "giaBan",
                giaMua: "giaMua",
                hoaHong: "hoaHong",
                giaCuoi: "giaCuoi",
                loiNhuan: "loiNhuan",
            }

            // Map price type to its suffix
            const typeSuffix = {
                GP: "GP",
                Text: "Text",
                TextHome: "TextHome",
                TextHeader: "TextHeader",
            }

            // For hoaHong, we only have GP and Text variants
            if (field === "hoaHong") {
                return type === "GP" ? "hoaHongGP" : "hoaHongText"
            }

            return `${fieldMap[field]}${typeSuffix[type]}${suffix}`
        }

        // Get the current price columns based on selected type and brand
        const giaBanColumn = getPriceColumnData(selectedPriceType, selectedBrand, "giaBan")
        const giaMuaColumn = getPriceColumnData(selectedPriceType, selectedBrand, "giaMua")
        const hoaHongColumn = selectedPriceType === "GP" ? "hoaHongGP" : "hoaHongText"
        const giaCuoiColumn = getPriceColumnData(selectedPriceType, selectedBrand, "giaCuoi")
        const loiNhuanColumn = getPriceColumnData(selectedPriceType, selectedBrand, "loiNhuan")

        // Initialize summary with the correct columns
        const summary: any = {
            ghiChu: "Tổng",
            [giaBanColumn]: "0",
            [giaMuaColumn]: "0",
            [hoaHongColumn]: "0",
            [giaCuoiColumn]: "0",
            [loiNhuanColumn]: "0",
        }

        // Count total files and groups
        let totalFiles = 0
        let totalGroups = 0
        let fileUrls: string[] = []
        let groupUrls: string[] = []

        // Helper function to check if a value is a pure number
        const isPureNumber = (value: any): boolean => {
            if (value === null || value === undefined) return false
            const strValue = value.toString().trim()
            // Check if the string is a valid number (integer or decimal)
            return /^-?\d*\.?\d+$/.test(strValue)
        }

        // Helper function to safely parse numeric value
        const getNumericValue = (value: any): number => {
            if (!isPureNumber(value)) return 0
            return Number.parseFloat(value.toString().trim())
        }

        data.forEach((item) => {
            // Get values using the correct columns for the selected type
            const giaBanValue = getNumericValue(item[giaBanColumn as keyof SiteData])
            const giaMuaValue = getNumericValue(item[giaMuaColumn as keyof SiteData])
            const hoaHongValue = getNumericValue(item[hoaHongColumn as keyof SiteData])
            const giaCuoiValue = getNumericValue(item[giaCuoiColumn as keyof SiteData])
            const loiNhuanValue = getNumericValue(item[loiNhuanColumn as keyof SiteData])

            // Update summary using the correct columns for the selected type
            summary[giaBanColumn as keyof SiteData] = (
                Number.parseFloat(summary[giaBanColumn as keyof SiteData]?.toString() || "0") + giaBanValue
            ).toString()
            summary[giaMuaColumn as keyof SiteData] = (
                Number.parseFloat(summary[giaMuaColumn as keyof SiteData]?.toString() || "0") + giaMuaValue
            ).toString()
            summary[hoaHongColumn as keyof SiteData] = (
                Number.parseFloat(summary[hoaHongColumn as keyof SiteData]?.toString() || "0") + hoaHongValue
            ).toString()
            summary[giaCuoiColumn as keyof SiteData] = (
                Number.parseFloat(summary[giaCuoiColumn as keyof SiteData]?.toString() || "0") + giaCuoiValue
            ).toString()
            summary[loiNhuanColumn as keyof SiteData] = (
                Number.parseFloat(summary[loiNhuanColumn as keyof SiteData]?.toString() || "0") + loiNhuanValue
            ).toString()

            // Collect file URLs
            if (Array.isArray(item.FileNCC)) {
                totalFiles += item.FileNCC.length
                fileUrls = [...fileUrls, ...item.FileNCC]
            } else if (item.FileNCC && item.FileNCC !== "No") {
                totalFiles += 1
                fileUrls.push(item.FileNCC as string)
            }

            // Collect group URLs
            if (Array.isArray(item.GroupNCC)) {
                totalGroups += item.GroupNCC.length
                groupUrls = [...groupUrls, ...item.GroupNCC]
            } else if (item.GroupNCC && item.GroupNCC !== "No Group") {
                totalGroups += 1
                groupUrls.push(item.GroupNCC as string)
            }
        })

        // Store the actual URLs for later use
        summary._fileUrls = fileUrls
        summary._groupUrls = groupUrls

        // Set file and group counts
        summary.FileNCC = totalFiles > 0 ? `File (${totalFiles})` : "No"
        summary.GroupNCC = totalGroups > 0 ? `Group (${totalGroups})` : "No Group"

        return summary as SiteData & { _fileUrls?: string[]; _groupUrls?: string[] }
    }, [selectedPriceType, selectedBrand])

    // Count NCCs with usable IdGroup (handles non-string values safely)
    const getValidNCCsCount = useCallback((data: SiteData[]) => {
        return data.filter((item) => normalizeIdGroup(item.IdGroup) !== "").length
    }, [])

    // Add the beforeCopy handler function using useCallback
    const handleBeforeCopy = useCallback(
        (data: string[][], coords: any[], copiedHeadersCount: { columnHeadersCount: number }): boolean | void => {
            // Try to get the instance from either table
            const mainTableInstance = mainTableRef.current?.hotInstance
            const duplicatesTableInstance = duplicatesTableRef.current?.hotInstance
            const hotInstance = mainTableInstance || duplicatesTableInstance

            if (!hotInstance) {
                console.warn("Handsontable instance not found for copy.")
                return
            }

            const selected = hotInstance.getSelected()
            if (!selected || selected.length === 0) {
                console.warn("No selection found for copy.")
                return
            }

            // Calculate the overall bounding box of the selection
            let minRow = Number.POSITIVE_INFINITY,
                minCol = Number.POSITIVE_INFINITY,
                maxRow = Number.NEGATIVE_INFINITY,
                maxCol = Number.NEGATIVE_INFINITY
            selected.forEach((range) => {
                const [startRow, startCol, endRow, endCol] = range
                minRow = Math.min(minRow, startRow, endRow)
                minCol = Math.min(minCol, startCol, endCol)
                maxRow = Math.max(maxRow, startRow, endRow)
                maxCol = Math.max(maxCol, startCol, endCol)
            })

            const numRows = maxRow - minRow + 1
            const numCols = maxCol - minCol + 1

            // Initialize a 2D array with empty strings
            const copiedDataArray: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(""))

            // Populate the 2D array with data from selected ranges
            selected.forEach((range) => {
                const [startRow, startCol, endRow, endCol] = range
                const rowStart = Math.min(startRow, endRow)
                const rowEnd = Math.max(startRow, endRow)
                const colStart = Math.min(startCol, endCol)
                const colEnd = Math.max(colStart, endCol)

                for (let r = rowStart; r <= rowEnd; r++) {
                    for (let c = colStart; c <= colEnd; c++) {
                        // Get the rendered value from the cell element's textContent
                        const cellElement = hotInstance.getCell(r, c)
                        const cellValue = cellElement ? cellElement.textContent || "" : ""
                        // Place the value in the correct position relative to the bounding box
                        copiedDataArray[r - minRow][c - minCol] = cellValue
                    }
                }
            })

            // Format the 2D array into a tab-separated string
            const finalData = copiedDataArray.map((row) => row.join("\t")).join("\n")

            const copyToClipboard = async (text: string) => {
                // Check if we're in a secure context and clipboard API is available
                if (navigator.clipboard && window.isSecureContext) {
                    try {
                        await navigator.clipboard.writeText(text)
                        return true
                    } catch (err) {
                        console.warn("Clipboard API failed, trying fallback:", err)
                    }
                }

                // Fallback method for mobile devices and older browsers
                try {
                    // Create a temporary textarea element
                    const textArea = document.createElement("textarea")
                    textArea.value = text
                    textArea.style.position = "fixed"
                    textArea.style.left = "-999999px"
                    textArea.style.top = "-999999px"
                    textArea.setAttribute("readonly", "")
                    textArea.style.opacity = "0"

                    document.body.appendChild(textArea)

                    // For mobile devices, we need to make the textarea visible and focusable
                    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                        textArea.style.position = "absolute"
                        textArea.style.left = "0px"
                        textArea.style.top = "0px"
                        textArea.style.opacity = "1"
                        textArea.style.zIndex = "9999"
                        textArea.style.fontSize = "16px" // Prevent zoom on iOS
                    }

                    textArea.focus()
                    textArea.select()
                    textArea.setSelectionRange(0, text.length)

                    const successful = document.execCommand("copy")
                    document.body.removeChild(textArea)

                    if (successful) {
                        return true
                    } else {
                        throw new Error("execCommand copy failed")
                    }
                } catch (fallbackErr) {
                    console.error("All copy methods failed:", fallbackErr)

                    // Final fallback: show the data in an alert for manual copy
                    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                        const shortData = text.length > 200 ? text.substring(0, 200) + "..." : text
                        alert(`Copy failed. Data to copy:\n${shortData}`)
                    }
                    return false
                }
            }

            // Use the enhanced copy function
            copyToClipboard(finalData)

            // Prevent Handsontable's default copy behavior since we handled it
            return false
        },
        [mainTableRef, duplicatesTableRef],
    ) // Update dependencies to include both refs

    // Mobile copy handler to copy current selection from either table
    const handleMobileCopySelection = useCallback(async () => {
        const mainTableInstance = mainTableRef.current?.hotInstance
        const duplicatesTableInstance = duplicatesTableRef.current?.hotInstance
        const hotInstance = mainTableInstance || duplicatesTableInstance

        if (!hotInstance) {
            alert("Không tìm thấy bảng để copy")
            return
        }

        const selected = hotInstance.getSelected()
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
                    const cellElement = hotInstance.getCell(r, c)
                    const cellValue = cellElement ? cellElement.textContent || "" : ""
                    copiedDataArray[r - minRow][c - minCol] = cellValue
                }
            }
        })

        const finalData = copiedDataArray.map((row) => row.join("\t")).join("\n")

        const copyToClipboard = async (text: string) => {
            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(text)
                    return true
                } catch (err) {
                    // fallthrough
                }
            }

            try {
                const textArea = document.createElement("textarea")
                textArea.value = text
                textArea.style.position = "fixed"
                textArea.style.left = "-999999px"
                textArea.style.top = "-999999px"
                textArea.setAttribute("readonly", "")
                textArea.style.opacity = "0"
                document.body.appendChild(textArea)

                if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                    textArea.style.position = "absolute"
                    textArea.style.left = "0px"
                    textArea.style.top = "0px"
                    textArea.style.opacity = "1"
                    textArea.style.zIndex = "9999"
                    textArea.style.fontSize = "16px"
                }

                textArea.focus()
                textArea.select()
                textArea.setSelectionRange(0, text.length)

                const successful = document.execCommand("copy")
                document.body.removeChild(textArea)
                if (successful) return true
                throw new Error("execCommand copy failed")
            } catch (fallbackErr) {
                if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                    const shortData = text.length > 200 ? text.substring(0, 200) + "..." : text
                    alert(`Copy failed. Data to copy:\n${shortData}`)
                }
                return false
            }
        }

        await copyToClipboard(finalData)
    }, [mainTableRef, duplicatesTableRef])

    // Memoize generateColumns để tránh tạo lại mỗi lần render
    const generatedColumns = useMemo(() => generateColumns(), [
        selectedPriceType,
        selectedBrand,
        userInfo?.role,
    ])

    // Memoize generateNestedHeaders
    const nestedHeaders = useMemo(() => generateNestedHeaders(generatedColumns), [generatedColumns])

    // Memoize columns mapping để tránh tạo lại mỗi lần render
    const mappedColumns = useMemo(() => generatedColumns.map((col) => ({
        data: col.data,
        title: col.title,
        type: "text",
        readOnly: true,
        width: col.width,
        className: col.className,
        renderer: col.renderer as any,
    })), [generatedColumns])

    // Enable two-tap range selection for touch/mobile: first tap sets anchor, second tap selects rectangle
    // Create handlers for both tables at the top level to maintain hook order
    const onMainTableCellMouseDown = useCallback((event: any, coords: any) => {
        if (!coords) return
        const { row, col } = coords
        const anchor = selectionAnchorRef.current
        const hot = mainTableRef.current?.hotInstance
        if (!hot) return

        // Only apply on touch or small screens to avoid interfering with desktop drag selection
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
        if (!isTouch) return

        if (!anchor) {
            selectionAnchorRef.current = { row, col }
            // Also select the single cell so user sees selection
            hot.selectCell(row, col)
        } else {
            const r1 = Math.min(anchor.row, row)
            const c1 = Math.min(anchor.col, col)
            const r2 = Math.max(anchor.row, row)
            const c2 = Math.max(anchor.col, col)
            hot.selectCells([[r1, c1, r2, c2]])
            selectionAnchorRef.current = null
        }
    }, [])

    const onDuplicatesTableCellMouseDown = useCallback((event: any, coords: any) => {
        if (!coords) return
        const { row, col } = coords
        const anchor = selectionAnchorRef.current
        const hot = duplicatesTableRef.current?.hotInstance
        if (!hot) return

        // Only apply on touch or small screens to avoid interfering with desktop drag selection
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
        if (!isTouch) return

        if (!anchor) {
            selectionAnchorRef.current = { row, col }
            // Also select the single cell so user sees selection
            hot.selectCell(row, col)
        } else {
            const r1 = Math.min(anchor.row, row)
            const c1 = Math.min(anchor.col, col)
            const r2 = Math.max(anchor.row, row)
            const c2 = Math.max(anchor.col, col)
            hot.selectCells([[r1, c1, r2, c2]])
            selectionAnchorRef.current = null
        }
    }, [])

    // Modify renderHotTable to accept a ref parameter
    const renderHotTable = useCallback((data: SiteData[], tableKey: string, tableRef: React.RefObject<HotTableRef | null>, onCellMouseDown: (event: any, coords: any) => void, allDataForSummary?: SiteData[]) => {
        if (!data || data.length === 0) return null

        // Calculate summary from displayed data only (paginated data), not all filtered data
        // This ensures summary only reflects what user sees on current page
        const summaryData = data // Use paginated data for summary calculation
        const summaryRow = calculateSummary(summaryData)
        const dataWithSummary = summaryRow ? [summaryRow, ...data] : [...data]

        return (
            <div className="overflow-x-auto w-full">
                <HotTableComponent
                    ref={tableRef}
                    key={`${tableKey}-${selectedCurrency}`}
                    data={dataWithSummary}
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
                    beforeCopy={handleBeforeCopy}
                    afterOnCellMouseDown={onCellMouseDown}
                    readOnly={true}
                    showSummaryRowBorder={true}
                />
            </div>
        )
    }, [mappedColumns, nestedHeaders, selectedCurrency, handleBeforeCopy, calculateSummary])

    const hasDuplicates = Object.keys(duplicateSites).length > 0
    const duplicatesCount = Object.values(duplicateSites).flat().length

    // Calculate pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedData = useMemo(() => {
        return filteredData.slice(startIndex, endIndex)
    }, [filteredData, startIndex, endIndex])

    // Reset to page 1 when filteredData changes significantly
    useEffect(() => {
        const maxPage = Math.ceil(filteredData.length / itemsPerPage)
        if (filteredData.length > 0 && currentPage > maxPage) {
            setCurrentPage(1)
        }
    }, [filteredData.length, itemsPerPage, currentPage])

    // Reset to page 1 when itemsPerPage changes
    useEffect(() => {
        setCurrentPage(1)
    }, [itemsPerPage])

    // Pagination handlers
    const goToPage = useCallback((page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page)
            // Scroll to top of table
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

    // Add this useEffect to handle global copy functionality
    useEffect(() => {
        const handleGlobalCopy = (event: KeyboardEvent) => {
            // Only handle if focus is on a HotTable
            const activeElement = document.activeElement
            if (activeElement && activeElement.closest(".handsontable")) {
                // Let HotTable handle the copy
                return
            }
        }

        document.addEventListener("keydown", handleGlobalCopy)
        return () => {
            document.removeEventListener("keydown", handleGlobalCopy)
        }
    }, [])

    // Show loading spinner when loading, refreshing, or searching
    const showLoading = isSearching || loading || refreshing

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100  relative">
            {/* Loading Spinner */}
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
                                className="w-full px-3 sm:px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-20 sm:pr-24 text-sm sm:text-base text-gray-700 placeholder-gray-400 bg-white shadow-sm resize-none overflow-y-auto"
                            />
                            <div className="absolute right-2 sm:right-3 top-2 sm:top-3 flex items-center gap-1 sm:gap-2">
                                {/* Nút Tải dữ liệu */}
                                <button
                                    onClick={handleLoadData}
                                    disabled={isSearching || (dataLoaded && localData.length > 0)}
                                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium text-xs sm:text-sm ${
                                        dataLoaded && localData.length > 0
                                            ? "bg-green-100 text-green-700 cursor-not-allowed"
                                            : isSearching
                                            ? "bg-blue-100 text-blue-700 cursor-not-allowed"
                                            : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 cursor-pointer"
                                    }`}
                                >
                                    {isSearching ? (
                                        <>
                                            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                            <span className="hidden sm:inline">Đang tải...</span>
                                        </>
                                    ) : dataLoaded && localData.length > 0 ? (
                                        <>
                                            <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                                            <span className="hidden sm:inline">Đã tải</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                                            <span className="hidden sm:inline">Tải dữ liệu</span>
                                        </>
                                    )}
                                </button>
                                
                                {/* Nút Bộ lọc - disabled khi chưa tải dữ liệu */}
                                <button
                                    onClick={() => setShowFilters(true)}
                                    disabled={!dataLoaded || localData.length === 0}
                                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium text-xs sm:text-sm ${
                                        !dataLoaded || localData.length === 0
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                            : Object.keys(filters).some(key => filters[key]) 
                                            ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 cursor-pointer" 
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                                    }`}
                                >
                                    <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Bộ lọc</span>
                                    {Object.keys(filters).some(key => filters[key]) && (
                                        <span className="ml-1 px-1.5 py-0.5 bg-white text-purple-600 rounded-full text-xs font-bold">
                                            {Object.keys(filters).filter(key => filters[key]).length}
                                        </span>
                                    )}
                                </button>
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

            {/* Unified Table Display - Full Width */}
            {!isSearching && searchCompleted && hasSearched && filteredData.length > 0 ? (
                <div className="w-full bg-white">
                            {/* Compact Table Stats and Controls */}
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

                                            {/* Compact Price Type Selection - Responsive */}
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                                                <span className="text-xs text-gray-600 whitespace-nowrap">Loại giá:</span>
                                                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                                                {[
                                                    { id: "GP", label: "GP", icon: "💰" },
                                                    { id: "Text", label: "Text", icon: "📝" },
                                                    { id: "TextHome", label: "Home", icon: "🏠" },
                                                    { id: "TextHeader", label: "Header", icon: "📋" },
                                                ].map((type) => (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => handlePriceTypeChange(type.id as PriceType)}
                                                            className={`flex items-center px-2 py-1 rounded text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 cursor-pointer ${selectedPriceType === type.id
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

                                        <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[200px]">
                                            <div className="flex items-center justify-start md:justify-end">
                                                <div className="text-left md:text-right">
                                                    <p className="text-xs text-gray-500 break-words">
                                                        {getValidNCCsCount(filteredData) > 0
                                                            ? `Bạn có thể nhắn tin cho ${getValidNCCsCount(filteredData)} NCC có IdGroup`
                                                            : "Không có NCC nào có IdGroup để gửi tin nhắn"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 break-words mt-1">
                                                        {getValidNCCsCount(filteredData) > 0
                                                            ? "Chọn 1 trong các lựa chọn dưới đây"
                                                            : "Chỉ NCC có IdGroup mới có thể nhận tin nhắn"}
                                                    </p>
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
                                            
                                            {/* Items per page selector */}
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
                                        
                                        {/* Pagination Controls */}
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
                                                    const maxVisible = 3 // Số trang hiển thị ở mỗi đầu
                                                    
                                                    if (totalPages <= 7) {
                                                        // Nếu tổng số trang <= 7, hiển thị tất cả
                                                        for (let i = 1; i <= totalPages; i++) {
                                                            pages.push(i)
                                                        }
                                                    } else {
                                                        // Luôn hiển thị trang đầu tiên
                                                        pages.push(1)
                                                        
                                                        if (currentPage <= 3) {
                                                            // Gần đầu: 1 2 3 ... 8 9
                                                            for (let i = 2; i <= maxVisible + 1; i++) {
                                                                pages.push(i)
                                                            }
                                                            pages.push("...")
                                                            pages.push(totalPages - 1)
                                                            pages.push(totalPages)
                                                        } else if (currentPage >= totalPages - 2) {
                                                            // Gần cuối: 1 2 ... 7 8 9
                                                            pages.push(2)
                                                            pages.push("...")
                                                            for (let i = totalPages - maxVisible; i <= totalPages; i++) {
                                                                pages.push(i)
                                                            }
                                                        } else {
                                                            // Ở giữa: 1 2 ... 5 6 7 ... 8 9
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

                            {/* Main Results Table - Only render paginated data */}
                            {renderHotTable(
                                paginatedData,
                                `main-${selectedPriceType}-${selectedBrand}-${selectedSearchType}-page-${currentPage}`,
                                mainTableRef,
                                onMainTableCellMouseDown,
                                // Summary will be calculated from paginatedData only (currently displayed data)
                            )}

                            {/* Enhanced Duplicates Table */}
                            {showDuplicates && hasDuplicates && (
                                <div className="mt-8 border-t-2 border-gray-200 pt-6 px-2 sm:px-4">
                                    <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-3 sm:p-4 mb-4 shadow-sm">
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
                                    {renderHotTable(
                                        Object.values(duplicateSites).flat(),
                                        `duplicates-${selectedPriceType}-${selectedBrand}-${selectedSearchType}`,
                                        duplicatesTableRef,
                                        onDuplicatesTableCellMouseDown,
                                        Object.values(duplicateSites).flat(), // All duplicates for summary
                                    )}
                                </div>
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
                                    ? `Không tìm thấy site nào phù hợp với từ khóa "${searchTerm}"`
                                    : `Không tìm thấy NCC nào phù hợp với từ khóa "${searchTerm}"`}
                            </p>
                            <p className="text-xs text-gray-400 text-center max-w-sm mt-2">
                                {selectedSearchType === "Site"
                                    ? "Hãy thử với các định dạng khác: example.com, https://example.com, www.example.com"
                                    : "Nhập mã NCC hoặc tên NCC để tìm kiếm (ví dụ: N1, ABC, XYZ...)"}
                            </p>
                        </div>
                    ) : (
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
                            <p className="text-xs text-gray-400 text-center max-w-sm mt-2">
                                Bạn có thể tìm kiếm nhiều {selectedSearchType === "Site" ? "site" : "NCC"} cùng lúc bằng cách phân
                                cách chúng bằng dấu phẩy.
                            </p>
                        </div>
                    )}

            {/* Mobile-only floating copy button */}
            <button
                id="mobile-copy-btn"
                onClick={handleMobileCopySelection}
                className="md:hidden fixed bottom-4 right-4 z-[2000] bg-blue-600 text-white rounded-full shadow-lg p-3 active:scale-95 cursor-pointer"
                aria-label="Copy selection"
                title="Copy vùng đã chọn"
            >
                <Copy className="h-6 w-6" />
            </button>

            {/* Filter Modal */}
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
                                    <Filter className="w-6 h-6" />
                                    <h2 className="text-2xl font-bold">Bộ lọc nâng cao</h2>
                                </div>
                                <button
                                    onClick={() => setShowFilters(false)}
                                    className="text-white hover:text-gray-200 transition-colors duration-200 p-2 hover:bg-white hover:bg-opacity-20 rounded-full cursor-pointer"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Filter Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            <div className="space-y-6">
                                {/* Row 1: Đi Bóng, Đi BET, Site .vn, Traffic Tool */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Đi Bóng */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <span className="text-orange-500">⚽</span>
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
                                            <span className="text-purple-500">🎲</span>
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
                                            <Globe className="w-4 h-4 text-green-500" />
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

                                    {/* Traffic Tool */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-red-500" />
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
                                            <option value="50000">&gt; 50,000</option>
                                            <option value="1000000">&gt; 1,000,000</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 2: Các bộ lọc giá và số liệu - 4 cột */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Giá GP */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-green-500" />
                                            Giá GP
                                        </h3>
                                        <select
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                                            value={filters["Giá GP"] || ""}
                                            onChange={(e) => handleFilterChange("Giá GP", e.target.value)}
                                        >
                                            <option value="">Chọn lựa chọn</option>
                                            <option value="1">&gt; 1</option>
                                            <option value="20">&lt; 20</option>
                                            <option value="40">&lt; 40</option>
                                            <option value="80">&lt; 80</option>
                                            <option value="160">&lt; 160</option>
                                        </select>
                                    </div>

                                    {/* DR */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-indigo-500" />
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
                                            <option value="gt20">&gt; 20</option>
                                            <option value="gt40">&gt; 40</option>
                                            <option value="gt60">&gt; 60</option>
                                            <option value="gt80">&gt; 80</option>
                                        </select>
                                    </div>

                                    {/* Giá Text */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <AlignLeft className="w-4 h-4 text-orange-500" />
                                            Giá Text
                                        </h3>
                                        <select
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                                            value={filters["Giá Text"] || ""}
                                            onChange={(e) => handleFilterChange("Giá Text", e.target.value)}
                                        >
                                            <option value="">Chọn lựa chọn</option>
                                            <option value="1">&gt; 1</option>
                                            <option value="20">&lt; 20</option>
                                            <option value="40">&lt; 40</option>
                                            <option value="80">&lt; 80</option>
                                            <option value="160">&lt; 160</option>
                                        </select>
                                    </div>

                                    {/* Ngày cập nhật */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-blue-500" />
                                            Ngày cập nhật
                                        </h3>
                                        <select
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                                            value={filters["Ngày cập nhật"] || ""}
                                            onChange={(e) => handleFilterChange("Ngày cập nhật", e.target.value)}
                                        >
                                            <option value="">Chọn lựa chọn</option>
                                            <option value="today">Hôm nay</option>
                                            <option value="week">Tuần này</option>
                                            <option value="month">Tháng này</option>
                                            <option value="older">Cũ hơn</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 3: Chủ đề - Full width */}
                                <div className="w-full">
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <Ticket className="w-4 h-4 text-pink-500" />
                                            Chủ đề ({selectedTopics.length})
                                        </h3>
                                        
                                        {/* Selected topics display */}
                                        {selectedTopics.length > 0 && (
                                            <div className="mb-3">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs text-gray-600">Đã chọn:</span>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTopics([])
                                                            setFilters((prevFilters: any) => ({
                                                                ...prevFilters,
                                                                "Chủ đề": undefined
                                                            }))
                                                        }}
                                                        className="text-xs text-red-600 hover:text-red-800 underline cursor-pointer"
                                                    >
                                                        Xóa tất cả
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {selectedTopics.map((topic) => (
                                                        <span
                                                            key={topic}
                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full border border-pink-200"
                                                        >
                                                            {topic}
                                                            <button
                                                                onClick={() => handleTopicSelection(topic)}
                                                                className="ml-1 text-pink-600 hover:text-pink-800 cursor-pointer"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Multi-select checkboxes - Grid layout for better space usage */}
                                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white p-3">
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                                {[
                                                    "18+", "Agency", "Ẩm Thực", "Bất Động Sản", "Công Nghệ", "Công Nghiệp", 
                                                    "Du Lịch", "Động Vật", "Đời Sống", "Edu", "Game", "Game Làm Giàu", 
                                                    "GOV", "Luật", "Nông nghiệp", "Nước ngoài", "Phim", "Tài Chính", 
                                                    "Thể thao", "Thời trang", "Tổng Hợp", "Truyện", "Việc Làm", 
                                                    "Xây Dựng", "Xe", "Xổ Số", "Y tế"
                                                ].map((topic) => (
                                                    <label key={topic} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                                                            checked={selectedTopics.includes(topic)}
                                                            onChange={() => handleTopicSelection(topic)}
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700 truncate">{topic}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
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
                                        className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2 font-medium cursor-pointer"
                                    >
                                        <Undo2 className="w-4 h-4" />
                                        Làm mới
                                    </button>
                                    <button
                                        onClick={applyFilters}
                                        className="px-6 py-3 rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium cursor-pointer"
                                    >
                                        <Filter className="w-4 h-4" />
                                        Áp dụng bộ lọc
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

