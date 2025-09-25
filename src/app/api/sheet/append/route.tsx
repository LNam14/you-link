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

// Telegram notification function for new sites
const sendTelegramNotification = async (sites: any[]): Promise<boolean> => {
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
        
        let messageText = "Site mới nè\n"
        
        validSites.forEach((site, index) => {
            const siteName = site.Site
            const traffic = site["Traffic Tool"] && site["Traffic Tool"].toString().trim() !== "" 
                ? site["Traffic Tool"] 
                : "Chưa cập nhật"
            messageText += `${siteName} ${traffic}\n`
            console.log(`📝 Site ${index + 1}: ${siteName} - Traffic: ${traffic}`)
        })

        console.log("📤 Final message text:")
        console.log(messageText)

        const url = `https://ylink.qctl44.workers.dev/bot8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U/sendMessage`
        const params = new URLSearchParams({
            chat_id: "-1002137432608",
            text: messageText,
        })

        console.log("🌐 Sending request to Telegram API...")
        console.log("URL:", url)
        console.log("Chat ID:", "-1002137432608")
        console.log("Bot Token (first 10 chars):", "8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U".substring(0, 10) + "...")

        // First, test bot token with getMe
        console.log("🔍 Testing bot token...")
        const testUrl = `https://ylink.qctl44.workers.dev/bot8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U/getMe`
        const testResponse = await fetch(testUrl)
        const testData = await testResponse.json()
        console.log("🤖 Bot info:", JSON.stringify(testData, null, 2))

        const response = await fetch(`${url}?${params.toString()}`)
        console.log("📡 Telegram API response status:", response.status)
        
        const responseData = await response.json()
        console.log("📋 Telegram API response data:", JSON.stringify(responseData, null, 2))

        if (responseData.ok) {
            console.log("✅ Telegram notification sent successfully")
            return true
        } else {
            console.error(`❌ Failed to send Telegram notification: ${responseData.description}`)
            return false
        }
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

        if (!Array.isArray(rows)) {
            return NextResponse.json({ error: "Invalid data format" }, { status: 400 })
        }

        // Get username from cookies
        const cookieStore = cookies()
        const userInfo = cookieStore.get("userInfo")
        const username = userInfo ? JSON.parse(userInfo?.value).username : ""
        const role = userInfo ? JSON.parse(userInfo?.value).role : ""

        const targetSheetName = sheetType === 1 ? "4" : "5"

        // Prepare data for appending
        const valuesToAppend = rows.map(row => [
            row["CS"] || "", // A - CS
            row["Site"] || "", // B
            row["Bóng"] || "", // C
            row["Bet"] || "", // D
            row["Chủ đề"] || "", // E
            row["Nước"] || (sheetType === 2 ? "nước ngoài" : ""), // F
            "", // G
            row["Link out"] || "", // H
            row["DR"] || "", // I
            row["Keywords"] || "", // J
            row["Traffic Tool"] || "", // K
            "", // L (Ghi chú placeholder)
            row["Tình trạng"] || "Bình thường", // M
            "", // N
            "", // O
            "", // P
            "", // Q
            "", // R
            row["GP ($)"] || "", // S
            row["Text Footer ($)"] || "", // T
            row["Text Home ($)"] || "", // U
            row["Text Header ($)"] || "", // V
            row["HH GP"] || "", // W
            row["HH Text"] || "", // X
            row["Kê GP"] || "", // Y
            row["Kê Text"] || "", // Z
            row["Tên"] || "", // AA - Tên
            role === "NCC" ? username : row["NCC"] || "", // AB
        ])

        console.log(`📊 Appending ${valuesToAppend.length} rows to sheet ${targetSheetName}`)

        // Use append instead of batch update to avoid row limit issues
        const response = await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${targetSheetName}!A:AB`,
            valueInputOption: "USER_ENTERED",
            insertDataOption: "INSERT_ROWS",
            requestBody: {
                values: valuesToAppend,
            },
        })

        // Send Telegram notification for new sites (only once)
        console.log("Starting Telegram notification process...")
        try {
            const telegramResult = await sendTelegramNotification(rows)
            if (telegramResult) {
                console.log("✅ Telegram notification sent successfully")
            } else {
                console.log("❌ Telegram notification failed but no error thrown")
            }
        } catch (error) {
            console.error("❌ Failed to send Telegram notification:", error)
            // Don't fail the request if Telegram fails
        }

        return NextResponse.json({ success: true, updated: response.data.updates?.updatedRows || valuesToAppend.length }, { status: 200 })
    } catch (error: any) {
        console.error("Error appending to Google Sheet:", error)
        return NextResponse.json({ error: true, message: error.message }, { status: 500 })
    }
}
