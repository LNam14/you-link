import { google } from "googleapis"
import { NextResponse, NextRequest } from "next/server"
import { invalidateAllCache } from "@/lib/cache/sheetCache"
import { verifyAuthToken } from "@/lib/utils/auth"
import { TelegramService } from "@/lib/services/telegram.service"
import { RewardRepository } from "@/lib/repositories/reward.repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"

// Cache auth client để tránh tạo lại mỗi lần
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

// Map field names to column indices (0-based, matching the formatter)
const FIELD_TO_COLUMN: Record<string, number> = {
    cs: 0,             
    site: 1,           
    bong: 2,           
    bet: 3,            
    chuDe: 4,          
    linkOut: 7,        
    DR: 8,             
    keywords: 9,       
    trafficTool: 10,   
    noteKH: 11,        
    noteNB:12,
    tinhTrang: 14,     
    giaBanGP: 31,      
    giaBanText: 32,    
    giaBanTextHome: 33,
    giaBanTextHeader: 34,
    giaMuaGP: 16,      
    giaMuaText: 17,    
    giaMuaTextHome: 18,
    giaMuaTextHeader: 19,
    hoaHongGP: 20,     
    hoaHongText: 21,   
    KeGP: 22,          
    KeText: 23,        
    NCC: 24,            
    MaNCC: 25,  
}

// Map field names to display names
const FIELD_DISPLAY_NAMES: Record<string, string> = {
    cs: "CS",
    site: "Site",
    bong: "Bóng",
    bet: "Bet",
    chuDe: "Chủ đề",
    linkOut: "Link Out",
    DR: "DR",
    keywords: "Keywords",
    trafficTool: "Traffic Tool",
    noteKH: "Khách hàng",
    noteNB: "Nội bộ",
    tinhTrang: "Tình trạng",
    giaBanGP: "Giá bán GP",
    giaBanText: "Giá bán Text",
    giaBanTextHome: "Giá bán Text Home",
    giaBanTextHeader: "Giá bán Text Header",
    giaMuaGP: "Giá mua GP",
    giaMuaText: "Text Footer ($)",
    giaMuaTextHome: "Text Home ($)",
    giaMuaTextHeader: "Text Header ($)",
    hoaHongGP: "Hoa hồng GP",
    hoaHongText: "Hoa hồng Text",
    KeGP: "Kê GP",
    KeText: "Kê Text",
    NCC: "NCC",
    MaNCC: "Mã NCC",
}

// Convert column index to A1 notation (0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA)
function columnIndexToLetter(index: number): string {
    let result = ""
    while (index >= 0) {
        result = String.fromCharCode(65 + (index % 26)) + result
        index = Math.floor(index / 26) - 1
    }
    return result
}

// Normalize URL for comparison (same as in page.tsx)
function normalizeUrl(url: string): string {
    if (!url || typeof url !== "string") return ""
    let normalized = url.replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//, "")
    normalized = normalized.replace(/^www\./, "")
    normalized = normalized.replace(/\/.*$/, "")
    normalized = normalized.replace(/:\d+$/, "")
    normalized = normalized.toLowerCase().trim()
    return normalized
}

// Read row data from sheet
async function readRowData(gsapi: any, sheetName: string, rowIndex: number): Promise<Record<string, any>> {
    try {
        // Read all columns from the row (A to AC)
        const range = `${sheetName}!A${rowIndex}:AC${rowIndex}`
        const { data } = await gsapi.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueRenderOption: "FORMATTED_VALUE",
        })

        if (!data.values || data.values.length === 0 || !data.values[0]) {
            return {}
        }

        const row = data.values[0]
        const rowData: Record<string, any> = {}
        
        // Map column indices to field names
        for (const [field, colIndex] of Object.entries(FIELD_TO_COLUMN)) {
            if (row[colIndex] !== undefined) {
                rowData[field] = row[colIndex]
            }
        }

        return rowData
    } catch (error) {
        console.error(`Error reading row data from sheet ${sheetName}, row ${rowIndex}:`, error)
        return {}
    }
}

