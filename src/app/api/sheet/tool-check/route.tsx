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
            const safeRound = (value: any) => {
                if (value === null || value === undefined) return null
                // Check if value is a string that's not a number
                if (typeof value === "string" && isNaN(Number(value))) {
                    return value // Return the string as is
                }
                // Otherwise, treat as number and round
                return Math.round(Number(value))
            }
            const safeSubtract = (a: number, b: number) => (a !== null && b !== null ? Math.round(a - b) : null)

            const giaBanGP = safeRound(row[13])
            const giaBanText = safeRound(row[14])
            const giaBanTextHome = safeRound(row[15])
            const giaBanTextHeader = safeRound(row[16])
            const giaBanGPLio =
                typeof row[13] === "string" && isNaN(Number(row[13])) ? row[13] : safeRound(Number(row[13]) * 1.05)
            const giaBanTextLio =
                typeof row[14] === "string" && isNaN(Number(row[14])) ? row[14] : safeRound(Number(row[14]) * 1.05)
            const giaBanTextHomeLio =
                typeof row[15] === "string" && isNaN(Number(row[15])) ? row[15] : safeRound(Number(row[15]) * 1.05)
            const giaBanTextHeaderLio =
                typeof row[16] === "string" && isNaN(Number(row[16])) ? row[16] : safeRound(Number(row[16]) * 1.05)
            const giaMuaGP = safeRound(row[22])
            const giaMuaText = safeRound(row[23])
            const giaMuaTextHome = safeRound(row[24])
            const giaMuaTextHeader = safeRound(row[25])
            const hoaHongGP = row[26] || 0
            const hoaHongText = row[27] || 0

            const giaCuoiGP =
                typeof row[22] === "string" && isNaN(Number(row[22]))
                    ? row[22]
                    : Math.round((Number(row[22]) * (100 - hoaHongGP)) / 100);

            const giaCuoiText =
                typeof row[23] === "string" && isNaN(Number(row[23]))
                    ? row[23]
                    : Math.round((Number(row[23]) * (100 - hoaHongText)) / 100);

            const giaCuoiTextHome =
                typeof row[24] === "string" && isNaN(Number(row[24]))
                    ? row[24]
                    : Math.round((Number(row[24]) * (100 - hoaHongText)) / 100);

            const giaCuoiTextHeader =
                typeof row[25] === "string" && isNaN(Number(row[25]))
                    ? row[25]
                    : Math.round((Number(row[25]) * (100 - hoaHongText)) / 100);


            const maNCC = row[31]
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
                NCC: row[30],
                MaNCC: maNCC,
                FileNCC: fileNCC,
                GroupNCC: groupNCC,
                IdGroup: idGroup,
                GhiChuNCC: row[32],
                giaCuoiGP,
                giaCuoiText,
                giaCuoiTextHome,
                giaCuoiTextHeader,
                loiNhuanGP:
                    (typeof row[13] === "string" && isNaN(Number(row[13]))) || typeof giaCuoiGP === "string"
                        ? null
                        : safeSubtract(Number(row[13]), giaCuoiGP),
                loiNhuanText:
                    (typeof row[14] === "string" && isNaN(Number(row[14]))) || typeof giaCuoiText === "string"
                        ? null
                        : safeSubtract(Number(row[14]), giaCuoiText),
                loiNhuanTextHome:
                    (typeof row[15] === "string" && isNaN(Number(row[15]))) || typeof giaCuoiTextHome === "string"
                        ? null
                        : safeSubtract(Number(row[15]), giaCuoiTextHome),
                loiNhuanTextHeader:
                    (typeof row[16] === "string" && isNaN(Number(row[16]))) || typeof giaCuoiTextHeader === "string"
                        ? null
                        : safeSubtract(Number(row[16]), giaCuoiTextHeader),
                loiNhuanGPLio:
                    typeof giaBanGPLio === "string" || typeof giaCuoiGP === "string"
                        ? null
                        : safeSubtract(Number(giaBanGPLio), giaCuoiGP),
                loiNhuanTextLio:
                    typeof giaBanTextLio === "string" || typeof giaCuoiText === "string"
                        ? null
                        : safeSubtract(Number(giaBanTextLio), giaCuoiText),
                loiNhuanTextHomeLio:
                    typeof giaBanTextHomeLio === "string" || typeof giaCuoiTextHome === "string"
                        ? null
                        : safeSubtract(Number(giaBanTextHomeLio), giaCuoiTextHome),
                loiNhuanTextHeaderLio:
                    typeof giaBanTextHeaderLio === "string" || typeof giaCuoiTextHeader === "string"
                        ? null
                        : safeSubtract(Number(giaBanTextHeaderLio), giaCuoiTextHeader),
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

