"use client"
import { useMemo, useEffect, useState } from "react"
import { HotTable } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import Handsontable from "handsontable"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import sheetApiRequest from "@/apiRequests/sheet"
import { Input, Card, Radio, Button, Modal, InputNumber } from "antd"
import { SearchOutlined, PlusOutlined } from "@ant-design/icons"

// Register Handsontable's modules
registerAllModules()

// Define column headers
const RowHeader2 = [
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
]

// Define column settings
const columnSettings: Record<string, any> = {
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
                td.style.backgroundColor = "#52c41a" // Light green
                td.style.color = "#f6ffed"
            } else if (value === "Ngưng") {
                td.style.backgroundColor = "#f5222d" // Light red
                td.style.color = "#fff1f0"
            }
        },
    }
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

    const fetchData = async () => {
        try {
            setLoading(true)
            const data: any = await sheetApiRequest.getData()
            console.log('Raw data from API:', data)
            console.log('updateVN data:', data.updateVN)
            console.log('updateNN data:', data.updateNN)
            setDataVN(data.updateVN)
            setDataNN(data.updateNN)
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        if (searchText.trim()) {
            const searchTerms = searchText.split(/[\n\s]+/).filter(term => term.trim())
            const dataToFilter = dataType === 1 ? dataVN : dataNN
            const filtered = dataToFilter.filter(row => {
                // Check if the site matches any search term
                const siteMatch = searchTerms.some(term =>
                    row.Site?.toLowerCase().includes(term.toLowerCase())
                )

                // Check if the site has any data in its columns
                const hasData = Object.keys(row).some(key =>
                    key !== 'Site' && row[key] && row[key].toString().trim() !== ''
                )

                return siteMatch && hasData
            })
            console.log("dataToFilter", dataToFilter)
            console.log("filtered", filtered)
            setFilteredData(filtered)
        } else {
            setFilteredData(dataType === 1 ? dataVN : dataNN)
        }
    }, [searchText, dataVN, dataNN, dataType])

    const handleAfterChange = (changes: Handsontable.CellChange[] | null, source: 'edit' | 'paste' | Handsontable.ChangeSource) => {
        if ((source === 'edit' || source === 'paste') && changes) {
            console.log('Changes received:', changes)

            // Group changes by row
            const updatesByRow = changes.reduce((acc: Record<number, any>, change) => {
                const [row, prop, oldValue, newValue] = change
                const columnName = typeof prop === 'string' ? prop : RowHeader2[prop as number]

                if (!columnName) return acc

                const dataToUse = dataType === 1 ? dataVN : dataNN
                const currentRow = searchText.trim() ? filteredData[row] : dataToUse[row]
                const actualRowIndex = currentRow.rowIndex

                if (!acc[actualRowIndex]) {
                    acc[actualRowIndex] = {
                        rowIndex: actualRowIndex,
                        changes: {}
                    }
                }

                // Convert null to empty string
                acc[actualRowIndex].changes[columnName] = newValue === null ? "" : newValue
                return acc
            }, {})

            const updates = Object.values(updatesByRow)
            console.log('Grouped updates:', updates)

            if (updates.length > 0) {
                const updateData = {
                    data: updates,
                    sheetType: dataType
                }
                console.log('Sending update data:', updateData)
                sheetApiRequest.updateData(updates, dataType)
            }
        }
    }

    const handleAfterPaste = (data: any[][], coords: any[]) => {
        console.log('Paste data:', data)
        console.log('Paste coordinates:', coords)

        // Lấy vị trí bắt đầu và số cột từ tọa độ đầu tiên
        const { startRow: initialStartRow, startCol } = coords[0]

        const updates = data.map((rowData, index) => {
            const currentRowIndex = initialStartRow + index
            const dataToUse = dataType === 1 ? dataVN : dataNN
            const currentRow = searchText.trim() ? filteredData[currentRowIndex] : dataToUse[currentRowIndex]

            if (!currentRow) return null

            const actualRowIndex = currentRow.rowIndex
            const changes = rowData.reduce((acc: Record<string, any>, value, colIndex) => {
                const columnName = RowHeader2[startCol + colIndex]
                if (columnName) {
                    // Convert null to empty string
                    acc[columnName] = value === null ? "" : value
                }
                return acc
            }, {})

            if (Object.keys(changes).length > 0) {
                return {
                    rowIndex: actualRowIndex,
                    changes
                }
            }
            return null
        }).filter(Boolean)

        console.log('Paste updates:', updates)

        if (updates.length > 0) {
            const updateData = {
                data: updates,
                sheetType: dataType
            }
            console.log('Sending paste update data:', updateData)
            sheetApiRequest.updateData(updates, dataType)
        }
    }

    const handleAfterRemoveRow = (index: number, amount: number, physicalRows: number[], source?: string) => {
        console.log('Remove data:', { index, amount, physicalRows, source })

        const updates = physicalRows.map(row => {
            const dataToUse = dataType === 1 ? dataVN : dataNN
            const currentRow = searchText.trim() ? filteredData[row] : dataToUse[row]
            const actualRowIndex = currentRow.rowIndex

            return {
                rowIndex: actualRowIndex,
                changes: {
                    'Tình trạng': 'Ngưng'
                }
            }
        })

        if (updates.length > 0) {
            const updateData = {
                data: updates,
                sheetType: dataType
            }
            console.log('Sending remove update data:', updateData)
            sheetApiRequest.updateData(updates, dataType)
        }
    }

    const handleAddRows = async () => {
        try {
            const newRows = Array.from({ length: numberOfRows }, () => ({
                'Site': '',
                'Chủ đề': '',
                'Nước': '',
                'Link out': '',
                'DR': '',
                'Keywords': '',
                'Traffic Tool': '',
                'Tình trạng': 'Bình thường',
                'GP ($)': '',
                'Text Footer ($)': '',
                'Text Home ($)': '',
                'Text Header ($)': '',
                'HH GP': '',
                'HH Text': ''
            }))

            console.log('Adding new rows:', newRows)
            await sheetApiRequest.appendRows(newRows, dataType)
            setIsAddModalVisible(false)
            // Refresh data after adding rows
            fetchData()
        } catch (error) {
            console.error('Error adding rows:', error)
            // Có thể thêm thông báo lỗi ở đây nếu cần
        }
    }

    return (
        <div className="w-full h-full flex flex-col">
            <Card className="mb-4">
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <Radio.Group
                            value={dataType}
                            onChange={(e) => setDataType(e.target.value)}
                            className="mb-4"
                        >
                            <Radio.Button value={1}>Data VN</Radio.Button>
                            <Radio.Button value={2}>Data NN</Radio.Button>
                        </Radio.Group>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsAddModalVisible(true)}
                        >
                            Thêm dòng
                        </Button>
                    </div>
                    <Input.TextArea
                        placeholder="Nhập tên site (cách nhau bằng dấu cách hoặc xuống dòng)"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        allowClear
                    />
                </div>
            </Card>
            <div className="flex-1">
                <HotTable
                    themeName="ht-theme-main"
                    colHeaders={RowHeader2}
                    filters={true}
                    width="auto"
                    autoColumnSize={true}
                    manualColumnResize={true}
                    height="calc(100vh - 200px)"
                    stretchH="all"
                    manualRowMove={true}
                    manualColumnMove={true}
                    manualRowResize={true}
                    className="custom-table"
                    licenseKey="non-commercial-and-evaluation"
                    data={searchText.trim() ? filteredData : []}
                    afterChange={handleAfterChange}
                    afterPaste={handleAfterPaste}
                    afterRemoveRow={handleAfterRemoveRow}
                    cells={function (this: Handsontable.CellProperties, row: number, col: number, prop: string | number) {
                        const header = RowHeader2[col]
                        return columnSettings[header] || {}
                    }}
                />
            </div>

            <Modal
                title="Thêm dòng mới"
                open={isAddModalVisible}
                onOk={handleAddRows}
                onCancel={() => setIsAddModalVisible(false)}
                okText="Thêm"
                cancelText="Hủy"
            >
                <div className="flex flex-col gap-2">
                    <div>Số dòng muốn thêm:</div>
                    <InputNumber
                        min={1}
                        max={100}
                        value={numberOfRows}
                        onChange={(value) => setNumberOfRows(value || 1)}
                    />
                </div>
            </Modal>
        </div>
    )
}
