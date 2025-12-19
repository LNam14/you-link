"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Image from "next/image";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";

type AnimalType = "bau" | "ca" | "cua" | "ga" | "huou" | "tom";

interface Animal {
  type: AnimalType;
  name: string;
  image: string;
}

const ANIMALS: Animal[] = [
  { type: "bau", name: "Bầu", image: "/bau-cua/bau.jpg" },
  { type: "ca", name: "Cá", image: "/bau-cua/ca.jpg" },
  { type: "cua", name: "Cua", image: "/bau-cua/cua.jpg" },
  { type: "ga", name: "Gà", image: "/bau-cua/ga.jpg" },
  { type: "huou", name: "Hươu", image: "/bau-cua/huou.jpg" },
  { type: "tom", name: "Tôm", image: "/bau-cua/tom.jpg" },
];

/**
 * Get current time in Vietnam timezone (UTC+7) - Client-side version
 */
function getVietnamTime(): Date {
  const now = new Date();
  // Get UTC time and add 7 hours for Vietnam timezone
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const vietnamTime = new Date(utcTime + (7 * 60 * 60 * 1000));
  return vietnamTime;
}

export default function BauCua() {
  const { user } = useAuth();
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChosenToday, setHasChosenToday] = useState(false);
  const [todayChoice, setTodayChoice] = useState<AnimalType | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [newChoice, setNewChoice] = useState<AnimalType | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(getVietnamTime());

  // Set isClient to true after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update current time every minute - sử dụng múi giờ Việt Nam
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getVietnamTime());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Kiểm tra thời gian có nằm trong khoảng 12:00 - 22:55 không - sử dụng múi giờ Việt Nam
  const isWithinAllowedHours = () => {
    const vietnamNow = getVietnamTime();
    const hours = vietnamNow.getHours();
    const minutes = vietnamNow.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    const startMinutes = 12 * 60; // 12:00
    const endMinutes = 22 * 60 + 55; // 22:55

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  // Kiểm tra xem user đã chọn hôm nay chưa
  useEffect(() => {
    if (user?.username) {
      checkTodayChoice();
    }
  }, [user]);

  const checkTodayChoice = async () => {
    if (!user?.username) return;

    try {
      const token = localStorage.getItem("auth-token");
      const response = await fetch("/api/bau-cua/check", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setHasChosenToday(data.data.hasChosen);
          if (data.data.choice) {
            setTodayChoice(data.data.choice.animal);
          }
        }
      }
    } catch (error) {
      console.error("Error checking today choice:", error);
    }
  };

  const handleSelectAnimal = (animal: AnimalType) => {
    if (hasChosenToday) {
      toast.error("Bạn đã chọn con vật trong ngày hôm nay rồi!");
      return;
    }

    if (!user) {
      toast.error("Vui lòng đăng nhập");
      return;
    }

    // Kiểm tra role
    if (user.role !== "Admin" && user.role !== "Nhân viên") {
      toast.error("Chỉ Admin hoặc Nhân viên mới được chơi bầu cua");
      return;
    }

    // Kiểm tra thời gian
    if (!isWithinAllowedHours()) {
      toast.error("Chỉ có thể chọn từ 12:00 đến 22:55!");
      return;
    }

    setSelectedAnimal(animal);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!selectedAnimal) {
      toast.error("Vui lòng chọn một con vật");
      return;
    }

    if (!user) {
      toast.error("Vui lòng đăng nhập");
      return;
    }

    // Kiểm tra role
    if (user.role !== "Admin" && user.role !== "Nhân viên") {
      toast.error("Chỉ Admin hoặc Nhân viên mới được chơi bầu cua");
      return;
    }

    // Kiểm tra thời gian
    if (!isWithinAllowedHours()) {
      toast.error("Chỉ có thể chọn từ 12:00 đến 22:55!");
      setShowConfirm(false);
      setSelectedAnimal(null);
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("auth-token");
      const response = await fetch("/api/bau-cua/choice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ animal: selectedAnimal }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Có lỗi xảy ra");
      }

      toast.success("Đã chọn con vật thành công! Tin nhắn đã được gửi tới nhóm Telegram.");
      setHasChosenToday(true);
      setTodayChoice(selectedAnimal);
      setNewChoice(selectedAnimal);
      setSelectedAnimal(null);
      setShowConfirm(false);

      // Reset newChoice indicator after animation
      setTimeout(() => {
        setNewChoice(null);
      }, 3000);
    } catch (error: any) {
      console.error("Error submitting choice:", error);
      toast.error(error.message || "Có lỗi xảy ra khi lưu lựa chọn");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canPlay = user && (user.role === "Nhân viên" || user.role === "Admin") && isWithinAllowedHours() && !hasChosenToday;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full">
              <span className="text-2xl">🎲</span>
              <span className="text-sm font-bold text-slate-900">May Mắn Hôm Nay</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-yellow-300 via-orange-300 to-red-300 bg-clip-text text-transparent mb-3 drop-shadow-lg">
            Bầu Cua Tôm Cá
          </h1>
          <p className="text-lg text-purple-200 mb-8 font-medium">Chọn con vật may mắn của bạn</p>

          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl shadow-2xl p-6 max-w-2xl mx-auto border border-purple-500/30 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status */}
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-4 h-4 rounded-full animate-pulse ${
                      isClient && isWithinAllowedHours() ? "bg-green-400" : "bg-red-400"
                    }`}
                  ></div>
                  <span className="text-sm font-semibold text-slate-300">
                    {isClient
                      ? isWithinAllowedHours()
                        ? "🟢 Đang mở"
                        : "🔴 Đã đóng"
                      : "⏳ Đang tải..."}
                  </span>
                </div>
              </div>

              {/* Time */}
              <div className="flex flex-col items-center justify-center border-l border-r border-slate-600">
                <Clock className="w-5 h-5 text-yellow-400 mb-2" />
                <span className="text-sm font-semibold text-slate-300">12:00 - 22:55</span>
              </div>

              {/* User Status */}
              <div className="flex flex-col items-center justify-center">
                {isClient && user && hasChosenToday ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-sm font-semibold text-green-300">Đã chọn hôm nay</span>
                  </div>
                ) : isClient && user && user.role !== "Nhân viên" && user.role !== "Admin" ? (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-sm font-semibold text-red-300">Không có quyền</span>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-slate-400">Sẵn sàng chơi</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {isClient && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
            {ANIMALS.map((animal, index) => {
              const isSelected = selectedAnimal === animal.type;
              const isNewChoice = newChoice === animal.type;

              return (
                <div
                  key={index}
                  onClick={() => (canPlay ? handleSelectAnimal(animal.type) : null)}
                  className={`
                    relative group transition-all duration-300
                    ${!canPlay ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  <div
                    className={`
                      relative bg-white p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden
                      ${
                        isSelected
                          ? "border-purple-500 shadow-2xl scale-105 ring-4 ring-purple-300"
                          : isNewChoice
                            ? "border-green-500 shadow-2xl scale-105 ring-4 ring-green-300 animate-pulse"
                            : hasChosenToday && todayChoice === animal.type
                              ? "border-green-500 shadow-2xl ring-4 ring-green-300"
                              : "border-gray-200 hover:border-purple-300 hover:shadow-xl hover:scale-105 group-hover:shadow-2xl"
                      }
                    `}
                  >
                    <div className="relative w-full h-32 mb-4">
                      <Image
                        src={animal.image}
                        alt={animal.name}
                        fill
                        className="object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>

                    {/* Animal Name */}
                    <div className="text-center">
                      <p className="font-bold text-gray-800 text-lg">{animal.name}</p>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-purple-100 bg-opacity-50 rounded-2xl flex items-center justify-center">
                        <div className="bg-purple-500 text-white px-4 py-2 rounded-full font-semibold">Đã chọn</div>
                      </div>
                    )}

                    {/* New Choice Indicator */}
                    {isNewChoice && (
                      <div className="absolute -top-2 -right-2 z-20">
                        <div className="bg-green-400 text-white rounded-full w-10 h-10 flex items-center justify-center font-black text-lg animate-bounce">
                          ✓
                        </div>
                      </div>
                    )}

                    {/* Already Chosen Today Indicator */}
                    {hasChosenToday && todayChoice === animal.type && !isNewChoice && (
                      <div className="absolute inset-0 bg-green-100 bg-opacity-50 rounded-2xl flex items-center justify-center">
                        <div className="bg-green-500 text-white px-4 py-2 rounded-full font-semibold">Đã chọn hôm nay</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isClient && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="relative bg-white p-6 rounded-2xl border-2 border-gray-200 animate-pulse">
                <div className="w-full h-32 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {isClient && showConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-3xl font-bold text-center mb-4 text-gray-800">Xác nhận lựa chọn</h3>
              <p className="text-center text-gray-600 mb-8 text-lg">
                Bạn chắc chắn muốn chọn{" "}
                <span className="font-bold text-purple-600">
                  {ANIMALS.find((a) => a.type === selectedAnimal)?.name}
                </span>
                ?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setSelectedAnimal(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-semibold transition-all duration-200"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "⏳ Đang lưu..." : "✓ Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

