"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useHeader } from "../contexts/HeaderContext";

export default function DashboardPage() {
  const { setHeaderData } = useHeader();

  // Set header data for dashboard page
  useEffect(() => {
    setHeaderData({
      title: "Trang chủ",
      tabs: null,
      activeTab: null,
      onTabChange: null,
      refreshButton: false,
      onRefresh: null,
      customControls: null, // Reset customControls khi vào trang này
    });
  }, [setHeaderData]);

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center justify-center min-h-[400px]">
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
        <p className="text-gray-600 text-lg">
          Chào mừng đến với hệ thống quản lý You Link
        </p>
      </div>
    </div>
  );
}

