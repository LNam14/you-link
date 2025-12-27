import { google } from "googleapis";

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  range: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
}

export interface FormattedRow {
  rowIndex: number;
  sheetName: string;
  cs: any;
  site: any;
  bong: any;
  bet: any;
  chuDe: any;
  nuoc: any;
  linkOut: any;
  DR: any;
  keywords: any;
  trafficTool: any;
  noteKH: any;
  noteNB: any;
  noteNCC: any;
  tinhTrang: any;
  giaBanGP: any;
  giaBanText: any;
  timeText: number;
  giaBanTextHome: any;
  giaBanTextHeader: any;
  giaBanGPX: any;
  giaBanTextX: any;
  giaBanTextHomeX: any;
  giaBanTextHeaderX: any;
  giaMuaGP: any;
  giaMuaText: any;
  hoaHongGP: number;
  hoaHongText: number;
  KeGP: any;
  KeText: any;
  giaMuaTextHome: any;
  giaMuaTextHeader: any;
  NCC: any;
  MaNCC: any;
  FileNCC: string;
  GroupNCC: string;
  IdGroup: string;
  giaCuoiGP: number;
  giaCuoiText: number;
  giaCuoiTextHome: number;
  giaCuoiTextHeader: number;
  loiNhuanGP: string | null;
  loiNhuanText: string | null;
  loiNhuanTextHome: string | null;
  loiNhuanTextHeader: string | null;
  tiGiaXGP?: any;
  tiGiaXFooter?: any;
  tiGiaHome?: any;
  tiGiaHeader?: any;
}

export interface NCCData {
  MaNCC: string;
  FileNCC: string;
  GroupNCC: string;
  IdGroup: string;
}

export class GoogleSheetsService {
  private auth: any;
  private sheets: any;

