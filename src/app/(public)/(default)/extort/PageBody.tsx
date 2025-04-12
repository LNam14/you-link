'use client'

import { useState, useEffect, useRef, useCallback } from "react"
import sheetApiRequest from "@/apiRequests/sheet"
import { Card, Spin, message, Button, Select, Switch } from "antd"
import { CopyOutlined, ReloadOutlined, LoadingOutlined } from '@ant-design/icons'

interface SiteData {
    site: string
    topic: string
    linkOut: string
    DR: string
    TF: string
    note: string
    status: string
    gp: string
    footer: string
    home: string
    header: string
    attention: string
}

interface CellPosition {
    row: number
    col: number
}

export default function PageBody() {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<SiteData[]>([])
    const [searchTerms, setSearchTerms] = useState("")
    const [searchResults, setSearchResults] = useState<SiteData[]>([])
    const [selectedAreas, setSelectedAreas] = useState<Set<string>[]>([new Set()])
    const [isSelecting, setIsSelecting] = useState(false)
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
    const tableRef: any = useRef<HTMLTableElement>(null)
    const duplicateTableRef: any = useRef<HTMLTableElement>(null)
    const [showResult, setShowResult] = useState(false)
    const [lastSelectedCell, setLastSelectedCell] = useState<CellPosition | null>(null)
    const [notFoundSites, setNotFoundSites] = useState<string[]>([])
    const [selectedColumns, setSelectedColumns] = useState<number[]>([])
    const [isMobile, setIsMobile] = useState(false);
    const [duplicateSites, setDuplicateSites] = useState<SiteData[]>([])
    const [selectedDuplicateAreas, setSelectedDuplicateAreas] = useState<Set<string>[]>([new Set()])
    const [selectedDuplicateColumns, setSelectedDuplicateColumns] = useState<number[]>([])

    const columnNames = [
        "Site", "Topic", "Link Out", "DR", "TF", "Note", "Status", "GP", "Footer", "Home", "Header", "Attention"
    ]

    const fetchData = async () => {
        try {
            setLoading(true)
            const response: any = await sheetApiRequest.getDataExtort()
            setData(response.data)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const isValidDomain = (domain: string) => {
        const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+(\.[a-zA-Z0-9-_]+)+.*)$/;
        return domainRegex.test(domain);
    };

    const extractDomain = (url: string | undefined): string => {
        if (!url) return '';
        return url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
            .split('/')[0]
            .toLowerCase();
    }

    const handleSearch = useCallback(async () => {
        try {
            setLoading(true);
            setShowResult(true);

            const terms = searchTerms
                .split(/[\s\n]+/)
                .map(term => extractDomain(term.trim()))
                .filter(Boolean);

            const results: SiteData[] = [];
            const duplicates: SiteData[] = [];
            const siteMap = new Map<string, SiteData>();

            terms.forEach(term => {
                if (!term) return;

                const matchingSites = data.filter((item: SiteData) =>
                    extractDomain(item.site) === term
                );

                if (matchingSites.length > 0) {
                    results.push(matchingSites[0]);
                    siteMap.set(term, matchingSites[0]);

                    if (matchingSites.length > 1) {
                        duplicates.push(...matchingSites.slice(1));
                    }
                } else if (isValidDomain(term)) {
                    const emptySite: SiteData = {
                        site: term,
                        topic: '',
                        linkOut: '',
                        DR: '',
                        TF: '',
                        note: '',
                        status: '',
                        gp: '',
                        footer: '',
                        home: '',
                        header: '',
                        attention: ''
                    };
                    results.push(emptySite);
                    siteMap.set(term, emptySite);
                }
            });

            if (data.length > 0) {
                setSearchResults(results);
                setDuplicateSites(duplicates);

                const notFoundShow = terms.filter(term => !siteMap.has(term));
                setNotFoundSites(notFoundShow);

                if (notFoundShow.length > 0) {
                    // await siteApiRequest.save(notFoundShow);
                }
            } else {
                alert('Vui lòng load lại trang để nạp dữ liệu');
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setTimeout(() => {
                setLoading(false);
            }, 200);
        }
    }, [searchTerms, data]);

    useEffect(() => {
        if (searchTerms) {
            handleSearch()
        }
    }, [handleSearch])

    const handleColumnSelect = (colIndex: number) => {
        setSelectedAreas([]);
        setSelectedColumns(prev => {
            if (prev.includes(colIndex)) {
                return prev.filter(col => col !== colIndex)
            } else {
                return [...prev, colIndex]
            }
        })
    }

    const resetColumnSelection = () => {
        setSelectedColumns([]);
        setSelectedAreas([]);
    }

    const copyToClipboardFallback = (text: string) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            alert('Copied to clipboard');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            message.error('Failed to copy');
        }
        document.body.removeChild(textArea);
    };

    const addEmptyColumns = (rowData: string[], selectedIndices: number[]) => {
        const gpIndex = columnNames.indexOf("GP");
        const attentionIndex = columnNames.indexOf("Attention");

        const selectedGPIndex = selectedIndices.indexOf(gpIndex);
        const selectedAttentionIndex = selectedIndices.indexOf(attentionIndex);

        if (selectedGPIndex !== -1 && selectedGPIndex < rowData.length - 1) {
            rowData.splice(selectedGPIndex + 1, 0, " ");
            selectedIndices = selectedIndices.map(i => i > selectedGPIndex ? i + 1 : i);
        }

        if (selectedAttentionIndex !== -1 && selectedAttentionIndex < rowData.length - 1) {
            rowData.splice(selectedAttentionIndex + 2, 0, " ");
        }

        return rowData;
    };

    const copySelectedCells = useCallback(() => {
        if (!tableRef.current) return;
        let copyText = "";
        const rows = tableRef.current.querySelectorAll('tbody tr');

        if (selectedColumns.length > 0) {
            rows.forEach((row: any) => {
                const cells = row.querySelectorAll('td');
                let rowData = selectedColumns.map(colIndex => (cells[colIndex].textContent || "").trim() || " ");
                rowData = addEmptyColumns(rowData, selectedColumns);
                copyText += rowData.join("\t") + "\n";
            });
        } else {
            const allSelectedCells = new Set<string>();
            selectedAreas.forEach(area => {
                area.forEach(cell => allSelectedCells.add(cell));
            });

            let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;

            allSelectedCells.forEach(cell => {
                const [row, col] = cell.split(',').map(Number);
                minRow = Math.min(minRow, row);
                maxRow = Math.max(maxRow, row);
                minCol = Math.min(minCol, col);
                maxCol = Math.max(maxCol, col);
            });

            for (let r = minRow; r <= maxRow; r++) {
                let rowData = [];
                for (let c = minCol; c <= maxCol; c++) {
                    if (allSelectedCells.has(`${r},${c}`)) {
                        const cell = rows[r - 1].querySelectorAll('td')[c];
                        rowData.push((cell.textContent || "").trim() || " ");
                    } else {
                        rowData.push(" ");
                    }
                }
                rowData = addEmptyColumns(rowData, Array.from({ length: maxCol - minCol + 1 }, (_, i) => i + minCol));
                copyText += rowData.join("\t") + "\n";
            }
        }

        if (copyText) {
            navigator.clipboard.writeText(copyText)
                .then(() => alert('Đã sao chép'))
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    copyToClipboardFallback(copyText);
                });
        }
    }, [selectedColumns, selectedAreas, columnNames]);

    const handleCellClick = useCallback((row: number, col: number, event: React.MouseEvent) => {
        setSelectedDuplicateColumns([]);
        setSelectedDuplicateAreas([]);
        if (row === 0) return;
        if (isMobile) {
            setSelectedAreas(prev => {
                const newAreas = [...prev];
                const lastArea = newAreas[newAreas.length - 1];
                if (lastArea.has(`${row},${col}`)) {
                    lastArea.delete(`${row},${col}`);
                } else {
                    lastArea.add(`${row},${col}`);
                }
                return newAreas;
            });
        } else {
            setSelectedColumns([]);
            if (event.ctrlKey) {
                setSelectedAreas(prev => [...prev, new Set([`${row},${col}`])]);
            } else {
                setSelectedAreas(prev => [...prev, new Set([`${row},${col}`])]);
            }
            setLastSelectedCell({ row, col });
            setIsSelecting(true);
        }
    }, [isMobile]);

    const handleCellEnter = useCallback((row: number, col: number, event: React.MouseEvent) => {
        if (isMobile || row === 0) return;
        if (isSelecting && event.buttons === 1) {
            setSelectedAreas(prev => {
                const newAreas = [...prev];
                const lastArea = newAreas[newAreas.length - 1];
                if (lastSelectedCell) {
                    const startRow = Math.min(row, lastSelectedCell.row);
                    const endRow = Math.max(row, lastSelectedCell.row);
                    const startCol = Math.min(col, lastSelectedCell.col);
                    const endCol = Math.max(col, lastSelectedCell.col);
                    for (let r = startRow; r <= endRow; r++) {
                        for (let c = startCol; c <= endCol; c++) {
                            lastArea.add(`${r},${c}`);
                        }
                    }
                }
                return newAreas;
            });
        }
    }, [isSelecting, lastSelectedCell, isMobile]);

    const handleMouseUp = useCallback(() => {
        setIsSelecting(false);
    }, []);

    const isCellSelected = useCallback((row: number, col: number) => {
        return selectedAreas.some(area => area.has(`${row},${col}`));
    }, [selectedAreas]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleDuplicateColumnSelect = (colIndex: number) => {
        setSelectedDuplicateAreas([]);
        setSelectedDuplicateColumns(prev => {
            if (prev.includes(colIndex)) {
                return prev.filter(col => col !== colIndex)
            } else {
                return [...prev, colIndex]
            }
        })
    }

    const resetDuplicateColumnSelection = () => {
        setSelectedDuplicateColumns([]);
        setSelectedDuplicateAreas([]);
    }

    const copyDuplicateSelectedCells = useCallback(() => {
        if (!duplicateTableRef.current) return;
        let copyText = "";
        const rows = duplicateTableRef.current.querySelectorAll('tbody tr');

        if (selectedDuplicateColumns.length > 0) {
            rows.forEach((row: any) => {
                const cells = row.querySelectorAll('td');
                let rowData = selectedDuplicateColumns.map(colIndex => (cells[colIndex].textContent || "").trim() || " ");
                rowData = addEmptyColumns(rowData, selectedDuplicateColumns);
                copyText += rowData.join("\t") + "\n";
            });
        } else {
            const allSelectedCells = new Set<string>();
            selectedDuplicateAreas.forEach(area => {
                area.forEach(cell => allSelectedCells.add(cell));
            });

            let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;

            allSelectedCells.forEach(cell => {
                const [row, col] = cell.split(',').map(Number);
                minRow = Math.min(minRow, row);
                maxRow = Math.max(maxRow, row);
                minCol = Math.min(minCol, col);
                maxCol = Math.max(maxCol, col);
            });

            for (let r = minRow; r <= maxRow; r++) {
                let rowData = [];
                for (let c = minCol; c <= maxCol; c++) {
                    if (allSelectedCells.has(`${r},${c}`)) {
                        const cell = rows[r - 1].querySelectorAll('td')[c];
                        rowData.push((cell.textContent || "").trim() || " ");
                    } else {
                        rowData.push(" ");
                    }
                }
                rowData = addEmptyColumns(rowData, Array.from({ length: maxCol - minCol + 1 }, (_, i) => i + minCol));
                copyText += rowData.join("\t") + "\n";
            }
        }

        if (copyText) {
            navigator.clipboard.writeText(copyText)
                .then(() => alert('Đã sao chép'))
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    copyToClipboardFallback(copyText);
                });
        }
    }, [selectedDuplicateColumns, selectedDuplicateAreas, columnNames]);

    const handleDuplicateCellClick = useCallback((row: number, col: number, event: React.MouseEvent) => {
        setSelectedColumns([]);
        setSelectedAreas([]);
        if (row === 0) return;
        if (isMobile) {
            setSelectedDuplicateAreas(prev => {
                const newAreas = [...prev];
                const lastArea = newAreas[newAreas.length - 1];
                if (lastArea.has(`${row},${col}`)) {
                    lastArea.delete(`${row},${col}`);
                } else {
                    lastArea.add(`${row},${col}`);
                }
                return newAreas;
            });
        } else {
            setSelectedDuplicateColumns([]);
            if (event.ctrlKey) {
                setSelectedDuplicateAreas(prev => [...prev, new Set([`${row},${col}`])]);
            } else {
                setSelectedDuplicateAreas(prev => [...prev, new Set([`${row},${col}`])]);
            }
            setLastSelectedCell({ row, col });
            setIsSelecting(true);
        }
    }, [isMobile]);

    const handleDuplicateCellEnter = useCallback((row: number, col: number, event: React.MouseEvent) => {
        if (isMobile || row === 0) return;
        if (isSelecting && event.buttons === 1) {
            setSelectedDuplicateAreas(prev => {
                const newAreas = [...prev];
                const lastArea = newAreas[newAreas.length - 1];
                if (lastSelectedCell) {
                    const startRow = Math.min(row, lastSelectedCell.row);
                    const endRow = Math.max(row, lastSelectedCell.row);
                    const startCol = Math.min(col, lastSelectedCell.col);
                    const endCol = Math.max(col, lastSelectedCell.col);
                    for (let r = startRow; r <= endRow; r++) {
                        for (let c = startCol; c <= endCol; c++) {
                            lastArea.add(`${r},${c}`);
                        }
                    }
                }
                return newAreas;
            });
        }
    }, [isSelecting, lastSelectedCell, isMobile]);

    const isDuplicateCellSelected = useCallback((row: number, col: number) => {
        return selectedDuplicateAreas.some(area => area.has(`${row},${col}`));
    }, [selectedDuplicateAreas]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                copySelectedCells();
                copyDuplicateSelectedCells();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [copySelectedCells, copyDuplicateSelectedCells]);

    const copyEntireTable = useCallback((tableRef: React.RefObject<HTMLTableElement>) => {
        setSelectedColumns([]);
        setSelectedAreas([]);
        setSelectedDuplicateColumns([]);
        setSelectedDuplicateAreas([]);

        if (!tableRef.current) return;
        let copyText = "";
        const rows = tableRef.current.querySelectorAll('tbody tr');
        rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            let rowData = Array.from(cells).map(cell => (cell.textContent || "").trim() || " ");
            copyText += rowData.join("\t") + "\n";
        });

        if (copyText) {
            navigator.clipboard.writeText(copyText)
                .then(() => alert('Đã sao chép toàn bộ bảng'))
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    copyToClipboardFallback(copyText);
                });
        }
    }, []);

    return (
        <Spin indicator={<LoadingOutlined style={{ fontSize: 42 }} spin />} spinning={loading}>
            <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white">
                <div className="max-w-7xl mx-auto p-0 pt-2">
                    <div className="rounded-lg pt-6 mb-8">
                        <h2 className="text-xl font-bold mb-6 text-center text-blue-600">Check Ăn Chặn</h2>
                        <div className="space-y-6">
                            <div className="flex flex-col space-y-2 px-2 md:px-0">
                                <textarea
                                    placeholder="Nhập vào site (cách nhau bằng dấu cách hoặc xuống dòng)..."
                                    value={searchTerms}
                                    onChange={(e) => {
                                        setSearchTerms(e.target.value)
                                    }}
                                    className="bg-blue-50 text-[14px] w-full px-4 py-2 shadow-md border-gray-300 rounded-[10px] focus:outline-none  focus:ring-2 focus:ring-blue-500 transition duration-200 ease-in-out"
                                    rows={5}
                                    style={{ scrollbarWidth: "thin" }}
                                />
                                <button
                                    onClick={() => { handleSearch() }}
                                    disabled={loading}
                                    className="text-[13px] px-6 py-3 bg-blue-500 text-white rounded-[8px] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition duration-200 ease-in-out transform hover:scale-105"
                                >
                                    {loading ? "Đang tìm kiếm..." : "Tìm kiếm"}
                                </button>
                            </div>

                            <div className="flex flex-col px-2 md:px-0 sm:flex-row sm:space-x-4 justify-start md:gap-20 gap-2 text-[13px]">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[#195A8B] text-[15px] font-medium">Hướng dẫn sử dụng</span>
                                    <span className="text-[13px] text-[#1169B9]">1. Copy theo vùng dữ liệu (PC)</span>
                                    <span className="ml-4 text-[13px] text-[#1169B9]">Kéo thả vùng cần copy sau đó ấn Ctrl + C</span>
                                    <span className="text-[13px] text-[#11169B9]">2. Copy theo cột</span>
                                    <span className="ml-4 text-[13px] text-[#1169B9]">Chọn cột cần copy sau đó ấn Ctrl + C hoặc nút Copy (mobile)</span>
                                    <span className="text-[13px] text-[#1169B9]">3. Ấn vào nút reset để clear vùng, cột đã chọn</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="pt-2 overflow-hidden mb-8">
                            <div className="flex justify-between items-center px-6 mb-4 flex-wrap">
                                <h3 className="text-xl font-semibold text-blue-600">Kết quả</h3>
                                <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                                    <div className="hidden sm:flex items-center space-x-4">
                                        <button
                                            onClick={resetColumnSelection}
                                            className="flex items-center gap-1 text-[13px] px-3 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                                        >
                                            <ReloadOutlined /> Reset
                                        </button>
                                        <button
                                            onClick={() => copyEntireTable(tableRef)}
                                            className="flex items-center gap-1 text-[13px] px-3 py-1 text-white bg-green-500 rounded hover:bg-green-600"
                                        >
                                            <CopyOutlined /> Copy All
                                        </button>
                                    </div>
                                    <div className="flex sm:hidden space-x-2">
                                        <button
                                            onClick={resetColumnSelection}
                                            className="flex items-center gap-1 text-[13px] px-3 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                                        >
                                            <ReloadOutlined /> Reset
                                        </button>
                                        <button
                                            onClick={copySelectedCells}
                                            disabled={selectedColumns.length === 0}
                                            className={`flex items-center gap-1 text-[13px] px-3 py-1 rounded ${selectedColumns.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}
                                        >
                                            <CopyOutlined /> Copy
                                        </button>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="mr-2">Bảng</span>
                                        <Switch
                                            checked={viewMode === 'card'}
                                            onChange={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
                                        />
                                        <span className="ml-2">Thẻ</span>
                                    </div>
                                </div>
                            </div>
                            {viewMode === 'table' ? (
                                <div className="overflow-x-auto">
                                    <div className="max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                                        <table ref={tableRef} className="min-w-full">
                                            <thead className="sticky top-0 z-10 bg-blue-500">
                                                <tr className="bg-blue-500">
                                                    {columnNames.map((header, index) => (
                                                        <th
                                                            key={index}
                                                            className={`px-2 py-2 text-left text-xs font-medium text-white tracking-wider border cursor-pointer ${selectedColumns.includes(index) ? 'bg-blue-700' : ''}`}
                                                            onClick={() => handleColumnSelect(index)}
                                                        >
                                                            <div className="flex items-center">
                                                                {header}
                                                            </div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {searchResults.map((result: any, rowIndex) => (
                                                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                        {columnNames.map((_, columnIndex) => (
                                                            <td
                                                                key={columnIndex}
                                                                style={{ userSelect: 'none' }}
                                                                className={`px-2 py-1
                                                                text-xs border whitespace-nowrap overflow-hidden text-ellipsis max-w-xs
                                                                ${selectedColumns.includes(columnIndex) ? 'bg-blue-200' : ''}
                                                                ${isMobile
                                                                        ? isCellSelected(rowIndex + 1, columnIndex) ? 'bg-blue-200' : ''
                                                                        : isCellSelected(rowIndex + 1, columnIndex) ? 'bg-sky-100' : ''
                                                                    }`}
                                                                onMouseDown={(e) => handleCellClick(rowIndex + 1, columnIndex, e)}
                                                                onMouseEnter={(e) => handleCellEnter(rowIndex + 1, columnIndex, e)}
                                                                onMouseUp={handleMouseUp}
                                                            >
                                                                {columnIndex === 0 ? result.site :
                                                                    columnIndex === 1 ? result.topic :
                                                                        columnIndex === 2 ? result.linkOut :
                                                                            columnIndex === 3 ? result.DR :
                                                                                columnIndex === 4 ? result.TF :
                                                                                    columnIndex === 5 ? result.note :
                                                                                        columnIndex === 6 ? result.status :
                                                                                            columnIndex === 7 ? result.gp :
                                                                                                columnIndex === 8 ? result.footer :
                                                                                                    columnIndex === 9 ? result.home :
                                                                                                        columnIndex === 10 ? result.header :
                                                                                                            result.attention}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                                    {searchResults.map((result, index) => (
                                        <Card key={index} className="bg-blue-50 border-none shadow-md border-t-2">
                                            <h4 className="font-semibold mb-2 text-[#FA298A] text-lg">{result.site}</h4>
                                            <p>Topic: {result.topic}</p>
                                            <p>Link Out: {result.linkOut}</p>
                                            <p>DR: {result.DR}</p>
                                            <p>TF: {result.TF}</p>
                                            <p>Note: {result.note}</p>
                                            <p>Status: {result.status}</p>
                                            <p>GP: {result.gp}</p>
                                            <p>Footer: {result.footer}</p>
                                            <p>Home: {result.home}</p>
                                            <p>Header: {result.header}</p>
                                            <p>Attention: {result.attention}</p>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {duplicateSites.length > 0 && (
                        <div className="pt-2 overflow-hidden mb-8">
                            <div className="flex justify-between items-center px-6 mb-4 flex-wrap">
                                <h3 className="text-xl font-semibold text-blue-600">Các site trùng</h3>
                                <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                                    <div className="hidden sm:flex items-center space-x-4">
                                        <button
                                            onClick={resetDuplicateColumnSelection}
                                            className="flex items-center gap-1 text-[13px] px-3 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                                        >
                                            <ReloadOutlined /> Reset
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => copyEntireTable(duplicateTableRef)}
                                        className="flex items-center gap-1 text-[13px] px-3 py-1 text-white bg-green-500 rounded hover:bg-green-600"
                                    >
                                        <CopyOutlined /> Copy All
                                    </button>
                                    <div className="flex sm:hidden space-x-2">
                                        <button
                                            onClick={resetDuplicateColumnSelection}
                                            className="flex items-center gap-1 text-[13px] px-3 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                                        >
                                            <ReloadOutlined /> Reset
                                        </button>
                                        <button
                                            onClick={copyDuplicateSelectedCells}
                                            disabled={selectedDuplicateColumns.length === 0}
                                            className={`flex items-center gap-1 text-[13px] px-3 py-1 rounded ${selectedDuplicateColumns.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}
                                        >
                                            <CopyOutlined /> Copy
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                                    <table ref={duplicateTableRef} className="min-w-full">
                                        <thead className="sticky top-0 z-10 bg-blue-500">
                                            <tr>
                                                {columnNames.map((header, index) => (
                                                    <th
                                                        key={index}
                                                        className={`px-2 py-2 text-left text-xs font-medium text-white tracking-wider border cursor-pointer ${selectedDuplicateColumns.includes(index) ? 'bg-blue-700' : ''}`}
                                                        onClick={() => handleDuplicateColumnSelect(index)}
                                                    >
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {duplicateSites.map((result: any, rowIndex) => (
                                                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                    {columnNames.map((_, columnIndex) => (
                                                        <td
                                                            key={columnIndex}
                                                            style={{ userSelect: 'none' }}
                                                            className={`px-2 py-1 text-xs border whitespace-nowrap overflow-hidden text-ellipsis max-w-xs
                                ${selectedDuplicateColumns.includes(columnIndex) ? 'bg-blue-200' : ''}
                                ${isMobile
                                                                    ? isDuplicateCellSelected(rowIndex + 1, columnIndex) ? 'bg-blue-200' : ''
                                                                    : isDuplicateCellSelected(rowIndex + 1, columnIndex) ? 'bg-sky-100' : ''
                                                                }`}
                                                            onMouseDown={(e) => handleDuplicateCellClick(rowIndex + 1, columnIndex, e)}
                                                            onMouseEnter={(e) => handleDuplicateCellEnter(rowIndex + 1, columnIndex, e)}
                                                            onMouseUp={handleMouseUp}
                                                        >
                                                            {result[columnNames[columnIndex].toLowerCase().replace(/\s+/g, '')]}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {showResult && searchResults.length === 0 && (
                        <p className="text-red-500 mt-4 bg-white shadow-md rounded-[8px] p-6 text-center">Không tìm thấy kết quả.</p>
                    )}

                    {notFoundSites.length > 0 && (
                        <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4" role="alert">
                            <p className="font-bold">Không tìm thấy các site sau:</p>
                            <ul className="list-disc list-inside">
                                {notFoundSites.map((site, index) => (
                                    <li key={index}>{site}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </Spin>
    )
}

