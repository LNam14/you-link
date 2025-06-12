"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { HotTable } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import "./custom-table.css"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import Handsontable from "handsontable"
import { toast, Toaster } from "sonner"
import { RefreshCw, Search, Plus, X } from "lucide-react"
import { debounce } from "lodash"
import customerApiRequest from "@/apiRequests/customer"

registerAllModules()

// Add status options and colors
const STATUS_OPTIONS = {
    binh_thuong: { label: "Bình thường", color: "#16A34A", bgColor: "#DCFCE7" }, // green
    rui_ro: { label: "Rủi ro", color: "#D97706", bgColor: "#FEF3C7" }, // amber
    rui_ro_cao: { label: "Rủi ro cao", color: "#DC2626", bgColor: "#FEE2E2" }, // red
    scam: { label: "Scam", color: "#7F1D1D", bgColor: "#FEE2E2" }, // dark red
} as const

// Add phan loai options and colors
const PHAN_LOAI_OPTIONS = {
    vip: { label: "VIP", color: "#7C3AED", bgColor: "#EDE9FE" }, // purple
    mua_nhieu: { label: "Mua nhiều", color: "#2563EB", bgColor: "#DBEAFE" }, // blue
    binh_thuong: { label: "Bình thường", color: "#6B7280", bgColor: "#F3F4F6" }, // gray
} as const

// Add phien ban options and colors
const PHIEN_BAN_OPTIONS = {
    pb1: { label: "PB1", color: "#059669", bgColor: "#D1FAE5" }, // green
    pb2: { label: "PB2", color: "#D97706", bgColor: "#FEF3C7" }, // amber
    pb3: { label: "PB3", color: "#DC2626", bgColor: "#FEE2E2" }, // red
} as const

// Add order options and colors
const ORDER_OPTIONS = {
    dang_mh: { label: "Đang MH", color: "#16A34A", bgColor: "#DCFCE7" }, // green
    hai_tuan_km: { label: "2 Tuần KM", color: "#2563EB", bgColor: "#DBEAFE" }, // blue
    bon_tuan_km: { label: "4 Tuần KM", color: "#D97706", bgColor: "#FEF3C7" }, // amber
    lau_ko_mua: { label: "Lâu Ko Mua", color: "#DC2626", bgColor: "#FEE2E2" }, // red
} as const

type StatusType = keyof typeof STATUS_OPTIONS
type PhanLoaiType = keyof typeof PHAN_LOAI_OPTIONS
type PhienBanType = keyof typeof PHIEN_BAN_OPTIONS
type OrderType = keyof typeof ORDER_OPTIONS

// Update interface to match API
interface CustomerData {
    id?: number
    maMoi: string
    maCu: string
    phanLoai: string
    phienBan: string
    oder: string
    cty: string
    team: string
    chucVu: string
    telegram: string
    username: string
    khac: string
    linkNhom: string
    idNhom: string
    info: string
    nhom: string
    nguoiCham1: string
    nguoiCham2: string
    tabDon: string
    congNo: string
    tinDung: string
    tinhTrang: StatusType
    ngayCheck: string
    noteKT: string
}

// Add new type for API response
interface CustomerApiResponse {
    customers: CustomerData[]
    staffNames: string[]
    teamNames: string[]
}

// Add new type for create API response
interface CreateCustomerResponse {
    customers: CustomerData[]
}

// Add new type for API data
interface ApiCustomerData {
    id?: number
    ma_moi: string
    ma_cu: string
    phan_loai: string
    phien_ban: string
    oder: string
    cty: string
    team: string
    chuc_vu: string
    telegram: string
    username: string
    khac: string
    link_nhom: string
    id_nhom: string
    info: string
    nhom: string
    nguoi_cham1: string
    nguoi_cham2: string
    tab_don: string
    cong_no: string
    tin_dung: string
    tinh_trang: StatusType
    ngay_check: string
    note_kt: string
}

