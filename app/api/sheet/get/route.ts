import { google } from "googleapis"
import { NextResponse } from "next/server"

// Ensure Node.js runtime and allow longer execution to avoid 504 timeouts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"
const NOTE_NCC_SPREADSHEET_ID = "1lHvMKhH98XfhbmUHhsVTHM5N6bt_fzpptK7HR2gX1UI"

import { sheetCache, getCacheKey, getCachedData, setCachedData, CACHE_DURATION, invalidateAllCache } from "@/lib/cache/sheetCache"

// Cache auth client để tránh tạo lại mỗi lần
let cachedAuthClient: any = null
let authClientExpiry = 0
const AUTH_CLIENT_TTL = 50 * 60 * 1000 // 50 phút
let lastModifiedTime: string | null = null
let lastModifiedCheckedAt = 0
const MODIFIED_TIME_CHECK_INTERVAL = 15 * 1000 // 15 giây
let noteNCCCache: Map<string, string> | null = null
let noteNCCCacheExpiry = 0
const NOTE_NCC_CACHE_TTL = 5 * 60 * 1000 // 5 phút

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
    formatter: (row: any[], allData: Record<string, any> & { nccMap?: Map<string, any>; noteNCCMap?: Map<string, string> }, index: number) => Record<string, any>
}

