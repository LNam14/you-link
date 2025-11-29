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
                    return Number.parseFloat(value.replace(",", "."))
                }
                if (typeof value === "number") return value
                return null
            }

            const formatNumber = (value: number | null) =>
                value !== null && !isNaN(value) ? value.toFixed(0).replace(".", ",") : null

            const safeSubtract = (a: number | null, b: number | null) =>
                a !== null && b !== null ? formatNumber(a - b) : null

            // Làm tròn toàn bộ giá trước khi trả về
            const giaBanGPNumber = parseNumber(row[13])
            const giaBanTextNumber = parseNumber(row[14])
            const giaBanTextHomeNumber = parseNumber(row[15])
            const giaBanTextHeaderNumber = parseNumber(row[16])
            const giaBanGPLioNumber = parseNumber(row[39])
            const giaBanTextLioNumber = parseNumber(row[40])
            const giaBanTextHomeLioNumber = parseNumber(row[41])
            const giaBanTextHeaderLioNumber = parseNumber(row[42])

            const giaMuaGPNumber = parseNumber(row[18])
            const giaMuaTextNumber = parseNumber(row[19])
            const giaMuaTextHomeNumber = parseNumber(row[20])
            const giaMuaTextHeaderNumber = parseNumber(row[21])
            const hoaHongGP = parseNumber(row[22]) || 0
            const hoaHongText = parseNumber(row[23]) || 0

            const giaCuoiGPNumber = parseNumber(row[31])
            const giaCuoiTextNumber = parseNumber(row[32])
            const giaCuoiTextHomeNumber = parseNumber(row[33])
            const giaCuoiTextHeaderNumber = parseNumber(row[34])

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
                giaBanGP: formatNumber(giaBanGPNumber) ?? 0,
                giaBanText: formatNumber(giaBanTextNumber) ?? 0,
                timeText: 1,
                giaBanTextHome: formatNumber(giaBanTextHomeNumber) ?? 0,
                giaBanTextHeader: formatNumber(giaBanTextHeaderNumber) ?? 0,
                giaBanGPLio: formatNumber(giaBanGPLioNumber) ?? 0,
                giaBanTextLio: formatNumber(giaBanTextLioNumber) ?? 0,
                giaBanTextHomeLio: formatNumber(giaBanTextHomeLioNumber) ?? 0,
                giaBanTextHeaderLio: formatNumber(giaBanTextHeaderLioNumber) ?? 0,
                giaMuaGP: formatNumber(giaMuaGPNumber) ?? 0,
                giaMuaText: formatNumber(giaMuaTextNumber) ?? 0,
                hoaHongGP: hoaHongGP || 0,
                hoaHongText: hoaHongText || 0,
                giaMuaTextHome: formatNumber(giaMuaTextHomeNumber) ?? 0,
                giaMuaTextHeader: formatNumber(giaMuaTextHeaderNumber) ?? 0,
                NCC: row[26],
                MaNCC: maNCC,
                FileNCC: fileNCC,
                GroupNCC: groupNCC,
                IdGroup: idGroup,
                GhiChuNCC: row[28],
                giaCuoiGP: formatNumber(giaCuoiGPNumber) ?? 0,
                giaCuoiText: formatNumber(giaCuoiTextNumber) ?? 0,
                giaCuoiTextHome: formatNumber(giaCuoiTextHomeNumber) ?? 0,
                giaCuoiTextHeader: formatNumber(giaCuoiTextHeaderNumber) ?? 0,
                giaCuoiGPLio: formatNumber(giaCuoiGPNumber) ?? 0,
                giaCuoiTextLio: formatNumber(giaCuoiTextNumber) ?? 0,
                giaCuoiTextHomeLio: formatNumber(giaCuoiTextHomeNumber) ?? 0,
                giaCuoiTextHeaderLio: formatNumber(giaCuoiTextHeaderNumber) ?? 0,
                loiNhuanGP: safeSubtract(giaBanGPNumber, giaCuoiGPNumber),
                loiNhuanText: safeSubtract(giaBanTextNumber, giaCuoiTextNumber),
                loiNhuanTextHome: safeSubtract(giaBanTextHomeNumber, giaCuoiTextHomeNumber),
                loiNhuanTextHeader: safeSubtract(giaBanTextHeaderNumber, giaCuoiTextHeaderNumber),
                loiNhuanGPLio: safeSubtract(giaBanGPLioNumber, giaCuoiGPNumber),
                loiNhuanTextLio: safeSubtract(giaBanTextLioNumber, giaCuoiTextNumber),
                loiNhuanTextHomeLio: safeSubtract(giaBanTextHomeLioNumber, giaCuoiTextHomeNumber),
                loiNhuanTextHeaderLio: safeSubtract(giaBanTextHeaderLioNumber, giaCuoiTextHeaderNumber),
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
            // Tối ưu: Chỉ lấy giá trị, không format để nhanh hơn
            valueRenderOption: "UNFORMATTED_VALUE",
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

