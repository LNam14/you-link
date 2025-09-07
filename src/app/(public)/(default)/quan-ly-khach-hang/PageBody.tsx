"use client"
import { useState, useRef, useEffect } from "react"
import { HotTable } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import "./custom-table.css"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import { Toaster, toast } from "sonner"
import { useFirebaseData } from "@/firebase/hooks/useFirebaseData"
import { Search, Plus, Trash2, RefreshCw, Users, UserPlus, Check, X, Maximize, Minimize } from "lucide-react"
import { Modal } from "antd"
import getUserInfo from "@/components/userInfo"

registerAllModules()

export default function PageBody() {
    const {
        data,
        loading,
        searchTerm,
        setSearchTerm,
        saveRow,
        saveMultipleRows,
        addNewRow,
        addMultipleRows,
        deleteRow,
        deleteMultipleRows,
    } = useFirebaseData()

    const [selectedRows, setSelectedRows] = useState<number[]>([])
    const [showBulkAddModal, setShowBulkAddModal] = useState(false)
    const [bulkAddCount, setBulkAddCount] = useState(5)
    const hotRef = useRef<any>(null)
    const [tableReady, setTableReady] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const userInfo = getUserInfo()
    const isAdmin = userInfo?.role === "Admin"
    const visibleData = isAdmin
        ? data
        : data.filter((row) => {
            const raw = (row?.[23] || "").toString()
            const viewers = raw
                .split(",")
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0)
            return viewers.includes(userInfo?.username || "")
        })
    // Modal state for multi-select Người Xem (Admin only)
    const [viewerModalOpen, setViewerModalOpen] = useState(false)
    const [viewerModalRow, setViewerModalRow] = useState<number | null>(null)
    const [selectedViewers, setSelectedViewers] = useState<string[]>([])

    const toggleFullscreen = async () => {
        if (!containerRef.current) return

        try {
            if (!isFullscreen) {
                // Enter fullscreen
                if (containerRef.current.requestFullscreen) {
                    await containerRef.current.requestFullscreen()
                } else if ((containerRef.current as any).webkitRequestFullscreen) {
                    await (containerRef.current as any).webkitRequestFullscreen()
                } else if ((containerRef.current as any).msRequestFullscreen) {
                    await (containerRef.current as any).msRequestFullscreen()
                }
            } else {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    await document.exitFullscreen()
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen()
                } else if ((document as any).msExitFullscreen) {
                    await (document as any).msExitFullscreen()
                }
            }
        } catch (error) {
            console.error("Fullscreen error:", error)
            toast.error("Không thể chuyển đổi chế độ toàn màn hình")
        }
    }

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).msFullscreenElement
            )
            setIsFullscreen(isCurrentlyFullscreen)
        }

        document.addEventListener("fullscreenchange", handleFullscreenChange)
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
        document.addEventListener("msfullscreenchange", handleFullscreenChange)

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange)
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
            document.removeEventListener("msfullscreenchange", handleFullscreenChange)
        }
    }, [])

    const RowHeader2 = [
        "Mã Mới",
        "Mã Cũ",
        "Phân Loại",
        "Phiên Bản",
        "Order",
        "CTY",
        "Team",
        "Chức Vụ",
        "Tên",
        "ID Tele",
        "Liên hệ 2",
        "Link Nhóm",
        "ID Nhóm",
        "Info",
        "Ng Chăm 1",
        "Ng Chăm 2",
        "Tab Đơn",
        "Công Nợ",
        "Tín Dụng",
        "Tình Trạng",
        "Ngày Check",
        "Đếm Ngày",
        "Note KT",
        "Người Xem",
    ]

    const dropdownOptions = {
        2: ["====", "Bình thường", "Mua nhiều", "VIP"], // Phân Loại
        3: ["====", "PB1", "PB2", "PB3", "PB4"], // Phiên Bản
        4: ["====", "Đang MH", "2 Tuần KM", "4 Tuần KM", "Lâu K MH", "Mình nghỉ chơi", "Họ nghỉ chơi", "SEO OFF"], // Order
        19: ["====", "Bình thường", "Rủi ro", "Rủi ro cao", "Scam"], // Tình Trạng
    }
    const viewerOptions = Array.from({ length: 30 }, (_, i) => `BH${i + 1}`) // Người Xem options for Admin modal

    // Parse date from DD/MM/YYYY or ISO
    const parseDate = (dateString: string) => {
        if (!dateString) return null as any
        if (dateString.includes("/")) {
            const [dd, mm, yyyy] = dateString.split("/")
            const day = Number(dd)
            const month = Number(mm) - 1
            const year = Number(yyyy)
            const d = new Date(year, month, day)
            return isNaN(d.getTime()) ? null : d
        }
        const d = new Date(dateString)
        return isNaN(d.getTime()) ? null : d
    }

    // Format date to DD/MM/YYYY
    const formatDate = (dateString: string) => {
        if (!dateString) return ""
        const date = parseDate(dateString)
        if (!date) return ""

        const day = date.getDate().toString().padStart(2, "0")
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear()

        return `${day}/${month}/${year}`
    }

    // Format date to DD/MM for display
    const formatDateShort = (dateString: string) => {
        if (!dateString) return ""
        const date = parseDate(dateString)
        if (!date) return ""

        const day = date.getDate().toString().padStart(2, "0")
        const month = (date.getMonth() + 1).toString().padStart(2, "0")

        return `${day}/${month}`
    }

    // Get current date in DD/MM/YYYY format
    const getCurrentDate = () => {
        const today = new Date()
        const day = today.getDate().toString().padStart(2, "0")
        const month = (today.getMonth() + 1).toString().padStart(2, "0")
        const year = today.getFullYear()
        return `${day}/${month}/${year}`
    }

    const getOptionColors = (columnIndex: number, value: string) => {
        const colorMaps: { [key: number]: { [key: string]: { bg: string; text: string } } } = {
            2: {
                // Phân Loại
                "Bình thường": { bg: "#e0f2fe", text: "#0369a1" }, // blue light/dark
                "Mua nhiều": { bg: "#dcfce7", text: "#166534" }, // green light/dark
                VIP: { bg: "#fef3c7", text: "#d97706" }, // yellow light/dark
            },
            3: {
                // Phiên Bản
                PB1: { bg: "#f3e8ff", text: "#7c3aed" }, // purple light/dark
                PB2: { bg: "#fce7f3", text: "#be185d" }, // pink light/dark
                PB3: { bg: "#ecfdf5", text: "#059669" }, // emerald light/dark
                PB4: { bg: "#fef2f2", text: "#dc2626" }, // red light/dark
            },
            4: {
                // Order
                "Đang MH": { bg: "#dcfce7", text: "#166534" }, // green
                "2 Tuần KM": { bg: "#fef3c7", text: "#d97706" }, // yellow
                "4 Tuần KM": { bg: "#fed7aa", text: "#ea580c" }, // orange
                "Lâu K MH": { bg: "#fecaca", text: "#dc2626" }, // red
                "Mình nghỉ chơi": { bg: "#e5e7eb", text: "#374151" }, // gray
                "Họ nghỉ chơi": { bg: "#f3f4f6", text: "#6b7280" }, // light gray
                "SEO OFF": { bg: "#fee2e2", text: "#991b1b" }, // red variant
            },
            19: {
                // Tình Trạng
                "Bình thường": { bg: "#dcfce7", text: "#166534" }, // green
                "Rủi ro": { bg: "#fef3c7", text: "#d97706" }, // yellow
                "Rủi ro cao": { bg: "#fed7aa", text: "#ea580c" }, // orange
                Scam: { bg: "#fecaca", text: "#dc2626" }, // red
            },
        }

        return colorMaps[columnIndex]?.[value] || { bg: "#f9fafb", text: "#374151" }
    }

    const calculateDaysDifference = (checkDate: string) => {
        if (!checkDate) return ""
        const date = parseDate(checkDate)
        if (!date) return ""
        const today = new Date()
        const diffTime = today.getTime() - date.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        return diffDays.toString()
    }

    const getDebtCreditStyling = (debt: string, credit: string) => {
        const debtNum = Number.parseFloat(debt) || 0
        const creditNum = Number.parseFloat(credit) || 0

        if (debtNum > creditNum) {
            return { bg: "#fecaca", text: "#dc2626" } // red background/text
        } else {
            return { bg: "#dcfce7", text: "#166534" } // green background/text
        }
    }

    const getColumnConfig = () => {
        return RowHeader2.map((header, index) => {
            const config: any = {
                data: index,
                title: header,
            }

            // Set dropdown for specific columns with strict validation
            if (dropdownOptions[index as keyof typeof dropdownOptions] && index !== 23) {
                config.type = "dropdown"
                config.source = dropdownOptions[index as keyof typeof dropdownOptions]
                config.strict = true
                config.allowInvalid = false
                config.allowEmpty = false
                config.validator = (value: any, callback: any) => {
                    if (value === null || value === undefined || value === "") {
                        callback(false)
                        return false
                    }
                    if (dropdownOptions[index as keyof typeof dropdownOptions]?.includes(value)) {
                        callback(true)
                        return true
                    }
                    callback(false)
                    return false
                }

            }

            // // Renderer for Người Xem to show multiple badges (comma-separated values)
            // if (index === 23) {
            //     config.renderer = (instance: any, td: any, row: any, col: any, prop: any, value: any) => {
            //         const text = (value || "").toString()
            //         const items = text
            //             .split(",")
            //             .map((s: string) => s.trim())
            //             .filter((s: string) => s.length > 0)

            //         if (items.length === 0) {
            //             td.innerHTML = "===="
            //             td.style.color = "#9ca3af"
            //             td.style.fontStyle = "italic"
            //             td.style.textAlign = "center"
            //             return td
            //         }

            //         td.innerHTML = items
            //             .map(
            //                 (v: string) =>
            //                     `<span style="display:inline-block;margin:2px;padding:2px 6px;border-radius:9999px;background:#eef2ff;color:#3730a3;font-size:12px;">${v}</span>`,
            //             )
            //             .join("")
            //         td.style.textAlign = "left"
            //         td.style.fontStyle = "normal"
            //         td.style.color = "#111827"
            //         return td
            //     }
            // }

            // Date interaction for Ngày Check column (click-only to set today)
            if (index === 20) {
                // Disable editor and typing/picker
                config.editor = false
                config.readOnly = true
                config.renderer = (instance: any, td: any, row: any, col: any, prop: any, value: any, cellProperties: any) => {
                    const date = value || ""
                    const formattedDate = formatDateShort(date)

                    td.style.cursor = "pointer"
                    td.onclick = () => {
                        const today = getCurrentDate()
                        instance.setDataAtCell(row, col, today)
                        // Also trigger render for Đếm Ngày
                        setTimeout(() => {
                            // @ts-ignore
                            instance.render()
                        }, 0)
                    }

                    if (date) {
                        td.innerHTML = `
                            <div style="display: flex; align-items: center; justify-content: center; gap: 4px; color: #1d4ed8; font-weight: 600;">
                                <span style="font-size: 16px;">📅</span>
                                <span>${formattedDate}</span>
                            </div>
                        `
                    } else {
                        td.innerHTML = `
                            <div style="display: flex; align-items: center; justify-content: center; gap: 4px; color: #9ca3af; font-weight: 500;">
                                <span style="font-size: 16px;">📅</span>
                                <span>${formatDateShort(getCurrentDate())}</span>
                            </div>
                        `
                    }

                    return td
                }
            }

            if (index === 21) {
                config.readOnly = true
                config.renderer = (instance: any, td: any, row: any, col: any, prop: any, value: any, cellProperties: any) => {
                    const checkDate = instance.getDataAtCell(row, 20) // Get Ngày Check value
                    const daysDiff = calculateDaysDifference(checkDate)
                    td.innerHTML = daysDiff || "0"
                    td.style.backgroundColor = "#f3f4f6"
                    td.style.color = "#6b7280"
                    td.style.textAlign = "center"
                    td.style.fontWeight = "500"
                    return td
                }
            }

            if (index === 16) {
                config.renderer = (instance: any, td: any, row: any, col: any, prop: any, value: any, cellProperties: any) => {
                    const url = value || ""
                    // Force no-wrap and ellipsis
                    td.style.whiteSpace = "nowrap"
                    td.style.overflow = "hidden"
                    td.style.textOverflow = "ellipsis"
                    td.style.maxWidth = "100%"

                    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
                        const safeUrl = url.replace(/"/g, "&quot;")
                        td.innerHTML = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; cursor: pointer; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeUrl}</a>`
                    } else {
                        td.innerHTML = url
                    }

                    // Add tooltip for long URLs
                    if (url.length > 15) {
                        td.title = url
                    }
                    return td
                }
            }

            if (index === 17) {
                config.renderer = (instance: any, td: any, row: any, col: any, prop: any, value: any, cellProperties: any) => {
                    const debt = value || "0"
                    const credit = instance.getDataAtCell(row, 18) || "0" // Get Tín Dụng value
                    const styling = getDebtCreditStyling(debt, credit)

                    td.innerHTML = debt
                    td.style.backgroundColor = styling.bg
                    td.style.color = styling.text
                    td.style.fontWeight = "500"
                    td.style.borderRadius = "4px"
                    td.style.padding = "4px 8px"
                    td.style.textAlign = "center"

                    return td
                }
            }

            if (index === 18) {
                config.renderer = (instance: any, td: any, row: any, col: any, prop: any, value: any, cellProperties: any) => {
                    const credit = value || "0"
                    const debt = instance.getDataAtCell(row, 17) || "0" // Get Công Nợ value
                    const styling = getDebtCreditStyling(debt, credit)

                    td.innerHTML = credit
                    td.style.backgroundColor = styling.bg
                    td.style.color = styling.text
                    td.style.fontWeight = "500"
                    td.style.borderRadius = "4px"
                    td.style.padding = "4px 8px"
                    td.style.textAlign = "center"

                    return td
                }
            }

            // Special styling for "Mã Mới" column
            if (index === 0) {
                config.renderer = (instance: any, td: any, row: any, col: any, prop: any, value: any, cellProperties: any) => {
                    td.innerHTML = value || ""
                    td.style.color = "#dc2626" // red-600
                    td.style.fontWeight = "bold"
                    return td
                }
            }

            if (index !== 0 && index !== 16 && index !== 17 && index !== 18 && index !== 20 && index !== 21) {
                config.renderer = (instance: any, td: any, row: any, col: any, prop: any, value: any, cellProperties: any) => {
                    const text = value || ""

                    // Show "====" for empty dropdown values
                    if (dropdownOptions[index as keyof typeof dropdownOptions] && !text) {
                        td.innerHTML = "===="
                        td.style.color = "#9ca3af"
                        td.style.fontStyle = "italic"
                        td.style.textAlign = "center"
                    } else {
                        td.innerHTML = text
                        td.style.color = "#374151"
                        td.style.fontStyle = "normal"
                    }

                    // Add tooltip for long text
                    if (text.length > 15) {
                        td.title = text
                        td.style.textOverflow = "ellipsis"
                        td.style.overflow = "hidden"
                        td.style.whiteSpace = "nowrap"
                    }

                    // Apply colors for dropdown columns
                    if (dropdownOptions[index as keyof typeof dropdownOptions] && text) {
                        const colors = getOptionColors(index, text)
                        td.style.backgroundColor = colors.bg
                        td.style.color = colors.text
                        td.style.fontWeight = "500"
                        td.style.borderRadius = "4px"
                        td.style.padding = "4px 8px"
                        td.style.textAlign = "center"
                        td.style.userSelect = "none"
                        td.style.cursor = "pointer"
                    }

                    return td
                }
            }

            return config
        })
    }

    const handleAfterChange = (changes: any) => {
        if (changes && changes.length > 0) {
            const validChanges = changes.filter(([row, col, oldVal, newVal]: any) => oldVal !== newVal && newVal !== null)

            if (validChanges.length > 0) {
                // Check if Ngày Check column was changed and update Đếm Ngày
                validChanges.forEach(([row, col, oldVal, newVal]: any) => {
                    if (col === 20) {
                        // Ngày Check column
                        // Force re-render of Đếm Ngày column
                        setTimeout(() => {
                            const hotInstance = document.querySelector(".handsontable")
                            if (hotInstance) {
                                // @ts-ignore
                                hotInstance.hotInstance?.render()
                            }
                        }, 100)
                    }
                })

                saveMultipleRows(validChanges)
            }
        }
    }

    const handleAfterPaste = (data: any, coords: any) => {
        if (data && data.length > 0) {
            const changes: any[] = []
            for (let i = 0; i < data.length; i++) {
                for (let j = 0; j < data[i].length; j++) {
                    const row = coords[0].startRow + i
                    const col = coords[0].startCol + j
                    // Block pasting into "Ngày Check" column (index 20)
                    if (col === 20) continue
                    changes.push([row, col, null, data[i][j]])
                }
            }
            // Single batch update for all pasted data
            if (changes.length > 0) {
                saveMultipleRows(changes)
            }
        }
    }

    const handleAfterSelection = (row: number, column: number, row2: number, column2: number) => {
        const selected = []
        for (let i = Math.min(row, row2); i <= Math.max(row, row2); i++) {
            selected.push(i)
        }
        setSelectedRows(selected)
    }

    const handleDeleteSelected = async () => {
        if (selectedRows.length === 0) return

        Modal.confirm({
            title: "Xác nhận xóa",
            content: `Bạn có chắc muốn xóa ${selectedRows.length} hàng đã chọn?`,
            okText: "Xóa",
            cancelText: "Hủy",
            okType: "danger",
            onOk: async () => {
                // Sort from highest to lowest index to avoid shifting issues
                const sortedRows = [...selectedRows].sort((a, b) => b - a)

                // Use bulk delete function with single toast
                await deleteMultipleRows(sortedRows)
                setSelectedRows([])
                toast.success("Đã xóa các hàng đã chọn")
            },
        })
    }

    const handleBulkAdd = async () => {
        const today = new Date()
        const formattedDate = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`

        const newRowsData = Array(bulkAddCount)
            .fill(null)
            .map(() => {
                const newRow = Array(24).fill("")
                // Set Ngày Check to current date
                newRow[20] = formattedDate
                // Set empty dropdown values to "===="
                newRow[2] = "====" // Phân Loại
                newRow[3] = "====" // Phiên Bản
                newRow[4] = "====" // Order
                newRow[19] = "====" // Tình Trạng
                // Set Người Xem for non-admin
                if (!isAdmin) {
                    newRow[23] = userInfo?.username || ""
                }
                return newRow
            })

        await addMultipleRows(newRowsData)
        setShowBulkAddModal(false)
        toast.success(`Đã thêm ${bulkAddCount} hàng mới`)
    }

    const handleSingleAdd = async () => {
        const today = new Date()
        const formattedDate = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`

        const newRowData = Array(24).fill("")
        // Set Ngày Check to current date
        newRowData[20] = formattedDate
        // Set empty dropdown values to "===="
        newRowData[2] = "====" // Phân Loại
        newRowData[3] = "====" // Phiên Bản
        newRowData[4] = "====" // Order
        newRowData[19] = "====" // Tình Trạng
        // Set Người Xem for non-admin
        if (!isAdmin) {
            newRowData[23] = userInfo?.username || ""
        }

        await addNewRow(newRowData)
        toast.success("Đã thêm 1 hàng mới")
    }

    useEffect(() => {
        if (!loading && data.length > 0) {
            // Small delay to ensure table is fully rendered
            const timer = setTimeout(() => {
                setTableReady(true)
                // Add initialized class to enable smooth transitions
                const tableElement = document.querySelector(".handsontable")
                if (tableElement) {
                    tableElement.classList.add("initialized")
                }
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [loading, data])

    if (loading) {
        return (
            <div className="min-h-screen py-6 px-4 flex items-center justify-center">
                <div className="flex items-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-foreground">Đang tải dữ liệu...</span>
                </div>
            </div>
        )
    }

    // Custom column widths: column 0 = 10, column 2 = 20, others = 120
    const colWidthsConfig = Array(24).fill(90)
    colWidthsConfig[0] = 70
    colWidthsConfig[1] = 70

    return (
        <div
            ref={containerRef}
            className={`min-h-screen relative bg-background transition-all duration-300 ${isFullscreen ? "fixed inset-0 z-50 p-0 m-0 w-screen h-screen" : ""
                }`}
        >
            <Toaster position="top-right" expand={true} richColors />
            <div className={`w-full ${isFullscreen ? "max-w-none mx-0 h-full" : "max-w-7xl mx-auto"} relative z-0`}>
                <div className={`bg-white ${isFullscreen ? "" : "rounded-t-xl"} shadow-xl overflow-hidden border border-blue-100`}>
                    <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Quản Lý Khách Hàng</h2>
                                    <p className="text-white text-sm">Tổng: {visibleData.length} khách hàng</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-4 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm khách hàng..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-1 w-56 bg-background text-sm border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all duration-200 text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={toggleFullscreen}
                                        className="group flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 text-sm shadow-sm"
                                        title={isFullscreen ? "Thoát toàn màn hình" : "Chế độ toàn màn hình"}
                                    >
                                        {isFullscreen ? (
                                            <Minimize className="h-3.5 w-3.5 text-white transition-transform duration-200" />
                                        ) : (
                                            <Maximize className="h-3.5 w-3.5 text-white transition-transform duration-200" />
                                        )}
                                        <span className="leading-none text-white">{isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}</span>
                                    </button>

                                    <button
                                        onClick={handleSingleAdd}
                                        className="group flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-all duration-200 text-sm shadow-sm"
                                    >
                                        <Plus className="h-3.5 w-3.5 group-hover:rotate-90 text-white transition-transform duration-200" />
                                        <span className="leading-none text-white">Thêm 1</span>
                                    </button>

                                    <button
                                        onClick={() => setShowBulkAddModal(true)}
                                        className="group flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-all duration-200 text-sm"
                                    >
                                        <UserPlus className="h-3.5 w-3.5 group-hover:scale-110 transition-transform duration-200 text-white" />
                                        <span className="leading-none text-white">Thêm nhiều</span>
                                    </button>

                                    <button
                                        onClick={handleDeleteSelected}
                                        disabled={selectedRows.length === 0}
                                        className="group flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed rounded-md transition-colors duration-200 text-sm"
                                    >
                                        <Trash2
                                            className={`h-3.5 w-3.5 group-hover:scale-110 transition-transform duration-200  ${selectedRows.length === 0 ? "text-gray-500" : "text-white"}`}
                                        />
                                        <span className={`leading-none ${selectedRows.length === 0 ? "text-gray-500" : "text-white"} `}>
                                            Xóa {selectedRows.length > 0 && `(${selectedRows.length})`}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className={tableReady ? "table-ready" : "table-loading"}>
                            <HotTable
                                ref={hotRef}
                                themeName="ht-theme-main"
                                columns={getColumnConfig()}
                                data={visibleData.map((row) => row.slice(0, 24))}
                                width="100%"
                                autoColumnSize={false}
                                manualColumnResize={true}
                                height={isFullscreen ? "calc(100vh - 130px)" : "calc(100vh - 280px)"}
                                stretchH="all"
                                className="custom-table"
                                licenseKey="non-commercial-and-evaluation"
                                colWidths={colWidthsConfig}
                                wordWrap={false}
                                afterChange={handleAfterChange}
                                afterPaste={handleAfterPaste}
                                afterSelection={handleAfterSelection}
                                beforeOnCellMouseDown={(event: any, coords: any) => {
                                    if (!coords) return
                                    const { row, col } = coords
                                    if (row >= 0 && col === 20) {
                                        const today = getCurrentDate()
                                        hotRef.current?.hotInstance?.setDataAtCell(row, col, today)
                                        event.stopPropagation()
                                    }
                                    // Open multi-select modal for Người Xem (Admin only)
                                    if (row >= 0 && col === 23) {
                                        const current = (hotRef.current?.hotInstance?.getDataAtCell(row, col) || "") as string
                                        const items = current
                                            .split(",")
                                            .map((s) => s.trim())
                                            .filter((s) => s.length > 0)
                                        setSelectedViewers(items)
                                        setViewerModalRow(row)
                                        setViewerModalOpen(true)
                                        event.stopPropagation()
                                        event.preventDefault()
                                        return
                                    }
                                }}
                                contextMenu={true}
                                columnSorting={true}
                                filters={true}
                                undo={true}
                                comments={true}
                                afterInit={() => {
                                    setTimeout(() => setTableReady(true), 50)
                                }}
                            />
                        </div>
                    </div>

                    <div className="bg-muted/50 px-6 py-3 border-t border-border">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-4">
                                <span className="font-medium">Tổng: {visibleData.length} khách hàng</span>
                                {selectedRows.length > 0 && (
                                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-medium">
                                        Đã chọn: {selectedRows.length}
                                    </span>
                                )}
                            </div>
                            {searchTerm && (
                                <span className="text-xs">
                                    Hiển thị kết quả cho: <span className="font-medium">"{searchTerm}"</span>
                                </span>
                            )}
                            <span className="text-xs">Chọn hàng để xóa • Nhấp đúp để chỉnh sửa</span>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                title={
                    <div className="flex items-center gap-2 text-lg font-semibold">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Thêm nhiều hàng
                    </div>
                }
                open={showBulkAddModal}
                onOk={handleBulkAdd}
                onCancel={() => setShowBulkAddModal(false)}
                okText="Thêm hàng"
                cancelText="Hủy bỏ"
                getContainer={() => containerRef.current || document.body}
                zIndex={10000}
                okButtonProps={{
                    className: "bg-primary hover:bg-primary/90 border-primary text-primary-foreground",
                }}
                cancelButtonProps={{
                    className: "border-border text-foreground hover:border-primary hover:text-primary",
                }}
            >
                <div className="py-4">
                    <label className="block text-sm font-medium mb-3 text-foreground">Số lượng hàng muốn thêm:</label>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={bulkAddCount}
                        onChange={(e) => setBulkAddCount(Number.parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all duration-200 text-foreground"
                        placeholder="Nhập số lượng..."
                    />
                    <p className="text-xs text-muted-foreground mt-2">Tối đa 100 hàng có thể được thêm cùng lúc</p>
                </div>
            </Modal>

            {/* Modal chọn nhiều cho cột Người Xem (Admin only) */}
            <Modal
                title={
                    <div className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        Chọn Người Xem
                    </div>
                }
                open={viewerModalOpen}
                onOk={() => {
                    if (viewerModalRow !== null) {
                        const value = selectedViewers.join(", ")
                        hotRef.current?.hotInstance?.setDataAtCell(viewerModalRow, 23, value)
                    }
                    setViewerModalOpen(false)
                    setViewerModalRow(null)
                }}
                onCancel={() => {
                    setViewerModalOpen(false)
                    setViewerModalRow(null)
                }}
                okText={
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Lưu
                    </div>
                }
                cancelText={
                    <div className="flex items-center gap-2">
                        <X className="w-4 h-4" />
                        Hủy
                    </div>
                }
                className="viewer-modal"
                width={800}
                getContainer={() => containerRef.current || document.body}
                zIndex={10000}
            >
                <div className="space-y-4">
                    {/* Search bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm người xem..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            onChange={(e) => {
                                // Add search functionality if needed
                            }}
                        />
                    </div>

                    {/* Selected count */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-sm font-medium text-blue-800">Đã chọn: {selectedViewers.length} người</span>
                        {selectedViewers.length > 0 && (
                            <button
                                onClick={() => setSelectedViewers([])}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            >
                                Bỏ chọn tất cả
                            </button>
                        )}
                    </div>

                    {/* Viewer options grid */}
                    <div style={{ scrollbarWidth: "none" }} className="grid grid-cols-5 gap-3 max-h-90 overflow-auto p-1">
                        {viewerOptions.map((opt: string) => {
                            const isSelected = selectedViewers.includes(opt)
                            return (
                                <label
                                    key={opt}
                                    className={`
                                               relative flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                                               ${isSelected
                                            ? "border-blue-500 bg-blue-50 shadow-sm"
                                            : "border-gray-200 bg-white hover:border-gray-300"
                                        }
                                           `}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedViewers((prev) => Array.from(new Set([...prev, opt])))
                                            } else {
                                                setSelectedViewers((prev) => prev.filter((v) => v !== opt))
                                            }
                                        }}
                                        className="sr-only"
                                    />

                                    {/* Custom checkbox design */}
                                    <div
                                        className={`
                                               absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                               ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"}
                                           `}
                                    >
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>

                                    {/* User avatar   and name */}
                                    <div className="flex flex-col items-center gap-2">
                                        <span
                                            className={`
                                                   text-sm font-medium text-center
                                                   ${isSelected ? "text-blue-700" : "text-gray-700"}
                                               `}
                                        >
                                            {opt}
                                        </span>
                                    </div>
                                </label>
                            )
                        })}
                    </div>
                </div>
            </Modal>
        </div>
    )
}
