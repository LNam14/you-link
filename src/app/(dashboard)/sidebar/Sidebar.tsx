'use client'

import React from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import SidebarItem from "./SideBarItem"
import { sidebarItems } from "./items"
import "@/app/globals.css"

interface SidebarProps {
    isOpen: boolean
}

export default function Sidebar({ isOpen }: SidebarProps) {
    return (
        <motion.div
            initial={{ width: isOpen ? 240 : 64 }}
            animate={{ width: isOpen ? 240 : 64 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed top-0 left-0 h-screen bg-white border-r border-gray-200 shadow-sm z-50"
        >
            {/* Logo section */}
            <div className="flex items-center justify-center h-14">
                <div className="flex items-center justify-center w-full h-full px-4">
                    {isOpen ? (
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
                    ) : (
                        <Link href="/" className="flex items-center space-x-1 text-2xl font-bold group">
                            {/* Chữ "You" */}
                            <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300 group-hover:drop-shadow-lg">
                                Y
                            </span>
                            {/* Chữ "Link" */}
                            <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300 group-hover:drop-shadow-lg">
                                L
                            </span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className="px-4 py-3">
                <div className="h-px bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100 border-none" style={{ backgroundSize: '4px 1px', backgroundRepeat: 'repeat-x' }} />
            </div>

            {/* Menu section */}
            <div className="py-4 px-2 space-y-1">
                {sidebarItems.map((item: any) => (
                    <SidebarItem key={item.id} item={item} showText={isOpen} />
                ))}
            </div>

            {/* Footer section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gradient-to-b from-transparent to-gray-50">
                <div className="flex items-center justify-center">
                    {isOpen ? (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="text-xs text-gray-500"
                        >
                            © 2025 You Link
                        </motion.span>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-100 to-blue-50 flex items-center justify-center"
                        >
                            <span className="text-xs text-blue-600">W</span>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}