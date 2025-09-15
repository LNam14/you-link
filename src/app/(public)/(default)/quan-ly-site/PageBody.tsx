"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import type React from "react"

import { HotTable } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import Handsontable from "handsontable"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import sheetApiRequest from "@/apiRequests/sheet"
import { Modal, message, Spin } from "antd"
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
    "NCC",
]

const RowHeader11: any = [
    { label: ``, colspan: 1 },
    { label: "INFO", colspan: 11 },
    { label: "Giá", colspan: 4 },
    { label: "Hoa hồng", colspan: 2 },
    { label: "Kê thêm", colspan: 2 },
    { label: "", colspan: 1 },
]

const RowHeader2 = [
    "Site",
    "Bóng",
    "Bet",
    "Chủ đề",
    "Nước",
    "Link out",
    "DR",
    "Keywords",
    "Traffic Tool",
    "Tình trạng",
    "GP ($)",
    "Text Footer ($)",
    "Text Home ($)",
    "Text Header ($)",
    "HH GP",
    "HH Text",
    "Kê GP",
    "Kê Text",
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
        if (["STT", "Bet", "Bóng", "DR", "HH GP", "HH Text", "Kê GP", "Kê Text", "NCC"].includes(header)) return 60
        if (["Link out", "Chủ đề", "Keywords", "Traffic Tool", "GP ($)", "Text Footer ($)", "Text Home ($)", "Text Header ($)"].includes(header)) return 90
        return 100
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
    const [loading, setLoading] = useState(false)
    const [dataVN, setDataVN] = useState<any[]>([])
    const [dataNN, setDataNN] = useState<any[]>([])
    const [searchText, setSearchText] = useState("")
    const [filteredData, setFilteredData] = useState<any[]>([])
    const [dataType, setDataType] = useState<1 | 2>(getInitialDataType()) // 1 for VN, 2 for NN
    const [isAddModalVisible, setIsAddModalVisible] = useState(false)
    const [numberOfRows, setNumberOfRows] = useState(1)
    const [pendingRows, setPendingRows] = useState<any[]>([])
    const [messageApi, contextHolder] = message.useMessage()
    const [initialLoading, setInitialLoading] = useState(true)
    const [showSearchHelp, setShowSearchHelp] = useState(false)
    const [activeTab, setActiveTab] = useState<"data" | "pending">("data")
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; row: number }>({
        visible: false,
        x: 0,
        y: 0,
        row: -1,
    })
    const [configError, setConfigError] = useState<string | null>(null)

    const userInfo = getUserInfo()

    // Stats for dashboard
    const stats = useMemo(() => {
        const currentData = dataType === 1 ? dataVN : dataNN
        return {
            total: currentData.length,
            active: currentData.filter((row) => row["Tình trạng"] === "Bình thường").length,
            inactive: currentData.filter((row) => row["Tình trạng"] === "Ngưng").length,
        }
    }, [dataType, dataVN, dataNN])

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setConfigError(null)
            console.log("[v0] Starting data fetch...")
            const data: any = await sheetApiRequest.getDataUpdateSite()
            console.log("[v0] Data fetch completed successfully")
            setDataVN(data.updateVN)
            setDataNN(data.updateNN)
        } catch (error: any) {
            console.error("[v0] Error fetching data:", error)
            if (
                error.message.includes("REPLACE_WITH_YOUR_ACTUAL_PRIVATE_KEY") ||
                error.message.includes("your-google-cloud-project-id")
            ) {
                setConfigError("Vui lòng cấu hình file key.json với thông tin Google Service Account thực tế")
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
        } finally {
            setLoading(false)
            setInitialLoading(false)
        }
    }, [messageApi])

    useEffect(() => {
        fetchData()
    }, [])

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
                const maNorm = normalizeExact(row.MaNCC)

                const siteMatch = normalizedDomainTerms.includes(siteNorm)
                const maNCCMatch = normalizedExactTerms.includes(maNorm)

                const hasData = Object.keys(row).some(
                    (key) => key !== "Site" && key !== "MaNCC" && row[key] && row[key].toString().trim() !== "",
                )
                return (siteMatch || maNCCMatch) && hasData
            })

            const getPriority = (row: any) => {
                const siteNorm = normalizeDomain(row.Site)
                const maNorm = normalizeExact(row.MaNCC)
                let p = Number.MAX_SAFE_INTEGER
                if (priorityMap.has(siteNorm)) p = Math.min(p, priorityMap.get(siteNorm) as number)
                const exactKey = `exact:${maNorm}`
                if (priorityMap.has(exactKey)) p = Math.min(p, priorityMap.get(exactKey) as number)
                return p
            }

            const sorted = filtered.slice().sort((a, b) => getPriority(a) - getPriority(b))
            setFilteredData(sorted)
        } else {
            setFilteredData([])
        }
    }, [searchText, dataVN, dataNN, dataType])

    const handleAfterChange = useCallback(
        (changes: Handsontable.CellChange[] | null, source: "edit" | "paste" | Handsontable.ChangeSource) => {
            if ((source === "edit" || source === "paste") && changes) {
                const updatesByRow = changes.reduce((acc: Record<number, any>, change) => {
                    const [row, prop, oldValue, newValue] = change
                    const columnName = typeof prop === "string" ? prop : RowHeader1[prop as number]

                    if (!columnName || oldValue === newValue) return acc

                    const dataToUse = dataType === 1 ? dataVN : dataNN
                    const currentRow = searchText.trim() ? filteredData[row] : dataToUse[row]

                    const actualRowIndex = currentRow?.rowIndex || row + 2
                    const sheetName = currentRow?.sheetName

                    if (!acc[row]) {
                        acc[row] = {
                            rowIndex: actualRowIndex,
                            sheetName,
                            changes: {},
                        }
                    }

                    acc[row].changes[columnName] = newValue === null ? "" : newValue
                    return acc
                }, {})

                const updates = Object.values(updatesByRow)

                if (updates.length > 0) {
                    console.log("[v0] Sending updates:", updates)
                    sheetApiRequest
                        .updateData(updates, dataType)
                        .catch((error) => {
                            console.error("[v0] Update error:", error)
                            if (error.message.includes("timeout") || error.message.includes("Request timeout")) {
                                messageApi.error({
                                    content: "Cập nhật timeout (90s), vui lòng thử lại",
                                    icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
                                    duration: 8,
                                })
                            } else {
                                messageApi.error({
                                    content: `Lỗi cập nhật: ${error.message}`,
                                    icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
                                })
                            }
                        })
                }
            }
        },
        [dataType, dataVN, dataNN, filteredData, searchText, messageApi],
    )

    const handleAfterPaste = useCallback(
        (data: any[][], coords: any[]) => {
            const { startRow: initialStartRow, startCol } = coords[0]

            const updates = data
                .map((rowData, index) => {
                    const currentRowIndex = initialStartRow + index
                    const dataToUse = dataType === 1 ? dataVN : dataNN
                    const currentRow = searchText.trim() ? filteredData[currentRowIndex] : dataToUse[currentRowIndex]

                    if (!currentRow) return null

                    const actualRowIndex = currentRow.rowIndex
                    const sheetName = currentRow.sheetName
                    const changes = rowData.reduce((acc: Record<string, any>, value, colIndex) => {
                        const columnName = RowHeader1[startCol + colIndex]
                        if (columnName) {
                            acc[columnName] = value === null ? "" : value
                        }
                        return acc
                    }, {})

                    if (Object.keys(changes).length > 0) {
                        return {
                            rowIndex: actualRowIndex,
                            sheetName,
                            changes,
                        }
                    }
                    return null
                })
                .filter(Boolean)

            if (updates.length > 0) {
                sheetApiRequest.updateData(updates, dataType)
            }
        },
        [dataType, dataVN, dataNN, filteredData, searchText, messageApi],
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
                    Site: "",
                    Bóng: "",
                    Bet: "",
                    "Chủ đề": "",
                    Nước: "",
                    "Link out": "",
                    DR: "",
                    Keywords: "",
                    "Traffic Tool": "",
                    "Tình trạng": "Bình thường",
                    "GP ($)": "",
                    "Text Footer ($)": "",
                    "Text Home ($)": "",
                    "Text Header ($)": "",
                    "HH GP": "",
                    "HH Text": "",
                    "Kê GP": "",
                    "Kê Text": "",
                }

                if (userInfo?.role !== "NCC") {
                    return {
                        ...baseRow,
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

                    if (columnName) {
                        newPendingRows[row] = {
                            ...newPendingRows[row],
                            [columnName]: newValue === null ? "" : newValue,
                        }
                    }
                })

                setPendingRows(newPendingRows)
            }
        },
        [pendingRows, dataType],
    )

    const handleSavePendingRows = useCallback(async () => {
        try {
            const rowsToSave = pendingRows.filter((row) =>
                Object.entries(row).some(([key, value]) => key !== "Tình trạng" && value && value.toString().trim() !== ""),
            )

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
                        await sheetApiRequest.appendRows(rowsToSave, dataType)
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
                    content: "Không có dữ liệu để lưu",
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

    if (initialLoading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-blue-100 animate-pulse">
                    <Spin size="large" />
                    <p className="mt-6 text-blue-800 font-medium text-lg">Đang tải dữ liệu...</p>
                    <p className="text-blue-600 text-sm mt-2">Vui lòng đợi trong giây lát</p>
                </div>
            </div>
        )
    }

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
        <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col p-4 space-y-4">
            {contextHolder}

            {/* Header Section */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-blue-100 transition-all duration-300 hover:shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h1 className="text-2xl font-bold text-blue-900 flex items-center">
                        <FileText className="w-6 h-6 mr-2 text-blue-600" />
                        Cập nhật Data {dataType === 1 ? "Việt Nam" : "Nước Ngoài"}
                    </h1>

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
                            onClick={() => setIsAddModalVisible(true)}
                            className="flex text-sm items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm font-medium"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Thêm dòng
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
                                            hiddenColumns={userInfo?.role === "NCC" ? { columns: [5, 18, 19, 20, 21], indicators: true } : { columns: [5, 21] }}
                                            licenseKey="non-commercial-and-evaluation"
                                            data={displayData}
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
                                hiddenColumns={userInfo?.role === "NCC" ? { columns: [5, 20], indicators: true } : { columns: [5] }}
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
                                    meta.renderer = withEllipsis(baseRenderer)
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
        </div>
    )
}
