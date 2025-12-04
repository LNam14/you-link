import { google } from "googleapis"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { cache } from "react"
import keys from "../../../../../key.json"

// Ensure Node.js runtime and allow longer execution to avoid 504 timeouts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Increase on Vercel (in seconds). Adjust as needed.
export const maxDuration = 60

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"

// Cache kết quả trong 5 phút
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút
const sheetCache = new Map<string, { data: any; expiry: number; modifiedTime?: string }>();
// Cache modifiedTime của spreadsheet để phát hiện thay đổi
const spreadsheetModifiedTime = new Map<string, string>();

// Cleanup cache cũ định kỳ để tránh memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sheetCache.entries()) {
        if (value.expiry < now) {
            sheetCache.delete(key);
        }
    }
}, 60000); // Cleanup mỗi phút

interface SheetConfig {
    range: string
    formatter: (row: any[], index: number) => Record<string, any>
    spreadsheetId?: string
}

const sheetConfigs: Record<string, SheetConfig> = {
    updateVN: {
        range: "1!A3:AN,4!A3:AN",
        formatter: (row, index) => ({
            rowIndex: index + 3,
            CS: row[0] || "",
            Site: row[1] || "",
            Bóng: row[2] || "", // Added Bóng column mapping for foreign data
            Bet: row[3] || "", // Added Bet column mapping for foreign data
            "Chủ đề": row[4] || "",
            Nước: row[6] || "",
            "Link out": row[7] || "",
            DR: row[8] || "",
            Keywords: row[9] || "",
            "Traffic Tool": row[10] || "",
            "Ghi chú": row[11] || "",
            "Tình trạng": row[12] || "",
            "GP ($)": row[18] || 0,
            "Text Footer ($)": row[19] || 0,
            "Text Home ($)": row[20] || 0,
            "Text Header ($)": row[21] || 0,
            "HH GP": row[22] || 0,
            "HH Text": row[23] || 0,
            "Kê GP": row[24] || 0,
            "Kê Text": row[25] || 0,
            "Tên": row[26] || "",
            NCC: row[27] || "",
            "Note NB": row[28] || "",
        }),
        spreadsheetId: SPREADSHEET_ID,
    },
    updateNN: {
        range: "2!A3:AN,5!A3:AN",
        formatter: (row, index) => ({
            rowIndex: index + 3,
            CS: row[0] || "",
            Site: row[1] || "",
            Bóng: row[2] || "", // Added Bóng column mapping for foreign data
            Bet: row[3] || "", // Added Bet column mapping for foreign data
            "Chủ đề": row[4] || "",
            Nước: row[6] || "",
            "Link out": row[7] || "",
            DR: row[8] || "",
            Keywords: row[9] || "",
            "Traffic Tool": row[10] || "",
            "Ghi chú": row[11] || "",
            "Tình trạng": row[12] || "",
            "GP ($)": row[18] || 0,
            "Text Footer ($)": row[19] || 0,
            "Text Home ($)": row[20] || 0,
            "Text Header ($)": row[21] || 0,
            "HH GP": row[22] || 0,
            "HH Text": row[23] || 0,
            "Kê GP": row[24] || 0,
            "Kê Text": row[25] || 0,
            "Tên": row[26] || "",
            NCC: row[27] || "",
            "Note NB": row[28] || "",
        }),
        spreadsheetId: SPREADSHEET_ID,
    },
}

const getAuthClient = cache(async () => {
    const client = new google.auth.JWT(keys.client_email, undefined, keys.private_key, [
        "https://www.googleapis.com/auth/spreadsheets",
    ])
    await client.authorize()
    return client
})

