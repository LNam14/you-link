import httpService from "@/lib/http";

// Định nghĩa kiểu dữ liệu cho sheet
export interface Sheet {
  id: string;
  name: string;
  // Thêm các trường khác tùy theo cấu trúc dữ liệu thực tế
}

// Định nghĩa kiểu dữ liệu cho tool
export interface Tool {
  id: string;
  name: string;
  // Thêm các trường khác tùy theo cấu trúc dữ liệu thực tế
}

// Định nghĩa kiểu dữ liệu cho extort
export interface Extort {
  id: string;
  name: string;
  // Thêm các trường khác tùy theo cấu trúc dữ liệu thực tế
}

// Định nghĩa kiểu dữ liệu cho NCC (Nhà cung cấp)
export interface NCC {
  MaNCC: string;
  TenNCC: string;
  // Thêm các trường khác tùy theo cấu trúc dữ liệu thực tế
}

// Định nghĩa kiểu dữ liệu cho response
export interface SheetResponse {
  data: Sheet[];
}

export interface ToolResponse {
  data: Tool[];
}

export interface ExtortResponse {
  data: Extort[];
}

export interface NCCResponse {
  data: NCC;
}

// API endpoints
const ENDPOINTS = {
  GET_DATA: "/sheet",
  GET_ID_NCC: "/sheet/id-ncc",
  GET_ID_KH: "/sheet/id-kh",
  GET_DATA_TOOL: "/sheet/tool-check",
  GET_DATA_EXTORT: "/sheet/extort",
  UPDATE_DATA: "/sheet/update"
};

/**
 * API service cho quản lý sheet
 */
const sheetApiRequest = {
  /**
   * Lấy dữ liệu sheet
   * @param forceRefresh Bỏ qua cache và lấy dữ liệu mới
   * @returns Promise với dữ liệu sheet
   */
  getData: () => {
    return httpService.post<SheetResponse>(ENDPOINTS.GET_DATA, {});
  },

  /**
   * Lấy thông tin nhà cung cấp theo mã
   * @param MaNCC Mã nhà cung cấp
   * @returns Promise với thông tin nhà cung cấp
   */
  getIDNCC: (MaNCC: string, message: string) => {
    return httpService.post<NCCResponse>(ENDPOINTS.GET_ID_NCC, {
      MaNCC,
      message,
    });
  },
  getIDKH: (MaKH: string, message: string) => {
    return httpService.post<NCCResponse>(ENDPOINTS.GET_ID_KH, {
      MaKH,
      message,
    });
  },

  /**
   * Lấy dữ liệu công cụ
   * @param forceRefresh Bỏ qua cache và lấy dữ liệu mới
   * @returns Promise với dữ liệu công cụ
   */
  getDataTool: () => {
    return httpService.post<ToolResponse>(ENDPOINTS.GET_DATA_TOOL, {});
  },

  /**
   * Lấy dữ liệu xuất
   * @param forceRefresh Bỏ qua cache và lấy dữ liệu mới
   * @returns Promise với dữ liệu xuất
   */
  getDataExtort: () => {
    return httpService.post<ExtortResponse>(ENDPOINTS.GET_DATA_EXTORT, { });
  },

  /**
   * Cập nhật dữ liệu sheet
   * @param data Dữ liệu cần cập nhật
   * @param sheetType Loại sheet (1 hoặc 2)
   * @returns Promise với kết quả cập nhật
   */
  updateData: async (data: any[], sheetType: number) => {
    try {
      const response = await fetch('/api/sheet/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data, sheetType }),
      })
      return response.json()
    } catch (error) {
      console.error('Error updating data:', error)
      throw error
    }
  },

  async appendRows(rows: any[], sheetType: number) {
    try {
      const response = await fetch('/api/sheet/append', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows, sheetType }),
      })
      return response.json()
    } catch (error) {
      console.error('Error appending rows:', error)
      throw error
    }
  }
};

export default sheetApiRequest;
