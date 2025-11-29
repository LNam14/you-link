import { google } from "googleapis";
import { NextResponse } from "next/server";
import { cache } from "react";
import { cookies } from "next/headers";
import keys from "../../../../key.json";

// Ensure Node.js runtime and allow longer execution to avoid 504 timeouts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Increase on Vercel (in seconds). Adjust as needed.
export const maxDuration = 60;

const SPREADSHEET_ID =
    "10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU";
const CONTENT_SPREADSHEET_ID =
    "1SDvAA8pPWUl2Fi2ubFIFttS5D7rA1P-DHrHuJj9X4Z8";
const SYNTHETIC_SPREADSHEET_ID =
    "19aP7wI2niVMqabvxuo-FIhgEtgO4w8creFUOVECLuFQ";

interface SheetConfig {
    range: string;
    formatter: (row: any[], index: number) => Record<string, any>;
    spreadsheetId?: string;
}

const parseNumber = (value: any) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") {
        return Number.parseFloat(value.replace(",", "."));
    }
    if (typeof value === "number") return value;
    return null;
};

const formatNumber = (value: number | null) =>
    value !== null && !isNaN(value) ? value.toFixed(0).replace(".", ",") : null;

const sheetConfigs: Record<string, SheetConfig> = {
    gpTextVN: {
        range: "1!B3:AM,4!B3:AM",
        formatter: (row) => ({
            Site: row[0] || "",
            "Đi Bóng": row[1] || "",
            "Đi BET": row[2] || "",
            "Chủ đề": row[3] || "",
            "Ngày cập nhật": row[5] || "",
            "Link out": row[6] || "",
            DR: row[7] || "",
            Keywords: row[8] || "",
            "Traffic Tool": row[9] || "",
            "Ghi chú": row[10] || "",
            "Tình trạng": row[11] || "",
            "Giá GP": formatNumber(parseNumber(row[12])) ?? 0,
            "Giá Footer": formatNumber(parseNumber(row[13])) ?? 0,
            "Giá Home": formatNumber(parseNumber(row[14])) ?? 0,
            "Giá Header": formatNumber(parseNumber(row[15])) ?? 0,
            GiaMuaGP: formatNumber(parseNumber(row[17])) ?? 0,
            GiaMuaText: formatNumber(parseNumber(row[18])) ?? 0,
            GiaMuaTextHome: formatNumber(parseNumber(row[19])) ?? 0,
            GiaMuaTextHeader: formatNumber(parseNumber(row[20])) ?? 0,
            HoaHongGP: formatNumber(parseNumber(row[21])) ?? 0,
            HoaHongText: formatNumber(parseNumber(row[22])) ?? 0,
            NCC: row[25] || "",
            MaNCC: row[26] || "",
        }),
        spreadsheetId: SPREADSHEET_ID,
    },
    gpTextNN: {
        range: "2!B3:AM,5!B3:AM",
        formatter: (row) => ({
            Site: row[0] || "",
            "Đi Bóng": row[1] || "",
            "Đi BET": row[2] || "",
            "Chủ đề": row[3] || "",
            "Ngày cập nhật": row[5] || "",
            "Link out": row[6] || "",
            DR: row[7] || "",
            Keywords: row[8] || "",
            "Traffic Tool": row[9] || "",
            "Ghi chú": row[10] || "",
            "Tình trạng": row[11] || "",
            "Giá GP": formatNumber(parseNumber(row[12])) ?? 0,
            "Giá Footer": formatNumber(parseNumber(row[13])) ?? 0,
            "Giá Home": formatNumber(parseNumber(row[14])) ?? 0,
            "Giá Header": formatNumber(parseNumber(row[15])) ?? 0,
            GiaMuaGP: formatNumber(parseNumber(row[17])) ?? 0,
            GiaMuaText: formatNumber(parseNumber(row[18])) ?? 0,
            GiaMuaTextHome: formatNumber(parseNumber(row[19])) ?? 0,
            GiaMuaTextHeader: formatNumber(parseNumber(row[20])) ?? 0,
            HoaHongGP: formatNumber(parseNumber(row[21])) ?? 0,
            HoaHongText: formatNumber(parseNumber(row[22])) ?? 0,
            NCC: row[25] || "",
            MaNCC: row[26] || "",
        }),
        spreadsheetId: SPREADSHEET_ID,
    },
    content: {
        range: "Content!Z3:AH",
        formatter: (row) => ({
            MaNCC: row[0] || "",
            TenSP: row[1] || "",
            GiaMua: formatNumber(parseNumber(row[3])) ?? 0,
            GiaBan: formatNumber(parseNumber(row[4])) ?? 0,
            Note: row[5] || "",
        }),
        spreadsheetId: CONTENT_SPREADSHEET_ID,
    },
    synthetic: {
        range: "C0!A3:U",
        formatter: (row) => ({
            "Đuôi": row[0] || "",
            Domains: row[2] || "",
            "Ghi chú": row[3] || "",
            DR: row[4] || "",
            DA: row[5] || "",
            TF: row[6] || "",
            Spam: row[7] || "",
            Traffic: row[8] || "",
            "Link out": row[9] || "",
            "Giá GP": formatNumber(parseNumber(row[10])) ?? 0,
            "Giá Text": formatNumber(parseNumber(row[11])) ?? 0,
        }),
        spreadsheetId: SYNTHETIC_SPREADSHEET_ID,
    },
};

