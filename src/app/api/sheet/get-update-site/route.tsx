import { google } from "googleapis"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { cache } from "react"
import keys from "../../../../../key.json"

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"

interface SheetConfig {
    range: string
    formatter: (row: any[], index: number) => Record<string, any>
    spreadsheetId?: string
}

const sheetConfigs: Record<string, SheetConfig> = {
    updateVN: {
        range: "1!B3:AM,4!B3:AM",
        formatter: (row, index) => ({
            rowIndex: index + 3,
            Site: row[0] || "",
            Bóng: row[1] || "", // Added Bóng column mapping
            Bet: row[2] || "", // Added Bet column mapping
            "Chủ đề": row[3] || "",
            Nước: row[4] || "",
            "Link out": row[6] || "",
            DR: row[7] || "",
            Keywords: row[8] || "",
            "Traffic Tool": row[9] || "",
            "Ghi chú": row[10] || "",
            "Tình trạng": row[11] || "",
            "GP ($)": row[17] || 0,
            "Text Footer ($)": row[18] || 0,
            "Text Home ($)": row[19] || 0,
            "Text Header ($)": row[20] || 0,
            "HH GP": row[21] || 0,
            "HH Text": row[22] || 0,
            "Kê GP": row[23] || 0,
            "Kê Text": row[24] || 0,
            MaNCC: row[26] || "",
        }),
        spreadsheetId: SPREADSHEET_ID,
    },
    updateNN: {
        range: "2!B3:AM,5!B3:AM",
        formatter: (row, index) => ({
            rowIndex: index + 3,
            Site: row[0] || "",
            Bóng: row[1] || "", // Added Bóng column mapping for foreign data
            Bet: row[2] || "", // Added Bet column mapping for foreign data
            "Chủ đề": row[3] || "",
            Nước: row[4] || "",
            "Link out": row[6] || "",
            DR: row[7] || "",
            Keywords: row[8] || "",
            "Traffic Tool": row[9] || "",
            "Ghi chú": row[10] || "",
            "Tình trạng": row[11] || "",
            "GP ($)": row[17] || 0,
            "Text Footer ($)": row[18] || 0,
            "Text Home ($)": row[19] || 0,
            "Text Header ($)": row[20] || 0,
            "HH GP": row[21] || 0,
            "HH Text": row[22] || 0,
            "Kê GP": row[23] || 0,
            "Kê Text": row[24] || 0,
            MaNCC: row[26] || "",
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

export async function POST(req: Request) {
    try {
        const cookieStore = cookies()
        const userInfoCookie = cookieStore.get("userInfo")
        const userInfo = userInfoCookie ? JSON.parse(userInfoCookie.value) : {}

        const client = await getAuthClient()
        const gsapi = google.sheets({ version: "v4", auth: client })

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
                filtered = allData.filter((row) => row.MaNCC === userInfo.username)
            }

            results[key] = filtered
        }

        return NextResponse.json(results, { status: 200 })
    } catch (error: any) {
        console.error("Error updateSheets:", error)
        return NextResponse.json({ error: true, message: error.message }, { status: 500 })
    }
}
