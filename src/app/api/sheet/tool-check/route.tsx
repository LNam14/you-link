import { google } from "googleapis"
import keys from "../../../../../key.json"
import { NextResponse } from "next/server"
import { cache } from "react"

// Ensure Node.js runtime and allow longer execution to avoid 504 timeouts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Increase on Vercel (in seconds). Adjust as needed.
export const maxDuration = 60

const SPREADSHEET_ID = "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU"
// Cache kết quả trong 5 phút (tăng từ 2 phút để giảm số lần gọi API)
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút
const sheetCache = new Map<string, { data: any; expiry: number }>();

// Cleanup cache cũ định kỳ để tránh memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sheetCache.entries()) {
        if (value.expiry < now) {
            sheetCache.delete(key);
        }
    }
}, 60000); // Cleanup mỗi phút

interface SheetConfig {
    range: string
    formatter: (row: any[], allData: Record<string, any> & { nccMap?: Map<string, any> }) => Record<string, any>
}

const sheetConfigs: Record<string, SheetConfig> = {
    gpTextVN: {
        range: "1!A3:AQ,2!A3:AQ,4!A3:AQ,5!A3:AQ",
        formatter: (row, allData) => {
            const parseNumber = (value: any) => {
                if (value === null || value === undefined) return null
                if (typeof value === "string") {
                    // Xử lý string đã format từ sheet (có thể có dấu phẩy, khoảng trắng, v.v.)
                    const cleaned = value.replace(/,/g, ".").replace(/\s/g, "")
                    const parsed = Number.parseFloat(cleaned)
                    return isNaN(parsed) ? null : parsed
                }
                return typeof value === "number" ? value : null
            }

            const formatNumber = (value: number | null) =>
                value !== null && !isNaN(value) ? value.toString().replace(".", ",") : null

            const safeSubtract = (a: number | null, b: number | null) =>
                a !== null && b !== null ? formatNumber(a - b) : null

            const roundIfNumber = (value: any) => {
                const num = parseNumber(value)
                if (num === null) return value
                // Trả về số gốc không làm tròn
                return num
            }

            const giaBanGP = roundIfNumber(row[13])
            const giaBanText = roundIfNumber(row[14])
            const giaBanTextHome = roundIfNumber(row[15])
            const giaBanTextHeader = roundIfNumber(row[16])
            const giaBanGPLio = roundIfNumber(row[39])
            const giaBanTextLio = roundIfNumber(row[40])
            const giaBanTextHomeLio = roundIfNumber(row[41])
            const giaBanTextHeaderLio = roundIfNumber(row[42])
            const giaMuaGP = roundIfNumber(row[18])
            const giaMuaText = roundIfNumber(row[19])
            const giaMuaTextHome = roundIfNumber(row[20])
            const giaMuaTextHeader = roundIfNumber(row[21])
            const hoaHongGP = parseNumber(row[22]) || 0
            const hoaHongText = parseNumber(row[23]) || 0

            const giaCuoiGP = roundIfNumber(row[31])
            const giaCuoiText = roundIfNumber(row[32])
            const giaCuoiTextHome = roundIfNumber(row[33])
            const giaCuoiTextHeader = roundIfNumber(row[34])

            const maNCC = row[27]
            let fileNCC = ""
            let groupNCC = ""
            let idGroup = ""

            // Tối ưu: Sử dụng Map lookup (O(1)) thay vì .find() (O(n))
            if (maNCC) {
                // Ưu tiên dùng nccMap nếu có (nhanh hơn)
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
                hoaHongGP: hoaHongGP || 0,
                hoaHongText: hoaHongText || 0,
                giaMuaTextHome,
                giaMuaTextHeader,
                NCC: row[26],
                MaNCC: maNCC,
                FileNCC: fileNCC,
                GroupNCC: groupNCC,
                IdGroup: idGroup,
                GhiChuNCC: row[28],
                giaCuoiGP: giaCuoiGP || 0,
                giaCuoiText: giaCuoiText || 0,
                giaCuoiTextHome: giaCuoiTextHome || 0,
                giaCuoiTextHeader: giaCuoiTextHeader || 0,
                giaCuoiGPLio: giaCuoiGP || 0,
                giaCuoiTextLio: giaCuoiText || 0,
                giaCuoiTextHomeLio: giaCuoiTextHome || 0,
                giaCuoiTextHeaderLio: giaCuoiTextHeader || 0,
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
        range: "NCC!A3:K,NCC!AU3:BE",
        formatter: (row) => ({
            MaNCC: row[0],
            FileNCC: row[8] || "",
            GroupNCC: row[9] || "",
            IdGroup: row[10] || "",
        }),
    },
}

async function getAllSheetData(gsapi: any) {
    // Create a map to hold sheet data, keyed by a logical name
    const allData: Record<string, any[]> = {}

    // Tối ưu: Gọi song song tất cả các batch requests thay vì tuần tự
    const fetchPromises = Object.entries(sheetConfigs).map(async ([key, config]) => {
        const fetchStart = Date.now()
        const ranges = config.range.split(",").map((range) => range.trim())
        
        const { data } = await gsapi.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEET_ID,
            ranges: ranges,
            // Lấy giá trị đã format từ sheet (để lấy giá trị đã làm tròn như hiển thị trong sheet)
            valueRenderOption: key === "gpTextVN" ? "FORMATTED_VALUE" : "UNFORMATTED_VALUE",
            dateTimeRenderOption: "SERIAL_NUMBER",
        })

        const fetchTime = Date.now() - fetchStart
        const totalRows = data.valueRanges?.reduce((sum: number, range: any) => sum + (range.values?.length || 0), 0) || 0
        console.log(`[tool-check] Fetch ${key}: ${fetchTime}ms (${ranges.length} ranges, ${totalRows} rows)`)

        // Ensure data.valueRanges is an array before processing
        const values = data.valueRanges || []

        // Flatten the values from all ranges for this config
        return [key, values.flatMap((range: any) => range.values || [])] as const
    })

    // Chờ tất cả requests hoàn thành song song
    const results = await Promise.all(fetchPromises)
    
    // Gán kết quả vào allData
    for (const [key, values] of results) {
        allData[key] = values
    }

    return allData
}

