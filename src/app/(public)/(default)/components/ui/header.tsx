"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useResponsive from "@/hook/useResponsive"
import getUserInfo from "@/components/userInfo"
import authApiRequest from "@/apiRequests/auth"
import { ref, onValue } from "firebase/database"
import { database } from "@/app/firebase/firebase"
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Database,
  CheckCircle,
  Clock,
  DollarSign,
  Wallet,
  Settings,
  Users,
  BarChart3,
  Shield,
  ExternalLink,
  Inbox,
  Wallet2,
} from "lucide-react"
import DepositModal from "@/app/(public)/(default)/components/DepositModal"
import WithdrawModal from "@/app/(public)/(default)/components/WithdrawModal"

export default function Header() {
  const { isMobile } = useResponsive()
  const [showHeader, setShowHeader] = useState(true)
  const [lastScrollTop, setLastScrollTop] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState(0)
  const [pendingAmount, setPendingAmount] = useState(0)

  // State for modals
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)

  const router = useRouter()

  // Function to check authentication status
  const checkAuth = useCallback(async () => {
    try {
      const user = getUserInfo()
      setUserInfo(user)

      if (!user) {
        document.cookie = "userInfo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
        document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      }
    } catch (error) {
      console.error("Auth check error:", error)
      setUserInfo(null)
    }
  }, [])

  // Listen for wallet balance changes
  useEffect(() => {
    if (userInfo?.username) {
      const userBalanceRef = ref(database, `money/${userInfo.username}`)
      const unsubscribe = onValue(userBalanceRef, (snapshot) => {
        if (snapshot.exists()) {
          const balanceData = snapshot.val()
          setAmount(balanceData.amount)
          setPendingAmount(balanceData.pendingAmount || 0)
        } else {
          setAmount(0)
        }
      })

      return () => unsubscribe()
    }
  }, [userInfo?.username])

  // Check auth on mount and set up interval to check periodically
  useEffect(() => {
    setIsMounted(true)
    checkAuth()

    const authInterval = setInterval(checkAuth, 30000)
    return () => clearInterval(authInterval)
  }, [checkAuth])

  // Listen for storage events to detect logout from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "logout" || e.key === "login") {
        checkAuth()
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [checkAuth])

  // Handle scroll behavior for header visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop
      if (currentScrollTop > lastScrollTop) {
        setShowHeader(false)
        if (isMobileMenuOpen) setIsMobileMenuOpen(false)
      } else {
        setShowHeader(true)
      }
      setLastScrollTop(currentScrollTop <= 0 ? 0 : currentScrollTop)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollTop, isMobileMenuOpen])

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("sidebar")
      if (sidebar && !sidebar.contains(event.target as Node) && isSidebarOpen) {
        setIsSidebarOpen(false)
      }
    }

    if (isSidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isSidebarOpen])

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? "hidden" : "auto"
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isSidebarOpen])

  const getRoleName = (role: string) => {
    switch (role) {
      case "Admin":
        return "Admin"
      case "Nhân viên":
        return "Nhân viên"
      case "Khách hàng":
        return "Khách hàng"
      default:
        return "Nhà cung cấp"
    }
  }

  const handleLogout = async () => {
    try {
      setLoading(true)
      await authApiRequest.logout()

      // Clear cookies on client side
      document.cookie = "userInfo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

      // Notify other tabs about logout
      localStorage.setItem("logout", Date.now().toString())
      setUserInfo(null)
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setLoading(false)
    }
  }

  // Admin tools configuration
  let adminTools = [
    {
      name: "Nạp tiền",
      icon: <Wallet className="w-4 h-4" />,
      href: "/deposit",
      color: "bg-gradient-to-r from-green-500 to-emerald-600",
    },
    {
      name: "Quản Lý Sites",
      icon: <Database className="w-4 h-4" />,
      href: "/quan-ly-site",
      color: "bg-gradient-to-r from-purple-500 to-indigo-600",
    },
    {
      name: "Tool Check Site",
      icon: <CheckCircle className="w-4 h-4" />,
      href: "/tool-check-site",
      color: "bg-gradient-to-r from-emerald-500 to-teal-600",
    },
    {
      name: "Chấm Công",
      icon: <Clock className="w-4 h-4" />,
      href: "/cham-cong",
      color: "bg-gradient-to-r from-blue-500 to-cyan-600",
    },
    {
      name: "Quản Lý Thu Nhập",
      icon: <DollarSign className="w-4 h-4" />,
      href: "/quan-ly-thu-nhap",
      color: "bg-gradient-to-r from-amber-500 to-orange-600",
    },
    {
      name: "Đổi Mệnh Giá",
      icon: <Wallet className="w-4 h-4" />,
      href: "/currency-converter",
      color: "bg-gradient-to-r from-rose-500 to-pink-600",
    },
    {
      name: "Check Anchor Link",
      icon: <LayoutDashboard className="w-4 h-4" />,
      href: "https://drive.google.com/drive/folders/1dhNsD1N85VBO73yCKOsg2yniJyZDHR67?usp=drive_link",
      color: "bg-gradient-to-r from-blue-500 to-indigo-600",
    },
  ]

  // Filter tools for NCC and Khách hàng
  if (userInfo?.role === "NCC") {
    adminTools = [
      {
        name: "Rút tiền",
        icon: <Wallet className="w-4 h-4" />,
        href: "/withdraw",
        color: "bg-gradient-to-r from-green-500 to-emerald-600",
      },
    ]
  } else if (userInfo?.role === "Khách hàng") {
    adminTools = [
      {
        name: "Nạp tiền",
        icon: <Wallet className="w-4 h-4" />,
        href: "/deposit",
        color: "bg-gradient-to-r from-green-500 to-emerald-600",
      },
      {
        name: "Rút tiền",
        icon: <Wallet className="w-4 h-4" />,
        href: "/withdraw",
        color: "bg-gradient-to-r from-pink-500 to-red-500",
      },
    ]
  }

  // Ẩn nút Nạp tiền cho Admin
  if (userInfo?.role === "Admin") {
    adminTools = adminTools.filter(tool => tool.name !== "Nạp tiền")
  }

  // Admin specific tools
  const adminSpecificTools = [
    {
      name: "Quản Lý Tài Khoản",
      icon: <Users className="w-5 h-5" />,
      href: "/quan-ly-tai-khoan",
      color: "bg-gradient-to-r from-violet-500 to-purple-600",
    },
    {
      name: "Quản Lý Nạp Rút",
      icon: <Inbox className="w-5 h-5" />,
      href: "/quan-ly-nap-rut",
      color: "bg-gradient-to-r from-emerald-500 to-green-600",
    },
    {
      name: "Quản Lý Số Dư",
      icon: <Wallet2 className="w-5 h-5" />,
      href: "/quan-ly-so-du",
      color: "bg-gradient-to-r from-red-500 to-blue-600"
    }
  ]

  if (!isMounted) return null

  return (
    <>
      {/* Header */}
      <header
        className={`fixed top-0 left-0 w-full bg-white z-30 transition-transform duration-300 ${showHeader ? "translate-y-0" : "-translate-y-16"
          } shadow-lg`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="relative flex h-16 items-center justify-between bg-white/90 backdrop-blur-sm px-4 sm:px-6">
            {/* Logo - Fixed width */}
            <div className="flex items-center w-[200px]">
              <Link href="/" className="flex items-center space-x-1 text-4xl font-bold group">
                <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300 group-hover:drop-shadow-lg">
                  You
                </span>
                <span className="relative flex items-center justify-center w-8 h-8">
                  <svg
                    className="w-6 h-6 text-gray-900 transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </span>
                <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300 group-hover:drop-shadow-lg">
                  Link
                </span>
              </Link>
            </div>

            {/* Navigation Menu - Centered */}
            <nav
              className={`hidden md:flex md:items-center md:justify-center flex-1 ${isMobileMenuOpen ? "block shadow-lg" : "hidden"
                }`}
            >
              <div className="flex flex-row space-x-1">
                {/* Navigation Links */}
                <NavItem href="#">Giới thiệu</NavItem>

                {/* Dropdown Menu */}
                <div className="relative group">
                  <NavItem href="#">Hướng dẫn sử dụng</NavItem>
                  <div className="absolute left-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                      <DropdownItem href="/guide/getting-started">Chấm công</DropdownItem>
                      <DropdownItem href="/guide/features">Tính năng</DropdownItem>
                      <DropdownItem href="/guide/faq">Câu hỏi thường gặp</DropdownItem>
                    </div>
                  </div>
                </div>

                <NavItem href="/#">Thông báo</NavItem>
                <NavItem href="/#">Kinh nghiệm SEO</NavItem>
                <NavItem href="/#">Kinh nghiệm Marketing</NavItem>
                <NavItem href="/#">Top SEO</NavItem>
              </div>
            </nav>

            {/* Mobile Navigation Menu */}
            <div
              className={`md:hidden absolute top-16 left-0 w-full bg-white transition-all duration-300 ease-in-out z-20 ${isMobileMenuOpen ? "block shadow-lg" : "hidden"
                }`}
            >
              <div className="flex flex-col p-4 space-y-2">
                {/* Mobile User Info */}
                {userInfo && (
                  <div className="font-semibold mb-4">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                        {userInfo?.name?.charAt(0) || userInfo?.username?.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{userInfo?.name || userInfo?.username}</p>
                        <p className="text-xs text-gray-500">{getRoleName(userInfo?.role)}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      disabled={loading}
                      className={`w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-pink-600 rounded-lg hover:from-orange-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors duration-200 ${loading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                    >
                      {loading ? "Đang đăng xuất..." : "Đăng xuất"}
                    </button>
                  </div>
                )}

                {/* Mobile Auth Buttons */}
                {!userInfo && (
                  <div className="flex flex-col space-y-2 mb-4">
                    <Link
                      href="/login"
                      className="w-full px-2 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      href="/register"
                      className="w-full px-2 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-pink-600 rounded-lg hover:from-orange-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors duration-200"
                    >
                      Đăng ký
                    </Link>
                  </div>
                )}

                {/* Navigation Links */}
                <NavItem href="#">Giới thiệu</NavItem>
                <NavItem href="#">Hướng dẫn sử dụng</NavItem>
                <NavItem href="/#">Thông báo</NavItem>
                <NavItem href="/#">Kinh nghiệm SEO</NavItem>
                <NavItem href="/#">Kinh nghiệm Marketing</NavItem>
                <NavItem href="/#">Top SEO</NavItem>
              </div>
            </div>

            {/* Right Side - User Info & Buttons - Fixed width */}
            <div className="flex items-center justify-end w-[200px] gap-3">
              {/* Desktop User Info */}
              {userInfo ? (
                <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-sm font-medium text-gray-800">{userInfo?.name || userInfo?.username}</span>
                  <span className="text-xs text-gray-500">{getRoleName(userInfo?.role)}</span>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-3">
                  <Link
                    href="/login"
                    className="px-2 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    className="px-2 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-pink-600 rounded-lg hover:from-orange-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors duration-200"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}

              {/* Sidebar Toggle Button */}
              {userInfo && (
                <button
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none"
                  aria-label="Toggle sidebar menu"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              {/* Mobile Menu Toggle - Only show when no user is logged in */}
              {isMobile && !userInfo && (
                <button
                  className="block md:hidden text-gray-800 focus:outline-none"
                  aria-label="Toggle mobile menu"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 6h16M4 12h16M4 18h16"
                      ></path>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setIsSidebarOpen(false)}
      >
        {/* Sidebar Content */}
        <div
          id="sidebar"
          className={`fixed top-0 right-0 h-full w-full sm:w-96 md:w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out overflow-hidden ${isSidebarOpen ? "translate-x-0" : "translate-x-full"
            }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              Menu
            </h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Content - Scrollable Area */}
          <div className="h-[calc(100%-64px)] overflow-y-auto">
            <div className="p-4">
              {userInfo && (
                <div className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {userInfo?.username?.charAt(0) || "U"}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{userInfo?.name || userInfo?.username}</p>
                      <p className="text-sm text-gray-500 flex items-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                        {getRoleName(userInfo?.role)}
                      </p>
                    </div>
                  </div>

                  {/* Balance Information */}
                  {(userInfo?.role === "Khách hàng" || userInfo?.role === "NCC" || userInfo?.role === "Nhân viên") && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-600 mb-3">Thông tin tài khoản</h4>
                      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 shadow-sm p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">Số dư hiện tại</span>
                          <div className="flex items-center bg-emerald-50 px-2 py-1 rounded-lg">
                            <span className="text-base font-bold text-emerald-600">
                              {Number(amount || 0).toFixed(2)}
                            </span>
                            <DollarSign className="w-4 h-4 text-emerald-600 ml-0.5" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col p-3 bg-white rounded-lg shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
                            <span className="text-xs text-gray-500 mb-1">Tiền treo</span>
                            <div className="flex items-center">
                              <span className="text-sm font-semibold text-amber-600">
                                {Number(pendingAmount || 0).toFixed(2)}
                              </span>
                              <DollarSign className="w-3 h-3 text-amber-600 ml-0.5" />
                            </div>
                          </div>
                          <div className="flex flex-col p-3 bg-white rounded-lg shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
                            <span className="text-xs text-gray-500 mb-1">Có thể dùng</span>
                            <div className="flex items-center">
                              <span className="text-sm font-semibold text-blue-600">
                                {Number((amount || 0) - (pendingAmount || 0)).toFixed(2)}
                              </span>
                              <DollarSign className="w-3 h-3 text-blue-600 ml-0.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin and Staff tools */}
              {(userInfo?.role === "Admin" || userInfo?.role === "Nhân viên" || userInfo?.role === "NCC" || userInfo?.role === "Khách hàng") && (
                <div className="mb-6">
                  <h3 className="text-xs font-medium text-gray-500 mb-3 px-2 uppercase tracking-wider">Công cụ</h3>
                  <div className="space-y-2">
                    {adminTools.map((tool, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (tool.name === "Nạp tiền") setIsDepositModalOpen(true)
                          else if (tool.name === "Rút tiền") setIsWithdrawModalOpen(true)
                          else window.open(tool.href, tool.href.startsWith("http") ? "_blank" : undefined)
                        }}
                        className="flex items-center gap-3 w-full text-left p-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-100 shadow-sm hover:shadow transition-all duration-200 group"
                        type="button"
                      >
                        <div className={`${tool.color} text-white p-2 rounded-lg shadow-sm`}>{tool.icon}</div>
                        <span className="font-medium text-xs text-gray-700 group-hover:text-gray-900">{tool.name}</span>
                        {tool.href.startsWith("http") && (
                          <ExternalLink className="w-3.5 h-3.5 ml-auto text-gray-400 group-hover:text-gray-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin specific tools */}
              {userInfo?.role === "Admin" && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3 px-2 uppercase tracking-wider">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                      Dành cho Admin
                    </span>
                  </h3>

                  <div className="space-y-2">
                    {adminSpecificTools.map((tool, idx) => (
                      <Link
                        key={idx}
                        href={tool.href}
                        target="_blank"
                        className="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-100 shadow-sm hover:shadow transition-all duration-200 group"
                      >
                        <div className={`${tool.color} text-white p-2 rounded-lg shadow-sm`}>{tool.icon}</div>
                        <span className="font-medium text-xs text-gray-700 group-hover:text-gray-900">{tool.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Logout button */}
              {userInfo && (
                <div className="mt-8 sticky bottom-4">
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className={`w-full text-sm flex items-center justify-center gap-2 px-4 py-3 font-medium text-white bg-gradient-to-r from-orange-500 to-pink-600 rounded-xl hover:from-orange-600 hover:to-pink-700 transition-colors duration-200 shadow-md hover:shadow-lg ${loading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                  >
                    <LogOut className="w-5 h-5" />
                    {loading ? "Đang đăng xuất..." : "Đăng xuất"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DepositModal
        isVisible={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        username={userInfo?.username}
      />
      <WithdrawModal
        isVisible={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        username={userInfo?.username}
        currentBalance={amount}
        pendingAmount={pendingAmount}
      />

      {/* Spacer to prevent content from being hidden under fixed header */}
      <div className="h-16"></div>
    </>
  )
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
    >
      {children}
    </Link>
  )
}

function DropdownItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
      role="menuitem"
    >
      {children}
    </Link>
  )
}