  constructor(config?: GoogleSheetsConfig) {
    // Default credentials (hardcoded)
    // Initialize with credentials from config or use default
    if (config?.credentials) {
      this.auth = new google.auth.JWT({
        email: config.credentials.client_email,
        key: config.credentials.private_key.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });
    } else {
      // Use default credentials or environment variables
      const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

      this.auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey?.replace(/\\n/g, "\n") || "",
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });
    }

    this.sheets = google.sheets({ version: "v4", auth: this.auth });
  }

  async getSpreadsheetMetadata(spreadsheetId: string): Promise<{ modifiedTime: string; etag: string } | null> {
    try {
      // Instead of using Drive API (which requires additional setup),
      // we'll fetch a small sample of data and hash it to detect actual changes
      // This is more accurate than timestamp-based approach
      const sampleRange = "1!A1:Z1"; // Get first row as sample
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: sampleRange,
      });
      
      // Create hash from sample data
      const sampleData = JSON.stringify(response.data.values || []);
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < sampleData.length; i++) {
        const char = sampleData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      // Combine spreadsheetId with hash for unique ETag
      const etag = `${spreadsheetId}-${Math.abs(hash)}`;
      const now = new Date().toISOString();
      
      return {
        modifiedTime: now,
        etag,
      };
    } catch (error) {
      console.warn("Failed to get spreadsheet metadata, using timestamp fallback:", error);
      // Fallback to timestamp-based approach if sample fetch fails
      const now = Date.now();
      const timeBucket = Math.floor(now / 30000) * 30000; // 30 second buckets
      return {
        modifiedTime: new Date(timeBucket).toISOString(),
        etag: `${spreadsheetId}-${timeBucket}`,
      };
    }
  }

  async fetchNCCData(spreadsheetId: string): Promise<NCCData[]> {
    try {
      const nccRange = "NCC!A3:K,NCC!AU3:BE";
      const ranges = nccRange.split(",").map((r) => r.trim());

      let allNCCRows: any[] = [];

      if (ranges.length === 1) {
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: ranges[0],
        });
        allNCCRows = response.data.values || [];
      } else {
        // Use batchGet for multiple ranges
        const response = await this.sheets.spreadsheets.values.batchGet({
          spreadsheetId,
          ranges: ranges,
        });

        if (response.data.valueRanges) {
          const firstRange = response.data.valueRanges[0]?.values || [];
          const secondRange = response.data.valueRanges[1]?.values || [];

          // Merge rows: first range has A-K (columns 0-10), second range has AU-BE
          // According to formatter: MaNCC=row[0], FileNCC=row[8], GroupNCC=row[9], IdGroup=row[10]
          // All needed data is in first range (A-K), but we merge with second range for completeness
          const maxRows = Math.max(firstRange.length, secondRange.length);
          for (let i = 0; i < maxRows; i++) {
            const row1 = firstRange[i] || [];
            const row2 = secondRange[i] || [];
            
            // Use row1 as base (has columns A-K, indices 0-10)
            // row[0] = MaNCC, row[8] = FileNCC, row[9] = GroupNCC, row[10] = IdGroup
            // If row1 doesn't have enough columns, supplement from row2
            const mergedRow = [...row1];
            
            // Ensure we have at least 11 columns (0-10)
            while (mergedRow.length < 11) {
              mergedRow.push("");
            }
            
            // If row1 is missing data in columns 8-10, try to get from row2
            // Map row2 columns to merged row: row2[0] might map to column 8, etc.
            // But actually, based on the formatter, all data should be in row1
            // So we just use row1, and row2 is for additional data if needed
            allNCCRows.push(mergedRow);
          }
        }
      }

      // Format NCC data according to formatter: MaNCC=row[0], FileNCC=row[8], GroupNCC=row[9], IdGroup=row[10]
      const nccData: NCCData[] = allNCCRows
        .filter((row: any[]) => row && row.length > 0 && row[0]) // Only include rows with MaNCC
        .map((row: any[]) => ({
          MaNCC: row[0] || "",
          FileNCC: row[8] || "",
          GroupNCC: row[9] || "",
          IdGroup: row[10] || "",
        }));

      return nccData;
    } catch (error) {
      console.warn("Failed to fetch NCC data, continuing without it:", error);
      return [];
    }
  }

  async getSheetData(
    spreadsheetId: string,
    range: string,
    nccData?: NCCData[] | Map<string, NCCData>
  ): Promise<FormattedRow[]> {
    try {
      // Fetch NCC data in parallel if not provided (optimization)
      const nccDataPromise = nccData 
        ? Promise.resolve(nccData)
        : this.fetchNCCData(spreadsheetId);

      // Parse range string - support multiple ranges separated by comma
      const ranges = range.split(",").map((r) => r.trim()).filter((r) => r.length > 0);

      // Helper functions to extract sheet info from range
      const extractSheetInfo = (rangeStr: string): { sheetName: string; startRow: number } => {
        // Extract sheet name (e.g., "5!A3:AQ" -> "5" or "Sheet1!A3:AQ" -> "Sheet1")
        const sheetMatch = rangeStr.match(/^([^!]+)!/);
        const sheetName = sheetMatch ? sheetMatch[1] : "Sheet1";
        
        // Extract starting row number (e.g., "A3" -> 3, "A1" -> 1)
        const rowMatch = rangeStr.match(/![A-Z]+(\d+)/);
        const startRow = rowMatch ? parseInt(rowMatch[1], 10) : 1;
        
        return { sheetName, startRow };
      };

      // Fetch sheet data
      let allRows: Array<{ row: any[]; sheetName: string; startRow: number }> = [];

      if (ranges.length === 1) {
        // Single range - use get method
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: ranges[0],
        });
        const sheetInfo = extractSheetInfo(ranges[0]);
        const rows = response.data.values || [];
        allRows = rows.map((row: any[]) => ({ row, ...sheetInfo }));
      } else {
        // Multiple ranges - use batchGet method (already optimized)
        const response = await this.sheets.spreadsheets.values.batchGet({
          spreadsheetId,
          ranges: ranges,
        });

        // Merge all rows from all ranges with sheet metadata
        if (response.data.valueRanges) {
          response.data.valueRanges.forEach((valueRange: any, index: number) => {
            if (valueRange.values && Array.isArray(valueRange.values)) {
              const sheetInfo = extractSheetInfo(ranges[index]);
              const rowsWithMeta = valueRange.values.map((row: any[]) => ({
                row,
                ...sheetInfo,
              }));
              allRows = allRows.concat(rowsWithMeta);
            }
          });
        }
      }

      // Wait for NCC data (if it was being fetched)
      const finalNccData = await nccDataPromise;

      if (allRows.length === 0) {
        return [];
      }

      // Create nccMap from nccData (optimized with Map for O(1) lookup)
      let nccMap: Map<string, NCCData> | undefined;
      if (finalNccData) {
        if (finalNccData instanceof Map) {
          nccMap = finalNccData;
        } else {
          nccMap = new Map();
          finalNccData.forEach((ncc) => {
            if (ncc.MaNCC) {
              nccMap!.set(ncc.MaNCC, ncc);
            }
          });
        }
      }

      // Format rows using the provided formatter (parallel processing would be overkill here)
      // Track row index per sheet to calculate correct rowIndex
      const sheetRowCounters = new Map<string, number>();
      const formattedRows = allRows.map((rowData) => {
        const { row, sheetName, startRow } = rowData;
        
        // Get or initialize counter for this sheet
        if (!sheetRowCounters.has(sheetName)) {
          sheetRowCounters.set(sheetName, 0);
        }
        const sheetIndex = sheetRowCounters.get(sheetName)!;
        sheetRowCounters.set(sheetName, sheetIndex + 1);
        
        // Calculate rowIndex relative to sheet's starting row
        const rowIndex = startRow + sheetIndex;
        
        return this.formatRow(row, rowIndex, sheetName, {
          nccMap,
          ncc: Array.isArray(finalNccData) ? finalNccData : undefined,
        });
      });

      return formattedRows;
    } catch (error) {
      console.error("Error fetching Google Sheets data:", error);
      throw error;
    }
  }

  private formatRow(
    row: any[],
    rowIndex: number,
    sheetName: string,
    allData: { nccMap?: Map<string, NCCData>; ncc?: NCCData[] }
  ): FormattedRow {
    const parseNumber = (value: any) => {
      if (value === null || value === undefined) return null;
      if (typeof value === "string") {
        // Xử lý string đã format từ sheet (có thể có dấu phẩy, khoảng trắng, v.v.)
        const cleaned = value.replace(/,/g, ".").replace(/\s/g, "");
        const parsed = Number.parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      }
      return typeof value === "number" ? value : null;
    };

    const formatNumber = (value: number | null) =>
      value !== null && !isNaN(value) ? value.toString().replace(".", ",") : null;

    const safeSubtract = (a: number | null, b: number | null) =>
      a !== null && b !== null ? formatNumber(a - b) : null;

    const roundIfNumber = (value: any) => {
      const num = parseNumber(value);
      if (num === null) return value;
      // Trả về số gốc không làm tròn
      return num;
    };

    const giaBanGP = roundIfNumber(row[13]);
    const giaBanText = roundIfNumber(row[14]);
    const giaBanTextHome = roundIfNumber(row[15]);
    const giaBanTextHeader = roundIfNumber(row[16]);
    const giaBanGPX = roundIfNumber(row[17]);
    const giaBanTextX = roundIfNumber(row[18]);
    const giaBanTextHomeX = roundIfNumber(row[19]);
    const giaBanTextHeaderX = roundIfNumber(row[20]);
    const giaMuaGP = roundIfNumber(row[18]);
    const giaMuaText = roundIfNumber(row[19]);
    const giaMuaTextHome = roundIfNumber(row[20]);
    const giaMuaTextHeader = roundIfNumber(row[21]);
    const hoaHongGP = parseNumber(row[22]) || 0;
    const hoaHongText = parseNumber(row[23]) || 0;

    const giaCuoiGP = roundIfNumber(row[31]);
    const giaCuoiText = roundIfNumber(row[32]);
    const giaCuoiTextHome = roundIfNumber(row[33]);
    const giaCuoiTextHeader = roundIfNumber(row[34]);

    const maNCC = row[27];
    let fileNCC = "";
    let groupNCC = "";
    let idGroup = "";

    // Tối ưu: Sử dụng Map lookup (O(1)) thay vì .find() (O(n))
    if (maNCC) {
      // Ưu tiên dùng nccMap nếu có (nhanh hơn)
      const matchingNCC =
        allData.nccMap?.get(maNCC) ||
        (allData.ncc
          ? allData.ncc.find((nccRow: any) => nccRow.MaNCC === maNCC)
          : null);
      if (matchingNCC) {
        fileNCC = matchingNCC.FileNCC;
        groupNCC = matchingNCC.GroupNCC;
        idGroup = matchingNCC.IdGroup;
      }
    }

    return {
      rowIndex: rowIndex,
      sheetName: sheetName,
      cs: row[0],
      site: row[1],
      bong: row[2],
      bet: row[3],
      chuDe: row[4],
      nuoc: row[5],
      linkOut: row[7],
      DR: row[8],
      keywords: row[9],
      trafficTool: row[10],
      noteKH: row[11],
      noteNB: row[12],
      noteNCC: row[13],
      tinhTrang: row[14],
      timeText: 1,
      hoaHongGP: hoaHongGP || 0,
      hoaHongText: hoaHongText || 0,
      KeGP: roundIfNumber(row[24]),
      KeText: roundIfNumber(row[25]),
      NCC: row[26],
      MaNCC: maNCC,
      FileNCC: fileNCC,
      GroupNCC: groupNCC,
      IdGroup: idGroup,
      giaBanGP,
      giaBanText,
      giaBanTextHome,
      giaBanTextHeader,
      giaMuaGP,
      giaMuaText,
      giaMuaTextHome,
      giaMuaTextHeader,
      giaBanGPX,
      giaBanTextX,
      giaBanTextHomeX,
      giaBanTextHeaderX,
      giaCuoiGP: giaCuoiGP || 0,
      giaCuoiText: giaCuoiText || 0,
      giaCuoiTextHome: giaCuoiTextHome || 0,
      giaCuoiTextHeader: giaCuoiTextHeader || 0,
      loiNhuanGP: safeSubtract(parseNumber(giaBanGP), parseNumber(giaCuoiGP)),
      loiNhuanText: safeSubtract(parseNumber(giaBanText), parseNumber(giaCuoiText)),
      loiNhuanTextHome: safeSubtract(parseNumber(giaBanTextHome), parseNumber(giaCuoiTextHome)),
      loiNhuanTextHeader: safeSubtract(parseNumber(giaBanTextHeader), parseNumber(giaCuoiTextHeader)),
    };
  }
}

