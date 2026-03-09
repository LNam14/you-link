"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import HotTableComponent, { Column } from "@/components/table/HotTable";
import type { HotTableRef } from "@handsontable/react-wrapper";
import Alert from "@/components/ui/Alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Button from "@/components/ui/Button";
import { customerService } from "@/services/customer.service";
import { userService } from "@/services/user.service";
import { CustomerResponse, UserResponse } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCw, Users, Search, Plus, X, Check } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useHeader } from "@/app/(dashboard)/contexts/HeaderContext";
import PageHeader from "@/components/ui/PageHeader";

interface Customer extends CustomerResponse {}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasEmptyRow, setHasEmptyRow] = useState(false);
  const [invalidCells, setInvalidCells] = useState<Map<string, string>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [congNoMap, setCongNoMap] = useState<Map<string, string>>(new Map());
  const { user: currentUser } = useAuth();
  const { setHeaderData } = useHeader();
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedRowForUser, setSelectedRowForUser] = useState<number | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserResponse[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hotTableRef = useRef<HotTableRef>(null);

  useEffect(() => {
    const initializeData = async () => {
      await loadCongNo();
      // Load data sau khi có công nợ
      const customersData = await customerService.getAllCustomers();
      const map = await customerService.getCongNoFromSheet();
      const customersWithCongNo = customersData.map((customer) => ({
        ...customer,
        cong_no: map.get(customer.ma_moi) || "", // Chỉ lấy từ sheet, không fallback về Firebase
      }));
      setCustomers(customersWithCongNo as Customer[]);
      setIsLoading(false);
    };
    initializeData();
  }, []);

  const loadCongNo = useCallback(async () => {
    try {
      const map = await customerService.getCongNoFromSheet();
      setCongNoMap(map);
    } catch (error) {
      console.error("Error loading cong no:", error);
      // Không hiển thị lỗi, chỉ log để không làm gián đoạn việc load dữ liệu
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const customersData = await customerService.getAllCustomers();
      
      // Lấy công nợ từ Google Sheets
      let map = congNoMap;
      if (map.size === 0) {
        try {
          map = await customerService.getCongNoFromSheet();
          setCongNoMap(map);
        } catch (error) {
          console.error("Error loading cong no:", error);
        }
      }
      
      // Gắn công nợ từ Google Sheets vào mỗi customer (chỉ lấy từ sheet, không fallback về Firebase)
      const customersWithCongNo = customersData.map((customer) => ({
        ...customer,
        cong_no: map.get(customer.ma_moi) || "", // Chỉ lấy từ sheet
      }));
      
      setCustomers(customersWithCongNo as Customer[]);
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }, [congNoMap]);


  // Load available users (Nhân viên only)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const users = await userService.getAllUsers();
        const nhanVienUsers = users.filter(u => u.role === "Nhân viên" && u.active);
        setAvailableUsers(nhanVienUsers);
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  // Filter users by search query
  const filteredAvailableUsers = useMemo(() => {
    if (!searchUserQuery) return availableUsers;
    const query = searchUserQuery.toLowerCase();
    return availableUsers.filter(u => 
      u.username.toLowerCase().includes(query) || 
      u.fullname.toLowerCase().includes(query)
    );
  }, [availableUsers, searchUserQuery]);

  // Filter customers by search query and role
  const filteredCustomers = useMemo(() => {
    let filtered = customers;
    
    // Filter by role: Nhân viên chỉ thấy khách hàng được phân cho họ
    if (currentUser?.role === "Nhân viên") {
      const currentUsername = currentUser.username;
      filtered = filtered.filter((c) => {
        const nguoiXem = c.nguoi_xem || "";
        const usernames = nguoiXem.split(",").map(u => u.trim());
        return usernames.includes(currentUsername);
      });
    }
    // Admin thấy tất cả
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => {
        return (
          c.ma_moi?.toLowerCase().includes(query) ||
          c.ma_cu?.toLowerCase().includes(query) ||
          c.ten?.toLowerCase().includes(query) ||
          c.id_tele?.toLowerCase().includes(query)
        );
      });
    }
    
    return filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [customers, searchQuery, currentUser]);

  // Format date helper
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return String(date);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return String(date);
    }
  };

  // Format ngày check thành 📅 DD/MM
  const formatNgayCheck = (date: string | Date | null | undefined) => {
    if (!date) return "";
    try {
      let d: Date;
      if (typeof date === "string") {
        // Parse DD/MM/YYYY hoặc DD/MM
        const parts = date.split("/");
        if (parts.length >= 2) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
          const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
          d = new Date(year, month, day);
        } else {
          d = new Date(date);
        }
      } else {
        d = new Date(date);
      }
      if (isNaN(d.getTime())) return String(date);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `📅 ${day}/${month}`;
    } catch {
      return String(date);
    }
  };

  // Parse ngày từ string (DD/MM/YYYY hoặc DD/MM) thành Date object
  const parseNgayCheck = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    try {
      const parts = dateStr.split("/");
      if (parts.length >= 2) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d;
    } catch {
      // Ignore
    }
    return null;
  };

  // Tính số ngày: Ngày hiện tại - Ngày check
  const calculateDemNgay = (ngayCheck: string | Date | number | null | undefined): number => {
    if (!ngayCheck) return 0;
    try {
      let checkDate: Date;
      if (typeof ngayCheck === "string") {
        const parsed = parseNgayCheck(ngayCheck);
        if (parsed) {
          checkDate = parsed;
        } else {
          // Thử parse các format khác
          checkDate = new Date(ngayCheck);
        }
      } else if (ngayCheck instanceof Date) {
        checkDate = ngayCheck;
      } else {
        checkDate = new Date(String(ngayCheck));
      }
      
      if (isNaN(checkDate.getTime())) return 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkDate.setHours(0, 0, 0, 0);
      
      // Tính: Ngày hiện tại - Ngày check (milliseconds)
      const diffTime = today.getTime() - checkDate.getTime();
      // Chuyển đổi sang số ngày
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  };

  // Lấy ngày hiện tại dạng DD/MM/YYYY
  const getCurrentDateString = (): string => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Convert customers to 2D array for HotTable
  // Column mapping theo thứ tự từ hình ảnh:
  // 0=id(hidden), 1=ma_moi, 2=ma_cu, 3=phan_loai, 4=phien_ban, 5=order, 6=cty, 7=team, 8=chuc_vu, 
  // 9=ten, 10=id_tele, 11=lien_he_2, 12=link_nhom, 13=id_nhom, 14=info, 15=ng_cham_1, 16=ng_cham_2,
  // 17=tab_don, 18=cong_no, 19=tin_dung, 20=tinh_trang, 21=ngay_check, 22=dem_ngay, 23=note_kt, 24=nguoi_xem
  const tableData = filteredCustomers.map((customer) => [
    customer.id,
    customer.ma_moi || "",
    customer.ma_cu || "",
    customer.phan_loai || "",
    customer.phien_ban || "",
    customer.order || "",
    customer.cty || "",
    customer.team || "",
    customer.chuc_vu || "",
    customer.ten || "",
    customer.id_tele || "",
    customer.lien_he_2 || "",
    customer.link_nhom || "",
    customer.id_nhom || "",
    customer.info || "",
    customer.ng_cham_1 || "",
    customer.ng_cham_2 || "",
    customer.tab_don || "",
    congNoMap.get(customer.ma_moi || "") || "", // Luôn lấy từ sheet, không lấy từ Firebase
    customer.tin_dung || "",
    customer.tinh_trang || "",
    customer.ngay_check || "",
    customer.dem_ngay || "",
    customer.note_kt || "",
    customer.nguoi_xem || "",
  ]);

  // Add empty row only if hasEmptyRow is true
  const dataWithNewRow = hasEmptyRow
    ? [[null, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""], ...tableData]
    : tableData;

  // Dropdown options cho các cột
  const dropdownOptions = {
    3: ["====", "Bình thường", "Mua nhiều", "VIP"], // Phân Loại
    4: ["====", "PB1", "PB2", "PB3", "PB4"], // Phiên Bản
    5: ["====", "Đang MH", "2 Tuần KM", "4 Tuần KM", "Lâu K MH", "Mình nghỉ chơi", "Họ nghỉ chơi", "SEO OFF"], // Order
    20: ["====", "Bình thường", "Rủi ro", "Rủi ro cao", "Scam"], // Tình Trạng
  };

  // Màu sắc cho từng option (background nhạt và chữ đậm)
  const optionColors: { [key: string]: { bg: string; text: string } } = {
    // Phân Loại (cột 3)
    "====": { bg: "#f3f4f6", text: "#6b7280" }, // gray-100, gray-600
    "Bình thường": { bg: "#dbeafe", text: "#2563eb" }, // blue-100, blue-600
    "Mua nhiều": { bg: "#d1fae5", text: "#059669" }, // green-100, green-600
    "VIP": { bg: "#fef3c7", text: "#d97706" }, // yellow-100, yellow-600
    
    // Phiên Bản (cột 4)
    "PB1": { bg: "#e0e7ff", text: "#4338ca" }, // indigo-100, indigo-600
    "PB2": { bg: "#ddd6fe", text: "#7c3aed" }, // purple-100, purple-600
    "PB3": { bg: "#fce7f3", text: "#db2777" }, // pink-100, pink-600
    "PB4": { bg: "#fef3c7", text: "#d97706" }, // yellow-100, yellow-600
    
    // Order (cột 5)
    "Đang MH": { bg: "#dcfce7", text: "#16a34a" }, // green-100, green-600
    "2 Tuần KM": { bg: "#dbeafe", text: "#2563eb" }, // blue-100, blue-600
    "4 Tuần KM": { bg: "#e0e7ff", text: "#4338ca" }, // indigo-100, indigo-600
    "Lâu K MH": { bg: "#fef3c7", text: "#d97706" }, // yellow-100, yellow-600
    "Mình nghỉ chơi": { bg: "#fee2e2", text: "#dc2626" }, // red-100, red-600
    "Họ nghỉ chơi": { bg: "#fee2e2", text: "#dc2626" }, // red-100, red-600
    "SEO OFF": { bg: "#f3f4f6", text: "#6b7280" }, // gray-100, gray-600
    
    // Tình Trạng (cột 20) - "Bình thường" đã được định nghĩa ở trên cho Phân Loại
    "Rủi ro": { bg: "#fef3c7", text: "#d97706" }, // yellow-100, yellow-600
    "Rủi ro cao": { bg: "#fed7aa", text: "#ea580c" }, // orange-100, orange-600
    "Scam": { bg: "#fee2e2", text: "#dc2626" }, // red-100, red-600
  };

  // Custom renderer để áp dụng màu cho dropdown cells
  const createColoredDropdownRenderer = (colIndex: number) => {
    return function(
      instance: any,
      td: HTMLElement,
      row: number,
      col: number,
      prop: string | number,
      value: any,
      cellProperties: any
    ) {
      // Render giá trị mặc định
      td.textContent = value || "";
      
      // Áp dụng màu với !important để không bị ghi đè
      if (value && optionColors[value]) {
        const colors = optionColors[value];
        td.style.setProperty("background-color", colors.bg, "important");
        td.style.setProperty("color", colors.text, "important");
      } else if (value === "====" || value === "") {
        // Màu mặc định cho "====" hoặc rỗng
        td.style.setProperty("background-color", "#f3f4f6", "important"); // gray-100
        td.style.setProperty("color", "#6b7280", "important"); // gray-600
      } else {
        // Màu mặc định cho các giá trị khác (không set để HotTable xử lý)
        // Không set màu để HotTable có thể áp dụng team color nếu có
      }
      
      return td;
    };
  };

  // Build columns
  const columns: Column[] = [
    { data: 0, title: "ID", readOnly: true, width: 60 },
    { data: 1, title: "Mã Mới", width: 60 },
    { data: 2, title: "Mã Cũ", width: 60 },
    { 
      data: 3, 
      title: "Phân Loại", 
      width: 80,
      selectOptions: dropdownOptions[3],
      renderer: createColoredDropdownRenderer(3)
    },
    { 
      data: 4, 
      title: "Phiên Bản", 
      width: 80,
      selectOptions: dropdownOptions[4],
      renderer: createColoredDropdownRenderer(4)
    },
    { 
      data: 5, 
      title: "Order", 
      width: 80,
      selectOptions: dropdownOptions[5],
      renderer: createColoredDropdownRenderer(5)
    },
    { data: 6, title: "CTY", width: 80 },
    { data: 7, title: "Team", width: 80 },
    { data: 8, title: "Chức Vụ", width: 80 },
    { data: 9, title: "Tên", width: 100 },
    { data: 10, title: "ID Tele", width: 80 },
    { data: 11, title: "Liên hệ 2", width: 80 },
    { data: 12, title: "Link Nhóm", width: 80 },
    { data: 13, title: "ID Nhóm", width: 80 },
    { data: 14, title: "Info", width: 80 },
    { data: 15, title: "Ng Chăm 1", width: 80 },
    { data: 16, title: "Ng Chăm 2", width: 80 },
    { data: 17, title: "Tab Đơn", width: 80 },
    { data: 18, title: "Công Nợ", readOnly: true, width: 80 }, // Read-only vì lấy từ sheet
    { data: 19, title: "Tín Dụng", width: 80 },
    { 
      data: 20, 
      title: "Tình Trạng", 
      width: 80,
      selectOptions: dropdownOptions[20],
      renderer: createColoredDropdownRenderer(20)
    },
    { 
      data: 21, 
      title: "Ngày Check", 
      width: 80,
      readOnly: true,
      renderer: function(
        instance: any,
        td: HTMLElement,
        row: number,
        col: number,
        prop: string | number,
        value: any,
        cellProperties: any
      ) {
        td.textContent = formatNgayCheck(value);
        td.style.cursor = "pointer";
        return td;
      }
    },
    { 
      data: 22, 
      title: "Đếm Ngày", 
      width: 80,
      readOnly: true,
      renderer: function(
        instance: any,
        td: HTMLElement,
        row: number,
        col: number,
        prop: string | number,
        value: any,
        cellProperties: any
      ) {
        // Tính lại số ngày: Ngày hiện tại - Ngày check
        const rowData = instance.getDataAtRow(row);
        const ngayCheck = rowData && rowData[21] ? rowData[21] : null;
        const demNgay = calculateDemNgay(ngayCheck);
        // Hiển thị số ngày (hiển thị "0" nếu ngày check bằng ngày hiện tại)
        td.textContent = String(demNgay);
        return td;
      }
    },
    { data: 23, title: "Note KT", width: 80 },
    { 
      data: 24, 
      title: "Người Xem", 
      width: 80,
      readOnly: true,
      renderer: function(
        instance: any,
        td: HTMLElement,
        row: number,
        col: number,
        prop: string | number,
        value: any,
        cellProperties: any
      ) {
        td.textContent = value || "";
        td.style.cursor = "pointer";
        return td;
      }
    },
  ];

  // Hidden columns: ID
  const hiddenColumns: number[] = [0];

  // Handler để tự động set ngày hiện tại khi click vào cột Ngày Check
  // và mở modal khi click vào cột Người Xem
  const handleAfterOnCellMouseDown = useCallback((event: any, coords: any, instance?: any) => {
    if (!coords || !instance) return;
    
    // Kiểm tra nếu click vào cột Ngày Check (index 21)
    if (coords.col === 21) {
      const row = coords.row;
      // Luôn set ngày hiện tại khi click vào cột Ngày Check
      const currentDate = getCurrentDateString();
      instance.setDataAtCell(row, 21, currentDate);
      // Tự động tính và cập nhật Đếm Ngày: Ngày hiện tại - Ngày check = 0 (vì set ngày hiện tại)
      const demNgay = calculateDemNgay(currentDate);
      instance.setDataAtCell(row, 22, String(demNgay)); // Hiển thị "0" khi bằng ngày hiện tại
    }
    // Kiểm tra nếu click vào cột Người Xem (index 24)
    else if (coords.col === 24) {
      const row = coords.row;
      const rowData = instance.getDataAtRow(row);
      const currentValue = rowData && rowData[24] ? String(rowData[24]) : "";
      const currentUsernames = currentValue ? currentValue.split(",").map((u: string) => u.trim()).filter((u: string) => u) : [];
      
      setSelectedRowForUser(row);
      setSelectedUsers(currentUsernames);
      setSearchUserQuery("");
      setShowUserModal(true);
    }
  }, []);

  const handleAfterChange = useCallback(
    (changes: any[], source: string) => {
      if (source === "loadData") return;
      
      if (!Array.isArray(changes) || changes.length === 0) {
        return;
      }

      for (const [row, prop, oldValue, newValue] of changes) {
        let rowData = dataWithNewRow[row];
        if (!rowData && row >= dataWithNewRow.length) {
          rowData = [null, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""];
        }
        if (!rowData) continue;

        const customerId = rowData[0];

        // New customer (no ID) - create new customer when any field is changed
        if (!customerId) {
          const newCustomer: any = {
            ma_moi: String(rowData[1] || "").trim(),
            ma_cu: String(rowData[2] || "").trim(),
            phan_loai: String(rowData[3] || "").trim(),
            phien_ban: String(rowData[4] || "").trim(),
            order: String(rowData[5] || "").trim(),
            cty: String(rowData[6] || "").trim(),
            team: String(rowData[7] || "").trim(),
            chuc_vu: String(rowData[8] || "").trim(),
            ten: String(rowData[9] || "").trim(),
            id_tele: String(rowData[10] || "").trim(),
            lien_he_2: String(rowData[11] || "").trim(),
            link_nhom: String(rowData[12] || "").trim(),
            id_nhom: String(rowData[13] || "").trim(),
            info: String(rowData[14] || "").trim(),
            ng_cham_1: String(rowData[15] || "").trim(),
            ng_cham_2: String(rowData[16] || "").trim(),
            tab_don: String(rowData[17] || "").trim(),
            tin_dung: String(rowData[19] || "").trim(),
            tinh_trang: String(rowData[20] || "").trim(),
            // Không lưu ngay_check và dem_ngay vào Firebase, chỉ tính tự động trong UI
            note_kt: String(rowData[23] || "").trim(),
            nguoi_xem: String(rowData[24] || "").trim(),
          };

          customerService
            .createCustomer(newCustomer)
            .then(async () => {
              setHasEmptyRow(false);
              // Nếu có mã mới, lấy công nợ từ sheet
              if (newCustomer.ma_moi) {
                const newMap = await customerService.getCongNoFromSheet();
                setCongNoMap(newMap);
              }
              await loadData(); // Load data để hiển thị customer mới với công nợ
              setError("");
            })
            .catch((err: any) => {
              const errorMessage = err.message || err.error || "Tạo khách hàng thất bại";
              setError(errorMessage);
              loadData();
            });
          
          break;
        } else if (customerId && typeof customerId === "number") {
          // Bỏ qua nếu là cột Công Nợ (index 18) - chỉ lấy từ sheet, không lưu vào Firebase
          if (prop === 18) {
            return;
          }

          // Update existing customer
          const updateData: any = {};
          const fieldMap: { [key: number]: string } = {
            1: "ma_moi",
            2: "ma_cu",
            3: "phan_loai",
            4: "phien_ban",
            5: "order",
            6: "cty",
            7: "team",
            8: "chuc_vu",
            9: "ten",
            10: "id_tele",
            11: "lien_he_2",
            12: "link_nhom",
            13: "id_nhom",
            14: "info",
            15: "ng_cham_1",
            16: "ng_cham_2",
            17: "tab_don",
            19: "tin_dung",
            20: "tinh_trang",
            21: "ngay_check",
            22: "dem_ngay",
            23: "note_kt",
            24: "nguoi_xem",
          };

          const field = fieldMap[prop];
          // Bỏ qua ngay_check và dem_ngay - không lưu vào Firebase, chỉ tính tự động trong UI
          if (field && field !== "ngay_check" && field !== "dem_ngay") {
            updateData[field] = String(newValue || "").trim();
          }

          // Update local state immediately for instant UI update
          setCustomers((prevCustomers) => {
            return prevCustomers.map((customer) => {
              if (customer.id === customerId) {
                const updated = { ...customer, ...updateData };
                // Nếu cập nhật ngày check, tự động tính lại Đếm Ngày (chỉ trong UI, không lưu Firebase)
                if (prop === 21) { // prop 21 là ngay_check
                  updated.ngay_check = newValue ? String(newValue).trim() : null;
                  const demNgay = calculateDemNgay(newValue);
                  updated.dem_ngay = String(demNgay); // Hiển thị "0" nếu bằng ngày hiện tại
                }
                return updated;
              }
              return customer;
            });
          });

          // Save to backend (chỉ lưu các trường không phải ngay_check và dem_ngay)
          if (Object.keys(updateData).length > 0) {
            customerService
              .updateCustomer(customerId, updateData)
              .then(async () => {
                // Nếu cập nhật mã mới, reload công nợ và cập nhật lại customer
                if (field === "ma_moi") {
                  const newMap = await customerService.getCongNoFromSheet();
                  setCongNoMap(newMap);
                  // Cập nhật công nợ cho customer vừa cập nhật (chỉ lấy từ sheet)
                  setCustomers((prevCustomers) => {
                    return prevCustomers.map((customer) => {
                      if (customer.id === customerId) {
                        return {
                          ...customer,
                          ...updateData,
                          cong_no: newMap.get(String(updateData.ma_moi || customer.ma_moi)) || "", // Chỉ lấy từ sheet
                        };
                      }
                      return customer;
                    });
                  });
                }
              })
              .catch((err: any) => {
                console.warn("Error updating customer:", customerId, updateData, err);
                loadData();
              });
          }
        }
      }
    },
    [customers, dataWithNewRow, loadData, loadCongNo]
  );

  const handleAfterCreateRow = useCallback(
    async (index: number, amount: number) => {
      for (let i = 0; i < amount; i++) {
        const newCustomer: any = {
          ma_moi: "",
          ma_cu: "",
          phan_loai: "",
          phien_ban: "",
          order: "",
          cty: "",
          team: "",
          chuc_vu: "",
          ten: "",
          id_tele: "",
          lien_he_2: "",
          link_nhom: "",
          id_nhom: "",
          info: "",
          ng_cham_1: "",
          ng_cham_2: "",
          tab_don: "",
          tin_dung: "",
          tinh_trang: "",
          // Không lưu ngay_check và dem_ngay vào Firebase, chỉ tính tự động trong UI
          note_kt: "",
          nguoi_xem: "",
        };

        try {
          await customerService.createCustomer(newCustomer);
          await loadCongNo();
          await loadData();
          setError("");
        } catch (err: any) {
          const errorMessage = err.message || err.error || "Tạo khách hàng thất bại";
          setError(errorMessage);
          await loadData();
        }
      }
    },
    [loadData, loadCongNo]
  );

  const handleAfterRemoveRow = useCallback(
    async (index: number, amount: number, physicalRows?: number[]) => {
      const rowsToDelete =
        Array.isArray(physicalRows) && physicalRows.length > 0
          ? physicalRows
          : Array.from({ length: amount }, (_, i) => index + i);

      const deletions: Promise<any>[] = [];
      for (const rowIndex of rowsToDelete) {
        if (hasEmptyRow && rowIndex === 0) continue;
        const actualIndex = hasEmptyRow ? rowIndex - 1 : rowIndex;

        if (actualIndex >= filteredCustomers.length || actualIndex < 0) continue;

        const customer = filteredCustomers[actualIndex];
        if (!customer) continue;

        const customerId = customer.id;
        if (customerId && typeof customerId === "number") {
          deletions.push(
            customerService.deleteCustomer(customerId).catch((err) => {
              console.warn("Error deleting customer:", customerId, err);
            })
          );
        }
      }

      await Promise.allSettled(deletions);
      await loadData();
    },
    [filteredCustomers, hasEmptyRow, loadData]
  );

  const handleAddNew = async () => {
    const newCustomer: any = {
      ma_moi: "",
      ma_cu: "",
      phan_loai: "",
      phien_ban: "",
      order: "",
      cty: "",
      team: "",
      chuc_vu: "",
      ten: "",
      id_tele: "",
      lien_he_2: "",
      link_nhom: "",
      id_nhom: "",
      info: "",
      ng_cham_1: "",
      ng_cham_2: "",
      tab_don: "",
      tin_dung: "",
      tinh_trang: "",
      // Không lưu ngay_check và dem_ngay vào Firebase, chỉ tính tự động trong UI
      note_kt: "",
      nguoi_xem: "",
    };

    try {
      await customerService.createCustomer(newCustomer);
      await loadCongNo();
      await loadData();
      setError("");
    } catch (err: any) {
      setError(err.message || "Tạo khách hàng thất bại");
      await loadData();
    }
  };

  // Handler để lưu selected users
  const handleSaveSelectedUsers = useCallback(() => {
    if (selectedRowForUser === null) {
      toast.error("Không tìm thấy dòng được chọn");
      return;
    }
    
    const instance = hotTableRef.current?.hotInstance;
    if (!instance) {
      toast.error("Không tìm thấy bảng dữ liệu");
      return;
    }
    
    const row = selectedRowForUser;
    const rowData = instance.getDataAtRow(row);
    if (!rowData) {
      toast.error("Không tìm thấy dữ liệu dòng");
      return;
    }
    
    const customerId = rowData[0];
    
    // Lưu dạng "username1, username2"
    const nguoiXemValue = selectedUsers.join(", ");
    
    // Set giá trị vào cell - điều này sẽ trigger handleAfterChange
    instance.setDataAtCell(row, 24, nguoiXemValue);
    
    // Đóng modal trước
    setShowUserModal(false);
    setSelectedRowForUser(null);
    setSelectedUsers([]);
    setSearchUserQuery("");
    
    // Nếu có customer ID, lưu vào Firebase
    if (customerId && typeof customerId === "number") {
      customerService.updateCustomer(customerId, { nguoi_xem: nguoiXemValue })
        .then(() => {
          // Cập nhật local state
          setCustomers((prevCustomers) => {
            return prevCustomers.map((customer) => {
              if (customer.id === customerId) {
                return { ...customer, nguoi_xem: nguoiXemValue };
              }
              return customer;
            });
          });
          toast.success("Đã lưu người xem thành công");
        })
        .catch((err) => {
          console.warn("Error updating nguoi_xem:", err);
          toast.error("Lỗi khi lưu người xem: " + (err.message || "Unknown error"));
        });
    } else {
      // Nếu không có customer ID (dòng mới), chỉ cập nhật UI
      toast.success("Đã cập nhật người xem");
    }
  }, [selectedRowForUser, selectedUsers]);

  // Set header data
  useEffect(() => {
    setHeaderData({
      title: "Quản Lý Khách Hàng",
      subTitle: "Quản lý thông tin khách hàng và công nợ",
      tabs: [],
      activeTab: "",
      onTabChange: () => {},
      refreshButton: true,
      customControls: null,
    });
  }, [setHeaderData]);

  return (
    <div ref={containerRef} className={`w-full ${isLoading && filteredCustomers.length === 0 ? "fixed inset-0 z-50" : "relative"}`}>
      <Toaster position="top-right" expand={true} richColors />

      {isLoading && filteredCustomers.length === 0 && (
       <LoadingSpinner />
      )}

      {(!isLoading || filteredCustomers.length > 0) && (
        <div className="w-full">
          {error && (
            <div className="mb-4">
              <Alert type="error" onClose={() => setError("")}>
                {error}
              </Alert>
            </div>
          )}

          {/* Table */}
          <div className="bg-white shadow-lg overflow-hidden">
            {isLoading ? (
              <LoadingSpinner />
            ) : filteredCustomers.length === 0 && !hasEmptyRow ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 min-h-[400px]">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-xl opacity-50"></div>
                  <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-full p-6 border-2 border-blue-100">
                    <Users className="h-12 w-12 text-blue-500" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Chưa có dữ liệu
                </h3>
                <p className="text-gray-500 mb-8 max-w-md text-center">
                  Chưa có khách hàng nào trong hệ thống. Hãy thêm khách hàng đầu tiên để bắt đầu.
                </p>
                <Button 
                  onClick={handleAddNew} 
                  variant="primary"
                  className="flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="h-5 w-5" />
                  <span>Thêm mới</span>
                </Button>
              </div>
            ) : (
              <HotTableComponent
                ref={hotTableRef}
                data={dataWithNewRow}
                columns={columns}
                onAfterChange={handleAfterChange}
                onAfterRemoveRow={handleAfterRemoveRow}
                contextMenuOptions={{
                  showAddRow: true,
                  showRemoveRow: true,
                }}
                onAfterCreateRow={handleAfterCreateRow}
                hiddenColumns={hiddenColumns}
                invalidCells={invalidCells}
                applyCommonStyles={true}
                afterOnCellMouseDown={handleAfterOnCellMouseDown}
              />
            )}
          </div>
        </div>
      )}

      {/* Modal chọn người xem */}
      {showUserModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900 bg-opacity-30 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                Chọn Người Xem
              </div>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedRowForUser(null);
                  setSelectedUsers([]);
                  setSearchUserQuery("");
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-4">
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm người xem..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Selected count */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-blue-800">Đã chọn: {selectedUsers.length} người</span>
                  {selectedUsers.length > 0 && (
                    <button
                      onClick={() => setSelectedUsers([])}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>

                {/* Viewer options grid */}
                <div style={{ scrollbarWidth: "none" }} className="grid grid-cols-5 gap-3 max-h-96 overflow-auto p-1">
                  {loadingUsers ? (
                    <div className="col-span-5 flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-500">Đang tải...</span>
                    </div>
                  ) : (
                    filteredAvailableUsers.length > 0 ? (
                      filteredAvailableUsers.map((user) => {
                        const isSelected = selectedUsers.includes(user.username);
                        const displayName = `${user.username} - ${user.fullname}`;
                        return (
                          <label
                            key={user.id}
                            className={`
                              relative flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                              ${isSelected
                                ? "border-blue-500 bg-blue-50 shadow-sm"
                                : "border-gray-200 bg-white hover:border-gray-300"
                              }
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers((prev) => Array.from(new Set([...prev, user.username])));
                                } else {
                                  setSelectedUsers((prev) => prev.filter((v) => v !== user.username));
                                }
                              }}
                              className="sr-only"
                            />
                            {/* Custom checkbox design */}
                            <div
                              className={`
                                absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"}
                              `}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            {/* User avatar and name */}
                            <div className="flex flex-col items-center gap-2">
                              <span
                                className={`
                                  text-xs font-medium text-center
                                  ${isSelected ? "text-blue-700" : "text-gray-700"}
                                `}
                              >
                                {displayName}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <div className="col-span-5 flex items-center justify-center py-8">
                        <span className="text-gray-500">Không có dữ liệu</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedRowForUser(null);
                  setSelectedUsers([]);
                  setSearchUserQuery("");
                }}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveSelectedUsers}
                className="flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Lưu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

