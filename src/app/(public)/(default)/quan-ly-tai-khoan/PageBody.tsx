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
import { RefreshCw, Shield, Truck, User, Users, Settings, Search, Plus } from "lucide-react"
import TeamManagement from "../components/team-managament"

registerAllModules()

type NestedColumnHeader = {
    label: string
    colspan: number
}

type TabType = "Admin" | "NCC" | "NV" | "KH" | "Teams"

export default function AccountTracker() {
    const [tableData, setTableData] = useState<any[]>([])
    const [teams, setTeams] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<TabType>("Admin")
    const [showAddModal, setShowAddModal] = useState(false)
    const [numberOfRows, setNumberOfRows] = useState(1)
    const [selectedTeamId, setSelectedTeamId] = useState<string>("")
    const [searchTerm, setSearchTerm] = useState("")
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

                // Store teams data with member count
                const teamsWithCount = (response.data.teams || []).map((team: any) => {
                    const memberCount = response.data.NV?.filter((nv: any) => nv.team === team.name).length || 0
                    return { ...team, member_count: memberCount }
                })
                setTeams(teamsWithCount)

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
                            account.team || "Chưa có nhóm", // Display account.team directly
                            account.id, // ID at index 8 (will be hidden)
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
                            account.team || "Chưa có nhóm", // Display account.team directly
                            account.id, // ID at index 8 (will be hidden)
                        ])
                    })
                }

                // Process NV accounts with position
                if (response.data.NV && Array.isArray(response.data.NV)) {
                    response.data.NV.forEach((account: any) => {
                        formattedData.push([
                            account.username,
                            account.password,
                            account.name,
                            account.role,
                            account.position || "", // Add position field
                            account.created_at,
                            account.updated_at,
                            account.active,
                            account.team || "Chưa có nhóm", // Display account.team directly
                            account.id, // ID at index 9 (will be hidden)
                            account.team || "Chưa có nhóm", // Team ID at index 10 (will be hidden)
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
                            account.team || "Chưa có nhóm", // Display account.team directly
                            account.id, // ID at index 8 (will be hidden)
                            account.team || "Chưa có nhóm", // Team ID at index 9 (will be hidden)
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

    const fetchedRef = useRef(false);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        fetchAccountData();
    }, []);

    // Dynamic headers based on role
    const getHeaders = () => {
        if (activeTab === "NV") {
            return {
                RowHeader1: [{ label: "Thông tin tài khoản", colspan: 9 }],
                RowHeader2: ["Username", "Password", "Tên", "Vai trò", "Chức vụ", "Ngày tạo", "Ngày cập nhật", "Trạng thái", "Team"],
            }
        }
        return {
            RowHeader1: [{ label: "Thông tin tài khoản", colspan: 7 }],
            RowHeader2: ["Username", "Password", "Tên", "Vai trò", "Ngày tạo", "Ngày cập nhật", "Trạng thái"],
        }
    }

    const { RowHeader1, RowHeader2 } = getHeaders()

    // Sửa lại phần cells function để hiển thị và cập nhật team cho nhân viên đúng cách
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

        // Apply colors to status column (column 6 for non-NV, column 7 for NV)
        const statusCol = activeTab === "NV" ? 7 : 6
        if (col === statusCol) {
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

        // Team dropdown for column 8 (only for NV tab)
        if (col === 8 && activeTab === "NV") {
            cellProperties.type = "dropdown"
            cellProperties.source = teams.map((team) => team.name)
            cellProperties.renderer = function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties,
            ) {
                Handsontable.renderers.DropdownRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties])
                // Add styling for team cell
                td.style.backgroundColor = "#EFF6FF" // light blue background
                td.style.color = "#1E40AF" // blue-800
            }
        }

        // Format date columns (columns 5 and 6 for non-NV, columns 6 and 7 for NV)
        const dateCols = activeTab === "NV" ? [5, 6] : [4, 5]
        if (dateCols.includes(col)) {
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

    // Filter data based on active tab and search term
    const filteredData = tableData
        .filter((row) => {
            const role = row[3] // Role is in the 4th column (index 3)
            const username = row[0]?.toLowerCase() || "" // Username for search
            const name = row[2]?.toLowerCase() || "" // Name for search

            // Filter by role
            let roleMatch = false
            switch (activeTab) {
                case "Admin":
                    roleMatch = role === "Admin"
                    break
                case "NCC":
                    roleMatch = role === "NCC"
                    break
                case "NV":
                    roleMatch = role === "Nhân viên"
                    break
                case "KH":
                    roleMatch = role === "Khách hàng"
                    break
                default:
                    roleMatch = true
            }

            // Filter by search term (username or name)
            const searchMatch =
                searchTerm === "" || username.includes(searchTerm.toLowerCase()) || name.includes(searchTerm.toLowerCase())

            return roleMatch && searchMatch
        })
        .sort((a, b) => {
            // Only sort if we're in the NV tab
            if (activeTab === "NV" || activeTab === "KH") {
                const usernameA = a[0] || "" // Username is in the first column, default to empty string if null/undefined
                const usernameB = b[0] || "" // Default to empty string if null/undefined
                return usernameA.localeCompare(usernameB, undefined, { numeric: true })
            }
            return 0
        })

    // Sửa lại phần handleAfterChange để xử lý cập nhật team đúng cách
    const handleAfterChange = async (changes: any, source: any) => {
        // Only handle changes from user input
        if (source !== "edit" && source !== "paste") return
        if (!changes) return

        for (const [row, col, oldValue, newValue] of changes) {
            // Get id from the filtered data
            const id = filteredData[row][activeTab === "NV" ? 9 : 8] // Get id from the correct column based on role
            if (!id) continue

            try {
                const updateField = col
                let updateValue = newValue

                // Handle different column updates based on role and column
                if (activeTab === "NV") {
                    // Handle team column (col 8 for NV)
                    if (col === 8) {
                        const selectedTeam = teams.find((team) => team.name === newValue)
                        if (selectedTeam) {
                            updateValue = selectedTeam.name
                        } else {
                            updateValue = null // No team selected or invalid team
                        }
                    }
                    // Handle position column (col 4 for NV)
                    else if (col === 4) {
                        // Ensure position is a string and trim whitespace
                        updateValue = String(newValue || "").trim()
                    }
                }

                // Map the column index to the correct field index for the API
                let fieldIndex = col
                if (activeTab === "NV") {
                    // Adjust field indices for NV role to match API mapping
                    // username(0), password(1), name(2), role(3), position(4), created_at(5), updated_at(6), status(7), team(8)
                    fieldIndex = col
                } else {
                    // For other roles: username(0), password(1), name(2), role(3), created_at(4), updated_at(5), status(6), team(7)
                    if (col >= 4) fieldIndex = col - 1 // Adjust indices after position column
                }

                const result: any = await authApiRequest.update({
                    id,
                    field: fieldIndex,
                    value: updateValue,
                })

                if (!result.success) {
                    toast.error(result.message || "Có lỗi xảy ra khi cập nhật tài khoản")
                    // Revert the change in the table
                    filteredData[row][col] = oldValue
                    setTableData([...tableData])
                } else {
                    toast.success("Cập nhật tài khoản thành công")
                    // Update team in hidden column if team was updated
                    if (col === 8 && activeTab === "NV") {
                        const selectedTeam = teams.find((team) => team.name === newValue)
                        filteredData[row][10] = selectedTeam ? selectedTeam.id : ""
                    }
                }
            } catch (error: any) {
                console.error("Error updating account:", error)
                // Revert the change in the table
                filteredData[row][col] = oldValue
                setTableData([...tableData])
                toast.error(error.response?.data?.message || "Có lỗi xảy ra khi cập nhật tài khoản")
            }
        }
    }

    const handleAfterPaste = async (data: any[][], coords: any[]) => {
        if (!data || !coords) return

        for (const coord of coords) {
            const startRow = coord.startRow
            const endRow = coord.endRow
            const startCol = coord.startCol
            const endCol = coord.endCol

            for (let row = startRow; row <= endRow; row++) {
                // Get id from the filtered data
                const id = filteredData[row][9] // Get id from 9th column
                if (!id) continue

                for (let col = startCol; col <= endCol; col++) {
                    const dataRow = row - startRow
                    const dataCol = col - startCol
                    const newValue = data[dataRow]?.[dataCol]

                    if (newValue !== undefined && newValue !== null && newValue !== "") {
                        try {
                            let updateValue = newValue

                            // // If updating team column (col 7), convert team name to team
                            // if (col === 7 && activeTab === "NV") {
                            //     const selectedTeam = teams.find((team) => team.name === newValue)
                            //     updateValue = selectedTeam ? selectedTeam.id : null
                            // }

                            const result: any = await authApiRequest.update({
                                id: id,
                                field: col,
                                value: updateValue,
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
            const createData: any = {
                count: numberOfRows,
                role: activeTab === "NV" ? "Nhân viên" : activeTab === "KH" ? "Khách hàng" : activeTab,
            }

            // Add team if creating employees and team is selected
            if (activeTab === "NV" && selectedTeamId) {
                createData.team = selectedTeamId
                createData.position = "" // Add default empty position for new employees
            }

            const result: any = await authApiRequest.create(createData)

            if (!result.success) {
                toast.error(result.message || "Có lỗi xảy ra khi thêm tài khoản")
                return
            }

            await fetchAccountData()
            toast.success(`Đã thêm ${numberOfRows} tài khoản thành công`)
            setShowAddModal(false)
            setNumberOfRows(1)
            setSelectedTeamId("")

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
        const id = filteredData[rowIndex][activeTab === "NV" ? 9 : 8] // Lấy id đúng cột theo loại tài khoản
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

    // Dynamic columns based on role
    const getColumns = () => {
        if (activeTab === "NV") {
            return [
                { data: 0 }, // Username
                { data: 1 }, // Password
                { data: 2 }, // Name
                { data: 3 }, // Role
                { data: 4 }, // Position
                { data: 5 }, // Created at
                { data: 6 }, // Updated at
                { data: 7 }, // Status
                { data: 8 }, // Team
            ]
        }
        return [
            { data: 0 }, // Username
            { data: 1 }, // Password
            { data: 2 }, // Name
            { data: 3 }, // Role
            { data: 4 }, // Created at
            { data: 5 }, // Updated at
            { data: 6 }, // Status
        ]
    }

    // Get dynamic title based on active tab
    const getTitle = () => {
        switch (activeTab) {
            case "Admin":
                return "Quản Lý Admin"
            case "NCC":
                return "Quản Lý Nhà Cung Cấp"
            case "NV":
                return "Quản Lý Nhân Viên"
            case "KH":
                return "Quản Lý Khách Hàng"
            case "Teams":
                return "Quản Lý Teams"
            default:
                return "Quản Lý Tài Khoản"
        }
    }

    // Get dynamic icon based on active tab
    const getTitleIcon = () => {
        switch (activeTab) {
            case "Admin":
                return <Shield className="h-6 w-6" />
            case "NCC":
                return <Truck className="h-6 w-6" />
            case "NV":
                return <Users className="h-6 w-6" />
            case "KH":
                return <User className="h-6 w-6" />
            case "Teams":
                return <Settings className="h-6 w-6" />
            default:
                return <Users className="h-6 w-6" />
        }
    }

    return (
        <div className={`min-h-screen py-6 px-4 ${isLoading && !tableData.length ? "fixed inset-0 z-50" : "relative"}`}>
            <Toaster position="top-right" expand={true} richColors />
            {isLoading && !tableData.length && (
                <div className="bg-black bg-opacity-50 flex items-center justify-center w-full h-full">
                    <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-700 font-medium">Đang tải dữ liệu...</p>
                    </div>
                </div>
            )}
            {(!isLoading || tableData.length > 0) && (
                <div className="w-full max-w-7xl mx-auto relative z-0">
                    {/* Header */}
                    <div className="bg-white rounded-t-xl shadow-xl overflow-hidden border border-blue-100">
                        <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h2 className="text-2xl font-bold text-white">Quản Lý Tài Khoản & Teams</h2>
                                <div className="flex items-center gap-2">
                                    <div className="flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden">
                                        <button
                                            onClick={() => setActiveTab("Admin")}
                                            className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "Admin" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                                }`}
                                        >
                                            <Shield className="h-4 w-4 mr-1" />
                                            Admin
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("NCC")}
                                            className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "NCC" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                                }`}
                                        >
                                            <Truck className="h-4 w-4 mr-1" />
                                            Nhà cung cấp
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("KH")}
                                            className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "KH" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                                }`}
                                        >
                                            <User className="h-4 w-4 mr-1" />
                                            Khách hàng
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("NV")}
                                            className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "NV" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                                }`}
                                        >
                                            <Users className="h-4 w-4 mr-1" />
                                            Nhân viên
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("Teams")}
                                            className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "Teams" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                                }`}
                                        >
                                            <Settings className="h-4 w-4 mr-1" />
                                            Teams
                                        </button>
                                    </div>
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
                        </div>

                        {/* Dynamic Title Section */}
                        <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="text-white">
                                    <div className="flex items-center gap-3 mb-2">
                                        {getTitleIcon()}
                                        <h3 className="text-xl font-bold">{getTitle()}</h3>
                                    </div>
                                    <p className="text-blue-100">
                                        {activeTab === "Teams"
                                            ? `Tổng cộng ${teams.length} teams đang hoạt động`
                                            : `Tổng cộng ${filteredData.length} tài khoản`}
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder={activeTab === "Teams" ? "Tìm kiếm team..." : "Tìm kiếm theo username..."}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 w-full sm:w-64"
                                        />
                                    </div>

                                    {/* Add Button */}
                                    {activeTab === "Teams" ? (
                                        <button
                                            onClick={() => {
                                                // Trigger create team modal from TeamManagement component
                                                const createButton = document.querySelector("[data-create-team]") as HTMLButtonElement
                                                if (createButton) createButton.click()
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 shadow-md font-medium"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Tạo Team
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleAddRow}
                                            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 shadow-md font-medium"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Thêm{" "}
                                            {activeTab === "Admin"
                                                ? "Admin"
                                                : activeTab === "NCC"
                                                    ? "NCC"
                                                    : activeTab === "NV"
                                                        ? "Nhân viên"
                                                        : "Khách hàng"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    {activeTab === "Teams" ? (
                        <div className="bg-white rounded-b-xl shadow-xl overflow-hidden">
                            <div className="p-6">
                                <TeamManagement
                                    teams={teams.filter(
                                        (team) =>
                                            searchTerm === "" ||
                                            team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase())),
                                    )}
                                    onTeamsUpdate={fetchAccountData}
                                    hideHeader={true}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Add Row Modal */}
                            {showAddModal && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                    <div className="bg-white p-6 rounded-xl shadow-xl w-96">
                                        <h3 className="text-lg font-semibold mb-4">Thêm tài khoản mới</h3>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Số lượng tài khoản cần thêm
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={numberOfRows}
                                                onChange={(e) => setNumberOfRows(Number.parseInt(e.target.value) || 1)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                disabled={isAdding}
                                            />
                                        </div>
                                        {activeTab === "NV" && (
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Team (tùy chọn)</label>
                                                <select
                                                    value={selectedTeamId}
                                                    onChange={(e) => setSelectedTeamId(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isAdding}
                                                >
                                                    <option value="">-- Chọn team --</option>
                                                    {teams.map((team) => (
                                                        <option key={team.id} value={team.id}>
                                                            {team.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setShowAddModal(false)
                                                    setNumberOfRows(1)
                                                    setSelectedTeamId("")
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
                                    afterPaste={handleAfterPaste}
                                    contextMenu={contextMenuItems}
                                    afterRemoveRow={handleAfterRemoveRow}
                                    columns={getColumns()}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
