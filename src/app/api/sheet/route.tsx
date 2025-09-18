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

interface SheetConfig {
    range: string;
    formatter: (row: any[], index: number) => Record<string, any>;
    spreadsheetId?: string;
}

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
            "Giá GP": row[12] || "",
            "Giá Footer": row[13] || "",
            "Giá Home": row[14] || "",
            "Giá Header": row[15] || "",
            GiaMuaGP: row[17] || 0,
            GiaMuaText: row[18] || 0,
            GiaMuaTextHome: row[19] || 0,
            GiaMuaTextHeader: row[20] || 0,
            HoaHongGP: row[21] || 0,
            HoaHongText: row[22] || 0,
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
            "Giá GP": row[12] || "",
            "Giá Footer": row[13] || "",
            "Giá Home": row[14] || "",
            "Giá Header": row[15] || "",
            GiaMuaGP: row[17] || 0,
            GiaMuaText: row[18] || 0,
            GiaMuaTextHome: row[19] || 0,
            GiaMuaTextHeader: row[20] || 0,
            HoaHongGP: row[21] || 0,
            HoaHongText: row[22] || 0,
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
            GiaMua: row[3] || 0,
            GiaBan: row[4] || 0,
            Note: row[5] || "",
        }),
        spreadsheetId: CONTENT_SPREADSHEET_ID,
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

// Cache kết quả trong 3 phút
const sheetCache = new Map<string, { data: any; expiry: number }>();

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
        const cacheKey = `${spreadsheetId}-${userInfo.role}-${userInfo.username}`;
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

            if (userInfo?.role === "NCC") {
                if (key === "updateVN" || key === "updateNN") {
                    filtered = allData.filter(
                        (row: any) => row.MaNCC === userInfo.username
                    );
                } else {
                    filtered = [];
                }
            } else {
                if (key === "gpTextVN" || key === "gpTextNN") {
                    filtered = allData.filter(
                        (row: any) => row["Tình trạng"] === "Bình thường"
                    );
                }
            }
            results[key] = filtered;
        }

        // Lưu cache 3 phút
        sheetCache.set(cacheKey, {
            data: results,
            expiry: Date.now() + 1000 * 60 * 3,
        });
    }

    return results;
}

export async function POST(req: Request) {
    try {
        const cookieStore = cookies();
        const userInfoCookie = cookieStore.get("userInfo");
        const userInfo = userInfoCookie
            ? JSON.parse(userInfoCookie.value)
            : {};

        const client = await getAuthClient();
        const gsapi = google.sheets({ version: "v4", auth: client });

        const results = await getSheetsData(gsapi, sheetConfigs, userInfo);

        return NextResponse.json(results, { status: 200 });
    } catch (error: any) {
        console.error("Error accessing Google Sheets API:", error);
        return NextResponse.json(
            { error: true, message: error.message },
            { status: 500 }
        );
    }
}
