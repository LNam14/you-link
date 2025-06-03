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
import customerApiRequest, { type CustomerData as ApiCustomerData } from "@/apiRequests/customer"
import { debounce } from "lodash"

registerAllModules()

// Add status options and colors
const STATUS_OPTIONS = {
    ko_mua_ban: { label: "Ko mua bán", color: "#6B7280", bgColor: "#F3F4F6" }, // gray
    binh_thuong: { label: "Bình thường", color: "#16A34A", bgColor: "#DCFCE7" }, // green
    rui_ro: { label: "Rủi ro", color: "#D97706", bgColor: "#FEF3C7" }, // amber
    rui_ro_cao: { label: "Rủi ro cao", color: "#DC2626", bgColor: "#FEE2E2" }, // red
    scam: { label: "Scam", color: "#7F1D1D", bgColor: "#FEE2E2" }, // dark red
} as const

type StatusType = keyof typeof STATUS_OPTIONS

// Update interface to match API
interface CustomerData {
    id: number // Make id required since it's always returned from API
    maMoi: string
    phanLoai: string
    phienBan: string
    maCu: string
    cty: string
    ten: string[]
    telegram: string[]
    linkNhom: string
    idNhom: string
    nhom: string
    nguoiCham: string
    tabDon: string
    congNo: string
    tinDung: string
    ngayCheck: string
    tinhTrang: StatusType
    noteKT: string
    noteKhac: string
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

type NestedColumnHeader = {
    label: string
    colspan: number
}

// Add new interfaces for modal state
interface ArrayFieldModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    field: "ten" | "telegram"
    data: string[]
    onSave: (newData: string[]) => void
}

