import { google } from "googleapis"
import { NextRequest, NextResponse } from "next/server"
import { invalidateAllCache } from "@/lib/cache/sheetCache"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const SPREADSHEET_ID = "19grUhpM5EhCMj7wXPnzZlShsy3qbljUIA5XWsFSBjuY"

let cachedAuthClient: any = null    
let authClientExpiry = 0
const AUTH_CLIENT_TTL = 50 * 60 * 1000 // 50 phút

async function getAuthClient() {
    const now = Date.now()

    if (cachedAuthClient && authClientExpiry > now) {
        return cachedAuthClient
    }

    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY

    if (!clientEmail || !privateKey) {
        throw new Error("Missing Google Sheets credentials. Please set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY in .env.local")
    }

    const client = new google.auth.JWT({
        email: clientEmail,
        key: privateKey.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    await client.authorize()

    cachedAuthClient = client
    authClientExpiry = now + AUTH_CLIENT_TTL

    return client
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { sheetName, rowIndex } = body || {}

        if (!sheetName || String(sheetName) !== "VN") {
            return NextResponse.json(
                { error: true, message: "sheetName không hợp lệ. Chỉ hỗ trợ VN" },
                { status: 400 },
            )
        }

        const numericRowIndex = Number.parseInt(String(rowIndex), 10)
        if (!numericRowIndex || numericRowIndex < 3) {
            return NextResponse.json(
                { error: true, message: "rowIndex không hợp lệ. Giá trị phải >= 3" },
                { status: 400 },
            )
        }

        const client = await getAuthClient()
        const gsapi = google.sheets({ version: "v4", auth: client })

        const range = `${sheetName}!A${numericRowIndex}:V${numericRowIndex}`
        await gsapi.spreadsheets.values.clear({
            spreadsheetId: SPREADSHEET_ID,
            range,
        })

        invalidateAllCache()
        console.log("[sheet/delete] Cache invalidated after delete")

        return NextResponse.json({
            success: true,
            message: `Đã xóa dòng ${numericRowIndex} tại sheet ${sheetName}`,
            rowIndex: numericRowIndex,
            sheetName,
        })
    } catch (error: any) {
        console.error("Error deleting sheet row:", error)
        return NextResponse.json(
            { error: true, message: error?.message || "Không thể xóa dòng" },
            { status: 500 },
        )
    }
}

