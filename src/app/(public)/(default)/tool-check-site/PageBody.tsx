"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import type React from "react"

import { useSheetToolData } from "@/hooks/useSheetToolData"
import "./custom-table.css"
import getUserInfo from "@/components/userInfo"
import { HotTable, type HotTableRef } from "@handsontable/react-wrapper"
import type Handsontable from "handsontable"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import { registerAllModules } from "handsontable/registry"
import {
    Search,
    Check,
    MessageSquare,
    X,
    RefreshCw,
    DollarSign,
    CreditCard,
    Coins,
    FileText,
    Globe,
    User,
    Inbox,
    EyeOff,
    Eye,
    Copy,
} from "lucide-react"
import DirectMessageModal from "./DirectMessageModal"

// Update the SiteData interface to handle arrays for FileNCC and GroupNCC
interface SiteData {
    cs: string
    tinhTrang: string
    site: string
    bong: string
    bet: string
    chuDe: string
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

registerAllModules()

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
    const [selectedPriceType, setSelectedPriceType] = useState<PriceType>("GP")
    const [selectedBrand, setSelectedBrand] = useState<BrandType>("F")
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>("USDT")
    const [exchangeRate, setExchangeRate] = useState<string>("28")
    const [selectedSearchType, setSelectedSearchType] = useState<SearchType>("Site")
    const [userInfo] = useState(getUserInfo())
    const [duplicateSites, setDuplicateSites] = useState<{ [key: string]: SiteData[] }>({})
    const [showDirectMessageModal, setShowDirectMessageModal] = useState(false)
    const [showNccSelectionModal, setShowNccSelectionModal] = useState(false)
    const [selectedNCCs, setSelectedNCCs] = useState<Set<string>>(new Set())
    const [nccList, setNccList] = useState<Array<{ id: string; name: string }>>([])
    const [showDuplicates, setShowDuplicates] = useState(true)
    const [sendingMessage, setSendingMessage] = useState(false) // Loading state riêng cho việc gửi tin nhắn
    const mainTableRef = useRef<HotTableRef>(null)
    const duplicatesTableRef = useRef<HotTableRef>(null)
    const selectionAnchorRef = useRef<{ row: number; col: number } | null>(null)

    // Sử dụng hook tối ưu để fetch và cache dữ liệu
    const { data: toolData, loading, refreshing, refetch, isStale } = useSheetToolData(true)
    const allData = toolData?.gpTextVN || []

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

    // Fetch dữ liệu mới khi user click refresh
    const fetchData = async () => {
        await refetch()
        // Sau khi fetch xong, nếu có searchTerm thì chạy lại search
        if (searchTerm) {
            // Delay một chút để đảm bảo allData đã được cập nhật
            setTimeout(() => {
                handleSearch(searchTerm)
            }, 100)
        }
    }

    // Khi dữ liệu được load, tự động chạy search nếu có searchTerm
    useEffect(() => {
        if (toolData?.gpTextVN && searchTerm) {
            handleSearch(searchTerm)
        }
    }, [toolData, searchTerm]) // eslint-disable-line react-hooks/exhaustive-deps

    // Normalize URL for comparison
    const normalizeUrl = (url: string): string => {
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
    }

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
                // For NCC search, only process terms that start with "N" (case insensitive)
                const normalizedMaNCC = searchField.toLowerCase().trim()

