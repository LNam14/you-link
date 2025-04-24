import { google } from "googleapis"
import keys from "../../../../../key.json"
import { NextResponse } from "next/server"

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"

interface SheetConfig {
    range: string
    formatter: (row: any[], allData: Record<string, any[]>) => Record<string, any>
}

const sheetConfigs: Record<string, SheetConfig> = {
    gpTextVN: {
        range: "1!A3:AH,2!A3:AH",
        formatter: (row, allData) => {
            const parseNumber = (value: any) => {
                if (value === null || value === undefined) return null
                if (typeof value === "string") {
                    return Number.parseFloat(value.replace(",", "."))
                }
                return value
            }

            const formatNumber = (value: number | null) =>
                value !== null && !isNaN(value) ? value.toFixed(2).replace(".", ",") : null

            const safeSubtract = (a: number | null, b: number | null) =>
                a !== null && b !== null ? formatNumber(a - b) : null

            const giaBanGP = formatNumber(parseNumber(row[13]))
            const giaBanText = formatNumber(parseNumber(row[14]))
            const giaBanTextHome = formatNumber(parseNumber(row[15]))
            const giaBanTextHeader = formatNumber(parseNumber(row[16]))
            const giaBanGPLio = formatNumber(parseNumber(row[39]))
            const giaBanTextLio = formatNumber(parseNumber(row[40]))
            const giaBanTextHomeLio = formatNumber(parseNumber(row[41]))
            const giaBanTextHeaderLio = formatNumber(parseNumber(row[42]))
            const giaMuaGP = formatNumber(parseNumber(row[18]))
            const giaMuaText = formatNumber(parseNumber(row[19]))
            const giaMuaTextHome = formatNumber(parseNumber(row[20]))
            const giaMuaTextHeader = formatNumber(parseNumber(row[21]))
            const hoaHongGP = parseNumber(row[22]) || 0
            const hoaHongText = parseNumber(row[23]) || 0

            const giaCuoiGP = formatNumber((parseNumber(row[18]) * (100 - hoaHongGP)) / 100)
            const giaCuoiText = formatNumber((parseNumber(row[19]) * (100 - hoaHongText)) / 100)
            const giaCuoiTextHome = formatNumber((parseNumber(row[20]) * (100 - hoaHongText)) / 100)
            const giaCuoiTextHeader = formatNumber((parseNumber(row[21]) * (100 - hoaHongText)) / 100)

            const maNCC = row[27]
            let fileNCC = ""
            let groupNCC = ""
            let idGroup = ""

            if (maNCC && allData.ncc) {
                const matchingNCC = allData.ncc.find((nccRow) => nccRow.MaNCC === maNCC)
                if (matchingNCC) {
                    fileNCC = matchingNCC.FileNCC
                    groupNCC = matchingNCC.GroupNCC
                    idGroup = matchingNCC.IdGroup
                }
            }

            return {
                cs: row[0],
                site: row[1],
                bong: row[2],
                bet: row[3],
                chuDe: row[4],
                DR: row[8],
                trafficTool: row[10],
                ghiChu: row[11],
                tinhTrang: row[12],
                giaBanGP,
                giaBanText,
                timeText: 1,
                giaBanTextHome,
                giaBanTextHeader,
                giaBanGPLio,
                giaBanTextLio,
                giaBanTextHomeLio,
                giaBanTextHeaderLio,
                giaMuaGP,
                giaMuaText,
                hoaHongGP,
                hoaHongText,
                giaMuaTextHome,
                giaMuaTextHeader,
                NCC: row[26],
                MaNCC: maNCC,
                FileNCC: fileNCC,
                GroupNCC: groupNCC,
                IdGroup: idGroup,
                GhiChuNCC: row[28],
                giaCuoiGP,
                giaCuoiText,
                giaCuoiTextHome,
                giaCuoiTextHeader,
                loiNhuanGP: safeSubtract(parseNumber(row[13]), parseNumber(giaCuoiGP)),
                loiNhuanText: safeSubtract(parseNumber(row[14]), parseNumber(giaCuoiText)),
                loiNhuanTextHome: safeSubtract(parseNumber(row[15]), parseNumber(giaCuoiTextHome)),
                loiNhuanTextHeader: safeSubtract(parseNumber(row[16]), parseNumber(giaCuoiTextHeader)),
                loiNhuanGPLio: safeSubtract(parseNumber(giaBanGPLio), parseNumber(giaCuoiGP)),
                loiNhuanTextLio: safeSubtract(parseNumber(giaBanTextLio), parseNumber(giaCuoiText)),
                loiNhuanTextHomeLio: safeSubtract(parseNumber(giaBanTextHomeLio), parseNumber(giaCuoiTextHome)),
                loiNhuanTextHeaderLio: safeSubtract(parseNumber(giaBanTextHeaderLio), parseNumber(giaCuoiTextHeader)),
            }
        },
    },
    ncc: {
        range: "NCC!A3:K",
        formatter: (row) => ({
            MaNCC: row[0],
            FileNCC: row[8] || "",
            GroupNCC: row[9] || "",
            IdGroup: row[10] || "",
        }),
    },
}

async function getAllSheetData(gsapi: any) {
    const ranges = Object.values(sheetConfigs).flatMap((config) => config.range.split(",").map((range) => range.trim()))

    const { data } = await gsapi.spreadsheets.values.batchGet({
        spreadsheetId: SPREADSHEET_ID,
        ranges: ranges,
    })

    const rawData: Record<string, any[]> = {}
    let currentIndex = 0

    for (const [key, config] of Object.entries(sheetConfigs)) {
        const numRanges = config.range.split(",").length
        rawData[key] = data.valueRanges
            .slice(currentIndex, currentIndex + numRanges)
            .flatMap((range: any) => range.values || [])
        currentIndex += numRanges
    }

    return rawData
}

export async function POST(req: Request) {
    try {
        const client = new google.auth.JWT(keys.client_email, undefined, keys.private_key, [
            "https://www.googleapis.com/auth/spreadsheets",
        ])

        await client.authorize()

        const gsapi = google.sheets({ version: "v4", auth: client })

        const rawData = await getAllSheetData(gsapi)

        const nccData = rawData.ncc ? rawData.ncc.map((row) => sheetConfigs.ncc.formatter(row, rawData)) : []

        const formattedData: Record<string, any[]> = { ncc: nccData }

        for (const [key, config] of Object.entries(sheetConfigs)) {
            if (key !== "ncc") {
                formattedData[key] = rawData[key].map((row) => config.formatter(row, { ...rawData, ncc: nccData }))
            }
        }

        return NextResponse.json(formattedData, { status: 200 })
    } catch (e: any) {
        console.error("Error accessing Google Sheets API:", e)
        return NextResponse.json({ error: true, message: e.message }, { status: 500 })
    }
}
