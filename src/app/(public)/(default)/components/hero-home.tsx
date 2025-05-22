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
  User,
} from "lucide-react"
import { database, onValue, ref } from "@/app/firebase/firebase"

export default function HeroHome() {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isConverterModalVisible, setIsConverterModalVisible] = useState(false)
  const [topSites, setTopSites] = useState<{ site: string; count: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    setUserInfo(getUserInfo())
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const ordersRef = ref(database, 'orders')
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
        console.error('Error fetching orders:', error)
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
        const currentScroll = scrollContainerRef.current.scrollLeft;
        const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;

        // If we're at the end, scroll back to the beginning
        if (currentScroll >= maxScroll - 10) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Otherwise, scroll right by one card width (approx 280px including margin)
          scrollContainerRef.current.scrollBy({ left: 280, behavior: 'smooth' });
        }
      }
    }, 3000); // Scroll every 3 seconds

    return () => clearInterval(interval);
  }, []);

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
                  href="/mua-ban"
                  target="_blank"
                  className="group inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-medium rounded-full px-8 py-3.5 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Mua bán
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/tool-check"
                  target="_blank"
                  className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-full px-8 py-3.5 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Globe className="w-5 h-5" />
                  Check site
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

            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 md:w-96">
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
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
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

          {/* Admin and Staff tools */}
          {(userInfo?.role === "Admin" || userInfo?.role === "Nhân viên" || userInfo?.role === "NCC") && (
            <div className="mb-16">
              <h3 className="text-center text-sm font-medium text-gray-500 uppercase tracking-wider mb-6">
                Công cụ quản lý
              </h3>
              <div className="flex justify-center gap-6 flex-wrap">
                <Link
                  target="_blank"
                  href="/sites"
                  className="inline-flex items-center gap-3 px-6 py-3 text-base bg-white border border-gray-200 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  <Database className="w-5 h-5 text-blue-500" />
                  Quản Lý Sites
                </Link>
                {(userInfo?.role === "Admin" || userInfo?.role === "Nhân viên") && (
                  <>
                    <Link
                      href="/quan-ly-tai-khoan"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-6 py-3 text-base bg-white border border-gray-200 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                      <User className="w-5 h-5 text-emerald-500" />
                      Quản Lý Tài Khoản
                      <ExternalLink className="w-4 h-4 ml-1 text-gray-400" />
                    </Link>
                    <Link
                      href="/tool-check"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-6 py-3 text-base bg-white border border-gray-200 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      Tool Check Site
                      <ExternalLink className="w-4 h-4 ml-1 text-gray-400" />
                    </Link>
                    <Link
                      href="/cham-cong"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-6 py-3 text-base bg-white border border-gray-200 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                      <Clock className="w-5 h-5 text-emerald-500" />
                      Chấm Công
                      <ExternalLink className="w-4 h-4 ml-1 text-gray-400" />
                    </Link>
                    <Link
                      href="/money"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-6 py-3 text-base bg-white border border-gray-200 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                      <DollarSign className="w-5 h-5 text-amber-500" />
                      Thu Nhập
                      <ExternalLink className="w-4 h-4 ml-1 text-gray-400" />
                    </Link>
                    <button
                      onClick={() => setIsConverterModalVisible(true)}
                      className="inline-flex items-center gap-3 px-6 py-3 text-base bg-white border border-gray-200 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                      <DollarSign className="w-5 h-5 text-amber-500" />
                      Đổi Mệnh Giá
                    </button>
                    <CurrencyConverterModal
                      isVisible={isConverterModalVisible}
                      onClose={() => setIsConverterModalVisible(false)}
                    />
                    <Link
                      href="https://drive.google.com/drive/folders/1dhNsD1N85VBO73yCKOsg2yniJyZDHR67?usp=drive_link"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-6 py-3 text-base bg-white border border-gray-200 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                      <LayoutDashboard className="w-5 h-5 text-blue-500" />
                      Check Anchor Link
                      <ExternalLink className="w-4 h-4 ml-1 text-gray-400" />
                    </Link>
                  </>
                )}
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
    </section>
  );
}
