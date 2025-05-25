"use client"
import { useState, useEffect, useCallback } from "react"
import sheetApiRequest from "@/apiRequests/sheet"
import "./custom-table.css"
import getUserInfo from "@/components/userInfo"
import { HotTable } from "@handsontable/react-wrapper"
import Handsontable from "handsontable"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
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
} from "lucide-react"

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
    IdGroup?: string
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

export default function PageBody() {
    const [loading, setLoading] = useState(false)
    const [allData, setAllData] = useState<SiteData[]>([])
    const [filteredData, setFilteredData] = useState<SiteData[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [hasSearched, setHasSearched] = useState(false)
    const [selectedPriceType, setSelectedPriceType] = useState<PriceType>("GP")
    const [selectedBrand, setSelectedBrand] = useState<BrandType>("F")
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>("USDT")
    const [selectedSearchType, setSelectedSearchType] = useState<SearchType>("Site")
    const [userInfo] = useState(getUserInfo())
    const [duplicateSites, setDuplicateSites] = useState<{ [key: string]: SiteData[] }>({})
    const [showDirectMessageModal, setShowDirectMessageModal] = useState(false)
    const [directMessage, setDirectMessage] = useState("")
    const [showNccSelectionModal, setShowNccSelectionModal] = useState(false)
    const [selectedNCCs, setSelectedNCCs] = useState<Set<string>>(new Set())
    const [nccList, setNccList] = useState<Array<{ id: string; name: string }>>([])
    const [showDuplicates, setShowDuplicates] = useState(true)

    const fetchData = async () => {
        try {
            setLoading(true)
            const data: any = await sheetApiRequest.getDataTool()
            console.log("data", data)
            setAllData(data.gpTextVN || [])
            if (searchTerm) {
                handleSearch(searchTerm)
            }
        } catch (error) {
            console.error("Error fetching data:", error)
            alert("Không thể tải dữ liệu. Vui lòng thử lại sau.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

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

                    // Exact match or contains match for normalized domains
                    if (
                        normalizedSite === normalizedTerm ||
                        normalizedSite.includes(normalizedTerm) ||
                        normalizedTerm.includes(normalizedSite)
                    ) {
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

    // Handle search with debounce
    const handleSearch = useCallback(
        debounce((value: string) => {
            if (!value.trim()) {
                setFilteredData([])
                setDuplicateSites({})
                setHasSearched(false)
                return
            }

            // Split search terms by commas, newlines, or spaces
            const searchTerms = value.split(/[,\n\s]+/).filter((term) => term.trim() !== "")

            if (searchTerms.length === 0) {
                setFilteredData([])
                setDuplicateSites({})
                setHasSearched(false)
                return
            }

            // Validate search terms based on search type
            let validTerms: string[] = []

            if (selectedSearchType === "Site") {
                // For site search, accept any non-empty term
                validTerms = searchTerms.filter((term) => term.trim().length > 0)
            } else {
                // For NCC search, only accept terms starting with "N"
                validTerms = searchTerms.filter((term) => {
                    const trimmed = term.trim()
                    return trimmed.length > 0 && trimmed.toLowerCase().startsWith("n")
                })
            }

            // If no valid terms, don't search
            if (validTerms.length === 0) {
                setFilteredData([])
                setDuplicateSites({})
                setHasSearched(false)
                return
            }

            // Group items by normalized search field to find duplicates
            const itemGroups: { [key: string]: SiteData[] } = {}
            const matchedItems: SiteData[] = []

            allData.forEach((item) => {
                const normalizedValue = itemMatchesSearch(item, validTerms)
                if (normalizedValue) {
                    if (!itemGroups[normalizedValue]) {
                        itemGroups[normalizedValue] = []
                    }
                    itemGroups[normalizedValue].push(item)
                    matchedItems.push(item)
                }
            })

            // Process duplicate items
            const duplicates: { [key: string]: SiteData[] } = {}
            const mainItems: SiteData[] = []

            Object.entries(itemGroups).forEach(([normalizedValue, items]) => {
                if (items.length > 1) {
                    // Sort by purchase price (numeric values first, then non-numeric)
                    items.sort((a, b) => {
                        const priceA = Number.parseFloat(a.giaMuaGP)
                        const priceB = Number.parseFloat(b.giaMuaGP)

                        const isNumericA = !isNaN(priceA)
                        const isNumericB = !isNaN(priceB)

                        // If both are numeric, compare values
                        if (isNumericA && isNumericB) {
                            return priceA - priceB
                        }

                        // Numeric values come before non-numeric
                        if (isNumericA) return -1
                        if (isNumericB) return 1

                        // If both are non-numeric, keep original order
                        return 0
                    })

                    // Add the item with lowest price to main table
                    mainItems.push(items[0])

                    // Add the rest to duplicates
                    duplicates[normalizedValue] = items.slice(1)
                } else {
                    // Non-duplicate items go to main table
                    mainItems.push(items[0])
                }
            })

            setFilteredData(mainItems)
            setDuplicateSites(duplicates)
            setHasSearched(true)
        }, 300),
        [allData, itemMatchesSearch, selectedSearchType],
    )

    // Update search when input changes or search type changes
    useEffect(() => {
        handleSearch(searchTerm)
    }, [searchTerm, handleSearch, selectedSearchType])

    const handlePriceTypeChange = (priceType: PriceType) => {
        setSelectedPriceType(priceType)
    }

    // Function to convert price based on currency selection
    const convertPrice = (price: string): string => {
        if (selectedCurrency === "VND") {
            const numericPrice = Number.parseFloat(price || "0") || 0
            return (numericPrice * 26).toString()
        }
        return price
    }

    const getPriceColumnData = (
        priceType: PriceType,
        brand: BrandType,
        field: "giaBan" | "giaMua" | "giaCuoi" | "loiNhuan",
    ) => {
        const suffix = brand === "X" ? "Lio" : ""

        const typeMap = {
            GP: "GP",
            Text: "Text",
            TextHome: "TextHome",
            TextHeader: "TextHeader",
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

            // Make summary row values red
            if (row === 0) {
                td.style.color = "red"
                td.style.fontWeight = "500"
            }

            td.title = value || ""
            td.textContent = value || ""
            return td
        }) as RendererFunction
    }

    const generateColumns = () => {
        const baseColumns = [
            {
                title: "CS",
                data: "cs",
                width: 40,
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
                    return td
                }) as RendererFunction,
            },
            {
                title: "Tình Trạng",
                data: "tinhTrang",
                width: 95,
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
                    return td
                }) as RendererFunction,
            },
            {
                title: "Bóng",
                data: "bong",
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
                    return td
                }) as RendererFunction,
            },
            {
                title: "BET",
                data: "bet",
                width: 40,
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
                    return td
                }) as RendererFunction,
            },
            {
                title: "Site",
                data: "site",
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
                    return td
                }) as RendererFunction,
            },
            {
                title: "Chủ đề",
                data: "chuDe",
                width: 95,
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
                    return td
                }) as RendererFunction,
            },
            {
                title: "DR",
                data: "DR",
                width: 40,
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
                    return td
                }) as RendererFunction,
            },
            {
                title: "Traffic",
                data: "trafficTool",
                width: 80,
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
                    return td
                }) as RendererFunction,
            },
            {
                title: "Ghi Chú",
                data: "ghiChu",
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

                    // Make "Tổng" text red in summary row
                    if (row === 0 && value === "Tổng") {
                        td.style.color = "red"
                        td.style.fontWeight = "500"
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

        // Add remaining columns with the same configuration
        const buyPriceColumn = getPriceColumnData(selectedPriceType, selectedBrand, "giaMua")
        const finalPriceColumn = getPriceColumnData(selectedPriceType, selectedBrand, "giaCuoi")
        const profitColumn = getPriceColumnData(selectedPriceType, selectedBrand, "loiNhuan")

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
                data: selectedPriceType === "GP" ? "hoaHongGP" : "hoaHongText",
                width: 40,
                className: "htMiddle",
                renderer: createPriceRenderer(selectedPriceType === "GP" ? "hoaHongGP" : "hoaHongText"),
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

                    // Check if this is the summary row (first row)
                    const isSummaryRow = row === 0

                    if (isSummaryRow) {
                        // For summary row, make text red and 500
                        td.style.color = "red"
                        td.style.fontWeight = "500"

                        // If there are file URLs in the summary row, make them clickable
                        const fileUrls = (cellProperties?.instance?.getSourceDataAtRow(row) as any)?._fileUrls
                        if (fileUrls && fileUrls.length > 0) {
                            td.innerHTML = `<a href="#" class="file-link" style="color: red; font-weight: 500; text-decoration: underline;">${value}</a>`
                            td.onclick = (e: MouseEvent) => {
                                e.preventDefault()
                                fileUrls.forEach((url: string) => {
                                    window.open(url, "_blank")
                                })
                            }
                        } else {
                            td.textContent = "No"
                        }
                    } else {
                        // For regular rows
                        if (Array.isArray(value) && value.length > 0) {
                            // Handle array of files
                            const links = value
                                .map(
                                    (url: string, index: number) =>
                                        `<a href="${url}" target="_blank" style="color: blue; text-decoration: underline;">File${value.length > 1 ? ` ${index + 1}` : ""}</a>`,
                                )
                                .join(", ")
                            td.innerHTML = links
                        } else if (value && typeof value === "string" && value.trim() !== "") {
                            // Handle single file
                            td.innerHTML = `<a href="${value}" target="_blank" style="color: blue; text-decoration: underline;">File</a>`
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

                    // Check if this is the summary row (first row)
                    const isSummaryRow = row === 0

                    if (isSummaryRow) {
                        // For summary row, make text red and 500
                        td.style.color = "red"
                        td.style.fontWeight = "500"

                        // If there are group URLs in the summary row, make them clickable
                        const groupUrls = (cellProperties?.instance?.getSourceDataAtRow(row) as any)?._groupUrls
                        if (groupUrls && groupUrls.length > 0) {
                            td.innerHTML = `<a href="#" class="group-link" style="color: red; font-weight: 500; text-decoration: underline;">${value}</a>`
                            td.onclick = (e: MouseEvent) => {
                                e.preventDefault()
                                groupUrls.forEach((url: string) => {
                                    window.open(url, "_blank")
                                })
                            }
                        } else {
                            td.textContent = "No Group"
                        }
                    } else {
                        // For regular rows
                        if (Array.isArray(value) && value.length > 0) {
                            // Handle array of groups
                            const links = value
                                .map(
                                    (url: string, index: number) =>
                                        `<a href="${url}" target="_blank" style="color: blue; text-decoration: underline;">Group${value.length > 1 ? ` ${index + 1}` : ""}</a>`,
                                )
                                .join(", ")
                            td.innerHTML = links
                        } else if (value && typeof value === "string" && value.trim() !== "") {
                            // Handle single group
                            td.innerHTML = `<a href="${value}" target="_blank" style="color: blue; text-decoration: underline;">Group</a>`
                        } else {
                            td.textContent = "No Group"
                            td.style.color = "#999" // Gray color for "No Group" text
                        }
                    }

                    td.title = value || "No Group"
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

            // For all fields (giaBan, giaMua, giaCuoi, loiNhuan), use the selected type
            // This ensures giaMua, giaCuoi, and loiNhuan change with the price type
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

        data.forEach((item) => {
            // Extract numeric value from commission field, handling cases like "20 avc ngưng" or "30 + ngưng"
            const getNumericValue = (value: any): number => {
                // Convert value to string and handle null/undefined
                const strValue = value?.toString() || ""
                if (!strValue || strValue.trim() === "") return 0

                // Split by '+' and take the first part, then extract the number
                const firstPart = strValue.split("+")[0].trim()
                const match = firstPart.match(/^\d+(\.\d+)?/)
                return match ? Number.parseFloat(match[0]) : 0
            }

            // Get values using the correct columns for the selected type
            const giaBanValue = getNumericValue(item[giaBanColumn as keyof SiteData])
            const giaMuaValue = getNumericValue(item[giaMuaColumn as keyof SiteData])
            const hoaHongValue = getNumericValue(item[hoaHongColumn as keyof SiteData])
            const giaCuoiValue = getNumericValue(item[giaCuoiColumn as keyof SiteData])
            const loiNhuanValue = getNumericValue(item[loiNhuanColumn as keyof SiteData])

            // Apply currency conversion if VND is selected
            const convertedGiaBan = selectedCurrency === "VND" ? giaBanValue * 26 : giaBanValue
            const convertedGiaMua = selectedCurrency === "VND" ? giaMuaValue * 26 : giaMuaValue
            const convertedHoaHong = selectedCurrency === "VND" ? hoaHongValue * 26 : hoaHongValue
            const convertedGiaCuoi = selectedCurrency === "VND" ? giaCuoiValue * 26 : giaCuoiValue
            const convertedLoiNhuan = selectedCurrency === "VND" ? loiNhuanValue * 26 : loiNhuanValue

            // Update summary using the correct columns for the selected type
            summary[giaBanColumn as keyof SiteData] = (
                Number.parseFloat(summary[giaBanColumn as keyof SiteData]?.toString() || "0") + convertedGiaBan
            ).toString()
            summary[giaMuaColumn as keyof SiteData] = (
                Number.parseFloat(summary[giaMuaColumn as keyof SiteData]?.toString() || "0") + convertedGiaMua
            ).toString()
            summary[hoaHongColumn as keyof SiteData] = (
                Number.parseFloat(summary[hoaHongColumn as keyof SiteData]?.toString() || "0") + convertedHoaHong
            ).toString()
            summary[giaCuoiColumn as keyof SiteData] = (
                Number.parseFloat(summary[giaCuoiColumn as keyof SiteData]?.toString() || "0") + convertedGiaCuoi
            ).toString()
            summary[loiNhuanColumn as keyof SiteData] = (
                Number.parseFloat(summary[loiNhuanColumn as keyof SiteData]?.toString() || "0") + convertedLoiNhuan
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

    // Add a function to count NCCs with valid IdGroup
    const getValidNCCsCount = (data: SiteData[]) => {
        return data.filter((item) => item.IdGroup && item.IdGroup.trim() !== "").length
    }

    // Add a custom renderer for the HotTable to handle clickable File NCC and Group NCC cells
    const renderHotTable = (data: SiteData[], columns: any[], tableKey: string) => {
        if (!data || data.length === 0) return null

        // Add summary row at the beginning
        const summaryRow = calculateSummary(data)
        const dataWithSummary = summaryRow ? [summaryRow, ...data] : [...data]

        return (
            <div className="overflow-x-auto w-full max-w-8xl">
                <HotTable
                    key={`${tableKey}-${selectedCurrency}`}
                    data={dataWithSummary}
                    columns={columns.map((col) => ({
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
                    // Enable copy paste functionality
                    copyPaste={true}
                    // Enhanced context menu with copy options
                    // contextMenu={{
                    //     items: {
                    //         copy: {},
                    //         copy_with_column_headers: {},
                    //         separator1: Handsontable.plugins.ContextMenu.SEPARATOR,
                    //         selectAll: {
                    //             name: 'Select All',
                    //             callback: function () {
                    //                 this.selectAll();
                    //             }
                    //         }
                    //     }
                    // }}
                    // Enable keyboard shortcuts
                    beforeKeyDown={(event: KeyboardEvent) => {
                        const target = event.target as HTMLElement
                        const hotInstance = (target.closest(".handsontable") as any)?.__hotInstance

                        // Ctrl+C for copy
                        if (event.ctrlKey && event.key === "c") {
                            if (hotInstance) {
                                const copyPastePlugin = hotInstance.getPlugin("copyPaste")
                                if (copyPastePlugin && copyPastePlugin.isEnabled()) {
                                    // Let HotTable handle the copy
                                    return true
                                }
                            }
                        }
                        // Ctrl+A for select all
                        if (event.ctrlKey && event.key === "a") {
                            event.preventDefault()
                            if (hotInstance) {
                                hotInstance.selectAll()
                            }
                            return false
                        }
                        return true
                    }}
                    // filters={true}
                    // dropdownMenu={true}
                    columnSorting={true}
                    manualColumnResize={true}
                    manualRowResize={true}
                    className="custom-table"
                    themeName="ht-theme-main"
                    // Additional settings for better copy experience
                    outsideClickDeselects={false}
                    fillHandle={false}
                    // Custom hooks for copy events
                    afterCopy={(data: any[][], coords: any[]) => {
                        console.log("Data copied:", data)
                        const copiedCells = data.length * (data[0]?.length || 0)
                        if (copiedCells > 0) {
                            console.log(`Copied ${copiedCells} cells to clipboard`)
                            // Optional: Show a brief success message
                            const notification = document.createElement("div")
                            notification.textContent = `Đã copy ${copiedCells} ô dữ liệu`
                            notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          `
                            document.body.appendChild(notification)
                            setTimeout(() => {
                                document.body.removeChild(notification)
                            }, 2000)
                        }
                    }}
                    // Store instance reference for easier access
                    ref={(hotTableComponent) => {
                        if (hotTableComponent && hotTableComponent.hotInstance) {
                            const container = hotTableComponent.hotInstance.rootElement
                            if (container) {
                                ; (container as any).__hotInstance = hotTableComponent.hotInstance
                            }
                        }
                    }}
                />
            </div>
        )
    }

    // Add message handling functions
    const handleDirectMessage = useCallback(async () => {
        if (!directMessage.trim()) {
            alert("Vui lòng nhập tin nhắn")
            return
        }

        try {
            setLoading(true)
            const response = await fetch("/api/sheet/tool-check", {
                method: "POST",
            })
            const data = await response.json()

            if (!data.gpTextVN) {
                alert("Không thể lấy dữ liệu từ sheet")
                return
            }

            // Extract all unique IdGroups
            const uniqueIdGroups = new Set<string>()
            data.gpTextVN.forEach((item: SiteData) => {
                if (item.IdGroup && item.IdGroup.trim() !== "") {
                    let chatId = item.IdGroup.trim()
                    if (chatId.startsWith("#")) {
                        chatId = chatId.replace("#", "")
                    }
                    uniqueIdGroups.add(chatId)
                }
            })

            if (uniqueIdGroups.size === 0) {
                alert("Không tìm thấy IdGroup nào trong dữ liệu")
                return
            }

            // Confirm with user
            if (confirm(`Bạn có chắc chắn muốn gửi tin nhắn đến tất cả ${uniqueIdGroups.size} NCC?`)) {
                alert(`Đang gửi tin nhắn cho ${uniqueIdGroups.size} NCC...`)

                const successfulSends: string[] = []
                const errors: string[] = []

                // Updated bot token
                const botToken = "7678598532:AAFeyTmZacHfu1_8AaX7ugs5bUdSvt67G8U"

                // Send message to Telegram
                for (const chatId of uniqueIdGroups) {
                    try {
                        const url = `https://api.telegram.org/bot${botToken}/sendMessage`
                        const params = new URLSearchParams({
                            chat_id: chatId,
                            text: directMessage,
                        })

                        console.log("Sending message to chat ID:", chatId)
                        const res = await fetch(`${url}?${params.toString()}`)
                        const responseData = await res.json()

                        if (responseData.ok) {
                            successfulSends.push(chatId)
                        } else {
                            errors.push(`Failed to send to ${chatId}: ${responseData.description}`)
                        }
                    } catch (error) {
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
                setDirectMessage("")
            }
        } catch (error) {
            console.error("Error:", error)
            alert("Có lỗi xảy ra khi gửi tin nhắn")
        } finally {
            setLoading(false)
        }
    }, [directMessage])

    const openNccSelectionModal = useCallback(() => {
        // Extract unique NCCs from the filtered data
        const uniqueNccs = new Map<string, { id: string; name: string }>()

        filteredData.forEach((result) => {
            if (result.IdGroup && result.IdGroup.trim() !== "" && result.NCC) {
                let chatId = result.IdGroup.trim()
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
                if (data.IdGroup && data.IdGroup.trim() !== "") {
                    let chatId = data.IdGroup.trim()
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
            const botToken = "7678598532:AAFeyTmZacHfu1_8AaX7ugs5bUdSvt67G8U"

            for (const chatId of selectedChatIds) {
                try {
                    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
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
            .filter((result) => result.IdGroup && result.IdGroup.trim() !== "" && result.NCC)
            .map((result) => {
                let chatId = result.IdGroup ? result.IdGroup.trim() : ""
                if (chatId.startsWith("#")) {
                    chatId = chatId.replace("#", "")
                }
                return {
                    value: chatId,
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
            const botToken = "7678598532:AAFeyTmZacHfu1_8AaX7ugs5bUdSvt67G8U"

            for (const chatId of uniqueNCCs) {
                try {
                    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-6 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-blue-100">
                    <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-2xl font-500 text-white flex items-center justify-center md:justify-start gap-2">
                                    <FileText className="h-6 w-6" />
                                    Quản lý dữ liệu
                                </h2>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setSelectedSearchType("Site")}
                                        className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedSearchType === "Site" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                            }`}
                                    >
                                        <Globe className="h-4 w-4 mr-1" />
                                        Site
                                    </button>
                                    <button
                                        onClick={() => setSelectedSearchType("NCC")}
                                        className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedSearchType === "NCC" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                            }`}
                                    >
                                        <User className="h-4 w-4 mr-1" />
                                        NCC
                                    </button>
                                </div>
                                <div className="flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setSelectedCurrency("USDT")}
                                        className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedCurrency === "USDT" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                            }`}
                                    >
                                        <DollarSign className="h-4 w-4 mr-1" />
                                        USDT
                                    </button>
                                    <button
                                        onClick={() => setSelectedCurrency("VND")}
                                        className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedCurrency === "VND" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                            }`}
                                    >
                                        <Coins className="h-4 w-4 mr-1" />
                                        VND
                                    </button>
                                </div>
                                <div className="flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setSelectedBrand("F")}
                                        className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedBrand === "F" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        <CreditCard className="h-4 w-4 mr-1" />
                                        F-ALL
                                    </button>
                                    <button
                                        onClick={() => setSelectedBrand("X")}
                                        className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedBrand === "X" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        <CreditCard className="h-4 w-4 mr-1" />
                                        X-ALL
                                    </button>
                                </div>
                                <button
                                    onClick={fetchData}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 shadow-md"
                                >
                                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                                </button>
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

                    {/* Unified Table Display */}
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="flex flex-col items-center">
                                <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                                <p className="text-gray-500">Đang tải dữ liệu...</p>
                            </div>
                        </div>
                    ) : hasSearched && filteredData.length > 0 ? (
                        <div className="bg-white p-4">
                            {/* Compact Table Stats and Controls */}
                            <div className="mb-4">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col items-left gap-2">
                                            <div className="flex items-center">
                                                <div className="mr-2 p-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md shadow-sm">
                                                    <Inbox className="h-4 w-4 text-white" />
                                                </div>
                                                <h3 className="text-lg font-500 text-blue-700 mb-1">
                                                    Kết quả tìm kiếm ({filteredData.length} kết quả - {getValidNCCsCount(filteredData)} có
                                                    IdGroup)
                                                </h3>
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
                                                            className={`flex items-center px-2 py-1 text-sm rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform ${getValidNCCsCount(filteredData) === 0
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
                                                            disabled={loading || filteredData.length === 0 || getValidNCCsCount(filteredData) === 0}
                                                            className={`flex items-center px-2 py-1 text-sm rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform ${loading || filteredData.length === 0 || getValidNCCsCount(filteredData) === 0
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
                                                            disabled={loading || filteredData.length === 0 || getValidNCCsCount(filteredData) === 0}
                                                            className={`flex items-center px-2 py-1 text-sm rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform ${loading || filteredData.length === 0 || getValidNCCsCount(filteredData) === 0
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
                                generateColumns(),
                                `main-${selectedPriceType}-${selectedBrand}-${selectedSearchType}`,
                            )}

                            {/* Enhanced Duplicates Table */}
                            {showDuplicates && hasDuplicates && (
                                <div className="mt-8 border-t-2 border-gray-200 pt-6">
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
                                        generateColumns(),
                                        `duplicates-${selectedPriceType}-${selectedBrand}-${selectedSearchType}`,
                                    )}
                                </div>
                            )}
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
                </div>
            </div>

            {/* Direct Message Modal */}
            {showDirectMessageModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-500 text-gray-800">Gửi tin nhắn trực tiếp</h3>
                            <button
                                onClick={() => {
                                    setShowDirectMessageModal(false)
                                    setDirectMessage("")
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-gray-600 mb-2">Tin nhắn sẽ được gửi đến tất cả NCC có IdGroup trong dữ liệu.</p>
                            <textarea
                                value={directMessage}
                                onChange={(e) => setDirectMessage(e.target.value)}
                                placeholder="Nhập tin nhắn cần gửi..."
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={4}
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowDirectMessageModal(false)
                                    setDirectMessage("")
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDirectMessage}
                                disabled={!directMessage.trim()}
                                className={`px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${!directMessage.trim() ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                                    }`}
                            >
                                Gửi tin nhắn
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
