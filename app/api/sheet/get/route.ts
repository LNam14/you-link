import { google } from "googleapis"
import { NextResponse } from "next/server"

// Ensure Node.js runtime and allow longer execution to avoid 504 timeouts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const SPREADSHEET_ID = "19grUhpM5EhCMj7wXPnzZlShsy3qbljUIA5XWsFSBjuY"

// Cache auth client để tránh tạo lại mỗi lần (giữ lại vì không ảnh hưởng dữ liệu)
let cachedAuthClient: any = null
let authClientExpiry = 0
const AUTH_CLIENT_TTL = 50 * 60 * 1000 // 50 phút

// Cleanup auth client định kỳ
if (typeof setInterval !== "undefined") {
    setInterval(() => {
        const now = Date.now()
        if (cachedAuthClient && authClientExpiry < now) {
            cachedAuthClient = null
        }
    }, 60000)
}

interface SheetConfig {
    range: string
    formatter: (row: any[], allData: Record<string, any> & { nccMap?: Map<string, any> }, index: number) => Record<string, any>
}

const sheetConfigs: Record<string, SheetConfig> = {
    gpTextVN: {
        range: "VN!A3:V, NN!A3:V",
        formatter: (row, allData, index) => {
            const parseNumber = (value: any) => {
                if (value === null || value === undefined || value === "") return null
                if (typeof value === "number") return value
                if (typeof value === "string") {
                    const trimmed = value.trim()
                    let cleaned = trimmed
                        .replace(/\s/g, "")
                        .replace(/,/g, ".")

                    const dotCount = (cleaned.match(/\./g) || []).length
                    if (dotCount > 1) {
                        const lastDotIndex = cleaned.lastIndexOf(".")
                        cleaned = cleaned.substring(0, lastDotIndex).replace(/\./g, "") + cleaned.substring(lastDotIndex)
                    }

                    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
                        return null
                    }

                    const parsed = Number.parseFloat(cleaned)
                    if (!isNaN(parsed) && isFinite(parsed)) {
                        return parsed
                    }
                    return null
                }
                return null
            }

            const formatNumberOrKeepText = (originalValue: any, parsedNum: number | null): string | null => {
                if (parsedNum !== null && !isNaN(parsedNum)) {
                    return parsedNum.toString().replace(".", ",")
                }
                if (originalValue !== null && originalValue !== undefined && originalValue !== "") {
                    return String(originalValue).trim()
                }
                return null
            }

            const formatNumber = (value: number | null) =>
                value !== null && !isNaN(value) ? value.toString().replace(".", ",") : null

            const safeSubtract = (a: number | null, b: number | null) =>
                a !== null && b !== null ? formatNumber(a - b) : null

            const giaBanGPNum = parseNumber(row[9])
            const giaBanTextNum = parseNumber(row[10])
            const giaBanTextHomeNum = parseNumber(row[11])
            const giaBanTextHeaderNum = parseNumber(row[12])
            const hoaHongGPNum = parseNumber(row[20])
            const hoaHongTextNum = parseNumber(row[21])
            const hoaHongGP = hoaHongGPNum ?? 0
            const hoaHongText = hoaHongTextNum ?? 0
            const giaMuaGPNum = parseNumber(row[15])
            const giaMuaTextNum = parseNumber(row[16])
            const giaMuaTextHomeNum = parseNumber(row[17])
            const giaMuaTextHeaderNum = parseNumber(row[18])

            const giaBanGP = formatNumberOrKeepText(row[9], giaBanGPNum)
            const giaBanText = formatNumberOrKeepText(row[10], giaBanTextNum)
            const giaBanTextHome = formatNumberOrKeepText(row[11], giaBanTextHomeNum)
            const giaBanTextHeader = formatNumberOrKeepText(row[12], giaBanTextHeaderNum)
            const giaMuaGP = formatNumberOrKeepText(row[15], giaMuaGPNum)
            const giaMuaText = formatNumberOrKeepText(row[16], giaMuaTextNum)
            const giaMuaTextHome = formatNumberOrKeepText(row[17], giaMuaTextHomeNum)
            const giaMuaTextHeader = formatNumberOrKeepText(row[18], giaMuaTextHeaderNum)

            const calcGiaCuoi = (costNum: number | null, commissionPercent: number | null) => {
                if (costNum === null) return null
                const percent = commissionPercent ?? 0
                return costNum - (costNum * percent / 100)
            }

            const giaCuoiGPNum = calcGiaCuoi(giaMuaGPNum, hoaHongGPNum)
            const giaCuoiTextNum = calcGiaCuoi(giaMuaTextNum, hoaHongTextNum)
            const giaCuoiTextHomeNum = calcGiaCuoi(giaMuaTextHomeNum, hoaHongTextNum)
            const giaCuoiTextHeaderNum = calcGiaCuoi(giaMuaTextHeaderNum, hoaHongTextNum)

            const giaCuoiGP = formatNumber(giaCuoiGPNum)
            const giaCuoiText = formatNumber(giaCuoiTextNum)
            const giaCuoiTextHome = formatNumber(giaCuoiTextHomeNum)
            const giaCuoiTextHeader = formatNumber(giaCuoiTextHeaderNum)

            const maNCC = row[13]
            let fileNCC = ""
            let groupNCC = ""
            let idGroup = ""

            if (maNCC) {
                const matchingNCC = allData.nccMap?.get(maNCC) ||
                    (allData.ncc ? allData.ncc.find((nccRow: any) => nccRow.MaNCC === maNCC) : null)
                if (matchingNCC) {
                    fileNCC = matchingNCC.FileNCC
                    groupNCC = matchingNCC.GroupNCC
                    idGroup = matchingNCC.IdGroup
                }
            }

            return {
                cs: row[0],
                site: row[1],
                chuDe: row[2],
                linkOut: row[3],
                DR: row[4],
                keywords: row[5],
                trafficTool: row[6],
                noteKH: row[7],
                tinhTrang: row[8],
                timeText: 1,
                hoaHongGP: hoaHongGP || 0,
                hoaHongText: hoaHongText || 0,
                giaBanGP,
                giaBanText,
                giaBanTextHome,
                giaBanTextHeader,
                giaMuaGP,
                giaMuaText,
                giaMuaTextHome,
                giaMuaTextHeader,
                giaCuoiGP: giaCuoiGP || 0,
                giaCuoiText: giaCuoiText || 0,
                giaCuoiTextHome: giaCuoiTextHome || 0,
                giaCuoiTextHeader: giaCuoiTextHeader || 0,
                loiNhuanGP: safeSubtract(giaBanGPNum, giaCuoiGPNum),
                loiNhuanText: safeSubtract(giaBanTextNum, giaCuoiTextNum),
                loiNhuanTextHome: safeSubtract(giaBanTextHomeNum, giaCuoiTextHomeNum),
                loiNhuanTextHeader: safeSubtract(giaBanTextHeaderNum, giaCuoiTextHeaderNum),
                NCC: row[14],
                MaNCC: maNCC,
                keThem: row[19],
                FileNCC: fileNCC,
                GroupNCC: groupNCC,
                sheetName: (row as any)._sheetName ?? "VN",
                rowIndex: index,
            }
        },
    },
    ncc: {
        range: "NCCVN!A3:L",
        formatter: (row, allData, index) => ({
            MaNCC: row[0],
            FileNCC: row[10] || "",
            GroupNCC: row[11] || "",
        }),
    },
}

