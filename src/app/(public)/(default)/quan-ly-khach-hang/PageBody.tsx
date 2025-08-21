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
import { RefreshCw, Search, Plus, X } from 'lucide-react'
import { debounce } from "lodash"
import getUserInfo from "@/components/userInfo"
import { database } from "@/lib/firebase"
import { ref as dbRef, get as dbGet, update as dbUpdate, push as dbPush, remove as dbRemove, set as dbSet, onValue as dbOnValue, off as dbOff } from "firebase/database"

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
    pb4: { label: "PB4", color: "#2563EB", bgColor: "#DBEAFE" }, // blue
} as const

// Add order options and colors
const ORDER_OPTIONS = {
    dang_mh: { label: "Đang MH", color: "#16A34A", bgColor: "#DCFCE7" }, // green
    hai_tuan_km: { label: "2 Tuần KM", color: "#2563EB", bgColor: "#DBEAFE" }, // blue
    bon_tuan_km: { label: "4 Tuần KM", color: "#D97706", bgColor: "#FEF3C7" }, // amber
    lau_ko_mua: { label: "Lâu Ko Mua", color: "#DC2626", bgColor: "#FEE2E2" }, // red
    minh_nghi_choi: { label: "Mình Nghỉ Chơi", color: "#6B7280", bgColor: "#F3F4F6" }, // gray
    ho_nghi_choi: { label: "Họ Nghỉ Chơi", color: "#374151", bgColor: "#E5E7EB" }, // dark gray
    seo_off: { label: "SEO OFF", color: "#111827", bgColor: "#E5E7EB" }, // near-black
} as const

type StatusType = keyof typeof STATUS_OPTIONS
type PhanLoaiType = keyof typeof PHAN_LOAI_OPTIONS
type PhienBanType = keyof typeof PHIEN_BAN_OPTIONS
type OrderType = keyof typeof ORDER_OPTIONS

// Update interface to match API
interface CustomerData {
    id?: string
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
    nguoiXem: string
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
    nguoi_xem: string
}

// Add utility functions before component
const calculateDaysDifference = (checkDate: string) => {
    if (!checkDate) return ""

    try {
        const [day, month, year] = checkDate.split("/").map(Number)
        if (!day || !month || !year) return ""

        const checkDateObj = new Date(year, month - 1, day)

        // Sử dụng múi giờ Việt Nam
        const today = new Date()
        const vietnamTime = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))

        // Reset time part for accurate day calculation
        checkDateObj.setHours(0, 0, 0, 0)
        vietnamTime.setHours(0, 0, 0, 0)

        const diffTime = vietnamTime.getTime() - checkDateObj.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        return diffDays.toString()
    } catch (error) {
        console.error("Error calculating days difference:", error)
        return ""
    }
}