async function handleRequest(req: Request) {
    const startTime = Date.now()
    try {
        // Check cache unless caller forces refresh via query (?revalidate=1)
        const url = new URL(req.url)
        const forceRefresh = url.searchParams.get("revalidate") === "1"
        const cacheKey = `tool-check-${SPREADSHEET_ID}`
        
        if (!forceRefresh) {
            const cached = sheetCache.get(cacheKey)
            if (cached && cached.expiry > Date.now()) {
                console.log(`[tool-check] Cache hit - ${Date.now() - startTime}ms`)
                return NextResponse.json(cached.data, {
                    status: 200,
                    headers: {
                        "Cache-Control": "private, max-age=300, stale-while-revalidate=600", // Cache 5 phút, stale-while-revalidate 10 phút
                        "CDN-Cache-Control": "public, max-age=300",
                    },
                })
            }
        }

        const authStart = Date.now()
        const client = new google.auth.JWT(keys.client_email, undefined, keys.private_key, [
            "https://www.googleapis.com/auth/spreadsheets",
        ])

        await client.authorize()
        console.log(`[tool-check] Auth time: ${Date.now() - authStart}ms`)

        const gsapi = google.sheets({ version: "v4", auth: client })

        const fetchStart = Date.now()
        const rawData = await getAllSheetData(gsapi)
        console.log(`[tool-check] Fetch data time: ${Date.now() - fetchStart}ms`)

        // Process NCC data first, as it's a dependency for gpTextVN
        const nccStart = Date.now()
        const nccData = rawData.ncc ? rawData.ncc.map((row) => sheetConfigs.ncc.formatter(row, rawData)) : []

        // Tạo Map lookup cho NCC để tối ưu performance (O(1) thay vì O(n))
        // Thay vì dùng .find() cho mỗi row, dùng Map để lookup nhanh hơn
        const nccMap = new Map<string, typeof nccData[0]>()
        for (const nccItem of nccData) {
            if (nccItem.MaNCC) {
                nccMap.set(nccItem.MaNCC, nccItem)
            }
        }
        console.log(`[tool-check] Process NCC time: ${Date.now() - nccStart}ms (${nccData.length} items)`)

        // Create a combined object for formatted data
        const formattedData: Record<string, any[]> = {
            ncc: nccData,
        }

        // Now process other sheets which may depend on NCC data
        const formatStart = Date.now()
        for (const [key, config] of Object.entries(sheetConfigs)) {
            if (key !== "ncc" && rawData[key]) {
                // Pass the already processed nccData và nccMap trong `allData` argument
                const dependencyData = { ...rawData, ncc: nccData, nccMap: nccMap }
                formattedData[key] = rawData[key].map((row) => config.formatter(row, dependencyData))
                console.log(`[tool-check] Process ${key} time: ${Date.now() - formatStart}ms (${rawData[key].length} rows)`)
            }
        }

        // Save to cache với thời gian dài hơn
        sheetCache.set(cacheKey, {
            data: formattedData,
            expiry: Date.now() + CACHE_DURATION,
        })

        const totalTime = Date.now() - startTime
        console.log(`[tool-check] Total processing time: ${totalTime}ms`)

        return NextResponse.json(formattedData, {
            status: 200,
            headers: {
                "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
                "CDN-Cache-Control": "public, max-age=300",
            },
        })
    } catch (e: any) {
        console.error("Error accessing Google Sheets API:", e)
        return NextResponse.json({ error: true, message: e.message }, { status: 500 })
    }
}

// Hỗ trợ cả GET và POST để tối ưu cache
export async function GET(req: Request) {
    return handleRequest(req)
}

export async function POST(req: Request) {
    return handleRequest(req)
}

