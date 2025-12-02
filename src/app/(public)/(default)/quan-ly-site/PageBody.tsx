"use client"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import type React from "react"

import { HotTable } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import Handsontable from "handsontable"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import { useSheetUpdateSiteData } from "@/hooks/useSheetUpdateSiteData"
import sheetApiRequest from "@/apiRequests/sheet"
import { Modal, message, Spin } from "antd"
import CurrencyConverterModal from "@/components/CurrencyConverterModal"
import "./custom-table.css"
import {
    Search,
    Plus,
    Loader2,
    RefreshCw,
    Save,
    Database,
    Globe,
    Filter,
    FileText,
    ChevronDown,
    X,
    AlertCircle,
    CheckCircle2,
    Info,
} from "lucide-react"
import getUserInfo from "@/components/userInfo"

// Register Handsontable's modules
registerAllModules()

// Define column headers
const RowHeader1 = [
    "STT",
    "CS",
    "Site",
    "Bóng",
    "Bet",
    "Chủ đề",
    "Nước",
    "Link out",
    "DR",
    "Keywords",
    "Traffic Tool",
    "Ghi chú",
    "Tình trạng",
    "GP ($)",
    "Text Footer ($)",
    "Text Home ($)",
    "Text Header ($)",
    "HH GP",
    "HH Text",
    "Kê GP",
    "Kê Text",
    "Tên",
    "NCC",
    "Note NB",
]

const RowHeader11: any = [
    { label: ``, colspan: 1 },
    { label: "INFO", colspan: 12 },
    { label: "Giá", colspan: 4 },
    { label: "Hoa hồng", colspan: 2 },
    { label: "Kê thêm", colspan: 2 },
    { label: "NCC", colspan: 2 },
]

const RowHeader2 = [
    "CS",
    "Site",
    "Bóng",
    "Bet",
    "Chủ đề",
    "Nước",
    "Link out",
    "DR",
    "Keywords",
    "Traffic Tool",
    "Ghi chú",
    "Tình trạng",
    "GP ($)",
    "Text Footer ($)",
    "Text Home ($)",
    "Text Header ($)",
    "HH GP",
    "HH Text",
    "Kê GP",
    "Kê Text",
    "Tên",
    "NCC",
    "Note NB",
]

const getInitialDataType = () => {
    const userInfo = getUserInfo()
    if (userInfo?.role === "NCC") {
        if (userInfo?.name === "Việt Nam") {
            return 1 // Data Việt Nam
        } else if (userInfo?.name === "Nước Ngoài") {
            return 2 // Data Nước Ngoài
        }
    }
    return 1 // Default to Data Việt Nam
}

// Define column settings
const columnSettings: Record<string, any> = {
    STT: {
        readOnly: true,
    },
    "Tình trạng": {
        type: "dropdown",
        source: ["Bình thường", "Ngưng"],
        renderer: (
            instance: Handsontable,
            td: HTMLTableCellElement,
            row: number,
            col: number,
            prop: string | number,
            value: string,
            cellProperties: Handsontable.CellProperties,
        ) => {
            Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties)
            if (value === "Bình thường") {
                td.style.background = "#16a34a"
                td.style.color = "#ffffff"
                td.style.fontWeight = "500"
                td.style.textAlign = "center"
            } else if (value === "Ngưng") {
                td.style.background = "#dc2626"
                td.style.color = "#ffffff"
                td.style.fontWeight = "500"
                td.style.textAlign = "center"
            }
        },
    },
}

// Normalize input for domain matching: remove protocol, www, path/query, lowercase
const normalizeDomain = (input: string | undefined | null) => {
    if (!input) return ""
    let s = String(input).trim().toLowerCase()
    s = s.replace(/^https?:\/\//, "")
    s = s.replace(/^www\./, "")
    // cut at first slash, question or hash
    const cutIdx = Math.min(
        ...["/", "?", "#"].map((ch) => {
            const idx = s.indexOf(ch)
            return idx === -1 ? s.length : idx
        }),
    )
    s = s.substring(0, cutIdx)
    return s.replace(/\/$/, "")
}

// Normalize generic string for exact, case-insensitive match
const normalizeExact = (input: string | undefined | null) => {
    if (!input) return ""
    return String(input).trim().toLowerCase()
}

// Fixed column widths: 1-3 => 30px (STT/Site/Bóng), 4-6 => 50px (Bet/Chủ đề/Nước), others 100px
const getColWidthsForHeaders = (headers: string[]) => {
    return headers.map((header) => {
        if (["STT", "Bet", "Bóng", "DR", "HH GP", "HH Text", "Kê GP", "Kê Text", "CS", "Tên", "NCC", "Note NB"].includes(header)) return 60
        if (["Link out", "Chủ đề", "Keywords", "Traffic Tool", "GP ($)", "Text Footer ($)", "Text Home ($)", "Text Header ($)"].includes(header)) return 76
        return 90
    })
}

// Renderer wrapper to add ellipsis and title tooltip while preserving any base renderer styling
const withEllipsis = (
    baseRenderer?: (
        instance: Handsontable,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string | number,
        value: any,
        cellProperties: Handsontable.CellProperties,
    ) => void,
) => {
    return (
        instance: Handsontable,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string | number,
        value: any,
        cellProperties: Handsontable.CellProperties,
    ) => {
        if (baseRenderer) {
            baseRenderer(instance, td, row, col, prop, value, cellProperties)
        } else {
            Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties)
        }
        td.style.whiteSpace = "nowrap"
        td.style.overflow = "hidden"
        td.style.textOverflow = "ellipsis"
        td.title = value == null ? "" : String(value)
    }
}

