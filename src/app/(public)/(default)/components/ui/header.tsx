"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useResponsive from "@/hook/useResponsive"
import MenuAvatar from "@/components/menu"
import getUserInfo from "@/components/userInfo"
import authApiRequest from "@/apiRequests/auth"

export default function Header() {
  const { isMobile } = useResponsive()
  const [showHeader, setShowHeader] = useState(true)
  const [lastScrollTop, setLastScrollTop] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  const router = useRouter()

  // Function to check authentication status
  const checkAuth = useCallback(async () => {
    try {
      const user = getUserInfo()
      setUserInfo(user)

      // If no user info is found, ensure we're properly logged out
      if (!user) {
        // Clear any remaining cookies just to be safe
        document.cookie = "userInfo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
        document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      }
    } catch (error) {
      console.error("Auth check error:", error)
      setUserInfo(null)
    } finally {
      setAuthChecked(true)
    }
  }, [])

  // Check auth on mount and set up interval to check periodically
  useEffect(() => {
    setIsMounted(true)
    checkAuth()

    // Set up an interval to check auth status every 30 seconds
    const authInterval = setInterval(() => {
      checkAuth()
    }, 30000)

    return () => {
      clearInterval(authInterval)
    }
  }, [checkAuth])

  // Listen for storage events to detect logout from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "logout" || e.key === "login") {
        checkAuth()
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [checkAuth])

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
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [lastScrollTop, isMobileMenuOpen])

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

  const [loading, setLoading] = useState(false)
  const handleLogout = async () => {
    try {
      setLoading(true)
      await authApiRequest.logout()

      // Clear cookies on client side
      document.cookie = "userInfo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

      // Notify other tabs about logout
      localStorage.setItem("logout", Date.now().toString())

      // Update state immediately
      setUserInfo(null)

      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <header
      className={`md:px-0 top-0 left-0 w-full bg-white z-30 transition-transform duration-300 ${showHeader ? "translate-y-0" : "-translate-y-16"
        } sticky shadow-lg`}
    >
      <div className="mx-auto max-w-7xl">
        <div className="relative flex h-16 items-center justify-between gap-3 bg-white/90 backdrop-blur-sm px-4 sm:px-6">
          <div className="flex flex-1 items-center">
            <Link href="/" className="flex items-center space-x-1 text-4xl font-bold group">
              {/* Chữ "You" */}
              <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300 group-hover:drop-shadow-lg">
                You
              </span>

              {/* Biểu tượng Link */}
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
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-=20-1.72-1.71" />
                </svg>
              </span>

              {/* Chữ "Link" */}
              <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300 group-hover:drop-shadow-lg">
                Link
              </span>
            </Link>

          </div>

          {isMobile && (
            <button
              className="block md:hidden text-gray-800 focus:outline-none"
              aria-label="Toggle mobile menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          )}

          <nav
            className={`md:flex sm:p-3 p-2 flex-col rounded-b-xl md:flex-row md:space-x-1 md:space-y-0 space-y-4 absolute md:static top-16 left-0 w-full md:w-auto bg-white md:bg-transparent transition-all duration-300 ease-in-out ${isMobileMenuOpen ? "block shadow-lg" : "hidden"
              }`}
          >
            {userInfo && (
              <div className="md:hidden font-semibold mb-4">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                    {userInfo?.name?.charAt(2) || "U"}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{userInfo.name}</p>
                    <p className="text-xs text-gray-500">{getRoleName(userInfo.role)}</p>
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
            {!userInfo && (
              <div className="flex md:hidden flex-col space-y-2 mb-4">
                <Link
                  href="/login"
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-pink-600 rounded-lg hover:from-orange-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors duration-200"
                >
                  Đăng ký
                </Link>
              </div>
            )}
            <NavItem href="#">Giới thiệu</NavItem>
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
          </nav>

          {userInfo ? (
            <div className="hidden md:flex flex-1 items-center justify-end">
              <MenuAvatar userInfo={userInfo} />
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-end space-x-4">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-pink-600 rounded-lg hover:from-orange-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors duration-200"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
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

