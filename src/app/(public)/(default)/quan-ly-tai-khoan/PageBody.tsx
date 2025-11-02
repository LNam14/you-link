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
    const userInfo = getUserInfo()
    const [activeTab, setActiveTab] = useState<TabType>(userInfo.role === "Nhân viên" ? "NCC" : "Admin")
    const [showAddModal, setShowAddModal] = useState(false)
    const [numberOfRows, setNumberOfRows] = useState(1)
    const [selectedTeamId, setSelectedTeamId] = useState<string>("")
    const [searchTerm, setSearchTerm] = useState("")
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

                // Store teams data with member count (team field now stores leader username, not team name)
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
                            account.name, // Name for Admin
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
                            account.country || "Việt Nam", // Country for NCC
                            account.role,
                            account.created_at,
                            account.updated_at,
                            account.active,
                            account.team || "Chưa có nhóm", // Display account.team directly
                            account.id, // ID at index 8 (will be hidden)
                        ])
                    })
                }

                // Process NV accounts
                // Mapping: Chức vụ (col 4) → position, Telegram (col 5) → telegram, Trạng thái (col 6) → active, Team (col 7) → team
                // Data Array: [0:username, 1:password, 2:name, 3:role, 4:position, 5:telegram, 6:active, 7:team, 8:created_at, 9:updated_at, 10:id]
                if (response.data.NV && Array.isArray(response.data.NV)) {
                    response.data.NV.forEach((account: any) => {
                        // Team field stores team name (from team table)
                        const teamName = account.team || "Chưa có team"
                        
                        formattedData.push([
                            account.username,        // 0: username
                            account.password,         // 1: password
                            account.name,             // 2: name
                            account.role,             // 3: role
                            account.position || "",    // 4: position (Chức vụ)
                            account.telegram || "",    // 5: telegram (Telegram)
                            account.active,            // 6: active (Trạng thái)
                            teamName,                 // 7: team
                            account.created_at,        // 8: created_at (hidden)
                            account.updated_at,        // 9: updated_at (hidden)
                            account.id,               // 10: id (hidden)
                        ])
                    })
                }

                if (response.data.KH && Array.isArray(response.data.KH)) {
                    response.data.KH.forEach((account: any) => {
                        formattedData.push([
                            account.username,
                            account.password,
                            account.country || "Việt Nam", // Country for KH
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
                RowHeader1: [{ label: "Thông tin tài khoản", colspan: 8 }],
                RowHeader2: ["Username", "Password", "Tên", "Vai trò", "Chức vụ", "Telegram", "Trạng thái", "Team"],
            }
        } else if (activeTab === "Admin") {
            return {
                RowHeader1: [{ label: "Thông tin tài khoản", colspan: 7 }],
                RowHeader2: ["Username", "Password", "Tên", "Vai trò", "Ngày tạo", "Ngày cập nhật", "Trạng thái"],
            }
        } else if (activeTab === "NCC" || activeTab === "KH") {
            return {
                RowHeader1: [{ label: "Thông tin tài khoản", colspan: 7 }],
                RowHeader2: ["Username", "Password", "Quốc gia", "Vai trò", "Ngày tạo", "Ngày cập nhật", "Trạng thái"],
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

        // Apply colors to status column (display column 6 for NV, display column 6 for non-NV)
        const statusCol = activeTab === "NV" ? 6 : 6
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

        // Chức vụ dropdown for display column 4 (only for NV tab)
        if (col === 4 && activeTab === "NV") {
            cellProperties.type = "dropdown"
            cellProperties.source = ["Bán hàng", "Data", "IT", "Leader"]
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
                // Add styling for Chức vụ cell
                td.style.backgroundColor = "#FEF3C7" // light yellow background
                td.style.color = "#92400E" // yellow-800
            }
        }

        // Team dropdown for display column 7 (only for NV tab)
        if (col === 7 && activeTab === "NV") {
            // Get teams list for dropdown (filter out null names)
            const teamNames = ["Chưa có team", ...teams
                .filter(t => t.active === "Hoạt động" && t.name)
                .map(t => t.name!)
                .filter(name => name && name.trim() !== "")]
            cellProperties.type = "dropdown"
            cellProperties.source = teamNames
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
        
        // Telegram text input for column 5 (only for NV tab) - stores user's telegram
        if (col === 5 && activeTab === "NV") {
            cellProperties.type = "text"
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
                // Add styling for telegram cell
                td.style.backgroundColor = "#FFFFFF" // white background
                td.style.color = "#1F2937" // gray-800
            }
        }

        // Country dropdown for column 2 (for NCC and KH tabs)
        if (col === 2 && (activeTab === "NCC" || activeTab === "KH")) {
            cellProperties.type = "dropdown"
            cellProperties.source = ["Việt Nam", "Nước Ngoài"]
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
                // Add styling for country cell
                td.style.backgroundColor = "#F0FDF4" // light green background
                td.style.color = "#166534" // green-800
            }
        }

        // Format date columns (columns 4 and 5 for non-NV only, no date columns for NV)
        const dateCols = activeTab === "NV" ? [] : [4, 5]
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
            // Helper function to extract numeric part from username (e.g., "BH1" -> 1, "BH10" -> 10)
            const getNumericValue = (username: string): number => {
                if (!username) return 0
                // Try to extract number from end of string (e.g., "BH1" -> 1, "BH10" -> 10)
                const match = username.match(/(\d+)$/)
                return match ? parseInt(match[1], 10) : 0
            }
            
            // Helper function to get prefix (e.g., "BH1" -> "BH")
            const getPrefix = (username: string): string => {
                if (!username) return ""
                const match = username.match(/^([^\d]+)/)
                return match ? match[1] : username
            }
            
            // Helper function to sort username with numeric support
            const sortUsername = (usernameA: string, usernameB: string): number => {
                const prefixA = getPrefix(usernameA)
                const prefixB = getPrefix(usernameB)
                
                // First compare prefix (e.g., "BH" vs "BH")
                if (prefixA !== prefixB) {
                    return prefixA.localeCompare(prefixB)
                }
                
                // Same prefix, compare numeric part
                const numA = getNumericValue(usernameA)
                const numB = getNumericValue(usernameB)
                return numA - numB
            }
            
            // Sort by username with numeric support for all tabs
            const usernameA = a[0] || ""
            const usernameB = b[0] || ""
            return sortUsername(usernameA, usernameB)
        })

    // Sửa lại phần handleAfterChange để xử lý cập nhật team đúng cách
    const handleAfterChange = async (changes: any, source: any) => {
        // Only handle changes from user input (exclude loadData and other internal sources)
        const validSources = ["edit", "paste", "select", "CopyPaste", "autofill", "drag"]
        if (!validSources.includes(source)) {
            console.log("Skipping change from source:", source)
            return
        }
        if (!changes || !Array.isArray(changes) || changes.length === 0) return

        console.log("handleAfterChange triggered:", { changes, source, activeTab, changesLength: changes.length })

        for (const [row, col, oldValue, newValue] of changes) {
            // For team column (col 7), always process even if values seem equal (might be format difference)
            // For other columns, skip if no actual change
            const isTeamColumn = col === 7 && activeTab === "NV"
            const valuesEqual = oldValue === newValue
            
            if (!isTeamColumn && valuesEqual) {
                console.log(`Skipping unchanged value at row ${row}, col ${col}`)
                continue
            }
            
            // Debug log for team column changes
            if (isTeamColumn) {
                console.log("=== Team column changed ===", { 
                    row, 
                    col, 
                    oldValue, 
                    newValue, 
                    source,
                    oldValueType: typeof oldValue,
                    newValueType: typeof newValue,
                    valuesEqual: valuesEqual,
                    oldValueStr: String(oldValue || "").trim(),
                    newValueStr: String(newValue || "").trim(),
                    trimmedEqual: String(oldValue || "").trim() === String(newValue || "").trim()
                })
            }
            // Validate row index
            if (row < 0 || row >= filteredData.length) {
                console.error(`Invalid row index: ${row}, filteredData length: ${filteredData.length}`)
                continue
            }
            
            // Get current row data from filtered data (this is the row user is editing)
            const currentRowData = filteredData[row]
            if (!currentRowData || !Array.isArray(currentRowData)) {
                console.error(`Invalid row data at index ${row}:`, currentRowData)
                continue
            }
            
            // Get id from the filtered data - row index corresponds to filteredData index
            const idColumnIndex = activeTab === "NV" ? 10 : 8 // ID is at index 10 for NV, 8 for others
            const id = currentRowData[idColumnIndex] // Get id from the correct column based on role
            if (!id) {
                console.error(`No ID found for row ${row}, column ${idColumnIndex}:`, currentRowData)
                continue
            }
            
            // Get username from the same row to ensure we're updating the correct account
            const currentUsername = currentRowData[0] // Username is in column 0
            if (!currentUsername) {
                console.error(`No username found for row ${row}:`, currentRowData)
                continue
            }
            
            // Find corresponding row in tableData by ID (most reliable) or username (fallback)
            const tableDataRowIndex = tableData.findIndex(r => {
                const rowId = r[activeTab === "NV" ? 10 : 8]
                return rowId === id
            })
            
            // Validate we found the correct row
            if (tableDataRowIndex === -1) {
                console.error(`Could not find row in tableData for ID ${id}, username ${currentUsername}`)
                // Still continue, we have the ID and can update directly
            } else {
                // Double-check username matches
                const foundUsername = tableData[tableDataRowIndex][0]
                if (foundUsername !== currentUsername) {
                    console.warn(`Username mismatch: filteredData has ${currentUsername}, tableData has ${foundUsername} for ID ${id}`)
                }
            }

            try {
                let updateValue = newValue
                let fieldIndex: number

                // ============================================================
                // MAPPING TABLE FOR NV (Nhân viên)
                // ============================================================
                // Display Columns: [0:Username, 1:Password, 2:Tên, 3:Vai trò, 4:Chức vụ, 5:Telegram, 6:Trạng thái, 7:Team]
                // Data Array:      [0:username, 1:password, 2:name, 3:role, 4:position, 5:telegram, 6:active, 7:team, 8:created_at, 9:updated_at, 10:id]
                // API Fields:      [0:username, 1:password, 2:name, 3:role, 4:position, 5:created_at, 6:updated_at, 7:active, 8:team, 9:phone, 10:telegram]
                // Mapping: Chức vụ (col 4, data 4) → position (API field 4), Telegram (col 5, data 5) → telegram (API field 10), 
                //          Trạng thái (col 6, data 6) → active (API field 7), Team (col 7, data 7) → team (API field 8)
                // ============================================================
                
                if (activeTab === "NV") {
                    // Handle Chức vụ column (display col 4) → position field (API field 4)
                    if (col === 4) {
                        const validOptions = ["Bán hàng", "Data", "IT", "Leader"]
                        if (validOptions.includes(newValue)) {
                            updateValue = newValue
                        } else {
                            updateValue = "Bán hàng"
                        }
                        fieldIndex = 4 // position
                    }
                    // Handle Telegram column (display col 5) → telegram field (API field 10)
                    else if (col === 5) {
                        updateValue = String(newValue || "").trim()
                        fieldIndex = 10 // telegram
                    }
                    // Handle Team column (display col 7) → team field (API field 8)
                    else if (col === 7) {
                        console.log("Processing team update:", { oldValue, newValue, row, col })
                        
                        // Normalize team name
                        let teamName = newValue
                        if (typeof newValue === "string") {
                            teamName = newValue.trim()
                        } else if (newValue === null || newValue === undefined) {
                            teamName = ""
                        } else {
                            teamName = String(newValue).trim()
                        }
                        
                        const oldTeamName = oldValue ? String(oldValue).trim() : ""
                        const normalizedOldTeam = oldTeamName === "Chưa có team" ? "" : oldTeamName
                        const normalizedNewTeam = teamName === "Chưa có team" ? "" : teamName
                        
                        console.log("Team normalization:", {
                            originalOld: oldValue,
                            originalNew: newValue,
                            normalizedOld: normalizedOldTeam,
                            normalizedNew: normalizedNewTeam,
                            willUpdate: normalizedOldTeam !== normalizedNewTeam
                        })
                        
                        // Validate leader constraint when changing teams (only if actually changing)
                        if (normalizedOldTeam && normalizedOldTeam !== "" && normalizedNewTeam !== normalizedOldTeam) {
                            // Check if current user is a leader (has position "Leader")
                            const currentPosition = currentRowData[4] // Position is in column 4
                            const isCurrentUserLeader = currentPosition === "Leader"
                            
                            if (isCurrentUserLeader) {
                                const otherMembersInOldTeam = tableData.filter((r) => {
                                    return r[10] !== id && // Different account (ID is at index 10)
                                           r[7] === oldTeamName && // Same team (team is at index 7)
                                           r[3] === "Nhân viên" // Role is Nhân viên
                                })
                                
                                if (otherMembersInOldTeam.length === 0) {
                                    toast.error(`Team "${oldTeamName}" phải có tối thiểu 1 Leader. Vui lòng chỉ định Leader khác trước khi chuyển team.`)
                                    // Revert in filteredData
                                    filteredData[row][col] = oldValue
                                    // Revert in tableData as well
                                    if (tableDataRowIndex !== -1) {
                                        tableData[tableDataRowIndex][7] = oldTeamName
                                    }
                                    setTableData([...tableData])
                                    return
                                }
                            }
                        }
                        
                        // Convert to null if empty or "Chưa có team"
                        if (!teamName || teamName === "" || teamName === "Chưa có team" || teamName === "null") {
                            updateValue = null
                            teamName = "Chưa có team" // For display
                        } else {
                            updateValue = teamName
                        }
                        
                        // Update local data immediately for better UX
                        if (tableDataRowIndex !== -1) {
                            tableData[tableDataRowIndex][7] = teamName
                            setTableData([...tableData])
                        }
                        
                        fieldIndex = 8 // team
                    }
                    // Handle Trạng thái column (display col 6) → active field (API field 7)
                    else if (col === 6) {
                        if (newValue === "Active" || newValue === "Không hoạt động") {
                            updateValue = newValue
                        } else {
                            updateValue = "Active"
                        }
                        fieldIndex = 7 // active
                    }
                    // Handle other columns: 0,1,2,3 (Username, Password, Tên, Vai trò)
                    else {
                        // Map display column to API field using getColumns()
                        const columns = getColumns()
                        if (columns && columns[col]) {
                            const dataCol = columns[col].data
                            // Direct mapping: dataCol index = API field index for most fields
                            if (dataCol === 0) fieldIndex = 0 // username
                            else if (dataCol === 1) fieldIndex = 1 // password
                            else if (dataCol === 2) fieldIndex = 2 // name
                            else if (dataCol === 3) fieldIndex = 3 // role
                            else {
                                console.error(`Unknown dataCol ${dataCol} for display column ${col}`)
                                return
                            }
                        } else {
                            console.error(`No column mapping found for display column ${col}`)
                            return
                        }
                    }
                }
                // Handle NCC and KH tabs
                else if (activeTab === "NCC" || activeTab === "KH") {
                    if (col === 2) {
                        // Country column
                        if (newValue === "Việt Nam" || newValue === "Nước Ngoài") {
                            updateValue = newValue
                        } else {
                            updateValue = "Việt Nam"
                        }
                        fieldIndex = 2 // name field stores country for NCC/KH
                    } else {
                        // For other columns in NCC/KH, use simple mapping
                        fieldIndex = col >= 4 ? col - 1 : col
                    }
                }
                // Handle Admin tab
                else {
                    // Simple mapping for Admin
                    fieldIndex = col >= 4 ? col - 1 : col
                }
                
                // Final validation - ensure fieldIndex is set
                if (fieldIndex === undefined) {
                    console.error(`Failed to determine fieldIndex for column ${col} in tab ${activeTab}`)
                    toast.error("Không thể xác định trường cần cập nhật")
                    return
                }
                
                // Debug log for team updates
                if (col === 7 && activeTab === "NV") {
                    console.log("=== Updating team ===", { 
                        id, 
                        field: fieldIndex, 
                        value: updateValue,
                        oldValue: oldValue,
                        column: col,
                        username: currentUsername,
                        expectedField: 8,
                        isCorrect: fieldIndex === 8,
                        tableDataRowIndex: tableDataRowIndex
                    })
                    // Double-check team field is correct
                    if (fieldIndex !== 8) {
                        console.error(`CRITICAL: Team update fieldIndex is ${fieldIndex}, should be 8!`)
                        fieldIndex = 8
                    }
                }
                
                console.log(`Calling API update: id=${id}, field=${fieldIndex}, value=${updateValue}`)
                const result: any = await authApiRequest.update({
                    id,
                    field: String(fieldIndex),
                    value: updateValue,
                })
                console.log("API update result:", result)

                if (!result.success) {
                    console.error("Update failed:", result)
                    toast.error(result.message || "Có lỗi xảy ra khi cập nhật tài khoản")
                    // Revert the change in both filteredData and tableData
                    filteredData[row][col] = oldValue
                    if (tableDataRowIndex !== -1 && col === 7 && activeTab === "NV") {
                        // Revert team in tableData (team is at index 7)
                        tableData[tableDataRowIndex][7] = oldValue ? String(oldValue).trim() : "Chưa có team"
                    } else if (tableDataRowIndex !== -1) {
                        // Revert other fields
                        const columns = getColumns()
                        if (columns && columns[col]) {
                            const dataCol = columns[col].data
                            tableData[tableDataRowIndex][dataCol] = oldValue
                        }
                    }
                    setTableData([...tableData])
                } else {
                    toast.success("Cập nhật tài khoản thành công")
                    console.log("Update successful, reloading data...")
                    // Wait a bit for database to update
                    await new Promise(resolve => setTimeout(resolve, 500))
                    // Always reload data to sync display
                    await fetchAccountData()
                    console.log("Data reloaded")
                }
            } catch (error: any) {
                console.error("Error updating account:", error)
                // Revert the change in both filteredData and tableData
                filteredData[row][col] = oldValue
                if (tableDataRowIndex !== -1 && col === 7 && activeTab === "NV") {
                    // Revert team in tableData (team is at index 7)
                    tableData[tableDataRowIndex][7] = oldValue ? String(oldValue).trim() : "Chưa có team"
                } else if (tableDataRowIndex !== -1) {
                    // Revert other fields
                    const columns = getColumns()
                    if (columns && columns[col]) {
                        const dataCol = columns[col].data
                        tableData[tableDataRowIndex][dataCol] = oldValue
                    }
                }
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
                const id = filteredData[row][activeTab === "NV" ? 10 : 8] // Get id from the correct column based on role
                if (!id) continue

                for (let col = startCol; col <= endCol; col++) {
                    const dataRow = row - startRow
                    const dataCol = col - startCol
                    const newValue = data[dataRow]?.[dataCol]

                    if (newValue !== undefined && newValue !== null && newValue !== "") {
                        try {
                            let updateValue = newValue
                            let fieldIndex: number

                            // Use same mapping logic as handleAfterChange
                            if (activeTab === "NV") {
                                // Handle Chức vụ column (display col 4) → position field (API field 4)
                                if (col === 4) {
                                    const validOptions = ["Bán hàng", "Data", "IT", "Leader"]
                                    if (validOptions.includes(newValue)) {
                                        updateValue = newValue
                                    } else {
                                        updateValue = "Bán hàng"
                                    }
                                    fieldIndex = 4 // position
                                }
                                // Handle Telegram column (display col 5) → telegram field (API field 10)
                                else if (col === 5) {
                                    updateValue = String(newValue || "").trim()
                                    fieldIndex = 10 // telegram
                                }
                                // Handle Team column (display col 7) → team field (API field 8)
                                else if (col === 7) {
                                    let teamName = typeof newValue === "string" ? newValue.trim() : String(newValue).trim()
                                    if (!teamName || teamName === "" || teamName === "Chưa có team" || teamName === "null") {
                                        updateValue = null
                                    } else {
                                        updateValue = teamName
                                    }
                                    fieldIndex = 8 // team
                                }
                                // Handle Trạng thái column (display col 6) → active field (API field 7)
                                else if (col === 6) {
                                    if (newValue === "Active" || newValue === "Không hoạt động") {
                                        updateValue = newValue
                                    } else {
                                        updateValue = "Active"
                                    }
                                    fieldIndex = 7 // active
                                }
                                // Handle other columns: 0,1,2,3 (Username, Password, Tên, Vai trò)
                                else {
                                    const columns = getColumns()
                                    if (columns && columns[col]) {
                                        const dataCol = columns[col].data
                                        if (dataCol === 0) fieldIndex = 0 // username
                                        else if (dataCol === 1) fieldIndex = 1 // password
                                        else if (dataCol === 2) fieldIndex = 2 // name
                                        else if (dataCol === 3) fieldIndex = 3 // role
                                        else {
                                            console.error(`Unknown dataCol ${dataCol} for display column ${col} in paste`)
                                            continue
                                        }
                                    } else {
                                        console.error(`No column mapping found for display column ${col} in paste`)
                                        continue
                                    }
                                }
                            } else if (activeTab === "NCC" || activeTab === "KH") {
                                if (col === 2) {
                                    if (newValue === "Việt Nam" || newValue === "Nước Ngoài") {
                                        updateValue = newValue
                                    } else {
                                        updateValue = "Việt Nam"
                                    }
                                    fieldIndex = 2
                                } else {
                                    fieldIndex = col >= 4 ? col - 1 : col
                                }
                            } else {
                                fieldIndex = col >= 4 ? col - 1 : col
                            }

                            if (fieldIndex === undefined) {
                                console.error(`Failed to determine fieldIndex for column ${col} in paste`)
                                continue
                            }

                            const result: any = await authApiRequest.update({
                                id: id,
                                field: String(fieldIndex),
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
            if (activeTab === "NV") {
                // Find team name by ID
                if (selectedTeamId) {
                    const selectedTeam = teams.find(t => t.id === selectedTeamId)
                    if (selectedTeam) {
                        createData.team = selectedTeam.name
                    }
                }
                // Set default Telegram (position) to "" for new employees
                createData.position = ""
                // Set default Chức vụ (phone) to "Bán hàng" for new employees
                createData.phone = "Bán hàng"
            }

            // Add country for NCC and KH accounts
            if (activeTab === "NCC" || activeTab === "KH") {
                createData.country = "Việt Nam" // Default country for new NCC and KH accounts
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
        const id = filteredData[rowIndex][activeTab === "NV" ? 10 : 8] // Lấy id đúng cột theo loại tài khoản
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
                { data: 4 }, // Phone → Chức vụ
                { data: 5 }, // Position → Telegram
                { data: 6 }, // Active → Trạng thái
                { data: 7 }, // Team
            ]
        } else if (activeTab === "NCC" || activeTab === "KH") {
            return [
                { data: 0 }, // Username
                { data: 1 }, // Password
                { data: 2 }, // Country
                { data: 3 }, // Role
                { data: 4 }, // Created at
                { data: 5 }, // Updated at
                { data: 6 }, // Status
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
                                        {userInfo.role === "Nhân viên" ? (
                                            // Only show NCC tab for users with role "Nhân viên"
                                            <button
                                                onClick={() => setActiveTab("NCC")}
                                                className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "NCC" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                                    }`}
                                            >
                                                <Truck className="h-4 w-4 mr-1" />
                                                Nhà cung cấp
                                            </button>
                                        ) : (
                                            // Show all tabs for Admin users
                                            <>
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
                                            </>
                                        )}
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
                                                    {teams.filter(t => t.active === "Hoạt động").map((team) => (
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
                                    columnSorting={false}
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
