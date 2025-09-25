import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
    try {
        // Get all usernames and names from account table
        const accounts = await prisma.account.findMany({
            select: {
                username: true,
                name: true
            },
            where: {
                username: {
                    not: null
                },
                role: "Nhân viên"
            },
            orderBy: {
                username: 'asc'
            }
        })

        // Format the data to include display name (username-name)
        const formattedAccounts = accounts.map(account => ({
            username: account.username,
            name: account.name,
            displayName: account.name ? `${account.username}-${account.name}` : account.username
        }))

        // Sort by username numerically (BH1, BH2, BH3...)
        formattedAccounts.sort((a: any, b: any) => {
            const aNum = parseInt(a.username.replace('BH', '')) || 0
            const bNum = parseInt(b.username.replace('BH', '')) || 0
            return aNum - bNum
        })

        return NextResponse.json({
            success: true,
            data: formattedAccounts
        }, { status: 200 })
    } catch (error) {
        console.error("Error fetching usernames:", error)
        return NextResponse.json({
            success: false,
            error: "Failed to fetch usernames"
        }, { status: 500 })
    }
}
