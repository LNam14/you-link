import { google } from "googleapis"
import { NextResponse } from "next/server"

// Ensure Node.js runtime and allow longer execution to avoid 504 timeouts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"

import { sheetCache, getCacheKey, getCachedData, setCachedData, CACHE_DURATION } from "@/lib/cache/sheetCache"

// Cache auth client để tránh tạo lại mỗi lần
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
            const giaBanGPNum = parseNumber(row[13])
            const giaBanTextNum = parseNumber(row[14])
            const giaBanTextHomeNum = parseNumber(row[15])
            const giaBanTextHeaderNum = parseNumber(row[16])
            const giaBanGPLioNum = parseNumber(row[39])
            const giaBanTextLioNum = parseNumber(row[40])
            const giaBanTextHomeLioNum = parseNumber(row[41])
            const giaBanTextHeaderLioNum = parseNumber(row[42])
            const giaMuaGPNum = parseNumber(row[18])
            const giaMuaTextNum = parseNumber(row[19])
            const giaMuaTextHomeNum = parseNumber(row[20])
            const giaMuaTextHeaderNum = parseNumber(row[21])
            const hoaHongGP = parseNumber(row[22]) || 0
            const hoaHongText = parseNumber(row[23]) || 0
            const giaCuoiGPNum = parseNumber(row[31])
            const giaCuoiTextNum = parseNumber(row[32])
            const giaCuoiTextHomeNum = parseNumber(row[33])
            const giaCuoiTextHeaderNum = parseNumber(row[34])

            // Convert numbers to formatted strings or keep original text (e.g., "ngưng")
            const giaBanGP = formatNumberOrKeepText(row[13], giaBanGPNum)
            const giaBanText = formatNumberOrKeepText(row[14], giaBanTextNum)
            const giaBanTextHome = formatNumberOrKeepText(row[15], giaBanTextHomeNum)
            const giaBanTextHeader = formatNumberOrKeepText(row[16], giaBanTextHeaderNum)
            const giaBanGPLio = formatNumberOrKeepText(row[39], giaBanGPLioNum)
            const giaBanTextLio = formatNumberOrKeepText(row[40], giaBanTextLioNum)
            const giaBanTextHomeLio = formatNumberOrKeepText(row[41], giaBanTextHomeLioNum)
            const giaBanTextHeaderLio = formatNumberOrKeepText(row[42], giaBanTextHeaderLioNum)
            const giaMuaGP = formatNumberOrKeepText(row[18], giaMuaGPNum)
            const giaMuaText = formatNumberOrKeepText(row[19], giaMuaTextNum)
            const giaMuaTextHome = formatNumberOrKeepText(row[20], giaMuaTextHomeNum)
            const giaMuaTextHeader = formatNumberOrKeepText(row[21], giaMuaTextHeaderNum)
            const giaCuoiGP = formatNumberOrKeepText(row[31], giaCuoiGPNum)
            const giaCuoiText = formatNumberOrKeepText(row[32], giaCuoiTextNum)
            const giaCuoiTextHome = formatNumberOrKeepText(row[33], giaCuoiTextHomeNum)
            const giaCuoiTextHeader = formatNumberOrKeepText(row[34], giaCuoiTextHeaderNum)

            const maNCC = row[27]
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
                bong: row[2],
                bet: row[3],
                chuDe: row[4],
                linkOut: row[7],
                DR: row[8],
                keywords: row[9],
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
                hoaHongGP: hoaHongGP || 0,
                hoaHongText: hoaHongText || 0,
                KeGP: roundIfNumber(row[24]),
                KeText: roundIfNumber(row[25]),
                giaMuaTextHome,
                giaMuaTextHeader,
                NCC: row[26],
                MaNCC: maNCC,
                FileNCC: fileNCC,
                GroupNCC: groupNCC,
                IdGroup: idGroup,
                GhiChuNCC: row[28],
                // Add sheet metadata - use index parameter from formatter
                sheetName: (row as any)._sheetName || undefined,
                rowIndex: index,
                giaCuoiGP: giaCuoiGP || 0,
                giaCuoiText: giaCuoiText || 0,
                giaCuoiTextHome: giaCuoiTextHome || 0,
                giaCuoiTextHeader: giaCuoiTextHeader || 0,
                giaCuoiGPLio: giaCuoiGP || 0,
                giaCuoiTextLio: giaCuoiText || 0,
                giaCuoiTextHomeLio: giaCuoiTextHome || 0,
                giaCuoiTextHeaderLio: giaCuoiTextHeader || 0,
                loiNhuanGP: safeSubtract(giaBanGPNum, giaCuoiGPNum),
                loiNhuanText: safeSubtract(giaBanTextNum, giaCuoiTextNum),
                loiNhuanTextHome: safeSubtract(giaBanTextHomeNum, giaCuoiTextHomeNum),
                loiNhuanTextHeader: safeSubtract(giaBanTextHeaderNum, giaCuoiTextHeaderNum),
                loiNhuanGPLio: safeSubtract(giaBanGPLioNum, giaCuoiGPNum),
                loiNhuanTextLio: safeSubtract(giaBanTextLioNum, giaCuoiTextNum),
                loiNhuanTextHomeLio: safeSubtract(giaBanTextHomeLioNum, giaCuoiTextHomeNum),
                loiNhuanTextHeaderLio: safeSubtract(giaBanTextHeaderLioNum, giaCuoiTextHeaderNum),
            }
        },
    },
    ncc: {
        range: "NCC!A3:K,NCC!AU3:BE",
        formatter: (row, allData, index) => ({
            MaNCC: row[0],
            FileNCC: row[8] || "",
            GroupNCC: row[9] || "",
            IdGroup: row[10] || "",
        }),
    },
}

