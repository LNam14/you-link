import { google } from "googleapis"
import keys from "../../../../../key.json"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"

// Track sent notifications to prevent duplicates
const sentNotifications = new Set<string>()

// Helper function to convert column number to Excel letter
const getColumnLetter = (columnNumber: number): string => {
    let result = ''
    while (columnNumber > 0) {
        columnNumber--
        result = String.fromCharCode(65 + (columnNumber % 26)) + result
        columnNumber = Math.floor(columnNumber / 26)
    }
    return result
}

// Helper function to get column range using getColumnLetter
const getColumnRange = (startColumn: number, endColumn: number): string => {
    return `${getColumnLetter(startColumn)}:${getColumnLetter(endColumn)}`
}

// Helper function to validate column mapping
const validateColumnMapping = (mapping: Record<string, string>): void => {
    console.log("🔍 Validating column mapping:")
    Object.entries(mapping).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`)
    })
}

// Telegram notification function for new sites
const sendTelegramNotification = async (sites: any[], username: string, sheetType: number): Promise<boolean> => {
    try {
        console.log("🔍 Checking sites for Telegram notification:", sites.length, "sites received")
        
        // Filter out sites with empty Site field
        const validSites = sites.filter(site => site.Site && site.Site.toString().trim() !== "")
        console.log("✅ Valid sites found:", validSites.length, "out of", sites.length)
        
        if (validSites.length === 0) {
            console.log("⚠️ No valid sites to send notification for")
            return true // Return true to not block the process
        }

        // Create a unique key for this notification to prevent duplicates
        const notificationKey = validSites.map(site => site.Site).sort().join(',')
        if (sentNotifications.has(notificationKey)) {
            console.log("⚠️ Notification already sent for these sites, skipping...")
            return true
        }
        sentNotifications.add(notificationKey)
        
        // Send one notification for all new sites
        try {
            const updates = validSites.map(site => ({
                site: site.Site,
                changes: site
            }));
            
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/telegram/site-update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    updates,
                    dataType: sheetType,
                    isNewSite: true
                }),
            });
            console.log(`✅ Telegram notification sent for ${validSites.length} new sites`)
        } catch (error) {
            console.error(`❌ Failed to send notification for new sites:`, error)
        }

        return true
    } catch (error) {
        console.error("❌ Error sending Telegram notification:", error)
        return false
    }
}

export async function POST(req: Request) {
    try {
        const client = new google.auth.JWT(keys.client_email, undefined, keys.private_key, [
            "https://www.googleapis.com/auth/spreadsheets",
        ])

        await client.authorize()
        const gsapi = google.sheets({ version: "v4", auth: client })

        const body = await req.json()
        const { rows, sheetType } = body

        console.log("📊 Received data:", JSON.stringify(rows, null, 2))
        console.log("📊 Sheet type:", sheetType)

        if (!Array.isArray(rows)) {
            return NextResponse.json({ error: "Invalid data format" }, { status: 400 })
        }

        // Get username from cookies
        const cookieStore = cookies()
        const userInfo = cookieStore.get("userInfo")
        const username = userInfo ? JSON.parse(userInfo?.value).username : ""
        const role = userInfo ? JSON.parse(userInfo?.value).role : ""

        const targetSheetName = sheetType === 1 ? "4" : "5"

        // Column mapping using getColumnLetter function
        const columnMapping = {
            CS: getColumnLetter(1), // A
            Site: getColumnLetter(2), // B
            Bóng: getColumnLetter(3), // C
            Bet: getColumnLetter(4), // D
            Chủ_đề: getColumnLetter(5), // E
            Nước: getColumnLetter(6), // F
            Link_out: getColumnLetter(8), // H
            DR: getColumnLetter(9), // I
            Keywords: getColumnLetter(10), // J
            Traffic_Tool: getColumnLetter(11), // K
            Tình_trạng: getColumnLetter(13), // M
            GP: getColumnLetter(19), // S
            Text_Footer: getColumnLetter(20), // T
            Text_Home: getColumnLetter(21), // U
            Text_Header: getColumnLetter(22), // V
            HH_GP: getColumnLetter(23), // W
            HH_Text: getColumnLetter(24), // X
            Kê_GP: getColumnLetter(25), // Y
            Kê_Text: getColumnLetter(26), // Z
            Tên: getColumnLetter(27), // AA
            NCC: getColumnLetter(28), // AB
        }

        console.log("📊 Column mapping:", columnMapping)
        validateColumnMapping(columnMapping)

        // Prepare data for appending using dynamic column references
        const valuesToAppend = rows.map(row => {
            const mappedRow = [
                row["CS"] || "", // A - CS
                row["Site"] || "", // B - Site
                row["Bóng"] || "", // C - Bóng
                row["Bet"] || "", // D - Bet
                row["Chủ đề"] || "", // E - Chủ đề
                row["Nước"] || (sheetType === 2 ? "nước ngoài" : ""), // F - Nước
                "", // G - Empty
                row["Link out"] || "", // H - Link out
                row["DR"] || "", // I - DR
                row["Keywords"] || "", // J - Keywords
                row["Traffic Tool"] || "", // K - Traffic Tool
                "", // L - Ghi chú (empty)
                row["Tình trạng"] || "Bình thường", // M - Tình trạng
                "", // N - Empty
                "", // O - Empty
                "", // P - Empty
                "", // Q - Empty
                "", // R - Empty
                row["GP ($)"] || "", // S - GP ($)
                row["Text Footer ($)"] || "", // T - Text Footer ($)
                row["Text Home ($)"] || "", // U - Text Home ($)
                row["Text Header ($)"] || "", // V - Text Header ($)
                row["HH GP"] || "", // W - HH GP
                row["HH Text"] || "", // X - HH Text
                row["Kê GP"] || "", // Y - Kê GP
                row["Kê Text"] || "", // Z - Kê Text
                row["Tên"] || "", // AA - Tên
                role === "NCC" ? username : row["NCC"] || "", // AB - NCC
            ]
            
            console.log("🔍 Original row:", JSON.stringify(row, null, 2))
            console.log("🔍 Mapped row:", JSON.stringify(mappedRow, null, 2))
            console.log("🔍 Site value at index 1 (B):", mappedRow[1])
            console.log("🔍 Site value at index 13 (N):", mappedRow[13])
            
            return mappedRow
        })

        console.log(`📊 Appending ${valuesToAppend.length} rows to sheet ${targetSheetName}`)

        // First, get the current data to find the last row with actual data
        const getLastRowResponse = await gsapi.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${targetSheetName}!A:AB`, // Get all data to find last row with content
        })
        
        // Find the last row that has actual data (not empty)
        let lastRow = 0
        if (getLastRowResponse.data.values) {
            for (let i = getLastRowResponse.data.values.length - 1; i >= 0; i--) {
                const row = getLastRowResponse.data.values[i]
                // Check if row has any non-empty values
                if (row && row.some(cell => cell && cell.toString().trim() !== "")) {
                    lastRow = i + 1 // Convert to 1-based row number
                    break
                }
            }
        }
        
        const startRow = lastRow + 1
        const endRow = startRow + valuesToAppend.length - 1
        
        console.log(`📊 Last row with data: ${lastRow}, Starting from row: ${startRow}, Ending at row: ${endRow}`)

        // Double-check that the target range is empty to avoid overwriting
        const checkRangeResponse = await gsapi.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${targetSheetName}!A${startRow}:AB${endRow}`,
        })
        
        let finalStartRow = startRow
        let finalEndRow = endRow
        
        if (checkRangeResponse.data.values && checkRangeResponse.data.values.length > 0) {
            console.log("⚠️ Target range is not empty, adjusting start row...")
            // Find the actual last row in the target range
            let actualLastRow = lastRow
            for (let i = checkRangeResponse.data.values.length - 1; i >= 0; i--) {
                const row = checkRangeResponse.data.values[i]
                if (row && row.some(cell => cell && cell.toString().trim() !== "")) {
                    actualLastRow = startRow + i
                    break
                }
            }
            finalStartRow = actualLastRow + 1
            finalEndRow = finalStartRow + valuesToAppend.length - 1
            console.log(`📊 Adjusted: Starting from row: ${finalStartRow}, Ending at row: ${finalEndRow}`)
        } else {
            console.log("✅ Target range is empty, proceeding with insertion")
        }
        
        // Use batchUpdate to insert data at specific position
        const response = await gsapi.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${targetSheetName}!A${finalStartRow}:AB${finalEndRow}`, // Specific range from A to AB
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: valuesToAppend,
            },
        })

        // Send Telegram notification for new sites (only once)
        console.log("Starting Telegram notification process...")
        try {
            const telegramResult = await sendTelegramNotification(rows, username, sheetType)
            if (telegramResult) {
                console.log("✅ Telegram notification sent successfully")
            } else {
                console.log("❌ Telegram notification failed but no error thrown")
            }
        } catch (error) {
            console.error("❌ Failed to send Telegram notification:", error)
            // Don't fail the request if Telegram fails
        }

        return NextResponse.json({ success: true, updated: valuesToAppend.length }, { status: 200 })
    } catch (error: any) {
        console.error("Error appending to Google Sheet:", error)
        return NextResponse.json({ error: true, message: error.message }, { status: 500 })
    }
}
