"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import type React from "react"

import sheetApiRequest from "@/apiRequests/sheet"
import "./custom-table.css"
import { HotTable, type HotTableRef } from "@handsontable/react-wrapper"
import type Handsontable from "handsontable"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import { registerAllModules } from "handsontable/registry"
import {
    Search,
    RefreshCw,
    DollarSign,
    Coins,
    FileText,
    Globe,
    User,
    Inbox,
    Copy,
    EyeOff,
    Eye,
} from "lucide-react"

interface SyntheticData {
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

type PriceType = "GP" | "Text"
type CurrencyType = "USDT" | "VND"
type SearchType = "Domain" | "NCC"

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

export default function PageBody() {
    const [loading, setLoading] = useState(false)
    const [allData, setAllData] = useState<SyntheticData[]>([])
    const [filteredData, setFilteredData] = useState<SyntheticData[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [hasSearched, setHasSearched] = useState(false)
    const [selectedPriceType, setSelectedPriceType] = useState<PriceType>("GP")
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>("USDT")
    const [exchangeRate, setExchangeRate] = useState<string>("28")
    const [selectedSearchType, setSelectedSearchType] = useState<SearchType>("Domain")
    const [duplicateDomains, setDuplicateDomains] = useState<{ [key: string]: SyntheticData[] }>({})
    const [showDuplicates, setShowDuplicates] = useState(true)
    const mainTableRef = useRef<HotTableRef>(null)
    const duplicatesTableRef = useRef<HotTableRef>(null)
    const selectionAnchorRef = useRef<{ row: number; col: number } | null>(null)

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

    const fetchData = async () => {
        try {
            setLoading(true)
            const response: any = await sheetApiRequest.getDataSynthetic()
            console.log("response", response)
            // API trả về { extension: [...] } từ sheetConfigs
            setAllData(response.extension || [])
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

    const normalizeUrl = (url: string): string => {
        if (!url || typeof url !== "string") return ""

        let normalized = url.replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//, "")
        normalized = normalized.replace(/^www\./, "")
        normalized = normalized.replace(/\/.*$/, "")
        normalized = normalized.replace(/:\d+$/, "")
        normalized = normalized.toLowerCase().trim()

        return normalized
    }

    const debounce = (func: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout
        return (...args: any) => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => func(...args), delay)
        }
    }

    const runSearch = useCallback(
        (value: string) => {
            if (!value.trim()) {
                setFilteredData([])
                setDuplicateDomains({})
                setHasSearched(false)
                return
            }

            const searchTerms = value.split(/[,\n\s]+/).filter((term) => term.trim() !== "")

            if (searchTerms.length === 0) {
                setFilteredData([])
                setDuplicateDomains({})
                setHasSearched(false)
                return
            }

            let validTerms: string[] = []
            if (selectedSearchType === "Domain") {
                validTerms = searchTerms.map((term) => normalizeUrl(term.trim())).filter((term) => term !== "")
            } else {
                validTerms = searchTerms
                    .filter((term) => term.trim().length > 0)
                    .map((term) => term.trim().toUpperCase())
            }

            if (validTerms.length === 0) {
                setFilteredData([])
                setDuplicateDomains({})
                setHasSearched(true)
                return
            }

            const mainItems: SyntheticData[] = []
            const newDuplicateDomains: { [key: string]: SyntheticData[] } = {}

            validTerms.forEach((term) => {
                const matchingItems = allData.filter((item) => {
                    if (selectedSearchType === "Domain") {
                        const normalizedDomain = normalizeUrl(item.Domains || "")
                        return normalizedDomain === term
                    } else {
                        const normalizedNCC = (item.NCC || "").toUpperCase().trim()
                        return normalizedNCC === term || normalizedNCC.includes(term)
                    }
                })

                if (matchingItems.length > 0) {
                    if (selectedSearchType === "Domain") {
                        // Sort by selected price type (GP or Text)
                        matchingItems.sort((a, b) => {
                            const priceField = getPriceColumnData(selectedPriceType, "GiaMua")
                            const priceA = Number.parseFloat((a as any)[priceField]?.toString().replace(",", ".") || "0")
                            const priceB = Number.parseFloat((b as any)[priceField]?.toString().replace(",", ".") || "0")
                            const isNumericA = !isNaN(priceA) && priceA > 0
                            const isNumericB = !isNaN(priceB) && priceB > 0
                            if (isNumericA && isNumericB) return priceA - priceB
                            if (isNumericA) return -1
                            if (isNumericB) return 1
                            return 0
                        })

                        const mainItem = matchingItems[0]
                        mainItems.push(mainItem)

                        if (matchingItems.length > 1) {
                            const duplicateItems = matchingItems.slice(1)
                            const normalizedDomain = normalizeUrl(mainItem.Domains)
                            if (!newDuplicateDomains[normalizedDomain]) {
                                newDuplicateDomains[normalizedDomain] = []
                            }
                            newDuplicateDomains[normalizedDomain].push(...duplicateItems)
                        }
                    } else {
                        mainItems.push(...matchingItems)
                    }
                } else {
                    const emptyItem: SyntheticData = {
                        Extension: "",
                        NCC: "",
                        Domains: term.trim(),
                        Note: "Không tìm thấy",
                        DR: "",
                        DA: "",
                        TF: "",
                        Spam: "",
                        Traffic: "",
                        LinkOut: "",
                        GiaBanGP: "",
                        GiaBanText: "",
                        MaSP: "",
                        TenNCC: "",
                        GiaMuaGP: "",
                        GiaMuaText: "",
                        HHGP: "",
                        HHText: "",
                        KeGP: "",
                        KeText: "",
                    }
                    mainItems.push(emptyItem)
                }
            })

            const applyCurrencyConversion = (dataToConvert: SyntheticData[]): SyntheticData[] => {
                return dataToConvert.map((item) => {
                    const newItem = { ...item }
                    if (selectedCurrency === "VND") {
                        const rate = Number.parseFloat(exchangeRate)
                        if (!isNaN(rate)) {
                            const priceFields: Array<"GiaBanGP" | "GiaBanText" | "GiaMuaGP" | "GiaMuaText" | "HHGP" | "HHText" | "KeGP" | "KeText"> = [
                                "GiaBanGP",
                                "GiaBanText",
                                "GiaMuaGP",
                                "GiaMuaText",
                                "HHGP",
                                "HHText",
                                "KeGP",
                                "KeText",
                            ]
                            priceFields.forEach((fieldKey) => {
                                const raw = newItem[fieldKey]?.toString() || ""
                                const numericValue = Number.parseFloat(raw)
                                if (!isNaN(numericValue)) {
                                    ;(newItem as any)[fieldKey] = (numericValue * rate).toString()
                                }
                            })
                        }
                    }
                    return newItem
                })
            }

            const convertedMainItems = applyCurrencyConversion(mainItems)
            const convertedDuplicates: { [key: string]: SyntheticData[] } = {}
            Object.entries(newDuplicateDomains).forEach(([key, items]) => {
                convertedDuplicates[key] = applyCurrencyConversion(items)
            })

            setFilteredData(convertedMainItems)
            setDuplicateDomains(convertedDuplicates)
            setHasSearched(true)
        },
        [allData, selectedSearchType, selectedCurrency, selectedPriceType, exchangeRate],
    )

    const handleSearch = useCallback(
        debounce((value: string) => {
            runSearch(value)
        }, 300),
        [runSearch],
    )

    useEffect(() => {
        handleSearch(searchTerm)
    }, [searchTerm, handleSearch, selectedSearchType])

    useEffect(() => {
        if (hasSearched) {
            runSearch(searchTerm)
        }
    }, [selectedCurrency, selectedPriceType, exchangeRate, hasSearched, searchTerm, runSearch])

    const getPriceColumnData = (priceType: PriceType, field: "GiaBan" | "GiaMua" | "HH" | "Ke") => {
        const typeMap = {
            GP: "GP",
            Text: "Text",
        }
        return `${field}${typeMap[priceType]}`
    }

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

            if (row === 0) {
                td.style.color = "red"
            }

            td.title = displayValue
            td.textContent = displayValue
            return td
        }) as RendererFunction
    }

    const generateColumns = () => {
        const baseColumns = [
            {
                title: "Đuôi",
                data: "Extension",
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
                title: "NCC",
                data: "NCC",
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
                title: "Domain",
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
                title: "Note",
                data: "Note",
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
                    if (row === 0 && value === "Tổng") {
                        td.style.color = "red"
                    }
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
                title: "Spam",
                data: "Spam",
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
                title: "LinkOut",
                data: "LinkOut",
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
        ]

        const sellPriceColumn = getPriceColumnData(selectedPriceType, "GiaBan")
        const buyPriceColumn = getPriceColumnData(selectedPriceType, "GiaMua")
        const commissionColumn = getPriceColumnData(selectedPriceType, "HH")
        const keColumn = getPriceColumnData(selectedPriceType, "Ke")

        baseColumns.push(
            {
                title: `Giá Bán`,
                data: sellPriceColumn,
                width: 70,
                className: "htMiddle",
                renderer: createPriceRenderer(sellPriceColumn),
            },
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
                width: 50,
                className: "htMiddle",
                renderer: createPriceRenderer(commissionColumn),
            },
            {
                title: `Kê`,
                data: keColumn,
                width: 50,
                className: "htMiddle",
                renderer: createPriceRenderer(keColumn),
            },
            {
                title: "Mã SP",
                data: "MaSP",
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
                title: "Tên NCC",
                data: "TenNCC",
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
        )

        return baseColumns
    }

    const calculateSummary = (data: SyntheticData[]) => {
        if (!data || data.length === 0) return null

        const giaBanColumn = getPriceColumnData(selectedPriceType, "GiaBan")
        const giaMuaColumn = getPriceColumnData(selectedPriceType, "GiaMua")
        const hoaHongColumn = getPriceColumnData(selectedPriceType, "HH")
        const keColumn = getPriceColumnData(selectedPriceType, "Ke")

        const summary: any = {
            Note: "Tổng",
            [giaBanColumn]: "0",
            [giaMuaColumn]: "0",
            [hoaHongColumn]: "0",
            [keColumn]: "0",
        }

        const isPureNumber = (value: any): boolean => {
            if (value === null || value === undefined) return false
            const strValue = value.toString().trim()
            if (strValue === "") return false
            // Hỗ trợ cả dấu phẩy và dấu chấm làm dấu thập phân
            // Cho phép: "0,4", "0.4", "123,45", "123.45", "123", "-0,4", "-0.4"
            return /^-?\d+([.,]\d+)?$/.test(strValue)
        }

        const getNumericValue = (value: any): number => {
            if (value === null || value === undefined) return 0
            const strValue = value.toString().trim()
            // Thay thế dấu phẩy bằng dấu chấm để parse đúng
            const normalizedValue = strValue.replace(",", ".")
            if (!isPureNumber(value)) return 0
            return Number.parseFloat(normalizedValue) || 0
        }

        data.forEach((item) => {
            const giaBanValue = getNumericValue(item[giaBanColumn as keyof SyntheticData])
            const giaMuaValue = getNumericValue(item[giaMuaColumn as keyof SyntheticData])
            const hoaHongValue = getNumericValue(item[hoaHongColumn as keyof SyntheticData])
            const keValue = getNumericValue(item[keColumn as keyof SyntheticData])

            summary[giaBanColumn] = (
                Number.parseFloat(summary[giaBanColumn]?.toString() || "0") + giaBanValue
            ).toString()
            summary[giaMuaColumn] = (
                Number.parseFloat(summary[giaMuaColumn]?.toString() || "0") + giaMuaValue
            ).toString()
            summary[hoaHongColumn] = (
                Number.parseFloat(summary[hoaHongColumn]?.toString() || "0") + hoaHongValue
            ).toString()
            summary[keColumn] = (Number.parseFloat(summary[keColumn]?.toString() || "0") + keValue).toString()
        })

        return summary as SyntheticData
    }

    const handleBeforeCopy = useCallback(
        (data: string[][], coords: any[], copiedHeadersCount: { columnHeadersCount: number }): boolean | void => {
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

            const copiedDataArray: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(""))

            selected.forEach((range) => {
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
                        console.warn("Clipboard API failed, trying fallback:", err)
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

                    if (successful) {
                        return true
                    } else {
                        throw new Error("execCommand copy failed")
                    }
                } catch (fallbackErr) {
                    console.error("All copy methods failed:", fallbackErr)
                    return false
                }
            }

            copyToClipboard(finalData)
            return false
        },
        [mainTableRef, duplicatesTableRef],
    )

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

    const renderHotTable = (data: SyntheticData[], tableKey: string, tableRef: React.RefObject<HotTableRef>) => {
        if (!data || data.length === 0) return null

        const summaryRow = calculateSummary(data)
        const dataWithSummary = summaryRow ? [summaryRow, ...data] : [...data]

        const generatedColumns = generateColumns()

        const onCellMouseDown = (event: any, coords: any) => {
            if (!coords) return
            const { row, col } = coords
            const anchor = selectionAnchorRef.current
            const hot = tableRef.current?.hotInstance
            if (!hot) return

            const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0
            if (!isTouch) return

            if (!anchor) {
                selectionAnchorRef.current = { row, col }
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-6 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-blue-100">
                    <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-2xl font-500 text-white flex items-center justify-center md:justify-start gap-2">
                                    <FileText className="h-6 w-6" />
                                    Tool Check Synthetic
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {/* Nhóm 1: Domain / NCC */}
                                <div className="w-full flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setSelectedSearchType("Domain")}
                                        className={`flex-1 flex items-center justify-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedSearchType === "Domain" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        <Globe className="h-4 w-4 mr-1" />
                                        Domain
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

                                {/* Nhóm 3: GP / Text */}
                                <div className="w-full flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setSelectedPriceType("GP")}
                                        className={`flex-1 flex items-center justify-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedPriceType === "GP" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        GP
                                    </button>
                                    <button
                                        onClick={() => setSelectedPriceType("Text")}
                                        className={`flex-1 flex items-center justify-center px-3 py-1.5 text-sm font-medium transition-colors ${selectedPriceType === "Text" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"}`}
                                    >
                                        Text
                                    </button>
                                </div>

                                {/* Nút Refresh */}
                                <div className="w-full flex">
                                    <button
                                        onClick={fetchData}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors shadow-md"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4">
                        <div className="relative">
                            <textarea
                                placeholder={`Tìm kiếm ${selectedSearchType === "Domain"
                                    ? "domain (hỗ trợ mọi định dạng: example.com, https://example.com, www.example.com)"
                                    : "NCC (tìm theo tên NCC)"
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

            {/* Table Display */}
            {loading ? (
                <div className="flex justify-center items-center h-64 -mx-4 px-4">
                    <div className="flex flex-col items-center">
                        <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                        <p className="text-gray-500">Đang tải dữ liệu...</p>
                    </div>
                </div>
            ) : hasSearched && filteredData.length > 0 ? (
                <div className="w-full bg-white -mx-4">
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
                                </div>
                                <div className="flex items-center gap-2">
                                    {Object.keys(duplicateDomains).length > 0 && (
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
                                                    Domain Trùng
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Domain Trùng
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {renderHotTable(filteredData, `main-${selectedPriceType}-${selectedSearchType}`, mainTableRef)}

                    {/* Enhanced Duplicates Table */}
                    {showDuplicates && Object.keys(duplicateDomains).length > 0 && (
                        <div className="mt-8 border-t-2 border-gray-200 pt-6 px-4">
                            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 mb-4 shadow-sm">
                                <div className="flex items-center">
                                    <div className="mr-3 p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-md">
                                        <Globe className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-500 text-gray-800 mb-1">Domain trùng lặp</h3>
                                        <p className="text-sm text-gray-600">
                                            Hiển thị {Object.values(duplicateDomains).flat().length} domain có cùng domain nhưng giá khác nhau.
                                            <span className="text-orange-600 font-medium ml-1">
                                                Domain có giá thấp nhất đã được hiển thị ở bảng chính.
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {renderHotTable(
                                Object.values(duplicateDomains).flat(),
                                `duplicates-${selectedPriceType}-${selectedSearchType}`,
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
                        {selectedSearchType === "Domain"
                            ? `Không tìm thấy domain nào phù hợp với từ khóa "${searchTerm}"`
                            : `Không tìm thấy NCC nào phù hợp với từ khóa "${searchTerm}"`}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="p-4 bg-gray-50 rounded-full mb-4">
                        <Search className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nhập từ khóa tìm kiếm</h3>
                    <p className="text-sm text-gray-500 text-center max-w-sm">
                        {selectedSearchType === "Domain"
                            ? "Nhập domain để tìm kiếm (hỗ trợ mọi định dạng: example.com, https://example.com, www.example.com)"
                            : "Nhập tên NCC để tìm kiếm"}
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
        </div>
    )
}

