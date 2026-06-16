import { google } from "googleapis"
import { NextResponse, NextRequest } from "next/server"
import { invalidateAllCache } from "@/lib/cache/sheetCache"
import { TelegramService } from "@/lib/services/telegram.service"
import { verifyAuthToken } from "@/lib/utils/auth"
import { UserService } from "@/lib/services/user.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const SPREADSHEET_ID = "19grUhpM5EhCMj7wXPnzZlShsy3qbljUIA5XWsFSBjuY"

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
// Cột sheet VN (A3:V) — khớp formatter trong sheet/get
const FIELD_TO_COLUMN: Record<string, number> = {
    cs: 0,
    site: 1,
    chuDe: 2,
    linkOut: 3,
    DR: 4,
    keywords: 5,
    trafficTool: 6,
    noteKH: 7,
    tinhTrang: 8,
    giaBanGP: 9,
    giaBanText: 10,
    giaBanTextHome: 11,
    giaBanTextHeader: 12,
    MaNCC: 13,
    NCC: 14,
    giaMuaGP: 15,
    giaMuaText: 16,
    giaMuaTextHome: 17,
    giaMuaTextHeader: 18,
    hoaHongGP: 20,
    hoaHongText: 21,
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

// Find the last row with data in a sheet (starting from row 3)
async function findLastRow(gsapi: any, sheetName: string): Promise<number> {
    try {
        // Read column B (site) from the sheet starting from row 3
        const range = `${sheetName}!B3:B`
        const { data } = await gsapi.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueRenderOption: "UNFORMATTED_VALUE",
        })

        if (!data.values || data.values.length === 0) {
            // No data, return row 2 (so next row will be 3)
            return 2
        }

        // Find the last non-empty row
        let lastRow = 2 // Start from row 2 (0-indexed from row 3)
        for (let i = data.values.length - 1; i >= 0; i--) {
            if (data.values[i] && data.values[i][0] && String(data.values[i][0]).trim() !== "") {
                lastRow = i + 3 // Convert to actual row number (3-based)
                break
            }
        }

        return lastRow
    } catch (error) {
        console.error(`Error finding last row in sheet ${sheetName}:`, error)
        // Default to row 2 if error (so next row will be 3)
        return 2
    }
}

// Check if a row has any data (at least one non-empty field)
function hasRowData(rowData: Partial<Record<string, any>>): boolean {
    for (const value of Object.values(rowData)) {
        if (value !== null && value !== undefined && String(value).trim() !== "") {
            return true
        }
    }
    return false
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { sheetName, rowData } = body
        const skipTelegram = req.headers.get("x-skip-telegram") === "true"

        // Validate required fields
        if (!sheetName || String(sheetName) !== "VN") {
            return NextResponse.json(
                { error: true, message: "Invalid sheetName. Must be 'VN'" },
                { status: 400 }
            )
        }

        if (!rowData || typeof rowData !== "object") {
            return NextResponse.json(
                { error: true, message: "rowData object is required" },
                { status: 400 }
            )
        }

        // Check if row has any data
        if (!hasRowData(rowData)) {
            return NextResponse.json(
                { error: true, message: "Row has no data to save" },
                { status: 400 }
            )
        }

        // Get auth client
        const client = await getAuthClient()
        const gsapi = google.sheets({ version: "v4", auth: client })

        // Find the last row in the sheet
        const lastRow = await findLastRow(gsapi, String(sheetName))
        const newRowIndex = lastRow + 1

        // Prepare update values
        const updateData: Array<{ range: string; values: any[][] }> = []
        
        for (const [field, value] of Object.entries(rowData)) {
            const columnIndex = FIELD_TO_COLUMN[field]
            if (columnIndex === undefined) {
                console.warn(`Unknown field: ${field}, skipping`)
                continue
            }

            // Skip empty values
            if (value === null || value === undefined || String(value).trim() === "") {
                continue
            }

            const columnLetter = columnIndexToLetter(columnIndex)
            const range = `${sheetName}!${columnLetter}${newRowIndex}`
            
            // Convert value to appropriate format
            let formattedValue: any = value
            if (typeof value === "number") {
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
                { error: true, message: "No valid fields to add" },
                { status: 400 }
            )
        }

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
        console.log("[sheet/add] Cache invalidated after add")

        // Telegram notification handled in batch on client to avoid spam
        if (!skipTelegram) {
            try {
                const site = rowData.site || ""
                const trafficTool = rowData.trafficTool || ""
                
                // Only send notification if site is provided
                if (site && String(site).trim() !== "") {
                    const telegramService = new TelegramService()
                    
                    // Get user fullname from auth token
                    let fullname = ""
                    try {
                        const userInfo = verifyAuthToken(req)
                        const userService = new UserService()
                        const user = await userService.getUserByUsername(userInfo.username)
                        if (user && user.fullname) {
                            fullname = user.fullname.trim()
                        }
                    } catch (error) {
                        // If auth fails, continue without fullname
                        console.warn("[sheet/add] Could not get user fullname for Telegram notification:", error)
                    }
                    
                    // Build message: "Site mới nè - fullname\nsite.com - Traffic 123"
                    let message = "Site mới nè"
                    if (fullname) {
                        message += ` - ${fullname}`
                    }
                    message += "\n"
                    
                    const siteName = String(site).trim()
                    const traffic = trafficTool ? String(trafficTool).trim() : ""
                    
                    if (traffic) {
                        message += `${siteName} - Traffic ${traffic}`
                    } else {
                        message += `${siteName}`
                    }
                    
                    await telegramService.sendMessage({
                        chatId: "-1002137432608",
                        message: message,
                    })
                }
            } catch (telegramError) {
                console.error("Error sending Telegram notification for new site:", telegramError)
                // Don't fail the add operation if Telegram fails
            }
        }

        return NextResponse.json({
            success: true,
            message: `Added row to sheet ${sheetName}, row ${newRowIndex}`,
            rowIndex: newRowIndex,
            updatedCells: data.totalUpdatedCells,
            updatedRows: data.totalUpdatedRows,
            updatedColumns: data.totalUpdatedColumns,
            updatedSheets: data.totalUpdatedSheets,
        })
    } catch (error: any) {
        console.error("Error adding to Google Sheets:", error)
        // Invalidate auth client on error
        cachedAuthClient = null
        authClientExpiry = 0
        return NextResponse.json(
            { error: true, message: error.message || "Failed to add row to sheet" },
            { status: 500 }
        )
    }
}