async function getAuthClient() {
    const now = Date.now()
    
    if (cachedAuthClient && authClientExpiry > now) {
        return cachedAuthClient
    }

    const authStart = Date.now()
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY
    
    if (!clientEmail || !privateKey) {
        throw new Error("Missing Google Sheets credentials. Please set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY in .env.local")
    }
    
    const client = new google.auth.JWT({
        email: clientEmail,
        key: privateKey.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    await client.authorize()
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

    // Use FORMATTED_VALUE to get displayed values from sheet (e.g., 74.4 displayed as 74 will return "74")
    const { data } = await gsapi.spreadsheets.values.batchGet({
        spreadsheetId: SPREADSHEET_ID,
        ranges: allRanges,
        valueRenderOption: "FORMATTED_VALUE", // Get formatted values as displayed in sheet
        dateTimeRenderOption: "SERIAL_NUMBER",
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
                
                // Add sheet name and startRow metadata to each row (for later use in formatter)
                const rowsWithSheetName = range.values.map((row: any[]) => {
                    const rowWithMeta = row as any
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

// Helper function to normalize URL for search
function normalizeUrl(url: string): string {
    if (!url || typeof url !== "string") return ""
    let normalized = url.replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//, "")
    normalized = normalized.replace(/^www\./, "")
    normalized = normalized.replace(/\/.*$/, "")
    normalized = normalized.replace(/:\d+$/, "")
    normalized = normalized.toLowerCase().trim()
    return normalized
}

// Helper function to filter data based on filter parameters
function filterDataByFilters(data: any[], filters: Record<string, string>): any[] {
    if (!filters || Object.keys(filters).length === 0) {
        return data
    }

    return data.filter((item) => {
        // Đi Bóng filter
        if (filters.diBong) {
            const itemBong = (item.bong || "").toLowerCase().trim()
            if (filters.diBong === "có" && itemBong !== "có" && itemBong !== "yes" && itemBong !== "1") {
                return false
            }
            if (filters.diBong === "ko" && (itemBong === "có" || itemBong === "yes" || itemBong === "1")) {
                return false
            }
        }

        // Đi BET filter
        if (filters.diBET) {
            const itemBet = (item.bet || "").toLowerCase().trim()
            if (filters.diBET === "có" && itemBet !== "có" && itemBet !== "yes" && itemBet !== "1") {
                return false
            }
            if (filters.diBET === "ko" && (itemBet === "có" || itemBet === "yes" || itemBet === "1")) {
                return false
            }
        }

        // Site .vn filter
        if (filters.siteVN) {
            const itemSite = (item.site || "").toLowerCase()
            const isVnSite = itemSite.endsWith(".vn")
            if (filters.siteVN === "yes" && !isVnSite) {
                return false
            }
            if (filters.siteVN === "no" && isVnSite) {
                return false
            }
        }

        // Traffic Tool filter
        if (filters.trafficTool) {
            const itemTraffic = parseFloat(item.trafficTool || "0") || 0
            const filterTraffic = parseFloat(filters.trafficTool) || 0
            if (itemTraffic <= filterTraffic) {
                return false
            }
        }

        // Giá GP filter (using giaMuaGP)
        if (filters.giaGP) {
            const itemPrice = parseFloat(item.giaMuaGP || "0") || 0
            if (filters.giaGP === "1" && itemPrice <= 1) return false
            if (filters.giaGP === "20" && itemPrice >= 20) return false
            if (filters.giaGP === "40" && itemPrice >= 40) return false
            if (filters.giaGP === "80" && itemPrice >= 80) return false
            if (filters.giaGP === "160" && itemPrice >= 160) return false
        }

        // DR filter
        if (filters.DR) {
            const itemDR = parseFloat(item.DR || "0") || 0
            if (filters.DR === "5" && itemDR >= 5) return false
            if (filters.DR === "10" && itemDR >= 10) return false
            if (filters.DR === "20" && itemDR >= 20) return false
            if (filters.DR === "40" && itemDR >= 40) return false
            if (filters.DR === "60" && itemDR >= 60) return false
            if (filters.DR === "gt20" && itemDR <= 20) return false
            if (filters.DR === "gt40" && itemDR <= 40) return false
            if (filters.DR === "gt60" && itemDR <= 60) return false
            if (filters.DR === "gt80" && itemDR <= 80) return false
        }

        // Giá Text filter (using giaMuaText)
        if (filters.giaText) {
            const itemPrice = parseFloat(item.giaMuaText || "0") || 0
            if (filters.giaText === "1" && itemPrice <= 1) return false
            if (filters.giaText === "20" && itemPrice >= 20) return false
            if (filters.giaText === "40" && itemPrice >= 40) return false
            if (filters.giaText === "80" && itemPrice >= 80) return false
            if (filters.giaText === "160" && itemPrice >= 160) return false
        }

        // Ngày cập nhật filter
        if (filters.ngayCapNhat) {
            const itemTimeText = item.timeText || ""
            const itemDate = new Date(itemTimeText)
            
            if (filters.ngayCapNhat === "today") {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                if (isNaN(itemDate.getTime()) || itemDate < today) {
                    return false
                }
            } else if (filters.ngayCapNhat === "week") {
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                weekAgo.setHours(0, 0, 0, 0)
                if (isNaN(itemDate.getTime()) || itemDate < weekAgo) {
                    return false
                }
            } else if (filters.ngayCapNhat === "month") {
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                monthAgo.setHours(0, 0, 0, 0)
                if (isNaN(itemDate.getTime()) || itemDate < monthAgo) {
                    return false
                }
            } else if (filters.ngayCapNhat === "older") {
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                monthAgo.setHours(0, 0, 0, 0)
                if (!isNaN(itemDate.getTime()) && itemDate >= monthAgo) {
                    return false
                }
            }
        }

        // Chủ đề filter
        if (filters.chuDe) {
            const topics = filters.chuDe.split(",").map(t => t.trim())
            const itemChuDe = (item.chuDe || "").trim()
            if (!topics.includes(itemChuDe)) {
                return false
            }
        }

        return true
    })
}

// Helper function to filter data based on search terms
// Giữ thứ tự tìm kiếm: kết quả hiển thị theo đúng thứ tự các search terms
function filterDataBySearch(
    data: any[],
    searchTerms: string[],
    searchType: "Site" | "NCC"
): any[] {
    if (!searchTerms || searchTerms.length === 0) {
        return data
    }

    const matchingItems: any[] = []
    // Track items đã thêm để tránh duplicate, nhưng giữ thứ tự của term đầu tiên
    const seen = new Set<string>()
    
    // Duyệt qua từng search term theo thứ tự
    searchTerms.forEach((term) => {
        const filtered = data.filter((item) => {
            if (searchType === "Site") {
                const normalizedSite = normalizeUrl(item.site || "")
                const normalizedTerm = normalizeUrl(term)
                return normalizedSite === normalizedTerm
            } else {
                // Tìm kiếm theo NCC: tìm trong cả MaNCC (mã NCC) và NCC (tên NCC)
                const normalizedTerm = term.toLowerCase().trim()
                if (!normalizedTerm) return false // Không tìm nếu term rỗng
                
                // Convert MaNCC và NCC thành string và normalize (xử lý cả null, undefined, number)
                // Loại bỏ khoảng trắng và chuyển thành lowercase để so sánh
                const maNCCValue = item.MaNCC
                const nccValue = item.NCC
                
                // Normalize: convert to string, trim, lowercase, và loại bỏ khoảng trắng thừa
                const normalizeValue = (value: any): string => {
                    if (value == null) return ""
                    return String(value).trim().toLowerCase().replace(/\s+/g, "")
                }
                
                const normalizedMaNCC = normalizeValue(maNCCValue)
                const normalizedNCC = normalizeValue(nccValue)
                // Chỉ match chính xác hoặc bắt đầu với từ khóa (không dùng includes để tránh match quá rộng)
                // Ví dụ: "0A" chỉ match với "0A" hoặc "0A123", không match với "10A" hay "20A"
                const matchMaNCC = normalizedMaNCC && (
                    normalizedMaNCC === normalizedTerm || 
                    normalizedMaNCC.startsWith(normalizedTerm)
                )
                const matchNCC = normalizedNCC && (
                    normalizedNCC === normalizedTerm || 
                    normalizedNCC.startsWith(normalizedTerm)
                )
                
                return matchMaNCC || matchNCC
            }
        })
        
        // Thêm các items match vào kết quả theo thứ tự, bỏ qua items đã thêm trước đó
        filtered.forEach((item) => {
            const key = `${item.sheetName}-${item.rowIndex}`
            if (!seen.has(key)) {
                seen.add(key)
                matchingItems.push(item)
            }
        })
    })

    return matchingItems
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
        const searchParam = url.searchParams.get("search") || ""
        const searchTypeParam = (url.searchParams.get("searchType") || "Site") as "Site" | "NCC"
        
        // Parse filter parameters
        const filterParams: Record<string, string> = {}
        const filterKeys = ["diBong", "diBET", "siteVN", "trafficTool", "giaGP", "DR", "giaText", "ngayCapNhat", "chuDe"]
        filterKeys.forEach(key => {
            const value = url.searchParams.get(key)
            if (value) {
                filterParams[key] = value
            }
        })
        const hasFilters = Object.keys(filterParams).length > 0
        
        // Parse search terms (comma, newline, or space separated)
        const searchTerms = searchParam
            ? searchParam.split(/[,\n\s]+/).filter((term) => term.trim() !== "")
            : []
        
        const hasSearch = searchTerms.length > 0
        
        // Cache key includes search params and filters
        const cacheKeyParts = []
        if (hasSearch) {
            cacheKeyParts.push(`search-${searchParam}-${searchTypeParam}`)
        }
        if (hasFilters) {
            const filterStr = Object.entries(filterParams).sort().map(([k, v]) => `${k}:${v}`).join(",")
            cacheKeyParts.push(`filters-${filterStr}`)
        }
        const cacheKey = cacheKeyParts.length > 0
            ? getCacheKey(SPREADSHEET_ID, `get-${cacheKeyParts.join("-")}`)
            : getCacheKey(SPREADSHEET_ID, "get")
        
        if (!forceRefresh) {
            const cached = getCachedData(cacheKey)
            if (cached) {
                console.log(`[sheet/get] Cache hit - ${Date.now() - startTime}ms`)
                return NextResponse.json(cached, {
                    status: 200,
                    headers: {
                        "Cache-Control": hasSearch ? "private, max-age=300" : "private, max-age=600, stale-while-revalidate=1200",
                        "CDN-Cache-Control": hasSearch ? "private, max-age=300" : "public, max-age=600",
                    },
                })
            }
        }

        const client = await getAuthClient()
        const gsapi = google.sheets({ version: "v4", auth: client })

        const fetchStart = Date.now()
        const rawData = await getAllSheetData(gsapi)
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
        const dependencyData = { ...rawData, ncc: nccData, nccMap: nccMap }
        
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

        // Apply search filter if search terms are provided
        if (hasSearch) {
            const filterStart = Date.now()
            
            // Filter gpTextVN data
            if (formattedData.gpTextVN) {
                const originalCount = formattedData.gpTextVN.length
                formattedData.gpTextVN = filterDataBySearch(formattedData.gpTextVN, searchTerms, searchTypeParam)
                console.log(`[sheet/get] Filtered gpTextVN by search: ${originalCount} rows to ${formattedData.gpTextVN.length} rows (${Date.now() - filterStart}ms)`)
            }
            
            // Filter NCC data if searching by NCC
            if (searchTypeParam === "NCC" && formattedData.ncc) {
                const originalNccCount = formattedData.ncc.length
                formattedData.ncc = filterDataBySearch(formattedData.ncc, searchTerms, searchTypeParam)
                console.log(`[sheet/get] Filtered ncc by search: ${originalNccCount} rows to ${formattedData.ncc.length} rows`)
            }
        }

        // Apply filter parameters if provided
        if (hasFilters) {
            const filterStart = Date.now()
            
            // Filter gpTextVN data by filters
            if (formattedData.gpTextVN) {
                const originalCount = formattedData.gpTextVN.length
                formattedData.gpTextVN = filterDataByFilters(formattedData.gpTextVN, filterParams)
                console.log(`[sheet/get] Filtered gpTextVN by filters: ${originalCount} rows to ${formattedData.gpTextVN.length} rows (${Date.now() - filterStart}ms)`)
            }
        }

        setCachedData(cacheKey, formattedData, CACHE_DURATION)

        const totalTime = Date.now() - startTime
        console.log(`[sheet/get] Total processing time: ${totalTime}ms`)

        return NextResponse.json(formattedData, {
            status: 200,
            headers: {
                "Cache-Control": hasSearch ? "private, max-age=300" : "private, max-age=600, stale-while-revalidate=1200",
                "CDN-Cache-Control": hasSearch ? "private, max-age=300" : "public, max-age=600",
            },
        })
    } catch (e: any) {
        console.error("Error accessing Google Sheets API:", e)
        cachedAuthClient = null
        authClientExpiry = 0
        return NextResponse.json({ error: true, message: e.message }, { status: 500 })
    }
}

