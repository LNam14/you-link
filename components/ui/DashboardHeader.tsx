"use client";

import { Menu, X, RefreshCw, Globe, DollarSign, Coins, CreditCard, User } from "lucide-react";
import Link from "next/link";
import { useHeader } from "@/app/(dashboard)/contexts/HeaderContext";

interface DashboardHeaderProps {
  user?: any;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function DashboardHeader({
  user,
  isSidebarOpen,
  onToggleSidebar,
}: DashboardHeaderProps) {
  const { title, subTitle, tabs, activeTab, onTabChange, refreshButton, onRefresh, customControls } = useHeader();

  // Don't render if no title, tabs, or customControls
  if (!title && !tabs && !customControls) {
    return null;
  }

  return (
    <header className="z-30 bg-gradient-to-r from-blue-500 to-blue-900 shadow-lg">
      <div className="p-4">
        {/* Row 1: Title + SubTitle (left) | User Info + Menu (right) */}
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Title and SubTitle */}
          <div className="flex flex-col flex-shrink-0 min-w-0">
            {title && (
              title === "Trang chủ" ? (
                <Link href="/" className="flex items-center space-x-1 text-2xl sm:text-4xl font-bold group">
                  <span className="relative text-white drop-shadow-lg transition-all duration-300 group-hover:text-blue-100">
                    You
                  </span>
                  <span className="relative flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8">
                    <svg
                      className="w-4 h-4 sm:w-6 sm:h-6 text-white transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 drop-shadow-lg"
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
                  <span className="relative bg-clip-text text-white transition-all duration-300 group-hover:from-yellow-200 group-hover:via-orange-300 group-hover:to-red-400 drop-shadow-lg">
                    Link
                  </span>
                </Link>
              ) : (
                <>
                  <h2 className="text-xl sm:text-2xl font-medium text-white break-words">{title}</h2>
                  {subTitle && (
                    <p className="text-xs sm:text-sm text-blue-200 mt-0.5 break-words">{subTitle}</p>
                  )}
                </>
              )
            )}
          </div>

          {/* Right side - User Info + Menu Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* User Info */}
            {user && (
              <div className="flex items-center gap-2 text-white">
                <div className="text-right hidden sm:block">
                  <p className="text-sm sm:text-md font-semibold truncate max-w-[120px] sm:max-w-none">{user.fullname}</p>
                  <p className="text-xs text-blue-200 truncate">{user.role || 'User'}</p>
                </div>
              </div>
            )}
            {/* Hamburger Menu Button - chỉ hiển thị khi đã đăng nhập */}
            {user && (
              <button
                onClick={onToggleSidebar}
                className="cursor-pointer p-2.5 sm:p-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/30 hover:scale-105 transition-all text-white flex-shrink-0 shadow-lg"
                aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
              >
                {isSidebarOpen ? (
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                ) : (
                  <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Options/Tabs (below subTitle, single row, no wrap) */}
        {(customControls || tabs) && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {customControls ? (
              <div className="flex items-center gap-2 flex-nowrap min-w-max">
                {/* Nhóm 1: Site / NCC */}
                {customControls.searchType && (
                  <div className="flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden flex-shrink-0">
                    <button
                      onClick={() => customControls.searchType!.onSearchTypeChange("Site")}
                      className={`cursor-pointer flex items-center justify-center px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        customControls.searchType.value === "Site" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                      }`}
                    >
                      <Globe className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                      <span className="hidden sm:inline text-xs md:text-sm">Site</span>
                    </button>
                    <button
                      onClick={() => customControls.searchType!.onSearchTypeChange("NCC")}
                      className={`cursor-pointer flex items-center justify-center px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        customControls.searchType.value === "NCC" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                      }`}
                    >
                      <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                      <span className="hidden sm:inline text-xs md:text-sm">NCC</span>
                    </button>
                  </div>
                )}

                {/* Nhóm 2: USDT / [Tỉ giá] / VND */}
                {customControls.currency && (
                  <div className="flex items-center bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden flex-shrink-0">
                    <button
                      onClick={() => customControls.currency!.onCurrencyChange("USDT")}
                      className={`cursor-pointer flex items-center justify-center px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        customControls.currency.value === "USDT" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                      }`}
                    >
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                      <span className="hidden sm:inline text-xs md:text-sm">USDT</span>
                    </button>
                    {customControls.currency.value === "VND" && customControls.currency.exchangeRate !== undefined && (
                      <div className="flex items-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={customControls.currency.exchangeRate}
                          onChange={(e) => {
                            let value = e.target.value
                            
                            // Loại bỏ tất cả ký tự không phải số, dấu chấm, dấu phẩy
                            value = value.replace(/[^0-9.,]/g, '')
                            
                            // Chuyển tất cả dấu phẩy thành dấu chấm (hỗ trợ Vietkey)
                            value = value.replace(/,/g, '.')
                            
                            // Chỉ cho phép một dấu chấm
                            const parts = value.split('.')
                            if (parts.length > 2) {
                              // Nếu có nhiều dấu chấm, chỉ giữ lại dấu chấm đầu tiên
                              value = parts[0] + '.' + parts.slice(1).join('')
                            }
                            
                            // Giới hạn số chữ số sau dấu chấm (tối đa 2 chữ số)
                            if (parts.length === 2 && parts[1].length > 2) {
                              value = parts[0] + '.' + parts[1].substring(0, 2)
                            }
                            
                            customControls.currency!.onExchangeRateChange?.(value)
                          }}
                          onBlur={(e) => {
                            // Khi mất focus, đảm bảo giá trị hợp lệ
                            const value = e.target.value.trim()
                            if (value && !isNaN(Number.parseFloat(value))) {
                              const numValue = Number.parseFloat(value)
                              if (numValue > 0) {
                                // Giữ nguyên giá trị nếu hợp lệ
                                return
                              }
                            }
                            // Nếu không hợp lệ, giữ giá trị cũ hoặc để trống
                          }}
                          className="w-10 sm:w-14 px-1 sm:px-2 py-1.5 sm:py-2 text-center text-xs sm:text-sm bg-white text-blue-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 border border-transparent hover:border-blue-300 transition-colors"
                          placeholder="28"
                          title="Nhập tỉ giá (ví dụ: 28 hoặc 28.5)"
                        />
                      </div>
                    )}
                    <button
                      onClick={() => customControls.currency!.onCurrencyChange("VND")}
                      className={`cursor-pointer flex items-center justify-center px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        customControls.currency.value === "VND" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                      }`}
                    >
                      <Coins className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                        <span className="hidden sm:inline text-xs md:text-sm">VND</span>
                    </button>
                  </div>
                )}

                {/* Nhóm 3: F / X */}
                {customControls.brand && (
                  <div className="flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden flex-shrink-0">
                    <button
                      onClick={() => customControls.brand!.onBrandChange("F")}
                      className={`cursor-pointer flex items-center justify-center px-1 sm:px-2 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        customControls.brand.value === "F" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                      }`}
                    >
                      <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                      <span className="hidden sm:inline text-xs md:text-sm">F-ALL</span>
                      <span className="sm:hidden">F</span>
                    </button>
                    <button
                      onClick={() => customControls.brand!.onBrandChange("X")}
                      className={`cursor-pointer flex items-center justify-center px-1 sm:px-2 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        customControls.brand.value === "X" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                      }`}
                    >
                      <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                      <span className="hidden sm:inline text-xs md:text-sm">X-ALL</span>
                      <span className="sm:hidden">X</span>
                    </button>
                  </div>
                )}

                {/* Nút Refresh */}
                {customControls.refresh && onRefresh && (
                  <div className="flex relative flex-shrink-0">
                    <button
                      onClick={onRefresh}
                      className="cursor-pointer flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors shadow-md"
                    >
                      <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${customControls.refresh.loading || customControls.refresh.refreshing ? "animate-spin" : ""}`} />
                    </button>
                    {(customControls.refresh.refreshing || customControls.refresh.isStale) && (
                      <div className="absolute -top-1 -right-1 flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium z-10">
                        <RefreshCw className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${customControls.refresh.refreshing ? "animate-spin" : ""}`} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Tabs (fallback) */
              tabs && tabs.length > 0 && (
                <div className="flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden flex-shrink-0">
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => onTabChange && onTabChange(tab.id)}
                        className={`cursor-pointer flex items-center px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === tab.id
                            ? "bg-blue-100 text-blue-900"
                            : "text-white hover:bg-blue-600"
                        }`}
                      >
                        <IconComponent className="h-4 w-4 mr-1 flex-shrink-0" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </header>
  );
}

