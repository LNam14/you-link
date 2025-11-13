import httpService from "@/lib/http"

// Định nghĩa kiểu dữ liệu cho sheet
export interface Sheet {
  id: string
  name: string
  // Thêm các trường khác tùy theo cấu trúc dữ liệu thực tế
}

// Định nghĩa kiểu dữ liệu cho tool
export interface Tool {
  id: string
  name: string
  // Thêm các trường khác tùy theo cấu trúc dữ liệu thực tế
}

// Định nghĩa kiểu dữ liệu cho extort
export interface Extort {
  id: string
  name: string
  // Thêm các trường khác tùy theo cấu trúc dữ liệu thực tế
}

// Định nghĩa kiểu dữ liệu cho NCC (Nhà cung cấp)
export interface NCC {
  MaNCC: string
  TenNCC: string
  // Thêm các trường khác tùy theo cấu trúc dữ liệu thực tế
}

// Định nghĩa kiểu dữ liệu cho Công nợ
export interface CongNo {
  MaMoi: string
  CongNo: string
}

// Định nghĩa kiểu dữ liệu cho response
export interface SheetResponse {
  data: Sheet[]
}

export interface ToolResponse {
  data: Tool[]
}

export interface ExtortResponse {
  data: Extort[]
}

export interface NCCResponse {
  data: NCC
}

export interface CongNoResponse {
  content: CongNo[]
}

// API endpoints
const ENDPOINTS = {
  GET_DATA: "/sheet",
  GET_UPDATE_SITE: "/sheet/get-update-site",
  GET_ID_NCC: "/sheet/id-ncc",
  GET_ID_KH: "/sheet/id-kh",
  GET_DATA_TOOL: "/sheet/tool-check",
  GET_DATA_SYNTHETIC: "/sheet/tool-check-synthetic",
  GET_DATA_EXTORT: "/sheet/extort",
  UPDATE_DATA: "/sheet/update",
  BULK_UPDATE: "/sheet/bulk-update", // ✅ thêm endpoint bulk update
  GET_CONGNO: "/sheet/receivable",
}

/**
 * API service cho quản lý sheet
 */
const sheetApiRequest = {
  /**
   * Lấy dữ liệu sheet
   */
  getData: () => {
    return httpService.post<SheetResponse>(ENDPOINTS.GET_DATA, {})
  },

  getDataUpdateSite: () => {
    return httpService.post<SheetResponse>(ENDPOINTS.GET_UPDATE_SITE, {})
  },

  /**
   * Lấy thông tin nhà cung cấp theo mã
   */
  getIDNCC: (MaNCC: string, message: string) => {
    return httpService.post<NCCResponse>(ENDPOINTS.GET_ID_NCC, {
      MaNCC,
      message,
    })
  },

  /**
   * Lấy thông tin khách hàng theo mã
   */
  getIDKH: (MaKH: string, message: string) => {
    return httpService.post<NCCResponse>(ENDPOINTS.GET_ID_KH, {
      MaKH,
      message,
    })
  },

  /**
   * Lấy dữ liệu công cụ
   */
  getDataTool: () => {
    return httpService.post<ToolResponse>(ENDPOINTS.GET_DATA_TOOL, {})
  },

  /**
   * Lấy dữ liệu synthetic
   */
  getDataSynthetic: () => {
    return httpService.post<ToolResponse>(ENDPOINTS.GET_DATA_SYNTHETIC, {})
  },

  /**
   * Lấy dữ liệu xuất
   */
  getDataExtort: () => {
    return httpService.post<ExtortResponse>(ENDPOINTS.GET_DATA_EXTORT, {})
  },

  /**
   * Cập nhật dữ liệu sheet
   */
  updateData: async (data: any[], sheetType: number) => {
    // Chunk updates to avoid long-running requests that can cause 504
    const chunkSize = 40
    const maxRetries = 2
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

    const chunks: any[][] = []
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize))
    }

    let totalUpdated = 0
    for (const [index, chunk] of chunks.entries()) {
      let attempt = 0
      // Retry with exponential backoff for transient errors (e.g., 504/timeout)
      // We keep request body the same schema the route expects
      while (true) {
        try {
          const res: any = await httpService.post("/sheet/update", { data: chunk, sheetType }, { timeout: 120000 })
          // Some routes return raw object; be tolerant
          const updatedCells = (res && (res as any).updatedCells) || 0
          totalUpdated += Number(updatedCells) || 0
          break
        } catch (err: any) {
          if (attempt >= maxRetries) throw err
          const backoff = 1000 * Math.pow(2, attempt)
          await delay(backoff)
          attempt += 1
        }
      }
    }

    return { success: true, totalUpdated }
  },

  /**
   * Thêm dòng mới
   */
  appendRows: (rows: any[], sheetType: number) => {
    return httpService.post("/sheet/append", { rows, sheetType })
  },

  /**
   * Xoá dòng theo index
   */
  deleteRow: (rowIndex: number, sheetType: number) => {
    return httpService.post("/sheet/delete-row", { rowIndex, sheetType })
  },

  /**
   * ✅ Lấy dữ liệu công nợ
   */
  getCongNo: () => {
    return httpService.post<CongNoResponse>(ENDPOINTS.GET_CONGNO, {})
  },

  /**
   * ✅ Cập nhật nhiều hàng nhiều cột cùng lúc
   */
  bulkUpdateData: (updates: any[], sheetType: number) => {
    return httpService.post(ENDPOINTS.BULK_UPDATE, { updates, sheetType })
  },
}

export default sheetApiRequest
