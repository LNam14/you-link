"use client"

import { useState, useEffect, useRef } from "react"
import getUserInfo from "@/components/userInfo"
import Link from "next/link"
import PageIllustration from "./page-illustration"
import CurrencyConverterModal from "@/components/CurrencyConverterModal"
import {
  ShoppingBag,
  DollarSign,
  CheckCircle,
  LayoutDashboard,
  ArrowRight,
  LinkIcon,
  BarChart3,
  Globe,
  Search,
  Award,
  ChevronLeft,
  ChevronRight,
  Database,
  Clock,
  Settings,
  Users,
  Inbox,
  Wallet2,
  UserPlus,
  FileText,
} from "lucide-react"
import { Wallet } from "lucide-react"
import DepositModal from "@/app/(public)/(default)/components/DepositModal"
import WithdrawModal from "@/app/(public)/(default)/components/WithdrawModal"
import { useRouter } from "next/navigation"
import authApiRequest from "@/apiRequests/auth"
import { database, onValue, ref } from "@/app/firebase/firebase"

export default function HeroHome() {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isConverterModalVisible, setIsConverterModalVisible] = useState(false)
  const [topSites, setTopSites] = useState<{ site: string; count: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditUserModalVisible, setIsEditUserModalVisible] = useState(false)
  const [isDepositModalVisible, setIsDepositModalVisible] = useState(false)
  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false)
  const [amount, setAmount] = useState(0)
  const [pendingAmount, setPendingAmount] = useState(0)
  const [activeDepositTab, setActiveDepositTab] = useState<string>("history")
  const [withdrawAmount, setWithdrawAmount] = useState<string>("")
  const [binanceAddress, setBinanceAddress] = useState<string>("")
  const [network, setNetwork] = useState<string>("TRC20")
  const [withdrawErrors, setWithdrawErrors] = useState<{ [key: string]: string }>({})
  const [isWithdrawSubmitting, setIsWithdrawSubmitting] = useState(false)

  const router = useRouter()

  const scrollToProducts = () => {
    const productsSection = document.getElementById("products")
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: "smooth" })
      // Trigger data loading after scroll with a longer delay to ensure smooth scroll completes
      setTimeout(() => {
        // Look for the data loading button and click it automatically
        const loadDataButton = document.querySelector("[data-load-products]") as HTMLButtonElement
        if (loadDataButton && !loadDataButton.disabled) {
          loadDataButton.click()
        }
        // Alternative: look for the main container that triggers data loading
        const dataContainer = document.querySelector(".bg-gradient-to-b.from-white.to-gray-100") as HTMLElement
        if (dataContainer) {
          const clickableArea = dataContainer.querySelector(".cursor-pointer") as HTMLElement
          if (clickableArea) {
            clickableArea.click()
          }
        }
      }, 1000)
    }
  }

  const handleLogout = async () => {
    try {
      document.cookie = "userInfo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      document.cookie = "NewAccessTokenDisV1=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      document.cookie = "userInfo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict;"
      document.cookie = "NewAccessTokenDisV1=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict;"

      try {
        await authApiRequest.logout()
      } catch (logoutError) {
        console.error("Server logout failed:", logoutError)
      }

      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const handleEditInfomation = () => {
    setIsEditUserModalVisible(true)
  }

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: "smooth" })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: "smooth" })
    }
  }

  useEffect(() => {
    setUserInfo(getUserInfo())
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const ordersRef = ref(database, "orders")
        onValue(ordersRef, (snapshot) => {
          if (snapshot.exists()) {
            const ordersData = snapshot.val()
            // Convert Firebase object to array
            const ordersArray = Object.values(ordersData)

            const siteCounts: Record<string, number> = {}

            ordersArray.forEach((order: any) => {
              if (order) {
                if (order && order.Site) {
                  const site = order.Site
                  siteCounts[site] = (siteCounts[site] || 0) + 1
                }
              }
            })

            // Convert to array and sort by count
            const sortedSites = Object.entries(siteCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([site, count]) => ({ site, count }))

            setTopSites(sortedSites)
          }
          setIsLoading(false)
        })
      } catch (error) {
        console.error("Error fetching orders:", error)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Add auto-scrolling functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        // Get the current scroll position
        const currentScroll = scrollContainerRef.current.scrollLeft
        const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth

        // If we're at the end, scroll back to the beginning
        if (currentScroll >= maxScroll - 10) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: "smooth" })
        } else {
          // Otherwise, scroll right by one card width (approx 280px including margin)
          scrollContainerRef.current.scrollBy({ left: 280, behavior: "smooth" })
        }
      }
    }, 3000) // Scroll every 3 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Check Firebase for the latest balance
    if (userInfo?.username) {
      const userBalanceRef = ref(database, `money/${userInfo.username}`)
      const unsubscribe = onValue(userBalanceRef, (snapshot) => {
        if (snapshot.exists()) {
          const balanceData = snapshot.val()
          setAmount(balanceData.amount || 0)
          setPendingAmount(balanceData.pendingAmount || 0)
        } else {
          setAmount(0)
          setPendingAmount(0)
        }
      })

      return () => unsubscribe()
    }
  }, [userInfo?.username])

  const backlinkTypes = [
    {
      icon: <LinkIcon className="h-8 w-8 text-orange-500" />,
      title: "Backlink Chất Lượng Cao",
      description:
        "Liên kết từ các trang web uy tín với DA/PA cao, giúp tăng thứ hạng website của bạn một cách hiệu quả.",
    },
    {
      icon: <Globe className="h-8 w-8 text-blue-500" />,
      title: "Backlink Đa Dạng",
      description: "Đa dạng loại backlink từ nhiều nguồn khác nhau, giúp xây dựng hồ sơ liên kết tự nhiên và an toàn.",
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-green-500" />,
      title: "Backlink Bền Vững",
      description: "Các liên kết được đặt trên các trang web ổn định, đảm bảo tính bền vững và hiệu quả lâu dài.",
    },
    {
      icon: <Search className="h-8 w-8 text-purple-500" />,
      title: "Backlink Theo Ngành",
      description: "Liên kết từ các trang web cùng ngành, tăng tính liên quan và hiệu quả cho chiến dịch SEO của bạn.",
    },
    {
      icon: <Award className="h-8 w-8 text-pink-500" />,
      title: "Backlink Premium",
      description: "Dịch vụ backlink cao cấp từ các trang web uy tín hàng đầu, mang lại hiệu quả vượt trội.",
    },
  ]

  const commonTools = [
    {
      title: "Công cụ chung",
      icon: <Settings className="w-5 h-5 text-purple-600" />,
      items: [
        {
          name: "Tool Check Site",
          icon: <CheckCircle className="w-5 h-5" />,
          href: "/tool-check-site",
          color: "bg-gradient-to-r from-emerald-500 to-teal-600",
          external: true,
        },
        {
          name: "Quản Lý Sites",
          icon: <Database className="w-5 h-5" />,
          href: "/quan-ly-site",
          color: "bg-gradient-to-r from-purple-500 to-indigo-600",
          external: true,
        },
        {
          name: "Đổi Mệnh Giá",
          icon: <Wallet className="w-5 h-5" />,
          action: () => setIsConverterModalVisible(true),
          color: "bg-gradient-to-r from-rose-500 to-pink-600",
        },
        {
          name: "Check Anchor Link",
          icon: <LayoutDashboard className="w-5 h-5" />,
          href: "https://drive.google.com/drive/folders/1dhNsD1N85VBO73yCKOsg2yniJyZDHR67?usp=drive_link",
          color: "bg-gradient-to-r from-blue-500 to-indigo-600",
          external: true,
        },
      ],
    },
  ]

  const adminTools = [
    {
      title: "Quản lý hệ thống",
      icon: <Settings className="w-5 h-5 text-purple-600" />,
      items: [
        {
          name: "Quản Lý Sites",
          icon: <Database className="w-5 h-5" />,
          href: "/quan-ly-site",
          color: "bg-gradient-to-r from-purple-500 to-indigo-600",
          external: true,
        },
        {
          name: "Chấm Công",
          icon: <Clock className="w-5 h-5" />,
          href: "/cham-cong",
          color: "bg-gradient-to-r from-blue-500 to-cyan-600",
          external: true,
        },
      ],
    },
    {
      title: "Tài chính",
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      items: [
        {
          name: "Quản Lý Thu Nhập",
          icon: <DollarSign className="w-5 h-5" />,
          href: "/quan-ly-thu-nhap",
          color: "bg-gradient-to-r from-amber-500 to-orange-600",
          external: true,
        },
        {
          name: userInfo?.role === "NCC" ? "Rút tiền" : "Nạp tiền",
          icon: <Wallet className="w-5 h-5" />,
          action: () => (userInfo?.role === "NCC" ? setIsWithdrawModalVisible(true) : setIsDepositModalVisible(true)),
          color: "bg-gradient-to-r from-green-500 to-emerald-600",
        },
      ],
    },
    {
      title: "Quản lý",
      icon: <Settings className="w-5 h-5 text-purple-600" />,
      items: [
        {
          name: "Quản Lý Khách Hàng",
          icon: <Users className="w-5 h-5" />,
          href: "/quan-ly-khach-hang",
          color: "bg-gradient-to-r from-purple-500 to-orange-600",
          external: true,
        },
      ],
    },
  ]

  const adminSpecificTools = [
    {
      name: "Quản Lý Tài Khoản",
      icon: <UserPlus className="w-5 h-5" />,
      href: "/quan-ly-tai-khoan",
      color: "bg-gradient-to-r from-pink-500 to-purple-600",
      description: "Quản lý người dùng và phân quyền",
    },
    {
      name: "Quản Lý Nạp Rút",
      icon: <Inbox className="w-5 h-5" />,
      href: "/quan-ly-nap-rut",
      color: "bg-gradient-to-r from-yellow-500 to-green-600",
      description: "Quản lý nạp tiền và rút tiền",
    },
    {
      name: "Quản Lý Số Dư",
      icon: <Wallet2 className="w-5 h-5" />,
      href: "/quan-ly-so-du",
      color: "bg-gradient-to-r from-red-500 to-blue-600",
      description: "Quản lý số dư của người dùng",
    },
  ]

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50 pt-16 pb-12">
      <PageIllustration />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Hero content */}
        <div className="flex flex-col mb-16">
          <div className="flex flex-col md:flex-row items-start justify-between mb-16">
            <div className="md:max-w-2xl mb-10 md:mb-0">
              <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-8 tracking-tight leading-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-pink-600">
                  You Link
                </span>{" "}
                <br />
                <span className="text-4xl md:text-5xl">Giải pháp Backlink</span>
                <br />
                <span className="text-3xl md:text-4xl text-gray-700">chất lượng cao</span>
              </h1>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                Nâng cao thứ hạng website của bạn với dịch vụ backlink chất lượng cao, đa dạng và hiệu quả từ các trang
                web uy tín
              </p>

              <div className="flex flex-col sm:flex-row gap-6 text-sm mb-12">
                <button
                  onClick={scrollToProducts}
                  className="group inline-flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-semibold rounded-full px-10 py-4 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                >
                  <ShoppingBag className="w-6 h-6" />
                  Khám phá sản phẩm của chúng tôi
                  <ArrowRight className="w-5 h-5 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>

              <div className="mt-3 max-w-fit">
                <h4 className="text-lg font-semibold text-left mb-2 bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-pink-600">
                  Kiểm tra đơn hàng của bạn
                </h4>
                <div className="flex flex-row flex-wrap gap-3 justify-start">
                  <Link
                    target="_blank"
                    href="/gp-text"
                    className="group inline-flex items-center justify-center gap-3 bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 text-sm font-semibold rounded-xl px-7 py-3 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <FileText className="w-5 h-5 text-blue-700" />
                    Đơn hàng GP - Text
                    <ArrowRight className="w-4 h-4 ml-1 text-blue-700 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>

                  <Link
                    target="_blank"
                    href="/content"
                    className="group inline-flex items-center justify-center gap-3 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 text-sm font-semibold rounded-xl px-7 py-3 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <LayoutDashboard className="w-5 h-5 text-emerald-700" />
                    Đơn hàng Content
                    <ArrowRight className="w-4 h-4 ml-1 text-emerald-700 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 w-full md:w-96 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Thống kê dịch vụ</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Backlink đã bán</span>
                  <span className="font-bold text-gray-900 text-lg">10,000+</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-pink-600 w-[85%] rounded-full"></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Khách hàng hài lòng</span>
                  <span className="font-bold text-gray-900 text-lg">98%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-pink-600 w-[98%] rounded-full"></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Tỷ lệ thành công</span>
                  <span className="font-bold text-gray-900 text-lg">95%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-pink-600 w-[95%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Top 10 Sites */}
          {topSites.length > 0 && (
            <div className="w-full mb-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Top 10 Site Được Order Nhiều Nhất</h3>
                  <p className="text-gray-600">Các trang web được khách hàng tin tưởng và lựa chọn nhiều nhất</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={scrollLeft}
                    className="p-3 rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={scrollRight}
                    className="p-3 rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="relative">
                <div
                  ref={scrollContainerRef}
                  className="overflow-x-auto pb-4"
                  style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  <style jsx>{`
                  div::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                  <div className="flex space-x-6 min-w-max px-2">
                    {isLoading ? (
                      <div className="flex items-center justify-center w-full py-8 min-w-[800px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        <span className="ml-3 text-gray-500">Đang tải dữ liệu...</span>
                      </div>
                    ) : topSites.length > 0 ? (
                      topSites.map(({ site, count }, index) => (
                        <div
                          key={index}
                          className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col min-w-[280px] max-w-[280px] overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 group"
                        >
                          <div className="bg-gradient-to-r from-orange-500 to-pink-600 h-3"></div>
                          <div className="p-6">
                            <div className="flex items-center">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-100 to-pink-100 flex items-center justify-center mr-4 group-hover:from-orange-500 group-hover:to-pink-600 transition-colors duration-300">
                                <span className="font-bold text-lg text-orange-600 group-hover:text-white">
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-800 truncate text-lg">{site}</h4>
                                <p className="text-sm text-gray-500 font-medium">Số lượng: {count}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center w-full py-8 min-w-[800px]">
                        <span className="text-gray-500">Không có dữ liệu</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backlink types */}
          <div className="pb-6 md:pb-16">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Dịch vụ Backlink đa dạng</h3>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Chúng tôi cung cấp đầy đủ các loại backlink chất lượng cao để đáp ứng mọi nhu cầu SEO của bạn
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
              {backlinkTypes.map((item, index) => (
                <div
                  key={index}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 p-8 hover:scale-105 hover:-translate-y-2"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-gray-50 p-6 rounded-2xl mb-6 group-hover:bg-gradient-to-r group-hover:from-orange-50 group-hover:to-pink-50 transition-colors duration-300">
                      {item.icon}
                    </div>
                    <h4 className="font-bold text-gray-900 mb-3 text-lg">{item.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DepositModal
        isVisible={isDepositModalVisible}
        onClose={() => setIsDepositModalVisible(false)}
        username={userInfo?.username}
      />

      <WithdrawModal
        isVisible={isWithdrawModalVisible}
        onClose={() => setIsWithdrawModalVisible(false)}
        username={userInfo?.username}
        currentBalance={amount}
        pendingAmount={pendingAmount}
      />

      <CurrencyConverterModal isVisible={isConverterModalVisible} onClose={() => setIsConverterModalVisible(false)} />
    </section>
  )
}