const sheetConfigs: Record<string, SheetConfig> = {
    gpTextVN: {
        range: "1!A3:AQ,2!A3:AQ,4!A3:AQ,5!A3:AQ",
        formatter: (row, allData, index) => {
            // Parse number from formatted value (e.g., "74" from 74.4 displayed as 74)
            // Keep text values like "ngưng" as-is
            const parseNumber = (value: any) => {
                if (value === null || value === undefined || value === "") return null
                if (typeof value === "number") return value
                if (typeof value === "string") {
                    const trimmed = value.trim()
                    // If it's a text value (not a number), return null to keep original value
                    // Try to parse as number first
                    // Handle formatted numbers: remove thousand separators (spaces, commas) and convert decimal comma to dot
                    let cleaned = trimmed
                        .replace(/\s/g, "") // Remove spaces
                        .replace(/,/g, ".") // Convert comma to dot for decimal
                    
                    // If there are multiple dots, it might be thousand separator (e.g., "1.234.56")
                    // Keep only the last dot as decimal separator
                    const dotCount = (cleaned.match(/\./g) || []).length
                    if (dotCount > 1) {
                        const lastDotIndex = cleaned.lastIndexOf(".")
                        cleaned = cleaned.substring(0, lastDotIndex).replace(/\./g, "") + cleaned.substring(lastDotIndex)
                    }

                    // Only treat as number if the whole cleaned string is a pure number
                    // (e.g., "301" or "301.5"). If it contains any letters/text like "k bán"
                    // then return null so that we keep the original text.
                    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
                        return null
                    }

                    const parsed = Number.parseFloat(cleaned)
                    // If parsed successfully and is a valid number, return it
                    if (!isNaN(parsed) && isFinite(parsed)) {
                        return parsed
                    }
                    // If not a number, return null to keep original string value
                    return null
                }
                return null
            }

            // Format number or keep original text value (e.g., "ngưng")
            const formatNumberOrKeepText = (originalValue: any, parsedNum: number | null): string | null => {
                if (parsedNum !== null && !isNaN(parsedNum)) {
                    // It's a number, format it
                    return parsedNum.toString().replace(".", ",")
                }
                // It's not a number, keep original text value if it exists
                if (originalValue !== null && originalValue !== undefined && originalValue !== "") {
                    return String(originalValue).trim()
                }
                return null
            }

            const formatNumber = (value: number | null) =>
                value !== null && !isNaN(value) ? value.toString().replace(".", ",") : null

            const safeSubtract = (a: number | null, b: number | null) =>
                a !== null && b !== null ? formatNumber(a - b) : null

            const roundIfNumber = (value: any) => {
                // Optimize: check type first before parsing
                if (typeof value === "number") return value
                const num = parseNumber(value)
                if (num === null) return value
                return num
            }

            // Optimize: Parse numbers once and reuse
            const giaBanGPNum = parseNumber(row[31])
            const giaBanTextNum = parseNumber(row[32])
            const giaBanTextHomeNum = parseNumber(row[33])
            const giaBanTextHeaderNum = parseNumber(row[34])
            const giaMuaGPNum = parseNumber(row[16])
            const giaMuaTextNum = parseNumber(row[17])
            const giaMuaTextHomeNum = parseNumber(row[18])
            const giaMuaTextHeaderNum = parseNumber(row[19])
            const hoaHongGP = parseNumber(row[20]) || 0
            const hoaHongText = parseNumber(row[21]) || 0
            const giaCuoiGPNum = parseNumber(row[27])
            const giaCuoiTextNum = parseNumber(row[28])
            const giaCuoiTextHomeNum = parseNumber(row[29])
            const giaCuoiTextHeaderNum = parseNumber(row[30])

            // Convert numbers to formatted strings or keep original text (e.g., "ngưng")
            const giaBanGP = formatNumberOrKeepText(row[31], giaBanGPNum)
            const giaBanText = formatNumberOrKeepText(row[32], giaBanTextNum)
            const giaBanTextHome = formatNumberOrKeepText(row[33], giaBanTextHomeNum)
            const giaBanTextHeader = formatNumberOrKeepText(row[34], giaBanTextHeaderNum)
            const giaMuaGP = formatNumberOrKeepText(row[16], giaMuaGPNum)
            const giaMuaText = formatNumberOrKeepText(row[17], giaMuaTextNum)
            const giaMuaTextHome = formatNumberOrKeepText(row[18], giaMuaTextHomeNum)
            const giaMuaTextHeader = formatNumberOrKeepText(row[19], giaMuaTextHeaderNum)
            const giaCuoiGP = formatNumberOrKeepText(row[27], giaCuoiGPNum)
            const giaCuoiText = formatNumberOrKeepText(row[28], giaCuoiTextNum)
            const giaCuoiTextHome = formatNumberOrKeepText(row[29], giaCuoiTextHomeNum)
            const giaCuoiTextHeader = formatNumberOrKeepText(row[30], giaCuoiTextHeaderNum)

            // Parse multipliers from row[36] to row[39]
            const multiplierGP = parseNumber(row[36]) || 0
            const multiplierText = parseNumber(row[37]) || 0
            const multiplierTextHome = parseNumber(row[38]) || 0
            const multiplierTextHeader = parseNumber(row[39]) || 0

            // Calculate giaBanX values: giaBan * (100 + multiplier) / 100
            // If giaBan is text (not a number), keep the original text value
            const giaBanGPX = giaBanGPNum !== null 
                ? formatNumber(giaBanGPNum * (100 + multiplierGP) / 100) 
                : formatNumberOrKeepText(row[31], null)
            const giaBanTextX = giaBanTextNum !== null 
                ? formatNumber(giaBanTextNum * (100 + multiplierText) / 100) 
                : formatNumberOrKeepText(row[32], null)
            const giaBanTextHomeX = giaBanTextHomeNum !== null 
                ? formatNumber(giaBanTextHomeNum * (100 + multiplierTextHome) / 100) 
                : formatNumberOrKeepText(row[33], null)
            const giaBanTextHeaderX = giaBanTextHeaderNum !== null 
                ? formatNumber(giaBanTextHeaderNum * (100 + multiplierTextHeader) / 100) 
                : formatNumberOrKeepText(row[34], null)
            
            const maNCC = row[25]
            let fileNCC = ""
            let groupNCC = ""
            let idGroup = ""
            let noteNCC = row[13] || "" // Default to existing noteNCC from row

            if (maNCC) {
                const matchingNCC = allData.nccMap?.get(maNCC) || 
                    (allData.ncc ? allData.ncc.find((nccRow: any) => nccRow.MaNCC === maNCC) : null)
                if (matchingNCC) {
                    fileNCC = matchingNCC.FileNCC
                    groupNCC = matchingNCC.GroupNCC
                    idGroup = matchingNCC.IdGroup
                }
                
                // Get NoteNCC from external sheet if available
                if (allData.noteNCCMap?.has(maNCC)) {
                    const noteFromSheet = allData.noteNCCMap.get(maNCC)
                    if (noteFromSheet) {
                        noteNCC = noteFromSheet
                    }
                }
            }

            // Debug: Log row length và các giá trị để kiểm tra cấu trúc
            // Nếu row.length < 11, có thể các cột bị thiếu
            // Map các giá trị với fallback để tránh undefined
            return {
                cs: row[0],
                site: row[1],
                bong: row[2],
                bet: row[3],
                chuDe: row[4],
                nuoc: row[5],
                ngay: row[6],
                linkOut:row[7],
                DR: row[8],
                keywords: row[9],
                trafficTool: row[10],
                noteKH: row[11],
                noteNB:row[12],
                noteNCC: noteNCC,
                tinhTrang: row[14],             
                timeText: 1,
                hoaHongGP: hoaHongGP || 0,
                hoaHongText: hoaHongText || 0,
                KeGP: roundIfNumber(row[22]),
                KeText: roundIfNumber(row[23]),
                giaBanGP,
                giaBanText,
                giaBanTextHome,
                giaBanTextHeader,
                giaBanGPX,
                giaBanTextX,
                giaBanTextHomeX,
                giaBanTextHeaderX,
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
                NCC: row[24],
                MaNCC: maNCC,
                FileNCC: fileNCC,
                GroupNCC: groupNCC,
                IdGroup: idGroup,
                tiGiaXGP: formatNumberOrKeepText(row[36], parseNumber(row[36])),
                tiGiaXFooter: formatNumberOrKeepText(row[37], parseNumber(row[37])),
                tiGiaHome: formatNumberOrKeepText(row[38], parseNumber(row[38])),
                tiGiaHeader: formatNumberOrKeepText(row[39], parseNumber(row[39])),
                sheetName: (row as any)._sheetName || undefined,
                rowIndex: index,
            }
        },
    },
    ncc: {
        range: "NCC!A3:K,NCC!AR3:BA",
        formatter: (row, allData, index) => ({
            MaNCC: row[0],
            FileNCC: row[7] || "",
            GroupNCC: row[8] || "",
            IdGroup: row[9] || "",
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

    // Normalize common .env formats:
    // - keys stored with surrounding quotes: "-----BEGIN PRIVATE KEY-----\n..."
    // - escaped newlines: \n
    // - Windows CRLF: \r\n
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
        // Surface a more actionable message for the common service-account misconfig.
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

async function getSpreadsheetModifiedTime(authClient: any): Promise<string | null> {
    try {
        const drive = google.drive({ version: "v3", auth: authClient })
        const resp = await drive.files.get({
            fileId: SPREADSHEET_ID,
            fields: "modifiedTime",
            supportsAllDrives: true,
        })
        return resp.data.modifiedTime || null
    } catch (error) {
        console.warn("[sheet/get] Unable to read modifiedTime, skipping cache reset", error)
        return null
    }
}

async function getSpreadsheetModifiedTimeCached(authClient: any, forceRefresh: boolean): Promise<string | null> {
    const now = Date.now()
    const shouldCheck =
        forceRefresh ||
        !lastModifiedTime ||
        now - lastModifiedCheckedAt > MODIFIED_TIME_CHECK_INTERVAL

    if (!shouldCheck) {
        return lastModifiedTime
    }

    const modifiedTime = await getSpreadsheetModifiedTime(authClient)
    lastModifiedCheckedAt = now

    if (modifiedTime && lastModifiedTime && modifiedTime !== lastModifiedTime) {
        invalidateAllCache()
        console.log("[sheet/get] Sheet modifiedTime changed, cache invalidated")
    }
    if (modifiedTime) {
        lastModifiedTime = modifiedTime
    }

    return modifiedTime || lastModifiedTime
}

async function getNoteNCCData(gsapi: any): Promise<Map<string, string>> {
    const now = Date.now()
    if (noteNCCCache && noteNCCCacheExpiry > now) {
        return noteNCCCache
    }

    try {
        const { data } = await gsapi.spreadsheets.values.batchGet({
            spreadsheetId: NOTE_NCC_SPREADSHEET_ID,
            ranges: ["C4!A3:G", "C4!D3:F"],
            valueRenderOption: "UNFORMATTED_VALUE",
        })

        const noteNCCMap = new Map<string, string>()

        const primaryRangeValues = data.valueRanges?.[0]?.values || []
        const secondaryRangeValues = data.valueRanges?.[1]?.values || []

        if (primaryRangeValues.length > 0) {
            const startIndex =
                primaryRangeValues[0] &&
                primaryRangeValues[0][0] &&
                String(primaryRangeValues[0][0]).toLowerCase().includes("mancc")
                    ? 1
                    : 0

            for (let i = startIndex; i < primaryRangeValues.length; i++) {
                const row = primaryRangeValues[i]
                if (!row || !row[0]) continue

                const maNCC = String(row[0]).trim() // A = MaNCC
                const noteNCC = row[1] ? String(row[1]).trim() : "" // B = NoteNCC
                if (maNCC) noteNCCMap.set(maNCC, noteNCC)
            }
        }

        if (secondaryRangeValues.length > 0) {
            const startIndex =
                secondaryRangeValues[0] &&
                secondaryRangeValues[0][0] &&
                String(secondaryRangeValues[0][0]).toLowerCase().includes("mancc")
                    ? 1
                    : 0

            for (let i = startIndex; i < secondaryRangeValues.length; i++) {
                const row = secondaryRangeValues[i]
                if (!row || !row[0]) continue

                const maNCC = String(row[0]).trim() // D = MaNCC in D3:F range
                const noteNCC = row[1] ? String(row[1]).trim() : "" // E = NoteNCC
                if (maNCC) noteNCCMap.set(maNCC, noteNCC)
            }
        }
        
        noteNCCCache = noteNCCMap
        noteNCCCacheExpiry = now + NOTE_NCC_CACHE_TTL
        console.log(`[sheet/get] Loaded ${noteNCCMap.size} NoteNCC entries from external sheet`)
        return noteNCCMap
    } catch (error) {
        console.warn("[sheet/get] Failed to fetch NoteNCC data from external sheet:", error)
        return noteNCCCache || new Map<string, string>()
    }
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

    // Use UNFORMATTED_VALUE to get original values from sheet (not rounded/formatted)
    // This ensures we get the actual price values before any rounding for display
    const { data } = await gsapi.spreadsheets.values.batchGet({
        spreadsheetId: SPREADSHEET_ID,
        ranges: allRanges,
        valueRenderOption: "UNFORMATTED_VALUE", // Get original unformatted values (not rounded)
        // Keep numeric cells as numbers, but return date/datetime cells as formatted strings.
        // This avoids Google Sheets serial dates like 46049 in API response.
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
                // Extract sheet name from range (e.g., "1!A3:AQ" -> "1")
                const sheetNameMatch = requestedRange.match(/^(\d+)!/)
                const sheetName = sheetNameMatch ? sheetNameMatch[1] : null
                
                // Extract starting row number from range (e.g., "A3" -> 3)
                const startRowMatch = requestedRange.match(/![A-Z]+(\d+)/)
                const startRow = startRowMatch ? parseInt(startRowMatch[1], 10) : 1
                
                // Normalize rows to ensure they have enough columns (AQ = 43 columns, 0-indexed = 42)
                // Google Sheets API may return shorter arrays if rows have fewer columns
                const rowsWithSheetName = range.values.map((row: any[]) => {
                    // Ensure row has at least 43 columns (0-42 index) by padding with empty strings
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
        // Simple API key guard to tránh lộ dữ liệu khi endpoint công khai
        const apiKeyHeader = req.headers.get("x-api-key")?.trim()
        // Ưu tiên key riêng cho server, fallback sang key public để tránh mismatch cấu hình
        const expectedApiKey = (process.env.SHEET_TOOL_API_KEY || process.env.NEXT_PUBLIC_TOOL_API_KEY || "").trim()

        if (expectedApiKey && apiKeyHeader !== expectedApiKey) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const url = new URL(req.url)
        const forceRefresh = url.searchParams.get("revalidate") === "1"
        
        const client = await getAuthClient()
        const modifiedTime = await getSpreadsheetModifiedTimeCached(client, forceRefresh)
        const responseEtag = modifiedTime ? `W/"sheet-get-${modifiedTime}"` : undefined
        const ifNoneMatch = req.headers.get("if-none-match")

        // Cache key gắn kèm modifiedTime để tự động thay đổi khi sheet thay đổi
        const cacheKeySuffix = modifiedTime ? `get-${modifiedTime}` : "get"
        const cacheKey = getCacheKey(SPREADSHEET_ID, cacheKeySuffix)
        
        if (!forceRefresh) {
            if (responseEtag && ifNoneMatch && ifNoneMatch === responseEtag) {
                return new NextResponse(null, {
                    status: 304,
                    headers: {
                        ETag: responseEtag,
                    },
                })
            }

            const cached = getCachedData(cacheKey)
            if (cached) {
                console.log(`[sheet/get] Cache hit - ${Date.now() - startTime}ms`)
                return NextResponse.json(cached, {
                    status: 200,
                    headers: {
                        ...(responseEtag ? { ETag: responseEtag } : {}),
                        "Cache-Control": "private, max-age=600, stale-while-revalidate=1200",
                        "CDN-Cache-Control": "public, max-age=600",
                    },
                })
            }
        }

        const gsapi = google.sheets({ version: "v4", auth: client })

        const fetchStart = Date.now()
        const [rawData, noteNCCMap] = await Promise.all([
            getAllSheetData(gsapi),
            getNoteNCCData(gsapi),
        ])
        console.log(`[sheet/get] Fetch data time: ${Date.now() - fetchStart}ms`)

        const nccStart = Date.now()
        const nccData = rawData.ncc ? rawData.ncc.map((row, index) => {
            // Calculate rowIndex: index + 3 (data starts at row 3)
            return sheetConfigs.ncc.formatter(row, rawData, index)
        }) : []

        const nccMap = new Map<string, typeof nccData[0]>()
        for (const nccItem of nccData) {
            if (nccItem.MaNCC) {
                nccMap.set(nccItem.MaNCC, nccItem)
            }
        }
        console.log(`[sheet/get] Process NCC time: ${Date.now() - nccStart}ms (${nccData.length} items)`)

        const formattedData: Record<string, any[]> = {
            ncc: nccData,
        }

        // Process formatting - optimize by preparing dependency data once
        const formatStart = Date.now()
        const dependencyData = { ...rawData, ncc: nccData, nccMap: nccMap, noteNCCMap: noteNCCMap }
        
        // Process formatting in chunks to avoid blocking (chunk size: 5000 rows)
        const CHUNK_SIZE = 5000
        for (const [key, config] of Object.entries(sheetConfigs)) {
            if (key !== "ncc" && rawData[key]) {
                const keyStart = Date.now()
                const rows = rawData[key]
                const result: any[] = []
                
                // Track rowIndex per sheet (not globally) to avoid exceeding sheet limits
                const sheetRowCounters = new Map<string, number>()
                
                // Process in chunks to allow event loop to breathe
                for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                    const chunk = rows.slice(i, i + CHUNK_SIZE)
                    const chunkResult = chunk.map((row: any) => {
                        // Get sheet metadata from row
                        const sheetName = row._sheetName || "1"
                        const startRow = row._startRow || 3
                        
                        // Get or initialize counter for this sheet
                        if (!sheetRowCounters.has(sheetName)) {
                            sheetRowCounters.set(sheetName, 0)
                        }
                        const sheetIndex = sheetRowCounters.get(sheetName)!
                        sheetRowCounters.set(sheetName, sheetIndex + 1)
                        
                        // Calculate rowIndex relative to sheet's starting row
                        const rowIndex = startRow + sheetIndex
                        
                        return config.formatter(row, dependencyData, rowIndex)
                    })
                    result.push(...chunkResult)
                    
                    // Yield to event loop every chunk
                    if (i + CHUNK_SIZE < rows.length) {
                        await new Promise(resolve => setImmediate(resolve))
                    }
                }
                
                formattedData[key] = result
                console.log(`[sheet/get] Process ${key} time: ${Date.now() - keyStart}ms (${rows.length} rows, ${Math.ceil(rows.length / CHUNK_SIZE)} chunks)`)
            }
        }
        console.log(`[sheet/get] Total format time: ${Date.now() - formatStart}ms`)

        // API luôn trả về tất cả dữ liệu, không filter theo site đơn lẻ
        setCachedData(cacheKey, formattedData, CACHE_DURATION)

        const totalTime = Date.now() - startTime
        console.log(`[sheet/get] Total processing time: ${totalTime}ms`)

        return NextResponse.json(formattedData, {
            status: 200,
            headers: {
                ...(responseEtag ? { ETag: responseEtag } : {}),
                "Cache-Control": "private, max-age=600, stale-while-revalidate=1200",
                "CDN-Cache-Control": "public, max-age=600",
            },
        })
    } catch (e: any) {
        console.error("Error accessing Google Sheets API:", e)
        cachedAuthClient = null
        authClientExpiry = 0
        return NextResponse.json({ error: true, message: e.message }, { status: 500 })
    }
}

