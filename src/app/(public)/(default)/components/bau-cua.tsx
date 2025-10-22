"use client"

import { useState, useEffect } from "react"
import getUserInfo from "@/components/userInfo"
import Image from "next/image"
import { database, ref, set, onValue } from "@/lib/firebase"
import { toast } from "sonner"
import { bauCuaApiService } from "@/apiServices/bau-cua"
import { Clock, CheckCircle2, AlertCircle } from "lucide-react"

interface BauCuaChoice {
  id: string
  username: string
  name: string
  animal: string
  timestamp: number
  date: string
}

export default function BauCua({ title = "Bầu Cua Tôm Cá" }) {
  const userInfo = getUserInfo()
  const [isClient, setIsClient] = useState(false)
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null)
  const [choices, setChoices] = useState<BauCuaChoice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [newChoice, setNewChoice] = useState<string | null>(null)

  const animals = [
    { name: "Hươu", image: "/images/bau-cua/huou.jpg", key: "huou" },
    { name: "Bầu", image: "/images/bau-cua/bau.jpg", key: "bau" },
    { name: "Gà", image: "/images/bau-cua/ga.jpg", key: "ga" },
    { name: "Cá", image: "/images/bau-cua/ca.jpg", key: "ca" },
    { name: "Cua", image: "/images/bau-cua/cua.jpg", key: "cua" },
    { name: "Tôm", image: "/images/bau-cua/tom.jpg", key: "tom" },
  ]

  // Set client-side flag
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load existing choices from Firebase
  useEffect(() => {
    if (!isClient) return

    const choicesRef = ref(database, "bau-cua-choices")
    onValue(choicesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const choicesArray = Object.values(data) as BauCuaChoice[]
        setChoices(choicesArray)
      }
    })
  }, [isClient])

  // Check if current time is within allowed hours (15:00 - 22:55)
  const isWithinAllowedHours = () => {
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()

    // Check if time is between 12:00 and 22:55
    if (hour < 12 || hour > 22) return false
    if (hour === 22 && minute > 55) return false

    return true
  }

  // Check if user has already chosen today
  const hasUserChosenToday = () => {
    if (!userInfo) return false

    const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD format
    return choices.some((choice) => choice.username === userInfo.username && choice.date === today)
  }

  const handleAnimalSelect = (animalKey: string) => {
    if (!userInfo) {
      toast.error("Vui lòng đăng nhập để chơi bạn nhé!")
      return
    }

    // Check if user has permission to play
    if (userInfo.role !== "Nhân viên" && userInfo.role !== "Admin") {
      toast.error("Đây là mục dành cho nhân viên, bạn thông cảm nhé!")
      return
    }

    if (!isWithinAllowedHours()) {
      toast.error("Hãy quay lại vào lúc 12:00 - 22:55 bạn nhé!")
      return
    }

    if (hasUserChosenToday()) {
      toast.error("Bạn đã chọn con vật hôm nay rồi!")
      return
    }

    setSelectedAnimal(animalKey)
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    if (!selectedAnimal || !userInfo) return

    setIsLoading(true)
    try {
      const now = new Date()
      const choiceData: BauCuaChoice = {
        id: `${userInfo.username}`,
        username: userInfo.username,
        name: userInfo.name,
        animal: selectedAnimal,
        timestamp: now.getTime(),
        date: now.toISOString().split("T")[0], // YYYY-MM-DD format
      }

      const choiceRef = ref(database, `bau-cua-choices/${choiceData.id}`)
      await set(choiceRef, choiceData)

      // Send message to Telegram
      try {
        await bauCuaApiService.sendTelegramMessage({
          username: userInfo.username,
          name: userInfo.name,
          animal: selectedAnimal,
          date: choiceData.date,
        })
      } catch (telegramError) {
        console.error("Error sending Telegram message:", telegramError)
        // Don't show error to user, just log it
      }

      // Highlight the new choice
      setNewChoice(selectedAnimal)
      setTimeout(() => setNewChoice(null), 3000) // Remove highlight after 3 seconds

      setShowConfirm(false)
      setSelectedAnimal(null)
      toast.success(`Đã chọn ${animals.find((a) => a.key === selectedAnimal)?.name} thành công!`)
    } catch (error) {
      console.error("Error saving choice:", error)
      toast.error("Có lỗi xảy ra, vui lòng thử lại!")
    } finally {
      setIsLoading(false)
    }
  }

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
            {title}
          </h1>
          <p className="text-lg text-purple-200 mb-8 font-medium">Chọn con vật may mắn của bạn</p>

          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl shadow-2xl p-6 max-w-2xl mx-auto border border-purple-500/30 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status */}
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-4 h-4 rounded-full animate-pulse ${isClient && isWithinAllowedHours() ? "bg-green-400" : "bg-red-400"}`}
                  ></div>
                  <span className="text-sm font-semibold text-slate-300">
                    {isClient ? (isWithinAllowedHours() ? "🟢 Đang mở" : "🔴 Đã đóng") : "⏳ Đang tải..."}
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
                {isClient && userInfo && hasUserChosenToday() ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-sm font-semibold text-green-300">Đã chọn hôm nay</span>
                  </div>
                ) : isClient && userInfo && userInfo.role !== "Nhân viên" && userInfo.role !== "Admin" ? (
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
            {animals.map((animal, index) => {
              const isSelected = selectedAnimal === animal.key
              const isNewChoice = newChoice === animal.key
              const canPlay = userInfo && (userInfo.role === "Nhân viên" || userInfo.role === "Admin")

              return (
                <div
                  key={index}
                  onClick={() => (canPlay ? handleAnimalSelect(animal.key) : null)}
                  className={`
                    relative group cursor-pointer transition-all duration-300
                    ${!canPlay ? "opacity-50 cursor-not-allowed" : ""}
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
                            : "border-gray-200 hover:border-purple-300 hover:shadow-xl hover:scale-105 group-hover:shadow-2xl"
                      }
                    `}
                  >
                    <div className="relative w-full h-32 mb-4">
                      <Image
                        src={animal.image || "/placeholder.svg"}
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
                  </div>
                </div>
              )
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
                <span className="font-bold text-purple-600">{animals.find((a) => a.key === selectedAnimal)?.name}</span>
                ?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-semibold transition-all duration-200"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "⏳ Đang lưu..." : "✓ Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
