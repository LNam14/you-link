import React, { useEffect, useState } from "react"
import { Menu, DollarSign } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { ref, onValue } from "firebase/database"
import { database } from "@/app/firebase/firebase"
import getUserInfo from "@/components/userInfo"

interface HeaderProps {
    onMenuToggle: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
    const userInfo = getUserInfo()
    const [amount, setAmount] = useState(0)
    const [pendingAmount, setPendingAmount] = useState(0)

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
                    {(userInfo?.role === "Khách hàng" || userInfo?.role === "NCC" || userInfo?.role === "Nhân viên") && (
                        <div className="flex items-center gap-4 mr-4">
                            <div className="flex items-center">
                                <span className="text-sm text-gray-600">Số dư:</span>
                                <span className="text-sm font-semibold text-emerald-600 ml-2">{Number(amount || 0).toFixed(2)}</span>
                                <DollarSign className="w-3 h-3 text-emerald-600 ml-1" />
                            </div>
                            <div className="flex items-center">
                                <span className="text-sm text-gray-600">Tiền treo:</span>
                                <span className="text-sm font-semibold text-amber-600 ml-2">{Number(pendingAmount || 0).toFixed(2)}</span>
                                <DollarSign className="w-3 h-3 text-amber-600 ml-1" />
                            </div>
                            <div className="flex items-center">
                                <span className="text-sm text-gray-600">Có thể sử dụng:</span>
                                <span className="text-sm font-semibold text-blue-600 ml-2">{Number((amount || 0) - (pendingAmount || 0)).toFixed(2)}</span>
                                <DollarSign className="w-3 h-3 text-blue-600 ml-1" />
                            </div>
                        </div>
                    )}
                    <UserButton afterSignOutUrl="/" />
                </div>
            </div>
        </header>
    )
} 