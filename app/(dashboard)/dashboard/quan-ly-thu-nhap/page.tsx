"use client";

import { useEffect, useState, useMemo } from "react";
import { useHeader } from "@/app/(dashboard)/contexts/HeaderContext";
import { ChevronLeft, ChevronRight, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import HotTableComponent, { Column } from "@/components/table/HotTable";

interface IncomeData {
  username: string;
  fullname: string;
  attendanceDays: number;
  attendanceIncome: number;
  beHuIncome: number;
  rewardIncome: number;
  totalIncome: number;
}

export default function QuanLyThuNhapPage() {
  const { setHeaderData } = useHeader();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Set header data
  useEffect(() => {
    setHeaderData({
      title: "Quản Lý Thu Nhập",
      subTitle: "Theo dõi và quản lý thu nhập nhân viên",
      tabs: [],
      activeTab: "",
      onTabChange: () => {},
      refreshButton: false,
      customControls: null,
    });
  }, [setHeaderData]);

  // Load income data
  const loadIncomeData = async (year: number, month: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/income?year=${year}&month=${month}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load income data");
      }

      const result = await response.json();
      if (result.success && result.data) {
        setIncomeData(result.data);
      }
    } catch (error) {
      console.error("Error loading income data:", error);
      toast.error("Không thể tải dữ liệu thu nhập");
    } finally {
      setIsLoading(false);
    }
  };

  // Load income data khi tháng thay đổi
  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1; // getMonth() trả về 0-11
    loadIncomeData(year, month);
  }, [currentMonth]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Go to current month
  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const monthName = currentMonth.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  
  // Tính tổng
  const totalAttendanceIncome = incomeData.reduce((sum, item) => sum + item.attendanceIncome, 0);
  const totalBeHuIncome = incomeData.reduce((sum, item) => sum + (item.beHuIncome * 1000), 0);
  const totalRewardIncome = incomeData.reduce((sum, item) => sum + item.rewardIncome, 0);
  const grandTotal = incomeData.reduce((sum, item) => sum + item.totalIncome, 0);

  // Chuyển đổi data thành 2D array cho HotTable
  const tableData = useMemo(() => {
    const rows = incomeData.map((item, index) => [
      index + 1, // STT
      `${item.username} - ${item.fullname}`, // Nhân viên
      Number(item.attendanceIncome) === 0 ? 0 + " VND" : Number(item.attendanceIncome).toFixed(3) + " VND", // Chấm công
      Number(item.beHuIncome) === 0 ? 0 + " VND" : Number(item.beHuIncome).toFixed(3) + " VND", // Bé hư
      Number(item.rewardIncome) === 0 ? 0 + " VND" : Number(item.rewardIncome).toFixed(3) + " VND", // Phần thưởng
      Number(item.totalIncome) === 0 ? 0 + " VND" : Number(item.totalIncome).toFixed(3) + " VND", // Tổng tiền
      item.attendanceDays, // Số ngày (để hiển thị trong renderer)
    ]);
    const normalizeNumber = (value: string | number): number => {
      if (typeof value === 'string') {
        return Number(value.replace(/\./g, ''));
      }
      return value;
    };
    // Thêm hàng tổng cộng
    if (rows.length > 0) {
      rows.push([
        "",
        "TỔNG CỘNG",
        Number((totalAttendanceIncome )) === 0 ? 0 + " VND" : Number((totalAttendanceIncome ).toFixed(3)) + " VND",
        Number((totalBeHuIncome)) === 0 ? 0 + " VND" : normalizeNumber(Number((totalBeHuIncome))) + " VND",
        Number((totalRewardIncome)) === 0 ? 0 + " VND" : Number((totalRewardIncome).toFixed(3)) + " VND",
        Number((grandTotal)) === 0 ? 0 + " VND" : Number((grandTotal).toFixed(3)) + " VND",
        0, // Không có số ngày cho tổng
      ]);
    }

    return rows;
  }, [incomeData, totalAttendanceIncome, totalBeHuIncome, totalRewardIncome, grandTotal]);

  // Định nghĩa columns
  const columns: Column[] = useMemo(() => {
    const totalRowIndex = incomeData.length; // Hàng tổng cộng là hàng cuối cùng
    
    return [
    {
      data: 0,
      title: "STT",
      readOnly: true,
      width: 40,
      renderer: function(instance: any, td: HTMLElement, row: number, col: number, prop: string | number, value: any) {
        td.textContent = value || "";
        td.style.textAlign = "center";
        td.style.fontWeight = "600";
        // Style cho hàng tổng cộng - chữ màu đỏ
        if (row === totalRowIndex) {
          td.style.fontWeight = "bold";
          td.style.backgroundColor = "#f3f4f6";
          td.style.setProperty("color", "#dc2626", "important"); // red-600
        }
        return td;
      }
    },
    {
      data: 1,
      title: "Nhân viên",
      readOnly: true,
      width: 250,
      renderer: function(instance: any, td: HTMLElement, row: number, col: number, prop: string | number, value: any) {
        td.textContent = value || "";
        td.style.textAlign = "left";
        td.style.fontWeight = "600";
        const isTotalRow = row === totalRowIndex;
        // Chữ màu cam cho cột Nhân viên (trừ hàng tổng cộng)
        if (!isTotalRow) {
          td.style.setProperty("color", "#ea580c", "important"); // orange-600
        }
        // Style cho hàng tổng cộng - chữ màu đỏ
        if (isTotalRow) {
          td.style.fontWeight = "bold";
          td.style.backgroundColor = "#f3f4f6";
          td.style.setProperty("color", "#dc2626", "important"); // red-600
        }
        return td;
      }
    },
    {
      data: 2,
      title: "Chấm công",
      readOnly: true,
      width: 180,
      renderer: function(instance: any, td: HTMLElement, row: number, col: number, prop: string | number, value: any) {
        const isTotalRow = row === totalRowIndex;
        td.textContent = value || 0;
        td.style.textAlign = "right";
        td.style.fontWeight = isTotalRow ? "bold" : "600";
        // Hàng tổng cộng - chữ màu đỏ
        if (isTotalRow) {
          td.style.backgroundColor = "#f3f4f6";
          td.style.setProperty("color", "#dc2626", "important"); // red-600
        } else {
          td.style.setProperty("color", "#2563eb", "important"); // blue-600
        }
        return td;
      }
    },
    {
      data: 3,
      title: "Bé hư",
      readOnly: true,
      width: 150,
      renderer: function(instance: any, td: HTMLElement, row: number, col: number, prop: string | number, value: any) {
        const isTotalRow = row === totalRowIndex;
        td.textContent = value || 0;
        td.style.textAlign = "right";
        td.style.fontWeight = isTotalRow ? "bold" : "600";
        // Chữ màu đỏ cho cột Bé hư
        td.style.setProperty("color", "#dc2626", "important"); // red-600
        if (isTotalRow) {
          td.style.backgroundColor = "#f3f4f6";
        }
        return td;
      }
    },
    {
      data: 4,
      title: "Phần thưởng",
      readOnly: true,
      width: 150,
      renderer: function(instance: any, td: HTMLElement, row: number, col: number, prop: string | number, value: any) {
        const isTotalRow = row === totalRowIndex;
        td.textContent = value || 0;
        td.style.textAlign = "right";
        td.style.fontWeight = isTotalRow ? "bold" : "600";
        // Chữ màu xanh lá cho cột Phần thưởng
        td.style.setProperty("color", "#16a34a", "important"); // green-600
        if (isTotalRow) {
          td.style.backgroundColor = "#f3f4f6";
        }
        return td;
      }
    },
    {
      data: 5,
      title: "Tổng tiền",
      readOnly: true,
      width: 180,
      renderer: function(instance: any, td: HTMLElement, row: number, col: number, prop: string | number, value: any) {
        const isTotalRow = row === totalRowIndex;
        td.textContent = value || 0;
        td.style.textAlign = "right";
        td.style.fontWeight = "bold";
        // Chữ xanh lá cho cột Tổng tiền (trừ hàng tổng cộng)
        if (!isTotalRow) {
          td.style.setProperty("color", "#16a34a", "important"); // green-600
        } else {
          // Hàng tổng cộng - chữ màu đỏ
          td.style.backgroundColor = "#f3f4f6";
          td.style.setProperty("color", "#dc2626", "important"); // red-600
        }
        return td;
      }
    },
  ];
  }, [incomeData.length]);

  return (
    <div className="w-full">
      <div className="bg-white shadow-xl overflow-hidden">
        {/* Header với điều hướng tháng */}
        <div className="flex items-center justify-between w-full bg-gradient-to-r from-blue-100 via-emerald-100 to-teal-100 border-b border-blue-200">
          <button
            onClick={goToPreviousMonth}
            className="px-4 py-2.5 hover:bg-blue-200/50 active:bg-blue-200/70 transition-all duration-200 flex items-center justify-center min-w-[50px] group"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="h-5 w-5 text-blue-700 group-hover:scale-110 transition-transform" />
          </button>
          <div className="flex-1 flex items-center justify-center gap-2 py-2.5">
            <Calendar className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-bold text-blue-800 capitalize">
              {monthName}
            </h2>
          </div>
          <button
            onClick={goToNextMonth}
            className="px-4 py-2.5 hover:bg-blue-200/50 active:bg-blue-200/70 transition-all duration-200 flex items-center justify-center min-w-[50px] group"
            aria-label="Tháng sau"
          >
            <ChevronRight className="h-5 w-5 text-blue-700 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* HotTable */}
        <div className="">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : incomeData.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              Không có dữ liệu
            </div>
          ) : (
            <HotTableComponent
              data={tableData}
              columns={columns}
              readOnly={true}
              height="auto"
              applyCommonStyles={true}
              contextMenuOptions={{ showAddRow: false, showRemoveRow: false }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