// Add utility functions before component
const calculateDaysDifference = (checkDate: string) => {
    if (!checkDate) return ""

    const [day, month, year] = checkDate.split("/").map(Number)
    const checkDateObj = new Date(year, month - 1, day)
    const today = new Date()

    // Reset time part for accurate day calculation
    checkDateObj.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    const diffTime = Math.abs(today.getTime() - checkDateObj.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays.toString()
}

const getCurrentDateFormatted = () => {
    const today = new Date()
    const day = String(today.getDate()).padStart(2, "0")
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const year = today.getFullYear()
    return `${day}/${month}/${year}`
}

// Helper function to safely set element content
const safeSetElementContent = (element: HTMLElement, content: string, useInnerHTML = false) => {
    try {
        // Check if element is still connected to the DOM
        if (!element.isConnected) {
            console.warn("Attempted to modify disconnected DOM element")
            return false
        }

        if (useInnerHTML) {
            element.innerHTML = content
        } else {
            element.textContent = content
        }
        return true
    } catch (error) {
        console.warn("Failed to set element content:", error)
        return false
    }
}

// Helper function to safely clear element content
const safeClearElement = (element: HTMLElement) => {
    try {
        if (!element.isConnected) {
            return false
        }
        element.innerHTML = ""
        return true
    } catch (error) {
        console.warn("Failed to clear element:", error)
        return false
    }
}

// Remove type definition for header
type NestedColumnHeader = {
    label: string
    colspan: number
}

export default function AccountTracker() {
    const [tableData, setTableData] = useState<CustomerData[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedTeam, setSelectedTeam] = useState("")
    const [showAddModal, setShowAddModal] = useState(false)
    const [numberOfRows, setNumberOfRows] = useState("")
    const [staffNames, setStaffNames] = useState<string[]>([])
    const [teamNames, setTeamNames] = useState<string[]>([])
    const hotTableRef = useRef<any>(null)
    const [isPasting, setIsPasting] = useState(false)
    const pasteTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const fetchCustomers = async () => {
        // Prevent multiple simultaneous fetches
        if (isLoading) return

        try {
            setIsLoading(true)
            const response: any = await customerApiRequest.get()
            console.log("API Response:", response)

            // Store staff and team names
            setStaffNames(response.staffNames || [])
            setTeamNames(response.teamNames || [])

            // Check if customers is an array before mapping
            if (!Array.isArray(response.customers)) {
                console.error("API did not return an array:", response.customers)
                toast.error("Định dạng dữ liệu khách hàng không hợp lệ từ server")
                setTableData([])
                return
            }

            // Transform API data to match our table format
            const transformedData = response.customers.map((customer: any) => ({
                id: customer.id,
                maMoi: customer.ma_moi,
                maCu: customer.ma_cu,
                phanLoai: customer.phan_loai,
                phienBan: customer.phien_ban,
                oder: customer.oder,
                cty: customer.cty,
                team: customer.team,
                chucVu: customer.chuc_vu,
                telegram: customer.telegram,
                username: customer.username,
                khac: customer.khac,
                linkNhom: customer.link_nhom,
                idNhom: customer.id_nhom,
                info: customer.info,
                nhom: customer.nhom,
                nguoiCham1: customer.nguoi_cham1,
                nguoiCham2: customer.nguoi_cham2,
                tabDon: customer.tab_don,
                congNo: customer.cong_no,
                tinDung: customer.tin_dung,
                tinhTrang: customer.tinh_trang as StatusType,
                ngayCheck: customer.ngay_check,
                noteKT: customer.note_kt,
            })) as CustomerData[]

            setTableData(transformedData)
        } catch (error) {
            console.error("Error fetching customers:", error)
            setTableData([])
        } finally {
            // Ensure loading state is always reset
            setTimeout(() => {
                setIsLoading(false)
            }, 100) // Small delay to prevent flickering
        }
    }

    // Add debounce to prevent rapid clicks
    const debouncedFetchCustomers = useCallback(
        debounce(() => {
            fetchCustomers()
        }, 300),
        [],
    )

    useEffect(() => {
        fetchCustomers()
    }, [])

    // Update the refresh button click handler
    const handleRefresh = () => {
        if (!isLoading) {
            debouncedFetchCustomers()
        }
    }

    // Update transformToApiFormat function
    const transformToApiFormat = (data: CustomerData): ApiCustomerData => ({
        id: data.id,
        ma_moi: data.maMoi,
        ma_cu: data.maCu,
        phan_loai: data.phanLoai,
        phien_ban: data.phienBan,
        oder: data.oder,
        cty: data.cty,
        team: data.team,
        chuc_vu: data.chucVu,
        telegram: data.telegram,
        username: data.username,
        khac: data.khac,
        link_nhom: data.linkNhom,
        id_nhom: data.idNhom,
        info: data.info,
        nhom: data.nhom,
        nguoi_cham1: data.nguoiCham1,
        nguoi_cham2: data.nguoiCham2,
        tab_don: data.tabDon,
        cong_no: data.congNo,
        tin_dung: data.tinDung,
        tinh_trang: data.tinhTrang,
        ngay_check: data.ngayCheck,
        note_kt: data.noteKT,
    })

    // Update filteredData to remove header logic
    const filteredData = (() => {
        // First filter by search term
        const searchFiltered = tableData.filter((row: CustomerData) => {
            const searchFields = ["maMoi", "phanLoai", "cty", "team", "nhom", "nguoiCham1"] as const
            return (
                searchTerm === "" ||
                searchFields.some((field) => {
                    const value = row[field]
                    if (Array.isArray(value)) {
                        return value.some((item) => item.toLowerCase().includes(searchTerm.toLowerCase()))
                    }
                    return (value?.toString().toLowerCase() || "").includes(searchTerm.toLowerCase())
                })
            )
        })

        // Filter by selected team
        return selectedTeam === "" ? searchFiltered : searchFiltered.filter((row) => row.nhom === selectedTeam)
    })()

    // Fix cells function
    const cells = function (
        this: Handsontable.CellProperties,
        row: number,
        col: number,
        prop: string | number,
    ): Handsontable.CellMeta {
        const cellProperties: Handsontable.CellMeta = {
            className: "htMiddle htCenter",
            wordWrap: false,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            renderer: function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties,
            ) {
                // For regular rows, allow editing based on the column
                cellProperties.readOnly = ["congNo"].includes(prop as string)

                // Regular cell rendering
                Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties])
                td.style.textAlign = "center"
                td.style.verticalAlign = "middle"
            },
        }

        // Format Order column
        if (prop === "oder") {
            cellProperties.renderer = (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: OrderType,
                cellProperties: Handsontable.CellProperties,
            ) => {
                const select = document.createElement("select")
                select.style.width = "100%"
                select.style.height = "100%"
                select.style.padding = "4px 8px"
                select.style.borderRadius = "4px"
                select.style.border = "1px solid #E5E7EB"
                select.style.backgroundColor = value ? ORDER_OPTIONS[value]?.bgColor : "white"
                select.style.color = value ? ORDER_OPTIONS[value]?.color : "#6B7280"
                select.style.cursor = "pointer"
                select.style.textAlign = "center"
                select.style.fontSize = "11px"
                select.style.appearance = "none"
                select.style.webkitAppearance = "none"
                select.style.transition = "all 0.2s ease"
                select.style.fontWeight = value ? "500" : "normal"
                select.style.pointerEvents = "auto"

                // Add empty option first
                const emptyOption = document.createElement("option")
                emptyOption.value = ""
                emptyOption.textContent = "---"
                select.appendChild(emptyOption)

                // Add order options
                Object.entries(ORDER_OPTIONS).forEach(([key, order]) => {
                    const option = document.createElement("option")
                    option.value = key
                    option.textContent = order.label
                    if (value === key) {
                        option.selected = true
                    }
                    select.appendChild(option)
                })

                // Prevent direct input
                select.addEventListener("keydown", (e) => {
                    e.preventDefault()
                })

                select.addEventListener("change", (e) => {
                    const newValue = (e.target as HTMLSelectElement).value as OrderType
                    instance.setDataAtCell(row, col, newValue)
                })

                select.addEventListener("mouseover", () => {
                    select.style.backgroundColor = value ? ORDER_OPTIONS[value]?.bgColor : "#F9FAFB"
                    select.style.borderColor = "#93C5FD"
                })

                select.addEventListener("mouseout", () => {
                    select.style.backgroundColor = value ? ORDER_OPTIONS[value]?.bgColor : "white"
                    select.style.borderColor = "#E5E7EB"
                })

                try {
                    if (safeClearElement(td)) {
                        td.style.padding = "0"
                        td.appendChild(select)
                        td.style.textAlign = "center"
                        td.style.verticalAlign = "middle"
                        td.contentEditable = "false"
                    }
                } catch (error) {
                    console.warn("Failed to append select element:", error)
                }
            }
        }

        // Format Phiên Bản column
        if (prop === "phienBan") {
            cellProperties.renderer = (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: PhienBanType,
                cellProperties: Handsontable.CellProperties,
            ) => {
                const select = document.createElement("select")
                select.style.width = "100%"
                select.style.height = "100%"
                select.style.padding = "4px 8px"
                select.style.borderRadius = "4px"
                select.style.border = "1px solid #E5E7EB"
                select.style.backgroundColor = value ? PHIEN_BAN_OPTIONS[value]?.bgColor : "white"
                select.style.color = value ? PHIEN_BAN_OPTIONS[value]?.color : "#6B7280"
                select.style.cursor = "pointer"
                select.style.textAlign = "center"
                select.style.fontSize = "11px"
                select.style.appearance = "none"
                select.style.webkitAppearance = "none"
                select.style.transition = "all 0.2s ease"
                select.style.fontWeight = value ? "500" : "normal"
                select.style.pointerEvents = "auto"

                // Add empty option first
                const emptyOption = document.createElement("option")
                emptyOption.value = ""
                emptyOption.textContent = "---"
                select.appendChild(emptyOption)

                // Add phien ban options
                Object.entries(PHIEN_BAN_OPTIONS).forEach(([key, phienBan]) => {
                    const option = document.createElement("option")
                    option.value = key
                    option.textContent = phienBan.label
                    if (value === key) {
                        option.selected = true
                    }
                    select.appendChild(option)
                })

                // Prevent direct input
                select.addEventListener("keydown", (e) => {
                    e.preventDefault()
                })

                select.addEventListener("change", (e) => {
                    const newValue = (e.target as HTMLSelectElement).value as PhienBanType
                    instance.setDataAtCell(row, col, newValue)
                })

                select.addEventListener("mouseover", () => {
                    select.style.backgroundColor = value ? PHIEN_BAN_OPTIONS[value]?.bgColor : "#F9FAFB"
                    select.style.borderColor = "#93C5FD"
                })

                select.addEventListener("mouseout", () => {
                    select.style.backgroundColor = value ? PHIEN_BAN_OPTIONS[value]?.bgColor : "white"
                    select.style.borderColor = "#E5E7EB"
                })

                try {
                    if (safeClearElement(td)) {
                        td.style.padding = "0"
                        td.appendChild(select)
                        td.style.textAlign = "center"
                        td.style.verticalAlign = "middle"
                        td.contentEditable = "false"
                    }
                } catch (error) {
                    console.warn("Failed to append select element:", error)
                }
            }
        }

        // Format Phân Loại column
        if (prop === "phanLoai") {
            cellProperties.renderer = (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: PhanLoaiType,
                cellProperties: Handsontable.CellProperties,
            ) => {
                const select = document.createElement("select")
                select.style.width = "100%"
                select.style.height = "100%"
                select.style.padding = "4px 8px"
                select.style.borderRadius = "4px"
                select.style.border = "1px solid #E5E7EB"
                select.style.backgroundColor = value ? PHAN_LOAI_OPTIONS[value]?.bgColor : "white"
                select.style.color = value ? PHAN_LOAI_OPTIONS[value]?.color : "#6B7280"
                select.style.cursor = "pointer"
                select.style.textAlign = "center"
                select.style.fontSize = "11px"
                select.style.appearance = "none"
                select.style.webkitAppearance = "none"
                select.style.transition = "all 0.2s ease"
                select.style.fontWeight = value ? "500" : "normal"
                select.style.pointerEvents = "auto"

                // Add empty option first
                const emptyOption = document.createElement("option")
                emptyOption.value = ""
                emptyOption.textContent = "---"
                select.appendChild(emptyOption)

                // Add phan loai options
                Object.entries(PHAN_LOAI_OPTIONS).forEach(([key, phanLoai]) => {
                    const option = document.createElement("option")
                    option.value = key
                    option.textContent = phanLoai.label
                    if (value === key) {
                        option.selected = true
                    }
                    select.appendChild(option)
                })

                // Prevent direct input
                select.addEventListener("keydown", (e) => {
                    e.preventDefault()
                })

                select.addEventListener("change", (e) => {
                    const newValue = (e.target as HTMLSelectElement).value as PhanLoaiType
                    instance.setDataAtCell(row, col, newValue)
                })

                select.addEventListener("mouseover", () => {
                    select.style.backgroundColor = value ? PHAN_LOAI_OPTIONS[value]?.bgColor : "#F9FAFB"
                    select.style.borderColor = "#93C5FD"
                })

                select.addEventListener("mouseout", () => {
                    select.style.backgroundColor = value ? PHAN_LOAI_OPTIONS[value]?.bgColor : "white"
                    select.style.borderColor = "#E5E7EB"
                })

                try {
                    if (safeClearElement(td)) {
                        td.style.padding = "0"
                        td.appendChild(select)
                        td.style.textAlign = "center"
                        td.style.verticalAlign = "middle"
                        td.contentEditable = "false"
                    }
                } catch (error) {
                    console.warn("Failed to append select element:", error)
                }
            }
        }

        // Format Team (nhom) column
        if (prop === "nhom") {
            cellProperties.renderer = (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: string,
                cellProperties: Handsontable.CellProperties,
            ) => {
                const select = document.createElement("select")
                select.style.width = "100%"
                select.style.height = "100%"
                select.style.padding = "4px 8px"
                select.style.borderRadius = "4px"
                select.style.border = "1px solid #E5E7EB"
                select.style.backgroundColor = value ? "#EFF6FF" : "white"
                select.style.color = value ? "#1E40AF" : "#6B7280"
                select.style.cursor = "pointer"
                select.style.textAlign = "center"
                select.style.fontSize = "11px"
                select.style.appearance = "none"
                select.style.webkitAppearance = "none"
                select.style.transition = "all 0.2s ease"
                select.style.fontWeight = value ? "500" : "normal"
                select.style.pointerEvents = "auto"

                // Add empty option first
                const emptyOption = document.createElement("option")
                emptyOption.value = ""
                emptyOption.textContent = "---"
                select.appendChild(emptyOption)

                // Add team options
                teamNames.forEach((team) => {
                    const option = document.createElement("option")
                    option.value = team
                    option.textContent = team
                    if (value === team) {
                        option.selected = true
                    }
                    select.appendChild(option)
                })

                // Prevent direct input
                select.addEventListener("keydown", (e) => {
                    e.preventDefault()
                })

                select.addEventListener("change", (e) => {
                    const newValue = (e.target as HTMLSelectElement).value
                    instance.setDataAtCell(row, col, newValue)
                })

                select.addEventListener("mouseover", () => {
                    select.style.backgroundColor = value ? "#DBEAFE" : "#F9FAFB"
                    select.style.borderColor = "#93C5FD"
                })

                select.addEventListener("mouseout", () => {
                    select.style.backgroundColor = value ? "#EFF6FF" : "white"
                    select.style.borderColor = "#E5E7EB"
                })

                try {
                    if (safeClearElement(td)) {
                        td.style.padding = "0"
                        td.appendChild(select)
                        td.style.textAlign = "center"
                        td.style.verticalAlign = "middle"
                        td.contentEditable = "false"
                    }
                } catch (error) {
                    console.warn("Failed to append select element:", error)
                }
            }
        }

        // Format Tình Trạng column
        if (prop === "tinhTrang") {
            cellProperties.renderer = (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: StatusType,
                cellProperties: Handsontable.CellProperties,
            ) => {
                const select = document.createElement("select")
                select.style.width = "100%"
                select.style.height = "100%"
                select.style.padding = "4px 8px"
                select.style.borderRadius = "4px"
                select.style.border = "1px solid #E5E7EB"
                select.style.backgroundColor = value ? STATUS_OPTIONS[value]?.bgColor : "white"
                select.style.color = value ? STATUS_OPTIONS[value]?.color : "#6B7280"
                select.style.cursor = "pointer"
                select.style.textAlign = "center"
                select.style.fontSize = "11px"
                select.style.appearance = "none"
                select.style.webkitAppearance = "none"
                select.style.transition = "all 0.2s ease"
                select.style.fontWeight = value ? "500" : "normal"
                select.style.pointerEvents = "auto"

                // Add empty option first
                const emptyOption = document.createElement("option")
                emptyOption.value = ""
                emptyOption.textContent = "---"
                select.appendChild(emptyOption)

                // Add status options
                Object.entries(STATUS_OPTIONS).forEach(([key, status]) => {
                    const option = document.createElement("option")
                    option.value = key
                    option.textContent = status.label
                    if (value === key) {
                        option.selected = true
                    }
                    select.appendChild(option)
                })

                // Prevent direct input
                select.addEventListener("keydown", (e) => {
                    e.preventDefault()
                })

                select.addEventListener("change", (e) => {
                    const newValue = (e.target as HTMLSelectElement).value as StatusType
                    instance.setDataAtCell(row, col, newValue)
                })

                select.addEventListener("mouseover", () => {
                    select.style.backgroundColor = value ? STATUS_OPTIONS[value]?.bgColor : "#F9FAFB"
                    select.style.borderColor = "#93C5FD"
                })

                select.addEventListener("mouseout", () => {
                    select.style.backgroundColor = value ? STATUS_OPTIONS[value]?.bgColor : "white"
                    select.style.borderColor = "#E5E7EB"
                })

                try {
                    if (safeClearElement(td)) {
                        td.style.padding = "0"
                        td.appendChild(select)
                        td.style.textAlign = "center"
                        td.style.verticalAlign = "middle"
                        td.contentEditable = "false"
                    }
                } catch (error) {
                    console.warn("Failed to append select element:", error)
                }
            }
        }

        // Format Tab Đơn column
        if (prop === "tabDon") {
            cellProperties.renderer = (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: string,
                cellProperties: Handsontable.CellProperties,
            ) => {
                if (value) {
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
                    link.title = value
                    link.textContent = value

                    try {
                        if (safeClearElement(td)) {
                            td.appendChild(link)
                        }
                    } catch (error) {
                        console.warn("Failed to append link element:", error)
                        safeSetElementContent(td, value)
                    }
                } else {
                    safeSetElementContent(td, "")
                }
            }
        }

        // Format Công Nợ column
        if (prop === "congNo") {
            cellProperties.renderer = (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: string,
                cellProperties: Handsontable.CellProperties,
            ) => {
                Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties])

                // Get Tín Dụng value from the same row
                const tinDungValue = instance.getDataAtCell(row, instance.propToCol("tinDung")) as string

                // Convert both values to numbers, handling empty or invalid values
                const congNoNum = Number.parseFloat(value?.replace(/[^0-9.-]+/g, "") || "0")
                const tinDungNum = Number.parseFloat(tinDungValue?.replace(/[^0-9.-]+/g, "") || "0")

                // Compare values and set color
                if (congNoNum - tinDungNum > 0) {
                    td.style.color = "#DC2626" // Red for positive difference
                    td.style.backgroundColor = "#FEE2E2" // Light red background
                } else {
                    td.style.color = "#16A34A" // Green for zero or negative difference
                    td.style.backgroundColor = "#DCFCE7" // Light green background
                }

                td.style.fontWeight = "500"
                td.style.textAlign = "center"
                td.style.verticalAlign = "middle"
                td.style.borderRadius = "4px"
                td.style.padding = "4px 8px"
            }
        }

        return cellProperties
    }

    // Update columns configuration
    const columns = [
        {
            data: "maMoi",
            width: 60,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: true,
        },
        {
            data: "maCu",
            width: 70,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: true,
        },
        {
            data: "phanLoai",
            width: 80,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: false,
        },
        {
            data: "phienBan",
            width: 70,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: false,
        },
        {
            data: "oder",
            width: 80,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: false,
        },
        {
            data: "cty",
            width: 60,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: false,
        },
        {
            data: "team",
            width: 80,
            className: "htMiddle htCenter",
            readOnly: true,
        },
        {
            data: "chucVu",
            width: 80,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: false,
        },
        {
            data: "telegram",
            width: 70,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: false,
        },
        {
            data: "username",
            width: 80,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: false,
        },
        {
            data: "khac",
            width: 70,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: false,
        },
        {
            data: "linkNhom",
            width: 80,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: false,
        },
        {
            data: "idNhom",
            width: 70,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: true,
        },
        {
            data: "info",
            width: 80,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: false,
        },
        {
            data: "nhom",
            width: 80,
            className: "htMiddle htCenter",
            readOnly: true,
        },
        {
            data: "nguoiCham1",
            width: 100,
            className: "htMiddle htCenter",
            readOnly: true,
        },
        {
            data: "nguoiCham2",
            width: 100,
            className: "htMiddle htCenter",
            readOnly: true,
        },
        {
            data: "tabDon",
            width: 80,
            className: "htMiddle htCenter",
            renderer: "html",
            readOnly: false,
        },
        {
            data: "congNo",
            width: 70,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: true,
        },
        {
            data: "tinDung",
            width: 70,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: false,
        },
        {
            data: "tinhTrang",
            width: 90,
            className: "htMiddle htCenter",
            readOnly: true,
        },
        {
            data: "ngayCheck",
            width: 90,
            className: "htMiddle htCenter",
            readOnly: true,
        },
        {
            data: "demNgay",
            width: 80,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: true,
            getData: (row: number, col: number, prop: string | number, value: any, instance: Handsontable.Core) => {
                const checkDate = instance.getDataAtCell(row, instance.propToCol("ngayCheck")) as string
                return calculateDaysDifference(checkDate)
            },
        },
        {
            data: "noteKT",
            width: 80,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: false,
        },
    ]

    const RowHeader2 = [
        "Mã Mới",
        "Mã Cũ",
        "Phân Loại",
        "Phiên Bản",
        "Order",
        "CTY",
        "Team",
        "Chức Vụ",
        "Telegram",
        "Username",
        "Khác",
        "Link Nhóm",
        "ID nhóm",
        "Info",
        "Nhóm",
        "Ng Chăm 1",
        "Ng Chăm 2",
        "Tab Đơn",
        "Công Nợ",
        "Tín Dụng",
        "Tình Trạng",
        "Ngày check",
        "Đếm ngày",
        "Note KT",
    ]

    // Update handleAfterChange
    const handleAfterChange = async (changes: any[] | null, source: string) => {
        // Skip nếu đang paste hoặc source là loadData
        if (!changes || source === "loadData" || isPasting) {
            return
        }

        // Skip nếu source là paste
        if (source === "paste") {
            return
        }

        try {
            for (const [row, prop, oldValue, newValue] of changes) {
                const actualRowIndex = findActualRowIndex(row)
                if (actualRowIndex === -1) continue

                // Get the actual data object for the edited row
                const hotInstance = hotTableRef.current?.hotInstance
                if (!hotInstance) continue

                const rowData = hotInstance.getSourceDataAtRow(row)
                if (!rowData) continue

                // Now we know it's a customer data row
                const customer = rowData as CustomerData
                if (!customer || !customer.id) {
                    console.warn("Attempted to update a row without a valid customer object or ID.", rowData)
                    continue
                }

                const updatedCustomer: any = { ...customer }

                try {
                    ; (updatedCustomer as any)[prop] = newValue
                    // Update API
                    await customerApiRequest.update(transformToApiFormat(updatedCustomer))

                    // Update local state directly
                    updateTableData(updatedCustomer)
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Không thể cập nhật dữ liệu"
                    toast.error(errorMessage)
                    console.error(`Error updating ${prop}:`, error)
                    // Revert the change in the table
                    const hotInstance = hotTableRef.current?.hotInstance
                    if (hotInstance) {
                        hotInstance.setDataAtCell(row, prop, oldValue)
                    }
                }
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra khi cập nhật dữ liệu")
            console.error("Error in handleAfterChange:", error)
        }
    }

    // Update handleAfterPaste to batch all changes into single API call
    const handleAfterPaste = async (data: any[][], coords: any[]) => {
        try {
            // Set flag để ngăn handleAfterChange chạy
            setIsPasting(true)

            // Clear timeout cũ nếu có
            if (pasteTimeoutRef.current) {
                clearTimeout(pasteTimeoutRef.current)
            }

            // Kiểm tra coords có hợp lệ không
            if (!coords || coords.length === 0 || !coords[0] || !coords[0].from || !coords[0].to) {
                console.warn("Invalid coords in paste operation:", coords)
                return
            }

            const updatedCustomers: CustomerData[] = []
            const changedCustomerIds = new Set<number>()

            const range = coords[0]
            const startRow = range.from.row
            const endRow = range.to.row
            const startCol = range.from.col
            const endCol = range.to.col

            console.log("Paste range:", { startRow, endRow, startCol, endCol })

            // Process each affected row
            for (let row = startRow; row <= endRow; row++) {
                // Kiểm tra row có hợp lệ không
                if (row < 0 || row >= filteredData.length) {
                    console.warn(`Row ${row} is out of bounds`)
                    continue
                }

                const customer = filteredData[row]
                if (!customer || !customer.id) {
                    console.warn(`Customer at row ${row} is invalid:`, customer)
                    continue
                }

                const updatedCustomer = { ...customer }
                let hasUpdates = false

                // Process each column in the paste range
                for (let col = startCol; col <= endCol; col++) {
                    // Kiểm tra column có hợp lệ không
                    if (col < 0 || col >= columns.length) {
                        console.warn(`Column ${col} is out of bounds`)
                        continue
                    }

                    const columnConfig = columns[col]
                    if (!columnConfig || columnConfig.readOnly) continue

                    const pasteRowIndex = row - startRow
                    const pasteColIndex = col - startCol

                    // Kiểm tra data có hợp lệ không
                    if (!data[pasteRowIndex] || pasteColIndex >= data[pasteRowIndex].length) {
                        continue
                    }

                    const newValue = data[pasteRowIndex][pasteColIndex]

                    if (newValue !== undefined && newValue !== null) {
                        const fieldName = columnConfig.data as keyof CustomerData

                        // Only update if the value is different
                        if (updatedCustomer[fieldName] !== newValue) {
                            ; (updatedCustomer as any)[fieldName] = typeof newValue === "string" ? newValue.trim() : newValue
                            hasUpdates = true
                        }
                    }
                }

                // Only add to update list if there are actual changes
                if (hasUpdates && customer.id) {
                    updatedCustomers.push(updatedCustomer)
                    changedCustomerIds.add(customer.id)
                }
            }

            // Make single batch API call if there are updates
            if (updatedCustomers.length > 0) {
                console.log(`Batch updating ${updatedCustomers.length} customers...`)

                // Transform to API format
                const apiCustomers = updatedCustomers.map(transformToApiFormat)

                // Make single API call using PATCH method for batch update
                const response = await fetch("/api/customer", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ customers: apiCustomers }),
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || "Failed to update customers")
                }

                const result = await response.json()
                console.log("Batch update result:", result)

                // Update local state with all changes at once
                setTableData((prevData) => {
                    return prevData.map((customer) => {
                        if (customer.id && changedCustomerIds.has(customer.id)) {
                            const updatedCustomer = updatedCustomers.find((uc) => uc.id === customer.id)
                            return updatedCustomer || customer
                        }
                        return customer
                    })
                })

                toast.success(`Đã cập nhật ${updatedCustomers.length} khách hàng trong 1 lần gọi API`)
            } else {
                console.log("No changes detected in paste operation")
            }
        } catch (error) {
            console.error("Error in batch paste update:", error)
            const errorMessage = error instanceof Error ? error.message : "Không thể cập nhật dữ liệu"
            toast.error(`Lỗi cập nhật hàng loạt: ${errorMessage}`)
        } finally {
            // Reset paste flag sau một khoảng thời gian ngắn
            pasteTimeoutRef.current = setTimeout(() => {
                setIsPasting(false)
            }, 500)
        }
    }

    // Add Modal Component
    const AddRowsModal = () => {
        if (!showAddModal) return null

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault()
            const numRows = Number.parseInt(numberOfRows)
            if (isNaN(numRows) || numRows <= 0) {
                toast.error("Vui lòng nhập số dòng hợp lệ")
                return
            }
            handleAddMultipleRows(numRows)
            setShowAddModal(false)
            setNumberOfRows("")
        }

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96 relative">
                    <button
                        onClick={() => setShowAddModal(false)}
                        className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <h3 className="text-lg font-semibold mb-4">Thêm dòng</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="rows" className="block text-sm font-medium text-gray-700 mb-1">
                                Số lượng dòng cần thêm
                            </label>
                            <input
                                type="number"
                                id="rows"
                                value={numberOfRows}
                                onChange={(e) => setNumberOfRows(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nhập số dòng"
                                min="1"
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                                Hủy
                            </button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                Thêm
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    // Modify handleAddRow to show modal
    const handleAddRow = () => {
        setShowAddModal(true)
    }

    // Update handleAddMultipleRows
    const handleAddMultipleRows = async (numRows: number) => {
        try {
            setIsLoading(true)
            // Create new rows using the API
            const createResponse = (await customerApiRequest.create({
                numberOfRows: numRows,
            })) as unknown as CreateCustomerResponse

            // Add new rows directly to state
            await fetchCustomers()
        } catch (error) {
            console.error("Error creating customers:", error)
            const errorMessage = error instanceof Error ? error.message : "Không thể thêm dòng mới"
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    // Update context menu items
    const contextMenuItems = {
        items: {
            row_above: {
                name: "Thêm dòng",
                callback: handleAddRow,
            },
            remove_row: {
                name: "Xóa dòng",
                callback: async () => {
                    const selected = hotTableRef.current?.hotInstance?.getSelected()
                    if (selected) {
                        // Get the row index in the displayed table
                        const displayRowIndex = selected[0][0]
                        // Get the actual data object for the selected row
                        const hotInstance = hotTableRef.current?.hotInstance
                        if (!hotInstance) return

                        const rowData = hotInstance.getSourceDataAtRow(displayRowIndex)
                        if (!rowData) return

                        const customer = rowData as CustomerData

                        if (customer.id) {
                            try {
                                // Call API to delete by ID
                                await customerApiRequest.delete(customer.id)

                                // Update local state by filtering out the customer with this ID
                                setTableData((prevData) => prevData.filter((c) => c.id !== customer.id))

                                toast.success("Xóa khách hàng thành công")
                            } catch (error) {
                                toast.error("Không thể xóa khách hàng")
                                console.error("Error deleting customer:", error)
                            }
                        } else {
                            // Handle case where a new row without an ID is deleted
                            setTableData((prevData) => {
                                const newData = [...prevData]
                                const actualIndex = newData.findIndex((c) => c === customer)
                                if (actualIndex !== -1) {
                                    newData.splice(actualIndex, 1)
                                }
                                return newData
                            })
                            toast.success("Xóa dòng thành công")
                        }
                    }
                },
            },
        },
    }

    // Update findActualRowIndex to remove header check
    const findActualRowIndex = (displayRowIndex: number): number => {
        // Get the actual data row from the table instance
        const hotInstance = hotTableRef.current?.hotInstance
        if (!hotInstance) return -1

        // Get the source data at the display row
        const rowData = hotInstance.getSourceDataAtRow(displayRowIndex)
        if (!rowData) return -1

        // Find the index in filteredData that matches this customer's ID
        const customer = rowData as CustomerData
        return filteredData.findIndex((item) => (item as CustomerData).id === customer.id)
    }

    // Add new helper function to update table data
    const updateTableData = (updatedCustomer: CustomerData) => {
        setTableData((prevData) => {
            return prevData.map((customer) => (customer.id === updatedCustomer.id ? updatedCustomer : customer))
        })
    }

    // Thêm useEffect để cleanup
    useEffect(() => {
        return () => {
            if (pasteTimeoutRef.current) {
                clearTimeout(pasteTimeoutRef.current)
            }
        }
    }, [])

    return (
        <div className="min-h-screen py-6 px-4 relative">
            <Toaster position="top-right" expand={true} richColors />
            <AddRowsModal />
            <div className="w-full max-w-7xl mx-auto relative z-0">
                {/* Header */}
                <div className="bg-white rounded-t-xl shadow-xl overflow-hidden border border-blue-100">
                    <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold text-white">Quản Lý Khách Hàng</h2>
                            <div className="flex items-center gap-2">
                                {/* Team Filter */}
                                <div className="relative w-full sm:w-48">
                                    <select
                                        value={selectedTeam}
                                        onChange={(e) => setSelectedTeam(e.target.value)}
                                        className="w-full px-4 py-1 text-blue-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-white appearance-none cursor-pointer"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                            backgroundRepeat: "no-repeat",
                                            backgroundPosition: "right 0.75rem center",
                                            backgroundSize: "1.25rem",
                                            paddingRight: "2.5rem",
                                        }}
                                    >
                                        <option value="">Tất cả Team</option>
                                        {teamNames.map((team) => (
                                            <option key={team} value={team}>
                                                {team}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={handleRefresh}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 shadow-md"
                                    disabled={isLoading}
                                >
                                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Loading indicator */}
                    {isLoading && (
                        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    )}

                    {/* Search and Add Section */}
                    <div className="p-2 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex justify-between">
                            {/* Trong phần hiển thị status, thêm indicator cho paste */}
                            <div className="text-sm text-white flex items-center gap-4">
                                <span>Team: {selectedTeam === "" ? "Tất cả Team" : selectedTeam}</span>
                                <span>Số lượng khách hàng: {filteredData.length}</span>
                                {isPasting && (
                                    <span className="bg-yellow-500 text-yellow-900 px-2 py-1 rounded text-xs font-medium">
                                        Đang xử lý paste...
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Search */}
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 w-full"
                                    />
                                </div>

                                {/* Add Button */}
                                <button
                                    onClick={handleAddRow}
                                    className="flex items-center gap-2 px-4 py-1 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 shadow-md font-medium whitespace-nowrap"
                                >
                                    <Plus className="h-4 w-4" />
                                    Thêm dòng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-b-xl shadow-xl overflow-hidden">
                    <HotTable
                        ref={hotTableRef}
                        themeName="ht-theme-main"
                        colHeaders={RowHeader2}
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
                        columns={columns}
                    />
                </div>
            </div>
        </div>
    )
}
