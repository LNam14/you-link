import { google } from "googleapis"
import keys from "../../../../../key.json"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"

// Hint platform for long-running operations
export const dynamic = "force-dynamic"
export const maxDuration = 300

// Column mapping to Google Sheets columns
const COLUMN_MAPPING = {
    CS: "A",
    Site: "B",
    Bóng: "C",
    Bet: "D",
    "Chủ đề": "E",
    Nước: "F",
    "Link out": "H",
    DR: "I",
    Keywords: "J",
    "Traffic Tool": "K",
    "Ghi chú": "L",
    "Tình trạng": "M",
    "GP ($)": "S",
    "Text Footer ($)": "T",
    "Text Home ($)": "U",
    "Text Header ($)": "V",
    "HH GP": "W",
    "HH Text": "X",
    "Kê GP": "Y",
    "Kê Text": "Z",
    "Tên": "AA",
    NCC: "AB",
}

export async function POST(req: Request) {
    try {
        const client = new google.auth.JWT(keys.client_email, undefined, keys.private_key, [
            "https://www.googleapis.com/auth/spreadsheets",
        ])

        await client.authorize()
        const gsapi = google.sheets({ version: "v4", auth: client })

        const body = await req.json()
        const { data, sheetType } = body

        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: "Invalid data format" }, { status: 400 })
        }

        // Get user info from cookies
        const cookieStore = cookies()
        const userInfo = cookieStore.get("userInfo")
        const username = userInfo ? JSON.parse(userInfo?.value).username : ""
        const role = userInfo ? JSON.parse(userInfo?.value).role : ""

        // Determine primary sheet name based on sheetType
        const defaultSheetName = sheetType === 1 ? "1" : "2"

        // Prepare batch update data
        const batchUpdateData: Array<{
            range: string
            values: any[][]
        }> = []

        // Process each update
        for (const update of data) {
            const { rowIndex, changes } = update

            if (!rowIndex || !changes) {
                console.warn("Invalid update format:", update)
                continue
            }

            // Process each column change
            for (const [columnName, value] of Object.entries(changes)) {
                const columnLetter = COLUMN_MAPPING[columnName as keyof typeof COLUMN_MAPPING]

                if (!columnLetter) {
                    console.warn(`Unknown column: ${columnName}`)
                    continue
                }

                const targetSheetName = update.sheetName || defaultSheetName
                const range = `${targetSheetName}!${columnLetter}${rowIndex}`
                batchUpdateData.push({
                    range,
                    values: [[value === null || value === undefined ? "" : value]],
                })
            }
        }

        if (batchUpdateData.length === 0) {
            return NextResponse.json({ error: "No valid updates to process" }, { status: 400 })
        }

        console.log(`[v0] Processing ${batchUpdateData.length} updates for ${data.length} rows`)

        // Execute batch update
        const response = await gsapi.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: "USER_ENTERED",
                data: batchUpdateData,
            },
        })

        console.log(`[v0] Update completed: ${response.data.totalUpdatedCells} cells updated`)

        // Send Telegram notification for all updated sites in one message
        try {
            const validUpdates = [];
            
            for (const update of data) {
                const { changes, rowIndex } = update;
                if (changes && Object.keys(changes).length > 0) {
                    // Get site name from changes, or try to get from original data
                    let siteName = changes.Site;
                    
                    // If Site is not in changes, try to get it from the original row data
                    if (!siteName) {
                        try {
                            // Get the current row data to find the site name
                            const sheetName = update.sheetName || defaultSheetName;
                            const siteColumnRange = `${sheetName}!B${rowIndex}`; // Column B is Site
                            
                            const siteResponse = await gsapi.spreadsheets.values.get({
                                spreadsheetId: SPREADSHEET_ID,
                                range: siteColumnRange,
                            });
                            
                            const siteValue = siteResponse.data.values?.[0]?.[0];
                            siteName = siteValue || 'Unknown Site';
                        } catch (error) {
                            console.error('Failed to get site name:', error);
                            siteName = 'Unknown Site';
                        }
                    }
                    
                    // Convert changes to include old and new values
                    const changesWithOldNew = Object.entries(changes).reduce((acc, [field, newValue]) => {
                        acc[field] = {
                            oldValue: null, // We don't have old value in this context, will be handled in frontend
                            newValue: newValue
                        };
                        return acc;
                    }, {} as Record<string, { oldValue: any; newValue: any }>);

                    validUpdates.push({
                        site: siteName,
                        changes: changesWithOldNew
                    });
                }
            }
            
            // Telegram notification is now handled by frontend to ensure proper old/new value tracking
            console.log('📝 Updates processed:', validUpdates.length);
        } catch (telegramError) {
            console.error('Failed to process Telegram notification:', telegramError);
            // Don't fail the main update if Telegram fails
        }

        return NextResponse.json(
            {
                success: true,
                updatedCells: response.data.totalUpdatedCells,
                message: `Successfully updated ${response.data.totalUpdatedCells} cells`,
            },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("Error updating Google Sheet:", error)
        return NextResponse.json(
            {
                error: true,
                message: error.message || "Unknown error occurred",
            },
            { status: 500 },
        )
    }
}
