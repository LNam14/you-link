"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import sheetApiRequest from "@/apiRequests/sheet"
import { Card, Spin, message, Switch, Dropdown, Modal, Checkbox, Button } from "antd"
import { CopyOutlined, ReloadOutlined, LoadingOutlined, MessageOutlined } from "@ant-design/icons"
import getUserInfo from "@/components/userInfo"
import { createPortal } from 'react-dom';

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

interface CellPosition {
    row: number
    col: number
}

interface ContextMenuPosition {
    x: number
    y: number
    visible: boolean
    data: SiteData | null
}

export default function PageBody() {
    const [loading, setLoading] = useState(false)
    const [dataGPTextVN, setDataGPTextVN] = useState<SiteData[]>([])
    const [dataGPTextLio, setDataGPTextLio] = useState<SiteData[]>([])
    const [dataGPTextE, setDataGPTextE] = useState<SiteData[]>([])
    const [searchTerms, setSearchTerms] = useState("")
    const [searchType, setSearchType] = useState("VN")
    const [categoryType, setCategoryType] = useState("GP")
    const [searchResults, setSearchResults] = useState<SiteData[]>([])
    const [selectedAreas, setSelectedAreas] = useState<Set<string>[]>([new Set()])
    const [isSelecting, setIsSelecting] = useState(false)
    const [viewMode, setViewMode] = useState<"table" | "card">("table")
    const tableRef: any = useRef<HTMLTableElement>(null)
    const duplicateTableRef: any = useRef<HTMLTableElement>(null)
    const [showResult, setShowResult] = useState(false)
    const [lastSelectedCell, setLastSelectedCell] = useState<CellPosition | null>(null)
    const [notFoundSites, setNotFoundSites] = useState<string[]>([])
    const [selectedColumns, setSelectedColumns] = useState<number[]>([])
    const [isMobile, setIsMobile] = useState(false)
    const [duplicateSites, setDuplicateSites] = useState<SiteData[]>([])
    const [selectedDuplicateAreas, setSelectedDuplicateAreas] = useState<Set<string>[]>([new Set()])
    const [selectedDuplicateColumns, setSelectedDuplicateColumns] = useState<number[]>([])
    const [searchMode, setSearchMode] = useState<"site" | "ncc">("site")
    const [currency, setCurrency] = useState<"VND" | "USD">("USD")
    const [contextMenu, setContextMenu] = useState<ContextMenuPosition>({
        x: 0,
        y: 0,
        visible: false,
        data: null,
    })
    const userInfo = getUserInfo()

    // Add a new state for selected NCCs after the other state declarations (around line 60)
    const [selectedNCCs, setSelectedNCCs] = useState<Set<string>>(new Set())
    const [showNccSelectionModal, setShowNccSelectionModal] = useState(false)
    const [nccList, setNccList] = useState<Array<{ id: string; name: string }>>([])
    const [mounted, setMounted] = useState(false);

    const columnNames = [
        "Chủ site",
        "Tình trạng",
        "Đi Bóng",
        "Đi BET",
        "Site",
        "Chủ đề",
        "DR",
        "Traffic Tool",
        "Ghi chú",
        "Giá bán",
        "Giá mua",
        "Hoa hồng",
        "Giá cuối",
        "Lợi nhuận",
        "Time text",
        "Tên NCC",
        "Mã NCC",
        "File NCC",
        "Group NCC",
        "Ghi chú NCC",
    ]
    const columnsKH = [
        "Tình trạng",
        "Đi Bóng",
        "Đi BET",
        "Site",
        "Chủ đề",
        "DR",
        "Traffic Tool",
        "Ghi chú",
        "Giá bán",
    ]
    const fetchData = async () => {
        try {
            setLoading(true)
            const data: any = await sheetApiRequest.getDataTool()
            console.log("data", data)
            setDataGPTextVN(data.gpTextVN)
            setDataGPTextLio(data.gpTextVN)
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, []) //Fixed: Added dependency to fetchData

    useEffect(() => {
        setMounted(true);
    }, []);

    const isValidDomain = (domain: string) => {
        const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+(\.[a-zA-Z0-9-_]+)+.*)$/
        return domainRegex.test(domain)
    }

    const calculateTotals = (results: SiteData[]): SiteData => {
        const totals: any = {
            site: "",
            bong: "",
            bet: "",
            chuDe: "",
            DR: "",
            trafficTool: "",
            ghiChu: "Tổng",
            giaBanGP: "0",
            giaBanText: "0",
            giaBanTextHome: "0",
            giaBanTextHeader: "0",
            giaBanGPLio: "0",
            giaBanTextLio: "0",
            giaBanTextHomeLio: "0",
            giaBanTextHeaderLio: "0",
            giaMuaGP: "0",
            giaMuaText: "0",
            giaMuaTextHome: "0",
            giaMuaTextHeader: "0",
            hoaHongGP: "0",
            hoaHongText: "0",
            giaCuoiGP: "0",
            giaCuoiText: "0",
            giaCuoiTextHome: "0",
            giaCuoiTextHeader: "0",
            loiNhuanGP: "0",
            loiNhuanText: "0",
            loiNhuanTextHome: "0",
            loiNhuanTextHeader: "0",
            loiNhuanGPLio: "0",
            loiNhuanTextLio: "0",
            loiNhuanTextHomeLio: "0",
            loiNhuanTextHeaderLio: "0",
            NCC: "",
            MaNCC: "",
            FileNCC: [],
            GroupNCC: [],
            timeText: "",
        }

        results.forEach((result: any) => {
            Object.keys(totals).forEach((key) => {
                if (key === "FileNCC" || key === "GroupNCC") {
                    if (result[key] && !totals[key].includes(result[key])) {
                        totals[key].push(result[key])
                    }
                } else if (typeof totals[key] === "string" && !isNaN(Number.parseFloat(totals[key]))) {
                    // Convert to strings, replace commas with dots if needed
                    const totalValue = totals[key].toString().replace(",", ".")
                    const resultValue = result[key] ? result[key].toString().replace(",", ".") : "0"

                    // Check if resultValue is a number
                    if (!isNaN(Number.parseFloat(resultValue))) {
                        // Parse as floats
                        const totalFloat = Number.parseFloat(totalValue)
                        const resultFloat = Number.parseFloat(resultValue)

                        // Calculate sum with precision handling
                        const sum = (totalFloat * 100 + resultFloat * 100) / 100

                        // Convert back to string with original decimal separator and round
                        totals[key] = Math.round(sum).toString()
                    }
                }
            })
        })

        return totals
    }

    const extractDomain = (url: string | undefined): string => {
        if (!url) return ""
        return url
            .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
            .split("/")[0]
            .toLowerCase()
    }

    const handleSearch = useCallback(
        async (value: string) => {
            try {
                setLoading(true)
                setShowResult(true)

                const dataToSearch = value === "VN" ? dataGPTextVN : dataGPTextLio

                const terms = searchTerms
                    .split(/[\s\n]+/)
                    .map((term) => (searchMode === "site" ? extractDomain(term.trim()) : term.trim()))
                    .filter(Boolean)

                const results: SiteData[] = []
                const duplicates: SiteData[] = []
                const siteMap = new Map<string, SiteData>()

                terms.forEach((term) => {
                    if (!term) return

                    const matchingSites = dataToSearch.filter((item: SiteData) =>
                        searchMode === "site" ? extractDomain(item.site) === term : item.MaNCC === term,
                    )

                    if (matchingSites.length > 0) {
                        if (searchMode === "site") {
                            matchingSites.sort((a, b) =>
                                categoryType === "GP"
                                    ? Number.parseFloat(a.giaMuaGP) - Number.parseFloat(b.giaMuaGP)
                                    : categoryType === "Text"
                                        ? Number.parseFloat(a.giaMuaText) - Number.parseFloat(b.giaMuaText)
                                        : categoryType === "TextHome"
                                            ? Number.parseFloat(a.giaMuaTextHome) - Number.parseFloat(b.giaMuaTextHome)
                                            : Number.parseFloat(a.giaMuaTextHeader) - Number.parseFloat(b.giaMuaTextHeader),
                            )

                            results.push(matchingSites[0])
                            siteMap.set(term, matchingSites[0])

                            if (matchingSites.length > 1) {
                                duplicates.push(...matchingSites.slice(1))
                            }
                        } else {
                            // For NCC search, add all matching results
                            results.push(...matchingSites)
                        }
                    } else if (searchMode === "site" && isValidDomain(term)) {
                        const emptySite: SiteData = {
                            cs: "",
                            tinhTrang: "",
                            site: term,
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
                        results.push(emptySite)
                        siteMap.set(term, emptySite)
                    }
                })

                if (dataToSearch.length > 0) {
                    const totalRow = calculateTotals(results)
                    setSearchResults([totalRow, ...results])

                    setDuplicateSites(searchMode === "site" ? duplicates : [])

                    const notFoundShow = terms.filter(
                        (term) =>
                            !dataToSearch.some((item: SiteData) =>
                                searchMode === "site" ? extractDomain(item.site) === term : item.MaNCC === term,
                            ),
                    )

                    const notFound = terms
                        .filter(
                            (term) =>
                                !dataToSearch.some((item: SiteData) =>
                                    searchMode === "site" ? extractDomain(item.site) === term : item.MaNCC === term,
                                ),
                        )
                        .filter((term) => (searchMode === "site" ? isValidDomain(term) : true))

                    setNotFoundSites(notFoundShow)

                    if (notFound.length > 0 && searchMode === "site") {
                        // await siteApiRequest.save(notFound)
                    }
                } else {
                    message.success("Vui lòng load lại trang để nạp dữ liệu")
                }
            } catch (error) {
                console.error("Search error:", error)
            } finally {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            }
        },
        [searchTerms, categoryType, dataGPTextVN, dataGPTextLio, searchMode, searchType, currency],
    )
    useEffect(() => {
        if (searchTerms) {
            handleSearch(searchType)
        }
    }, [categoryType, handleSearch, searchType, currency])

    const handleColumnSelect = (colIndex: number) => {
        setSelectedAreas([])
        setSelectedColumns((prev) => {
            if (prev.includes(colIndex)) {
                return prev.filter((col) => col !== colIndex)
            } else {
                return [...prev, colIndex]
            }
        })
    }

    const resetColumnSelection = () => {
        setSelectedColumns([])
        setSelectedAreas([])
    }

    const copyToClipboardFallback = (text: string) => {
        const textArea = document.createElement("textarea")
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
            document.execCommand("copy")
            message.success("Copied to clipboard")
        } catch (err) {
            console.error("Fallback: Oops, unable to copy", err)
            message.error("Failed to copy")
        }
        document.body.removeChild(textArea)
    }

    const addEmptyColumns = (rowData: string[], selectedIndices: number[]) => {
        const profitIndex = columnNames.indexOf("Lợi nhuận")
        const timeTextIndex = columnNames.indexOf("Time text")

        const selectedProfitIndex = selectedIndices.indexOf(profitIndex)
        const selectedTimeTextIndex = selectedIndices.indexOf(timeTextIndex) //Fixed: declared selectedTimeTextIndex

        if (selectedProfitIndex !== -1 && selectedProfitIndex < rowData.length - 1) {
            rowData.splice(selectedProfitIndex + 1, 0, " ")
            selectedIndices = selectedIndices.map((i) => (i > selectedProfitIndex ? i + 1 : i))
        }

        if (selectedTimeTextIndex !== -1 && selectedTimeTextIndex < rowData.length - 1) {
            rowData.splice(selectedTimeTextIndex + 2, 0, " ")
        }

        return rowData
    }

    const copySelectedCells = useCallback(() => {
        if (!tableRef.current) return
        let copyText = ""
        const rows = tableRef.current.querySelectorAll("tbody tr")

        if (selectedColumns.length > 0) {
            rows.forEach((row: any) => {
                const cells = row.querySelectorAll("td")
                let rowData = selectedColumns.map((colIndex) => (cells[colIndex].textContent || "").trim() || " ")
                rowData = addEmptyColumns(rowData, selectedColumns)
                copyText += rowData.join("\t") + "\n"
            })
        } else {
            const allSelectedCells = new Set<string>()
            selectedAreas.forEach((area) => {
                area.forEach((cell) => allSelectedCells.add(cell))
            })

            let minRow = Number.POSITIVE_INFINITY,
                maxRow = Number.NEGATIVE_INFINITY,
                minCol = Number.POSITIVE_INFINITY,
                maxCol = Number.NEGATIVE_INFINITY

            allSelectedCells.forEach((cell) => {
                const [row, col] = cell.split(",").map(Number)
                minRow = Math.min(minRow, row)
                maxRow = Math.max(maxRow, row)
                minCol = Math.min(minCol, col)
                maxCol = Math.max(maxCol, col)
            })

            for (let r = minRow; r <= maxRow; r++) {
                let rowData = []
                for (let c = minCol; c <= maxCol; c++) {
                    if (allSelectedCells.has(`${r},${c}`)) {
                        const cell = rows[r - 1].querySelectorAll("td")[c]
                        rowData.push((cell.textContent || "").trim() || " ")
                    } else {
                        rowData.push(" ")
                    }
                }
                rowData = addEmptyColumns(
                    rowData,
                    Array.from({ length: maxCol - minCol + 1 }, (_, i) => i + minCol),
                )
                copyText += rowData.join("\t") + "\n"
            }
        }

        if (copyText) {
            navigator.clipboard
                .writeText(copyText)
                .then(() => message.success("Đã sao chép"))
                .catch((err) => {
                    console.error("Failed to copy: ", err)
                    copyToClipboardFallback(copyText)
                })
        }
    }, [selectedColumns, selectedAreas, columnNames])

    const handleCellClick = useCallback(
        (row: number, col: number, event: React.MouseEvent) => {
            // Hide context menu on normal click
            setContextMenu((prev) => ({ ...prev, visible: false }))

            setSelectedDuplicateColumns([])
            setSelectedDuplicateAreas([])
            if (row === 0) return
            if (isMobile) {
                setSelectedAreas((prev) => {
                    const newAreas = [...prev]
                    const lastArea = newAreas[newAreas.length - 1]
                    if (lastArea.has(`${row},${col}`)) {
                        lastArea.delete(`${row},${col}`)
                    } else {
                        lastArea.add(`${row},${col}`)
                    }
                    return newAreas
                })
            } else {
                setSelectedColumns([])
                if (event.ctrlKey) {
                    setSelectedAreas((prev) => [...prev, new Set([`${row},${col}`])])
                } else {
                    setSelectedAreas((prev) => [...prev, new Set([`${row},${col}`])])
                }
                setLastSelectedCell({ row, col })
                setIsSelecting(true)
            }
        },
        [isMobile],
    )

    const handleCellEnter = useCallback(
        (row: number, col: number, event: React.MouseEvent) => {
            if (isMobile || row === 0) return
            if (isSelecting && event.buttons === 1) {
                setSelectedAreas((prev) => {
                    const newAreas = [...prev]
                    const lastArea = newAreas[newAreas.length - 1]
                    if (lastSelectedCell) {
                        const startRow = Math.min(row, lastSelectedCell.row)
                        const endRow = Math.max(row, lastSelectedCell.row)
                        const startCol = Math.min(col, lastSelectedCell.col)
                        const endCol = Math.max(col, lastSelectedCell.col)
                        for (let r = startRow; r <= endRow; r++) {
                            for (let c = startCol; c <= endCol; c++) {
                                lastArea.add(`${r},${c}`)
                            }
                        }
                    }
                    return newAreas
                })
            }
        },
        [isSelecting, lastSelectedCell, isMobile],
    )

    const handleMouseUp = useCallback(() => {
        setIsSelecting(false)
    }, [])

    const isCellSelected = useCallback(
        (row: number, col: number) => {
            return selectedAreas.some((area) => area.has(`${row},${col}`))
        },
        [selectedAreas],
    )

    const getLowestPrice = (result: SiteData) => {
        if (categoryType === "GP") {
            return Number.parseFloat(result.giaMuaGP) || 0
        } else if (categoryType === "Text") {
            return Number.parseFloat(result.giaMuaText) || 0
        } else if (categoryType === "TextHome") {
            return Number.parseFloat(result.giaMuaTextHome) || 0
        } else if (categoryType === "TextHeader") {
            return Number.parseFloat(result.giaMuaTextHeader) || 0
        }
        return 0
    }

    const renderPrice = (result: SiteData) => {
        const isLio = searchType === "Lio"
        let price = ""

        if (categoryType === "GP") {
            price = isLio ? result.giaBanGPLio : result.giaBanGP
        } else if (categoryType === "Text") {
            price = isLio ? result.giaBanTextLio : result.giaBanText
        } else if (categoryType === "TextHome") {
            price = isLio ? result.giaBanTextHomeLio : result.giaBanTextHome
        } else if (categoryType === "TextHeader") {
            price = isLio ? result.giaBanTextHeaderLio : result.giaBanTextHeader
        }

        // If price is already a string that's not a number, return it as is
        if (typeof price === "string" && isNaN(Number(price.replace(",", ".")))) {
            return price
        }

        // Convert price to VND only when currency is set to VND and price is a number
        if (currency === "VND" && price) {
            const priceValue = Number.parseFloat(price.toString().replace(",", ".")) // Convert to number
            if (!isNaN(priceValue)) {
                const vndPrice = priceValue * 26
                return vndPrice.toFixed(0) // No decimal places
            }
        }

        // For numeric values, ensure they're displayed without decimal places
        if (price && !isNaN(Number(price.toString().replace(",", ".")))) {
            return Math.round(Number(price.toString().replace(",", "."))).toString()
        }

        return price
    }

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768)
        }
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    const handleDuplicateColumnSelect = (colIndex: number) => {
        setSelectedDuplicateAreas([])
        setSelectedDuplicateColumns((prev) => {
            if (prev.includes(colIndex)) {
                return prev.filter((col) => col !== colIndex)
            } else {
                return [...prev, colIndex]
            }
        })
    }

    const resetDuplicateColumnSelection = () => {
        setSelectedDuplicateColumns([])
        setSelectedDuplicateAreas([])
    }

    const copyDuplicateSelectedCells = useCallback(() => {
        if (!duplicateTableRef.current) return
        let copyText = ""
        const rows = duplicateTableRef.current.querySelectorAll("tbody tr")

        if (selectedDuplicateColumns.length > 0) {
            rows.forEach((row: any) => {
                const cells = row.querySelectorAll("td")
                let rowData = selectedDuplicateColumns.map((colIndex) => (cells[colIndex].textContent || "").trim() || " ")
                rowData = addEmptyColumns(rowData, selectedDuplicateColumns)
                copyText += rowData.join("\t") + "\n"
            })
        } else {
            const allSelectedCells = new Set<string>()
            selectedDuplicateAreas.forEach((area) => {
                area.forEach((cell) => allSelectedCells.add(cell))
            })

            let minRow = Number.POSITIVE_INFINITY,
                maxRow = Number.NEGATIVE_INFINITY,
                minCol = Number.POSITIVE_INFINITY,
                maxCol = Number.NEGATIVE_INFINITY

            allSelectedCells.forEach((cell) => {
                const [row, col] = cell.split(",").map(Number)
                minRow = Math.min(minRow, row)
                maxRow = Math.max(maxRow, row)
                minCol = Math.min(minCol, col)
                maxCol = Math.max(maxCol, col)
            })

            for (let r = minRow; r <= maxRow; r++) {
                let rowData = []
                for (let c = minCol; c <= maxCol; c++) {
                    if (allSelectedCells.has(`${r},${c}`)) {
                        const cell = rows[r - 1].querySelectorAll("td")[c]
                        rowData.push((cell.textContent || "").trim() || " ")
                    } else {
                        rowData.push(" ")
                    }
                }
                rowData = addEmptyColumns(
                    rowData,
                    Array.from({ length: maxCol - minCol + 1 }, (_, i) => i + minCol),
                )
                copyText += rowData.join("\t") + "\n"
            }
        }

        if (copyText) {
            navigator.clipboard
                .writeText(copyText)
                .then(() => message.success("Đã sao chép"))
                .catch((err) => {
                    console.error("Failed to copy: ", err)
                    copyToClipboardFallback(copyText)
                })
        }
    }, [selectedDuplicateColumns, selectedDuplicateAreas, columnNames])

    const handleDuplicateCellClick = useCallback(
        (row: number, col: number, event: React.MouseEvent) => {
            // Hide context menu on normal click
            setContextMenu((prev) => ({ ...prev, visible: false }))

            setSelectedColumns([])
            setSelectedAreas([])
            if (row === 0) return
            if (isMobile) {
                setSelectedDuplicateAreas((prev) => {
                    const newAreas = [...prev]
                    const lastArea = newAreas[newAreas.length - 1]
                    if (lastArea.has(`${row},${col}`)) {
                        lastArea.delete(`${row},${col}`)
                    } else {
                        lastArea.add(`${row},${col}`)
                    }
                    return newAreas
                })
            } else {
                setSelectedDuplicateColumns([])
                if (event.ctrlKey) {
                    setSelectedDuplicateAreas((prev) => [...prev, new Set([`${row},${col}`])])
                } else {
                    setSelectedDuplicateAreas((prev) => [...prev, new Set([`${row},${col}`])])
                }
                setLastSelectedCell({ row, col })
                setIsSelecting(true)
            }
        },
        [isMobile],
    )

    const handleDuplicateCellEnter = useCallback(
        (row: number, col: number, event: React.MouseEvent) => {
            if (isMobile || row === 0) return
            if (isSelecting && event.buttons === 1) {
                setSelectedDuplicateAreas((prev) => {
                    const newAreas = [...prev]
                    const lastArea = newAreas[newAreas.length - 1]
                    if (lastSelectedCell) {
                        const startRow = Math.min(row, lastSelectedCell.row)
                        const endRow = Math.max(row, lastSelectedCell.row)
                        const startCol = Math.min(col, lastSelectedCell.col)
                        const endCol = Math.max(col, lastSelectedCell.col)
                        for (let r = startRow; r <= endRow; r++) {
                            for (let c = startCol; c <= endCol; c++) {
                                lastArea.add(`${r},${c}`)
                            }
                        }
                    }
                    return newAreas
                })
            }
        },
        [isSelecting, lastSelectedCell, isMobile],
    )

    const isDuplicateCellSelected = useCallback(
        (row: number, col: number) => {
            return selectedDuplicateAreas.some((area) => area.has(`${row},${col}`))
        },
        [selectedDuplicateAreas],
    )

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "c") {
                e.preventDefault()
                copySelectedCells()
                copyDuplicateSelectedCells()
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => {
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [copySelectedCells, copyDuplicateSelectedCells])

    const copyEntireTable = useCallback((tableRef: React.RefObject<HTMLTableElement>) => {
        setSelectedColumns([])
        setSelectedAreas([])
        setSelectedDuplicateColumns([])
        setSelectedDuplicateAreas([])

        if (!tableRef.current) return
        let copyText = ""
        const rows = tableRef.current.querySelectorAll("tbody tr")
        rows.forEach((row) => {
            const cells = row.querySelectorAll("td")
            const rowData = Array.from(cells).map((cell) => (cell.textContent || "").trim() || " ")
            copyText += rowData.join("\t") + "\n"
        })

        if (copyText) {
            navigator.clipboard
                .writeText(copyText)
                .then(() => message.success("Đã sao chép toàn bộ bảng"))
                .catch((err) => {
                    console.error("Failed to copy: ", err)
                    copyToClipboardFallback(copyText)
                })
        }
    }, [])

    // Handle right-click on table cell to show context menu
    const handleCellContextMenu = useCallback((event: React.MouseEvent, rowData: SiteData) => {
        event.preventDefault()

        // Only show context menu if the row has NCC data
        if (rowData && rowData.MaNCC) {
            setContextMenu({
                x: event.clientX,
                y: event.clientY,
                visible: true,
                data: rowData,
            })
        }
    }, [])

    // Add a function to handle NCC selection after the other handler functions (around line 600)
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

    // Add a function to open the NCC selection modal
    const openNccSelectionModal = useCallback(() => {
        // Extract unique NCCs from the search results
        const uniqueNccs = new Map<string, { id: string; name: string }>()

        searchResults.forEach((result) => {
            if (result.IdGroup && result.IdGroup.trim() !== "" && result.NCC) {
                // Clean up the chat ID - remove any non-numeric characters except the negative sign
                let chatId = result.IdGroup.trim()

                // If the chat ID starts with "#-", just keep the negative number part
                if (chatId.startsWith("#")) {
                    chatId = chatId.replace("#", "")
                }

                uniqueNccs.set(chatId, {
                    id: chatId,
                    name: result.NCC,
                })
            }
        })

        // Convert to array for rendering
        setNccList(Array.from(uniqueNccs.values()))
        setShowNccSelectionModal(true)
    }, [searchResults])

    // Modify the handleMessageNCC function to handle multiple NCCs
    const handleMessageNCC = useCallback(
        async (data: SiteData | null, useSelectedNccs = false) => {
            // Random messages to choose from
            const messages = [
                "Lên bài giúp em nhé, em note trong file rồi ạ",
                "Em có bài cần gắn trong file rồi ạ",
                "Anh ơi, em odr bài gp ạ, thông tin bài trong file anh nhé",
                "Có bài cần gắn, em để trong file rùi. anh gắn giúp em nha",
                "Anh ơi, em lên đơn, thông tin em bỏ trong file ạ",
            ]

            // Select a random message
            const randomMessage = messages[Math.floor(Math.random() * messages.length)]

            let selectedChatIds: Array<{ value: string; label: string }> = []

            if (useSelectedNccs) {
                // Use the selected NCCs from the modal
                if (selectedNCCs.size === 0) {
                    message.warning("Vui lòng chọn ít nhất một NCC để gửi tin nhắn")
                    return
                }

                // Find the names for the selected IDs
                selectedChatIds = Array.from(selectedNCCs).map((id) => {
                    const ncc = nccList.find((n) => n.id === id)
                    return {
                        value: id,
                        label: ncc ? ncc.name : "NCC",
                    }
                })

                message.loading(`Đang gửi tin nhắn cho ${selectedChatIds.length} NCC...`)
            } else if (data) {
                // Single NCC mode (from context menu)
                if (data.IdGroup && data.IdGroup.trim() !== "") {
                    // Clean up the chat ID
                    let chatId = data.IdGroup.trim()

                    // If the chat ID starts with "#-", just keep the negative number part
                    if (chatId.startsWith("#")) {
                        chatId = chatId.replace("#", "")
                    }

                    console.log("Cleaned IdGroup for messaging:", chatId)
                    selectedChatIds = [{ value: chatId, label: data.NCC || "NCC" }]
                    message.loading(`Đang gửi tin nhắn cho NCC: ${data.NCC}...`)
                } else {
                    console.log("NCC data:", data)
                    message.error("Không tìm thấy IdGroup cho NCC này")
                    return
                }
            } else {
                return
            }

            const successfulSends: string[] = []
            const errors: string[] = []

            // Updated bot token
            const botToken = "7678598532:AAFeyTmZacHfu1_8AaX7ugs5bUdSvt67G8U"

            // Send message to Telegram
            for (const chatId of selectedChatIds) {
                try {
                    // Using fetch with proper URL encoding for the message text
                    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
                    const params = new URLSearchParams({
                        chat_id: chatId.value,
                        text: randomMessage,
                    })

                    console.log("Sending message to chat ID:", chatId.value)
                    const res = await fetch(`${url}?${params.toString()}`)
                    const responseData = await res.json()

                    console.log("Telegram API response:", responseData)

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

            // Show results
            if (successfulSends.length > 0) {
                message.success(`Đã gửi tin nhắn thành công đến: ${successfulSends.join(", ")}`)
            }

            if (errors.length > 0) {
                message.error(errors.join("\n"))
            }

            // Hide the context menu and modal
            setContextMenu((prev) => ({ ...prev, visible: false }))
            setShowNccSelectionModal(false)
        },
        [selectedNCCs, nccList],
    )

    // Add a new function to handle sending messages to all NCCs
    const handleMessageAllNCCs = useCallback(async () => {
        // Extract all unique NCCs with valid IdGroup from search results
        const validNCCs = searchResults
            .filter((result) => result.IdGroup && result.IdGroup.trim() !== "" && result.NCC)
            .map((result) => {
                // Clean up the chat ID
                let chatId = result.IdGroup ? result.IdGroup.trim() : ""
                if (chatId.startsWith("#")) {
                    chatId = chatId.replace("#", "")
                }
                return {
                    value: chatId,
                    label: result.NCC || "NCC",
                }
            })

        // Remove duplicates by chat ID
        const uniqueNCCs = Array.from(new Map(validNCCs.map((item) => [item.value, item])).values())

        if (uniqueNCCs.length === 0) {
            message.warning("Không tìm thấy NCC nào có IdGroup trong kết quả tìm kiếm")
            return
        }

        // Confirm with user
        Modal.confirm({
            title: "Xác nhận gửi tin nhắn",
            content: `Bạn có chắc chắn muốn gửi tin nhắn đến tất cả ${uniqueNCCs.length} NCC?`,
            onOk: async () => {
                // Random messages to choose from
                const messages = [
                    "Lên bài giúp em nhé, em note trong file rồi ạ",
                    "Em có bài cần gắn trong file rồi ạ",
                    "Anh ơi, em odr bài gp ạ, thông tin bài trong file anh nhé",
                    "Có bài cần gắn, em để trong file rùi. anh gắn giúp em nha",
                    "Anh ơi, em lên đơn, thông tin em bỏ trong file ạ",
                ]

                // Select a random message
                const randomMessage = messages[Math.floor(Math.random() * messages.length)]

                message.loading(`Đang gửi tin nhắn cho ${uniqueNCCs.length} NCC...`)

                const successfulSends: string[] = []
                const errors: string[] = []

                // Updated bot token
                const botToken = "7678598532:AAFeyTmZacHfu1_8AaX7ugs5bUdSvt67G8U"

                // Send message to Telegram
                for (const chatId of uniqueNCCs) {
                    try {
                        // Using fetch with proper URL encoding for the message text
                        const url = `https://api.telegram.org/bot${botToken}/sendMessage`
                        const params = new URLSearchParams({
                            chat_id: chatId.value,
                            text: randomMessage,
                        })

                        console.log("Sending message to chat ID:", chatId.value)
                        const res = await fetch(`${url}?${params.toString()}`)
                        const responseData = await res.json()

                        console.log("Telegram API response:", responseData)

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

                // Show results
                if (successfulSends.length > 0) {
                    message.success(`Đã gửi tin nhắn thành công đến: ${successfulSends.join(", ")}`)
                }

                if (errors.length > 0) {
                    message.error(errors.join("\n"))
                }
            },
            onCancel() {
                console.log("Cancelled")
            },
        })
    }, [searchResults])

    // Add a new item to the context menu items array
    const contextMenuItems = [
        {
            key: "message",
            label: "Nhắn tin cho NCC",
            icon: <MessageOutlined />,
            onClick: () => handleMessageNCC(contextMenu.data),
        },
        {
            key: "messageMultiple",
            label: "Nhắn tin cho nhiều NCC",
            icon: <MessageOutlined />,
            onClick: openNccSelectionModal,
        },
    ]

    return (
        <Spin indicator={<LoadingOutlined style={{ fontSize: 42 }} spin />} spinning={loading}>
            <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white">
                <div className="max-w-7xl mx-auto p-0 pt-2">
                    <div className="rounded-lg pt-6 mb-8">
                        <h2 className="text-xl font-bold mb-6 text-center text-blue-600">Check GP - Text</h2>
                        <div className="space-y-6">
                            <div className="flex flex-col space-y-2 px-2 md:px-0">
                                <div className="p-4 border rounded-lg flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium">Tìm Site</span>
                                        <Switch
                                            checked={searchMode === "ncc"}
                                            onChange={(checked) => setSearchMode(checked ? "ncc" : "site")}
                                        />
                                        <span className="text-sm font-medium">Tìm NCC</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium">USD</span>
                                        <Switch checked={currency === "VND"} onChange={(checked) => setCurrency(checked ? "VND" : "USD")} />
                                        <span className="text-sm font-medium">VND</span>
                                    </div>
                                </div>

                                <textarea
                                    placeholder={`Nhập vào ${searchMode === "site" ? "site" : "Mã NCC"} (cách nhau bằng dấu cách hoặc xuống dòng)...`}
                                    value={searchTerms}
                                    onChange={(e) => {
                                        setSearchTerms(e.target.value)
                                    }}
                                    className="bg-blue-50 text-[14px] w-full px-4 py-2 shadow-md border-gray-300 rounded-[10px] focus:outline-none  focus:ring-2 focus:ring-blue-500 transition duration-200 ease-in-out"
                                    rows={5}
                                    style={{ scrollbarWidth: "thin" }}
                                />
                                <div className="flex justify-between mt-2">
                                    <button
                                        onClick={() => {
                                            handleSearch(searchType)
                                        }}
                                        disabled={loading}
                                        className="text-[13px] px-6 py-3 bg-blue-500 text-white rounded-[8px] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition duration-200 ease-in-out transform hover:scale-105"
                                    >
                                        {loading ? "Đang tìm kiếm..." : "Tìm kiếm"}
                                    </button>
                                    {(userInfo?.role === "Admin" || userInfo?.role === "Nhân viên") && (
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={openNccSelectionModal}
                                                disabled={loading || searchResults.length === 0}
                                                className="text-[13px] px-4 py-2 bg-green-500 text-white rounded-[8px] hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition duration-200 ease-in-out"
                                            >
                                                <MessageOutlined className="mr-1" /> Chọn NCC
                                            </button>
                                            <button
                                                onClick={handleMessageAllNCCs}
                                                disabled={loading || searchResults.length === 0}
                                                className="text-[13px] px-4 py-2 bg-red-500 text-white rounded-[8px] hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition duration-200 ease-in-out"
                                            >
                                                <MessageOutlined className="mr-1" /> Nhắn tất cả NCC
                                            </button>
                                        </div>)}
                                </div>
                            </div>

                            <div className="flex flex-col px-2 md:px-0 sm:flex-row sm:space-x-4 justify-start md:gap-20 gap-2 text-[13px]">
                                <div>
                                    <span className="text-[#195A8B] text-[15px] font-medium"> Chọn thương hiệu</span>
                                    <div className="flex flex-col ml-6">
                                        <label className="inline-flex items-center mt-2">
                                            <input
                                                type="radio"
                                                className="form-radio text-blue-500"
                                                name="searchType"
                                                value="VN"
                                                checked={searchType === "VN"}
                                                onChange={() => {
                                                    setSearchType("VN")
                                                    handleSearch("VN")
                                                }}
                                            />
                                            <span className="ml-2 mr-4">F - ALL</span>
                                        </label>
                                        <label className="inline-flex items-center mt-2">
                                            <input
                                                type="radio"
                                                className="form-radio text-blue-500"
                                                name="searchType"
                                                value="Lio"
                                                checked={searchType === "Lio"}
                                                onChange={() => {
                                                    setSearchType("Lio")
                                                    handleSearch("Lio")
                                                }}
                                            />
                                            <span className="ml-2 mr-4">X - ALL</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[#195A8B] text-[15px] font-medium">Chọn loại</span>
                                    <div className="flex flex-col ml-6">
                                        <label className="inline-flex items-center mt-2">
                                            <input
                                                type="radio"
                                                className="form-radio text-blue-500"
                                                name="categoryType"
                                                value="GP"
                                                checked={categoryType === "GP"}
                                                onChange={() => {
                                                    setCategoryType("GP")
                                                    setLoading(true)
                                                    handleSearch(searchType)
                                                    setTimeout(() => {
                                                        setLoading(false)
                                                    }, 200)
                                                }}
                                                onClick={() => handleSearch(searchType)}
                                            />
                                            <span className="ml-2 mr-2">GP</span>
                                        </label>
                                        <label className="inline-flex items-center mt-2">
                                            <input
                                                type="radio"
                                                className="form-radio  text-blue-500"
                                                name="categoryType"
                                                value="Text"
                                                checked={categoryType === "Text"}
                                                onChange={() => {
                                                    setCategoryType("Text")
                                                    setLoading(true)
                                                    handleSearch(searchType)
                                                    setTimeout(() => {
                                                        setLoading(false)
                                                    }, 200)
                                                }}
                                                onClick={() => handleSearch(searchType)}
                                            />
                                            <span className="ml-2 mr-2">Text Footer</span>
                                        </label>
                                        <label className="inline-flex items-center mt-2">
                                            <input
                                                type="radio"
                                                className="form-radio text-blue-500"
                                                name="categoryType"
                                                value="TextHome"
                                                checked={categoryType === "TextHome"}
                                                onChange={() => {
                                                    setCategoryType("TextHome")
                                                    setLoading(true)
                                                    handleSearch(searchType)
                                                    setTimeout(() => {
                                                        setLoading(false)
                                                    }, 200)
                                                }}
                                                onClick={() => handleSearch(searchType)}
                                            />
                                            <span className="ml-2 mr-2">Text Home</span>
                                        </label>
                                        <label className="inline-flex  items-center mt-2">
                                            <input
                                                type="radio"
                                                className="form-radio text-blue-500"
                                                name="categoryType"
                                                value="TextHeader"
                                                checked={categoryType === "TextHeader"}
                                                onChange={() => {
                                                    setCategoryType("TextHeader")
                                                    setLoading(true)
                                                    setTimeout(() => {
                                                        setLoading(false)
                                                    }, 200)
                                                }}
                                                onClick={() => handleSearch(searchType)}
                                            />
                                            <span className="ml-2 mr-2">Text Header</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[#195A8B] text-[15px] font-medium">Hướng dẫn sử dụng</span>
                                    <span className="text-[14px] text-[#DB2323]">
                                        Lưu ý: <span className="text-[#1169B9]">GP - Text VN & NN nằm chung ở F - ALL</span>
                                    </span>
                                    <span className="text-[13px] text-[#1169B9]">1. Copy theo vùng dữ liệu (PC)</span>
                                    <span className="ml-4 text-[13px] text-[#1169B9]">Kéo thả vùng cần copy sau đó ấn Ctrl + C</span>
                                    <span className="text-[13px] text-[#1169B9]">2. Copy theo cột</span>
                                    <span className="ml-4 text-[13px] text-[#1169B9]">
                                        Chọn cột cần copy sau đó ấn Ctrl + C hoặc nút Copy (mobile)
                                    </span>
                                    <span className="text-[13px] text-[#1169B9]">3. Ấn vào nút reset để clear vùng, cột đã chọn</span>
                                    <span className="text-[13px] text-[#1169B9]">4. Nhấn chuột phải vào dữ liệu NCC để nhắn tin</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="pt-2 overflow-hidden mb-8">
                            <div className="flex justify-between items-center px-6 mb-4 flex-wrap">
                                <h3 className="text-xl font-semibold text-blue-600">Kết quả</h3>
                                <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                                    <div className="hidden sm:flex items-center space-x-4">
                                        <button
                                            onClick={resetColumnSelection}
                                            className="flex items-center gap-1 text-[13px] px-3 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                                        >
                                            <ReloadOutlined /> Reset
                                        </button>
                                        <button
                                            onClick={() => copyEntireTable(tableRef)}
                                            className="flex items-center gap-1 text-[13px] px-3 py-1 text-white bg-green-500 rounded hover:bg-green-600"
                                        >
                                            <CopyOutlined /> Copy All
                                        </button>
                                    </div>
                                    <div className="flex sm:hidden space-x-2">
                                        <button
                                            onClick={resetColumnSelection}
                                            className="flex items-center gap-1 text-[13px] px-3 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                                        >
                                            <ReloadOutlined /> Reset
                                        </button>
                                        <button
                                            onClick={copySelectedCells}
                                            disabled={selectedColumns.length === 0}
                                            className={`flex items-center gap-1 text-[13px] px-3 py-1 rounded ${selectedColumns.length === 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-green-500 text-white hover:bg-green-600"}`}
                                        >
                                            <CopyOutlined /> Copy
                                        </button>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="mr-2">Bảng</span>
                                        <Switch
                                            checked={viewMode === "card"}
                                            onChange={() => setViewMode(viewMode === "table" ? "card" : "table")}
                                        />
                                        <span className="ml-2">Thẻ</span>
                                    </div>
                                </div>
                            </div>
                            {viewMode === "table" ? (
                                <div className="overflow-x-auto">
                                    <div className="max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                                        <table ref={tableRef} className="min-w-full">
                                            <thead className="sticky top-0 z-10 bg-blue-500">
                                                <tr className="bg-blue-500">
                                                    {((userInfo?.role !== "Admin" && userInfo?.role !== "Nhân viên") ? columnsKH : columnNames).map((header, index) => (
                                                        <th
                                                            key={index}
                                                            className={`px-2 py-2 text-left text-xs font-medium text-white tracking-wider border cursor-pointer ${selectedColumns.includes(index) ? "bg-blue-700" : ""}`}
                                                            onClick={() => handleColumnSelect(index)}
                                                        >
                                                            <div className="flex items-center">{header}</div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {searchResults.map((result, rowIndex) => (
                                                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                                        {((userInfo?.role !== "Admin" && userInfo?.role !== "Nhân viên") ? columnsKH : columnNames).map((_, columnIndex) => (
                                                            <td
                                                                key={columnIndex}
                                                                style={{ userSelect: "none" }}
                                                                className={`px-2 py-1
                                                                ${rowIndex === 0 ? "text-red-500 font-bold" : ""}
                                                                text-xs border whitespace-nowrap overflow-hidden text-ellipsis max-w-xs
                                                                ${selectedColumns.includes(columnIndex) ? "bg-blue-200" : ""}
                                                                ${isMobile
                                                                        ? isCellSelected(rowIndex + 1, columnIndex)
                                                                            ? "bg-blue-200"
                                                                            : ""
                                                                        : isCellSelected(rowIndex + 1, columnIndex)
                                                                            ? "bg-sky-100"
                                                                            : ""
                                                                    }`}
                                                                onMouseDown={(e) => handleCellClick(rowIndex + 1, columnIndex, e)}
                                                                onMouseEnter={(e) => handleCellEnter(rowIndex + 1, columnIndex, e)}
                                                                onMouseUp={handleMouseUp}
                                                                onContextMenu={(e) => handleCellContextMenu(e, result)}
                                                            >
                                                                {userInfo?.role === "Admin" || userInfo?.role === "Nhân viên" ? (
                                                                    columnIndex === 0 ? (
                                                                        result.cs
                                                                    ) : columnIndex === 1 ? (
                                                                        result.tinhTrang
                                                                    ) : columnIndex === 2 ? (
                                                                        result.bong
                                                                    ) : columnIndex === 3 ? (
                                                                        result.bet
                                                                    ) : columnIndex === 4 ? (
                                                                        result.site
                                                                    ) : columnIndex === 5 ? (
                                                                        result.chuDe
                                                                    ) : columnIndex === 6 ? (
                                                                        result.DR
                                                                    ) : columnIndex === 7 ? (
                                                                        result.trafficTool
                                                                    ) : columnIndex === 8 ? (
                                                                        result.ghiChu
                                                                    ) : columnIndex === 9 ? (
                                                                        renderPrice(result)
                                                                    ) : columnIndex === 10 ? (
                                                                        categoryType === "GP" ? (
                                                                            result.giaMuaGP
                                                                        ) : categoryType === "Text" ? (
                                                                            result.giaMuaText
                                                                        ) : categoryType === "TextHome" ? (
                                                                            result.giaMuaTextHome
                                                                        ) : (
                                                                            result.giaMuaTextHeader
                                                                        )
                                                                    ) : columnIndex === 11 ? (
                                                                        categoryType === "GP" ? (
                                                                            result.hoaHongGP
                                                                        ) : (
                                                                            result.hoaHongText
                                                                        )
                                                                    ) : columnIndex === 12 ? (
                                                                        categoryType === "GP" ? (
                                                                            result.giaCuoiGP
                                                                        ) : categoryType === "Text" ? (
                                                                            result.giaCuoiText
                                                                        ) : categoryType === "TextHome" ? (
                                                                            result.giaCuoiTextHome
                                                                        ) : (
                                                                            result.giaCuoiTextHeader
                                                                        )
                                                                    ) : columnIndex === 13 ? (
                                                                        searchType === "Lio" ? (
                                                                            categoryType === "GP" ? (
                                                                                result.loiNhuanGPLio
                                                                            ) : categoryType === "Text" ? (
                                                                                result.loiNhuanTextLio
                                                                            ) : categoryType === "TextHome" ? (
                                                                                result.loiNhuanTextHomeLio
                                                                            ) : (
                                                                                result.loiNhuanTextHeaderLio
                                                                            )
                                                                        ) : categoryType === "GP" ? (
                                                                            result.loiNhuanGP
                                                                        ) : categoryType === "Text" ? (
                                                                            result.loiNhuanText
                                                                        ) : categoryType === "TextHome" ? (
                                                                            result.loiNhuanTextHome
                                                                        ) : (
                                                                            result.loiNhuanTextHeader
                                                                        )
                                                                    ) : columnIndex === 14 ? (
                                                                        result.timeText
                                                                    ) : columnIndex === 15 ? (
                                                                        result.NCC
                                                                    ) : columnIndex === 16 ? (
                                                                        result.MaNCC
                                                                    ) : columnIndex === 17 ? (
                                                                        <a
                                                                            href="#"
                                                                            onClick={(e) => {
                                                                                e.preventDefault()
                                                                                const files = Array.isArray(result.FileNCC) ? result.FileNCC : [result.FileNCC]
                                                                                const uniqueFiles = [...new Set(files.filter(Boolean))]
                                                                                if (uniqueFiles.length === 0) {
                                                                                    message.info("No file available")
                                                                                    return
                                                                                }
                                                                                uniqueFiles.forEach((file) => {
                                                                                    if (file) window.open(file, "_blank")
                                                                                })
                                                                            }}
                                                                            className={`text-blue-500 hover:underline ${!result.FileNCC || (Array.isArray(result.FileNCC) && result.FileNCC.length === 0) ? "text-gray-400" : ""}`}
                                                                        >
                                                                            {Array.isArray(result.FileNCC) && result.FileNCC.filter(Boolean).length > 0
                                                                                ? `File NCC (${result.FileNCC.filter(Boolean).length})`
                                                                                : !Array.isArray(result.FileNCC) && result.FileNCC
                                                                                    ? "File NCC"
                                                                                    : "No File"}
                                                                        </a>
                                                                    ) : columnIndex === 18 ? (
                                                                        <a
                                                                            href="#"
                                                                            onClick={(e) => {
                                                                                e.preventDefault()
                                                                                const groups = Array.isArray(result.GroupNCC) ? result.GroupNCC : [result.GroupNCC]
                                                                                const uniqueGroups = [...new Set(groups.filter(Boolean))]
                                                                                if (uniqueGroups.length === 0) {
                                                                                    message.info("No group available")
                                                                                    return
                                                                                }
                                                                                uniqueGroups.forEach((group) => {
                                                                                    if (group) window.open(group, "_blank")
                                                                                })
                                                                            }}
                                                                            className={`text-blue-500 hover:underline ${!result.GroupNCC || (Array.isArray(result.GroupNCC) && result.GroupNCC.length === 0) ? "text-gray-400" : ""}`}
                                                                        >
                                                                            {Array.isArray(result.GroupNCC) && result.GroupNCC.filter(Boolean).length > 0
                                                                                ? `Group NCC (${result.GroupNCC.filter(Boolean).length})`
                                                                                : !Array.isArray(result.GroupNCC) && result.GroupNCC
                                                                                    ? "Group NCC"
                                                                                    : "No Group"}
                                                                        </a>
                                                                    ) : (
                                                                        result.GhiChuNCC
                                                                    )
                                                                ) : (
                                                                    columnIndex === 0 ? (
                                                                        result.tinhTrang
                                                                    ) : columnIndex === 1 ? (
                                                                        result.bong
                                                                    ) : columnIndex === 2 ? (
                                                                        result.bet
                                                                    ) : columnIndex === 3 ? (
                                                                        result.site
                                                                    ) : columnIndex === 4 ? (
                                                                        result.chuDe
                                                                    ) : columnIndex === 5 ? (
                                                                        result.DR
                                                                    ) : columnIndex === 6 ? (
                                                                        result.trafficTool
                                                                    ) : columnIndex === 7 ? (
                                                                        result.ghiChu
                                                                    ) : columnIndex === 8 ? (
                                                                        renderPrice(result)
                                                                    ) : null
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                                    {searchResults.map((result, index) => (
                                        <Card key={index} className="bg-blue-50 border-none shadow-md border-t-2">
                                            <h4 className="font-semibold mb-2 text-[#FA298A] text-lg">{result.site}</h4>
                                            <p>Chủ site: {result.bong}</p>
                                            <p>Tình trạng: {result.bong}</p>
                                            <p>Đi Bóng: {result.bong}</p>
                                            <p>Đi BET: {result.bet}</p>
                                            <p>Chủ đề: {result.chuDe}</p>
                                            <p>DR: {result.DR}</p>
                                            <p>Traffic Tool: {result.trafficTool}</p>
                                            <p>Ghi chú: {result.ghiChu}</p>
                                            <p>Giá bán: {renderPrice(result)}</p>
                                            {userInfo?.role !== 4 && (
                                                <>
                                                    <p>
                                                        Giá mua:{" "}
                                                        {categoryType === "GP"
                                                            ? result.giaMuaGP
                                                            : categoryType === "Text"
                                                                ? result.giaMuaText
                                                                : categoryType === "TextHome"
                                                                    ? result.giaMuaTextHome
                                                                    : result.giaMuaTextHeader}
                                                    </p>
                                                    <p>Hoa hồng: {categoryType === "GP" ? result.hoaHongGP : result.hoaHongText}</p>
                                                    <p>
                                                        Giá cuối:{" "}
                                                        {categoryType === "GP"
                                                            ? result.giaCuoiGP
                                                            : categoryType === "Text"
                                                                ? result.giaCuoiText
                                                                : categoryType === "TextHome"
                                                                    ? result.giaCuoiTextHome
                                                                    : result.giaCuoiTextHeader}
                                                    </p>
                                                    <p>
                                                        Lợi nhuận:{" "}
                                                        {searchType === "Lio"
                                                            ? categoryType === "GP"
                                                                ? result.loiNhuanGPLio
                                                                : categoryType === "Text"
                                                                    ? result.loiNhuanTextLio
                                                                    : categoryType === "TextHome"
                                                                        ? result.loiNhuanTextHomeLio
                                                                        : result.loiNhuanTextHeaderLio
                                                            : categoryType === "GP"
                                                                ? result.loiNhuanGP
                                                                : categoryType === "Text"
                                                                    ? result.loiNhuanText
                                                                    : categoryType === "TextHome"
                                                                        ? result.loiNhuanTextHome
                                                                        : result.loiNhuanTextHeader}
                                                    </p>
                                                    <p>Tên NCC: {result.NCC}</p>
                                                    <p>Mã NCC: {result.MaNCC}</p>
                                                    <p>
                                                        File NCC:{" "}
                                                        <a
                                                            href="#"
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                const files = Array.isArray(result.FileNCC) ? result.FileNCC : [result.FileNCC]
                                                                const uniqueFiles = [...new Set(files.filter(Boolean))] // Remove duplicates and empty values
                                                                if (uniqueFiles.length === 0) {
                                                                    message.info("No file available")
                                                                    return
                                                                }
                                                                uniqueFiles.forEach((file) => {
                                                                    if (file) window.open(file, "_blank")
                                                                })
                                                            }}
                                                            className={`text-blue-500 hover:underline ${!result.FileNCC || (Array.isArray(result.FileNCC) && result.FileNCC.length === 0) ? "text-gray-400" : ""}`}
                                                        >
                                                            {Array.isArray(result.FileNCC) && result.FileNCC.filter(Boolean).length > 0
                                                                ? `View Files (${result.FileNCC.filter(Boolean).length})`
                                                                : !Array.isArray(result.FileNCC) && result.FileNCC
                                                                    ? "View File"
                                                                    : "No File"}
                                                        </a>
                                                    </p>
                                                    <p>
                                                        Group NCC:{" "}
                                                        <a
                                                            href="#"
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                const groups = Array.isArray(result.GroupNCC) ? result.GroupNCC : [result.GroupNCC]
                                                                const uniqueGroups = [...new Set(groups.filter(Boolean))] // Remove duplicates and empty values
                                                                if (uniqueGroups.length === 0) {
                                                                    message.info("No group available")
                                                                    return
                                                                }
                                                                uniqueGroups.forEach((group) => {
                                                                    if (group) window.open(group, "_blank")
                                                                })
                                                            }}
                                                            className={`text-blue-500 hover:underline ${!result.GroupNCC || (Array.isArray(result.GroupNCC) && result.GroupNCC.length === 0) ? "text-gray-400" : ""}`}
                                                        >
                                                            {Array.isArray(result.GroupNCC) && result.GroupNCC.filter(Boolean).length > 0
                                                                ? `View Groups (${result.GroupNCC.filter(Boolean).length})`
                                                                : !Array.isArray(result.GroupNCC) && result.GroupNCC
                                                                    ? "View Group"
                                                                    : "No Group"}
                                                        </a>
                                                    </p>
                                                </>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {searchMode === "site" && duplicateSites.length > 0 && (
                        <div className="pt-2 overflow-hidden mb-8">
                            <div className="flex justify-between items-center px-6 mb-4 flex-wrap">
                                <h3 className="text-xl font-semibold text-blue-600">Các site trùng</h3>
                                <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                                    <div className="hidden sm:flex items-center space-x-4">
                                        <button
                                            onClick={resetDuplicateColumnSelection}
                                            className="flex items-center gap-1 text-[13px] px-3 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                                        >
                                            <ReloadOutlined /> Reset
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => copyEntireTable(duplicateTableRef)}
                                        className="flex items-center gap-1 text-[13px] px-3 py-1 text-white bg-green-500 rounded hover:bg-green-600"
                                    >
                                        <CopyOutlined /> Copy All
                                    </button>
                                    <div className="flex sm:hidden space-x-2">
                                        <button
                                            onClick={resetDuplicateColumnSelection}
                                            className="flex items-center gap-1 text-[13px] px-3 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                                        >
                                            <ReloadOutlined /> Reset
                                        </button>
                                        <button
                                            onClick={copyDuplicateSelectedCells}
                                            disabled={selectedDuplicateColumns.length === 0}
                                            className={`flex items-center gap-1 text-[13px] px-3 py-1 rounded ${selectedDuplicateColumns.length === 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-green-500 text-white hover:bg-green-600"}`}
                                        >
                                            <CopyOutlined /> Copy
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                                    <table ref={duplicateTableRef} className="min-w-full">
                                        <thead className="sticky top-0 z-10 bg-blue-500">
                                            <tr>
                                                {((userInfo?.role !== "Admin" && userInfo?.role !== "Nhân viên") ? columnsKH : columnNames).map((header, index) => (
                                                    <th
                                                        key={index}
                                                        className={`px-2 py-2 text-left text-xs font-medium text-white tracking-wider border cursor-pointer ${selectedDuplicateColumns.includes(index) ? "bg-blue-700" : ""}`}
                                                        onClick={() => handleDuplicateColumnSelect(index)}
                                                    >
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {duplicateSites.map((result, rowIndex) => (
                                                <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                                    {((userInfo?.role !== "Admin" && userInfo?.role !== "Nhân viên") ? columnsKH : columnNames).map((_, columnIndex) => (
                                                        <td
                                                            key={columnIndex}
                                                            style={{ userSelect: "none" }}
                                                            className={`px-2 py-1 text-xs border whitespace-nowrap overflow-hidden text-ellipsis max-w-xs
                                ${selectedDuplicateColumns.includes(columnIndex) ? "bg-blue-200" : ""}
                                ${isMobile
                                                                    ? isDuplicateCellSelected(rowIndex + 1, columnIndex)
                                                                        ? "bg-blue-200"
                                                                        : ""
                                                                    : isDuplicateCellSelected(rowIndex + 1, columnIndex)
                                                                        ? "bg-sky-100"
                                                                        : ""
                                                                }`}
                                                            onMouseDown={(e) => handleDuplicateCellClick(rowIndex + 1, columnIndex, e)}
                                                            onMouseEnter={(e) => handleDuplicateCellEnter(rowIndex + 1, columnIndex, e)}
                                                            onMouseUp={handleMouseUp}
                                                            onContextMenu={(e) => handleCellContextMenu(e, result)}
                                                        >
                                                            {userInfo?.role === "Admin" || userInfo?.role === "Nhân viên" ? (
                                                                columnIndex === 0 ? (
                                                                    result.cs
                                                                ) : columnIndex === 1 ? (
                                                                    result.tinhTrang
                                                                ) : columnIndex === 2 ? (
                                                                    result.bong
                                                                ) : columnIndex === 3 ? (
                                                                    result.bet
                                                                ) : columnIndex === 4 ? (
                                                                    result.site
                                                                ) : columnIndex === 5 ? (
                                                                    result.chuDe
                                                                ) : columnIndex === 6 ? (
                                                                    result.DR
                                                                ) : columnIndex === 7 ? (
                                                                    result.trafficTool
                                                                ) : columnIndex === 8 ? (
                                                                    result.ghiChu
                                                                ) : columnIndex === 9 ? (
                                                                    renderPrice(result)
                                                                ) : columnIndex === 10 ? (
                                                                    categoryType === "GP" ? (
                                                                        result.giaMuaGP
                                                                    ) : categoryType === "Text" ? (
                                                                        result.giaMuaText
                                                                    ) : categoryType === "TextHome" ? (
                                                                        result.giaMuaTextHome
                                                                    ) : (
                                                                        result.giaMuaTextHeader
                                                                    )
                                                                ) : columnIndex === 11 ? (
                                                                    categoryType === "GP" ? (
                                                                        result.hoaHongGP
                                                                    ) : (
                                                                        result.hoaHongText
                                                                    )
                                                                ) : columnIndex === 12 ? (
                                                                    categoryType === "GP" ? (
                                                                        result.giaCuoiGP
                                                                    ) : categoryType === "Text" ? (
                                                                        result.giaCuoiText
                                                                    ) : categoryType === "TextHome" ? (
                                                                        result.giaCuoiTextHome
                                                                    ) : (
                                                                        result.giaCuoiTextHeader
                                                                    )
                                                                ) : columnIndex === 13 ? (
                                                                    searchType === "Lio" ? (
                                                                        categoryType === "GP" ? (
                                                                            result.loiNhuanGPLio
                                                                        ) : categoryType === "Text" ? (
                                                                            result.loiNhuanTextLio
                                                                        ) : categoryType === "TextHome" ? (
                                                                            result.loiNhuanTextHomeLio
                                                                        ) : (
                                                                            result.loiNhuanTextHeaderLio
                                                                        )
                                                                    ) : categoryType === "GP" ? (
                                                                        result.loiNhuanGP
                                                                    ) : categoryType === "Text" ? (
                                                                        result.loiNhuanText
                                                                    ) : categoryType === "TextHome" ? (
                                                                        result.loiNhuanTextHome
                                                                    ) : (
                                                                        result.loiNhuanTextHeader
                                                                    )
                                                                ) : columnIndex === 14 ? (
                                                                    result.timeText
                                                                ) : columnIndex === 15 ? (
                                                                    result.NCC
                                                                ) : columnIndex === 16 ? (
                                                                    result.MaNCC
                                                                ) : columnIndex === 17 ? (
                                                                    <a
                                                                        href="#"
                                                                        onClick={(e) => {
                                                                            e.preventDefault()
                                                                            const files = Array.isArray(result.FileNCC) ? result.FileNCC : [result.FileNCC]
                                                                            const uniqueFiles = [...new Set(files.filter(Boolean))]
                                                                            if (uniqueFiles.length === 0) {
                                                                                message.info("No file available")
                                                                                return
                                                                            }
                                                                            uniqueFiles.forEach((file) => {
                                                                                if (file) window.open(file, "_blank")
                                                                            })
                                                                        }}
                                                                        className={`text-blue-500 hover:underline ${!result.FileNCC || (Array.isArray(result.FileNCC) && result.FileNCC.length === 0) ? "text-gray-400" : ""}`}
                                                                    >
                                                                        {Array.isArray(result.FileNCC) && result.FileNCC.filter(Boolean).length > 0
                                                                            ? `File NCC (${result.FileNCC.filter(Boolean).length})`
                                                                            : !Array.isArray(result.FileNCC) && result.FileNCC
                                                                                ? "File NCC"
                                                                                : "No File"}
                                                                    </a>
                                                                ) : columnIndex === 18 ? (
                                                                    <a
                                                                        href="#"
                                                                        onClick={(e) => {
                                                                            e.preventDefault()
                                                                            const groups = Array.isArray(result.GroupNCC) ? result.GroupNCC : [result.GroupNCC]
                                                                            const uniqueGroups = [...new Set(groups.filter(Boolean))]
                                                                            if (uniqueGroups.length === 0) {
                                                                                message.info("No group available")
                                                                                return
                                                                            }
                                                                            uniqueGroups.forEach((group) => {
                                                                                if (group) window.open(group, "_blank")
                                                                            })
                                                                        }}
                                                                        className={`text-blue-500 hover:underline ${!result.GroupNCC || (Array.isArray(result.GroupNCC) && result.GroupNCC.length === 0) ? "text-gray-400" : ""}`}
                                                                    >
                                                                        {Array.isArray(result.GroupNCC) && result.GroupNCC.filter(Boolean).length > 0
                                                                            ? `Group NCC (${result.GroupNCC.filter(Boolean).length})`
                                                                            : !Array.isArray(result.GroupNCC) && result.GroupNCC
                                                                                ? "Group NCC"
                                                                                : "No Group"}
                                                                    </a>
                                                                ) : (
                                                                    result.GhiChuNCC
                                                                )
                                                            ) : (
                                                                columnIndex === 0 ? (
                                                                    result.tinhTrang
                                                                ) : columnIndex === 1 ? (
                                                                    result.bong
                                                                ) : columnIndex === 2 ? (
                                                                    result.bet
                                                                ) : columnIndex === 3 ? (
                                                                    result.site
                                                                ) : columnIndex === 4 ? (
                                                                    result.chuDe
                                                                ) : columnIndex === 5 ? (
                                                                    result.DR
                                                                ) : columnIndex === 6 ? (
                                                                    result.trafficTool
                                                                ) : columnIndex === 7 ? (
                                                                    result.ghiChu
                                                                ) : columnIndex === 8 ? (
                                                                    renderPrice(result)
                                                                ) : null
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Context Menu */}
            {mounted && contextMenu.visible && createPortal(
                <Dropdown menu={{ items: contextMenuItems }} open={true} trigger={["contextMenu"]}>
                    <div
                        style={{
                            position: "fixed",
                            top: contextMenu.y,
                            left: contextMenu.x,
                            zIndex: 1000,
                            width: 1,
                            height: 1,
                        }}
                    />
                </Dropdown>,
                document.body,
                'context-menu-portal'
            )}

            {/* Add the NCC selection modal to the JSX return (at the end of the component, before the final closing tag) */}
            {/* NCC Selection Modal */}
            <Modal
                title="Chọn NCC để gửi tin nhắn"
                open={showNccSelectionModal}
                onCancel={() => setShowNccSelectionModal(false)}
                footer={[
                    <Button key="cancel" onClick={() => setShowNccSelectionModal(false)}>
                        Hủy
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        onClick={() => handleMessageNCC(null, true)}
                        disabled={selectedNCCs.size === 0}
                    >
                        Gửi tin nhắn ({selectedNCCs.size})
                    </Button>,
                ]}
                width={600}
            >
                <div className="mb-4 flex justify-between">
                    <Button onClick={selectAllNccs}>Chọn tất cả</Button>
                    <Button onClick={deselectAllNccs}>Bỏ chọn tất cả</Button>
                </div>

                <div className="max-h-[400px] overflow-y-auto border rounded p-2">
                    {nccList.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {nccList.map((ncc) => (
                                <div key={ncc.id} className="flex items-center p-2 border rounded hover:bg-gray-50">
                                    <Checkbox checked={selectedNCCs.has(ncc.id)} onChange={() => handleNccSelection(ncc.id)} />
                                    <span className="ml-2">
                                        {ncc.name} (ID: {ncc.id})
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-500">
                            Không tìm thấy NCC nào có IdGroup trong kết quả tìm kiếm
                        </div>
                    )}
                </div>
            </Modal>
        </Spin>
    )
}

