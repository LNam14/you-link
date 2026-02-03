import { google } from "googleapis"
import { NextResponse } from "next/server"
import { getCacheKey, getCachedData, setCachedData, CACHE_DURATION } from "@/lib/cache/sheetCache"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

const HOT_SPREADSHEET_ID = "19YzSU1iW5rESFnv0X7tg9iuDr5McE59UdHlDSLo9oo8"
const SHEET_NAME = "Site bán chạy"
const DEFAULT_PAGE_SIZE = 10

// A=site, B=Số lượng bán, E=chủ đề, H=DR, J=Traffic Tool — từ hàng 3
const RANGE = `'${SHEET_NAME}'!A3:J`

let cachedAuthClient: any = null
let authClientExpiry = 0
const AUTH_CLIENT_TTL = 50 * 60 * 1000

async function getAuthClient() {
  const now = Date.now()
  if (cachedAuthClient && authClientExpiry > now) {
    return cachedAuthClient
  }

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Google Sheets credentials. Set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY in .env.local"
    )
  }

  const client = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  })

  await client.authorize()
  cachedAuthClient = client
  authClientExpiry = now + AUTH_CLIENT_TTL
  return client
}

function parseRow(row: any[]): { site: string; soLuongBan: number; chuDe: string; dr: number; trafficTool: string } | null {
  const site = row[0] != null ? String(row[0]).trim() : ""
  if (!site) return null

  const soLuongBanRaw = row[1]
  let soLuongBan = 0
  if (typeof soLuongBanRaw === "number" && !isNaN(soLuongBanRaw)) {
    soLuongBan = Math.round(soLuongBanRaw)
  } else if (soLuongBanRaw != null && soLuongBanRaw !== "") {
    const parsed = Number(String(soLuongBanRaw).replace(/\s/g, "").replace(/,/g, "."))
    if (!isNaN(parsed)) soLuongBan = Math.round(parsed)
  }

  const chuDe = row[4] != null ? String(row[4]).trim() : ""
  const drRaw = row[7]
  let dr = 0
  if (typeof drRaw === "number" && !isNaN(drRaw)) {
    dr = Math.round(drRaw)
  } else if (drRaw != null && drRaw !== "") {
    const parsed = Number(String(drRaw).replace(/\s/g, "").replace(/,/g, "."))
    if (!isNaN(parsed)) dr = Math.round(parsed)
  }

  const trafficTool = row[9] != null ? String(row[9]).trim() : ""

  return { site, soLuongBan, chuDe, dr, trafficTool }
}

async function fetchAllRows(gsapi: any): Promise<{ site: string; soLuongBan: number; chuDe: string; dr: number; trafficTool: string }[]> {
  const cacheKey = getCacheKey(HOT_SPREADSHEET_ID, "hot-sites-all")
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  const { data } = await gsapi.spreadsheets.values.get({
    spreadsheetId: HOT_SPREADSHEET_ID,
    range: RANGE,
    valueRenderOption: "UNFORMATTED_VALUE",
  })

  const rows = (data.values || []) as any[][]
  const list = rows.map(parseRow).filter((r): r is NonNullable<typeof r> => r !== null)
  setCachedData(cacheKey, list, CACHE_DURATION)
  return list
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10)))

    const client = await getAuthClient()
    const gsapi = google.sheets({ version: "v4", auth: client })
    const allRows = await fetchAllRows(gsapi)

    const total = allRows.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const pageIndex = Math.min(page - 1, totalPages - 1)
    const start = pageIndex * limit
    const data = allRows.slice(start, start + limit)

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages,
    })
  } catch (e: any) {
    console.error("[sheet/hot-sites] Error:", e)
    cachedAuthClient = null
    authClientExpiry = 0
    return NextResponse.json({ error: true, message: e?.message || "Server error" }, { status: 500 })
  }
}