// Find row index in a specific sheet by site URL and optionally MaNCC
async function findRowBySite(gsapi: any, sheetName: string, siteUrl: string, maNCC?: string): Promise<number | null> {
    const normalizedSearch = normalizeUrl(siteUrl)
    const normalizedMaNCC = maNCC ? String(maNCC).toUpperCase().trim() : null
    
    try {
        // Read column B (site) and column AB (MaNCC) from the sheet starting from row 3
        const range = `${sheetName}!B3:AB`
        const { data } = await gsapi.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueRenderOption: "UNFORMATTED_VALUE",
        })

        if (!data.values || data.values.length === 0) {
            return null
        }

        // Search for matching site, and optionally MaNCC
        for (let i = 0; i < data.values.length; i++) {
            const row = data.values[i]
            const cellSite = row[0] // Column B (index 0)
            
            if (cellSite) {
                const normalizedCell = normalizeUrl(String(cellSite))
                if (normalizedCell === normalizedSearch) {
                    // If MaNCC is provided, also check if it matches
                    if (normalizedMaNCC) {
                        const cellMaNCC = row[25] // Column AB (index 26, which is MaNCC column - B is 0, so AB is 26)
                        const normalizedCellMaNCC = cellMaNCC ? String(cellMaNCC).toUpperCase().trim() : ""
                        
                        // Only return if both site and MaNCC match
                        if (normalizedCellMaNCC === normalizedMaNCC) {
                            return i + 3
                        }
                    } else {
                        // If no MaNCC provided, return first match (backward compatibility)
                        return i + 3
                    }
                }
            }
        }

        return null
    } catch (error) {
        console.error(`Error finding row in sheet ${sheetName}:`, error)
        return null
    }
}

