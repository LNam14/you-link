"use client"

import { useState, useEffect, useRef } from "react"
import { HotTable } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import "./custom-table.css"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import Handsontable from "handsontable"
import { toast, Toaster } from "sonner"
import authApiRequest from "@/apiRequests/auth"
import getUserInfo from "@/components/userInfo"
import { RefreshCw, Shield, Truck, User, Users } from "lucide-react"

registerAllModules()

type NestedColumnHeader = {
    label: string
    colspan: number
}

type TabType = "Admin" | "NCC" | "NV" | "KH"

export default function AccountTracker() {
    const [tableData, setTableData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<TabType>("Admin")
    const [showAddModal, setShowAddModal] = useState(false)
    const [numberOfRows, setNumberOfRows] = useState(1)
    const userInfo = getUserInfo()
    const hotTableRef = useRef<any>(null)

    const fetchAccountData = async () => {
        try {
            setIsLoading(true)
            setError(null)
            setTableData([]) // Clear existing data first

            const response: any = await authApiRequest.get()
            console.log(response)

            // Process the data when response is successful
            if (response && response.success && response.data) {
                const formattedData: any[] = []

                // Process Admin accounts
                if (response.data.Admin && Array.isArray(response.data.Admin)) {
                    response.data.Admin.forEach((account: any) => {
                        formattedData.push([
                            account.username,
                            account.password,
                            account.name,
                            account.role,
                            account.created_at,
                            account.updated_at,
                            account.active,
                            account.id, // ID at index 7 (will be hidden)
                        ])
                    })
                }

                // Process NCC accounts
                if (response.data.NCC && Array.isArray(response.data.NCC)) {
                    response.data.NCC.forEach((account: any) => {
                        formattedData.push([
                            account.username,
                            account.password,
                            account.name,
                            account.role,
                            account.created_at,
                            account.updated_at,
                            account.active,
                            account.id, // ID at index 7 (will be hidden)
                        ])
                    })
                }

                // Process NV accounts
                if (response.data.NV && Array.isArray(response.data.NV)) {
                    response.data.NV.forEach((account: any) => {
                        formattedData.push([
                            account.username,
                            account.password,
                            account.name,
                            account.role,
                            account.created_at,
                            account.updated_at,
                            account.active,
                            account.id, // ID at index 7 (will be hidden)
                        ])
                    })
                }
                if (response.data.KH && Array.isArray(response.data.KH)) {
                    response.data.KH.forEach((account: any) => {
                        formattedData.push([
                            account.username,
                            account.password,
                            account.name,
                            account.role,
                            account.created_at,
                            account.updated_at,
                            account.active,
                            account.id, // ID at index 7 (will be hidden)
                        ])
                    })
                }

                setTableData(formattedData)
            }
        } catch (error: any) {
            console.error("Error fetching account data:", error)
            toast.error(error.response?.data?.error || "Có lỗi xảy ra khi tải dữ liệu tài khoản")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchAccountData()
    }, [])

    const RowHeader1: NestedColumnHeader[] = [{ label: "Thông tin tài khoản", colspan: 7 }]

    const RowHeader2 = ["Username", "Password", "Tên", "Vai trò", "Ngày tạo", "Ngày cập nhật", "Trạng thái"]

    const cells = function (
        this: Handsontable.CellProperties,
        row: number,
        col: number,
        prop: string | number,
    ): Handsontable.CellMeta {
        const cellProperties: Handsontable.CellMeta = {}

        // Apply colors to role column (column 3)
        if (col === 3) {
            const role = this.instance.getDataAtCell(row, col)
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
                switch (value) {
                    case "Admin":
                        td.style.backgroundColor = "#DC2626" // red-600
                        td.style.color = "#FEF2F2" // red-50
                        break
                    case "NCC":
                        td.style.backgroundColor = "#16A34A" // green-600
                        td.style.color = "#F0FDF4" // green-50
                        break
                    case "Nhân viên":
                        td.style.backgroundColor = "#9333EA" // purple-600
                        td.style.color = "#FAF5FF" // purple-50
                        break
                    case "Khách hàng":
                        td.style.backgroundColor = "#007BFF" // blue-600
                        td.style.color = "#F0FDF4" // blue-50
                        break
                }
            }
        }

        // Apply colors to status column (column 6)
        if (col === 6) {
            const status = this.instance.getDataAtCell(row, col)
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
                if (value === "Active") {
                    td.style.backgroundColor = "#16A34A" // green-600
                    td.style.color = "#F0FDF4" // green-50
                } else {
                    td.style.backgroundColor = "#DC2626" // red-600
                    td.style.color = "#FEF2F2" // red-50
                }
            }
        }

        // Format date columns (columns 4 and 5)
        if (col === 4 || col === 5) {
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
                    const date = new Date(value)
                    td.textContent = date.toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })
                }
            }
        }

        return cellProperties
    }

    // Filter data based on active tab
    const filteredData = tableData.filter((row) => {
        const role = row[3] // Role is in the 4th column (index 3)
        switch (activeTab) {
            case "Admin":
                return role === "Admin"
            case "NCC":
                return role === "NCC"
            case "NV":
                return role === "Nhân viên"
            case "KH":
                return role === "Khách hàng"
            default:
                return true
        }
    }).sort((a, b) => {
        // Only sort if we're in the NV tab
        if (activeTab === "NV" || activeTab === "KH") {
            const usernameA = a[0] // Username is in the first column
            const usernameB = b[0]
            return usernameA.localeCompare(usernameB, undefined, { numeric: true })
        }
        return 0
    })

    const handleAfterChange = async (changes: any, source: any) => {
        // Only handle changes from user input
        if (source !== "edit" && source !== "paste") return
        if (!changes) return

        for (const [row, col, oldValue, newValue] of changes) {
            // Get username from the filtered data instead of tableData
            const id = filteredData[row][7] // Get username from first column
            if (!id) continue

            try {
                const result: any = await authApiRequest.update({
                    id,
                    field: col,
                    value: newValue,
                })

                if (!result.success) {
                    toast.error(result.message || "Có lỗi xảy ra khi cập nhật tài khoản")
                    // Revert the change in the table
                    filteredData[row][col] = oldValue
                    setTableData([...tableData])
                } else {
                    toast.success("Cập nhật tài khoản thành công")
                }
            } catch (error: any) {
                console.error("Error updating account:", error)
                // Revert the change in the table
                filteredData[row][col] = oldValue
                setTableData([...tableData])
            }
        }
    }

    const handleAfterPaste = async (data: any[][], coords: any[]) => {
        if (!data || !coords) return

        for (const coord of coords) {
            const startRow = coord.startRow
            const startCol = coord.startCol
            const endRow = coord.endRow
            const endCol = coord.endCol

            for (let row = startRow; row <= endRow; row++) {
                // Get username from the filtered data instead of tableData
                const id = filteredData[row][7] // Get username from first column
                if (!id) continue

                for (let col = startCol; col <= endCol; col++) {
                    const dataRow = row - startRow
                    const dataCol = col - startCol
                    const newValue = data[dataRow]?.[dataCol]

                    if (newValue !== undefined && newValue !== null && newValue !== "") {
                        try {
                            const result: any = await authApiRequest.update({
                                id: id,
                                field: col,
                                value: newValue,
                            })

                            if (!result.success) {
                                toast.error(result.message)
                                // Revert the change in the table
                                filteredData[row][col] = filteredData[row][col]
                                setTableData([...tableData])
                            } else {
                                toast.success("Cập nhật tài khoản thành công")
                            }
                        } catch (error: any) {
                            console.error("Error updating account:", error)
                            // Revert the change in the table
                            filteredData[row][col] = filteredData[row][col]
                            setTableData([...tableData])
                        }
                    }
                }
            }
        }
    }

    const handleAddRow = async () => {
        setShowAddModal(true)
    }

    const handleConfirmAdd = async () => {
        if (numberOfRows < 1) {
            toast.error("Số dòng phải lớn hơn 0")
            return
        }

        try {
            setIsAdding(true)
            const result: any = await authApiRequest.create({
                count: numberOfRows,
                role: activeTab === "NV" ? "Nhân viên" : activeTab,
            })

            if (!result.success) {
                toast.error(result.message || "Có lỗi xảy ra khi thêm tài khoản")
                return
            }

            toast.success(`Đã thêm ${numberOfRows} tài khoản thành công`)
            setShowAddModal(false)
            setNumberOfRows(1)

            // Clear current data and reload
            setTableData([])
            await fetchAccountData()

            // Reset selection after adding
            if (hotTableRef.current?.hotInstance) {
                hotTableRef.current.hotInstance.deselectCell()
            }
        } catch (error: any) {
            console.error("Error adding accounts:", error)
            toast.error("Có lỗi xảy ra khi thêm tài khoản")
        } finally {
            setIsAdding(false)
        }
    }

    const handleDeleteRow = async (rowIndex: number) => {
        const id = filteredData[rowIndex][7] // Get id from the 8th column
        if (!id) return

        try {
            const result: any = await authApiRequest.delete({ id })

            if (!result.success) {
                toast.error(result.message || "Có lỗi xảy ra khi xóa tài khoản")
                return
            }

            toast.success("Xóa tài khoản thành công")

            // Clear current data and reload
            setTableData([])
            await fetchAccountData() // Make sure this is awaited

            // Reset selection after deletion
            if (hotTableRef.current?.hotInstance) {
                hotTableRef.current.hotInstance.deselectCell()
            }
        } catch (error: any) {
            console.error("Error deleting account:", error)
            toast.error("Có lỗi xảy ra khi xóa tài khoản")
        }
    }

    const handleAfterRemoveRow = async (index: number, amount: number) => {
        // Reload data after Handsontable's internal row removal
        await fetchAccountData()

        // Reset selection after reloading
        if (hotTableRef.current?.hotInstance) {
            hotTableRef.current.hotInstance.deselectCell()
        }
    }

    const contextMenuItems = {
        items: {
            row_above: {
                name: "Thêm dòng mới",
                callback: handleAddRow,
            },
            remove_row: {
                name: "Xóa dòng",
                callback: () => {
                    const selected = hotTableRef.current?.hotInstance?.getSelected()
                    if (selected) {
                        const rowIndex = selected[0][0]
                        handleDeleteRow(rowIndex)
                    }
                },
            },
        },
    }

    return (
        <div className="min-h-screen py-6 px-4">
            <Toaster position="top-right" expand={true} richColors />
            {isLoading && !tableData.length && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-700 font-medium">Đang tải dữ liệu...</p>
                    </div>
                </div>
            )}
            <div className="w-full max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-t-xl shadow-xl overflow-hidden border border-blue-100">
                    <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">Quản Lý Tài Khoản</h2>
                            <button
                                onClick={async () => {
                                    setTableData([])
                                    await fetchAccountData()
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 shadow-md"
                                disabled={isLoading}
                            >
                                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab("Admin")}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === "Admin"
                                ? "border-b-2 border-red-600 text-red-600"
                                : "text-gray-500 hover:text-red-500"
                                }`}
                        >
                            <Shield className={`h-4 w-4 ${activeTab === "Admin" ? "" : "opacity-70"}`} />
                            <span>Admin</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("NCC")}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === "NCC"
                                ? "border-b-2 border-green-600 text-green-600"
                                : "text-gray-500 hover:text-green-500"
                                }`}
                        >
                            <Truck className={`h-4 w-4 ${activeTab === "NCC" ? "" : "opacity-70"}`} />
                            <span>Nhà cung cấp</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("NV")}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === "NV"
                                ? "border-b-2 border-purple-600 text-purple-600"
                                : "text-gray-500 hover:text-purple-500"
                                }`}
                        >
                            <Users className={`h-4 w-4 ${activeTab === "NV" ? "" : "opacity-70"}`} />
                            <span>Nhân viên</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("KH")}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === "KH"
                                ? "border-b-2 border-blue-600 text-blue-600"
                                : "text-gray-500 hover:text-blue-500"
                                }`}
                        >
                            <User className={`h-4 w-4 ${activeTab === "KH" ? "" : "opacity-70"}`} />
                            <span>Khách hàng</span>
                        </button>
                    </div>
                </div>

                {/* Add Row Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-xl shadow-xl w-96">
                            <h3 className="text-lg font-semibold mb-4">Thêm tài khoản mới</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng tài khoản cần thêm</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={numberOfRows}
                                    onChange={(e) => setNumberOfRows(Number.parseInt(e.target.value) || 1)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isAdding}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setShowAddModal(false)
                                        setNumberOfRows(1)
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isAdding}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleConfirmAdd}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    disabled={isAdding}
                                >
                                    {isAdding ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Đang thêm...
                                        </>
                                    ) : (
                                        "Thêm"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                        height="calc(100vh - 240px)"
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
                        afterPaste={handleAfterPaste}
                        contextMenu={contextMenuItems}
                        afterRemoveRow={handleAfterRemoveRow}
                        columns={[
                            { data: 0 }, // Username
                            { data: 1 }, // Password
                            { data: 2 }, // Name
                            { data: 3 }, // Role
                            { data: 4 }, // Created at
                            { data: 5 }, // Updated at
                            { data: 6 }, // Status
                        ]}
                    />
                </div>
            </div>
        </div>
    )
}
