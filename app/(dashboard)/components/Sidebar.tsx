"use client";

import Link from "next/link";
import { X, LogOut, LayoutGrid, Home } from "lucide-react";
import { MenuGroup, homeMenuItem } from "../config/menu.config";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
  menuGroups: MenuGroup[];
  onLogout: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  pathname,
  menuGroups,
  onLogout,
}: SidebarProps) {
  // Ensure consistent rendering
  if (!menuGroups || menuGroups.length === 0) {
    return null;
  }

  return (
    <aside
      className={`sidebar-container fixed top-0 right-0 h-full w-80 z-[50] transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Modern glassmorphism background */}
      <div 
        className="h-full w-full backdrop-blur-2xl bg-white/95 border-l border-gray-200/60 shadow-2xl"
        style={{
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.95) 100%)',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div className="relative z-10 h-full flex flex-col">
          {/* Header with modern style */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200/30 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                <LayoutGrid className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                Menu
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100/80 rounded-lg transition-all duration-200 group"
              aria-label="Close menu"
            >
              <X className="h-4 w-4 text-gray-500 group-hover:text-gray-900" />
            </button>
          </div>

          {/* Navigation Section - Grouped with titles */}
          <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide">
            <nav className="space-y-4">
              {/* Home link - separate */}
              <Link
                href={homeMenuItem.href}
                onClick={onClose}
                className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                  pathname === homeMenuItem.href
                    ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-800 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-md'
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                  pathname === homeMenuItem.href
                    ? 'bg-white/20 text-white' 
                    : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 group-hover:from-blue-200 group-hover:to-indigo-200 group-hover:text-blue-700'
                }`}>
                  <Home className="h-4 w-4" />
                </div>
                <span className={`font-semibold text-xs tracking-wide ${
                  pathname === homeMenuItem.href ? 'text-white' : 'text-gray-800'
                }`}>
                  {homeMenuItem.label}
                </span>
                {pathname === homeMenuItem.href && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </Link>

              {/* Menu groups */}
              {menuGroups.map((group, groupIndex) => {
                // Define colors for each group
                const groupColors = [
                  {
                    // Quản lý - Blue/Indigo
                    titleBg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
                    titleText: 'text-blue-700',
                    titleBorder: 'border-blue-200',
                    activeBg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
                    activeShadow: 'shadow-blue-500/30',
                    iconBg: 'bg-blue-100',
                    iconText: 'text-blue-600',
                    iconHover: 'group-hover:bg-blue-200 group-hover:text-blue-700',
                    hoverBg: 'hover:bg-blue-50/80',
                    textColor: 'text-gray-800',
                  },
                  {
                    // Công việc & Thu nhập - Green/Amber
                    titleBg: 'bg-gradient-to-r from-emerald-50 to-amber-50',
                    titleText: 'text-emerald-700',
                    titleBorder: 'border-emerald-200',
                    activeBg: 'bg-gradient-to-r from-emerald-500 to-amber-500',
                    activeShadow: 'shadow-emerald-500/30',
                    iconBg: 'bg-emerald-100',
                    iconText: 'text-emerald-600',
                    iconHover: 'group-hover:bg-emerald-200 group-hover:text-emerald-700',
                    hoverBg: 'hover:bg-emerald-50/80',
                    textColor: 'text-gray-800',
                  },
                  {
                    // Tools - Purple/Pink
                    titleBg: 'bg-gradient-to-r from-purple-50 to-pink-50',
                    titleText: 'text-purple-700',
                    titleBorder: 'border-purple-200',
                    activeBg: 'bg-gradient-to-r from-purple-500 to-pink-500',
                    activeShadow: 'shadow-purple-500/30',
                    iconBg: 'bg-purple-100',
                    iconText: 'text-purple-600',
                    iconHover: 'group-hover:bg-purple-200 group-hover:text-purple-700',
                    hoverBg: 'hover:bg-purple-50/80',
                    textColor: 'text-gray-800',
                  },
                ];
                
                const colors = groupColors[groupIndex] || groupColors[0];
                
                return (
                  <div key={groupIndex} className="space-y-1.5">
                    <div className={`px-3 py-1.5 rounded-lg mb-2 border ${colors.titleBg} ${colors.titleBorder}`}>
                      <h3 className={`text-[10px] font-semibold ${colors.titleText} uppercase tracking-wider`}>
                        {group.title}
                      </h3>
                    </div>
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      const IconComponent = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={`group capitalize relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                            isActive
                              ? `${colors.activeBg} text-white shadow-lg ${colors.activeShadow}`
                              : `${colors.textColor} ${colors.hoverBg} hover:shadow-md`
                          }`}
                        >
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                            isActive 
                              ? 'bg-white/20 text-white' 
                              : `${colors.iconBg} ${colors.iconText} ${colors.iconHover}`
                          }`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <span className={`font-semibold text-xs tracking-wide ${
                            isActive ? 'text-white' : colors.textColor
                          }`}>
                            {item.label}
                          </span>
                          {isActive && (
                            <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Logout Button - Modern design */}
          <div className="p-3 border-t border-gray-200/30">
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 rounded-lg transition-all duration-300 font-semibold text-xs shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 group"
            >
              <LogOut className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

