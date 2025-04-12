'use client'

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import "@/app/globals.css"

interface SidebarItemProps {
    item: {
        id: string
        href: string
        title: string
        icon: any
    }
    showText: boolean
}

export default function SidebarItem({ item, showText }: SidebarItemProps) {
    const pathname = usePathname()
    const isActive = pathname === item.href

    return (
        <Link href={item.href} className="block">
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center rounded-lg transition-all duration-200 ${isActive
                        ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
            >
                <div
                    className={`flex items-center w-full px-3 py-2.5 ${isActive ? "font-medium" : "font-normal"
                        }`}
                >
                    <div className={`flex items-center justify-center ${!showText && "w-full"}`}>
                        <item.icon
                            className={`h-[18px] w-[18px] ${showText ? "mr-3" : ""
                                } ${isActive ? "text-blue-600" : "text-gray-500"
                                }`}
                        />
                        {showText && (
                            <span className="text-sm truncate">
                                {item.title}
                            </span>
                        )}
                    </div>
                </div>
            </motion.div>
        </Link>
    )
}