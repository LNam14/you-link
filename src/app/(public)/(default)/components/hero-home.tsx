"use client"

import { useState, useEffect, useRef } from "react"
import getUserInfo from "@/components/userInfo"
import Link from "next/link"
import PageIllustration from "./page-illustration"
import CurrencyConverterModal from "@/components/CurrencyConverterModal"
import {
  ShoppingBag,
  ExternalLink,
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
  BarChart4,
  Shield,
  Inbox,
  Wallet2,
  UserPlus,
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

  const handleLogout = async () => {
    try {
      document.cookie = "userInfo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      document.cookie = "userInfo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict;"
      document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict;"

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

  // Common tools configuration - visible to all users
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

  // Admin tools configuration
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
  ]

  // Admin specific tools
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
    {
      name: "Quản Lý Khách Hàng",
      icon: <Users className="w-5 h-5" />,
      href: "/quan-ly-khach-hang",
      color: "bg-gradient-to-r from-purple-500 to-orange-600",
      description: "Quản lý khách hàng",
    },

  ]

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50 pt-16 pb-12">
      <PageIllustration />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Hero content */}
        <div className="flex flex-col mb-16">
          <div className="flex flex-col md:flex-row items-start justify-between mb-12">
            <div className="md:max-w-xl mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-pink-600">
                  You Link
                </span>{" "}
                - Giải pháp Backlink chất lượng cao
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Nâng cao thứ hạng website của bạn với dịch vụ backlink chất lượng cao, đa dạng và hiệu quả
              </p>
              <div className="flex gap-4 text-sm">
                <Link
                  href="/gp-text"
                  target="_blank"
                  className="group inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-medium rounded-full px-8 py-3.5 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <ShoppingBag className="w-5 h-5" />
                  GP - Text
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/content"
                  target="_blank"
                  className="group inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-medium rounded-full px-8 py-3.5 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Content
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 w-full md:w-96">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê dịch vụ</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Backlink đã bán</span>
                  <span className="font-medium text-gray-900">10,000+</span>
                </div>
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-pink-600 w-[85%]"></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Khách hàng hài lòng</span>
                  <span className="font-medium text-gray-900">98%</span>
                </div>
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-pink-600 w-[98%]"></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tỷ lệ thành công</span>
                  <span className="font-medium text-gray-900">95%</span>
                </div>
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-pink-600 w-[95%]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Top 10 Sites */}
          <div className="w-full mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Top 10 Site Được Order Nhiều Nhất</h3>
              <div className="flex space-x-2">
                <button
                  onClick={scrollLeft}
                  className="p-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={scrollRight}
                  className="p-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
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
                        className="bg-white rounded-xl shadow-md border border-gray-100 flex flex-col min-w-[250px] max-w-[250px] overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-105 group"
                      >
                        <div className="bg-gradient-to-r from-orange-500 to-pink-600 h-2"></div>
                        <div className="p-5">
                          <div className="flex items-center">
                            <div className="w-10 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-3 group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-pink-600 transition-colors duration-300">
                              <span className="font-bold text-gray-600 group-hover:text-white">{index + 1}</span>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-800 truncate">{site}</h4>
                              <p className="text-sm text-gray-500">Số lượng: {count}</p>
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

          {/* Common tools - visible to all users */}
          {userInfo && (
            <div className="mb-16 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-8 text-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                  CÔNG CỤ CHUNG
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                {commonTools.map((section, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-6 shadow-md">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-white shadow-sm">{section.icon}</div>
                      <h4 className="font-semibold text-gray-800">{section.title}</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {section.items.map((tool, toolIdx) =>
                        tool.href ? (
                          <Link
                            key={toolIdx}
                            href={tool.href}
                            target={tool.external ? "_blank" : undefined}
                            rel={tool.external ? "noopener noreferrer" : undefined}
                            className="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-100 shadow-sm hover:shadow transition-all duration-200 group"
                          >
                            <div className={`${tool.color} text-white p-2 rounded-lg shadow-sm`}>{tool.icon}</div>
                            <span className="font-medium text-gray-700 group-hover:text-gray-900">{tool.name}</span>
                            {tool.external && <ExternalLink className="w-3.5 h-3.5 ml-auto text-gray-400" />}
                          </Link>
                        ) : (
                          <button
                            key={toolIdx}
                            onClick={tool.action}
                            className="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-100 shadow-sm hover:shadow transition-all duration-200 group"
                          >
                            <div className={`${tool.color} text-white p-2 rounded-lg shadow-sm`}>{tool.icon}</div>
                            <span className="font-medium text-gray-700 group-hover:text-gray-900">{tool.name}</span>
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin and Staff tools - REDESIGNED */}
          {(userInfo?.role === "Admin" || userInfo?.role === "Nhân viên") && (
            <div className="mb-16 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-8 text-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                  CÔNG CỤ QUẢN LÝ
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {adminTools.map((section, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-6 shadow-md">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-white shadow-sm">{section.icon}</div>
                      <h4 className="font-semibold text-gray-800">{section.title}</h4>
                    </div>

                    <div className="space-y-3">
                      {section.items.map((tool, toolIdx) =>
                        tool.href ? (
                          <Link
                            key={toolIdx}
                            href={tool.href}
                            target={tool.external ? "_blank" : undefined}
                            rel={tool.external ? "noopener noreferrer" : undefined}
                            className="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-100 shadow-sm hover:shadow transition-all duration-200 group"
                          >
                            <div className={`${tool.color} text-white p-2 rounded-lg shadow-sm`}>{tool.icon}</div>
                            <span className="font-medium text-gray-700 group-hover:text-gray-900">{tool.name}</span>
                            {tool.external && <ExternalLink className="w-3.5 h-3.5 ml-auto text-gray-400" />}
                          </Link>
                        ) : (
                          <button
                            key={toolIdx}
                            onClick={tool.action}
                            className="w-full flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-100 shadow-sm hover:shadow transition-all duration-200 group"
                          >
                            <div className={`${tool.color} text-white p-2 rounded-lg shadow-sm`}>{tool.icon}</div>
                            <span className="font-medium text-gray-700 group-hover:text-gray-900">{tool.name}</span>
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin specific tools - REDESIGNED */}
          {userInfo?.role === "Admin" && (
            <div className="mb-16 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl shadow-xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-8 text-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                  DÀNH CHO ADMIN
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {adminSpecificTools.map((tool, idx) => (
                  <Link
                    key={idx}
                    href={tool.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className={`${tool.color} h-2 w-full`}></div>
                    <div className="p-6 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`${tool.color} bg-opacity-10 p-3 rounded-lg`}>{tool.icon}</div>
                        <h4 className="font-semibold text-gray-800">{tool.name}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{tool.description}</p>
                      <div className="mt-auto flex items-center text-sm font-medium text-gray-600 group-hover:text-gray-900">
                        <span>Truy cập</span>
                        <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Backlink types */}
          <div className="pb-6 md:pb-16">
            <h3 className="text-center text-lg font-semibold text-gray-800 mb-8">Dịch vụ Backlink đa dạng</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {backlinkTypes.map((item, index) => (
                <div
                  key={index}
                  className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-100 p-6 hover:scale-[1.03]"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-gray-50 p-4 rounded-full mb-4 group-hover:bg-gradient-to-r group-hover:from-orange-50 group-hover:to-pink-50 transition-colors duration-300">
                      {item.icon}
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                    <p className="text-sm text-gray-600">{item.description}</p>
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
