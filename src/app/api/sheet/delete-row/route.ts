import { google } from "googleapis"
import keys from "../../../../../key.json"
import { NextResponse } from "next/server"
import { sheets_v4 } from "googleapis"

// Mark route as dynamic
export const dynamic = 'force-dynamic'

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"

interface SheetProperties {
    sheetId: number;
    title: string;
}

interface Sheet {
    properties: SheetProperties;
}

export async function POST(req: Request) {
    try {
        const client = new google.auth.JWT(
            keys.client_email,
            undefined,
            keys.private_key,
            ["https://www.googleapis.com/auth/spreadsheets"]
        )

        await client.authorize()
        const gsapi = google.sheets({ version: "v4", auth: client })

        const body = await req.json()
        const { rowIndex, sheetType } = body

        if (typeof rowIndex !== "number" || typeof sheetType !== "number") {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
        }

        // Get sheet metadata to get the correct sheet IDs
        const { data } = await gsapi.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
            fields: 'sheets.properties'
        })

        if (!data.sheets) {
            return NextResponse.json({ error: "No sheets found" }, { status: 404 })
        }

        // Find the correct sheet ID based on sheetType
        const sheetId = sheetType === 1 
            ? data.sheets.find(sheet => sheet.properties?.title === '1')?.properties?.sheetId
            : data.sheets.find(sheet => sheet.properties?.title === '2')?.properties?.sheetId

        if (!sheetId) {
            return NextResponse.json({ error: "Sheet not found" }, { status: 404 })
        }

        // Get the current sheet data to validate row index
        const { data: sheetData } = await gsapi.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetType === 1 ? '1' : '2'}!A:A`,
        })

        // const totalRows = (sheetData.values?.length || 0) + 1 // Add 1 for header row
        // if (rowIndex < 2 || rowIndex > totalRows) { // Row index must be >= 2 (after header) and <= total rows
        //     return NextResponse.json({ error: "Row index out of range" }, { status: 400 })
        // }

        // Delete the row (adjusting for 1-based indexing and header row)
        await gsapi.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId,
                                dimension: "ROWS",
                                startIndex: rowIndex - 1, // Convert to 0-based index
                                endIndex: rowIndex,
                            },
                        },
                    },
                ],
            },
        })

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error: any) {
        console.error("Error deleting row from Google Sheet:", error)
        return NextResponse.json({ error: true, message: error.message }, { status: 500 })
    }
} 