const getCurrentDateFormatted = () => {
    const today = new Date()
    const vietnamTime = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    const day = String(vietnamTime.getDate()).padStart(2, "0")
    const month = String(vietnamTime.getMonth() + 1).padStart(2, "0")
    const year = vietnamTime.getFullYear()
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

// Resolve an option object from either its key or label (case-insensitive for label)
const resolveOptionByValue = <T extends Record<string, { label: string; color: string; bgColor: string }>>(options: T, value?: string | null) => {
    if (!value) return null
    if (value in options) return (options as any)[value]
    const lower = String(value).toLowerCase()
    const found = Object.values(options).find((opt) => opt.label.toLowerCase() === lower)
    return found || null
}

// Map an incoming value (key or label) to the canonical label stored in options
const mapToLabel = <T extends Record<string, { label: string; color: string; bgColor: string }>>(options: T, value: any): string => {
    if (value == null) return value
    const str = String(value)
    if (str in options) return (options as any)[str].label
    const found = Object.values(options).find((opt) => opt.label.toLowerCase() === str.toLowerCase())
    return found ? found.label : str
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
    const [hiddenColumns, setHiddenColumns] = useState<number[]>([])
    const [hiddenRows, setHiddenRows] = useState<number[]>([])
    const [didInitHidden, setDidInitHidden] = useState(false)
    const hotTableRef = useRef<any>(null)
    const [isPasting, setIsPasting] = useState(false)
    const pasteTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const userInfo = getUserInfo()
    const fetchCustomers = async () => {
        if (isLoading) return
        try {
            setIsLoading(true)
            const customersSnap = await dbGet(dbRef(database, "customers"))
            const customersObj = customersSnap.exists() ? (customersSnap.val() as Record<string, any>) : {}

            const transformedData: CustomerData[] = Object.entries(customersObj).map(([id, customer]) => ({
                id,
                maMoi: (customer as any).maMoi || "",
                maCu: (customer as any).maCu || "",
                phanLoai: (customer as any).phanLoai || "",
                phienBan: (customer as any).phienBan || "",
                oder: (customer as any).oder || "",
                cty: (customer as any).cty || "",
                team: (customer as any).team || "",
                chucVu: (customer as any).chucVu || "",
                telegram: (customer as any).telegram || "",
                username: (customer as any).username || "",
                khac: (customer as any).khac || "",
                linkNhom: (customer as any).linkNhom || "",
                idNhom: (customer as any).idNhom || "",
                info: (customer as any).info || "",
                nhom: (customer as any).nhom || "",
                nguoiCham1: (customer as any).nguoiCham1 || "",
                nguoiCham2: (customer as any).nguoiCham2 || "",
                tabDon: (customer as any).tabDon || "",
                congNo: (customer as any).congNo || "",
                tinDung: (customer as any).tinDung || "",
                tinhTrang: (customer as any).tinhTrang || ("" as any),
                ngayCheck: (customer as any).ngayCheck || "",
                noteKT: (customer as any).noteKT || "",
                nguoiXem: (customer as any).nguoiXem || "",
            }))

            setTableData(transformedData)

            // Derive team names from data if available
            const uniqueTeams = Array.from(new Set(transformedData.map((c) => c.nhom).filter(Boolean))) as string[]
            setTeamNames(uniqueTeams)
            setStaffNames([])
        } catch (error) {
            console.error("Error fetching customers from Firebase:", error)
            setTableData([])
        } finally {
            setTimeout(() => setIsLoading(false), 100)
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

    // Realtime subscription to customers
    useEffect(() => {
        const customersRef = dbRef(database, "customers")
        const handleSnapshot = (customersSnap: any) => {
            try {
                const customersObj = customersSnap.exists() ? (customersSnap.val() as Record<string, any>) : {}

                const transformedData: CustomerData[] = Object.entries(customersObj).map(([id, customer]) => ({
                    id,
                    maMoi: (customer as any).maMoi || "",
                    maCu: (customer as any).maCu || "",
                    phanLoai: (customer as any).phanLoai || "",
                    phienBan: (customer as any).phienBan || "",
                    oder: (customer as any).oder || "",
                    cty: (customer as any).cty || "",
                    team: (customer as any).team || "",
                    chucVu: (customer as any).chucVu || "",
                    telegram: (customer as any).telegram || "",
                    username: (customer as any).username || "",
                    khac: (customer as any).khac || "",
                    linkNhom: (customer as any).linkNhom || "",
                    idNhom: (customer as any).idNhom || "",
                    info: (customer as any).info || "",
                    nhom: (customer as any).nhom || "",
                    nguoiCham1: (customer as any).nguoiCham1 || "",
                    nguoiCham2: (customer as any).nguoiCham2 || "",
                    tabDon: (customer as any).tabDon || "",
                    congNo: (customer as any).congNo || "",
                    tinDung: (customer as any).tinDung || "",
                    tinhTrang: (customer as any).tinhTrang || ("" as any),
                    ngayCheck: (customer as any).ngayCheck || "",
                    noteKT: (customer as any).noteKT || "",
                    nguoiXem: (customer as any).nguoiXem || "",
                }))

                setTableData(transformedData)

                const uniqueTeams = Array.from(new Set(transformedData.map((c) => c.nhom).filter(Boolean))) as string[]
                setTeamNames(uniqueTeams)
                setStaffNames([])
            } catch (error) {
                console.error("Error transforming realtime customers:", error)
            } finally {
                setIsLoading(false)
            }
        }

        setIsLoading(true)
        dbOnValue(customersRef, handleSnapshot, (error) => {
            console.error("Realtime subscription error:", error)
            setIsLoading(false)
        })

        return () => {
            try {
                dbOff(customersRef, "value", handleSnapshot as any)
            } catch (_) { }
        }
    }, [])

    // Update transformToApiFormat function
    const transformToFirebaseFormat = (data: CustomerData) => ({
        maMoi: data.maMoi,
        maCu: data.maCu,
        phanLoai: data.phanLoai,
        phienBan: data.phienBan,
        oder: data.oder,
        cty: data.cty,
        team: data.team,
        chucVu: data.chucVu,
        telegram: data.telegram,
        username: data.username,
        khac: data.khac,
        linkNhom: data.linkNhom,
        idNhom: data.idNhom,
        info: data.info,
        nhom: data.nhom,
        nguoiCham1: data.nguoiCham1,
        nguoiCham2: data.nguoiCham2,
        tabDon: data.tabDon,
        congNo: data.congNo,
        tinDung: data.tinDung,
        tinhTrang: data.tinhTrang,
        ngayCheck: data.ngayCheck,
        noteKT: data.noteKT,
        nguoiXem: data.nguoiXem,
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
        const teamFiltered = selectedTeam === "" ? searchFiltered : searchFiltered.filter((row) => row.nhom === selectedTeam)

        // Filter by user role and username
        if (userInfo.role === "Nhân viên") {
            return teamFiltered.filter((row) => {
                // Check if nguoiXem contains the username
                if (!row.nguoiXem) return false

                // Split nguoiXem by space to handle multiple viewers
                const viewers = row.nguoiXem.split(" ")

                // Check if any viewer matches the username
                return viewers.some(viewer => viewer === userInfo.username)
            })
        }

        return teamFiltered
    })()

    // Tính tổng Công Nợ và Tín Dụng
    const sumCongNo = filteredData.reduce((acc, row) => acc + (parseFloat((row.congNo || '0').toString().replace(/[^0-9.-]+/g, '')) || 0), 0);
    const sumTinDung = filteredData.reduce((acc, row) => acc + (parseFloat((row.tinDung || '0').toString().replace(/[^0-9.-]+/g, '')) || 0), 0);
    // Tạo hàng tổng
    const totalRow: CustomerData = {
        maMoi: '',
        maCu: '',
        phanLoai: '',
        phienBan: '',
        oder: '',
        cty: '',
        team: '',
        chucVu: '',
        telegram: '',
        username: '',
        khac: '',
        linkNhom: '',
        idNhom: '',
        info: '',
        nhom: '',
        nguoiCham1: '',
        nguoiCham2: '',
        tabDon: '',
        congNo: sumCongNo.toLocaleString('vi-VN'),
        tinDung: sumTinDung.toLocaleString('vi-VN'),
        tinhTrang: '' as any,
        ngayCheck: '',
        noteKT: '',
        nguoiXem: '',
        id: 'total',
    };
    // Data truyền vào HotTable: hàng tổng + filteredData
    const tableDataWithTotal = [totalRow, ...filteredData];

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

        if (prop === "maMoi") {
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
                    link.style.color = "red"
                    link.style.display = "block"
                    link.style.overflow = "hidden"
                    link.style.textOverflow = "ellipsis"
                    link.style.whiteSpace = "nowrap"
                    // Allow cell to be editable by preventing the link from capturing pointer events
                    link.style.pointerEvents = "none"
                    link.tabIndex = -1
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

        // Format Order column
        if (prop === "oder") {
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
                const resolved = resolveOptionByValue(ORDER_OPTIONS, value)
                select.style.backgroundColor = resolved ? resolved.bgColor : "white"
                select.style.color = resolved ? resolved.color : "#6B7280"
                select.style.cursor = "pointer"
                select.style.textAlign = "center"
                select.style.fontSize = "11px"
                select.style.appearance = "none"
                select.style.webkitAppearance = "none"
                select.style.transition = "all 0.2s ease"
                select.style.fontWeight = resolved ? "500" : "normal"
                select.style.pointerEvents = "auto"

                // Add empty option first
                const emptyOption = document.createElement("option")
                emptyOption.value = ""
                emptyOption.textContent = "---"
                select.appendChild(emptyOption)

                // Add order options
                Object.entries(ORDER_OPTIONS).forEach(([key, order]) => {
                    const option = document.createElement("option")
                    option.value = order.label
                    option.textContent = order.label
                    if (resolved && resolved.label === order.label) {
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
                    const r = resolveOptionByValue(ORDER_OPTIONS, select.value)
                    select.style.backgroundColor = r ? r.bgColor : "#F9FAFB"
                    select.style.borderColor = "#93C5FD"
                })

                select.addEventListener("mouseout", () => {
                    const r = resolveOptionByValue(ORDER_OPTIONS, select.value)
                    select.style.backgroundColor = r ? r.bgColor : "white"
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
                value: string,
                cellProperties: Handsontable.CellProperties,
            ) => {
                const select = document.createElement("select")
                select.style.width = "100%"
                select.style.height = "100%"
                select.style.padding = "4px 8px"
                select.style.borderRadius = "4px"
                select.style.border = "1px solid #E5E7EB"
                const resolved = resolveOptionByValue(PHIEN_BAN_OPTIONS, value)
                select.style.backgroundColor = resolved ? resolved.bgColor : "white"
                select.style.color = resolved ? resolved.color : "#6B7280"
                select.style.cursor = "pointer"
                select.style.textAlign = "center"
                select.style.fontSize = "11px"
                select.style.appearance = "none"
                select.style.webkitAppearance = "none"
                select.style.transition = "all 0.2s ease"
                select.style.fontWeight = resolved ? "500" : "normal"
                select.style.pointerEvents = "auto"

                // Add empty option first
                const emptyOption = document.createElement("option")
                emptyOption.value = ""
                emptyOption.textContent = "---"
                select.appendChild(emptyOption)

                // Add phien ban options
                Object.entries(PHIEN_BAN_OPTIONS).forEach(([key, phienBan]) => {
                    const option = document.createElement("option")
                    option.value = phienBan.label
                    option.textContent = phienBan.label
                    if (resolved && resolved.label === phienBan.label) {
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
                    const r = resolveOptionByValue(PHIEN_BAN_OPTIONS, select.value)
                    select.style.backgroundColor = r ? r.bgColor : "#F9FAFB"
                    select.style.borderColor = "#93C5FD"
                })

                select.addEventListener("mouseout", () => {
                    const r = resolveOptionByValue(PHIEN_BAN_OPTIONS, select.value)
                    select.style.backgroundColor = r ? r.bgColor : "white"
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
                value: string,
                cellProperties: Handsontable.CellProperties,
            ) => {
                const select = document.createElement("select")
                select.style.width = "100%"
                select.style.height = "100%"
                select.style.padding = "4px 8px"
                select.style.borderRadius = "4px"
                select.style.border = "1px solid #E5E7EB"
                const resolved = resolveOptionByValue(PHAN_LOAI_OPTIONS, value)
                select.style.backgroundColor = resolved ? resolved.bgColor : "white"
                select.style.color = resolved ? resolved.color : "#6B7280"
                select.style.cursor = "pointer"
                select.style.textAlign = "center"
                select.style.fontSize = "11px"
                select.style.appearance = "none"
                select.style.webkitAppearance = "none"
                select.style.transition = "all 0.2s ease"
                select.style.fontWeight = resolved ? "500" : "normal"
                select.style.pointerEvents = "auto"

                // Add empty option first
                const emptyOption = document.createElement("option")
                emptyOption.value = ""
                emptyOption.textContent = "---"
                select.appendChild(emptyOption)

                // Add phan loai options
                Object.entries(PHAN_LOAI_OPTIONS).forEach(([key, phanLoai]) => {
                    const option = document.createElement("option")
                    option.value = phanLoai.label
                    option.textContent = phanLoai.label
                    if (resolved && resolved.label === phanLoai.label) {
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
                    const r = resolveOptionByValue(PHAN_LOAI_OPTIONS, select.value)
                    select.style.backgroundColor = r ? r.bgColor : "#F9FAFB"
                    select.style.borderColor = "#93C5FD"
                })

                select.addEventListener("mouseout", () => {
                    const r = resolveOptionByValue(PHAN_LOAI_OPTIONS, select.value)
                    select.style.backgroundColor = r ? r.bgColor : "white"
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
                value: string,
                cellProperties: Handsontable.CellProperties,
            ) => {
                const select = document.createElement("select")
                select.style.width = "100%"
                select.style.height = "100%"
                select.style.padding = "4px 8px"
                select.style.borderRadius = "4px"
                select.style.border = "1px solid #E5E7EB"
                const resolved = resolveOptionByValue(STATUS_OPTIONS, value)
                select.style.backgroundColor = resolved ? resolved.bgColor : "white"
                select.style.color = resolved ? resolved.color : "#6B7280"
                select.style.cursor = "pointer"
                select.style.textAlign = "center"
                select.style.fontSize = "11px"
                select.style.appearance = "none"
                select.style.webkitAppearance = "none"
                select.style.transition = "all 0.2s ease"
                select.style.fontWeight = resolved ? "500" : "normal"
                select.style.pointerEvents = "auto"

                // Add empty option first
                const emptyOption = document.createElement("option")
                emptyOption.value = ""
                emptyOption.textContent = "---"
                select.appendChild(emptyOption)

                // Add status options
                Object.entries(STATUS_OPTIONS).forEach(([key, status]) => {
                    const option = document.createElement("option")
                    option.value = status.label
                    option.textContent = status.label
                    if (resolved && resolved.label === status.label) {
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
                    const r = resolveOptionByValue(STATUS_OPTIONS, select.value)
                    select.style.backgroundColor = r ? r.bgColor : "#F9FAFB"
                    select.style.borderColor = "#93C5FD"
                })

                select.addEventListener("mouseout", () => {
                    const r = resolveOptionByValue(STATUS_OPTIONS, select.value)
                    select.style.backgroundColor = r ? r.bgColor : "white"
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

        if (prop === "ngayCheck") {
            cellProperties.renderer = (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: string,
                cellProperties: Handsontable.CellProperties,
            ) => {
                const displayValue = value ? value.substring(0, 5) : "Check"

                const button = document.createElement("button")
                button.textContent = `${displayValue} 📅`
                button.style.borderRadius = "0"
                button.style.border = "none"
                button.style.backgroundColor = value ? "#EFF6FF" : "#2563EB"
                button.style.color = value ? "#1E40AF" : "white"
                button.style.cursor = "pointer"
                button.style.fontSize = "12px"
                button.style.display = "flex"
                button.style.alignItems = "center"
                button.style.justifyContent = "center"
                button.style.gap = "4px"
                button.style.width = "100%"
                button.style.height = "100%"
                button.style.padding = "0"

                button.addEventListener("click", (e) => {
                    e.stopPropagation()
                    const currentDate = getCurrentDateFormatted()
                    instance.setDataAtCell(row, col, currentDate)
                    instance.render()
                    toast.success("Đã cập nhật ngày check")
                })

                if (safeClearElement(td)) {
                    td.style.padding = "0"
                    try {
                        td.appendChild(button)
                        td.style.textAlign = "center"
                        td.style.verticalAlign = "middle"
                    } catch (error) {
                        console.warn("Failed to append button element:", error)
                    }
                }
            }
        }

        if (prop === "demNgay") {
            cellProperties.renderer = (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties,
            ) => {
                const checkDate = instance.getDataAtCell(row, instance.propToCol("ngayCheck")) as string
                const daysDiff = calculateDaysDifference(checkDate)

                // Hiển thị số ngày với màu sắc tùy theo giá trị
                const daysNum = parseInt(daysDiff) || 0

                if (daysNum > 30) {
                    td.style.backgroundColor = "#FEE2E2" // Light red
                    td.style.color = "#DC2626" // Red
                } else if (daysNum > 14) {
                    td.style.backgroundColor = "#FEF3C7" // Light amber
                    td.style.color = "#D97706" // Amber
                } else if (daysNum > 7) {
                    td.style.backgroundColor = "#DBEAFE" // Light blue
                    td.style.color = "#2563EB" // Blue
                } else {
                    td.style.backgroundColor = "#DCFCE7" // Light green
                    td.style.color = "#16A34A" // Green
                }

                td.style.fontWeight = "500"
                td.style.textAlign = "center"
                td.style.verticalAlign = "middle"
                td.style.borderRadius = "4px"
                td.style.padding = "4px 8px"

                safeSetElementContent(td, daysDiff ? `${daysDiff} ngày` : "")
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
            readOnly: false,
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
        },
        {
            data: "noteKT",
            width: 80,
            className: "htMiddle htCenter",
            renderer: "text",
            readOnly: false,
        },
        {
            data: "nguoiXem",
            width: 100,
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
        "Tên",
        "ID Tele",
        "Liên hệ 2",
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
        "Người xem",
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
                    // Normalize certain fields to store labels (so paste can use human-readable labels)
                    if (prop === 'phanLoai') {
                        (updatedCustomer as any)[prop] = mapToLabel(PHAN_LOAI_OPTIONS, newValue)
                    } else if (prop === 'phienBan') {
                        (updatedCustomer as any)[prop] = mapToLabel(PHIEN_BAN_OPTIONS, newValue)
                    } else if (prop === 'oder') {
                        (updatedCustomer as any)[prop] = mapToLabel(ORDER_OPTIONS, newValue)
                    } else if (prop === 'tinhTrang') {
                        (updatedCustomer as any)[prop] = mapToLabel(STATUS_OPTIONS, newValue)
                    } else {
                        ; (updatedCustomer as any)[prop] = newValue
                    }
                    // Update Firebase (only the changed field)
                    const fieldKey = String(prop)
                    const normalizedValue = (updatedCustomer as any)[prop]
                    await dbUpdate(dbRef(database, `customers/${updatedCustomer.id}`), { [fieldKey]: normalizedValue })

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
            // Hiển thị overlay loading trong suốt quá trình lưu
            setIsLoading(true)

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
            const changedCustomerIds = new Set<string>()

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
                        let normalized
                        if (fieldName === 'phanLoai') normalized = mapToLabel(PHAN_LOAI_OPTIONS, newValue)
                        else if (fieldName === 'phienBan') normalized = mapToLabel(PHIEN_BAN_OPTIONS, newValue)
                        else if (fieldName === 'oder') normalized = mapToLabel(ORDER_OPTIONS, newValue)
                        else if (fieldName === 'tinhTrang') normalized = mapToLabel(STATUS_OPTIONS, newValue)
                        else normalized = typeof newValue === "string" ? newValue.trim() : newValue

                        if (updatedCustomer[fieldName] !== normalized) {
                            ; (updatedCustomer as any)[fieldName] = normalized
                            hasUpdates = true
                        }
                    }
                }

                // Only add to update list if there are actual changes
                if (hasUpdates && customer.id) {
                    updatedCustomers.push(updatedCustomer)
                    changedCustomerIds.add(String(customer.id))
                }
            }

            // Make single batch API call if there are updates
            if (updatedCustomers.length > 0) {
                console.log(`Batch updating ${updatedCustomers.length} customers to Firebase...`)

                // Build multi-location update object
                const updates: Record<string, any> = {}
                updatedCustomers.forEach((uc) => {
                    if (!uc.id) return
                    updates[`/customers/${uc.id}`] = transformToFirebaseFormat(uc)
                })

                await dbUpdate(dbRef(database), updates)

                // Update local state with all changes at once
                setTableData((prevData) => {
                    return prevData.map((customer) => {
                        if (customer.id && changedCustomerIds.has(String(customer.id))) {
                            const updatedCustomer = updatedCustomers.find((uc) => uc.id === customer.id)
                            return updatedCustomer || customer
                        }
                        return customer
                    })
                })

                toast.success(`Đã cập nhật ${updatedCustomers.length} khách hàng`)
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
            // Tắt overlay loading khi đã hoàn tất
            setIsLoading(false)
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
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                onKeyDown={(e) => { e.stopPropagation() }}
                onKeyUp={(e) => { e.stopPropagation() }}
                onKeyPress={(e) => { e.stopPropagation() }}
            >
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
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    id="rows"
                                    value={numberOfRows}
                                    onChange={(e) => setNumberOfRows(e.target.value.replace(/[^0-9]/g, ''))}
                                    onKeyDown={(e) => { e.stopPropagation() }}
                                    onKeyUp={(e) => { e.stopPropagation() }}
                                    onKeyPress={(e) => { e.stopPropagation() }}
                                    onFocus={(e) => { e.stopPropagation() }}
                                    onClick={(e) => { e.stopPropagation() }}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoFocus
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nhập số dòng"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setNumberOfRows(prev => {
                                        const current = Number.parseInt(prev || '0') || 0
                                        return String(Math.max(1, current - 1))
                                    })}
                                    className="px-3 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                    -1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNumberOfRows(prev => {
                                        const current = Number.parseInt(prev || '0') || 0
                                        return String(Math.max(1, current + 1))
                                    })}
                                    className="px-3 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                    +1
                                </button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {['5', '10', '20', '50', '100'].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setNumberOfRows(n)}
                                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
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
            const baseData: Omit<CustomerData, 'id'> = {
                maMoi: '', maCu: '', phanLoai: '', phienBan: '', oder: '', cty: '', team: '', chucVu: '', telegram: '', username: '', khac: '', linkNhom: '', idNhom: '', info: '', nhom: '', nguoiCham1: '', nguoiCham2: '', tabDon: '', congNo: '', tinDung: '', tinhTrang: '' as any, ngayCheck: '', noteKT: '', nguoiXem: ''
            }
            const customersRef = dbRef(database, 'customers')
            for (let i = 0; i < numRows; i++) {
                const newRef = dbPush(customersRef)
                const payload = { ...baseData, id: newRef.key || '' }
                await dbSet(newRef, payload)
            }
            await fetchCustomers()
        } catch (error) {
            console.error("Error creating customers in Firebase:", error)
            const errorMessage = error instanceof Error ? error.message : "Không thể thêm dòng mới"
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    // Update context menu items to use 'hidden' property for dynamic show/hide
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
                        const displayRowIndex = selected[0][0]
                        const hotInstance = hotTableRef.current?.hotInstance
                        if (!hotInstance) return
                        const rowData = hotInstance.getSourceDataAtRow(displayRowIndex)
                        if (!rowData) return
                        const customer = rowData as CustomerData
                        if (customer.id) {
                            try {
                                await dbRemove(dbRef(database, `customers/${customer.id}`))
                                setTableData((prevData) => prevData.filter((c) => c.id !== customer.id))
                                toast.success("Xóa khách hàng thành công")
                            } catch (error) {
                                toast.error("Không thể xóa khách hàng")
                                console.error("Error deleting customer:", error)
                            }
                        } else {
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
            hide_column: {
                name: "Ẩn cột",
                callback: function () {
                    const selected = hotTableRef.current?.hotInstance?.getSelected()
                    if (selected) {
                        const columnIndex = selected[0][1]
                        setHiddenColumns(prev => [...prev, columnIndex])
                    }
                }
            },
            show_all_columns: {
                name: "Hiện tất cả cột",
                callback: function () {
                    setHiddenColumns([])
                },
                hidden: () => hiddenColumns.length === 0
            },
            hide_row: {
                name: "Ẩn hàng",
                callback: function () {
                    const selected = hotTableRef.current?.hotInstance?.getSelected();
                    if (selected) {
                        // selected là mảng các vùng chọn, mỗi vùng: [rowStart, colStart, rowEnd, colEnd]
                        let rowsToHide: number[] = [];
                        selected.forEach((sel: any) => {
                            const from = Math.min(sel[0], sel[2]);
                            const to = Math.max(sel[0], sel[2]);
                            for (let i = from; i <= to; i++) {
                                rowsToHide.push(i);
                            }
                        });
                        // Loại bỏ trùng lặp và cập nhật state
                        setHiddenRows(prev => Array.from(new Set([...prev, ...rowsToHide])));
                    }
                }
            },
            show_all_rows: {
                name: "Hiện tất cả hàng",
                callback: function () {
                    setHiddenRows([])
                },
                hidden: () => hiddenRows.length === 0
            }
        }
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

    // Add useEffect to handle hidden columns and rows changes
    useEffect(() => {
        const hotInstance = hotTableRef.current?.hotInstance
        if (hotInstance) {
            hotInstance.updateSettings({
                hiddenColumns: {
                    columns: hiddenColumns,
                    indicators: true
                },
                hiddenRows: {
                    rows: hiddenRows,
                    indicators: true
                }
            })
        }
    }, [hiddenColumns, hiddenRows])

    // Thêm useEffect để cleanup
    useEffect(() => {
        return () => {
            if (pasteTimeoutRef.current) {
                clearTimeout(pasteTimeoutRef.current)
            }
        }
    }, [])

    // Lấy trạng thái ẩn từ localStorage khi mount
    useEffect(() => {
        try {
            const cols = localStorage.getItem('hiddenColumns');
            const rows = localStorage.getItem('hiddenRows');
            if (cols) setHiddenColumns(JSON.parse(cols));
            if (rows) setHiddenRows(JSON.parse(rows));
        } catch (e) {
            setHiddenColumns([]);
            setHiddenRows([]);
        }
        setDidInitHidden(true);
    }, []);

    // Lưu trạng thái ẩn vào localStorage khi thay đổi, chỉ khi đã init xong
    useEffect(() => {
        if (!didInitHidden) return;
        try {
            localStorage.setItem('hiddenColumns', JSON.stringify(hiddenColumns));
            localStorage.setItem('hiddenRows', JSON.stringify(hiddenRows));
        } catch (e) { }
    }, [hiddenColumns, hiddenRows, didInitHidden]);

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
                            {/* Thay thế phần hiển thị Team và số lượng khách hàng bằng thông tin ẩn cột/hàng */}
                            <div className="text-sm text-white flex items-center gap-4">
                                <span>
                                    <b>Ẩn cột:</b> {hiddenColumns.length > 0 ? hiddenColumns.map(idx => RowHeader2[idx]).join(", ") : "Không có"}
                                </span>
                                <span>
                                    <b>Ẩn hàng:</b> {hiddenRows.length > 0
                                        ? hiddenColumns.includes(0)
                                            ? "Đã ẩn cột Mã Mới"
                                            : hiddenRows.map(idx => filteredData[idx]?.maMoi || idx + 1).join(", ")
                                        : "Không có"}
                                </span>
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
                <div className="bg-white rounded-b-xl shadow-xl">
                    <div className="overflow-x-auto">
                        <HotTable
                            ref={hotTableRef}
                            themeName="ht-theme-main"
                            colHeaders={RowHeader2}
                            data={tableDataWithTotal}
                            width="100%"
                            autoColumnSize={false}
                            manualColumnResize={true}
                            height="calc(100vh - 320px)"
                            stretchH="none"
                            manualRowMove={true}
                            manualColumnMove={true}
                            manualRowResize={true}
                            className="custom-table"
                            licenseKey="non-commercial-and-evaluation"
                            rowHeaders={false}
                            cells={function (this: Handsontable.CellProperties, row, col, prop) {
                                // Hàng tổng (row === 0)
                                if (row === 0) {
                                    return {
                                        readOnly: true,
                                        className: 'htMiddle htCenter bg-blue-100 font-bold',
                                        renderer: (instance, td, row, col, prop, value, cellProperties) => {
                                            if (prop === 'congNo') {
                                                td.textContent = sumCongNo.toString();
                                                td.style.background = '#FFDEDE';
                                                td.style.fontWeight = 'bold';
                                                td.style.color = 'red';
                                            } else if (prop === 'tinDung') {
                                                td.textContent = sumTinDung.toString();
                                                td.style.background = '#FFDEDE';
                                                td.style.fontWeight = 'bold';
                                                td.style.color = 'red';
                                            } else if (col === 17) {
                                                td.textContent = 'TỔNG';
                                                td.style.background = '#FFDEDE';
                                                td.style.fontWeight = 'bold';
                                                td.style.color = 'red';
                                            } else {
                                                td.textContent = '';
                                                td.style.background = '#FFDEDE';
                                            }
                                        }
                                    }
                                }
                                // ... giữ nguyên cells cũ cho các hàng khác ...
                                return cells.call(this, row - 1, col, prop);
                            }}
                            dropdownMenu={false}
                            columnSorting={true}
                            columnHeaderHeight={30}
                            afterChange={handleAfterChange}
                            afterPaste={handleAfterPaste}
                            contextMenu={contextMenuItems}
                            columns={columns}
                            hiddenColumns={{
                                columns: hiddenColumns,
                                indicators: true
                            }}
                            hiddenRows={{
                                rows: hiddenRows,
                                indicators: true
                            }}
                            fixedColumnsLeft={1}
                            fixedRowsTop={1}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}