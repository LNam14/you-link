import { NextRequest, NextResponse } from "next/server"
import { TelegramService } from "@/lib/services/telegram.service"
import { verifyAuthToken } from "@/lib/utils/auth"
import { AuthService } from "@/lib/services/auth.service"
import { UserService } from "@/lib/services/user.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 15

type RequestBody = {
    addLines?: string[]
    updateLines?: string[]
    deleteLines?: string[]
    username?: string
}

const ADD_CHAT_ID = "-1002137432608"
const UPDATE_CHAT_ID = "-1003124919874_1033"

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as RequestBody
        const addLines = body.addLines?.filter((l) => l && l.trim() !== "")
        const updateLines = body.updateLines?.filter((l) => l && l.trim() !== "")
        const deleteLines = body.deleteLines?.filter((l) => l && l.trim() !== "")

        if ((!addLines || addLines.length === 0) && (!updateLines || updateLines.length === 0) && (!deleteLines || deleteLines.length === 0)) {
            return NextResponse.json(
                { error: true, message: "No content to send" },
                { status: 400 },
            )
        }

        const telegramService = new TelegramService()

        // Get current user info for update/delete summary
        let userDisplayName = "Unknown"
        if ((updateLines && updateLines.length > 0) || (deleteLines && deleteLines.length > 0)) {
            try {
                const authInfo = verifyAuthToken(req)
                const authService = new AuthService()
                const user = await authService.getCurrentUser(authInfo.userId)
                userDisplayName = `${user.username}-${user.fullname}`
            } catch (error) {
                // If auth fails, try to use username from body or fallback to Unknown
                console.warn("[telegram/summary] Failed to get user info:", error)
                userDisplayName = body.username || "Unknown"
            }
        }

        // Send add summary (site mới)
        if (addLines && addLines.length > 0) {
            // Get user fullname for add summary
            let fullname = ""
            try {
                const authInfo = verifyAuthToken(req)
                const userService = new UserService()
                const user = await userService.getUserByUsername(authInfo.username)
                if (user && user.fullname) {
                    fullname = user.fullname.trim()
                }
            } catch (error) {
                // If auth fails, continue without fullname
                console.warn("[telegram/summary] Could not get user fullname for add summary:", error)
            }
            
            let headerMessage = "Site mới nè"
            if (fullname) {
                headerMessage += ` - ${fullname}`
            }
            
            const message = [
                headerMessage,
                ...addLines,
            ].join("\n")
            await telegramService.sendMessage({
                chatId: ADD_CHAT_ID,
                message,
            })
        }

        // Send update summary
        if (updateLines && updateLines.length > 0) {
            const message = [
                "🔄 CẬP NHẬT SITE 🔄",
                `👤 Người cập nhật: ${userDisplayName}`,
                `📝 Chi tiết cập nhật:\n\n`,
               ...updateLines.map((line) => `  • ${line}`),
            ].join("\n")
            await telegramService.sendMessage({
                chatId: UPDATE_CHAT_ID,
                message,
            })
        }

        // Send delete summary
        if (deleteLines && deleteLines.length > 0) {
            const message = [
                "🗑️ XÓA SITE 🗑️",
                `👤 Người xóa: ${userDisplayName}`,
                `📝 Danh sách site đã xóa:\n\n`,
               ...deleteLines.map((line) => `  • ${line}`),
            ].join("\n")
            await telegramService.sendMessage({
                chatId: UPDATE_CHAT_ID,
                message,
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("[telegram/summary] error:", error)
        return NextResponse.json(
            { error: true, message: error?.message || "Failed to send summary" },
            { status: 500 },
        )
    }
}