// Add new component for array field modal
const ArrayFieldModal = ({ isOpen, onClose, title, field, data, onSave }: ArrayFieldModalProps) => {
    const [items, setItems] = useState<string[]>(data)
    const [newItem, setNewItem] = useState("")
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editValue, setEditValue] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const editInputRef = useRef<HTMLInputElement>(null)

    // Update local state when data prop changes
    useEffect(() => {
        setItems(data)
    }, [data])

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus()
            }, 100)
        }
    }, [isOpen])

    // Focus edit input when editing starts
    useEffect(() => {
        if (editingIndex !== null && editInputRef.current) {
            editInputRef.current.focus()
        }
    }, [editingIndex])

    const handleAdd = async () => {
        if (newItem.trim()) {
            setIsSaving(true)
            try {
                const newItems = [...items, newItem.trim()]
                setItems(newItems)
                setNewItem("")
                // Auto save after adding
                await onSave(newItems)
                toast.success(`Đã thêm ${field === "ten" ? "tên" : "telegram"} mới`)
                // Focus back on input for quick consecutive adds
                inputRef.current?.focus()
            } catch (error) {
                toast.error(`Không thể thêm ${field === "ten" ? "tên" : "telegram"}`)
            } finally {
                setIsSaving(false)
            }
        }
    }

    const handleDelete = async (index: number) => {
        // Confirm before deleting
        setIsSaving(true)
        try {
            const newItems = items.filter((_, i) => i !== index)
            setItems(newItems)
            // Auto save after deleting
            await onSave(newItems)
            toast.success("Đã xóa thành công")
        } catch (error) {
            toast.error("Không thể xóa mục")
            // Revert changes if save fails
            setItems(data)
        } finally {
            setIsSaving(false)
        }
    }

    const handleEdit = (index: number) => {
        setEditingIndex(index)
        setEditValue(items[index])
    }

    const handleSaveEdit = async () => {
        if (editingIndex !== null && editValue.trim()) {
            setIsSaving(true)
            try {
                const newItems = [...items]
                newItems[editingIndex] = editValue.trim()
                setItems(newItems)
                setEditingIndex(null)
                setEditValue("")
                // Auto save after editing
                await onSave(newItems)
                toast.success("Đã cập nhật thành công")
            } catch (error) {
                toast.error("Không thể cập nhật")
                // Revert changes if save fails
                setItems(data)
                setEditingIndex(null)
            } finally {
                setIsSaving(false)
            }
        }
    }

    const handleCancelEdit = () => {
        setEditingIndex(null)
        setEditValue("")
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] flex flex-col shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-colors"
                        disabled={isSaving}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex gap-2 mb-4">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder={`Thêm ${field === "ten" ? "tên" : "telegram"} mới`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        onKeyPress={(e) => e.key === "Enter" && handleAdd()}
                        disabled={isSaving}
                    />
                    <button
                        onClick={handleAdd}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSaving || !newItem.trim()}
                    >
                        <Plus className="h-4 w-4" />
                        Thêm
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 pr-1">
                    {items.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                            Chưa có dữ liệu nào. Hãy thêm {field === "ten" ? "tên" : "telegram"} mới.
                        </div>
                    ) : (
                        items.map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 mb-2 p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm"
                            >
                                {editingIndex === index ? (
                                    <>
                                        <input
                                            ref={editInputRef}
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            onKeyPress={(e) => e.key === "Enter" && handleSaveEdit()}
                                            disabled={isSaving}
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleSaveEdit}
                                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                                            disabled={isSaving || !editValue.trim()}
                                        >
                                            Lưu
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                                            disabled={isSaving}
                                        >
                                            Hủy
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex-1 font-medium text-gray-700">{item}</span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEdit(index)}
                                                className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                                disabled={isSaving}
                                                title="Sửa"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(index)}
                                                className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                                disabled={isSaving}
                                                title="Xóa"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M3 6h18"></path>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="pt-3 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                        disabled={isSaving}
                    >
                        Đóng
                    </button>
                </div>

                {/* Loading overlay */}
                {isSaving && (
                    <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function AccountTracker() {
    const [tableData, setTableData] = useState<CustomerData[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [showAddModal, setShowAddModal] = useState(false)
    const [numberOfRows, setNumberOfRows] = useState("")
    const hotTableRef = useRef<any>(null)
    const [showArrayFieldModal, setShowArrayFieldModal] = useState(false)
    const [arrayFieldModalData, setArrayFieldModalData] = useState<{
        field: "ten" | "telegram"
        rowIndex: number
        data: string[]
    } | null>(null)

    const fetchCustomers = async () => {
        // Prevent multiple simultaneous fetches
        if (isLoading) return

        try {
            setIsLoading(true)
            const customers = await customerApiRequest.get()
            console.log("API Response (customers):", customers)

            // Check if customers is an array before mapping
            if (!Array.isArray(customers)) {
                console.error("API did not return an array:", customers)
                toast.error("Định dạng dữ liệu khách hàng không hợp lệ từ server")
                setTableData([])
                return
            }

            // Transform API data to match our table format
            const transformedData = customers.map((customer) => ({
                id: customer.id,
                maMoi: customer.ma_moi,
                phanLoai: customer.phan_loai,
                phienBan: customer.phien_ban,
                maCu: customer.ma_cu,
                cty: customer.cty,
                ten: customer.ten,
                telegram: customer.telegram,
                linkNhom: customer.link_nhom,
                idNhom: customer.id_nhom,
                nhom: customer.nhom,
                nguoiCham: customer.nguoi_cham,
                tabDon: customer.tab_don,
                congNo: customer.cong_no,
                tinDung: customer.tin_dung,
                ngayCheck: customer.ngay_check,
                tinhTrang: customer.tinh_trang as StatusType,
                noteKT: customer.note_kt,
                noteKhac: customer.note_khac,
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

    // Transform table data to API format
    const transformToApiFormat = (data: CustomerData): ApiCustomerData => ({
        id: data.id,
        ma_moi: data.maMoi,
        phan_loai: data.phanLoai,
        phien_ban: data.phienBan,
        ma_cu: data.maCu,
        cty: data.cty,
        ten: data.ten,
        telegram: data.telegram,
        link_nhom: data.linkNhom,
        id_nhom: data.idNhom,
        nhom: data.nhom,
        nguoi_cham: data.nguoiCham,
        tab_don: data.tabDon,
        cong_no: data.congNo,
        tin_dung: data.tinDung,
        ngay_check: data.ngayCheck,
        tinh_trang: data.tinhTrang,
        note_kt: data.noteKT,
        note_khac: data.noteKhac,
    })

    // Filter data based on search term
    const filteredData = tableData.filter((row: CustomerData) => {
        const searchFields = ["maMoi", "phanLoai", "cty", "ten", "nhom", "nguoiCham"] as const
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

    // Cells function for styling
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
                Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties])
                td.style.textAlign = "center"
                td.style.verticalAlign = "middle"
            },
        }

        // Format Tên column
        if (prop === "ten") {
            cellProperties.renderer = (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: string[],
                cellProperties: Handsontable.CellProperties,
            ) => {
                if (Array.isArray(value) && value.length > 0) {
                    const count = value.length
                    const displayText = count === 1 ? `Xem (${count})` : `Xem (${count})`

                    // Use safe content setting
                    if (safeSetElementContent(td, displayText, true)) {
                        td.style.color = "#1E40AF"
                        td.style.cursor = "pointer"
                        td.style.backgroundColor = "transparent"
                        td.style.border = "1px solid #E5E7EB"

                        td.onclick = () => {
                            setArrayFieldModalData({
                                field: "ten",
                                rowIndex: row,
                                data: value,
                            })
                            setShowArrayFieldModal(true)
                        }
                    }
                } else {
                    if (safeClearElement(td)) {
                        td.style.color = "#374151"
                        td.style.cursor = "text"
                        td.style.backgroundColor = "#F9FAFB"
                        td.style.border = "1px dashed #D1D5DB"

                        const input = document.createElement("input")
                        input.type = "text"
                        input.placeholder = "None"
                        input.style.width = "100%"
                        input.style.height = "100%"
                        input.style.border = "none"
                        input.style.outline = "none"
                        input.style.backgroundColor = "transparent"
                        input.style.textAlign = "center"
                        input.style.padding = "0"

                        input.addEventListener("blur", (e) => {
                            const newValue = input.value.trim()
                            if (newValue) {
                                instance.setDataAtCell(row, col, [newValue])
                            }
                        })

                        input.addEventListener("keydown", (e) => {
                            if (e.key === "Enter") {
                                const newValue = input.value.trim()
                                if (newValue) {
                                    instance.setDataAtCell(row, col, [newValue])
                                    input.blur()
                                }
                            }
                        })

                        try {
                            td.appendChild(input)
                            td.onclick = () => {
                                input.focus()
                            }
                        } catch (error) {
                            console.warn("Failed to append input element:", error)
                        }
                    }
                }
            }
        }

        // Format Telegram column
        if (prop === "telegram") {
            cellProperties.renderer = (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: string[],
                cellProperties: Handsontable.CellProperties,
            ) => {
                if (Array.isArray(value) && value.length > 0) {
                    const count = value.length
                    const displayText = `Xem (${count})`

                    if (safeSetElementContent(td, displayText, true)) {
                        td.style.color = "#16A34A"
                        td.style.cursor = "pointer"
                        td.style.backgroundColor = "transparent"

                        td.onclick = () => {
                            setArrayFieldModalData({
                                field: "telegram",
                                rowIndex: row,
                                data: value,
                            })
                            setShowArrayFieldModal(true)
                        }
                    }
                } else {
                    if (safeClearElement(td)) {
                        td.style.color = "#374151"
                        td.style.cursor = "text"
                        td.style.backgroundColor = "#F9FAFB"
                        td.style.border = "1px dashed #D1D5DB"

                        const input = document.createElement("input")
                        input.type = "text"
                        input.placeholder = "None"
                        input.style.width = "100%"
                        input.style.height = "100%"
                        input.style.border = "none"
                        input.style.outline = "none"
                        input.style.backgroundColor = "transparent"
                        input.style.textAlign = "center"
                        input.style.padding = "0"

                        input.addEventListener("blur", (e) => {
                            const newValue = input.value.trim()
                            if (newValue) {
                                instance.setDataAtCell(row, col, [newValue])
                            }
                        })

                        input.addEventListener("keydown", (e) => {
                            if (e.key === "Enter") {
                                const newValue = input.value.trim()
                                if (newValue) {
                                    instance.setDataAtCell(row, col, [newValue])
                                    input.blur()
                                }
                            }
                        })

                        try {
                            td.appendChild(input)
                            td.onclick = () => {
                                input.focus()
                            }
                        } catch (error) {
                            console.warn("Failed to append input element:", error)
                        }
                    }
                }
            }
        }

        // Format Ngày check column
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

        // Format Đếm Ngày column (now using computed value)
        if (col === 15) {
            cellProperties.renderer = function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: string,
                cellProperties: Handsontable.CellProperties,
            ) {
                const checkDate = instance.getDataAtCell(row, instance.propToCol("ngayCheck")) as string
                const daysDiff = calculateDaysDifference(checkDate)

                Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, daysDiff, cellProperties])

                td.style.textAlign = "center"
                td.style.verticalAlign = "middle"

                if (daysDiff) {
                    td.style.backgroundColor = "#EFF6FF"
                    td.style.color = "#1E40AF"
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
                select.style.padding = "1px"
                select.style.borderRadius = "0"
                select.style.border = "none"
                select.style.backgroundColor = "transparent"
                select.style.cursor = "pointer"
                select.style.textAlign = "center"
                select.style.fontSize = "12px"
                select.style.appearance = "none"
                select.style.webkitAppearance = "none"

                Object.entries(STATUS_OPTIONS).forEach(([key, { label }]) => {
                    const option = document.createElement("option")
                    option.value = key
                    option.textContent = label
                    if (value === key) {
                        option.selected = true
                    }
                    select.appendChild(option)
                })

                select.addEventListener("change", (e) => {
                    const newValue = (e.target as HTMLSelectElement).value as StatusType
                    instance.setDataAtCell(row, col, newValue)
                })

                if (value && STATUS_OPTIONS[value]) {
                    const { color, bgColor } = STATUS_OPTIONS[value]
                    select.style.color = color
                    select.style.backgroundColor = bgColor
                }

                if (safeClearElement(td)) {
                    td.style.padding = "0"
                    try {
                        td.appendChild(select)
                        td.style.textAlign = "center"
                        td.style.verticalAlign = "middle"
                    } catch (error) {
                        console.warn("Failed to append select element:", error)
                    }
                }
            }

            cellProperties.type = "dropdown"
            cellProperties.source = Object.keys(STATUS_OPTIONS)
            cellProperties.strict = true
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

                    if (safeClearElement(td)) {
                        try {
                            td.appendChild(link)
                        } catch (error) {
                            console.warn("Failed to append link element:", error)
                            safeSetElementContent(td, value)
                        }
                    }
                } else {
                    safeSetElementContent(td, "")
                }
            }
        }

        return cellProperties
    }

    // Update columns configuration
    const columns = [
        { data: "maMoi", width: 60, className: "htMiddle htCenter", renderer: "text" },
        { data: "phanLoai", width: 70, className: "htMiddle htCenter", renderer: "text" },
        { data: "phienBan", width: 70, className: "htMiddle htCenter", renderer: "text" },
        { data: "maCu", width: 70, className: "htMiddle htCenter", renderer: "text" },
        { data: "cty", width: 60, className: "htMiddle htCenter", renderer: "text" },
        { data: "ten", width: 55, className: "htMiddle htCenter", renderer: "text" },
        { data: "telegram", width: 70, className: "htMiddle htCenter", renderer: "text" },
        { data: "linkNhom", width: 80, className: "htMiddle htCenter", renderer: "text" },
        { data: "idNhom", width: 70, className: "htMiddle htCenter", renderer: "text" },
        { data: "nhom", width: 50, className: "htMiddle htCenter", renderer: "text" },
        { data: "nguoiCham", width: 100, className: "htMiddle htCenter", renderer: "text" },
        { data: "tabDon", width: 80, className: "htMiddle htCenter", renderer: "html" },
        { data: "congNo", width: 70, className: "htMiddle htCenter", renderer: "text" },
        { data: "tinDung", width: 70, className: "htMiddle htCenter", renderer: "text" },
        { data: "ngayCheck", width: 90, className: "htMiddle htCenter" },
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
        { data: "tinhTrang", width: 80, className: "htMiddle htCenter", renderer: "text" },
        { data: "noteKT", width: 80, className: "htMiddle htCenter", renderer: "text" },
        { data: "noteKhac", width: 70, className: "htMiddle htCenter", renderer: "text" },
    ]
    const RowHeader2 = [
        "Mã Mới",
        "Phân Loại",
        "Phiên Bản",
        "Mã Cũ",
        "CTY",
        "Tên",
        "Telegram",
        "Link Group",
        "ID Group",
        "Team",
        "Bán Hàng",
        "Tab Đơn",
        "Công Nợ",
        "Tín Dụng",
        "Ngày Check",
        "Đếm Ngày",
        "Tình Trạng",
        "Note KT",
        "Note Khác",
    ]

    // Helper function to process array fields (Ten and Telegram)
    const processArrayField = (currentValue: string[], newValue: string): string[] => {
        // If current value is empty, create new array with the value
        if (!currentValue || currentValue.length === 0) {
            return [newValue]
        }

        // If new value is already in the array, return current array
        if (currentValue.includes(newValue)) {
            return currentValue
        }

        // Add new value to the array
        return [...currentValue, newValue]
    }

    // Handle single cell changes
    const handleAfterChange = async (changes: any[] | null, source: string) => {
        if (!changes) return

        try {
            for (const [row, prop, oldValue, newValue] of changes) {
                const customer = tableData[row]
                if (!customer) continue

                // Special handling for ngayCheck column
                if (prop === "ngayCheck") {
                    const hotInstance = hotTableRef.current?.hotInstance
                    if (hotInstance) {
                        hotInstance.render()
                    }
                }

                // Special handling for Ten and Telegram arrays
                if (prop === "ten" || prop === "telegram") {
                    // Handle direct input for empty arrays (when newValue is already an array with one item)
                    if (Array.isArray(newValue) && newValue.length > 0) {
                        const updatedCustomer: CustomerData = {
                            ...customer,
                            [prop]: newValue,
                        }

                        // Only update if customer has an ID
                        if (customer.id) {
                            await customerApiRequest.update(transformToApiFormat(updatedCustomer))
                            await fetchCustomers() // Fetch fresh data after update
                            toast.success(`Đã thêm ${newValue[0]} vào ${prop === "ten" ? "Tên" : "Telegram"}`)
                        }
                        continue
                    }

                    // Handle adding to existing arrays (when newValue is a string)
                    if (typeof newValue === "string" && newValue.trim()) {
                        // For empty arrays, create new array with the input value
                        const currentArray = customer[prop as keyof CustomerData] as string[]
                        const isEmptyArray = !currentArray || currentArray.length === 0

                        const updatedCustomer: CustomerData = {
                            ...customer,
                            [prop]: isEmptyArray ? [newValue.trim()] : processArrayField(currentArray, newValue.trim()),
                        }

                        // Only update if customer has an ID
                        if (customer.id) {
                            await customerApiRequest.update(transformToApiFormat(updatedCustomer))
                            await fetchCustomers() // Fetch fresh data after update

                            const message = isEmptyArray
                                ? `Đã thêm ${newValue.trim()} vào ${prop === "ten" ? "Tên" : "Telegram"}`
                                : `Đã thêm ${newValue.trim()} vào danh sách ${prop === "ten" ? "Tên" : "Telegram"}`
                            toast.success(message)
                        }
                        continue
                    }
                }

                // Update the customer data for other fields
                if (customer.id) {
                    const updatedCustomer: CustomerData = { ...customer }
                    await customerApiRequest.update(transformToApiFormat(updatedCustomer))
                    await fetchCustomers() // Fetch fresh data after update
                }
            }
        } catch (error) {
            toast.error("Không thể cập nhật dữ liệu")
            console.error("Error updating customer:", error)
        }
    }

    // Handle paste operations
    const handleAfterPaste = async (data: any[][], coords: any[]) => {
        try {
            const updates = []
            const affectedRows = new Set<number>()

            // Get all affected rows from the paste range
            if (coords.length > 0) {
                const range = coords[0]
                const startRow = range.from.row
                const endRow = range.to.row

                for (let row = startRow; row <= endRow; row++) {
                    affectedRows.add(row)
                }
            }

            // Process each affected row
            for (const row of affectedRows) {
                const customer = tableData[row]
                if (!customer) continue

                const updatedCustomer = { ...customer }
                let hasUpdates = false

                // Check if Ten or Telegram columns are in the paste range
                if (coords.length > 0) {
                    const range = coords[0]
                    const startCol = range.from.col
                    const endCol = range.to.col
                    const tenColIndex = columns.findIndex((col) => col.data === "ten")
                    const telegramColIndex = columns.findIndex((col) => col.data === "telegram")

                    // Process Ten column if it's in the paste range
                    if (tenColIndex >= startCol && tenColIndex <= endCol) {
                        const pasteRowIndex = row - range.from.row
                        const pasteColIndex = tenColIndex - startCol
                        const newValue = data[pasteRowIndex]?.[pasteColIndex]

                        if (typeof newValue === "string" && newValue.trim()) {
                            // For empty arrays, replace with new single-item array
                            // For existing arrays, add to the array
                            const currentArray = customer.ten
                            const isEmptyArray = !currentArray || currentArray.length === 0

                            if (isEmptyArray) {
                                updatedCustomer.ten = [newValue.trim()]
                            } else {
                                updatedCustomer.ten = processArrayField(currentArray, newValue.trim())
                            }
                            hasUpdates = true
                        }
                    }

                    // Process Telegram column if it's in the paste range
                    if (telegramColIndex >= startCol && telegramColIndex <= endCol) {
                        const pasteRowIndex = row - range.from.row
                        const pasteColIndex = telegramColIndex - startCol
                        const newValue = data[pasteRowIndex]?.[pasteColIndex]

                        if (typeof newValue === "string" && newValue.trim()) {
                            // For empty arrays, replace with new single-item array
                            // For existing arrays, add to the array
                            const currentArray = customer.telegram
                            const isEmptyArray = !currentArray || currentArray.length === 0

                            if (isEmptyArray) {
                                updatedCustomer.telegram = [newValue.trim()]
                            } else {
                                updatedCustomer.telegram = processArrayField(currentArray, newValue.trim())
                            }
                            hasUpdates = true
                        }
                    }
                }

                // Only update if customer has an ID and there are changes
                if (customer.id && hasUpdates) {
                    updates.push(customerApiRequest.update(transformToApiFormat(updatedCustomer)))
                }
            }

            // Wait for all updates to complete
            if (updates.length > 0) {
                await Promise.all(updates)
                await fetchCustomers() // Fetch fresh data after all updates
                toast.success(`Đã cập nhật ${updates.length} dòng`)
            }
        } catch (error) {
            toast.error("Không thể cập nhật dữ liệu đã dán")
            console.error("Error updating pasted data:", error)
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
                    <h3 className="text-lg font-semibold mb-4">Thêm dòng mới</h3>
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

    // Add new function to handle multiple rows
    const handleAddMultipleRows = async (numRows: number) => {
        try {
            setIsLoading(true)
            // Create new rows using the API
            const response = await customerApiRequest.create({ numberOfRows: numRows })
            // Refresh the table to get the new data
            await fetchCustomers()
            toast.success(`Đã thêm ${numRows} dòng mới thành công`)
        } catch (error) {
            console.error("Error creating customers:", error)
            const errorMessage = error instanceof Error ? error.message : "Không thể thêm dòng mới"
            toast.error(errorMessage)
            // Refresh the table data to ensure consistency
            await fetchCustomers()
        } finally {
            setIsLoading(false)
        }
    }

    // Update context menu to use API for delete
    const contextMenuItems = {
        items: {
            row_above: {
                name: "Thêm dòng mới",
                callback: handleAddRow,
            },
            remove_row: {
                name: "Xóa dòng",
                callback: async () => {
                    const selected = hotTableRef.current?.hotInstance?.getSelected()
                    if (selected) {
                        const rowIndex = selected[0][0]
                        const customer = tableData[rowIndex]

                        if (customer.id) {
                            try {
                                await customerApiRequest.delete(customer.id)
                                await fetchCustomers() // Fetch fresh data after delete
                                toast.success("Xóa khách hàng thành công")
                            } catch (error) {
                                toast.error("Không thể xóa khách hàng")
                                console.error("Error deleting customer:", error)
                            }
                        } else {
                            // If no ID, just remove from local state
                            const newData = [...tableData]
                            newData.splice(rowIndex, 1)
                            setTableData(newData)
                            toast.success("Xóa dòng thành công")
                        }
                    }
                },
            },
        },
    }

    // Add custom CSS for the table
    useEffect(() => {
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
      @keyframes fadeInModal {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .animate-fadeIn {
        animation: fadeInModal 0.2s ease-out;
      }
      [data-placeholder]::before {
        content: attr(data-placeholder);
        color: #9CA3AF;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
      }
    `
        document.head.appendChild(style)
        return () => {
            document.head.removeChild(style)
        }
    }, [])

    // Add handler for array field modal
    const handleArrayFieldSave = async (newData: string[]) => {
        if (!arrayFieldModalData) return

        const { field, rowIndex } = arrayFieldModalData
        const customer = tableData[rowIndex]
        if (!customer || !customer.id) return

        try {
            const updatedCustomer = {
                ...customer,
                [field]: newData,
            }

            // Update API first
            await customerApiRequest.update(transformToApiFormat(updatedCustomer))
            await fetchCustomers() // Fetch fresh data after update

            // Update the modal data to reflect the latest changes
            setArrayFieldModalData({
                ...arrayFieldModalData,
                data: newData,
            })

            // Close the modal
            setShowArrayFieldModal(false)
            setArrayFieldModalData(null)
        } catch (error) {
            console.error(`Error updating ${field}:`, error)
            toast.error(`Không thể cập nhật ${field === "ten" ? "Tên" : "Telegram"}`)
        }
    }

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
                                onClick={handleAddRow}
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

            {/* Add ArrayFieldModal */}
            {showArrayFieldModal && arrayFieldModalData && (
                <ArrayFieldModal
                    isOpen={showArrayFieldModal}
                    onClose={() => {
                        setShowArrayFieldModal(false)
                        setArrayFieldModalData(null)
                    }}
                    title={`Quản lý ${arrayFieldModalData.field === "ten" ? "Tên" : "Telegram"}`}
                    field={arrayFieldModalData.field}
                    data={arrayFieldModalData.data}
                    onSave={handleArrayFieldSave}
                />
            )}
        </div>
    )
}