async function handleRequest(req: Request) {
    try {
        const cookieStore = cookies()
        const userInfoCookie = cookieStore.get("userInfo")
        const userInfo = userInfoCookie ? JSON.parse(userInfoCookie.value) : {}

        // Kiểm tra query parameter để force refresh cache
        const url = new URL(req.url)
        const forceRefresh = url.searchParams.get("revalidate") === "1"

        const cacheKey = `update-site-${SPREADSHEET_ID}-${userInfo.role || "guest"}-${userInfo.username || "anonymous"}`
        
        const client = await getAuthClient()
        const gsapi = google.sheets({ version: "v4", auth: client })

        // Kiểm tra modifiedTime của spreadsheet để phát hiện thay đổi
        let shouldInvalidateCache = forceRefresh
        let currentModifiedTime = ""
        
        try {
            const spreadsheetInfo = await gsapi.spreadsheets.get({
                spreadsheetId: SPREADSHEET_ID,
                fields: "properties.modifiedTime",
            })
            // Type assertion vì Google API types có thể không đầy đủ
            currentModifiedTime = (spreadsheetInfo.data.properties as any)?.modifiedTime || ""
            const cachedModifiedTime = spreadsheetModifiedTime.get(SPREADSHEET_ID)
            
            // Nếu modifiedTime thay đổi, invalidate cache
            if (cachedModifiedTime && cachedModifiedTime !== currentModifiedTime) {
                shouldInvalidateCache = true
                // Xóa tất cả cache liên quan đến spreadsheet này
                for (const [key] of sheetCache.entries()) {
                    if (key.includes(SPREADSHEET_ID)) {
                        sheetCache.delete(key)
                    }
                }
            }
            
            // Lưu modifiedTime mới nhất
            if (currentModifiedTime) {
                spreadsheetModifiedTime.set(SPREADSHEET_ID, currentModifiedTime)
            }
        } catch (error) {
            // Nếu không lấy được modifiedTime, vẫn tiếp tục với logic cache thông thường
            console.warn("Could not check spreadsheet modifiedTime:", error)
        }
        
        // Check cache (sau khi đã kiểm tra modifiedTime)
        const cached = sheetCache.get(cacheKey)
        if (!shouldInvalidateCache && cached && cached.expiry > Date.now()) {
            return NextResponse.json(cached.data, {
                status: 200,
                headers: {
                    "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
                    "CDN-Cache-Control": "public, max-age=300",
                },
            })
        }

        const results: Record<string, any> = {}

        for (const [key, config] of Object.entries(sheetConfigs)) {
            const { data } = await gsapi.spreadsheets.values.batchGet({
                spreadsheetId: config.spreadsheetId!,
                ranges: config.range.split(","),
            })

            const valueRanges = data.valueRanges || []
            const allData: any[] = []

            const ranges = config.range.split(",")
            valueRanges.forEach((vr, i) => {
                const values = vr.values || []
                const sheetRef = ranges[i] || ""
                const sheetName = sheetRef.split("!")[0]
                const formatted = values.map((row, idx) => ({
                    ...config.formatter(row, idx),
                    sheetName,
                }))
                allData.push(...formatted)
            })

            let filtered = allData
            if (userInfo?.role === "NCC") {
                filtered = allData.filter((row) => row.NCC === userInfo.username)
            }

            results[key] = filtered
        }

        // Lấy modifiedTime hiện tại để lưu vào cache (đã lấy ở trên)
        if (!currentModifiedTime) {
            currentModifiedTime = spreadsheetModifiedTime.get(SPREADSHEET_ID) || ""
        }

        // Save to cache với modifiedTime
        sheetCache.set(cacheKey, {
            data: results,
            expiry: Date.now() + CACHE_DURATION,
            modifiedTime: currentModifiedTime,
        })

        return NextResponse.json(results, {
            status: 200,
            headers: {
                "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
                "CDN-Cache-Control": "public, max-age=300",
            },
        })
    } catch (error: any) {
        console.error("Error updateSheets:", error)
        return NextResponse.json({ error: true, message: error.message }, { status: 500 })
    }
}

// Hỗ trợ cả GET và POST để tối ưu cache
export async function GET(req: Request) {
    return handleRequest(req)
}

export async function POST(req: Request) {
    return handleRequest(req)
}

// Endpoint để xóa cache thủ công
export async function DELETE(req: Request) {
    try {
        const cookieStore = cookies()
        const userInfoCookie = cookieStore.get("userInfo")
        const userInfo = userInfoCookie ? JSON.parse(userInfoCookie.value) : {}

        // Xóa cache của user hiện tại hoặc tất cả cache
        const url = new URL(req.url)
        const clearAll = url.searchParams.get("all") === "1"

        if (clearAll) {
            // Xóa tất cả cache
            sheetCache.clear()
            spreadsheetModifiedTime.clear()
            return NextResponse.json({ 
                success: true, 
                message: "All cache cleared" 
            })
        } else {
            // Xóa cache của user hiện tại
            const cacheKey = `update-site-${SPREADSHEET_ID}-${userInfo.role || "guest"}-${userInfo.username || "anonymous"}`
            sheetCache.delete(cacheKey)
            return NextResponse.json({ 
                success: true, 
                message: "User cache cleared" 
            })
        }
    } catch (error: any) {
        console.error("Error clearing cache:", error)
        return NextResponse.json({ error: true, message: error.message }, { status: 500 })
    }
}
