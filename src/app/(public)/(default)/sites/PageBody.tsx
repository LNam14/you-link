"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import { HotTable } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import Handsontable from "handsontable"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import sheetApiRequest from "@/apiRequests/sheet"
import { Modal, message, Spin, Dropdown } from "antd"
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
    Trash2,
} from "lucide-react"
import getUserInfo from "@/components/userInfo"

// Register Handsontable's modules
registerAllModules()

// Define column headers
const RowHeader1 = [
    "STT",
    "Site",
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
    "NCC",
]

const RowHeader2 = [
    "Site",
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
]

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

export default function PageBody() {
    const [loading, setLoading] = useState(false)
    const [dataVN, setDataVN] = useState<any[]>([])
    const [dataNN, setDataNN] = useState<any[]>([])
    const [searchText, setSearchText] = useState("")
    const [filteredData, setFilteredData] = useState<any[]>([])
    const [dataType, setDataType] = useState<1 | 2>(1) // 1 for VN, 2 for NN
    const [isAddModalVisible, setIsAddModalVisible] = useState(false)
    const [numberOfRows, setNumberOfRows] = useState(1)
    const [pendingRows, setPendingRows] = useState<any[]>([])
    const [isTableLoading, setIsTableLoading] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()
    const [initialLoading, setInitialLoading] = useState(true)
    const [showSearchHelp, setShowSearchHelp] = useState(false)
    const [activeTab, setActiveTab] = useState<"data" | "pending">("data")
    const userInfo = getUserInfo()
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; row: number }>({
        visible: false,
        x: 0,
        y: 0,
        row: -1,
    });
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
            const data: any = await sheetApiRequest.getData()
            setDataVN(data.updateVN)
            setDataNN(data.updateNN)
        } catch (error) {
            console.error("Error fetching data:", error)
            messageApi.error({
                content: "Có lỗi xảy ra khi tải dữ liệu",
                icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
            })
        } finally {
            setLoading(false)
            setInitialLoading(false)
        }
    }, [messageApi])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    useEffect(() => {
        if (searchText.trim()) {
            setIsTableLoading(true)
            const searchTerms = searchText.split(/[\n\s]+/).filter((term) => term.trim())
            const dataToFilter = dataType === 1 ? dataVN : dataNN
            const filtered = dataToFilter.filter((row) => {
                const siteMatch = searchTerms.some((term) => row.Site?.toLowerCase().includes(term.toLowerCase()))
                const maNCCMatch = searchTerms.some((term) => row.MaNCC?.toLowerCase().includes(term.toLowerCase()))
                const hasData = Object.keys(row).some((key) => key !== "Site" && key !== "MaNCC" && row[key] && row[key].toString().trim() !== "")
                return (siteMatch || maNCCMatch) && hasData
            })
            setFilteredData(filtered)
            setIsTableLoading(false)
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

                    if (!columnName) return acc

                    const dataToUse = dataType === 1 ? dataVN : dataNN
                    const currentRow = searchText.trim() ? filteredData[row] : dataToUse[row]
                    const rowIndex = currentRow?.rowIndex ?? row

                    if (!acc[row]) {
                        acc[row] = {
                            rowIndex: rowIndex,
                            changes: {},
                        }
                    }

                    acc[row].changes[columnName] = newValue === null ? "" : newValue
                    return acc
                }, {})

                const updates = Object.values(updatesByRow)

                if (updates.length > 0) {
                    sheetApiRequest.updateData(updates, dataType).then(() => {
                        fetchData(); // Reload data after update
                        messageApi.success({
                            content: "Dữ liệu đã được cập nhật thành công",
                            icon: <CheckCircle2 className="text-green-500 mr-2" size={16} />,
                        });
                    });
                }
            }
        },
        [dataType, dataVN, dataNN, filteredData, searchText, messageApi, fetchData],
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
                            changes,
                        }
                    }
                    return null
                })
                .filter(Boolean)

            if (updates.length > 0) {
                sheetApiRequest.updateData(updates, dataType)
                messageApi.success({
                    content: "Dữ liệu đã được cập nhật thành công",
                    icon: <CheckCircle2 className="text-green-500 mr-2" size={16} />,
                })
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
                messageApi.success({
                    content: "Dữ liệu đã được cập nhật thành công",
                    icon: <CheckCircle2 className="text-green-500 mr-2" size={16} />,
                })
            }
        },
        [dataType, dataVN, dataNN, filteredData, searchText, messageApi],
    )

    const handleAddRows = useCallback(async () => {
        try {
            const newRows = Array.from({ length: numberOfRows }, () => ({
                Site: "",
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
                "HH Text": ""
            }))

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
    }, [numberOfRows, messageApi])

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
        [pendingRows],
    )

    const handleSavePendingRows = useCallback(async () => {
        try {
            const rowsToSave = pendingRows.filter((row) =>
                Object.entries(row).some(([key, value]) =>
                    key !== "Tình trạng" && value && value.toString().trim() !== ""
                ),
            )

            if (rowsToSave.length > 0) {
                Modal.confirm({
                    title: 'Xác nhận thêm dữ liệu',
                    content: `Bạn có chắc chắn muốn thêm ${rowsToSave.length} site không?`,
                    okText: 'Đồng ý',
                    cancelText: 'Hủy',
                    okButtonProps: {
                        className: "bg-green-600 hover:bg-green-700",
                    },
                    onOk: async () => {
                        await sheetApiRequest.appendRows(rowsToSave, dataType)
                        await fetchData(); // Reload data after adding new rows
                        setPendingRows([])
                        setActiveTab("data")
                        messageApi.success({
                            content: `Đã thêm thành công ${rowsToSave.length} site`,
                            icon: <CheckCircle2 className="text-green-500 mr-2" size={16} />,
                        })
                    }
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
    }, [pendingRows, dataType, messageApi, fetchData]);

    const clearSearch = useCallback(() => {
        setSearchText("")
        setFilteredData([])
    }, [])

    const handleContextMenu = useCallback((event: React.MouseEvent, row: number) => {
        event.preventDefault();
        setContextMenu({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            row,
        });
    }, []);

    const handleDeleteRow = useCallback(async (row: number) => {
        try {
            const dataToUse = dataType === 1 ? dataVN : dataNN;
            const currentRow = searchText.trim() ? filteredData[row] : dataToUse[row];
            const actualRowIndex = currentRow.rowIndex;

            Modal.confirm({
                title: 'Xác nhận xóa dòng',
                content: 'Bạn có chắc chắn muốn xóa dòng này không?',
                okText: 'Đồng ý',
                cancelText: 'Hủy',
                okButtonProps: {
                    className: "bg-green-600 hover:bg-green-700",
                },
                onOk: async () => {
                    try {
                        await sheetApiRequest.deleteRow(actualRowIndex, dataType);
                        await fetchData(); // Reload data after deletion
                        messageApi.success({
                            content: "Đã xóa dòng thành công",
                            icon: <CheckCircle2 className="text-green-500 mr-2" size={16} />,
                        });
                    } catch (error) {
                        console.error("Error deleting row:", error);
                        messageApi.error({
                            content: "Có lỗi xảy ra khi xóa dòng",
                            icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
                        });
                    }
                }
            });
        } catch (error) {
            console.error("Error preparing delete row:", error);
            messageApi.error({
                content: "Có lỗi xảy ra khi chuẩn bị xóa dòng",
                icon: <AlertCircle className="text-red-500 mr-2" size={16} />,
            });
        }
    }, [dataType, dataVN, dataNN, filteredData, searchText, messageApi, fetchData]);

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
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center text-sm px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 font-medium border border-blue-200 shadow-sm"
                        >
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Làm mới
                        </button>
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
                            <button
                                onClick={() => setDataType(1)}
                                className={`px-5 text-sm py-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium ${dataType === 1
                                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transform scale-105"
                                    : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                                    }`}
                            >
                                <Database className="w-4 h-4" />
                                Data VN
                            </button>
                            <button
                                onClick={() => setDataType(2)}
                                className={`px-5 text-sm py-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium ${dataType === 2
                                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transform scale-105"
                                    : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                                    }`}
                            >
                                <Globe className="w-4 h-4" />
                                Data NN
                            </button>
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
                        className={`flex-1 py-2 px-6 font-medium text-center transition-all duration-200 ${activeTab === "data"
                            ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50"
                            : "text-blue-500 hover:bg-blue-50"
                            }`}
                    >
                        Dữ Liệu Cập Nhật
                    </button>
                    {pendingRows.length > 0 && (
                        <button
                            onClick={() => setActiveTab("pending")}
                            className={`flex-1 py-2 px-6 font-medium text-center transition-all duration-200 relative ${activeTab === "pending"
                                ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50"
                                : "text-blue-500 hover:bg-blue-50"
                                }`}
                        >
                            Dữ Liệu Chờ Thêm
                            <span className="absolute top-3 right-3 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {pendingRows.length}
                            </span>
                        </button>
                    )}
                </div>

                {activeTab === "data" && (
                    <div className="p-0">
                        {searchText.trim() ? (
                            <div className="relative overflow-hidden border border-blue-200 shadow-sm">
                                {isTableLoading && (
                                    <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10 backdrop-blur-sm">
                                        <div className="text-center">
                                            <Spin indicator={<Loader2 className="w-8 h-8 animate-spin text-blue-600" />} />
                                            <p className="mt-4 text-blue-700 font-medium">Đang tải dữ liệu...</p>
                                        </div>
                                    </div>
                                )}
                                {filteredData.length === 0 && searchText.trim() ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center bg-white">
                                        <Search className="w-12 h-12 text-blue-300 mb-4" />
                                        <h3 className="text-lg font-medium text-blue-900 mb-2">Không tìm thấy kết quả</h3>
                                        <p className="text-blue-600">Không có dữ liệu nào phù hợp với từ khóa tìm kiếm của bạn</p>
                                    </div>
                                ) : (<HotTable
                                    themeName="ht-theme-main"
                                    colHeaders={RowHeader1}
                                    filters={true}
                                    width="auto"
                                    autoColumnSize={true}
                                    manualColumnResize={true}
                                    height="calc(100vh - 500px)"
                                    stretchH="all"
                                    manualRowMove={true}
                                    manualColumnMove={true}
                                    manualRowResize={true}
                                    className="custom-table"
                                    licenseKey="non-commercial-and-evaluation"
                                    data={filteredData}
                                    afterChange={handleAfterChange}
                                    afterPaste={handleAfterPaste}
                                    afterRemoveRow={handleAfterRemoveRow}
                                    cells={function (this: Handsontable.CellProperties, row: number, col: number, prop: string | number) {
                                        const header = RowHeader1[col]
                                        return columnSettings[header] || {}
                                    }}
                                    contextMenu={{
                                        items: {
                                            delete_row: {
                                                name: 'Xóa dòng',
                                                callback: function (key: string, selection: any, clickEvent: any) {
                                                    handleDeleteRow(selection[0].start.row);
                                                }
                                            }
                                        }
                                    }}
                                />)}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Search className="w-12 h-12 text-blue-300 mb-4" />
                                <h3 className="text-lg font-medium text-blue-900 mb-2">Nhập từ khóa tìm kiếm</h3>
                                <p className="text-blue-600">Vui lòng nhập từ khóa tìm kiếm để xem dữ liệu</p>
                            </div>
                        )}
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
                            {isTableLoading && (
                                <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10 backdrop-blur-sm">
                                    <Spin indicator={<Loader2 className="w-8 h-8 animate-spin text-blue-600" />} />
                                </div>
                            )}
                            <HotTable
                                themeName="ht-theme-main"
                                colHeaders={RowHeader2}
                                filters={true}
                                width="auto"
                                autoColumnSize={true}
                                manualColumnResize={true}
                                height="300px"
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
                                    return columnSettings[header] || {}
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