export default function PageBody() {
    const [searchText, setSearchText] = useState("")
    const [filteredData, setFilteredData] = useState<any[]>([])
    const [missingSites, setMissingSites] = useState<string[]>([])
    const [dataType, setDataType] = useState<1 | 2>(getInitialDataType()) // 1 for VN, 2 for NN
    const [isAddModalVisible, setIsAddModalVisible] = useState(false)
    const [numberOfRows, setNumberOfRows] = useState(1)
    const [pendingRows, setPendingRows] = useState<any[]>([])
    const [messageApi, contextHolder] = message.useMessage()
    const [saving, setSaving] = useState(false) // Loading state riêng cho việc save

    // Sử dụng hook tối ưu để fetch và cache dữ liệu
    const { data: updateSiteData, loading, refreshing, refetch, isStale, error } = useSheetUpdateSiteData(true)
    const dataVN = updateSiteData?.updateVN || []
    const dataNN = updateSiteData?.updateNN || []
    const [showSearchHelp, setShowSearchHelp] = useState(false)
    const [activeTab, setActiveTab] = useState<"data" | "pending">("data")
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; row: number }>({
        visible: false,
        x: 0,
        y: 0,
        row: -1,
    })
    const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false)
    const [currencyMode, setCurrencyMode] = useState<"USD" | "VND">("USD")
    const [exchangeRate, setExchangeRate] = useState<string>("28000")
    const [pendingChanges, setPendingChanges] = useState<Record<number, any>>({})
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [originalValues, setOriginalValues] = useState<Record<string, any>>({}) // Store original values
    const dataTableRef = useRef<any>(null)

    const userInfo = getUserInfo()

    // Xử lý error từ hook
    const configError = error?.message.includes("REPLACE_WITH_YOUR_ACTUAL_PRIVATE_KEY") || 
                       error?.message.includes("your-google-cloud-project-id")
                       ? "Vui lòng cấu hình file key.json với thông tin Google Service Account thực tế"
                       : null


    // Stats for dashboard
    const stats = useMemo(() => {
        const currentData = dataType === 1 ? dataVN : dataNN
        return {
            total: currentData.length,
            active: currentData.filter((row) => row["Tình trạng"] === "Bình thường").length,
            inactive: currentData.filter((row) => row["Tình trạng"] === "Ngưng").length,
        }
    }, [dataType, dataVN, dataNN])

    // Fetch dữ liệu mới khi user click refresh
    const fetchData = useCallback(async () => {
        try {
            await refetch()
        } catch (error: any) {
            console.error("[v0] Error fetching data:", error)
            if (
                error.message.includes("REPLACE_WITH_YOUR_ACTUAL_PRIVATE_KEY") ||
                error.message.includes("your-google-cloud-project-id")
            ) {
                messageApi.error({
                    content: "Vui lòng cấu hình file key.json với thông tin Google Service Account thực tế",
                    icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
                    duration: 8,
                })
            } else if (error.message.includes("timeout") || error.message.includes("Request timeout")) {
                messageApi.error({
                    content: "Kết nối quá chậm (timeout 120s), vui lòng kiểm tra kết nối mạng và thử lại",
                    icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
                    duration: 8,
                })
            } else {
                messageApi.error({
                    content: `Có lỗi xảy ra khi tải dữ liệu: ${error.message}`,
                    icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
                    duration: 5,
                })
            }
        }
    }, [refetch, messageApi])

    useEffect(() => {
        if (searchText.trim()) {
            const rawTerms = searchText.split(/[\n\s]+/).filter((term) => term.trim())
            const normalizedDomainTerms = rawTerms.map((t) => normalizeDomain(t)).filter(Boolean)
            const normalizedExactTerms = rawTerms.map((t) => normalizeExact(t)).filter(Boolean)

            // Map for ordering priority based on input order (domains first, then exact strings)
            const priorityMap = new Map<string, number>()
            normalizedDomainTerms.forEach((t, i) => {
                if (!priorityMap.has(t)) priorityMap.set(t, i)
            })
            const baseOffset = normalizedDomainTerms.length
            normalizedExactTerms.forEach((t, i) => {
                const key = `exact:${t}`
                if (!priorityMap.has(key)) priorityMap.set(key, baseOffset + i)
            })

            const dataToFilter = dataType === 1 ? dataVN : dataNN
            const filtered = dataToFilter.filter((row) => {
                const siteNorm = normalizeDomain(row.Site)
                const maNorm = normalizeExact(row.NCC)

                const siteMatch = normalizedDomainTerms.includes(siteNorm)
                const maNCCMatch = normalizedExactTerms.includes(maNorm)

                const hasData = Object.keys(row).some(
                    (key) => key !== "Site" && key !== "NCC" && row[key] && row[key].toString().trim() !== "",
                )
                return (siteMatch || maNCCMatch) && hasData
            })

            const getPriority = (row: any) => {
                const siteNorm = normalizeDomain(row.Site)
                const maNorm = normalizeExact(row.NCC)
                let p = Number.MAX_SAFE_INTEGER
                if (priorityMap.has(siteNorm)) p = Math.min(p, priorityMap.get(siteNorm) as number)
                const exactKey = `exact:${maNorm}`
                if (priorityMap.has(exactKey)) p = Math.min(p, priorityMap.get(exactKey) as number)
                return p
            }

            const sorted = filtered.slice().sort((a, b) => getPriority(a) - getPriority(b))
            setFilteredData(sorted)

            // Find missing sites (sites that were searched but not found in database)
            const foundSites = new Set<string>()
            dataToFilter.forEach((row) => {
                const siteNorm = normalizeDomain(row.Site)
                const maNorm = normalizeExact(row.NCC)
                if (normalizedDomainTerms.includes(siteNorm) || normalizedExactTerms.includes(maNorm)) {
                    foundSites.add(siteNorm)
                    foundSites.add(maNorm)
                }
            })

            const missing = rawTerms.filter((term) => {
                const normalizedTerm = normalizeDomain(term)
                return !foundSites.has(normalizedTerm) && !foundSites.has(normalizeExact(term))
            })
            setMissingSites(missing)
        } else {
            setFilteredData([])
            setMissingSites([])
        }
    }, [searchText, dataVN, dataNN, dataType])

    const handleBeforeChange = useCallback(
        (changes: (Handsontable.CellChange | null)[], source: Handsontable.ChangeSource) => {
            if (changes) {
                const newOriginalValues = { ...originalValues }
                
                changes.forEach((change) => {
                    if (!change) return
                    
                    const [row, prop, oldValue, newValue] = change
                    const columnName = typeof prop === "string" ? prop : RowHeader1[prop as number]
                    
                    if (!columnName) return
                    
                    const dataToUse = dataType === 1 ? dataVN : dataNN
                    const currentRow = searchText.trim() ? filteredData[row] : dataToUse[row]
                    const siteName = currentRow?.Site || 'Unknown'
                    
                    // Store the original value before it gets changed
                    const key = `${siteName}_${columnName}`
                    if (!newOriginalValues[key]) {
                        newOriginalValues[key] = oldValue
                        console.log(`[DEBUG] Stored original value for ${key}:`, oldValue)
                    }
                })
                
                setOriginalValues(newOriginalValues)
            }
        },
        [dataType, dataVN, dataNN, filteredData, searchText, originalValues]
    )

    const handleAfterChange = useCallback(
        (changes: Handsontable.CellChange[] | null, source: "edit" | "paste" | Handsontable.ChangeSource) => {
            if ((source === "edit" || source === "paste") && changes) {
                const newPendingChanges = { ...pendingChanges }
                let hasChanges = false

                changes.forEach((change) => {
                    const [row, prop, oldValue, newValue] = change
                    const columnName = typeof prop === "string" ? prop : RowHeader1[prop as number]

                    if (!columnName || oldValue === newValue) return

                    const dataToUse = dataType === 1 ? dataVN : dataNN
                    const currentRow = searchText.trim() ? filteredData[row] : dataToUse[row]

                    const actualRowIndex = currentRow?.rowIndex || row + 2
                    const sheetName = currentRow?.sheetName
                    const siteName = currentRow?.Site || 'Unknown'

                    // Get the original value we stored before the change
                    const key = `${siteName}_${columnName}`
                    const actualOldValue = originalValues[key] !== undefined ? originalValues[key] : oldValue
                    
                    // Debug logging
                    console.log(`[DEBUG] Change detected:`, {
                        row,
                        columnName,
                        siteName,
                        key,
                        oldValue,
                        newValue,
                        actualOldValue,
                        originalValue: originalValues[key],
                        currentRowValue: currentRow ? currentRow[columnName] : 'N/A'
                    })

                    if (!newPendingChanges[row]) {
                        newPendingChanges[row] = {
                            rowIndex: actualRowIndex,
                            sheetName,
                            siteName: currentRow?.Site || 'Unknown',
                            changes: {},
                        }
                    }

                    const priceFields = ["GP ($)", "Text Footer ($)", "Text Home ($)", "Text Header ($)"]
                    // Normalize empty values: null, undefined, empty string all become empty string
                    const rawValue = (newValue === null || newValue === undefined || newValue === "") ? "" : newValue
                    let finalValue = rawValue
                    
                    if (priceFields.includes(columnName) && currencyMode === "VND") {
                        const numeric = Number(String(rawValue).toString().replace(/[\,\s]/g, ""))
                        const rate = Number.parseFloat(exchangeRate)
                        const converted = !isNaN(numeric) && !isNaN(rate) && rate > 0 ? Math.round(numeric / rate) : rawValue
                        finalValue = converted
                        try {
                            const colIndex = typeof prop === "number" ? (prop as number) : RowHeader1.indexOf(columnName)
                            dataTableRef.current?.hotInstance?.setDataAtCell(row, colIndex, converted, "usd_convert")
                        } catch { }
                    }

                    // Store both old and new values
                    newPendingChanges[row].changes[columnName] = {
                        oldValue: actualOldValue,
                        newValue: finalValue
                    }
                    hasChanges = true
                })

                if (hasChanges) {
                    setPendingChanges(newPendingChanges)
                    setHasUnsavedChanges(true)
                }
            }
        },
        [dataType, dataVN, dataNN, filteredData, searchText, currencyMode, exchangeRate, pendingChanges, originalValues],
    )

    const handleSaveChanges = useCallback(async () => {
        if (!hasUnsavedChanges || Object.keys(pendingChanges).length === 0) {
            return
        }

        try {
            setSaving(true)
            // Prepare updates for Google Sheets (only new values)
            const updates = Object.values(pendingChanges).map(update => ({
                ...update,
                changes: Object.entries(update.changes).reduce((acc, [field, changeData]) => {
                    acc[field] = (changeData as { oldValue: any; newValue: any }).newValue; // Only send new value to Google Sheets
                    return acc;
                }, {} as Record<string, any>)
            }))
            
            // Prepare updates for Telegram (both old and new values)
            const telegramUpdates = Object.values(pendingChanges).map(update => ({
                site: update.siteName || 'Unknown',
                changes: Object.entries(update.changes).reduce((acc, [field, changeData]) => {
                    const change = changeData as { oldValue: any; newValue: any };
                    acc[field] = {
                        oldValue: change.oldValue,
                        newValue: change.newValue
                    };
                    return acc;
                }, {} as Record<string, { oldValue: any; newValue: any }>)
            }))
            
            console.log("[v0] Saving pending changes:", updates)
            await sheetApiRequest.updateData(updates, dataType)
            
            // Send Telegram notification if there are changes
            if (telegramUpdates.length > 0) {
                console.log('[DEBUG] Sending Telegram notification with data:', JSON.stringify(telegramUpdates, null, 2));
                try {
                    await fetch('/api/telegram/site-update', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            username: userInfo?.username || 'Unknown',
                            updates: telegramUpdates,
                            dataType: dataType,
                            isNewSite: false
                        }),
                    });
                    console.log('✅ Telegram notification sent from frontend');
                } catch (telegramError) {
                    console.error('❌ Failed to send Telegram notification from frontend:', telegramError);
                }
            }
            
            // Clear pending changes and original values after successful save
            setPendingChanges({})
            setHasUnsavedChanges(false)
            setOriginalValues({})
            
            messageApi.success({
                content: `Đã lưu thành công ${updates.length} thay đổi`,
                icon: <CheckCircle2 className="text-green-500 mr-2" size={16} />,
            })
        } catch (error: any) {
            console.error("[v0] Save error:", error)
            if (error.message.includes("timeout") || error.message.includes("Request timeout")) {
                messageApi.error({
                    content: "Lưu timeout (90s), vui lòng thử lại",
                    icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
                    duration: 8,
                })
            } else {
                messageApi.error({
                    content: `Lỗi lưu: ${error.message}`,
                    icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
                })
            }
        } finally {
            setSaving(false)
        }
    }, [hasUnsavedChanges, pendingChanges, dataType, messageApi, userInfo?.username])

    const handleAfterPaste = useCallback(
        (data: any[][], coords: any[]) => {
            const {
                startRow: initialStartRow,
                startCol,
                endRow: initialEndRow,
                endCol: initialEndCol,
            } = coords[0] || ({} as any)

            const newPendingChanges = { ...pendingChanges }
            let hasChanges = false

            // Expand pasted data to match the selected range if user selected a larger area
            const selectionRowCount = (typeof initialEndRow === "number" ? initialEndRow : initialStartRow) - initialStartRow + 1
            const selectionColCount = (typeof initialEndCol === "number" ? initialEndCol : startCol) - startCol + 1

            const sourceRowCount = Math.max(1, data.length)
            const sourceColCount = Math.max(1, (data[0] || []).length)

            const expandedData: any[][] = Array.from({ length: Math.max(selectionRowCount, sourceRowCount) }, (_, r) => {
                return Array.from({ length: Math.max(selectionColCount, sourceColCount) }, (_, c) => {
                    const srcRow = data[r % sourceRowCount] || []
                    return srcRow[c % sourceColCount]
                })
            })

            expandedData.forEach((rowData, index) => {
                const currentRowIndex = initialStartRow + index
                const dataToUse = dataType === 1 ? dataVN : dataNN
                const currentRow = searchText.trim() ? filteredData[currentRowIndex] : dataToUse[currentRowIndex]

                if (!currentRow) return

                const actualRowIndex = currentRow.rowIndex
                const sheetName = currentRow.sheetName
                const siteName = currentRow?.Site || 'Unknown'
                
                if (!newPendingChanges[currentRowIndex]) {
                    newPendingChanges[currentRowIndex] = {
                        rowIndex: actualRowIndex,
                        sheetName,
                        siteName,
                        changes: {},
                    }
                }

                rowData.forEach((value, colIndex) => {
                    const columnName = RowHeader1[startCol + colIndex]
                    if (columnName) {
                        const priceFields = ["GP ($)", "Text Footer ($)", "Text Home ($)", "Text Header ($)"]
                        // Normalize empty values: null, undefined, empty string all become empty string
                        const rawValue = (value === null || value === undefined || value === "") ? "" : value
                        let finalValue = rawValue
                        
                        if (priceFields.includes(columnName) && currencyMode === "VND") {
                            const numeric = Number(String(rawValue).toString().replace(/[\,\s]/g, ""))
                            const rate = Number.parseFloat(exchangeRate)
                            const converted = !isNaN(numeric) && !isNaN(rate) && rate > 0 ? Math.round(numeric / rate) : rawValue
                            finalValue = converted
                            try {
                                const r = currentRowIndex
                                const c = startCol + colIndex
                                dataTableRef.current?.hotInstance?.setDataAtCell(r, c, converted, "usd_convert")
                            } catch { }
                        }

                        // Store both old and new values (for paste, try to use original value first, then fall back to current value)
                        const key = `${siteName}_${columnName}`
                        const actualOldValue = originalValues[key] !== undefined ? originalValues[key] : (currentRow[columnName] || "")
                        newPendingChanges[currentRowIndex].changes[columnName] = {
                            oldValue: actualOldValue,
                            newValue: finalValue
                        }
                        hasChanges = true
                    }
                })
            })

            if (hasChanges) {
                setPendingChanges(newPendingChanges)
                setHasUnsavedChanges(true)
            }
        },
        [dataType, dataVN, dataNN, filteredData, searchText, currencyMode, exchangeRate, pendingChanges, originalValues],
    )

    const handleAfterRemoveRow = useCallback(
        (index: number, amount: number, physicalRows: number[], source?: string) => {
            const updates = physicalRows.map((row) => {
                const dataToUse = dataType === 1 ? dataVN : dataNN
                const currentRow = searchText.trim() ? filteredData[row] : dataToUse[row]
                const actualRowIndex = currentRow.rowIndex

                return {
                    rowIndex: actualRowIndex,
                    changes: {
                        "Tình trạng": "Ngưng",
                    },
                }
            })

            if (updates.length > 0) {
                sheetApiRequest.updateData(updates, dataType)
            }
        },
        [dataType, dataVN, dataNN, filteredData, searchText, messageApi],
    )

    const handleAddRows = useCallback(async () => {
        try {
            const newRows = Array.from({ length: numberOfRows }, () => {
                const baseRow = {
                    CS: "",
                    Site: "",
                    Bóng: "",
                    Bet: "",
                    "Chủ đề": "",
                    Nước: "",
                    "Link out": "",
                    DR: "",
                    Keywords: "",
                    "Traffic Tool": "",
                    "Ghi chú": "",
                    "Tình trạng": "Bình thường",
                    "GP ($)": "",
                    "Text Footer ($)": "",
                    "Text Home ($)": "",
                    "Text Header ($)": "",
                    "HH GP": "",
                    "HH Text": "",
                    "Kê GP": "",
                    "Kê Text": "",
                    "Note NB": "",
                }

                if (userInfo?.role !== "NCC") {
                    return {
                        ...baseRow,
                        "Tên": "",
                        NCC: "",
                    }
                }

                return baseRow
            })

            setPendingRows(newRows)
            setIsAddModalVisible(false)
            setActiveTab("pending")
            messageApi.success({
                content: "Đã thêm hàng mới thành công",
                icon: <CheckCircle2 className="text-green-500 mr-2" size={16} />,
            })
        } catch (error) {
            console.error("Error adding rows:", error)
            messageApi.error({
                content: "Có lỗi xảy ra khi thêm hàng mới",
                icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
            })
        }
    }, [numberOfRows, messageApi, userInfo?.role, dataType])

    const handlePendingRowChange = useCallback(
        (changes: Handsontable.CellChange[] | null, source: "edit" | "paste" | Handsontable.ChangeSource) => {
            if ((source === "edit" || source === "paste") && changes) {
                const newPendingRows = [...pendingRows]

                changes.forEach((change) => {
                    const [row, prop, oldValue, newValue] = change
                    const columnName = typeof prop === "string" ? prop : RowHeader2[prop as number]

                    if (!columnName) return

                    const priceFields = ["GP ($)", "Text Footer ($)", "Text Home ($)", "Text Header ($)"]
                    const rawValue = newValue === null ? "" : newValue

                    // Convert in-place for pending rows when currency is VND, mirroring main edit flow
                    if (priceFields.includes(columnName) && currencyMode === "VND") {
                        const numeric = Number(String(rawValue).toString().replace(/[\,\s]/g, ""))
                        const rate = Number.parseFloat(exchangeRate)
                        const converted = !isNaN(numeric) && !isNaN(rate) && rate > 0 ? numeric / rate : rawValue
                        newPendingRows[row] = {
                            ...newPendingRows[row],
                            [columnName]: converted,
                        }
                    } else {
                        newPendingRows[row] = {
                            ...newPendingRows[row],
                            [columnName]: rawValue,
                        }
                    }
                })

                setPendingRows(newPendingRows)
            }
        },
        [pendingRows, currencyMode, exchangeRate],
    )

    const handleSavePendingRows = useCallback(async () => {
        try {
            const priceFields = ["GP ($)", "Text Footer ($)", "Text Home ($)", "Text Header ($)"]
            const convertRowIfNeeded = (row: any) => {
                // Pending rows already converted to USD on input when currency is VND
                return row
            }

            const rowsToSave = pendingRows.filter((row) => {
                // Must have Site field filled
                if (!row.Site || row.Site.toString().trim() === "") {
                    return false
                }
                // Site is enough to be considered valid (other fields are optional)
                return true
            })

            if (rowsToSave.length > 0) {
                Modal.confirm({
                    title: "Xác nhận thêm dữ liệu",
                    content: `Bạn có chắc chắn muốn thêm ${rowsToSave.length} site không?`,
                    okText: "Đồng ý",
                    cancelText: "Hủy",
                    okButtonProps: {
                        className: "bg-green-600 hover:bg-green-700",
                    },
                    onOk: async () => {
                        const convertedRows = rowsToSave.map(convertRowIfNeeded)
                        await sheetApiRequest.appendRows(convertedRows, dataType)
                        await fetchData() // Reload data after adding new rows
                        setPendingRows([])
                        setActiveTab("data")
                        messageApi.success({
                            content: `Đã thêm thành công ${rowsToSave.length} site`,
                            icon: <CheckCircle2 className="text-green-500 mr-2" size={16} />,
                        })
                    },
                })
            } else {
                messageApi.warning({
                    content: "Không có dữ liệu để lưu. Vui lòng nhập ít nhất Site.",
                    icon: <Info className="text-yellow-500 mr-2" size={16} />,
                })
            }
        } catch (error) {
            console.error("Error saving rows:", error)
            messageApi.error({
                content: "Có lỗi xảy ra khi lưu dữ liệu",
                icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
            })
        }
    }, [pendingRows, dataType, messageApi, fetchData])

    const clearSearch = useCallback(() => {
        setSearchText("")
        setFilteredData([])
        setMissingSites([])
    }, [])

    const handleContextMenu = useCallback((event: React.MouseEvent, row: number) => {
        event.preventDefault()
        setContextMenu({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            row,
        })
    }, [])

    const handleDeleteRow = useCallback(
        async (row: number) => {
            try {
                const dataToUse = dataType === 1 ? dataVN : dataNN
                const currentRow = searchText.trim() ? filteredData[row] : dataToUse[row]
                const actualRowIndex = currentRow.rowIndex

                Modal.confirm({
                    title: "Xác nhận xóa dòng",
                    content: "Bạn có chắc chắn muốn xóa dòng này không?",
                    okText: "Đồng ý",
                    cancelText: "Hủy",
                    okButtonProps: {
                        className: "bg-green-600 hover:bg-green-700",
                    },
                    onOk: async () => {
                        try {
                            await sheetApiRequest.deleteRow(actualRowIndex, dataType)
                            await fetchData() // Reload data after deletion
                            messageApi.success({
                                content: "Đã xóa dòng thành công",
                                icon: <CheckCircle2 className="text-green-500 mr-2" size={16} />,
                            })
                        } catch (error) {
                            console.error("Error deleting row:", error)
                            messageApi.error({
                                content: "Có lỗi xảy ra khi xóa dòng",
                                icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
                            })
                        }
                    },
                })
            } catch (error) {
                console.error("Error preparing delete row:", error)
                messageApi.error({
                    content: "Có lỗi xảy ra khi chuẩn bị xóa dòng",
                    icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
                })
            }
        },
        [dataType, dataVN, dataNN, filteredData, searchText, messageApi, fetchData],
    )


    if (configError) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
                <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-red-100 max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-800 mb-4">Cần cấu hình Google Service Account</h2>
                    <p className="text-red-600 mb-6">{configError}</p>
                    <div className="text-left bg-red-50 p-4 rounded-lg border border-red-200">
                        <p className="font-medium text-red-800 mb-2">Hướng dẫn:</p>
                        <ol className="list-decimal list-inside text-sm text-red-700 space-y-1">
                            <li>Tạo Google Service Account tại Google Cloud Console</li>
                            <li>Tải file JSON credentials</li>
                            <li>Thay thế nội dung file key.json bằng thông tin thực tế</li>
                            <li>Chia sẻ Google Sheet với email service account</li>
                        </ol>
                    </div>
                    <button
                        onClick={fetchData}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col p-4 space-y-4 relative">
            {contextHolder}

            {/* Loading Overlay - Full Screen với backdrop mờ */}
            {loading && !updateSiteData && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[300px]">
                        <RefreshCw className="h-12 w-12 text-blue-600 animate-spin" />
                        <h3 className="text-xl font-semibold text-gray-800">Đang tải dữ liệu...</h3>
                        <p className="text-sm text-gray-500 text-center">Vui lòng đợi trong khi chúng tôi tải dữ liệu mới nhất</p>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-blue-100 transition-all duration-300 hover:shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold text-blue-900 flex items-center">
                            <FileText className="w-6 h-6 mr-2 text-blue-600" />
                            Cập nhật Data {dataType === 1 ? "Việt Nam" : "Nước Ngoài"}
                        </h1>
                        {hasUnsavedChanges && (
                            <div className="mt-2 flex items-center text-sm text-orange-600">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                <span>Có {Object.keys(pendingChanges).length} thay đổi chưa lưu</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {/* <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center text-sm px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 font-medium border border-blue-200 shadow-sm"
                        >
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Làm mới
                        </button> */}
                        <button
                            onClick={handleSaveChanges}
                            disabled={!hasUnsavedChanges || saving}
                            className="flex text-sm items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed relative"
                        >
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Lưu thay đổi
                            {hasUnsavedChanges && (
                                <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {Object.keys(pendingChanges).length}
                                </span>
                            )}
                            {(refreshing || isStale) && (
                                <div className="absolute -top-1 -right-1 flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium z-10">
                                    <RefreshCw className={`w-2.5 h-2.5 ${refreshing ? "animate-spin" : ""}`} />
                                </div>
                            )}
                        </button>
                        <button
                            onClick={() => setIsAddModalVisible(true)}
                            className="flex text-sm items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm font-medium"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Thêm dòng
                        </button>
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                            <span className="text-sm text-blue-800 font-medium">Mệnh giá:</span>
                            <select
                                value={currencyMode}
                                onChange={(e) => setCurrencyMode(e.target.value as any)}
                                className="text-sm px-2 py-1 bg-white border border-blue-200 rounded-md text-blue-900"
                            >
                                <option value="USD">USD</option>
                                <option value="VND">VND</option>
                            </select>
                            {currencyMode === "VND" && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-blue-800">Tỷ giá</span>
                                    <input
                                        type="text"
                                        value={exchangeRate}
                                        onChange={(e) => setExchangeRate(e.target.value || "")}
                                        className="w-28 text-sm px-2 py-1 bg-white border border-blue-200 rounded-md text-blue-900"
                                    />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setIsCurrencyModalOpen(true)}
                            className="flex text-sm items-center px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all duration-200 shadow-sm font-medium"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Đổi mệnh giá
                        </button>
                    </div>
                </div>
                <div className="flex flex-col space-y-5">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex space-x-3">
                            {(userInfo?.role !== "NCC" || userInfo?.name === "Việt Nam" || !userInfo?.name) && (
                                <button
                                    onClick={() => setDataType(1)}
                                    className={`px-5 text-sm py-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium ${dataType === 1
                                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transform scale-105"
                                        : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                                        }`}
                                >
                                    <Database className="w-4 h-4" />
                                    Data Việt Nam
                                </button>
                            )}
                            {(userInfo?.role !== "NCC" || userInfo?.name === "Nước Ngoài" || !userInfo?.name) && (
                                <button
                                    onClick={() => setDataType(2)}
                                    className={`px-5 text-sm py-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium ${dataType === 2
                                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transform scale-105"
                                        : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                                        }`}
                                >
                                    <Globe className="w-4 h-4" />
                                    Data Nước Ngoài
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="relative mt-2">
                        <textarea
                            placeholder="Nhập vào site (cách nhau bằng dấu cách hoặc xuống dòng)"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full pl-4 pr-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white text-blue-900 shadow-sm transition-all duration-200"
                            rows={2}
                        />
                        {searchText && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                                <button
                                    onClick={clearSearch}
                                    className="p-1 rounded-full hover:bg-blue-100 text-blue-500 transition-colors duration-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                    <Filter className="w-3 h-3" />
                                    <span>{filteredData.length} kết quả</span>
                                </div>
                            </div>
                        )}
                        <button
                            className="absolute right-4 bottom-1 transform translate-y-6 text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                            onClick={() => setShowSearchHelp(!showSearchHelp)}
                        >
                            <Info className="w-3 h-3" />
                            Hướng dẫn tìm kiếm
                            <ChevronDown
                                className={`w-3 h-3 transition-transform duration-200 ${showSearchHelp ? "rotate-180" : ""}`}
                            />
                        </button>

                        {showSearchHelp && (
                            <div className="mt-8 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 border border-blue-200">
                                <p className="font-medium mb-1">Cách tìm kiếm:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Nhập tên site hoặc mã NCC cần tìm</li>
                                    <li>Có thể tìm nhiều site/mã NCC cùng lúc bằng cách ngăn cách bởi dấu cách hoặc xuống dòng</li>
                                    <li>Kết quả sẽ hiển thị các site hoặc mã NCC có chứa từ khóa tìm kiếm</li>
                                </ul>
                            </div>
                        )}
                        
                        {/* Missing Sites Section - moved up for better visibility */}
                        {searchText.trim() && missingSites.length > 0 && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    <h3 className="text-lg font-semibold text-red-800">Site không tồn tại</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {missingSites.map((site, index) => (
                                        <div
                                            key={index}
                                            className="px-3 py-2 bg-red-100 border border-red-300 rounded-lg text-red-800 font-medium text-sm shadow-sm hover:bg-red-200 transition-colors duration-200"
                                        >
                                            {site}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm text-red-600 mt-2">
                                    Các site này không tồn tại trong database hiện tại. Bạn có thể thêm chúng bằng cách sử dụng nút "Thêm dòng".
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs for Main Data and Pending Rows */}
            <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden transition-all duration-300 hover:shadow-lg">
                <div className="flex border-b border-blue-100">
                    <button
                        onClick={() => setActiveTab("data")}
                        className={`flex-1 py-3 px-6 font-semibold text-center transition-all duration-300 ${activeTab === "data"
                            ? "text-white bg-gradient-to-r from-blue-600 to-blue-700 border-b-4 border-blue-800 shadow-lg shadow-blue-500/25"
                            : "text-blue-600 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200 hover:border-blue-300"
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Database className="w-4 h-4" />
                            <span className="font-bold">Dữ Liệu Cập Nhật</span>
                        </div>
                    </button>
                    {pendingRows.length > 0 && (
                        <button
                            onClick={() => setActiveTab("pending")}
                            className={`flex-1 py-3 px-6 font-semibold text-center transition-all duration-300 relative ${activeTab === "pending"
                                ? "text-white bg-gradient-to-r from-green-500 to-green-600 border-b-4 border-green-700 shadow-lg shadow-green-500/25"
                                : "text-green-600 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border border-green-200 hover:border-green-300"
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" />
                                <span className="font-bold">Dữ Liệu Chờ Thêm</span>
                                <span
                                    className={`absolute top-2 right-2 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold ${activeTab === "pending" ? "bg-green-800" : "bg-green-500"
                                        }`}
                                >
                                    {pendingRows.length}
                                </span>
                            </div>
                        </button>
                    )}
                </div>

                {activeTab === "data" && (
                    <div className="p-0">
                        {(() => {
                            const currentData = dataType === 1 ? dataVN : dataNN
                            const isNCC = userInfo?.role === "NCC"
                            const hasSearch = Boolean(searchText.trim())
                            const displayData = hasSearch ? filteredData : isNCC ? currentData : []

                            return (
                                <div className="relative overflow-hidden border border-blue-200 shadow-sm">
                                    {displayData.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-center bg-white">
                                            <Search className="w-12 h-12 text-blue-300 mb-4" />
                                            {hasSearch ? (
                                                <>
                                                    <h3 className="text-lg font-medium text-blue-900 mb-2">Không tìm thấy kết quả</h3>
                                                    <p className="text-blue-600">Không có dữ liệu nào phù hợp với từ khóa tìm kiếm của bạn</p>
                                                </>
                                            ) : (
                                                <>
                                                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Không có dữ liệu để hiển thị</h3>
                                                    <p className="text-blue-600">{isNCC ? "Dữ liệu trống" : "Vui lòng nhập từ khóa tìm kiếm để xem dữ liệu"}</p>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <HotTable
                                            ref={dataTableRef}
                                            themeName="ht-theme-main"
                                            nestedHeaders={[RowHeader11, RowHeader1]}
                                            filters={true}
                                            width="auto"
                                            autoColumnSize={true}
                                            manualColumnResize={true}
                                            height="calc(100vh)"
                                            stretchH="all"
                                            manualRowMove={true}
                                            manualColumnMove={true}
                                            manualRowResize={true}
                                            className="custom-table"
                                            colWidths={getColWidthsForHeaders(RowHeader1)}
                                            hiddenColumns={userInfo?.role === "NCC" ? { columns: [0, 6, 19, 20, 21, 22, 24], indicators: true } : { columns: [0, 6, 24] }}
                                            licenseKey="non-commercial-and-evaluation"
                                            data={displayData}
                                            beforeChange={handleBeforeChange}
                                            afterChange={handleAfterChange}
                                            afterPaste={handleAfterPaste}
                                            afterRemoveRow={handleAfterRemoveRow}
                                            cells={function (
                                                this: Handsontable.CellProperties,
                                                row: number,
                                                col: number,
                                                prop: string | number,
                                            ) {
                                                const header = RowHeader1[col]
                                                const base = columnSettings[header] || {}
                                                const meta: any = { ...base }
                                                const baseRenderer = (base as any).renderer
                                                meta.renderer = withEllipsis(baseRenderer)
                                                return meta
                                            }}
                                            contextMenu={{
                                                items: {
                                                    delete_row: {
                                                        name: "Xóa dòng",
                                                        callback: (key: string, selection: any, clickEvent: any) => {
                                                            handleDeleteRow(selection[0].start.row)
                                                        },
                                                    },
                                                },
                                            }}
                                        />
                                    )}
                                </div>
                            )
                        })()}
                    </div>
                )}

                {activeTab === "pending" && pendingRows.length > 0 && (
                    <div className="p-0">
                        <div className="flex justify-between items-center p-1">
                            <h2 className="text-xl font-semibold text-blue-900"></h2>
                            <button
                                onClick={handleSavePendingRows}
                                disabled={
                                    !pendingRows.some((row) =>
                                        Object.values(row).some((value) => value && value.toString().trim() !== ""),
                                    )
                                }
                                className="flex items-center px-5 py-2 text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 shadow-sm font-medium"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Lưu hàng đã nhập
                            </button>
                        </div>
                        <div className="relative overflow-hidden border border-blue-200 shadow-sm">
                            <HotTable
                                themeName="ht-theme-main"
                                colHeaders={RowHeader2}
                                filters={true}
                                width="auto"
                                autoColumnSize={true}
                                manualColumnResize={true}
                                colWidths={getColWidthsForHeaders(RowHeader2)}
                                hiddenColumns={userInfo?.role === "NCC" ? { columns: [5, 21], indicators: true } : { columns: [5] }}
                                height="420px"
                                stretchH="all"
                                manualRowMove={true}
                                manualColumnMove={true}
                                manualRowResize={true}
                                className="custom-table"
                                licenseKey="non-commercial-and-evaluation"
                                data={pendingRows}
                                afterChange={handlePendingRowChange}
                                cells={function (this: Handsontable.CellProperties, row: number, col: number, prop: string | number) {
                                    const header = RowHeader2[col]
                                    const base = columnSettings[header] || {}
                                    const meta: any = { ...base }
                                    const baseRenderer = (base as any).renderer
                                    // In VND mode: display the USD result (value) rounded to nearest integer
                                    if (["GP ($)", "Text Footer ($)", "Text Home ($)", "Text Header ($)"].includes(header) && currencyMode === "VND") {
                                        meta.renderer = (instance: Handsontable, td: HTMLTableCellElement, r: number, c: number, p: string | number, value: any, cellProps: Handsontable.CellProperties) => {
                                            const display = (() => {
                                                const usd = Number(String(value).toString().replace(/[\,\s]/g, ""))
                                                if (isNaN(usd)) return value == null ? "" : String(value)
                                                const rounded = Math.round(usd)
                                                return String(rounded)
                                            })()
                                            Handsontable.renderers.TextRenderer(instance, td, r, c, p, display, cellProps)
                                            td.title = display
                                        }
                                    } else {
                                        meta.renderer = withEllipsis(baseRenderer)
                                    }
                                    return meta
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Add Rows Modal */}
            <Modal
                title={
                    <span className="text-lg font-semibold text-blue-900 flex items-center">
                        <Plus className="w-5 h-5 mr-2 text-blue-600" />
                        Thêm dòng mới
                    </span>
                }
                open={isAddModalVisible}
                onOk={handleAddRows}
                onCancel={() => setIsAddModalVisible(false)}
                okText="Thêm"
                cancelText="Hủy"
                okButtonProps={{
                    className: "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700",
                }}
                className="add-rows-modal"
            >
                <div className="flex flex-col gap-3 py-3">
                    <div className="text-blue-800 font-medium">Số dòng muốn thêm:</div>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={numberOfRows}
                        onChange={(e) => setNumberOfRows(Number(e.target.value) || 1)}
                        className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-blue-800 shadow-sm transition-all duration-200"
                    />
                    <div className="mt-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p className="flex items-center">
                            <Info className="w-4 h-4 mr-2 text-blue-500" />
                            Các dòng mới sẽ được thêm vào phần "Hàng Mới Chờ Thêm" để bạn có thể nhập dữ liệu trước khi lưu.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Currency Converter Modal */}
            <CurrencyConverterModal
                isVisible={isCurrencyModalOpen}
                onClose={() => setIsCurrencyModalOpen(false)}
            />
        </div>
    )
}
