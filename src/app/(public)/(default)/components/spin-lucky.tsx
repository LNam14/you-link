"use client"

import { useState, useEffect } from "react"
import { Gift, Trophy, Volume2, VolumeX, Sparkles } from "lucide-react"
import { Wheel } from "react-custom-roulette"
import Confetti from "react-confetti"
import { useWindowSize } from "react-use"
import getUserInfo from "@/components/userInfo"

// Add Telegram notification function
const sendTelegramNotification = async (username: string, prize: string): Promise<boolean> => {
  try {
    const messageText = `🎲 ${username} vừa quay trúng ${prize} trong vòng quay may mắn!`

    const url = `https://api.telegram.org/bot7678598532:AAFeyTmZacHfu1_8AaX7ugs5bUdSvt67G8U/sendMessage`
    const params = new URLSearchParams({
      chat_id: '-1002298300938',
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

export default function SpinLucky({ title = "Vòng Quay May Mắn" }) {
  const [mustSpin, setMustSpin] = useState(false)
  const [prizeNumber, setPrizeNumber] = useState(0)
  const [previousPrize, setPreviousPrize] = useState<string | null>(null)
  const [spinCount, setSpinCount] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showPrizeAnimation, setShowPrizeAnimation] = useState(false)
  const [isButtonHovered, setIsButtonHovered] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const windowSize = useWindowSize()
  const userInfo = getUserInfo()

  // Enhanced prize data with better colors and more readable text
  const data = [
    { option: "1.000 VND", style: { backgroundColor: "#FF6384", textColor: "white" } },
    { option: "2.000 VND", style: { backgroundColor: "#36A2EB", textColor: "white" } },
    { option: "5.000 VND", style: { backgroundColor: "#FFCE56", textColor: "black" } },
    { option: "10.000 VND", style: { backgroundColor: "#4BC0C0", textColor: "white" } },
    { option: "20.000 VND", style: { backgroundColor: "#9966FF", textColor: "white" } },
    { option: "500.000 VND", style: { backgroundColor: "#FF9F40", textColor: "black" } },
    { option: "Quay thêm 1 lượt", style: { backgroundColor: "#8CD867", textColor: "black" } },
    { option: "Quay thêm 2 lượt", style: { backgroundColor: "#EA80FC", textColor: "white" } },
    { option: "1 tràng vỗ tay", style: { backgroundColor: "#64B5F6", textColor: "black" } },
    { option: "- 5.000 VND", style: { backgroundColor: "#E57373", textColor: "white" } },
    { option: "- 10.000 VND", style: { backgroundColor: "#BA68C8", textColor: "white" } },
  ]

  // Set mounted state
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Check and reset daily spins
  useEffect(() => {
    if (!isMounted) return

    const checkAndResetDailySpins = () => {
      const today = new Date().toDateString()
      const savedData = localStorage.getItem("spinData")
      const spinData = savedData ? JSON.parse(savedData) : null

      if (!spinData || spinData.date !== today) {
        // Reset spins for new day
        const newSpinData = {
          date: today,
          count: 1, // Start with 1 spin for a new day
          hasSpun: false, // Track if user has already spun today
        }
        localStorage.setItem("spinData", JSON.stringify(newSpinData))
        setSpinCount(newSpinData.count)
      } else {
        // Load existing spins for today
        setSpinCount(spinData.hasSpun ? 0 : spinData.count) // If already spun today, set count to 0
      }
    }

    checkAndResetDailySpins()
  }, [isMounted])

  // Save spin count to localStorage whenever it changes
  useEffect(() => {
    if (!isMounted) return

    const savedData = localStorage.getItem("spinData")
    const spinData = savedData ? JSON.parse(savedData) : { date: new Date().toDateString(), count: spinCount }

    spinData.count = spinCount

    // If spin count is 0, mark as spun for today
    if (spinCount === 0) {
      spinData.hasSpun = true
    }

    localStorage.setItem("spinData", JSON.stringify(spinData))
  }, [spinCount, isMounted])

  // Play sound effects
  const playSound = (soundType: string) => {
    if (isMuted || !isMounted) return

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
      playSound("click")

      // Decrease spin count
      setSpinCount((prev) => prev - 1)

      // Mark that user has spun today
      const today = new Date().toDateString()
      const savedData = localStorage.getItem("spinData")
      const spinData = savedData ? JSON.parse(savedData) : { date: today, count: 0 }

      spinData.hasSpun = true
      localStorage.setItem("spinData", JSON.stringify(spinData))

      // Generate random prize excluding 500,000 VND
      let newPrizeNumber
      do {
        newPrizeNumber = Math.floor(Math.random() * data.length)
      } while (data[newPrizeNumber].option === "500.000 VND")

      setPrizeNumber(newPrizeNumber)
      setMustSpin(true)

      // Play spinning sound
      playSound("spin")
    }
  }

  const handleStopSpinning = () => {
    setMustSpin(false)
    const currentPrize = data[prizeNumber].option
    setPreviousPrize(currentPrize)

    // Save prize to localStorage
    localStorage.setItem("lastPrize", currentPrize)

    // Send Telegram notification
    if (userInfo?.username) {
      sendTelegramNotification(userInfo.username, currentPrize)
    }

    // Handle prize logic
    if (currentPrize.includes("Quay thêm")) {
      const extraSpins = currentPrize.includes("2 lượt") ? 2 : 1
      setSpinCount((prev) => prev + extraSpins)

      // Update localStorage to reflect additional spins but keep hasSpun true
      const savedData = localStorage.getItem("spinData")
      const spinData = savedData ? JSON.parse(savedData) : { date: new Date().toDateString(), count: 0 }
      spinData.count += extraSpins
      spinData.hasSpun = true
      localStorage.setItem("spinData", JSON.stringify(spinData))
    } else if (currentPrize.includes("-")) {
      // Handle negative prizes
      const negativeAmount = parseInt(currentPrize.replace(/[^0-9]/g, ''))
      // You might want to handle the negative amount here if needed
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
    if (
      currentPrize.includes("500.000") ||
      currentPrize.includes("Quay thêm") ||
      currentPrize === "1 tràng vỗ tay"
    ) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)
    }
  }

  if (!isMounted) {
    return null // or a loading state
  }

  return (
    <section className="bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50 py-16 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-64 h-64 bg-gradient-to-r from-pink-200 to-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-10 w-72 h-72 bg-gradient-to-r from-yellow-200 to-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-blue-200 to-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <span className="inline-block px-4 py-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium">
              Thử vận may của bạn
            </span>
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 relative inline-block">
            {title}
            <span className="absolute -bottom-1 left-0 w-full h-1.5 bg-gradient-to-r from-purple-600 to-pink-600 transform -translate-y-1 rounded-full"></span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Quay ngay để có cơ hội nhận những phần quà giá trị lên đến 2.000.000 VND và 100 USDT
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16">
          <div className="w-full max-w-md">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 mb-6 backdrop-blur-sm bg-white/90 transform transition-all hover:scale-105 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 rounded-full text-white">
                  <Trophy className="h-6 w-6" />
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

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold text-gray-900">Lượt quay còn lại: {spinCount}</h4>
                </div>
                {!userInfo && <p className="text-red-600 text-sm">Vui lòng đăng nhập để quay thưởng</p>}
                {userInfo && userInfo.role !== "Nhân viên" && (
                  <p className="text-red-600 text-sm">Chỉ nhân viên mới được quay thưởng</p>
                )}
                {previousPrize && (
                  <p className="text-gray-700">
                    Phần thưởng gần đây: <span className="font-medium text-purple-600">{previousPrize}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="w-full max-w-md">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 backdrop-blur-sm bg-white/90">
              <div className="relative">
                {showConfetti && (
                  <Confetti
                    width={windowSize.width}
                    height={windowSize.height}
                    recycle={false}
                    numberOfPieces={200}
                  />
                )}
                <Wheel
                  mustStartSpinning={mustSpin}
                  prizeNumber={prizeNumber}
                  data={data}
                  onStopSpinning={handleStopSpinning}
                  backgroundColors={["#ffffff"]}
                  textColors={["#000000"]}
                  outerBorderColor="#ffffff"
                  outerBorderWidth={2}
                  innerBorderColor="#ffffff"
                  innerBorderWidth={2}
                  innerRadius={0}
                  radiusLineColor="#ffffff"
                  radiusLineWidth={1}
                  fontSize={16}
                  perpendicularText={false}
                  textDistance={85}
                />
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={handleSpinClick}
                  disabled={mustSpin || spinCount === 0}
                  className={`relative inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-full transition-all duration-300 transform ${mustSpin || spinCount === 0
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 hover:shadow-lg"
                    }`}
                  onMouseEnter={() => setIsButtonHovered(true)}
                  onMouseLeave={() => setIsButtonHovered(false)}
                >
                  <span className="relative z-10">
                    {mustSpin ? "Đang quay..." : spinCount === 0 ? "Hết lượt quay" : "Quay ngay"}
                  </span>
                  {isButtonHovered && !mustSpin && spinCount > 0 && (
                    <Sparkles className="absolute -right-2 -top-2 h-6 w-6 text-yellow-400 animate-pulse" />
                  )}
                </button>

                <div className="mt-4 text-sm text-gray-600">
                  Số lượt quay còn lại: <span className="font-bold">{spinCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
