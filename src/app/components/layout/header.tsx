import React from "react"
import { Menu } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { UserButton } from "@clerk/nextjs"

interface HeaderProps {
    onMenuToggle: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
    return (
        <header className="bg-white border-b border-gray-200">
            <div className="h-16 px-4 flex items-center justify-between">
                {/* Left section */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuToggle}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Menu className="h-5 w-5 text-gray-500" />
                    </button>
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/logo.png"
                            alt="You Link Logo"
                            width={32}
                            height={32}
                            className="w-8 h-8"
                        />
                        <span className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                            You Link
                        </span>
                    </Link>
                </div>

                {/* Right section */}
                <div className="flex items-center gap-4">
                    <UserButton afterSignOutUrl="/" />
                </div>
            </div>
        </header>
    )
} 