                for (const term of searchTerms) {
                    const trimmedTerm = term.trim()
                    if (!trimmedTerm) continue

                    // Only process terms that start with "N" or "n"
                    if (!trimmedTerm.toLowerCase().startsWith("n")) continue

                    const normalizedTerm = trimmedTerm.toLowerCase()

                    // Exact match or starts with match for NCC codes
                    if (normalizedMaNCC === normalizedTerm || normalizedMaNCC.startsWith(normalizedTerm)) {
                        return normalizedMaNCC
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

    // Core search logic (immediate)
    const runSearch = useCallback(
        (value: string) => {
            if (!value.trim()) {
                setFilteredData([])
                setDuplicateSites({})
                setHasSearched(false)
                return
            }

            const searchTerms = value.split(/[,\n\s]+/).filter((term) => term.trim() !== "")

            if (searchTerms.length === 0) {
                setFilteredData([])
                setDuplicateSites({})
                setHasSearched(false)
                return
            }

            let validTerms: string[] = []
            if (selectedSearchType === "Site") {
                validTerms = searchTerms.map((term) => normalizeUrl(term.trim())).filter((term) => term !== "")
            } else {
                // Normalize NCC terms: uppercase and auto-prefix 'N' if missing
                validTerms = searchTerms
                    .filter((term) => term.trim().length > 0)
                    .map((term) => {
                        const t = term.trim().toUpperCase()
                        return t.startsWith("") ? t : `${t}`
                    })
            }

            if (validTerms.length === 0) {
                setFilteredData([])
                setDuplicateSites({})
                setHasSearched(true)
                return
            }

            const mainItems: SiteData[] = []
            const newDuplicateSites: { [key: string]: SiteData[] } = {}

            validTerms.forEach((term) => {
                const normalizedTerm = term // validTerms are already normalized/uppercased
                const matchingItems = allData.filter((item) => {
                    if (selectedSearchType === "Site") {
                        const normalizedSite = normalizeUrl(item.site)
                        return normalizedSite === normalizedTerm
                    } else {
                        const normalizedMaNCC = (item.MaNCC || "").toUpperCase().trim()
                        return normalizedMaNCC === normalizedTerm || normalizedMaNCC.startsWith(normalizedTerm)
                    }
                })

                if (matchingItems.length > 0) {
                    if (selectedSearchType === "Site") {
                        // Sort by selected price type (GP, Text, TextHome, TextHeader)
                        matchingItems.sort((a, b) => {
                            const priceField = getPriceColumnData(selectedPriceType, selectedBrand, "giaMua")
                            const priceA = Number.parseFloat((a as any)[priceField])
                            const priceB = Number.parseFloat((b as any)[priceField])
                            const isNumericA = !isNaN(priceA)
                            const isNumericB = !isNaN(priceB)
                            if (isNumericA && isNumericB) return priceA - priceB
                            if (isNumericA) return -1
                            if (isNumericB) return 1
                            return 0
                        })

                        const mainItem = matchingItems[0]
                        mainItems.push(mainItem)

                        if (matchingItems.length > 1) {
                            const duplicateItems = matchingItems.slice(1)
                            const normalizedSite = normalizeUrl(mainItem.site)
                            if (!newDuplicateSites[normalizedSite]) {
                                newDuplicateSites[normalizedSite] = []
                            }
                            newDuplicateSites[normalizedSite].push(...duplicateItems)
                        }
                    } else {
                        mainItems.push(...matchingItems)
                    }
                } else {
                    const emptyItem: SiteData = {
                        cs: "",
                        tinhTrang: "Không tìm thấy",
                        site: term.trim(),
                        bong: "",
                        bet: "",
                        chuDe: "",
                        DR: "",
                        trafficTool: "",
                        ghiChu: "",
                        giaBanGP: "",
                        giaBanText: "",
                        giaBanTextHome: "",
                        giaBanTextHeader: "",
                        giaBanGPLio: "",
                        giaBanTextLio: "",
                        giaBanTextHomeLio: "",
                        giaBanTextHeaderLio: "",
                        giaMuaGP: "",
                        giaMuaText: "",
                        giaMuaTextHome: "",
                        giaMuaTextHeader: "",
                        hoaHongGP: "",
                        hoaHongText: "",
                        giaCuoiGP: "",
                        giaCuoiText: "",
                        giaCuoiTextHome: "",
                        giaCuoiTextHeader: "",
                        loiNhuanGP: "",
                        loiNhuanText: "",
                        loiNhuanTextHome: "",
                        loiNhuanTextHeader: "",
                        loiNhuanGPLio: "",
                        loiNhuanTextLio: "",
                        loiNhuanTextHomeLio: "",
                        loiNhuanTextHeaderLio: "",
                        NCC: "",
                        MaNCC: "",
                        FileNCC: "",
                        GroupNCC: "",
                        GhiChuNCC: "",
                        timeText: "",
                    }
                    mainItems.push(emptyItem)
                }
            })

            const applyCurrencyConversion = (dataToConvert: SiteData[]): SiteData[] => {
                return dataToConvert.map((item) => {
                    const newItem = { ...item }
                    if (selectedCurrency === "VND") {
                        const rate = Number.parseFloat(exchangeRate)
                        if (!isNaN(rate)) {
                            const fieldsToConvert: Array<"giaBan" | "giaMua" | "giaCuoi" | "loiNhuan"> = [
                                "giaBan",
                                "giaMua",
                                "giaCuoi",
                                "loiNhuan",
                            ]
                            fieldsToConvert.forEach((fieldKey) => {
                                const fieldName = getPriceColumnData(selectedPriceType, selectedBrand, fieldKey)
                                const raw = newItem[fieldName as keyof SiteData]?.toString() || ""
                                const numericValue = Number.parseFloat(raw)
                                if (!isNaN(numericValue)) {
                                    ; (newItem as any)[fieldName] = (numericValue * rate).toString()
                                }
                            })
                        }
                    }
                    return newItem
                })
            }

            const convertedMainItems = applyCurrencyConversion(mainItems)
            const convertedDuplicates: { [key: string]: SiteData[] } = {}
            Object.entries(newDuplicateSites).forEach(([key, items]) => {
                convertedDuplicates[key] = applyCurrencyConversion(items)
            })

            setFilteredData(convertedMainItems)
            setDuplicateSites(convertedDuplicates)
            setHasSearched(true)
        },
        [allData, selectedSearchType, selectedCurrency, selectedBrand, selectedPriceType, exchangeRate],
    )

    // Debounced search for typing
    const handleSearch = useCallback(
        debounce((value: string) => {
            runSearch(value)
        }, 300),
        [runSearch],
    )

    // Update search when input changes or search type changes (debounced for typing)
    useEffect(() => {
        handleSearch(searchTerm)
    }, [searchTerm, handleSearch, selectedSearchType, selectedPriceType])

    // Update data immediately when currency, brand, price type, or rate changes to avoid flicker
    useEffect(() => {
        if (hasSearched) {
            runSearch(searchTerm)
        }
    }, [selectedCurrency, selectedBrand, selectedPriceType, exchangeRate, hasSearched, searchTerm, runSearch]) // Added exchangeRate

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

    const getPriceColumnData = (
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
    }

    // Add a helper function to handle price column rendering
    const createPriceRenderer = (field: string) => {
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

            // Make summary row values red
            if (row === 0) {
                td.style.color = "red"
            }

            td.title = displayValue
            td.textContent = displayValue
            return td
        }) as RendererFunction
    }

