'use client'

import React, { useState, useRef, useEffect } from 'react';
import { message, Spin, Switch } from 'antd';
import { ChevronLeftIcon, ChevronRightIcon, CirclePlus, Files, RotateCcw, Save, Trash2, Copy, Plus, User } from 'lucide-react';

interface Column {
    title: string | React.ReactNode;
    dataIndex: string;
    key: string;
    render?: (value: any, record: any) => React.ReactNode;
    sorter?: (a: any, b: any) => number;
    editable?: boolean;
    type?: 'text' | 'number' | 'password' | 'email' | 'tel' | 'date';
}

interface Props {
    columns: Column[];
    data: any[];
    setData: (data: any[], modifiedRows: Set<any>) => void;
    rowKeyProp: string;
    isLoading?: boolean;
    modifiedRows: Set<any>;
    setModifiedRows: React.Dispatch<React.SetStateAction<Set<any>>>;
    title: string;
    pageSize: number;
    handleSave: () => void;
    handleAdd: () => void;
    handleDelete: (id: string) => void;
    allowModeSwitch: boolean;
    currentPage: number;
    setCurrentPage: (page: any) => void;
    totalItems: number;
    placeholders?: { [key: string]: string };
}

const DataGrid: React.FC<Props> = ({
    columns,
    data,
    setData,
    rowKeyProp,
    isLoading = false,
    modifiedRows,
    setModifiedRows,
    title,
    pageSize,
    handleSave,
    handleAdd,
    handleDelete,
    allowModeSwitch,
    currentPage,
    setCurrentPage,
    totalItems,
    placeholders = {}
}) => {
    const [editingCell, setEditingCell] = useState<{ rowKey: string | number, dataIndex: string } | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);
    const tableRef = useRef<HTMLTableElement>(null);
    const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
    const [selectedAreas, setSelectedAreas] = useState<Set<string>[]>([new Set()]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [lastSelectedCell, setLastSelectedCell] = useState<{ row: number; col: number } | null>(null);
    const [isCopyMode, setIsCopyMode] = useState(true);

    const totalPages = Math.ceil(totalItems / pageSize);

    const handleCellClick = (rowKey: string | number, dataIndex: string, value: string, rowIndex: number, colIndex: number, event: React.MouseEvent) => {
        if (isCopyMode) {
            if (event.ctrlKey || event.metaKey) {
                setSelectedAreas(prev => [...prev, new Set([`${rowIndex},${colIndex}`])]);
            } else if (event.shiftKey && lastSelectedCell) {
                const startRow = Math.min(rowIndex, lastSelectedCell.row);
                const endRow = Math.max(rowIndex, lastSelectedCell.row);
                const startCol = Math.min(colIndex, lastSelectedCell.col);
                const endCol = Math.max(colIndex, lastSelectedCell.col);
                const newSelection = new Set<string>();
                for (let r = startRow; r <= endRow; r++) {
                    for (let c = startCol; c <= endCol; c++) {
                        newSelection.add(`${r},${c}`);
                    }
                }
                setSelectedAreas([newSelection]);
            } else {
                setSelectedAreas([new Set([`${rowIndex},${colIndex}`])]);
            }
            setLastSelectedCell({ row: rowIndex, col: colIndex });
            setIsSelecting(true);
        } else if (columns[colIndex].editable !== false) {
            setEditingCell({ rowKey, dataIndex });
            setEditValue(value === null || value === undefined || value === '' ? '' : value);
        }
    };

    const handleCellChange = (rowKey: string | number, dataIndex: string, value: string) => {
        const stringRowKey = rowKey.toString();
        const newData = data.map(item =>
            item[rowKeyProp].toString() === stringRowKey
                ? { ...item, [dataIndex]: value.trim() === '' ? null : value }
                : item
        );

        const newModifiedRows = new Set(modifiedRows);
        newModifiedRows.add(stringRowKey);
        setData(newData, newModifiedRows);
        setModifiedRows(newModifiedRows);
    };

    const handleInputBlur = () => {
        if (editingCell) {
            handleCellChange(editingCell.rowKey, editingCell.dataIndex, editValue);
            setEditingCell(null);
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleInputBlur();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    const handleColumnSelect = (colIndex: number) => {
        if (isCopyMode) {
            setSelectedAreas([]);
            setSelectedColumns(prev => {
                if (prev.includes(colIndex)) {
                    return prev.filter(col => col !== colIndex)
                } else {
                    return [...prev, colIndex]
                }
            })
        }
    }

    const resetSelection = () => {
        setSelectedColumns([]);
        setSelectedAreas([new Set()]);
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

    const copySelectedCells = () => {
        let copyText = "";
        const rows = tableRef.current?.querySelectorAll('tbody tr');

        if (selectedColumns.length > 0 && rows) {
            rows.forEach((row) => {
                const cells = row.querySelectorAll('td');
                let rowData = selectedColumns.map(colIndex => (cells[colIndex].textContent || "").trim() || " ");
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

            if (rows) {
                for (let r = minRow; r <= maxRow; r++) {
                    let rowData = [];
                    for (let c = minCol; c <= maxCol; c++) {
                        if (allSelectedCells.has(`${r},${c}`)) {
                            const cell = rows[r].querySelectorAll('td')[c];
                            rowData.push((cell.textContent || "").trim() || " ");
                        } else {
                            rowData.push(" ");
                        }
                    }
                    copyText += rowData.join("\t") + "\n";
                }
            }
        }

        if (copyText) {
            navigator.clipboard.writeText(copyText)
                .then(() => alert('Copied'))
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    copyToClipboardFallback(copyText);
                });
        }
    }

    const handleCellEnter = (row: number, col: number, event: React.MouseEvent) => {
        if (isCopyMode && isSelecting && event.buttons === 1) {
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
    }

    const handleMouseUp = () => {
        setIsSelecting(false);
    }

    const isCellSelected = (row: number, col: number) => {
        return selectedAreas.some(area => area.has(`${row},${col}`));
    }

    const toggleMode = (checked: boolean) => {
        setIsCopyMode(checked);
        resetSelection();
        setEditingCell(null);
    };

    return (
        <Spin className="min-h-48" spinning={isLoading}>
            <div className="overflow-x-auto rounded">
                <div className="text-md flex justify-between font-bold p-1 bg-gradient-to-r from-blue-500 to-blue-800 text-white flex items-center">
                    <h2 ><User className="inline-block mr-2" />{title}</h2>
                    <div className="flex items-center space-x-2">
                        <span className="mr-2 text-xs"> {allowModeSwitch ? 'Copy Mode' : ''}</span>
                        {allowModeSwitch && <Switch checked={isCopyMode} onChange={toggleMode} />}
                        {isCopyMode ? (
                            <>
                                <button
                                    onClick={copySelectedCells}
                                    className="flex items-center gap-1 text-xs px-3 py-1 text-white bg-green-500 rounded hover:bg-green-600"
                                >
                                    <Copy className="w-4 h-4" />Copy
                                </button>
                                <button
                                    onClick={resetSelection}
                                    className="flex items-center gap-1 text-xs px-3 py-1 text-white bg-zinc-500 rounded hover:bg-zinc-600"
                                >
                                    <RotateCcw className="w-4 h-4" /> Reset
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleAdd}
                                    className="flex items-center gap-1 text-xs px-3 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                                >
                                    <CirclePlus className="w-4 h-4" />Add New
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-1 text-xs px-3 py-1 text-white bg-red-500 rounded hover:bg-red-600"
                                >
                                    <Save className="w-4 h-4" />Save
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <table ref={tableRef} className="w-full border-collapse">
                    <thead className="sticky top-0 z-10 bg-gradient-to-r from-blue-500 to-blue-800 text-white select-none">
                        <tr>
                            {columns.map((column, index) => (
                                <th
                                    key={column.key}
                                    className={`px-2 py-2 text-left text-xs font-medium text-white tracking-wider border cursor-pointer ${selectedColumns.includes(index) ? 'bg-blue-700' : ''}`}
                                    onClick={() => handleColumnSelect(index)}
                                >
                                    <div className="flex items-center">
                                        {column.title}
                                    </div>
                                </th>
                            ))}
                            {allowModeSwitch && <th className="px-2 py-2 text-left text-xs font-medium text-white tracking-wider border"> Hành động </th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item, rowIndex) => (
                            <tr key={item[rowKeyProp]} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                {columns.map((column, columnIndex) => (
                                    <td
                                        key={column.key}
                                        className={`select-none px-2 py-1 text-xs border whitespace-nowrap overflow-hidden text-ellipsis max-w-xs
                                            ${isCopyMode && selectedColumns.includes(columnIndex) ? 'bg-blue-200' : ''}
                                            ${isCopyMode && isCellSelected(rowIndex, columnIndex) ? 'bg-sky-100' : ''}
                                            ${isCopyMode ? 'cursor-pointer' : ''}`}
                                        onMouseDown={(e) =>
                                            handleCellClick(
                                                item[rowKeyProp],
                                                column.dataIndex,
                                                item[column.dataIndex],
                                                rowIndex,
                                                columnIndex,
                                                e
                                            )
                                        }
                                        onMouseEnter={(e) => handleCellEnter(rowIndex, columnIndex, e)}
                                        onMouseUp={handleMouseUp}
                                    >
                                        {(() => {
                                            const isEditing =
                                                editingCell?.rowKey === item[rowKeyProp] &&
                                                editingCell?.dataIndex === column.dataIndex;

                                            return (
                                                <div className="relative w-full h-full">
                                                    {isEditing ? (
                                                        <input
                                                            ref={inputRef}
                                                            type={column.type || 'text'}
                                                            value={editValue}
                                                            onChange={(e) => {
                                                                setEditValue(e.target.value);
                                                                handleCellChange(item[rowKeyProp], column.dataIndex, e.target.value);
                                                            }}
                                                            onBlur={handleInputBlur}
                                                            onKeyDown={handleInputKeyDown}
                                                            className="w-full h-full border-none focus:outline-none bg-white absolute inset-0 p-0 z-10"
                                                            style={{ boxSizing: 'border-box' }}
                                                        />
                                                    ) : null}
                                                    <div
                                                        className={`w-full h-full ${!isCopyMode && column.editable !== false ? 'cursor-text' : ''
                                                            } ${isEditing ? 'invisible' : ''}`}
                                                        onClick={() => {
                                                            if (!isCopyMode && column.editable !== false) {
                                                                setEditingCell({
                                                                    rowKey: item[rowKeyProp],
                                                                    dataIndex: column.dataIndex,
                                                                });
                                                                setEditValue(item[column.dataIndex] === null || item[column.dataIndex] === undefined ? '' : item[column.dataIndex]);
                                                            }
                                                        }}
                                                    >
                                                        {column.render
                                                            ? column.render(item[column.dataIndex], item)
                                                            : (item[column.dataIndex] === null || item[column.dataIndex] === undefined || item[column.dataIndex] === ''
                                                                ? <span className="text-gray-400 italic">{placeholders[column.dataIndex] || 'Click to edit'}</span>
                                                                : (column.type === "password" ? "************" : item[column.dataIndex]))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                ))}
                                {allowModeSwitch && <td className="px-2 py-1 text-xs border whitespace-nowrap">
                                    <button
                                        onClick={() => handleDelete(item[rowKeyProp])}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                    <button
                        onClick={() => setCurrentPage((prev: number) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setCurrentPage((prev: number) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Next
                    </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs text-gray-700">
                            Showing <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
                            <span className="font-medium">{totalItems}</span> results
                        </p>
                    </div>
                    <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <button
                                onClick={() => setCurrentPage((prev: number) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                            >
                                <span className="sr-only">Previous</span>
                                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                            {Array.from({ length: totalPages }, (_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentPage(index + 1)}
                                    className={`relative inline-flex items-center px-4 py-2 text-xs font-semibold ${currentPage === index + 1
                                        ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                        }`}
                                >
                                    {index + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage((prev: number) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                            >
                                <span className="sr-only">Next</span>
                                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </Spin>
    );
};

export default DataGrid;

