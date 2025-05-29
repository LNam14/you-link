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
import { RefreshCw, Search, Plus } from "lucide-react"

registerAllModules()

type NestedColumnHeader = {
    label: string
    colspan: number
}

export default function AccountTracker() {
    const [tableData, setTableData] = useState<any[]>([
        [
            "S28", // Mã Mới
            "11", // Phân Loại
            "22", // Phiên Bản
            "L304, P32", // Mã Cũ
            "44", // Cty
            "Roseanne, Tường Vi, Sarah D, Kem - OS, Emily Tan", // Tên (multiple names)
            "@12341234, #1884364594, @KEM668899, @fty4us, @nanaseo98", // Telegram (multiple handles)
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
            "8" // Ghi chú khác
        ],
        // Additional mock data (hidden in table)
        [
            "S29",
            "11",
            "22",
            "L305, P33",
            "44",
            "Tường Vi",
            "#1884364594",
            "6",
            "7",
            "8",
            "An Nhiên",
            "https://docs.google.com/spreadsheets/d/1eUwnoVUmuYE6OFQ_u5TJhkWBwh14kPNNXbWafw55Djc/edit?gid=1872445161#gid=1872445161",
            "3500",
            "2000",
            "15/5",
            "14",
            "8",
            "4 tuần chưa lên đơn",
            "8"
        ],
        [
            "S30",
            "11",
            "22",
            "L306, P34",
            "44",
            "Sarah D",
            "@KEM668899",
            "6",
            "7",
            "8",
            "An Nhiên",
            "https://docs.google.com/spreadsheets/d/1eUwnoVUmuYE6OFQ_u5TJhkWBwh14kPNNXbWafw55Djc/edit?gid=1872445161#gid=1872445161",
            "3500",
            "2000",
            "15/5",
            "14",
            "8",
            "4 tuần chưa lên đơn",
            "8"
        ],
        [
            "S31",
            "11",
            "22",
            "L307, P35",
            "44",
            "Kem - OS",
            "@fty4us",
            "6",
            "7",
            "8",
            "An Nhiên",
            "https://docs.google.com/spreadsheets/d/1eUwnoVUmuYE6OFQ_u5TJhkWBwh14kPNNXbWafw55Djc/edit?gid=1872445161#gid=1872445161",
            "3500",
            "2000",
            "15/5",
            "14",
            "8",
            "4 tuần chưa lên đơn",
            "8"
        ],
        [
            "S32",
            "11",
            "22",
            "L308, P36",
            "44",
            "Emily Tan",
            "@nanaseo98",
            "6",
            "7",
            "8",
            "An Nhiên",
            "https://docs.google.com/spreadsheets/d/1eUwnoVUmuYE6OFQ_u5TJhkWBwh14kPNNXbWafw55Djc/edit?gid=1872445161#gid=1872445161",
            "3500",
            "2000",
            "15/5",
            "14",
            "8",
            "4 tuần chưa lên đơn",
            "8"
        ]
    ])
    const [searchTerm, setSearchTerm] = useState("")
    const hotTableRef = useRef<any>(null)

    // Filter data based on search term
    const filteredData = tableData.filter((row) => {
        const searchFields = [0, 1, 4, 5, 9, 10] // Indices of columns to search in
        return searchTerm === "" || searchFields.some(fieldIndex => {
            const value = row[fieldIndex]?.toLowerCase() || ""
            return value.includes(searchTerm.toLowerCase())
        })
    })

    // Cells function for styling
    const cells = function (
        this: Handsontable.CellProperties,
        row: number,
        col: number,
        prop: string | number,
    ): Handsontable.CellMeta {
        const cellProperties: Handsontable.CellMeta = {
            // Add default styling for all cells
            className: 'htMiddle htCenter', // Center content vertically and horizontally
            wordWrap: false, // Disable word wrap
            overflow: 'hidden', // Hide overflow
            textOverflow: 'ellipsis', // Show ellipsis for overflow
            whiteSpace: 'nowrap', // Keep text in one line
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
            cellProperties.renderer = function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties,
            ) {
                if (value) {
                    // Create a clickable link with ellipsis
                    const link = document.createElement('a')
                    link.href = value
                    link.target = '_blank'
                    link.style.color = '#2563EB'
                    link.style.textDecoration = 'underline'
                    link.style.cursor = 'pointer'
                    link.style.display = 'block'
                    link.style.overflow = 'hidden'
                    link.style.textOverflow = 'ellipsis'
                    link.style.whiteSpace = 'nowrap'
                    link.title = value // Show full URL on hover
                    link.textContent = value
                    td.innerHTML = ''
                    td.appendChild(link)
                } else {
                    td.textContent = ''
                }
            }
        }

        return cellProperties
    }

    // Get columns configuration
    const columns = [
        { data: 0, width: 60, className: 'htMiddle htCenter' }, // Mã Mới
        { data: 1, width: 70, className: 'htMiddle htCenter' }, // Phân Loại
        { data: 2, width: 70, className: 'htMiddle htCenter' }, // Phiên Bản
        { data: 3, width: 70, className: 'htMiddle htCenter' }, // Mã Cũ
        { data: 4, width: 60, className: 'htMiddle htCenter' }, // Cty
        { data: 5, width: 120, className: 'htMiddle htCenter' }, // Tên
        { data: 6, width: 60, className: 'htMiddle htCenter' }, // Telegram
        { data: 7, width: 80, className: 'htMiddle htCenter' }, // Link Nhóm
        { data: 8, width: 80, className: 'htMiddle htCenter' }, // ID nhóm
        { data: 9, width: 80, className: 'htMiddle htCenter' }, // Nhóm
        { data: 10, width: 100, className: 'htMiddle htCenter' }, // Ng Chăm
        {
            data: 11, // Tab Đơn
            width: 100,
            renderer: 'html',
            className: 'htMiddle htCenter'
        },
        { data: 12, width: 100, className: 'htMiddle htCenter' }, // Công Nợ
        { data: 13, width: 100, className: 'htMiddle htCenter' }, // Tín Dụng
        {
            data: 14, // Ngày check
            width: 100,
            className: 'htMiddle htCenter'
        },
        { data: 15, width: 80, className: 'htMiddle htCenter' }, // Đếm Ngày
        {
            data: 16, // Tình Trạng
            width: 100,
            className: 'htMiddle htCenter'
        },
        { data: 17, width: 100, className: 'htMiddle htCenter' }, // Ghi Chú KT
        { data: 18, width: 100, className: 'htMiddle htCenter' } // Ghi chú khác
    ]

    // Dynamic headers based on new columns
    const RowHeader1: NestedColumnHeader[] = [
        { label: `Quản lý khách hàng`, colspan: 19 },
    ]

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
        "Ghi chú khác"
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
        const style = document.createElement('style')
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
        </div>
    )
}