export async function POST(req: NextRequest) {
    try {
        // Get user info from auth token
        let username: string | undefined
        try {
            const userInfo = verifyAuthToken(req)
            username = userInfo.username
        } catch (error) {
            // If auth fails, continue without username (for backward compatibility)
            console.warn("[sheet/update] Auth token not found or invalid, continuing without user info")
        }

        const body = await req.json()
        const { site, sheetName, updates, rowIndex, maNCC } = body

        // Validate required fields
        // Nếu có rowIndex và sheetName, không cần site (ưu tiên rowIndex)
        if (rowIndex === undefined && !site) {
            return NextResponse.json(
                { error: true, message: "Either 'site' or 'rowIndex' must be provided" },
                { status: 400 }
            )
        }

        if (!sheetName || !["1", "2", "4", "5"].includes(String(sheetName))) {
            return NextResponse.json(
                { error: true, message: "Invalid sheetName. Must be '1', '2', '4', or '5'" },
                { status: 400 }
            )
        }

        if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: true, message: "Updates object is required and must not be empty" },
                { status: 400 }
            )
        }

        // Get auth client
        const client = await getAuthClient()
        const gsapi = google.sheets({ version: "v4", auth: client })

        // Determine row index - ưu tiên rowIndex trước (nhanh nhất)
        let targetRowIndex: number | null = null
        
        if (rowIndex !== undefined && rowIndex !== null) {
            // Use provided rowIndex directly (must be >= 3 since data starts at row 3)
            targetRowIndex = Number.parseInt(String(rowIndex))
            if (isNaN(targetRowIndex) || targetRowIndex < 3) {
                return NextResponse.json(
                    { error: true, message: "Invalid rowIndex. Must be >= 3" },
                    { status: 400 }
                )
            }
            // Skip site search when rowIndex is provided - sử dụng trực tiếp
            console.log(`[sheet/update] Using rowIndex ${targetRowIndex} directly in sheet ${sheetName} (skipping search)`)
        } else if (site) {
            // Fallback: Find row by site URL and optionally MaNCC (chỉ khi không có rowIndex)
            console.log(`[sheet/update] Searching for site "${site}" in sheet ${sheetName}${maNCC ? ` with MaNCC "${maNCC}"` : ""}`)
            targetRowIndex = await findRowBySite(gsapi, String(sheetName), site, maNCC)
            if (!targetRowIndex) {
                const errorMsg = maNCC 
                    ? `Site "${site}" with MaNCC "${maNCC}" not found in sheet ${sheetName}`
                    : `Site "${site}" not found in sheet ${sheetName}`
                return NextResponse.json(
                    { error: true, message: errorMsg },
                    { status: 404 }
                )
            }
        } else {
            return NextResponse.json(
                { error: true, message: "Either 'site' or 'rowIndex' must be provided" },
                { status: 400 }
            )
        }

        // Prepare update values
        const updateData: Array<{ range: string; values: any[][] }> = []
        
        for (const [field, value] of Object.entries(updates)) {
            const columnIndex = FIELD_TO_COLUMN[field]
            if (columnIndex === undefined) {
                console.warn(`Unknown field: ${field}, skipping`)
                continue
            }

            const columnLetter = columnIndexToLetter(columnIndex)
            const range = `${sheetName}!${columnLetter}${targetRowIndex}`
            
            // Convert value to appropriate format
            let formattedValue: any = value
            if (value === null || value === undefined) {
                formattedValue = ""
            } else if (typeof value === "number") {
                // For numbers, convert comma to dot for Google Sheets
                formattedValue = value.toString().replace(",", ".")
            } else {
                formattedValue = String(value)
            }

            updateData.push({
                range: range,
                values: [[formattedValue]],
            })
        }

        if (updateData.length === 0) {
            return NextResponse.json(
                { error: true, message: "No valid fields to update" },
                { status: 400 }
            )
        }

        // Read old data before update to compare changes
        const oldData = await readRowData(gsapi, String(sheetName), targetRowIndex)
        const siteName = oldData.site || site || "Unknown"

        // Perform batch update
        const { data } = await gsapi.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: "USER_ENTERED", // Allows formulas and formatting
                data: updateData,
            },
        })

        // Invalidate cache after successful update
        invalidateAllCache()
        console.log("[sheet/update] Cache invalidated after update")

        const skipTelegram = req.headers.get("x-skip-telegram") === "true"

        // Find actual changes (comparing old vs new values) - always compute for response
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = []
        
        for (const [field, newValue] of Object.entries(updates)) {
            const oldValue = oldData[field]
            const normalizedOld = oldValue === null || oldValue === undefined ? "" : String(oldValue).trim()
            const normalizedNew = newValue === null || newValue === undefined ? "" : String(newValue).trim()
            
            if (normalizedOld !== normalizedNew) {
                changes.push({
                    field,
                    oldValue: oldValue ?? "",
                    newValue: newValue ?? "",
                })
            }
        }

        let changesSummary: Array<{ field: string; oldValue: any; newValue: any; displayName: string }> = []
        if (changes.length > 0) {
            changesSummary = changes.map((c) => ({
                ...c,
                displayName: FIELD_DISPLAY_NAMES[c.field] || c.field,
            }))
        }

        // Process Telegram notification and reward (only if username is available and there are actual changes)
        if (!skipTelegram && username && changes.length > 0) {
            try {
                // Group changes by site (in case multiple sites are updated in one request)
                const siteChanges = new Map<string, typeof changes>()
                siteChanges.set(siteName, changes)

                // Send Telegram notification for each site
                for (const [currentSite, siteChangeList] of siteChanges) {
                    // Build Telegram message
                    let message = `🔄 CẬP NHẬT SITE 🔄\n\n`
                    message += `👤 Người thực hiện: ${username}\n\n`
                    message += `📝 Chi tiết cập nhật:\n\n`
                    message += `🌐 ${currentSite}\n`
                    
                    for (const change of siteChangeList) {
                        const displayName = FIELD_DISPLAY_NAMES[change.field] || change.field
                        const oldVal = change.oldValue === "" ? "(trống)" : String(change.oldValue)
                        const newVal = change.newValue === "" ? "(trống)" : String(change.newValue)
                        message += `  • ${displayName}: ${oldVal} → ${newVal}\n`
                    }

                    // Send Telegram message
                    const telegramService = new TelegramService()
                    try {
                        await telegramService.sendMessage({
                            chatId: "-1003124919874_1033",
                            message: message,
                        })
                    } catch (telegramError) {
                        console.error("Error sending Telegram notification:", telegramError)
                        // Don't fail the update if Telegram fails
                    }

                    // Create reward (1.000 VND per site updated)
                    const rewardRepository = new RewardRepository()
                    const now = new Date()
                    const year = now.getFullYear()
                    const month = now.getMonth() + 1
                    
                    try {
                        await rewardRepository.create({
                            username,
                            year,
                            month,
                            amount: 1000, // 1.000 VND
                            site: currentSite,
                            reason: "Cập nhật site",
                            createdAt: now.toISOString(),
                        })
                    } catch (rewardError) {
                        console.error("Error creating reward:", rewardError)
                        // Don't fail the update if reward creation fails
                    }
                }
            } catch (notificationError) {
                console.error("Error processing notification/reward:", notificationError)
                // Don't fail the update if notification/reward processing fails
            }
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${updateData.length} field(s) in sheet ${sheetName}, row ${targetRowIndex}`,
            updatedCells: data.totalUpdatedCells,
            updatedRows: data.totalUpdatedRows,
            updatedColumns: data.totalUpdatedColumns,
            updatedSheets: data.totalUpdatedSheets,
            site: siteName,
            changes: changesSummary,
        })
    } catch (error: any) {
        console.error("Error updating Google Sheets:", error)
        // Invalidate auth client on error
        cachedAuthClient = null
        authClientExpiry = 0
        return NextResponse.json(
            { error: true, message: error.message || "Failed to update sheet" },
            { status: 500 }
        )
    }
}

