"use client"

import { useState, useEffect } from "react"
import {
  Trophy,
  Volume2,
  VolumeX,
  Sparkles,
  Coins,
  DollarSign,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Star,
  Gift,
  Crown,
  Loader2,
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

    const url = `https://ylink.qctl44.workers.dev/bot8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U/sendMessage`
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
  "Chúc bạn luôn được yêu thương và trân trọng! 💖",
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
  const [goldWinners, setGoldWinners] = useState<{ username: string; count: number }[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>(moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM"))
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false)
  const itemsPerPage = 10
  const windowSize = useWindowSize()
  const userInfo = getUserInfo()
  const [luckyMessage, setLuckyMessage] = useState<string>("")
  const today = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD")
  console.log(today)

  // Enhanced prize data with unique colors for each prize
  const data = [
    { option: "1 phân vàng", style: { backgroundColor: "#FFD700", textColor: "black" } }, // 0 - Gold
    { option: "1 lời chúc may mắn", style: { backgroundColor: "#FF6B35", textColor: "white" } }, // 1 - Orange
    { option: "Quay thêm 1 lượt", style: { backgroundColor: "#8B5CF6", textColor: "white" } }, // 2 - Purple
    { option: "50.000 VND", style: { backgroundColor: "#EF4444", textColor: "white" } }, // 3 - Red
    { option: "100.000 VND", style: { backgroundColor: "#7C3AED", textColor: "white" } }, // 4 - Violet
    { option: "1 phân vàng", style: { backgroundColor: "#FFD700", textColor: "black" } }, // 5 - Gold
    { option: "20.000 VND", style: { backgroundColor: "#3B82F6", textColor: "white" } }, // 6 - Blue
    { option: "- 50.000 VND", style: { backgroundColor: "#111827", textColor: "white" } }, // 7 - Penalty
    { option: "40.000 VND", style: { backgroundColor: "#EC4899", textColor: "white" } }, // 8 - Pink
    { option: "10.000 VND", style: { backgroundColor: "#06B6D4", textColor: "white" } }, // 9 - Cyan
    { option: "1 phân vàng", style: { backgroundColor: "#FFD700", textColor: "black" } }, // 10 - Gold
    { option: "5.000 VND", style: { backgroundColor: "#F59E0B", textColor: "white" } }, // 11 - Amber
    { option: "2.000 VND", style: { backgroundColor: "#10B981", textColor: "white" } }, // 12 - Emerald
    { option: "- 100.000 VND", style: { backgroundColor: "#DC2626", textColor: "white" } }, // 13 - Dark Red
  ]

  // Đưa hàm checkAndResetDailySpins ra ngoài useEffect để có thể gọi lại
  const checkAndResetDailySpins = async () => {
    // Check if userInfo exists before making API call
    if (!userInfo?.username) {
      console.log("No user info, skipping daily spins check")
      setSpinCount(0)
      return
    }

    try {
      const response = await wheelApiRequest.get()
      const rewardsData = response.data || []

      // Lọc phần thưởng của user hôm nay
      const userRecords =
        userInfo?.role === "Admin"
          ? rewardsData
          : rewardsData.filter((reward) => reward.username === userInfo?.username)
      const todayRecords = userRecords.filter((reward) => reward.date === today)

      // Đếm số lượt đã dùng: chỉ tính phần thưởng chính (không tính Quay thêm 1 lượt)
      const usedSpins = todayRecords.filter((reward) => reward.reward !== "Quay thêm 1 lượt").length

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

  // Đưa fetchGoldWinners ra ngoài useEffect để có thể gọi lại với loading state
  const fetchGoldWinners = async (month?: string) => {
    // Check if userInfo exists before making API call
    if (!userInfo?.username) {
      console.log("No user info, skipping gold winners fetch")
      setGoldWinners([])
      return
    }

    try {
      setIsLoadingLeaderboard(true)
      const response = await wheelApiRequest.get()
      const rewardsData: any = response.data || []

      // Lọc theo tháng được chọn
      const targetMonth = month || selectedMonth
      const filteredRewards = rewardsData.filter((reward: any) => {
        if (!reward.date) return false
        const rewardMonth = moment(reward.date).tz("Asia/Ho_Chi_Minh").format("YYYY-MM")
        return rewardMonth === targetMonth
      })

      // Đếm số lần mỗi username trúng '1 phân vàng' trong tháng được chọn
      const goldWins = filteredRewards
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
    } finally {
      setIsLoadingLeaderboard(false)
    }
  }

  // Hàm để lấy danh sách các tháng có dữ liệu
  const fetchAvailableMonths = async () => {
    // Check if userInfo exists before making API call
    if (!userInfo?.username) {
      console.log("No user info, skipping available months fetch")
      setAvailableMonths([])
      return
    }

    try {
      const response = await wheelApiRequest.get()
      const rewardsData: any = response.data || []

      // Lấy tất cả các tháng có dữ liệu
      const monthStrings = rewardsData
        .filter((reward: any) => reward.date)
        .map((reward: any) => moment(reward.date).tz("Asia/Ho_Chi_Minh").format("YYYY-MM"))

      const uniqueMonths = Array.from(new Set(monthStrings)) as string[]
      const sortedMonths = uniqueMonths.sort((a, b) => b.localeCompare(a)) // Sắp xếp giảm dần (tháng mới nhất trước)

      setAvailableMonths(sortedMonths)
    } catch (error) {
      console.error("Error fetching available months:", error)
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
        wheelApiRequest
          .create({
            username: userInfo.username,
            reward: currentPrize,
          })
          .then(() => {
            checkAndResetDailySpins()
            fetchGoldWinners()
            fetchAvailableMonths()
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
      // Check if userInfo exists before making API call
      if (!userInfo?.username) {
        console.log("No user info, skipping rewards fetch")
        setRewards([])
        setTotalPages(1)
        setCurrentPage(1)
        setEmployees([])
        return
      }

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

        // Calculate gold winners leaderboard cho tháng hiện tại
        fetchGoldWinners()
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
    // Only fetch data if userInfo exists
    if (userInfo?.username) {
      fetchGoldWinners()
      fetchAvailableMonths()
    }
  }, [userInfo?.username])

  return (
    <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating coins */}
        <div className="absolute top-20 left-10 animate-bounce">
          <Coins className="h-8 w-8 text-yellow-400 opacity-60" />
        </div>
        <div className="absolute top-40 right-20 animate-bounce delay-1000">
          <DollarSign className="h-10 w-10 text-green-400 opacity-50" />
        </div>
        <div className="absolute bottom-32 left-20 animate-bounce delay-2000">
          <Gift className="h-12 w-12 text-pink-400 opacity-40" />
        </div>
        <div className="absolute bottom-20 right-32 animate-bounce delay-3000">
          <Star className="h-6 w-6 text-yellow-300 opacity-70" />
        </div>

        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center mb-2">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">
              <Crown className="h-6 w-6 inline mr-2 text-yellow-400" />
              <span className="text-sm font-bold">Thử vận may của bạn</span>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 mb-3 drop-shadow-2xl">
            {title}
          </h1>
          <p className="text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
            🎰 Quay ngay để có cơ hội nhận những phần quà giá trị lên đến{" "}
            <span className="text-yellow-400 font-bold">2.000.000 VND</span> và{" "}
            <span className="text-green-400 font-bold">100 USDT</span> 🎰
          </p>
        </div>

        <div className="flex flex-col xl:flex-row items-start justify-center gap-6 xl:gap-8">
          <div className="w-full xl:flex-[1] max-w-none">
            <div className="bg-white/10 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-white/20 mb-6 hover:bg-white/15 transition-all duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2.5 rounded-2xl shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Phần Thưởng Hấp Dẫn</h3>
              </div>

              {/* Prize Grid - 3 rows layout - more compact */}
              <div className="space-y-2 mb-4">
                <div className="grid grid-cols-3 gap-2">
                  {data.slice(0, 3).map((prize, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                    >
                      <div
                        className="w-5 h-5 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: prize.style.backgroundColor }}
                      ></div>
                      <span className="text-white font-medium text-xs text-center leading-tight">{prize.option}</span>
                      {prize.option === "1 phân vàng" && <Coins className="h-4 w-4 text-yellow-400 animate-pulse" />}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {data.slice(3, 6).map((prize, index) => (
                    <div
                      key={index + 3}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                    >
                      <div
                        className="w-5 h-5 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: prize.style.backgroundColor }}
                      ></div>
                      <span className="text-white font-medium text-xs text-center leading-tight">{prize.option}</span>
                      {prize.option === "1 phân vàng" && <Coins className="h-4 w-4 text-yellow-400 animate-pulse" />}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {data.slice(6, 10).map((prize, index) => (
                    <div
                      key={index + 6}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                    >
                      <div
                        className="w-5 h-5 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: prize.style.backgroundColor }}
                      ></div>
                      <span className="text-white font-medium text-xs text-center leading-tight">{prize.option}</span>
                      {prize.option === "1 phân vàng" && <Coins className="h-4 w-4 text-yellow-400 animate-pulse" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Spin Count Info - more compact */}
              <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 p-3 rounded-2xl border border-emerald-400/30 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-emerald-400 p-1 rounded-full">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <h4 className="font-bold text-white text-base">Lượt quay còn lại: {spinCount}</h4>
                </div>
                <div className="space-y-1 text-xs">
                  {userInfo?.role === "Admin" ? (
                    <p className="text-emerald-300">🎯 Admin được quay 999 lượt mỗi ngày</p>
                  ) : (
                    <p className="text-yellow-300">✨ Phần thưởng 1 phân vàng rất hấp dẫn</p>
                  )}
                  {!userInfo && <p className="text-red-400">⚠️ Vui lòng đăng nhập để quay thưởng</p>}
                  {userInfo && userInfo.role !== "Nhân viên" && userInfo.role !== "Admin" && (
                    <p className="text-red-400">🚫 Chỉ nhân viên và admin mới được quay thưởng</p>
                  )}
                  {previousPrize && (
                    <p className="text-gray-300">
                      🎁 Phần thưởng gần đây: <span className="font-bold text-yellow-400">{previousPrize}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* View Rewards Button - smaller */}
              {(userInfo?.role === "Admin" || userInfo?.role === "Nhân viên") && (
                <button
                  onClick={() => setShowRewards(!showRewards)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-sm"
                >
                  <Eye className="h-4 w-4" />
                  Xem phần thưởng
                </button>
              )}

              {/* Gold Winners Leaderboard - more compact */}
              <div className="mt-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-3 rounded-2xl border border-yellow-400/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-1 rounded-full">
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                    BXH 10 Phân vàng {moment(selectedMonth).format("MM/YYYY")}
                  </h4>

                  {/* Simplified Month Navigation with loading */}
                  {availableMonths.length > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const currentIndex = availableMonths.indexOf(selectedMonth)
                          if (currentIndex < availableMonths.length - 1) {
                            const prevMonth = availableMonths[currentIndex + 1]
                            setSelectedMonth(prevMonth)
                            fetchGoldWinners(prevMonth)
                          }
                        }}
                        disabled={
                          availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1 || isLoadingLeaderboard
                        }
                        className="group relative p-1.5 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 disabled:hover:scale-100"
                        title="Tháng trước"
                      >
                        {isLoadingLeaderboard ? (
                          <Loader2 className="h-3 w-3 text-white animate-spin" />
                        ) : (
                          <ChevronLeft className="h-3 w-3 text-white" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          const currentIndex = availableMonths.indexOf(selectedMonth)
                          if (currentIndex > 0) {
                            const nextMonth = availableMonths[currentIndex - 1]
                            setSelectedMonth(nextMonth)
                            fetchGoldWinners(nextMonth)
                          }
                        }}
                        disabled={availableMonths.indexOf(selectedMonth) <= 0 || isLoadingLeaderboard}
                        className="group relative p-1.5 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 disabled:hover:scale-100"
                        title="Tháng sau"
                      >
                        {isLoadingLeaderboard ? (
                          <Loader2 className="h-3 w-3 text-white animate-spin" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-white" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Leaderboard content with loading state */}
                <div className="space-y-1.5">
                  {isLoadingLeaderboard ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 text-yellow-400 animate-spin" />
                      <span className="ml-2 text-white text-sm">Đang tải...</span>
                    </div>
                  ) : goldWinners.length > 0 ? (
                    goldWinners.map((winner, index) => (
                      <div
                        key={winner.username}
                        className="flex items-center justify-between p-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${index === 0
                              ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
                              : index === 1
                                ? "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800"
                                : index === 2
                                  ? "bg-gradient-to-r from-orange-400 to-orange-600 text-white"
                                  : "bg-white/20 text-white"
                              }`}
                          >
                            {index + 1}
                          </div>
                          <span className="text-white font-medium text-xs">{winner.username}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-yellow-400 text-sm">{winner.count}</span>
                          <Coins className="h-3 w-3 text-yellow-400" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-gray-400 text-xs">Chưa có người trúng phân vàng trong tháng này</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Wheel */}
          <div className="relative xl:flex-[1]">
            {/* Glowing effect behind wheel - smaller */}
            <div className="absolute -inset-6 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 rounded-full opacity-30 blur-2xl animate-pulse"></div>

            <div className="relative z-10">
              <div className="flex flex-col items-center">
                {/* Sound toggle button - smaller */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="absolute -top-2 -right-2 z-20 p-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg hover:bg-white/30 transition-all duration-300 border border-white/30"
                >
                  {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                </button>

                {/* Prize animation overlay - keep same */}
                {showPrizeAnimation && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center animate-fade-in">
                    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-2xl border-4 border-yellow-400 transform transition-all duration-500 animate-scale-in max-w-sm">
                      <div className="text-center">
                        <div className="mb-3">
                          <Gift className="h-12 w-12 text-yellow-500 mx-auto animate-bounce" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">🎉 Chúc mừng! 🎉</h3>
                        {luckyMessage ? (
                          <>
                            <p className="text-yellow-600 font-bold text-2xl mb-3">1 lời chúc may mắn</p>
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-2xl border border-yellow-200">
                              <p className="text-gray-700 text-base italic leading-relaxed">{luckyMessage}</p>
                            </div>
                          </>
                        ) : (
                          <p className="text-yellow-600 font-bold text-3xl">{previousPrize}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* The wheel - smaller */}
                <div className="relative mb-8">
                  <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-spin-slow opacity-50"></div>
                  <Wheel
                    mustStartSpinning={mustSpin}
                    prizeNumber={prizeNumber}
                    data={data}
                    onStopSpinning={handleStopSpinning}
                    backgroundColors={data.map((item) => item.style.backgroundColor)}
                    textColors={data.map((item) => item.style.textColor)}
                    outerBorderColor="#F59E0B"
                    outerBorderWidth={3}
                    innerBorderColor="#FBBF24"
                    innerBorderWidth={2}
                    innerRadius={12}
                    radiusLineColor="#FFFFFF"
                    radiusLineWidth={2}
                    fontSize={14}
                    perpendicularText={false}
                    textDistance={50}
                    spinDuration={1.0}
                  />

                  {/* Center decoration - smaller */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center z-10 shadow-2xl border-3 border-white">
                    <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center">
                      <Crown className="h-6 w-6 text-yellow-500" />
                    </div>
                  </div>
                </div>

                {/* Spin button - smaller */}
                <button
                  onClick={handleSpinClick}
                  disabled={
                    mustSpin ||
                    spinCount <= 0 ||
                    !userInfo ||
                    (userInfo.role !== "Nhân viên" && userInfo.role !== "Admin")
                  }
                  onMouseEnter={() => setIsButtonHovered(true)}
                  onMouseLeave={() => setIsButtonHovered(false)}
                  className={`px-8 py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white rounded-full font-black text-xl shadow-2xl hover:shadow-3xl transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden border-3 border-white ${isButtonHovered ? "scale-105 rotate-1" : ""
                    } ${mustSpin ? "animate-pulse" : ""}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-500 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="relative z-10 flex items-center gap-2">
                    {mustSpin ? (
                      <>
                        <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Đang quay...
                      </>
                    ) : spinCount <= 0 ? (
                      "Hết lượt quay"
                    ) : (
                      <>
                        <Sparkles className="h-6 w-6" />
                        QUAY NGAY
                        <Sparkles className="h-6 w-6" />
                      </>
                    )}
                  </span>
                </button>

                {/* Status message - smaller */}
                {spinCount <= 0 && (
                  <div className="mt-4 text-center bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/20">
                    <p className="text-white animate-pulse text-sm">
                      {userInfo?.role === "Admin"
                        ? "🌅 Hãy quay lại vào ngày mai để nhận thêm 999 lượt quay!"
                        : userInfo?.role === "Nhân viên"
                          ? "🌅 Hãy quay lại vào ngày mai để nhận thêm lượt quay!"
                          : "🚫 Chỉ nhân viên và admin mới được quay thưởng"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Modal */}
      {showRewards && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="bg-white/20 p-3 rounded-full">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                Danh sách phần thưởng
              </h3>
              <button
                onClick={() => setShowRewards(false)}
                className="p-3 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-12rem)]">
              {/* Employee filter for Admin */}
              {userInfo?.role === "Admin" && (
                <div className="mb-8">
                  <label htmlFor="employee-select" className="block text-lg font-semibold text-gray-700 mb-3">
                    Chọn nhân viên
                  </label>
                  <select
                    id="employee-select"
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/50 focus:border-purple-500 text-lg bg-white/80 backdrop-blur-sm"
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

              {/* Table */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                {/* Table header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <div className="grid grid-cols-12 px-6 py-4 font-bold text-gray-700 text-lg">
                    <div className="col-span-1">#</div>
                    <div className="col-span-3">Nhân viên</div>
                    <div className="col-span-4">Phần thưởng</div>
                    <div className="col-span-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      <span>Ngày</span>
                    </div>
                  </div>
                </div>

                {/* Rewards list */}
                <div className="divide-y divide-gray-200">
                  {rewards.length > 0 ? (
                    rewards.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((reward, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 px-6 py-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-300"
                      >
                        <div className="col-span-1 text-gray-500 font-medium">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </div>
                        <div className="col-span-3 font-semibold text-gray-700">{reward.username}</div>
                        <div className="col-span-4 font-bold text-purple-600 flex items-center gap-2">
                          {reward.reward === "1 phân vàng" && <Coins className="h-5 w-5 text-yellow-500" />}
                          {reward.reward}
                        </div>
                        <div className="col-span-4 text-gray-500 font-medium">
                          {reward.date
                            ? new Date(reward.date).toLocaleDateString("en-CA", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            })
                            : "N/A"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-xl">Không có phần thưởng nào</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pagination */}
              {rewards.length > 0 && (
                <div className="flex items-center justify-between mt-8 bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200">
                  <div className="text-gray-600 font-medium">
                    Hiển thị {Math.min(rewards.length, (currentPage - 1) * itemsPerPage + 1)} -{" "}
                    {Math.min(rewards.length, currentPage * itemsPerPage)} trong số {rewards.length} kết quả
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-3 rounded-xl border-2 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50 hover:border-purple-300 transition-all duration-300"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="font-bold text-lg px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl">
                      Trang {currentPage} / {totalPages}
                    </div>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-3 rounded-xl border-2 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50 hover:border-purple-300 transition-all duration-300"
                    >
                      <ChevronRight className="h-5 w-5" />
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
          colors={["#FFD700", "#FFA500", "#FF6347", "#FF1493", "#9370DB", "#00CED1", "#32CD32", "#FFB6C1"]}
        />
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/20">
            <svg className="animate-spin h-8 w-8 text-purple-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-xl font-semibold text-gray-700">Đang lưu kết quả...</span>
          </div>
        </div>
      )}

      {/* Custom animations */}
      <style jsx global>{`
        @keyframes float-slow {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fade-in {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes scale-in {
          0% { transform: scale(0.5) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(5deg); opacity: 0.8; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        
        .animate-scale-in {
          animation: scale-in 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
        
        .delay-2000 {
          animation-delay: 2s;
        }
        
        .delay-3000 {
          animation-delay: 3s;
        }
      `}</style>
    </section>
  )
}
