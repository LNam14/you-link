"use client"

import { useState, useEffect } from "react"
import { Volume2, VolumeX, Sparkles, Coins, DollarSign, Eye, X, Star, Gift, Crown } from "lucide-react"
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
  "Chúc bạn luôn được yêu thương và trân trọng! 💖",
  "Tài lộc và thịnh vượng sẽ tìm đến bạn! 💰",
  "Chúc bạn luôn gặp được những người tốt trên đường đời! 🤝",
  "Gia đình bạn sẽ luôn hạnh phúc và sum vầy! 🏠",
  "Chúc bạn có một tương lai rực rỡ và đầy hy vọng! 🌟",
  "Mọi kế hoạch của bạn đều sẽ thành công mỹ mãn! 🎯",
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
  const [rewardsLoading, setRewardsLoading] = useState(false)
  const [cachedRewardsData, setCachedRewardsData] = useState<any[]>([])
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)
  const itemsPerPage = 10
  const windowSize = useWindowSize()
  const userInfo = getUserInfo()
  const [luckyMessage, setLuckyMessage] = useState<string>("")
  const today = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD")
  console.log(today)

  // Enhanced prize data with unique colors for each prize
  const data = [
    { option: "Chúc bạn may mắn lần sau!", style: { backgroundColor: "#6B7280", textColor: "white" } }, // 0 - Gray
    { option: "Bánh trung thu (1 cái)", style: { backgroundColor: "#FFD700", textColor: "black" } }, // 1 - Gold
    { option: "Hộp đựng quà", style: { backgroundColor: "#FF6B35", textColor: "white" } }, // 2 - Orange
    { option: "Tiền đô", style: { backgroundColor: "#8B5CF6", textColor: "white" } }, // 3 - Purple
    { option: "Socola", style: { backgroundColor: "#EF4444", textColor: "white" } }, // 4 - Red
    { option: "Hoa khô", style: { backgroundColor: "#7C3AED", textColor: "white" } }, // 5 - Violet
    { option: "Chúc bạn may mắn lần sau!", style: { backgroundColor: "#6B7280", textColor: "white" } }, // 6 - Gray
    { option: "Trà", style: { backgroundColor: "#3B82F6", textColor: "white" } }, // 7 - Blue
    { option: "Bánh trung thu (1 cái)", style: { backgroundColor: "#FFD700", textColor: "black" } }, // 1 - Gold
    { option: "Rượu vang", style: { backgroundColor: "#111827", textColor: "white" } }, // 8 - Dark
    { option: "Đồ thủ công", style: { backgroundColor: "#EC4899", textColor: "white" } }, // 9 - Pink
    { option: "Gấu bông", style: { backgroundColor: "#06B6D4", textColor: "white" } }, // 10 - Cyan
    { option: "Nước hoa 10ml nam", style: { backgroundColor: "#F59E0B", textColor: "white" } }, // 11 - Amber
    { option: "Chúc bạn may mắn lần sau!", style: { backgroundColor: "#6B7280", textColor: "white" } }, // 12 - Gray
    { option: "Nước hoa 10ml nữ", style: { backgroundColor: "#10B981", textColor: "white" } }, // 13 - Emerald
    { option: "Bánh trung thu (1 cái)", style: { backgroundColor: "#FFD700", textColor: "black" } }, // 1 - Gold
    { option: "Sách tự chọn", style: { backgroundColor: "#DC2626", textColor: "white" } }, // 14 - Dark Red
    { option: "Tô tranh", style: { backgroundColor: "#059669", textColor: "white" } }, // 15 - Green
    { option: "Chúc bạn luôn vui vẻ!", style: { backgroundColor: "#F97316", textColor: "white" } }, // 16 - Orange
    { option: "Thành công đang chờ bạn!", style: { backgroundColor: "#0EA5E9", textColor: "white" } }, // 17 - Sky Blue
    { option: "Hạnh phúc mỗi ngày!", style: { backgroundColor: "#84CC16", textColor: "white" } }, // 18 - Lime
    { option: "Sức khỏe dồi dào!", style: { backgroundColor: "#A855F7", textColor: "white" } }, // 19 - Purple
    { option: "Tài lộc phát đạt!", style: { backgroundColor: "#EAB308", textColor: "black" } }, // 20 - Yellow
  ]

  // Đưa hàm checkAndResetDailySpins ra ngoài useEffect để có thể gọi lại
  const checkAndResetDailySpins = async () => {
    // Check if userInfo exists before making API call
    if (!userInfo?.username) {
      console.log("No user info, skipping daily spins check")
      setSpinCount(0)
      return
    }

    if (userInfo?.role === "Admin") {
      setSpinCount(999) // Set to high number for display purposes
      return
    }

    try {
      const response = await wheelApiRequest.get()
      const rewardsData = response.data || []

      // Lọc phần thưởng của user hôm nay
      const userRecords = rewardsData.filter((reward) => reward.username === userInfo?.username)
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
    if (!mustSpin && (userInfo?.role === "Admin" || spinCount > 0)) {
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
            if (userInfo?.role !== "Admin") {
              checkAndResetDailySpins()
            }
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

  const fetchRewardsData = async () => {
    // Check if userInfo exists before making API call
    if (!userInfo?.username) {
      console.log("No user info, skipping rewards fetch")
      setRewards([])
      setTotalPages(1)
      setCurrentPage(1)
      setEmployees([])
      return
    }

    // Check cache validity (5 minutes)
    const now = Date.now()
    const cacheValidTime = 5 * 60 * 1000 // 5 minutes

    if (cachedRewardsData.length > 0 && now - lastFetchTime < cacheValidTime) {
      console.log("Using cached rewards data")
      processRewardsData(cachedRewardsData)
      return
    }

    setRewardsLoading(true)
    try {
      const response = await wheelApiRequest.get()
      const rewardsData: any = response.data || []

      // Cache the data
      setCachedRewardsData(rewardsData)
      setLastFetchTime(now)

      processRewardsData(rewardsData)
    } catch (error) {
      console.error("Error fetching rewards:", error)
    } finally {
      setRewardsLoading(false)
    }
  }

  const processRewardsData = (rewardsData: any[]) => {
    const currentMonth = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM")
    const currentMonthRewards = rewardsData.filter((reward: any) => {
      const rewardMonth = moment(reward.date || reward.created_at).format("YYYY-MM")
      return rewardMonth === currentMonth
    })

    // Filter rewards based on role and selected employee
    let filteredRewards: any = currentMonthRewards
    if (userInfo?.role === "Admin" && selectedEmployee) {
      filteredRewards = currentMonthRewards.filter((reward: any) => reward.username === selectedEmployee)
    } else if (userInfo?.role === "Nhân viên") {
      filteredRewards = currentMonthRewards
    } else {
      filteredRewards = currentMonthRewards.filter((reward: any) => reward.username === userInfo?.username)
    }

    setRewards(filteredRewards)
    setTotalPages(Math.ceil(filteredRewards.length / itemsPerPage))
    setCurrentPage(1) // Reset to first page when filters change

    // Extract unique usernames for the select dropdown
    if (userInfo?.role === "Admin") {
      const uniqueUsernames = Array.from(new Set(currentMonthRewards.map((reward: any) => reward.username)))
      const sortedUsernames = uniqueUsernames.sort((a: any, b: any) => {
        // Extract letters and numbers from usernames
        const aMatch = a.match(/^([A-Za-z]+)(\d*)$/)
        const bMatch = b.match(/^([A-Za-z]+)(\d*)$/)

        if (aMatch && bMatch) {
          const [, aLetters, aNumbers] = aMatch
          const [, bLetters, bNumbers] = bMatch

          // First compare letters
          const letterCompare = aLetters.localeCompare(bLetters, "vi-VN")
          if (letterCompare !== 0) return letterCompare

          // If letters are same, compare numbers
          const aNum = Number.parseInt(aNumbers) || 0
          const bNum = Number.parseInt(bNumbers) || 0
          return aNum - bNum
        }

        // Fallback to regular string comparison
        return a.localeCompare(b, "vi-VN")
      })
      setEmployees(sortedUsernames as unknown as string[])
    }
  }

  useEffect(() => {
    if (showRewards) {
      fetchRewardsData()
    }
  }, [showRewards, userInfo?.role, userInfo?.username])

  useEffect(() => {
    if (showRewards && cachedRewardsData.length > 0) {
      processRewardsData(cachedRewardsData)
    }
  }, [selectedEmployee])

  useEffect(() => {
    if (userInfo?.username) {
      checkAndResetDailySpins()
    }
  }, [userInfo?.username, userInfo?.role, today])

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

              {/* Prize Grid - 4 rows layout - more balanced */}
              <div className="space-y-2 mb-4">
                <div className="grid grid-cols-4 gap-2">
                  {data.slice(0, 4).map((prize, index) => (
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
                <div className="grid grid-cols-4 gap-2">
                  {data.slice(4, 8).map((prize, index) => (
                    <div
                      key={index + 4}
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
                  {data.slice(8, 12).map((prize, index) => (
                    <div
                      key={index + 8}
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
                  {data.slice(12, 16).map((prize, index) => (
                    <div
                      key={index + 12}
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
                <div className="grid grid-cols-5 gap-2">
                  {data.slice(16, 21).map((prize, index) => (
                    <div
                      key={index + 16}
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
                    fontSize={11}
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
                    (userInfo?.role !== "Admin" && spinCount <= 0) || // Fixed boolean/string comparison error
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
                    ) : userInfo?.role !== "Admin" && spinCount <= 0 ? ( // Fixed boolean/string comparison error
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
                {userInfo?.role !== "Admin" && spinCount <= 0 && (
                  <div className="mt-4 text-center bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/20">
                    <p className="text-white animate-pulse text-sm">
                      {userInfo?.role === "Nhân viên"
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
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-white/20">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <Gift className="h-6 w-6 text-white" />
                </div>
                Danh sách phần thưởng
              </h3>
              <button
                onClick={() => setShowRewards(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-10rem)]">
              {rewardsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin h-6 w-6 text-purple-600" viewBox="0 0 24 24">
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
                    <span className="text-gray-600 font-medium">Đang tải dữ liệu phần thưởng...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Employee filter for Admin */}
                  {userInfo?.role === "Admin" && (
                    <div className="mb-6">
                      <label htmlFor="employee-select" className="block text-sm font-semibold text-gray-700 mb-2">
                        Chọn nhân viên
                      </label>
                      <select
                        id="employee-select"
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-sm bg-white/80 backdrop-blur-sm"
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

                  <div className="mb-4 text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <Gift className="h-4 w-4" />
                      Phần thưởng tháng {moment().tz("Asia/Ho_Chi_Minh").format("MM/YYYY")}
                    </span>
                  </div>

                  {/* Rewards Summary - Hiển thị tất cả phần thưởng trong data */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <Gift className="h-4 w-4 text-purple-600" />
                      Thống kê phần thưởng tháng này
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {(() => {
                        // Lọc để chỉ hiển thị 1 phần thưởng "Chúc bạn may mắn lần sau"
                        const uniquePrizes = data.reduce((acc: typeof data, prize) => {
                          if (prize.option === "Chúc bạn may mắn lần sau!") {
                            // Chỉ thêm nếu chưa có
                            if (!acc.some((p) => p.option === "Chúc bạn may mắn lần sau!")) {
                              acc.push(prize)
                            }
                          } else {
                            acc.push(prize)
                          }
                          return acc
                        }, [])

                        return uniquePrizes.map((prize, index) => {
                          // Đếm số lần phần thưởng này đã được nhận
                          const count = rewards.filter((reward) => reward.reward === prize.option).length

                          return (
                            <div
                              key={index}
                              className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className="text-xs text-gray-500 mb-2 text-center leading-tight min-h-[2.5rem] flex items-center justify-center">
                                {prize.option}
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-purple-600 flex items-center justify-center gap-1">
                                  {count}
                                  {prize.option === "1 phân vàng" && <Coins className="h-4 w-4 text-yellow-500" />}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {count === 0 ? "Chưa có" : count === 1 ? "1 lần" : `${count} lần`}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                </>
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
