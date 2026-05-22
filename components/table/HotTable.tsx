"use client";

import { useEffect, useRef, useState, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import { HotTable, type HotTableRef } from "@handsontable/react-wrapper";
import Handsontable from "handsontable";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.css";
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import './custom-table.css';

// Register all Handsontable modules
registerAllModules();

interface HotTableProps {
  data: any[][] | any[]; // Support both 2D array and object array
  columns: Column[];
  onAfterChange?: (changes: any[], source: string) => void;
  onAfterCreateRow?: (index: number, amount: number) => void;
  onAfterRemoveRow?: (index: number, amount: number, physicalRows?: number[], source?: string) => void;
  readOnly?: boolean;
  className?: string;
  contextMenuOptions?: {
    showAddRow?: boolean;
    showRemoveRow?: boolean;
  };
  contextMenuCustomItems?: Record<string, any>;
  hiddenColumns?: number[];
  invalidCells?: Map<string, string>; // Map of "row-col" to error message
  onValidationError?: (row: number, col: number, message: string) => void;
  onValidationSuccess?: (row: number, col: number) => void;
  onReadOnlyCellClick?: (row: number, col: number, message: string) => void;
  teamColors?: Map<string, string>; // Map of team name to color
  teamColumnIndex?: number; // Column index that contains team name (for row coloring)
  roleColumnIndex?: number; // Column index for Vai trò (to style red)
  statusColumnIndex?: number; // Column index for Trạng thái (to style red)
  showSummaryRowBorder?: boolean; // Show border bottom for row 0 (summary row)
  // Additional props for advanced features
  nestedHeaders?: any;
  beforeCopy?: (data: string[][], coords: any[], copiedHeadersCount?: any) => boolean | void;
  beforePaste?: (data: string[][], coords: any[]) => boolean | void;
  afterOnCellMouseDown?: (event: any, coords: any) => void;
  afterOnCellMouseUp?: (event: any, coords: any, instance?: Handsontable) => void;
  height?: string | number;
  width?: string | number;
  licenseKey?: string;
  stretchH?: "all" | "none" | "last";
  autoWrapRow?: boolean;
  rowHeaders?: boolean;
  colHeaders?: boolean;
  copyPaste?: boolean;
  columnSorting?: boolean;
  autoColumnSize?: boolean;
  preventOverflow?: boolean | "horizontal" | "vertical";
  renderAllRows?: boolean;
  viewportRowRenderingOffset?: number;
  manualColumnResize?: boolean;
  manualRowResize?: boolean;
  themeName?: string;
  outsideClickDeselects?: boolean;
  fillHandle?: boolean;
  selectionMode?: "multiple" | "single" | "range";
  allowInvalid?: boolean;
  skipRowOnPaste?: boolean;
  key?: string;
  applyCommonStyles?: boolean; // Apply fontSize 11px, fontWeight 600, textAlign center to all cells
}

export interface Column {
  data: string | number;
  title: string;
  type?: string;
  editor?: string | boolean;
  renderer?: string | ((instance: any, td: HTMLElement | HTMLTableCellElement, row: number, col: number, prop: string | number, value: any, cellProperties?: any) => HTMLElement | HTMLTableCellElement) | any;
  validator?: string;
  selectOptions?: string[] | { value: string; label: string }[];
  readOnly?: boolean;
  width?: number;
  hidden?: boolean;
  className?: string;
}

const HotTableComponent = forwardRef<HotTableRef, HotTableProps>(({
  data,
  columns,
  onAfterChange,
  onAfterCreateRow,
  onAfterRemoveRow,
  readOnly = false,
  className = "",
  contextMenuOptions = { showAddRow: true, showRemoveRow: true },
  contextMenuCustomItems = {},
  hiddenColumns = [],
  invalidCells = new Map(),
  onValidationError,
  onValidationSuccess,
  onReadOnlyCellClick,
  teamColors = new Map(),
  teamColumnIndex = 8, // Default to column 8 (team name)
  roleColumnIndex,
  statusColumnIndex,
  showSummaryRowBorder = false,
  nestedHeaders,
  beforeCopy,
  beforePaste,
  afterOnCellMouseDown,
  afterOnCellMouseUp,
  height = "auto",
  width = "100%",
  licenseKey = "non-commercial-and-evaluation",
  stretchH = "all",
  autoWrapRow = true,
  rowHeaders = false,
  colHeaders = true,
  copyPaste = true,
  columnSorting = true,
  autoColumnSize = false,
  preventOverflow,
  renderAllRows = false,
  viewportRowRenderingOffset = 20,
  manualColumnResize = true,
  manualRowResize = true,
  themeName = "ht-theme-main",
  outsideClickDeselects = false,
  fillHandle = true,
  selectionMode = "multiple",
  allowInvalid = true,
  skipRowOnPaste = false,
  key,
  applyCommonStyles = false,
  ...otherProps
}, ref) => {
  const hotTableRef = useRef<HotTableRef>(null);
  
  // Convert object array to 2D array if needed
  const convertData = useCallback((inputData: any[][] | any[], cols: Column[]): any[][] => {
    if (!Array.isArray(inputData) || inputData.length === 0) {
      return [];
    }
    if (!cols || cols.length === 0) {
      return [];
    }
    
    // Check if first element is an object (object array)
    if (typeof inputData[0] === 'object' && !Array.isArray(inputData[0])) {
      // Convert object array to 2D array
      return inputData.map((row: any) => {
        return cols.map((col) => {
          const value = row[col.data];
          return value !== undefined && value !== null ? value : "";
        });
      });
    }
    
    // Already 2D array
    return inputData as any[][];
  }, []);
  
  // Use useMemo to compute hotData - only recomputes when data or columns actually change
  const hotData = useMemo(() => {
    // Only convert if we have columns
    if (columns && columns.length > 0) {
      return convertData(data, columns);
    }
    // If no columns yet, check if data is already 2D array
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      return data as any[][];
    }
    return [];
  }, [data, columns, convertData]);
  
  // Expose ref methods
  useImperativeHandle(ref, () => hotTableRef.current as HotTableRef);

  // Wrap afterOnCellMouseDown to pass instance
  const wrappedAfterOnCellMouseDown = useCallback((event: any, coords: any) => {
    if (afterOnCellMouseDown) {
      const instance = hotTableRef.current?.hotInstance;
      if (instance) {
        // Pass instance as third parameter
        (afterOnCellMouseDown as any)(event, coords, instance);
      } else {
        afterOnCellMouseDown(event, coords);
      }
    }
  }, [afterOnCellMouseDown]);

  const wrappedAfterOnCellMouseUp = useCallback((event: any, coords: any) => {
    if (afterOnCellMouseUp) {
      const instance = hotTableRef.current?.hotInstance;
      if (instance) {
        afterOnCellMouseUp(event, coords, instance);
      } else {
        afterOnCellMouseUp(event, coords);
      }
    }
  }, [afterOnCellMouseUp]);

  // Style all headers with fontSize 11px, fontWeight 600, and center alignment if applyCommonStyles is true
  useEffect(() => {
    if (!applyCommonStyles) return;

    const styleHeaders = () => {
      const hotInstance = hotTableRef.current?.hotInstance;
      if (!hotInstance) return;

      // Find all header cells using DOM
      const htCore = hotInstance.rootElement?.querySelector('.htCore');
      if (htCore) {
        const thead = htCore.querySelector('thead');
        if (thead) {
          const headerRow = thead.querySelector('tr');
          if (headerRow) {
            const headerCells = headerRow.querySelectorAll('th');
            headerCells.forEach((headerCell) => {
              const cell = headerCell as HTMLElement;
              cell.style.fontSize = "11px";
              cell.style.fontWeight = "600";
              cell.style.setProperty("text-align", "center", "important");
              cell.style.setProperty("white-space", "nowrap", "important");
              cell.style.setProperty("overflow", "hidden", "important");
              cell.style.setProperty("text-overflow", "ellipsis", "important");
              // Set title to show full header text on hover
              const headerText = cell.textContent || cell.innerText || "";
              cell.title = headerText;
            });
          }
        }
      }
    };

    // Style headers after a short delay to ensure table is rendered
    const timeoutId = setTimeout(styleHeaders, 100);
    
    // Also style on afterRender event
    const hotInstance = hotTableRef.current?.hotInstance;
    if (hotInstance) {
      hotInstance.addHook('afterRender', styleHeaders);
    }

    return () => {
      clearTimeout(timeoutId);
      if (hotInstance) {
        hotInstance.removeHook('afterRender', styleHeaders);
      }
    };
  }, [hotData, columns, rowHeaders, applyCommonStyles]);

  const handleAfterChange = (changes: any[] | null | undefined, source: string) => {
    console.log("[HotTable] handleAfterChange called:", { changes, source, changesType: typeof changes, changesIsArray: Array.isArray(changes) });
    
    // Skip loadData and updateData sources (these are programmatic updates, not user edits)
    if (source === "loadData" || source === "updateData") {
      console.log("[HotTable] Skipping", source, "source");
      return;
    }
    
    // Ensure changes is a valid array
    if (!Array.isArray(changes) || changes.length === 0) {
      console.log("[HotTable] Changes is not array or empty:", { changes, isArray: Array.isArray(changes), length: changes?.length });
      return;
    }
    
    console.log("[HotTable] Calling onAfterChange with:", { changes, source, onAfterChangeExists: !!onAfterChange });
    
    // Call onAfterChange for all user action sources (edit, CopyPaste.paste, autofill, etc.)
    if (onAfterChange) {
      onAfterChange(changes, source);
    } else {
      console.warn("[HotTable] onAfterChange is not defined!");
    }
  };

  const handleAfterCreateRow = (index: number, amount: number) => {
    if (onAfterCreateRow) {
      onAfterCreateRow(index, amount);
    }
  };

  const handleAfterRemoveRow = (index: number, amount: number, physicalRows?: number[], source?: string) => {
    if (onAfterRemoveRow) {
      onAfterRemoveRow(index, amount, physicalRows, source);
    }
  };

  const columnSettings = columns.map((col) => {
    const setting: any = {
      data: col.data,
      title: col.title,
      readOnly: col.readOnly || readOnly,
    };

    if (col.type) {
      setting.type = col.type;
    }

    if (col.editor !== undefined) {
      setting.editor = col.editor;
    }

    if (col.renderer) {
      // Support both string renderer names and function renderers
      if (typeof col.renderer === 'function') {
        setting.renderer = col.renderer;
      } else {
        setting.renderer = col.renderer;
      }
    }
    
    if (col.className) {
      setting.className = col.className;
    }

    // Only set validator if explicitly provided
    if (col.validator !== undefined && col.validator) {
      setting.validator = col.validator;
    } else {
      // Disable validation by default
      setting.validator = false;
    }

    if (col.selectOptions) {
      if (Array.isArray(col.selectOptions) && col.selectOptions.length > 0) {
        if (typeof col.selectOptions[0] === "string") {
          setting.type = "dropdown";
          setting.source = col.selectOptions;
        } else {
          // Store selectOptions in closure to access in renderer
          const selectOptions = col.selectOptions as { value: string; label: string }[];
          setting.type = "dropdown";
          setting.source = selectOptions.map((opt) => opt.value);
          setting.renderer = function (
            instance: any,
            td: HTMLElement,
            row: number,
            colIndex: number,
            prop: string | number,
            value: any,
            cellProperties: any
          ) {
            // Use selectOptions from closure
            if (selectOptions && Array.isArray(selectOptions)) {
              const option = selectOptions.find((opt) => opt.value === value);
              td.textContent = option ? option.label : value || "";
            } else {
              td.textContent = value || "";
            }
            return td;
          };
        }
      }
    }

    if (col.width) {
      setting.width = col.width;
    }

    if (col.hidden) {
      setting.width = 0;
      setting.renderer = function () {
        return "";
      };
    }

    // Add custom renderer to show invalid cells in red and apply team colors
    const originalRenderer = setting.renderer;
    setting.renderer = function (
      instance: any,
      td: HTMLElement,
      row: number,
      colIndex: number,
      prop: string | number,
      value: any,
      cellProperties: any
    ) {
      // Call original renderer if exists
      if (originalRenderer) {
        originalRenderer.call(this, instance, td, row, colIndex, prop, value, cellProperties);
      } else {
        td.textContent = value || "";
      }

      // Get team name from the team column
      let teamName: string | null = null;
      const rowData = instance.getDataAtRow(row);
      if (rowData && teamColumnIndex !== undefined && rowData[teamColumnIndex]) {
        teamName = String(rowData[teamColumnIndex]).trim();
      }

      // Get team color
      const teamColor = teamName && teamColors ? teamColors.get(teamName) : null;

      // Check if this cell is invalid
      const cellKey = `${row}-${colIndex}`;
      const errorMessage = invalidCells ? invalidCells.get(cellKey) : null;
      
      // Check if this is Vai trò column or Trạng thái column
      const isVaiTro = roleColumnIndex !== undefined && colIndex === roleColumnIndex;
      const isTrangThai = statusColumnIndex !== undefined && colIndex === statusColumnIndex;
      // Check if this is Mã Mới column (index 1)
      const isMaMoi = colIndex === 1;
      // Check if this is Công Nợ (index 18) or Tín Dụng (index 19) column
      const isCongNo = colIndex === 18;
      const isTinDung = colIndex === 19;
      
      // Apply common styles for all cells if applyCommonStyles is true: fontSize 11px, fontWeight 600
      if (applyCommonStyles) {
        td.style.fontSize = "11px";
        td.style.fontWeight = "600";
      }
      
      if (errorMessage) {
        // Style invalid cell: red background and red text (override team color)
        td.style.backgroundColor = "#fee2e2"; // red-100
        td.style.color = "#dc2626"; // red-600
        td.classList.add("invalid-cell");
        td.title = errorMessage; // Show error message on hover
      } else if (isVaiTro || isTrangThai) {
        // Style Vai trò and Trạng thái cells with red background
        td.style.backgroundColor = "#fee2e2"; // red-100
        td.style.color = "#dc2626"; // red-600
      } else if (isMaMoi) {
        // Style Mã Mới column with red text (common styles already applied above)
        td.style.color = "#dc2626"; // red-600
        // Apply team color background if available
        if (teamColor) {
          td.style.backgroundColor = teamColor;
        } else {
          td.style.backgroundColor = "";
        }
      } else if (isCongNo || isTinDung) {
        // Style Công Nợ and Tín Dụng columns based on comparison
        const rowData = instance.getDataAtRow(row);
        const congNoValue = rowData && rowData[18] ? parseFloat(String(rowData[18]).replace(/[^\d.-]/g, '')) || 0 : 0;
        const tinDungValue = rowData && rowData[19] ? parseFloat(String(rowData[19]).replace(/[^\d.-]/g, '')) || 0 : 0;
        
        if (congNoValue > tinDungValue) {
          // Công nợ > Tín dụng: background đỏ, chữ đỏ nhạt
          td.style.backgroundColor = "#fee2e2"; // red-100
          td.style.color = "#dc2626"; // red-600
        } else {
          // Công nợ <= Tín dụng: background xanh lá, chữ xanh nhạt
          td.style.backgroundColor = "#dcfce7"; // green-100
          td.style.color = "#16a34a"; // green-600
        }
      } else {
        // Check if background color or text color is already set with !important (from custom renderer)
        const bgPriority = td.style.getPropertyPriority("background-color");
        const colorPriority = td.style.getPropertyPriority("color");
        const hasImportantBg = bgPriority === "important";
        const hasImportantColor = colorPriority === "important";
        
        // Only apply team color if background is not set with !important
        if (!hasImportantBg) {
          if (teamColor) {
            td.style.backgroundColor = teamColor;
          } else {
            td.style.backgroundColor = "";
          }
        }
        
        // Only clear color if it's not set with !important
        if (!hasImportantColor) {
          td.style.color = "";
        }
        td.classList.remove("invalid-cell");
        td.title = "";
      }

      // Apply textAlign center at the end to ensure it's not overridden
      if (applyCommonStyles) {
        td.style.setProperty("text-align", "center", "important");
      }

      // Ensure single line with ellipsis for all cells
      td.style.setProperty("white-space", "nowrap", "important");
      td.style.setProperty("overflow", "hidden", "important");
      td.style.setProperty("text-overflow", "ellipsis", "important");

      // Set title attribute to show full content on hover (unless errorMessage is already set)
      if (!errorMessage) {
        const cellValue = value !== null && value !== undefined ? String(value) : "";
        td.title = cellValue;
      }

      return td;
    };

    return setting;
  });

  // Build context menu items based on options
  const contextMenuItems: any = {};
  
  if (contextMenuOptions.showAddRow && !readOnly) {
    contextMenuItems.row_below = {
      name: "Thêm dòng",
    };
  }
  
  if (contextMenuOptions.showRemoveRow && !readOnly) {
    contextMenuItems.remove_row = {
      name: "Xóa dòng",
    };
  }

  // Append custom context menu items (used for dynamic labels/callbacks)
  if (contextMenuCustomItems && typeof contextMenuCustomItems === "object") {
    Object.assign(contextMenuItems, contextMenuCustomItems);
  }
  
  // Build context menu config with items structure
  const finalContextMenuConfig = Object.keys(contextMenuItems).length > 0 
    ? { items: contextMenuItems } 
    : false;

  // Determine if we should use object array or 2D array
  // Handsontable can handle object arrays directly if columns are defined
  const shouldUseObjectArray = Array.isArray(data) && 
    data.length > 0 && 
    typeof data[0] === 'object' && 
    !Array.isArray(data[0]) &&
    columns && columns.length > 0;

  return (
    <div className={`${className} ht-theme-horizon ${showSummaryRowBorder ? 'summary-row-border' : ''}`}>
      <HotTable
        ref={hotTableRef}
        key={key}
        data={shouldUseObjectArray ? data : hotData}
        columns={columnSettings}
        colHeaders={colHeaders}
        rowHeaders={rowHeaders}
        width={width}
        height={height}
        licenseKey={licenseKey}
        contextMenu={finalContextMenuConfig}
        hiddenColumns={hiddenColumns.length > 0 ? { columns: hiddenColumns } : false}
        manualColumnResize={manualColumnResize}
        manualRowResize={manualRowResize}
        stretchH={stretchH as any}
        autoWrapRow={autoWrapRow}
        autoWrapCol={false}
        afterChange={handleAfterChange}
        afterCreateRow={handleAfterCreateRow}
        afterRemoveRow={handleAfterRemoveRow}
        allowInsertRow={!readOnly}
        allowRemoveRow={!readOnly}
        allowInsertColumn={false}
        allowRemoveColumn={false}
        copyPaste={copyPaste}
        fillHandle={fillHandle}
        formulas={true as any}
        dropdownMenu={false}
        filters={false}
        columnSorting={columnSorting}
        search={true}
        undo={true}
        readOnly={readOnly}
        className={themeName}
        nestedHeaders={nestedHeaders}
        beforeCopy={beforeCopy}
        beforePaste={beforePaste}
        afterOnCellMouseDown={wrappedAfterOnCellMouseDown}
        afterOnCellMouseUp={wrappedAfterOnCellMouseUp}
        autoColumnSize={autoColumnSize}
        preventOverflow={preventOverflow as any}
        renderAllRows={renderAllRows}
        viewportRowRenderingOffset={viewportRowRenderingOffset}
        outsideClickDeselects={outsideClickDeselects}
        selectionMode={selectionMode as any}
        allowInvalid={allowInvalid}
        skipRowOnPaste={skipRowOnPaste}
        {...otherProps}
      />
    </div>
  );
});

HotTableComponent.displayName = "HotTableComponent";

export default HotTableComponent;

