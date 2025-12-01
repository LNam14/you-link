import { google } from "googleapis"
import keys from "../../../../../key.json"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"

export const dynamic = "force-dynamic"
export const maxDuration = 60

interface BulkUpdateRequest {
    updates: Array<{
        rowIndex: number
        columnUpdates: Record<string, any>
    }>
    sheetType: number
}

interface BatchUpdateData {
    range: string
    values: any[][]
}

// Column mapping for different sheet types
const COLUMN_MAPPING = {
    Site: "B",
    Bóng: "C",
    Bet: "D",
    "Chủ đề": "E",
    Nước: "F",
    "Link out": "G",
    DR: "H",
    Keywords: "I",
    "Traffic Tool": "J",
    "Ghi chú": "K",
    "Tình trạng": "L",
    "GP ($)": "S",
    "Text Footer ($)": "T",
    "Text Home ($)": "U",
    "Text Header ($)": "V",
    "HH GP": "W",
    "HH Text": "X",
    "Kê GP": "Y",
    "Kê Text": "Z",
    NCC: "AB",
    "Note NB": "AC",
}

export async function POST(req: Request) {
    try {
        const client = new google.auth.JWT(keys.client_email, undefined, keys.private_key, [
            "https://www.googleapis.com/auth/spreadsheets",
        ])

        await client.authorize()
        const gsapi = google.sheets({ version: "v4", auth: client })

        const body: BulkUpdateRequest = await req.json()
        const { updates, sheetType } = body

        if (!Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ error: "Invalid updates data" }, { status: 400 })
        }

        // Get user info from cookies
        const cookieStore = cookies()
        const userInfo = cookieStore.get("userInfo")
        const username = userInfo ? JSON.parse(userInfo?.value).username : ""
        const role = userInfo ? JSON.parse(userInfo?.value).role : ""

        // Determine sheet names based on sheetType
        const sheetNames = sheetType === 1 ? ["1", "4"] : ["2", "5"]

        // Group updates by range to optimize batch operations
        const rangeUpdates: Record<string, BatchUpdateData> = {}

        for (const update of updates) {
            const { rowIndex, columnUpdates } = update

            // Process each column update
            for (const [columnName, value] of Object.entries(columnUpdates)) {
                const columnLetter = COLUMN_MAPPING[columnName as keyof typeof COLUMN_MAPPING]

                if (!columnLetter) {
                    console.warn(`Unknown column: ${columnName}`)
                    continue
                }

                // Try both sheet names for the update
                for (const sheetName of sheetNames) {
                    const range = `${sheetName}!${columnLetter}${rowIndex}`

                    if (!rangeUpdates[range]) {
                        rangeUpdates[range] = {
                            range,
                            values: [[value === null || value === undefined ? "" : value]],
                        }
                    }
                }
            }
        }

        // Execute batch update
        const batchUpdateData = Object.values(rangeUpdates)

        if (batchUpdateData.length === 0) {
            return NextResponse.json({ error: "No valid updates to process" }, { status: 400 })
        }

        console.log(`[v0] Processing ${batchUpdateData.length} range updates for ${updates.length} row updates`)

        const response = await gsapi.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: "USER_ENTERED",
                data: batchUpdateData,
            },
        })

        // Log successful update
        console.log(`[v0] Bulk update completed successfully: ${response.data.totalUpdatedCells} cells updated`)

        return NextResponse.json(
            {
                success: true,
                updatedCells: response.data.totalUpdatedCells,
                updatedRanges: batchUpdateData.length,
                message: `Successfully updated ${response.data.totalUpdatedCells} cells across ${updates.length} rows`,
            },
            { status: 200 },
        )
    } catch (error: any) {
        console.error("Error in bulk update:", error)
        return NextResponse.json(
            {
                error: true,
                message: error.message || "Unknown error occurred during bulk update",
            },
            { status: 500 },
        )
    }
}
