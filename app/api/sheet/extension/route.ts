import { google } from "googleapis"
import { NextResponse } from "next/server"

// Ensure Node.js runtime and allow longer execution to avoid 504 timeouts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const SPREADSHEET_ID = "19aP7wI2niVMqabvxuo-FIhgEtgO4w8creFUOVECLuFQ"

// Simple in-memory cache to speed up repeated requests
let cachedPayload: any | null = null
let cachedAt = 0
const CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes

interface SheetConfig {
    range: string
    formatter: (row: any[], allData: Record<string, any[]>) => Record<string, any>
}

const sheetConfigs: Record<string, SheetConfig> = {
    extension: {
        range: "C0!A3:U",
        formatter: (row, allData) => {
            return {
                Extension: row[0],
                NCC: row[1],
                Domains: row[2],
                Note: row[3],
                DR: row[4],
                DA: row[5],
                TF: row[6],
                Spam: row[7],
                Traffic: row[8],
                LinkOut: row[9],
                GiaBanGP: row[10],
                GiaBanText: row[11],
                MaSP: row[13],
                TenNCC: row[14],
                GiaMuaGP: row[15],
                GiaMuaText: row[16],
                HHGP: row[17],
                HHText: row[18],
                KeGP: row[19],
                KeText: row[20],
            }
        },
    },
}

async function getAuthClient() {
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
    return client
}

async function getAllSheetData(gsapi: any) {
    // Create a map to hold sheet data, keyed by a logical name
    const allData: Record<string, any[]> = {}

    for (const [key, config] of Object.entries(sheetConfigs)) {
        const ranges = config.range.split(",").map((range) => range.trim())

        const { data } = await gsapi.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEET_ID,
            ranges: ranges,
        })

        // Ensure data.valueRanges is an array before processing
        const values = data.valueRanges || []

        // Flatten the values from all ranges for this config
        allData[key] = values.flatMap((range: any) => range.values || [])
    }

    return allData
}

export async function POST(req: Request) {
    try {
        // Check cache unless caller forces refresh via query (?revalidate=1)
        const url = new URL(req.url)
        const forceRefresh = url.searchParams.get("revalidate") === "1"
        const now = Date.now()

        if (!forceRefresh && cachedPayload && now - cachedAt < CACHE_TTL_MS) {
            return NextResponse.json(cachedPayload, {
                status: 200,
                headers: {
                    // Allow CDN/framework to cache as well
                    "Cache-Control": "public, max-age=0, s-maxage=120, stale-while-revalidate=300",
                },
            })
        }

        const client = await getAuthClient()
        const gsapi = google.sheets({ version: "v4", auth: client })

        const rawData = await getAllSheetData(gsapi)

        // Process all sheet data
        const formattedData: Record<string, any[]> = {}

        for (const [key, config] of Object.entries(sheetConfigs)) {
            if (rawData[key]) {
                formattedData[key] = rawData[key].map((row) => config.formatter(row, rawData))
            }
        }

        // Save to cache
        cachedPayload = formattedData
        cachedAt = Date.now()

        return NextResponse.json(formattedData, {
            status: 200,
            headers: {
                "Cache-Control": "public, max-age=0, s-maxage=120, stale-while-revalidate=300",
            },
        })
    } catch (e: any) {
        console.error("Error accessing Google Sheets API:", e)
        return NextResponse.json({ error: true, message: e.message }, { status: 500 })
    }
}

// Optional: support GET with the same caching logic
export async function GET(req: Request) {
    return POST(req)
}