const getAuthClient = cache(async () => {
    // Handle escaped newlines if key ever comes from env
    const privateKey = (keys.private_key || "").replace(/\\n/g, "\n");
    const client = new google.auth.JWT(
        keys.client_email,
        undefined,
        privateKey,
        ["https://www.googleapis.com/auth/spreadsheets"]
    );
    await client.authorize();
    return client;
});

// Cache kết quả trong 5 phút (tăng từ 3 phút để giảm số lần gọi API)
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

async function getSheetsData(
    gsapi: any,
    configs: Record<string, SheetConfig>,
    userInfo: { role?: string; username?: string }
) {
    // Gom ranges theo spreadsheetId
    const grouped: Record<string, { key: string; config: SheetConfig }[]> = {};
    for (const [key, config] of Object.entries(configs)) {
        const id = config.spreadsheetId || SPREADSHEET_ID;
        if (!grouped[id]) grouped[id] = [];
        grouped[id].push({ key, config });
    }

    const results: Record<string, any> = {};

    for (const [spreadsheetId, items] of Object.entries(grouped)) {
        const cacheKey = `${spreadsheetId}-${userInfo.role || "guest"}-${userInfo.username || "anonymous"}`;
        const cached = sheetCache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            Object.assign(results, cached.data);
            continue;
        }

        // Gom tất cả range
        const allRanges = items.flatMap((i) =>
            i.config.range.split(",").map((r) => r.trim())
        );

        const { data } = await gsapi.spreadsheets.values.batchGet({
            spreadsheetId,
            ranges: allRanges,
        });

        const valueRanges = data.valueRanges || [];

        // Mapping
        let idx = 0;
        for (const { key, config } of items) {
            const ranges = config.range.split(",").map((r) => r.trim());
            const allData: any[] = [];

            for (let r = 0; r < ranges.length; r++) {
                const values = valueRanges[idx++]?.values || [];
                const formatted = values.map((row: any[], i: number) =>
                    config.formatter(row, i)
                );
                allData.push(...formatted);
            }

            // Filter theo role
            let filtered = allData;
            if (key === "content") {
                results[key] = filtered;
                continue;
            }


            if (key === "gpTextVN" || key === "gpTextNN") {
                filtered = allData.filter(
                    (row: any) => row["Tình trạng"] === "Bình thường"
                );
            }

            results[key] = filtered;
        }

        // Lưu cache với thời gian dài hơn
        sheetCache.set(cacheKey, {
            data: results,
            expiry: Date.now() + CACHE_DURATION,
        });
    }

    return results;
}

async function handleRequest(req: Request) {
    try {
        const cookieStore = cookies();
        const userInfoCookie = cookieStore.get("userInfo");
        const userInfo = userInfoCookie
            ? JSON.parse(userInfoCookie.value)
            : {};

        const client = await getAuthClient();
        const gsapi = google.sheets({ version: "v4", auth: client });

        const results = await getSheetsData(gsapi, sheetConfigs, userInfo);

        // Thêm cache headers để browser/CDN có thể cache
        return NextResponse.json(results, {
            status: 200,
            headers: {
                "Cache-Control": "private, max-age=300, stale-while-revalidate=600", // Cache 5 phút, stale-while-revalidate 10 phút
                "CDN-Cache-Control": "public, max-age=300",
            },
        });
    } catch (error: any) {
        console.error("Error accessing Google Sheets API:", error);
        return NextResponse.json(
            { error: true, message: error.message },
            { status: 500 }
        );
    }
}

// Hỗ trợ cả GET và POST để tối ưu cache
export async function GET(req: Request) {
    return handleRequest(req);
}

export async function POST(req: Request) {
    return handleRequest(req);
}