    const generateColumns = () => {
        // Add debug log to check user role
        console.log("Current user role:", userInfo?.role)
        console.log("Is restricted user:", userInfo?.role !== "Admin" && userInfo?.role !== "Nhân viên")

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
                width: 95,
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
                width: 95,
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
                        td.style.color = "red"
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
            title: `Giá Bán`,
            data: sellPriceColumn,
            width: 65,
            className: "htMiddle",
            renderer: createPriceRenderer(sellPriceColumn),
        })

        // Modified role check with more explicit conditions
        const isRestrictedUser = !userInfo || (userInfo.role !== "Admin" && userInfo.role !== "Nhân viên")
        console.log("Is restricted user (modified):", isRestrictedUser)

        if (isRestrictedUser) {
            console.log("Showing restricted columns for user role:", userInfo?.role)
            // Filter columns to only show the specified ones
            const allowedColumns = [
                "tinhTrang",
                "bong",
                "bet",
                "site",
                "chuDe",
                "DR",
                "trafficTool",
                "ghiChu",
                sellPriceColumn,
            ]
            const filteredColumns = baseColumns.filter((col) => allowedColumns.includes(col.data as string))
            console.log(
                "Filtered columns:",
                filteredColumns.map((col) => col.data),
            )
            return filteredColumns
        }

        console.log("Showing all columns for user role:", userInfo?.role)
        // Add remaining columns with the same configuration for Admin and Nhân viên
        const buyPriceColumn = getPriceColumnData(selectedPriceType, selectedBrand, "giaMua")
        const finalPriceColumn = getPriceColumnData(selectedPriceType, selectedBrand, "giaCuoi")
        console.log("finalPriceColumn", finalPriceColumn)
        const profitColumn = getPriceColumnData(selectedPriceType, selectedBrand, "loiNhuan")
        const commissionColumn = getPriceColumnData(selectedPriceType, selectedBrand, "hoaHong")

        const additionalColumns = [
            {
                title: `Giá Mua`,
                data: buyPriceColumn,
                width: 70,
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
                title: `Giá Cuối`,
                data: finalPriceColumn,
                width: 69,
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
                    td.title = value || ""
                    td.textContent = value || ""
                    td.style.textAlign = "center"
                    return td
                }) as RendererFunction,
            },
            {
                title: "Tên",
                data: "NCC",
                width: 70,
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
                        // For summary row, make text red and 500
                        td.style.color = "red"

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
                        } else {
                            td.textContent = "No"
                            td.style.color = "#999"
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
                            td.style.color = "#999" // Gray color for "No" text
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
    }

    // Add a function to calculate summary data
    const calculateSummary = (data: SiteData[]) => {
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
    }

    // Count NCCs with usable IdGroup (handles non-string values safely)
    const getValidNCCsCount = (data: SiteData[]) => {
        return data.filter((item) => normalizeIdGroup(item.IdGroup) !== "").length
    }

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
                        console.log("Data copied to clipboard successfully.")
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
                        console.log("Data copied using fallback method.")
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

    // Modify renderHotTable to accept a ref parameter
    const renderHotTable = (data: SiteData[], tableKey: string, tableRef: React.RefObject<HotTableRef>) => {
        console.log("renderHotTable called with:", {
            dataLength: data?.length,
            tableKey,
            userRole: userInfo?.role,
            isRestricted: userInfo?.role !== "Admin" && userInfo?.role !== "Nhân viên",
        })

        if (!data || data.length === 0) return null

        // Add summary row at the beginning
        const summaryRow = calculateSummary(data)
        const dataWithSummary = summaryRow ? [summaryRow, ...data] : [...data]

        // Generate columns here
        const generatedColumns = generateColumns()
        console.log(
            "Generated columns:",
            generatedColumns.map((col) => col.data),
        )

        // Enable two-tap range selection for touch/mobile: first tap sets anchor, second tap selects rectangle
        const onCellMouseDown = (event: any, coords: any) => {
            if (!coords) return
            const { row, col } = coords
            const anchor = selectionAnchorRef.current
            const hot = tableRef.current?.hotInstance
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
        }

        return (
            <div className="overflow-x-auto w-full">
                <HotTable
                    ref={tableRef}
                    key={`${tableKey}-${selectedCurrency}`}
                    data={dataWithSummary}
                    columns={generatedColumns.map((col) => ({
                        data: col.data,
                        title: col.title,
                        type: "text",
                        readOnly: true,
                        width: col.width,
                        className: col.className,
                        renderer: col.renderer,
                    }))}
                    height="auto"
                    width="100%"
                    licenseKey="non-commercial-and-evaluation"
                    stretchH="all"
                    autoWrapRow={true}
                    rowHeaders={false}
                    colHeaders={true}
                    copyPaste={true}
                    columnSorting={true}
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
                />
            </div>
        )
    }

    // Add message handling functions
    const handleDirectMessage = useCallback(
        async (message: string) => {
            if (!message.trim()) {
                alert("Vui lòng nhập tin nhắn")
                return
            }

            try {
                setSendingMessage(true)
                // Lấy unique IdGroup từ filteredData
                const uniqueIdGroups = new Set<string>()
                filteredData.forEach((item: SiteData) => {
                    const chatIdRaw = normalizeIdGroup(item.IdGroup)
                    if (chatIdRaw !== "") {
                        let chatId = chatIdRaw
                        if (chatId.startsWith("#")) {
                            chatId = chatId.replace("#", "")
                        }
                        uniqueIdGroups.add(chatId)
                    }
                })

                if (uniqueIdGroups.size === 0) {
                    alert("Không tìm thấy IdGroup nào trong kết quả tìm kiếm")
                    return
                }

                // Confirm with user
                if (confirm(`Bạn có chắc chắn muốn gửi tin nhắn đến tất cả ${uniqueIdGroups.size} NCC?`)) {
                    alert(`Đang gửi tin nhắn cho ${uniqueIdGroups.size} NCC...`)

                    const successfulSends: string[] = []
                    const errors: string[] = []
                    const botToken = "8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U"

                    // Send message to Telegram
                    for (const chatId of uniqueIdGroups) {
                        try {
                            const url = `https://ylink.qctl44.workers.dev/bot${botToken}/sendMessage`
                            const params = new URLSearchParams({
                                chat_id: chatId,
                                text: message,
                            })

                            console.log("Sending message to chat ID:", chatId)
                            const res = await fetch(`${url}?${params.toString()}`)
                            const responseData = await res.json()

                            if (responseData.ok) {
                                successfulSends.push(chatId)
                            } else {
                                errors.push(`Failed to send to ${chatId}: ${responseData.description}`)
                            }
                        } catch (error: any) {
                            console.error("Error sending message:", error)
                            errors.push(`Failed to send to ${chatId}: Unknown error`)
                        }
                    }

                    // Show results
                    if (successfulSends.length > 0) {
                        alert(`Đã gửi tin nhắn thành công đến ${successfulSends.length} NCC`)
                    }

                    if (errors.length > 0) {
                        alert(errors.join("\n"))
                    }

                    setShowDirectMessageModal(false)
                }
            } catch (error: any) {
                console.error("Error:", error)
                alert("Có lỗi xảy ra khi gửi tin nhắn")
            } finally {
                setSendingMessage(false)
            }
        },
        [filteredData],
    )

    const openNccSelectionModal = useCallback(() => {
        // Extract unique NCCs from the filtered data
        const uniqueNccs = new Map<string, { id: string; name: string }>()

        filteredData.forEach((result) => {
            const chatIdRaw = normalizeIdGroup(result.IdGroup)
            if (chatIdRaw !== "" && result.NCC) {
                let chatId = chatIdRaw
                if (chatId.startsWith("#")) {
                    chatId = chatId.replace("#", "")
                }

                uniqueNccs.set(chatId, {
                    id: chatId,
                    name: result.NCC,
                })
            }
        })

        setNccList(Array.from(uniqueNccs.values()))
        setShowNccSelectionModal(true)
    }, [filteredData])

    const handleMessageNCC = useCallback(
        async (data: SiteData | null, useSelectedNccs = false) => {
            const messages = [
                "Lên bài giúp em nhé, em note trong file rồi ạ",
                "Em có bài cần gắn trong file rồi ạ",
                "Anh ơi, em odr bài gp ạ, thông tin bài trong file anh nhé",
                "Có bài cần gắn, em để trong file rùi. anh gắn giúp em nha",
                "Anh ơi, em lên đơn, thông tin em bỏ trong file ạ",
            ]

            const randomMessage = messages[Math.floor(Math.random() * messages.length)]
            let selectedChatIds: Array<{ value: string; label: string }> = []

            if (useSelectedNccs) {
                if (selectedNCCs.size === 0) {
                    alert("Vui lòng chọn ít nhất một NCC để gửi tin nhắn")
                    return
                }

                selectedChatIds = Array.from(selectedNCCs).map((id) => {
                    const ncc = nccList.find((n) => n.id === id)
                    return {
                        value: id,
                        label: ncc ? ncc.name : "NCC",
                    }
                })

                alert(`Đang gửi tin nhắn cho ${selectedChatIds.length} NCC...`)
            } else if (data) {
                const chatIdRaw = normalizeIdGroup(data.IdGroup)
                if (chatIdRaw !== "") {
                    let chatId = chatIdRaw
                    if (chatId.startsWith("#")) {
                        chatId = chatId.replace("#", "")
                    }

                    selectedChatIds = [{ value: chatId, label: data.NCC || "NCC" }]
                    alert(`Đang gửi tin nhắn cho NCC: ${data.NCC}...`)
                } else {
                    alert("Không tìm thấy IdGroup cho NCC này")
                    return
                }
            } else {
                return
            }

            const successfulSends: string[] = []
            const errors: string[] = []
            const botToken = "8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U"

            for (const chatId of selectedChatIds) {
                try {
                    const url = `https://ylink.qctl44.workers.dev/bot${botToken}/sendMessage`
                    const params = new URLSearchParams({
                        chat_id: chatId.value,
                        text: randomMessage,
                    })

                    const res = await fetch(`${url}?${params.toString()}`)
                    const responseData = await res.json()

                    if (responseData.ok) {
                        successfulSends.push(chatId.label)
                    }
                } catch (error) {
                    console.error("Error sending message:", error)
                    errors.push(`Failed to send to ${chatId.label}: Unknown error`)
                }
            }

            if (successfulSends.length > 0) {
                alert(`Đã gửi tin nhắn thành công đến: ${successfulSends.join(", ")}`)
            }

            if (errors.length > 0) {
                alert(errors.join("\n"))
            }

            setShowNccSelectionModal(false)
        },
        [selectedNCCs, nccList],
    )

    const handleMessageAllNCCs = useCallback(async () => {
        const validNCCs = filteredData
            .map((result) => {
                const chatIdRaw = normalizeIdGroup(result.IdGroup)
                return {
                    chatId: chatIdRaw,
                    result,
                }
            })
            .filter(({ chatId, result }) => chatId !== "" && !!result.NCC)
            .map(({ chatId, result }) => {
                let normalizedChatId = chatId
                if (chatId.startsWith("#")) {
                    chatId = chatId.replace("#", "")
                }
                return {
                    value: normalizedChatId,
                    label: result.NCC || "NCC",
                }
            })

        const uniqueNCCs = Array.from(new Map(validNCCs.map((item) => [item.value, item])).values())

        if (uniqueNCCs.length === 0) {
            alert("Không tìm thấy NCC nào có IdGroup trong kết quả tìm kiếm")
            return
        }

        if (confirm(`Bạn có chắc chắn muốn gửi tin nhắn đến tất cả ${uniqueNCCs.length} NCC?`)) {
            const messages = [
                "Lên bài giúp em nhé, em note trong file rồi ạ",
                "Em có bài cần gắn trong file rồi ạ",
                "Anh ơi, em odr bài gp ạ, thông tin bài trong file anh nhé",
                "Có bài cần gắn, em để trong file rùi. anh gắn giúp em nha",
                "Anh ơi, em lên đơn, thông tin em bỏ trong file ạ",
            ]

            const randomMessage = messages[Math.floor(Math.random() * messages.length)]
            alert(`Đang gửi tin nhắn cho ${uniqueNCCs.length} NCC...`)

            const successfulSends: string[] = []
            const errors: string[] = []
            const botToken = "8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U"

            for (const chatId of uniqueNCCs) {
                try {
                    const url = `https://ylink.qctl44.workers.dev/bot${botToken}/sendMessage`
                    const params = new URLSearchParams({
                        chat_id: chatId.value,
                        text: randomMessage,
                    })

                    const res = await fetch(`${url}?${params.toString()}`)
                    const responseData = await res.json()

                    if (responseData.ok) {
                        successfulSends.push(chatId.label)
                    } else {
                        errors.push(`Failed to send to ${chatId.label}: ${responseData.description}`)
                    }
                } catch (error) {
                    console.error("Error sending message:", error)
                    errors.push(`Failed to send to ${chatId.label}: Unknown error`)
                }
            }

            if (successfulSends.length > 0) {
                alert(`Đã gửi tin nhắn thành công đến: ${successfulSends.join(", ")}`)
            }

            if (errors.length > 0) {
                alert(errors.join("\n"))
            }
        }
    }, [filteredData])

    const handleNccSelection = (nccId: string) => {
        setSelectedNCCs((prev) => {
            const newSelection = new Set(prev)
            if (newSelection.has(nccId)) {
                newSelection.delete(nccId)
            } else {
                newSelection.add(nccId)
            }
            return newSelection
        })
    }

    const selectAllNccs = () => {
        const allNccIds = nccList.map((ncc) => ncc.id)
        setSelectedNCCs(new Set(allNccIds))
    }

    const deselectAllNccs = () => {
        setSelectedNCCs(new Set())
    }

    const hasDuplicates = Object.keys(duplicateSites).length > 0
    const duplicatesCount = Object.values(duplicateSites).flat().length

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-6 px-4 relative">
            {/* Loading Overlay - Full Screen với backdrop mờ */}
            {loading && !toolData && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[300px]">
                        <RefreshCw className="h-12 w-12 text-blue-600 animate-spin" />
                        <h3 className="text-xl font-semibold text-gray-800">Đang tải dữ liệu...</h3>
                        <p className="text-sm text-gray-500 text-center">Vui lòng đợi trong khi chúng tôi tải dữ liệu mới nhất</p>
                    </div>
                </div>
            )}
            
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-blue-100">
                    <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-2xl font-500 text-white flex items-center justify-center md:justify-start gap-2">
                                    <FileText className="h-6 w-6" />
                                    Tool Check Site
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {/* Nhóm 1: Site / NCC */}
                                <div className="w-full flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setSelectedSearchType("Site")}
                                        className={`flex-1 flex items-center justify-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedSearchType === "Site" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        <Globe className="h-4 w-4 mr-1" />
                                        Site
                                    </button>
                                    <button
                                        onClick={() => setSelectedSearchType("NCC")}
                                        className={`flex-1 flex items-center justify-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedSearchType === "NCC" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        <User className="h-4 w-4 mr-1" />
                                        NCC
                                    </button>
                                </div>

                                {/* Nhóm 2: USDT / [Tỉ giá] / VND */}
                                <div className="w-full flex items-center bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setSelectedCurrency("USDT")}
                                        className={`flex-1 flex items-center justify-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedCurrency === "USDT" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        <DollarSign className="h-4 w-4 mr-1" />
                                        USDT
                                    </button>
                                    {selectedCurrency === "VND" && (
                                        <div className="flex items-center">
                                            <input
                                                type="text"
                                                value={exchangeRate}
                                                onChange={(e) => setExchangeRate(e.target.value || "")}
                                                className="w-10 px-2 py-2 text-center text-xs bg-white text-blue-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                placeholder="28"
                                            />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setSelectedCurrency("VND")}
                                        className={`flex-1 flex items-center justify-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedCurrency === "VND" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        <Coins className="h-4 w-4 mr-1" />
                                        VND
                                    </button>
                                </div>

                                {/* Nhóm 3: F / X */}
                                <div className="w-full flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setSelectedBrand("F")}
                                        className={`flex-1 flex items-center justify-center px-1 py-1.5 text-sm font-medium transition-colors ${selectedBrand === "F" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        <CreditCard className="h-4 w-4 mr-1" />
                                        F-ALL
                                    </button>
                                    <button
                                        onClick={() => setSelectedBrand("X")}
                                        className={`flex-1 flex items-center justify-center px-1 py-1.5 text-sm font-medium transition-colors ${selectedBrand === "X" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        <CreditCard className="h-4 w-4 mr-1" />
                                        X-ALL
                                    </button>
                                </div>

                                {/* Nút Refresh */}
                                <div className="w-full flex relative">
                                    <button
                                        onClick={fetchData}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors shadow-md"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${loading || refreshing ? "animate-spin" : ""}`} />
                                    </button>
                                    {(refreshing || isStale) && (
                                        <div className="absolute -top-1 -right-1 flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium z-10">
                                            <RefreshCw className={`w-2.5 h-2.5 ${refreshing ? "animate-spin" : ""}`} />
                                        </div>
                                    )}
                                </div>
                            </div>


                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4">
                        <div className="relative">
                            <textarea
                                placeholder={`Tìm kiếm ${selectedSearchType === "Site"
                                    ? "site (hỗ trợ mọi định dạng domain: example.com, https://example.com, www.example.com - không phân biệt hoa thường)"
                                    : "mã NCC (chỉ tìm mã bắt đầu bằng chữ N, ví dụ: N001, N123)"
                                    } (nhập từng giá trị trên một dòng hoặc cách nhau bằng dấu phẩy, khoảng trắng...)`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                rows={5}
                                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 text-gray-700 placeholder-gray-400 bg-white shadow-sm resize-none overflow-y-auto"
                            />
                            <Search className="absolute right-3 top-3 text-gray-400 h-5 w-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Unified Table Display - Full Width */}
            {hasSearched && filteredData.length > 0 ? (
                <div className="w-full bg-white -mx-4">
                            {/* Compact Table Stats and Controls */}
                            <div className="mb-4 px-4 pt-4">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col items-left gap-2">
                                            <div className="flex items-center">
                                                <div className="mr-2 p-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md shadow-sm">
                                                    <Inbox className="h-4 w-4 text-white" />
                                                </div>
                                                <h3 className="text-lg font-500 text-blue-700 mb-1">Kết quả tìm kiếm</h3>
                                            </div>

                                            {/* Compact Price Type Selection */}
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-gray-600 mr-1">Loại giá:</span>
                                                {[
                                                    { id: "GP", label: "GP", icon: "💰" },
                                                    { id: "Text", label: "Text", icon: "📝" },
                                                    { id: "TextHome", label: "Home", icon: "🏠" },
                                                    { id: "TextHeader", label: "Header", icon: "📋" },
                                                ].map((type) => (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => handlePriceTypeChange(type.id as PriceType)}
                                                        className={`flex items-center px-2 py-1 rounded text-sm font-medium transition-all duration-200 ${selectedPriceType === type.id
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

                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-end">
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">
                                                        {getValidNCCsCount(filteredData) > 0
                                                            ? `Bạn có thể nhắn tin cho ${getValidNCCsCount(filteredData)} NCC có IdGroup`
                                                            : "Không có NCC nào có IdGroup để gửi tin nhắn"}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {getValidNCCsCount(filteredData) > 0
                                                            ? "Chọn 1 trong các lựa chọn dưới đây"
                                                            : "Chỉ NCC có IdGroup mới có thể nhận tin nhắn"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {(userInfo?.role === "Admin" || userInfo?.role === "Nhân viên") && (
                                                    <>
                                                        <button
                                                            onClick={() => setShowDirectMessageModal(true)}
                                                            disabled={getValidNCCsCount(filteredData) === 0}
                                                            className={`hidden md:flex items-center px-2 py-1 text-sm rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform ${getValidNCCsCount(filteredData) === 0
                                                                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                                                                : "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 hover:scale-105"
                                                                }`}
                                                            title={
                                                                getValidNCCsCount(filteredData) === 0
                                                                    ? "Không có NCC nào có IdGroup để gửi tin nhắn"
                                                                    : "Soạn tin nhắn tùy chỉnh"
                                                            }
                                                        >
                                                            <MessageSquare className="h-4 w-4 mr-2" />
                                                            Soạn tin nhắn
                                                            {getValidNCCsCount(filteredData) === 0 && <span className="ml-1 text-xs">(0)</span>}
                                                        </button>
                                                        <button
                                                            onClick={openNccSelectionModal}
                                                            disabled={sendingMessage || filteredData.length === 0 || getValidNCCsCount(filteredData) === 0}
                                                            className={`hidden md:flex items-center px-2 py-1 text-sm rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform ${sendingMessage || filteredData.length === 0 || getValidNCCsCount(filteredData) === 0
                                                                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                                                                : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:scale-105"
                                                                }`}
                                                            title={
                                                                getValidNCCsCount(filteredData) === 0
                                                                    ? "Không có NCC nào có IdGroup để gửi tin nhắn"
                                                                    : "Chọn NCC cụ thể để gửi tin nhắn"
                                                            }
                                                        >
                                                            <MessageSquare className="h-4 w-4 mr-2" />
                                                            Chọn NCC
                                                            <span className="ml-1 text-xs">({getValidNCCsCount(filteredData)})</span>
                                                        </button>
                                                        <button
                                                            onClick={handleMessageAllNCCs}
                                                            disabled={sendingMessage || filteredData.length === 0 || getValidNCCsCount(filteredData) === 0}
                                                            className={`hidden md:flex items-center px-2 py-1 text-sm rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform ${sendingMessage || filteredData.length === 0 || getValidNCCsCount(filteredData) === 0
                                                                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                                                                : "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:scale-105"
                                                                }`}
                                                            title={
                                                                getValidNCCsCount(filteredData) === 0
                                                                    ? "Không có NCC nào có IdGroup để gửi tin nhắn"
                                                                    : `Gửi tin nhắn đến tất cả ${getValidNCCsCount(filteredData)} NCC có IdGroup`
                                                            }
                                                        >
                                                            <MessageSquare className="h-4 w-4 mr-2" />
                                                            Gửi tất cả NCC
                                                            <span className="ml-1 text-xs">({getValidNCCsCount(filteredData)})</span>
                                                        </button>
                                                    </>
                                                )}
                                                {hasDuplicates && (
                                                    <button
                                                        onClick={() => setShowDuplicates(!showDuplicates)}
                                                        className={`flex items-center px-2 py-1 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 border ${!showDuplicates
                                                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 hover:from-amber-600 hover:to-orange-600"
                                                            : "bg-gradient-to-r from-slate-500 to-slate-600 text-white border-slate-400 hover:from-slate-600 hover:to-slate-700"
                                                            }`}
                                                    >
                                                        {showDuplicates ? (
                                                            <>
                                                                <EyeOff className="h-4 w-4 mr-2" />
                                                                Site Trùng
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                Site Trùng
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Results Table */}
                            {renderHotTable(
                                filteredData,
                                `main-${selectedPriceType}-${selectedBrand}-${selectedSearchType}`,
                                mainTableRef,
                            )}

                            {/* Enhanced Duplicates Table */}
                            {showDuplicates && hasDuplicates && (
                                <div className="mt-8 border-t-2 border-gray-200 pt-6 px-4">
                                    <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 mb-4 shadow-sm">
                                        <div className="flex items-center">
                                            <div className="mr-3 p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-md">
                                                <Globe className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-500 text-gray-800 mb-1">Site trùng lặp</h3>
                                                <p className="text-sm text-gray-600">
                                                    Hiển thị {duplicatesCount} site có cùng domain nhưng giá khác nhau.
                                                    <span className="text-orange-600 font-medium ml-1">
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
                                    )}
                                </div>
                            )}
                            <div className="pb-4"></div>
                        </div>
                    ) : hasSearched ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <div className="p-4 bg-gray-50 rounded-full mb-4">
                                <Inbox className="h-12 w-12 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">Không có dữ liệu</h3>
                            <p className="text-sm text-gray-500 text-center max-w-sm">
                                {selectedSearchType === "Site"
                                    ? `Không tìm thấy site nào phù hợp với từ khóa "${searchTerm}"`
                                    : `Không tìm thấy mã NCC nào bắt đầu bằng "N" phù hợp với từ khóa "${searchTerm}"`}
                            </p>
                            <p className="text-xs text-gray-400 text-center max-w-sm mt-2">
                                {selectedSearchType === "Site"
                                    ? "Hãy thử với các định dạng khác: example.com, https://example.com, www.example.com"
                                    : "Chỉ tìm kiếm mã NCC bắt đầu bằng chữ N (ví dụ: N001, N123)"}
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
                                    : "Nhập mã NCC bắt đầu bằng chữ N để tìm kiếm (ví dụ: N001, N123)"}
                            </p>
                            <p className="text-xs text-gray-400 text-center max-w-sm mt-2">
                                Bạn có thể tìm kiếm nhiều {selectedSearchType === "Site" ? "site" : "mã NCC"} cùng lúc bằng cách phân
                                cách chúng bằng dấu phẩy.
                            </p>
                        </div>
                    )}

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

            {/* Direct Message Modal */}
            <DirectMessageModal
                show={showDirectMessageModal}
                loading={sendingMessage}
                onClose={() => setShowDirectMessageModal(false)}
                onSend={handleDirectMessage}
            />

            {/* NCC Selection Modal */}
            {showNccSelectionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-500 text-gray-800">Chọn NCC để gửi tin nhắn</h3>
                            <button onClick={() => setShowNccSelectionModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="mb-4 flex justify-between">
                            <button
                                onClick={selectAllNccs}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
                            >
                                Chọn tất cả
                            </button>
                            <button
                                onClick={deselectAllNccs}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm"
                            >
                                Bỏ chọn tất cả
                            </button>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg p-4">
                            {nccList.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {nccList.map((ncc) => (
                                        <div
                                            key={ncc.id}
                                            className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                                            onClick={() => handleNccSelection(ncc.id)}
                                        >
                                            <div
                                                className={`w-5 h-5 border rounded flex items-center justify-center mr-3 ${selectedNCCs.has(ncc.id) ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                                                    }`}
                                            >
                                                {selectedNCCs.has(ncc.id) && <Check className="h-3 w-3 text-white" />}
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-800">{ncc.name}</span>
                                                <span className="text-sm text-gray-500 block">ID: {ncc.id}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <Search className="h-8 w-8 text-gray-400 mb-2" />
                                    <p className="text-gray-500 text-center">Không tìm thấy NCC nào có IdGroup trong kết quả tìm kiếm</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3 mt-4">
                            <button
                                onClick={() => setShowNccSelectionModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => handleMessageNCC(null, true)}
                                disabled={selectedNCCs.size === 0}
                                className={`px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${selectedNCCs.size === 0 ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                                    }`}
                            >
                                Gửi tin nhắn ({selectedNCCs.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

