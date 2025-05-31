"use client"

import { useState, useRef, useEffect } from "react"
import { HotTable } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import "./custom-table.css"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import Handsontable from "handsontable"
import { toast, Toaster } from "sonner"
import { RefreshCw, Search, Plus, Copy } from "lucide-react"

registerAllModules()

type NestedColumnHeader = {
    label: string
    colspan: number
}

type TooltipData = {
    data: string[]
    position: {
        x: number
        y: number
    }
    sourceElement: HTMLElement | null
}

export default function AccountTracker() {
    const [tableData, setTableData] = useState<any[]>([
        [
            "S28", // Mã Mới
            "11", // Phân Loại
            "22", // Phiên Bản
            "L304, P32", // Mã Cũ
            "44", // Cty
            ["Roseanne", "Tường Vi", "Tường Vi", "Sarah D", "Kem - OS", "Emily Tan"], // Tên - array
            ["@12341234", "@KEM668899", "@fty4us", "@telegram_sarah", "@telegram_kem", "#1884364594"], // Telegram - array
            "6", // Link Nhóm
            "7", // ID nhóm
            "8", // Nhóm
            "An Nhiên", // Ng Chăm
            "https://docs.google.com/spreadsheets/d/1eUwnoVUmuYE6OFQ_u5TJhkWBwh14kPNNXbWafw55Djc/edit?gid=1872445161#gid=1872445161", // Tab Đơn
            "3500", // Công Nợ
            "2000", // Tín Dụng
            "15/5", // Ngày check
            "14", // Đếm Ngày
            "8", // Tình Trạng
            "4 tuần chưa lên đơn", // Ghi Chú KT
            "8", // Ghi chú khác
        ],
    ])
    const [searchTerm, setSearchTerm] = useState("")
    const hotTableRef = useRef<any>(null)
    const [showTooltip, setShowTooltip] = useState(false)
    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)
    const [isMouseOverTooltip, setIsMouseOverTooltip] = useState(false)

    // Filter data based on search term
    const filteredData = tableData.filter((row) => {
        const searchFields = [0, 1, 4, 5, 9, 10] // Indices of columns to search in
        return (
            searchTerm === "" ||
            searchFields.some((fieldIndex) => {
                const value = row[fieldIndex]
                if (Array.isArray(value)) {
                    return value.some((item) => item.toLowerCase().includes(searchTerm.toLowerCase()))
                }
                return (value?.toLowerCase() || "").includes(searchTerm.toLowerCase())
            })
        )
    })

    // Show tooltip on hover
    const showTooltipOnHover = (data: string[], event: MouseEvent) => {
        const element = event.target as HTMLElement
        const rect = element.getBoundingClientRect()

        setTooltipData({
            data,
            position: {
                x: rect.left,
                y: rect.bottom + window.scrollY,
            },
            sourceElement: element,
        })
        setShowTooltip(true)
    }

    // Hide tooltip
    const hideTooltip = () => {
        // Only hide if mouse is not over tooltip
        if (!isMouseOverTooltip) {
            setShowTooltip(false)
            setTooltipData(null)
        }
    }

    // Copy text to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(
            () => {
                toast.success("Đã sao chép vào clipboard")
            },
            (err) => {
                toast.error("Không thể sao chép: " + err)
            },
        )
    }

    // Handle mouse events for tooltip
    useEffect(() => {
        const handleMouseLeave = (e: MouseEvent) => {
            const relatedTarget = e.relatedTarget as HTMLElement
            // Check if mouse is moving from tooltip to source element or vice versa
            if (
                tooltipRef.current &&
                tooltipData?.sourceElement &&
                !tooltipRef.current.contains(relatedTarget) &&
                !tooltipData.sourceElement.contains(relatedTarget)
            ) {
                setShowTooltip(false)
                setTooltipData(null)
                setIsMouseOverTooltip(false)
            }
        }

        document.addEventListener("mouseleave", handleMouseLeave, true)
        return () => {
            document.removeEventListener("mouseleave", handleMouseLeave, true)
        }
    }, [tooltipData])

    // Cells function for styling
    const cells = function (
        this: Handsontable.CellProperties,
        row: number,
        col: number,
        prop: string | number,
    ): Handsontable.CellMeta {
        const cellProperties: Handsontable.CellMeta = {
            // Add default styling for all cells
            className: "htMiddle htCenter", // Center content vertically and horizontally
            wordWrap: false, // Disable word wrap
            overflow: "hidden", // Hide overflow
            textOverflow: "ellipsis", // Show ellipsis for overflow
            whiteSpace: "nowrap", // Keep text in one line
        }

        // Format Tên column (index 5) - array display
        if (col === 5) {
            cellProperties.renderer = function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties,
            ) {
                if (Array.isArray(value) && value.length > 0) {
                    const count = value.length
                    const firstItem = value[0]
                    const displayText = count > 1 ? `${firstItem} (${count})` : firstItem

                    // Make it look like a normal cell but with hover effect
                    td.innerHTML = displayText
                    td.style.color = "#1E40AF" // blue-800
                    td.style.cursor = "pointer"

                    // Add hover events
                    td.addEventListener("mouseenter", (event) => {
                        if (count > 1) {
                            showTooltipOnHover(value, event as unknown as MouseEvent)
                        }
                    })

                    td.addEventListener("mouseleave", (event) => {
                        // Check if mouse is moving to tooltip
                        const relatedTarget = (event as MouseEvent).relatedTarget as HTMLElement
                        if (tooltipRef.current && !tooltipRef.current.contains(relatedTarget)) {
                            hideTooltip()
                        }
                    })
                } else {
                    Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties])
                }
            }
        }

        // Format Telegram column (index 6) - array display
        if (col === 6) {
            cellProperties.renderer = function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties,
            ) {
                if (Array.isArray(value) && value.length > 0) {
                    const count = value.length
                    const firstItem = value[0]
                    const displayText = count > 1 ? `${firstItem} (${count})` : firstItem

                    // Make it look like a normal cell but with hover effect
                    td.innerHTML = displayText
                    td.style.color = "#16A34A" // green-600
                    td.style.cursor = "pointer"

                    // Add hover events
                    td.addEventListener("mouseenter", (event) => {
                        if (count > 1) {
                            showTooltipOnHover(value, event as unknown as MouseEvent)
                        }
                    })

                    td.addEventListener("mouseleave", (event) => {
                        // Check if mouse is moving to tooltip
                        const relatedTarget = (event as MouseEvent).relatedTarget as HTMLElement
                        if (tooltipRef.current && !tooltipRef.current.contains(relatedTarget)) {
                            hideTooltip()
                        }
                    })
                } else {
                    Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties])
                }
            }
        }

        // Format date columns (Ngày check)
        if (col === 14) {
            cellProperties.renderer = function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties,
            ) {
                Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties])
                if (value) {
                    td.style.backgroundColor = "#EFF6FF" // light blue background
                    td.style.color = "#1E40AF" // blue-800
                }
            }
        }

        // Format Tình Trạng column
        if (col === 16) {
            cellProperties.renderer = function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties,
            ) {
                Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties])
                if (value === "8") {
                    td.style.backgroundColor = "#16A34A" // green-600
                    td.style.color = "#F0FDF4" // green-50
                } else {
                    td.style.backgroundColor = "#DC2626" // red-600
                    td.style.color = "#FEF2F2" // red-50
                }
            }
        }

        // Format Tab Đơn column (make it clickable)
        if (col === 11) {
            cellProperties.renderer = (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties,
            ) => {
                if (value) {
                    // Create a clickable link with ellipsis
                    const link = document.createElement("a")
                    link.href = value
                    link.target = "_blank"
                    link.style.color = "#2563EB"
                    link.style.textDecoration = "underline"
                    link.style.cursor = "pointer"
                    link.style.display = "block"
                    link.style.overflow = "hidden"
                    link.style.textOverflow = "ellipsis"
                    link.style.whiteSpace = "nowrap"
                    link.title = value // Show full URL on hover
                    link.textContent = value
                    td.innerHTML = ""
                    td.appendChild(link)
                } else {
                    td.textContent = ""
                }
            }
        }

        return cellProperties
    }

    // Get columns configuration
    const columns = [
        { data: 0, width: 60, className: "htMiddle htCenter" }, // Mã Mới
        { data: 1, width: 70, className: "htMiddle htCenter" }, // Phân Loại
        { data: 2, width: 70, className: "htMiddle htCenter" }, // Phiên Bản
        { data: 3, width: 70, className: "htMiddle htCenter" }, // Mã Cũ
        { data: 4, width: 60, className: "htMiddle htCenter" }, // Cty
        { data: 5, width: 120, className: "htMiddle htCenter" }, // Tên
        { data: 6, width: 60, className: "htMiddle htCenter" }, // Telegram
        { data: 7, width: 80, className: "htMiddle htCenter" }, // Link Nhóm
        { data: 8, width: 80, className: "htMiddle htCenter" }, // ID nhóm
        { data: 9, width: 80, className: "htMiddle htCenter" }, // Nhóm
        { data: 10, width: 100, className: "htMiddle htCenter" }, // Ng Chăm
        {
            data: 11, // Tab Đơn
            width: 100,
            renderer: "html",
            className: "htMiddle htCenter",
        },
        { data: 12, width: 100, className: "htMiddle htCenter" }, // Công Nợ
        { data: 13, width: 100, className: "htMiddle htCenter" }, // Tín Dụng
        {
            data: 14, // Ngày check
            width: 100,
            className: "htMiddle htCenter",
        },
        { data: 15, width: 80, className: "htMiddle htCenter" }, // Đếm Ngày
        {
            data: 16, // Tình Trạng
            width: 100,
            className: "htMiddle htCenter",
        },
        { data: 17, width: 100, className: "htMiddle htCenter" }, // Ghi Chú KT
        { data: 18, width: 100, className: "htMiddle htCenter" }, // Ghi chú khác
    ]

    // Dynamic headers based on new columns
    const RowHeader1: NestedColumnHeader[] = [{ label: `Quản lý khách hàng`, colspan: 19 }]

    const RowHeader2 = [
        "Mã Mới",
        "Phân Loại",
        "Phiên Bản",
        "Mã Cũ",
        "Cty",
        "Tên",
        "Telegram",
        "Link Nhóm",
        "ID nhóm",
        "Nhóm",
        "Ng Chăm",
        "Tab Đơn",
        "Công Nợ",
        "Tín Dụng",
        "Ngày check",
        "Đếm Ngày",
        "Tình Trạng",
        "Ghi Chú KT",
        "Ghi chú khác",
    ]

    const handleAfterChange = (changes: any, source: any) => {
        if (source !== "edit" && source !== "paste") return
        if (!changes) return

        // Handle changes here if needed
        toast.success("Cập nhật thành công")
    }

    const contextMenuItems = {
        items: {
            row_above: {
                name: "Thêm dòng mới",
                callback: () => {
                    const newRow = Array(19).fill("") // Create empty row with 19 columns
                    setTableData([...tableData, newRow])
                },
            },
            remove_row: {
                name: "Xóa dòng",
                callback: () => {
                    const selected = hotTableRef.current?.hotInstance?.getSelected()
                    if (selected) {
                        const rowIndex = selected[0][0]
                        const newData = [...tableData]
                        newData.splice(rowIndex, 1)
                        setTableData(newData)
                        toast.success("Xóa dòng thành công")
                    }
                },
            },
        },
    }

    // Add custom CSS for the table
    useEffect(() => {
        // Add custom styles for cell content
        const style = document.createElement("style")
        style.textContent = `
      .custom-table .htCore td {
        max-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .custom-table .htCore td:hover {
        overflow: visible;
        white-space: normal;
        word-break: break-word;
        z-index: 1;
        position: relative;
      }
      /* Simple tooltip styles matching the image */
      .simple-tooltip {
        position: absolute;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        padding: 8px 12px;
        z-index: 1000;
        font-size: 13px;
        line-height: 1.4;
        color: #374151;
        min-width: 120px;
      }
      .tooltip-item {
        margin: 4px 0;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .tooltip-item:hover {
        background-color: #f3f4f6;
        border-radius: 4px;
      }
      .copy-button {
        opacity: 0;
        cursor: pointer;
        margin-left: 8px;
        color: #6B7280;
        transition: opacity 0.2s;
      }
      .tooltip-item:hover .copy-button {
        opacity: 1;
      }
      .copy-button:hover {
        color: #1E40AF;
      }
      /* Arrow for tooltip */
      .simple-tooltip::before {
        content: '';
        position: absolute;
        top: -6px;
        left: 20px;
        width: 12px;
        height: 12px;
        background-color: white;
        transform: rotate(45deg);
        border-left: 1px solid #d1d5db;
        border-top: 1px solid #d1d5db;
      }
    `
        document.head.appendChild(style)
        return () => {
            document.head.removeChild(style)
        }
    }, [])

    return (
        <div className="min-h-screen py-6 px-4 relative">
            <Toaster position="top-right" expand={true} richColors />
            <div className="w-full max-w-7xl mx-auto relative z-0">
                {/* Header */}
                <div className="bg-white rounded-t-xl shadow-xl overflow-hidden border border-blue-100">
                    <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold text-white">Quản Lý Tài Khoản</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setTableData([])}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 shadow-md"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search and Add Section */}
                    <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 w-full sm:w-64"
                                />
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={() => {
                                    const newRow = Array(19).fill("")
                                    setTableData([...tableData, newRow])
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 shadow-md font-medium"
                            >
                                <Plus className="h-4 w-4" />
                                Thêm dòng mới
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-b-xl shadow-xl overflow-hidden">
                    <HotTable
                        ref={hotTableRef}
                        themeName="ht-theme-main"
                        nestedHeaders={[RowHeader1, RowHeader2]}
                        data={filteredData}
                        width="100%"
                        autoColumnSize={true}
                        manualColumnResize={true}
                        height="calc(100vh - 320px)"
                        stretchH="all"
                        manualRowMove={true}
                        manualColumnMove={true}
                        manualRowResize={true}
                        className="custom-table"
                        licenseKey="non-commercial-and-evaluation"
                        rowHeaders={false}
                        cells={cells}
                        dropdownMenu={false}
                        columnSorting={true}
                        columnHeaderHeight={30}
                        afterChange={handleAfterChange}
                        contextMenu={contextMenuItems}
                        columns={columns}
                    />
                </div>
            </div>

            {/* Simple tooltip for displaying array data */}
            {showTooltip && tooltipData && (
                <div
                    ref={tooltipRef}
                    className="simple-tooltip"
                    style={{
                        top: tooltipData.position.y,
                        left: tooltipData.position.x,
                    }}
                    onMouseEnter={() => setIsMouseOverTooltip(true)}
                    onMouseLeave={() => setIsMouseOverTooltip(false)}
                >
                    {tooltipData.data.map((item, index) => (
                        <div key={index} className="tooltip-item">
                            <span>{item}</span>
                            <span className="copy-button" onClick={() => copyToClipboard(item)}>
                                <Copy size={14} />
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
