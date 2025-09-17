import { google } from "googleapis"
import keys from "../../../../../key.json"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"

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
