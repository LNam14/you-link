import { google } from "googleapis"
import keys from "../../../../../key.json"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"

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

        // Read a large range to detect first empty rows in column B (Site)
        const startRow = 2
        const endRow = 10000
        const readRange = `${targetSheetName}!B${startRow}:B${endRow}`
        const existingRes = await gsapi.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: readRange,
        })
        // Normalize to fixed-length array so we can scan for empties
        const existingValues: any[] = existingRes.data.values || []
        while (existingValues.length < endRow - startRow + 1) existingValues.push([])

        const isEmptyCell = (cell: any) => {
            if (!cell || (Array.isArray(cell) && cell.length === 0)) return true
            const v = Array.isArray(cell) ? cell[0] : cell
            return v == null || String(v).trim() === ""
        }

        // Build values for each new row and assign to the first empty row sequentially
        type BatchItem = { range: string; values: any[][] }
        const batchData: BatchItem[] = []

        let scanIndex = 0 // index within existingValues
        for (const row of rows) {
            // find the next empty slot
            while (scanIndex < existingValues.length && !isEmptyCell(existingValues[scanIndex])) {
                scanIndex += 1
            }
            const targetRowNumber = startRow + scanIndex
            // mark as used to avoid double-assignment when multiple rows are added
            if (scanIndex < existingValues.length) existingValues[scanIndex] = ["__reserved__"]

            const values = [
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
            ]

            batchData.push({
                range: `${targetSheetName}!A${targetRowNumber}:AB${targetRowNumber}`,
                values: [values],
            })
            scanIndex += 1
        }

        if (batchData.length === 0) {
            return NextResponse.json({ error: "No data to append" }, { status: 400 })
        }

        // Execute batch update to fill empty rows rather than append to end
        const response = await gsapi.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: "USER_ENTERED",
                data: batchData,
            },
        })

        return NextResponse.json({ success: true, updated: response.data.totalUpdatedRows }, { status: 200 })
    } catch (error: any) {
        console.error("Error appending to Google Sheet:", error)
        return NextResponse.json({ error: true, message: error.message }, { status: 500 })
    }
}