async function getAuthClient() {
    const now = Date.now()

    if (cachedAuthClient && authClientExpiry > now) {
        return cachedAuthClient
    }

    const authStart = Date.now()
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL?.trim()
    const privateKeyRaw = process.env.GOOGLE_SHEETS_PRIVATE_KEY

    if (!clientEmail || !privateKeyRaw) {
        throw new Error("Missing Google Sheets credentials. Please set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY in .env.local")
    }

    let privateKey = privateKeyRaw.trim()
    if (
        (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
        (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
        privateKey = privateKey.slice(1, -1)
    }
    privateKey = privateKey.replace(/\\n/g, "\n").replace(/\r\n/g, "\n")

    const client = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.readonly",
        ],
    })

    try {
        await client.authorize()
    } catch (err: any) {
        const msg = String(err?.message || err)
        if (msg.includes("invalid_grant") && msg.toLowerCase().includes("invalid jwt signature")) {
            throw new Error(
                [
                    "Google auth failed: invalid_grant: Invalid JWT Signature.",
                    "This almost always means your service-account credentials do not match:",
                    "- GOOGLE_SHEETS_CLIENT_EMAIL must be from the same service account as the private key",
                    "- GOOGLE_SHEETS_PRIVATE_KEY must be copied exactly from the JSON key (regenerate a new key if unsure)",
                    "- Ensure the key is not revoked and your machine clock is correct",
                ].join("\n")
            )
        }
        throw err
    }
    console.log(`[sheet/get] Auth time: ${Date.now() - authStart}ms`)

    cachedAuthClient = client
    authClientExpiry = now + AUTH_CLIENT_TTL

    return client
}

