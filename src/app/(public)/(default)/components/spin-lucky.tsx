"use client"

import { useState, useEffect } from "react"
import {
  Trophy,
  Volume2,
  VolumeX,
  Sparkles,
  Coins,
  DollarSign,
  CreditCard,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react"
import { Wheel } from "react-custom-roulette"
import Confetti from "react-confetti"
import { useWindowSize } from "react-use"
import getUserInfo from "@/components/userInfo"
import wheelApiRequest, { type Wheel as WheelType } from "@/apiRequests/wheel"
import moment from "moment-timezone"

// Add Telegram notification function
const sendTelegramNotification = async (username: string, prize: string, luckyMessage?: string): Promise<boolean> => {
  try {
    let messageText = `🎲 ${username} vừa quay trúng: ${prize}`
    if (prize === "1 lời chúc may mắn" && luckyMessage) {
      messageText += `\n\n${luckyMessage}`
    }

    const url = `https://ylink.qctl44.workers.dev/bot7678598532:AAFeyTmZacHfu1_8AaX7ugs5bUdSvt67G8U/sendMessage`
    const params = new URLSearchParams({
      chat_id: "-1002298300938",
      text: messageText,
    })

    const response = await fetch(`${url}?${params.toString()}`)
    const responseData = await response.json()

    if (responseData.ok) {
      console.log("Telegram notification sent successfully")
      return true
    } else {
      console.error(`Failed to send Telegram notification: ${responseData.description}`)
      return false
    }
  } catch (error) {
    console.error("Error sending Telegram notification:", error)
    return false
  }
}

// Add lucky messages array before the SpinLucky component
const luckyMessages = [
  "Chúc bạn một ngày tràn đầy niềm vui và hạnh phúc! 🌟",
  "May mắn sẽ đến với bạn trong thời gian sớm nhất! 🍀",
  "Thành công và hạnh phúc luôn bên bạn! ✨",
  "Chúc bạn gặp nhiều điều tốt lành trong cuộc sống! 🌈",
  "Mọi ước mơ của bạn sẽ thành hiện thực! 🌠",
  "Chúc bạn luôn mạnh khỏe và bình an! 💪",
  "Công việc của bạn sẽ thuận lợi và suôn sẻ! 📈",
  "Chúc bạn luôn tràn đầy năng lượng tích cực! ⚡",
  "Mọi khó khăn sẽ qua đi, niềm vui sẽ đến! 🌅",
  "Chúc bạn luôn được yêu thương và trân trọng! 💖"
]

export default function SpinLucky({ title = "Vòng Quay May Mắn" }) {
  const [mustSpin, setMustSpin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [prizeNumber, setPrizeNumber] = useState(0)
  const [previousPrize, setPreviousPrize] = useState<string | null>(null)
  const [spinCount, setSpinCount] = useState(0)
  const [extraSpins, setExtraSpins] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [showPrizeAnimation, setShowPrizeAnimation] = useState(false)
  const [isButtonHovered, setIsButtonHovered] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showRewards, setShowRewards] = useState(false)
  const [rewards, setRewards] = useState<WheelType[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [employees, setEmployees] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [goldWinners, setGoldWinners] = useState<{ username: string, count: number }[]>([])
  const itemsPerPage = 10
  const windowSize = useWindowSize()
  const userInfo = getUserInfo()
  const [luckyMessage, setLuckyMessage] = useState<string>("")
  const today = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD")
  console.log(today)
  // Enhanced prize data with money-themed colors
  const data = [
    {
      option: "1 phân vàng",
      style: { backgroundColor: "#FFD700", textColor: "black" },
    },
    {
      option: "1 lời chúc may mắn",
      style: { backgroundColor: "#FF9800", textColor: "white" },
    },
    {
      option: "Quay thêm 1 lượt",
      style: { backgroundColor: "#9C27B0", textColor: "white" },
    },
    {
      option: "50.000 VND",
      style: { backgroundColor: "#F44336", textColor: "white" },
    },
    {
      option: "20.000 VND",
      style: { backgroundColor: "#0D47A1", textColor: "white" },
    },
    {
      option: "1 phân vàng",
      style: { backgroundColor: "#FFD700", textColor: "black" },
    },
    {
      option: "10.000 VND",
      style: { backgroundColor: "#1976D2", textColor: "white" },
    },
    {
      option: "5.000 VND",
      style: { backgroundColor: "#B71C1C", textColor: "white" },
    },
    {
      option: "2.000 VND",
      style: { backgroundColor: "#2E7D32", textColor: "white" },
    },
    {
      option: "1.000 VND",
      style: { backgroundColor: "#4CAF50", textColor: "white" },
    },
    {
      option: "1 tràng vỗ tay",
      style: { backgroundColor: "#03A9F4", textColor: "black" },
    },
    {
      option: "1 phân vàng",
      style: { backgroundColor: "#FFD700", textColor: "black" },
    }
  ]

  // Đưa hàm checkAndResetDailySpins ra ngoài useEffect để có thể gọi lại
  const checkAndResetDailySpins = async () => {
    try {
      const response = await wheelApiRequest.get()
      const rewardsData = response.data || []

      // Lọc phần thưởng của user hôm nay
      const userRecords = userInfo?.role === "Admin"
        ? rewardsData
        : rewardsData.filter(reward => reward.username === userInfo?.username)
      const todayRecords = userRecords.filter(reward => reward.date === today)

      // Đếm số lượt đã dùng: chỉ tính phần thưởng chính (không tính Quay thêm 1 lượt)
      const usedSpins = todayRecords.filter(
        reward => reward.reward !== "Quay thêm 1 lượt"
      ).length

      // Mỗi ngày chỉ được 1 lượt quay chính
      let remain = 1 - usedSpins
      if (remain < 0) remain = 0

      setSpinCount(remain)
    } catch (error) {
      console.error("Error checking daily spins:", error)
      setSpinCount(1)
    }
  }

  // Play sound effects
  const playSound = (soundType: string) => {
    if (isMuted) return

    const audio = new Audio()

    switch (soundType) {
      case "spin":
        audio.src = "https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3" // Spinning wheel sound
        break
      case "win":
        audio.src = "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3" // Win celebration sound
        break
      case "click":
        audio.src = "https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3" // Button click sound
        break
      default:
        return
    }

    audio.play().catch((e) => console.log("Audio play error:", e))
  }

  const handleSpinClick = () => {
    if (!mustSpin && spinCount > 0) {
      setMustSpin(true)
      playSound("click")

      // Generate random prize with adjusted probability
      const newPrizeNumber = getWeightedPrizeNumber()
      setPrizeNumber(newPrizeNumber)

      // Play spinning sound
      playSound("spin")
    }
  }

  // Function to get weighted prize number
  const getWeightedPrizeNumber = () => {
    const possiblePrizes = data.map((_, index) => index)
    const randomIndex = Math.floor(Math.random() * possiblePrizes.length)
    return possiblePrizes[randomIndex]
  }

  // Đưa fetchGoldWinners ra ngoài useEffect để có thể gọi lại
  const fetchGoldWinners = async () => {
    try {
      const response = await wheelApiRequest.get()
      const rewardsData: any = response.data || []
      const now = new Date()
      const currentMonth = now.toISOString().slice(0, 7) // YYYY-MM

      // Lọc các bản ghi trong tháng hiện tại
      const monthRecords = rewardsData.filter((reward: any) =>
        reward.date && reward.date.startsWith(currentMonth)
      )

      // Đếm số lần mỗi username trúng '1 phân vàng' trong tháng
      const goldWins = monthRecords
        .filter((reward: any) => reward.reward === "1 phân vàng")
        .reduce((acc: { [key: string]: number }, reward: any) => {
          acc[reward.username] = (acc[reward.username] || 0) + 1
          return acc
        }, {})

      // Convert to array and sort by count
      const sortedGoldWinners = Object.entries(goldWins)
        .map(([username, count]) => ({ username, count: count as number }))
        .sort((a, b) => (b.count as number) - (a.count as number))
        .slice(0, 10) // Top 10

      setGoldWinners(sortedGoldWinners)
    } catch (error) {
      console.error("Error fetching gold winners:", error)
    }
  }

  const handleStopSpinning = async () => {
    try {
      setIsLoading(true)
      setMustSpin(false)
      const currentPrize = data[prizeNumber].option
      setPreviousPrize(currentPrize)

      // Handle lucky message prize
      let randomMessage = ""
      if (currentPrize === "1 lời chúc may mắn") {
        randomMessage = luckyMessages[Math.floor(Math.random() * luckyMessages.length)]
        setLuckyMessage(randomMessage)
      } else {
        setLuckyMessage("")
      }

      // Nếu quay trúng Quay thêm 1 lượt thì không trừ lượt, chỉ cho quay tiếp
      if (currentPrize === "Quay thêm 1 lượt") {
        // Không lưu vào DB, không trừ lượt, chỉ cho quay tiếp
        setIsLoading(false)
        return
      }

      // Nếu là phần thưởng chính thì lưu vào DB và gửi Telegram
      if (userInfo?.username) {
        // Gửi Telegram notification
        sendTelegramNotification(`${userInfo.username}-${userInfo.name || "No Name"}`, currentPrize, randomMessage)
        wheelApiRequest.create({
          username: userInfo.username,
          reward: currentPrize,
        })
          .then(() => {
            checkAndResetDailySpins()
            fetchGoldWinners()
          })
          .catch((error) => {
            console.error("Error saving wheel result:", error)
            // Có thể show toast lỗi nếu muốn
          })
      }

      // Show prize animation immediately
      setShowPrizeAnimation(true)

      // Hide prize animation after 5 seconds
      setTimeout(() => {
        setShowPrizeAnimation(false)
      }, 5000)

      // Play win sound
      playSound("win")

      // Show confetti for big prizes
      if (currentPrize.includes("500.000") || currentPrize === "1 tràng vỗ tay") {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
      }
    } catch (error) {
      console.error("Error stopping spinning:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch rewards when showRewards changes
  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const response = await wheelApiRequest.get()
        const rewardsData: any = response.data || []

        // Filter rewards based on role and selected employee
        let filteredRewards: any = rewardsData
        if (userInfo?.role === "Admin" && selectedEmployee) {
          filteredRewards = rewardsData.filter((reward: any) => reward.username === selectedEmployee)
        } else if (userInfo?.role === "Nhân viên") {
          filteredRewards = rewardsData
        } else {
          filteredRewards = rewardsData.filter((reward: any) => reward.username === userInfo?.username)
        }

        setRewards(filteredRewards)
        setTotalPages(Math.ceil(filteredRewards.length / itemsPerPage))
        setCurrentPage(1) // Reset to first page when filters change

        // Extract unique usernames for the select dropdown
        if (userInfo?.role === "Admin") {
          const uniqueUsernames = Array.from(new Set(rewardsData.map((reward: any) => reward.username)))
          setEmployees(uniqueUsernames as unknown as string[])
        }

        // Calculate gold winners leaderboard
        const goldWins = rewardsData
          .filter((reward: any) => reward.reward === "1 phân vàng")
          .reduce((acc: { [key: string]: number }, reward: any) => {
            acc[reward.username] = (acc[reward.username] || 0) + 1
            return acc
          }, {})

        // Convert to array and sort by count
        const sortedGoldWinners = Object.entries(goldWins)
          .map(([username, count]) => ({ username, count: count as number }))
          .sort((a, b) => (b.count as number) - (a.count as number))
          .slice(0, 10) // Get top 10

        setGoldWinners(sortedGoldWinners)
      } catch (error) {
        console.error("Error fetching rewards:", error)
      }
    }

    if (showRewards) {
      fetchRewards()
    }
  }, [showRewards, selectedEmployee, userInfo?.role, userInfo?.username])

  useEffect(() => {
    if (userInfo?.username) {
      checkAndResetDailySpins()
    }
  }, [userInfo?.username, userInfo?.role, today])

  useEffect(() => {
    fetchGoldWinners()
  }, [])

  return (
    <section className="bg-gradient-to-b from-emerald-50 via-teal-50 to-cyan-50 py-16 relative overflow-hidden">
      {/* Digital money background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-64 h-64 bg-gradient-to-r from-green-200 to-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-10 w-72 h-72 bg-gradient-to-r from-yellow-200 to-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-blue-200 to-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

        {/* Digital money symbols */}
        <div className="absolute top-1/4 left-1/4 text-6xl text-green-200 opacity-20">$</div>
        <div className="absolute top-1/3 right-1/4 text-7xl text-emerald-200 opacity-20">₫</div>
        <div className="absolute bottom-1/4 left-1/3 text-8xl text-teal-200 opacity-20">€</div>
        <div className="absolute bottom-1/3 right-1/3 text-6xl text-cyan-200 opacity-20">£</div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <span className="inline-block px-4 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium">
              Thử vận may của bạn
            </span>
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 relative inline-block">
            {title}
            <span className="absolute -bottom-1 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 transform -translate-y-1 rounded-full"></span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Quay ngay để có cơ hội nhận những phần quà giá trị lên đến 2.000.000 VND và 100 USDT
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16">
          <div className="w-full max-w-md">
            <div className="bg-white/90 p-8 rounded-2xl shadow-xl border border-gray-100 mb-6 backdrop-blur-sm transform transition-all hover:scale-105 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-3 rounded-full text-white">
                  <Coins className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Phần Thưởng Hấp Dẫn</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {data.slice(0, 8).map((prize, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg transition-all duration-300 hover:bg-gray-50"
                    style={{ borderLeft: `3px solid ${prize.style.backgroundColor}` }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: prize.style.backgroundColor }}
                    ></span>
                    <span className="text-gray-700 font-medium">{prize.option}</span>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  <h4 className="font-semibold text-gray-900">Lượt quay còn lại: {spinCount}</h4>
                </div>
                <p className="text-sm text-red-700">
                  {userInfo?.role === "Admin" ? (
                    "Admin được quay 999 lượt mỗi ngày"
                  ) : (
                    "Phần thưởng 1 phân vàng rất hấp dẫn"
                  )}
                </p>
                {!userInfo && <p className="text-red-600 text-sm">Vui lòng đăng nhập để quay thưởng</p>}
                {userInfo && userInfo.role !== "Nhân viên" && userInfo.role !== "Admin" && (
                  <p className="text-red-600 text-sm">Chỉ nhân viên và admin mới được quay thưởng</p>
                )}
                {previousPrize && (
                  <p className="text-gray-700">
                    Phần thưởng gần đây: <span className="font-medium text-emerald-600">{previousPrize}</span>
                  </p>
                )}
              </div>

              {/* Add View Rewards button for Admin and Nhân viên */}
              {(userInfo?.role === "Admin" || userInfo?.role === "Nhân viên") && (
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => setShowRewards(!showRewards)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    <Eye className="h-5 w-5" />
                    Xem phần thưởng
                  </button>
                </div>
              )}

              {/* Recent winners section */}
              <div className="mt-6 border-t border-gray-100 pt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  BXH 10 Phân vàng tháng này
                </h4>
                <div className="space-y-2">
                  {goldWinners.length > 0 ? (
                    goldWinners.map((winner, index) => (
                      <div key={winner.username} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">{index + 1}.</span>
                          <span className="text-gray-600">{winner.username}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-yellow-500">{winner.count}</span>
                          <span className="text-gray-500">phân vàng</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Chưa có người trúng phân vàng trong tháng này</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            {/* Glowing effect behind wheel */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full opacity-20 blur-xl animate-pulse"></div>

            {/* Digital money icons floating around the wheel */}
            <div className="absolute -inset-16 z-0">
              <div className="absolute top-0 left-1/4 animate-float-slow">
                <DollarSign className="h-8 w-8 text-emerald-400 opacity-60" />
              </div>
              <div className="absolute top-1/4 right-0 animate-float-slow animation-delay-1000">
                <CreditCard className="h-8 w-8 text-teal-400 opacity-60" />
              </div>
              <div className="absolute bottom-0 left-1/3 animate-float-slow animation-delay-2000">
                <Coins className="h-8 w-8 text-cyan-400 opacity-60" />
              </div>
              <div className="absolute bottom-1/4 right-1/4 animate-float-slow animation-delay-3000">
                <DollarSign className="h-8 w-8 text-green-400 opacity-60" />
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex flex-col items-center">
                {/* Sound toggle button */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="absolute top-0 right-0 z-20 p-2 bg-white/80 rounded-full shadow-md hover:bg-white transition-all duration-300"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5 text-gray-600" />
                  ) : (
                    <Volume2 className="h-5 w-5 text-emerald-600" />
                  )}
                </button>

                {/* Prize animation overlay */}
                {showPrizeAnimation && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center animate-fade-in">
                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border-2 border-emerald-500 transform transition-all duration-300 animate-scale-in">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Phần thưởng của bạn</h3>
                      {luckyMessage ? (
                        <>
                          <p className="text-emerald-600 font-bold text-2xl mb-2">1 lời chúc may mắn</p>
                          <p className="text-gray-700 text-lg italic">{luckyMessage}</p>
                        </>
                      ) : (
                        <p className="text-emerald-600 font-bold text-2xl">{previousPrize}</p>
                      )}
                      <div className="mt-2 flex justify-center">
                        <Coins className="h-8 w-8 text-yellow-500 animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}

                {/* The wheel */}
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full animate-spin-slow"></div>
                  <Wheel
                    mustStartSpinning={mustSpin}
                    prizeNumber={prizeNumber}
                    data={data}
                    onStopSpinning={handleStopSpinning}
                    backgroundColors={data.map((item) => item.style.backgroundColor)}
                    textColors={data.map((item) => item.style.textColor)}
                    outerBorderColor="#059669"
                    outerBorderWidth={3}
                    innerBorderColor="#0D9488"
                    innerBorderWidth={2}
                    innerRadius={10}
                    radiusLineColor="#FFFFFF"
                    radiusLineWidth={2}
                    fontSize={16}
                    perpendicularText={false}
                    textDistance={60}
                    spinDuration={0.8}
                  />

                  {/* Center decoration */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center z-10 shadow-lg">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                </div>

                {/* Spin button with hover effects */}
                <button
                  onClick={handleSpinClick}
                  disabled={mustSpin || spinCount <= 0 || !userInfo || (userInfo.role !== "Nhân viên" && userInfo.role !== "Admin")}
                  onMouseEnter={() => setIsButtonHovered(true)}
                  onMouseLeave={() => setIsButtonHovered(false)}
                  className={`mt-10 px-10 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden ${isButtonHovered ? "scale-105" : ""}`}
                >
                  {mustSpin ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Đang quay...
                    </span>
                  ) : spinCount <= 0 ? "Hết lượt quay" : "Quay Ngay"}
                </button>

                {spinCount <= 0 && (
                  <p className="mt-4 text-sm text-gray-600 animate-pulse">
                    {userInfo?.role === "Admin" ? (
                      "Hãy quay lại vào ngày mai để nhận thêm 999 lượt quay!"
                    ) : userInfo?.role === "Nhân viên" ? (
                      "Hãy quay lại vào ngày mai để nhận thêm lượt quay!"
                    ) : (
                      "Chỉ nhân viên và admin mới được quay thưởng"
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Modal */}
      {showRewards && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Danh sách phần thưởng
              </h3>
              <button
                onClick={() => setShowRewards(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
              {/* Employee filter for Admin */}
              {userInfo?.role === "Admin" && (
                <div className="mb-6">
                  <label htmlFor="employee-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Chọn nhân viên
                  </label>
                  <select
                    id="employee-select"
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Tất cả nhân viên</option>
                    {employees.map((employee) => (
                      <option key={employee} value={employee}>
                        {employee}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Table header */}
              <div className="border rounded-t-lg bg-gray-50">
                <div className="grid grid-cols-12 px-4 py-3 font-medium text-gray-700">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Nhân viên</div>
                  <div className="col-span-4">Phần thưởng</div>
                  <div className="col-span-4 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Ngày</span>
                  </div>
                </div>
              </div>

              {/* Rewards list */}
              <div className="border-x border-b rounded-b-lg overflow-hidden">
                {rewards.length > 0 ? (
                  rewards
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((reward, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 px-4 py-3 border-t first:border-t-0 hover:bg-gray-50 transition-colors"
                      >
                        <div className="col-span-1 text-gray-500">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </div>
                        <div className="col-span-3 font-medium text-gray-700">{reward.username}</div>
                        <div className="col-span-4 font-semibold text-emerald-600">{reward.reward}</div>
                        <div className="col-span-4 text-gray-500">
                          {reward.date
                            ? new Date(reward.date).toLocaleDateString('en-CA', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })
                            : 'N/A'}
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Không có phần thưởng nào</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {rewards.length > 0 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Hiển thị {Math.min(rewards.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(rewards.length, currentPage * itemsPerPage)} trong số {rewards.length} kết quả
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="text-sm font-medium">
                      Trang {currentPage} / {totalPages}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confetti effect */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.15}
          colors={["#10B981", "#059669", "#047857", "#0D9488", "#14B8A6", "#0891B2", "#0E7490", "#FFD700", "#22D3EE"]}
        />
      )}

      {/* Overlay loading */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-3">
            <svg className="animate-spin h-6 w-6 text-emerald-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span>Đang lưu kết quả...</span>
          </div>
        </div>
      )}

      {/* Add custom animations */}
      <style jsx global>{`
        @keyframes float-slow {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes blob {
          0% { transform: scale(1); }
          33% { transform: scale(1.1); }
          66% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        @keyframes scale-in {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }
        
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-3000 {
          animation-delay: 3s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </section>
  )
}
