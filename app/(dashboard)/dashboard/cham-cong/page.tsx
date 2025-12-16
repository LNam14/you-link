"use client";

import { useEffect, useState } from "react";
import { useHeader } from "@/app/(dashboard)/contexts/HeaderContext";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2, XCircle, Briefcase, Coffee, Clock } from "lucide-react";
import { toast } from "sonner";
import QuizModal, { WrongAnswerInfo } from "./QuizModal";
import { telegramApiRequest } from "@/lib/api/telegram.api";

type AttendanceStatus = "checked" | "off" | null;

interface DayData {
  date: Date;
  status: AttendanceStatus;
}

export default function ChamCongPage() {
  const { setHeaderData } = useHeader();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<Map<string, AttendanceStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [pendingCheckInDate, setPendingCheckInDate] = useState<Date | null>(null);

  // Set header data
  useEffect(() => {
    setHeaderData({
      title: "Chấm Công",
      subTitle: "Theo dõi và quản lý chấm công hàng ngày",
      tabs: [],
      activeTab: "",
      onTabChange: () => {},
      refreshButton: false,
      customControls: null,
    });
  }, [setHeaderData]);

  // Load attendance data từ API
  const loadAttendanceData = async (year: number, month: number) => {
    if (!user?.username) return;

    try {
      setIsLoadingData(true);
      const response = await fetch(`/api/attendance?year=${year}&month=${month + 1}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load attendance data");
      }

      const result = await response.json();
      if (result.success && result.data) {
        // Chuyển đổi object thành Map
        const dataMap = new Map<string, AttendanceStatus>();
        Object.keys(result.data).forEach((date) => {
          dataMap.set(date, "checked");
        });
        setAttendanceData(dataMap);
      }
    } catch (error) {
      console.error("Error loading attendance data:", error);
      toast.error("Không thể tải dữ liệu chấm công");
    } finally {
      setIsLoadingData(false);
    }
  };

  // Load attendance data khi tháng thay đổi
  useEffect(() => {
    if (user?.username) {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      loadAttendanceData(year, month);
    }
  }, [currentMonth, user?.username]);

  // Get days in month
  const getDaysInMonth = (date: Date): DayData[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const days: DayData[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateKey = formatDateKey(currentDate);
      const status = attendanceData.get(dateKey) || null;
      days.push({
        date: currentDate,
        status,
      });
    }

    return days;
  };

  // Format date key (YYYY-MM-DD)
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is in the past
  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Check if date is in the future
  const isFutureDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate > today;
  };

  // Handle check in - mở modal quiz trước
  const handleCheckIn = (date: Date) => {
    if (!user?.username) {
      toast.error("Vui lòng đăng nhập để chấm công");
      return;
    }

    setPendingCheckInDate(date);
    setIsQuizModalOpen(true);
  };

  // Thực hiện chấm công sau khi quiz thành công
  const handleQuizSuccess = async (wrongAnswers?: WrongAnswerInfo[]) => {
    if (!pendingCheckInDate || !user?.username) return;

    setIsLoading(true);
    try {
      const dateKey = formatDateKey(pendingCheckInDate);

      // Gọi API để lưu chấm công
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ date: dateKey }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to check in");
      }

      const result = await response.json();
      if (result.success) {
        // Cập nhật local state
        const newData = new Map(attendanceData);
        newData.set(dateKey, "checked");
        setAttendanceData(newData);
        toast.success("Chấm công thành công!");

        // Gửi tin nhắn Telegram
        try {
          const username = user.username;
          const fullname = user.fullname || user.username;
          const userInfo = `${username}-${fullname}`;
          
          // Tạo nội dung tin nhắn
          let message = `${userInfo} vượt qua bài kiểm tra để chấm công`;
          
          // Thêm thông tin các câu trả lời sai nếu có
          if (wrongAnswers && wrongAnswers.length > 0) {
            message += `\n\nCác câu trả lời sai: ${wrongAnswers.length}`;
            wrongAnswers.forEach((wrongAnswer, index) => {
              message += `\n\n${index + 1}. ${wrongAnswer.question}`;
              message += `\n   Đã chọn: ${wrongAnswer.selectedAnswer}`;
              message += `\n   Đáp án đúng: ${wrongAnswer.correctAnswer}`;
            });
          }
          
          await telegramApiRequest.sendMessage({
            chatId: "-1003124919874_7",
            message: message,
          });
        } catch (telegramError) {
          console.error("Error sending Telegram message:", telegramError);
          // Không hiển thị lỗi cho user, chỉ log
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra khi chấm công");
      console.error("Error checking in:", error);
    } finally {
      setIsLoading(false);
      setPendingCheckInDate(null);
    }
  };

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

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  return (
    <div className="w-full">
      <div className="bg-white shadow-xl overflow-hidden">
        {/* Header với điều hướng tháng - Full width - Light blue gradient */}
        <div className="flex items-center justify-between w-full bg-gradient-to-r from-blue-100 via-sky-100 to-cyan-100 border-b border-blue-200">
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

        {/* Legend - Square boxes like in image - Moved below month navigation */}
        <div className="px-4 py-2 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-4 flex-wrap justify-left">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded border border-blue-600 shadow-sm"></div>
              <span className="text-xs font-semibold text-gray-700">Đi làm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded border border-red-600 shadow-sm"></div>
              <span className="text-xs font-semibold text-gray-700">Nghỉ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-sky-300 rounded border border-sky-400 shadow-sm"></div>
              <span className="text-xs font-semibold text-gray-700">Hôm nay</span>
            </div>
            <div className="ml-4 pl-4 border-l border-gray-300">
              <span className="text-xs text-gray-600 font-medium">
                Chỉ giới hạn tối đa 26.5 công/tháng
              </span>
            </div>
          </div>
        </div>

        {/* Lịch grid */}
        <div className="p-4 bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <div className="grid grid-cols-7 gap-2.5">
            {/* Header các ngày trong tuần */}
            {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
              <div
                key={day}
                className="text-center font-extrabold text-gray-700 py-2.5 text-xs bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-sm"
              >
                {day}
              </div>
            ))}

            {/* Các ngày trong tháng */}
            {days.map((dayData, index) => {
              const { date, status } = dayData;
              const day = date.getDate();
              const isCurrentDay = isToday(date);
              const isPast = isPastDate(date);
              const isFuture = isFutureDate(date);

              // Chưa chấm = Nghỉ (status null trong ngày quá khứ)
              const displayStatus = isPast && !status ? "off" : status;
              
              // Nếu ngày hiện tại đã chấm công, hiển thị như đã chấm công
              const isCurrentDayAndChecked = isCurrentDay && status === "checked";
              const showCheckInButton = isCurrentDay && status !== "checked";

              return (
                <div
                  key={index}
                  className={`
                    relative min-h-[90px] p-2 rounded-xl border-2 transition-all duration-300
                    hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5 flex flex-col
                    ${
                      isCurrentDayAndChecked
                        ? "border-blue-300 bg-blue-50 shadow-sm hover:shadow-md"
                        : isCurrentDay
                        ? "border-sky-300 bg-sky-50 shadow-md"
                        : isPast
                        ? displayStatus === "checked"
                          ? "border-blue-300 bg-blue-50 shadow-sm hover:shadow-md"
                          : "border-red-300 bg-red-50 shadow-sm hover:shadow-md"
                        : isFuture
                        ? "border-gray-200 bg-white/40 opacity-50"
                        : "border-gray-200 bg-white"
                    }
                  `}
                >
                  {/* Số ngày */}
                  <div
                    className={`
                      text-base font-extrabold mb-1.5 flex-shrink-0
                      ${
                        isCurrentDayAndChecked
                          ? "text-blue-700"
                          : isCurrentDay
                          ? "text-sky-700"
                          : isPast && displayStatus === "checked"
                          ? "text-blue-700"
                          : isPast
                          ? "text-red-700"
                          : "text-gray-500"
                      }
                    `}
                  >
                    {day}
                  </div>

                  {/* Nội dung theo trạng thái */}
                  <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                    {showCheckInButton ? (
                      <button
                        onClick={() => handleCheckIn(date)}
                        disabled={isLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-xs disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{isLoading ? "Đang xử lý..." : "Chấm công"}</span>
                      </button>
                    ) : isCurrentDayAndChecked || (isPast && displayStatus === "checked") ? (
                      <div className="flex flex-col items-center gap-1 justify-center">
                        <div className="p-1 bg-blue-100 rounded-full flex-shrink-0">
                          <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <span className="text-[10px] font-semibold text-blue-700 text-center leading-tight">
                          Đi làm
                        </span>
                      </div>
                    ) : isPast ? (
                      <div className="flex flex-col items-center gap-1 justify-center">
                        <div className="p-1 bg-red-100 rounded-full flex-shrink-0">
                          <Coffee className="h-3.5 w-3.5 text-red-600" />
                        </div>
                        <span className="text-[10px] font-semibold text-red-700 text-center leading-tight">
                          Nghỉ
                        </span>
                      </div>
                    ) : isFuture ? (
                      <span className="text-xs text-gray-300">-</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Quiz Modal */}
      <QuizModal
        isOpen={isQuizModalOpen}
        onClose={() => {
          setIsQuizModalOpen(false);
          setPendingCheckInDate(null);
        }}
        onSuccess={handleQuizSuccess}
      />
    </div>
  );
}