async function getAllSheetData(gsapi: any) {
    const fetchStart = Date.now()
    const allRanges: string[] = []
    const rangeToConfig: Map<string, string> = new Map()

    for (const [key, config] of Object.entries(sheetConfigs)) {
        const ranges = config.range.split(",").map((range) => range.trim())
        ranges.forEach(range => {
            allRanges.push(range)
            rangeToConfig.set(range, key)
        })
    }

    const { data } = await gsapi.spreadsheets.values.batchGet({
        spreadsheetId: SPREADSHEET_ID,
        ranges: allRanges,
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
    })

    const fetchTime = Date.now() - fetchStart
    const totalRows = data.valueRanges?.reduce((sum: number, range: any) => sum + (range.values?.length || 0), 0) || 0
    console.log(`[sheet/get] Fetch all data: ${fetchTime}ms (${allRanges.length} ranges, ${totalRows} rows)`)

    const allData: Record<string, any[]> = {}

    for (const key of Object.keys(sheetConfigs)) {
        allData[key] = []
    }

    if (data.valueRanges) {
        for (let i = 0; i < data.valueRanges.length; i++) {
            const range = data.valueRanges[i]
            const requestedRange = allRanges[i]
            const configKey = rangeToConfig.get(requestedRange)

            if (configKey && range.values) {
                const sheetNameMatch = requestedRange.match(/^([^!]+)!/)
                const sheetName = sheetNameMatch ? sheetNameMatch[1] : null

                const startRowMatch = requestedRange.match(/![A-Z]+(\d+)/)
                const startRow = startRowMatch ? parseInt(startRowMatch[1], 10) : 1

                const rowsWithSheetName = range.values.map((row: any[]) => {
                    const normalizedRow = [...row]
                    while (normalizedRow.length < 43) {
                        normalizedRow.push("")
                    }
                    const rowWithMeta = normalizedRow as any
                    rowWithMeta._sheetName = sheetName
                    rowWithMeta._startRow = startRow
                    return rowWithMeta
                })

                allData[configKey].push(...rowsWithSheetName)
            }
        }
    }

    return allData
}

export async function GET(req: Request) {
    const startTime = Date.now()
    try {
        const apiKeyHeader = req.headers.get("x-api-key")?.trim()
        const expectedApiKey = (process.env.SHEET_TOOL_API_KEY || process.env.NEXT_PUBLIC_TOOL_API_KEY || "").trim()

        if (expectedApiKey && apiKeyHeader !== expectedApiKey) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const client = await getAuthClient()
        const gsapi = google.sheets({ version: "v4", auth: client })

        const fetchStart = Date.now()
        const rawData = await getAllSheetData(gsapi)
        console.log(`[sheet/get] Fetch data time: ${Date.now() - fetchStart}ms`)

        const nccData = rawData.ncc ? rawData.ncc.map((row, index) =>
            sheetConfigs.ncc.formatter(row, rawData, index)
        ) : []

        const nccMap = new Map<string, typeof nccData[0]>()
        for (const nccItem of nccData) {
            if (nccItem.MaNCC) nccMap.set(nccItem.MaNCC, nccItem)
        }

        const formattedData: Record<string, any[]> = { ncc: nccData }

        const formatStart = Date.now()
        const dependencyData = { ...rawData, ncc: nccData, nccMap }
        const CHUNK_SIZE = 5000

        for (const [key, config] of Object.entries(sheetConfigs)) {
            if (key !== "ncc" && rawData[key]) {
                const keyStart = Date.now()
                const rows = rawData[key]
                const result: any[] = []
                const sheetRowCounters = new Map<string, number>()

                for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                    const chunk = rows.slice(i, i + CHUNK_SIZE)
                    const chunkResult = chunk.map((row: any) => {
                        const sheetName = row._sheetName ?? "VN"
                        const startRow = row._startRow || 3

                        if (!sheetRowCounters.has(sheetName)) sheetRowCounters.set(sheetName, 0)
                        const sheetIndex = sheetRowCounters.get(sheetName)!
                        sheetRowCounters.set(sheetName, sheetIndex + 1)

                        return config.formatter(row, dependencyData, startRow + sheetIndex)
                    })
                    result.push(...chunkResult)

                    if (i + CHUNK_SIZE < rows.length) {
                        await new Promise(resolve => setImmediate(resolve))
                    }
                }

                formattedData[key] = key === "gpTextVN"
                    ? result.filter(item => item.tinhTrang?.trim() === "Bình thường")
                    : result

                console.log(`[sheet/get] Process ${key} time: ${Date.now() - keyStart}ms (${rows.length} rows)`)
            }
        }
        console.log(`[sheet/get] Total format time: ${Date.now() - formatStart}ms`)
        console.log(`[sheet/get] Total time: ${Date.now() - startTime}ms`)

        return NextResponse.json(formattedData, {
            status: 200,
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Pragma": "no-cache",
            },
        })
    } catch (e: any) {
        console.error("Error accessing Google Sheets API:", e)
        cachedAuthClient = null
        authClientExpiry = 0
        return NextResponse.json({ error: true, message: e.message }, { status: 500 })
    }
}