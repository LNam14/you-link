import { google } from "googleapis";
import { NextResponse } from 'next/server';
import { cache } from 'react';
import { cookies } from 'next/headers';

// Import keys securely (consider using environment variables instead)
import keys from "../../../../key.json";

const SPREADSHEET_ID = '10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU';
const CONTENT_SPREADSHEET_ID = '1SDvAA8pPWUl2Fi2ubFIFttS5D7rA1P-DHrHuJj9X4Z8';

interface SheetConfig {
    range: string;
    formatter: (row: any[], index: number) => Record<string, string | number>;
    spreadsheetId?: string;
}

const sheetConfigs: Record<string, SheetConfig> = {
    gpTextVN: {
        range: '1!B3:AM',
        formatter: (row) => ({
            Site: row[0] || "",
            'Đi Bóng': row[1] || "",
            "Đi BET": row[2] || "",
            'Chủ đề': row[3] || "",
            "Ngày cập nhật": row[5] || "",
            "Link out": row[6] || "",
            DR: row[7] || "",
            Keywords: row[8] || "",
            "Traffic Tool": row[9] || "",
            "Ghi chú": row[10] || "",
            "Tình trạng": row[11] || "",
            "Giá GP": row[30] || "",
            "Giá Footer": row[31] || "",
            "Giá Home": row[32] || "",
            "Giá Header": row[33] || "",
            GiaMuaGP: row[17] || 0,
            GiaMuaText: row[18] || 0,
            GiaMuaTextHome: row[19] || 0,
            GiaMuaTextHeader: row[20] || 0,
            HoaHongGP: row[21] || 0,
            HoaHongText: row[22] || 0,
            NCC: row[25] || "",
            MaNCC: row[26] || "",
        }),
        spreadsheetId: SPREADSHEET_ID
    },
    updateVN: {
        range: '1!B3:AM',
        formatter: (row, index) => ({
            rowIndex: index + 3,
            Site: row[0] || "",
            'Chủ đề': row[3] || "",
            'Nước': row[4] || "",
            "Link out": row[6] || "",
            DR: row[7] || "",
            Keywords: row[8] || "",
            "Traffic Tool": row[9] || "",
            "Tình trạng": row[11] || "",
            "GP ($)": row[17] || 0,
            "Text Footer ($)": row[18] || 0,
            "Text Home ($)": row[19] || 0,
            "Text Header ($)": row[20] || 0,
            "HH GP": row[21] || 0,
            "HH Text": row[22] || 0,
            "MaNCC": row[26] || "",
        }),
        spreadsheetId: SPREADSHEET_ID
    },
    updateNN: {
        range: '2!B3:AM',
        formatter: (row, index) => ({
            rowIndex: index + 3,
            Site: row[0] || "",
            'Chủ đề': row[3] || "",
            'Nước': row[4] || "",
            "Link out": row[6] || "",
            DR: row[7] || "",
            Keywords: row[8] || "",
            "Traffic Tool": row[9] || "",
            "Tình trạng": row[11] || "",
            "GP ($)": row[17] || 0,
            "Text Footer ($)": row[18] || 0,
            "Text Home ($)": row[19] || 0,
            "Text Header ($)": row[20] || 0,
            "HH GP": row[21] || 0,
            "HH Text": row[22] || 0,
            "MaNCC": row[26] || "",
        }),
        spreadsheetId: SPREADSHEET_ID
    },
    gpTextNN: {
        range: '2!B3:AH',
        formatter: (row) => ({
            Site: row[0] || "",
            'Đi Bóng': row[1] || "",
            "Đi BET": row[2] || "",
            'Chủ đề': row[3] || "",
            "Ngày cập nhật": row[5] || "",
            "Link out": row[6] || "",
            DR: row[7] || "",
            Keywords: row[8] || "",
            "Traffic Tool": row[9] || "",
            "Ghi chú": row[10] || "",
            "Tình trạng": row[11] || "",
            "Giá GP": row[30] || "",
            "Giá Footer": row[31] || "",
            "Giá Home": row[32] || "",
            "Giá Header": row[33] || "",
            GiaMuaGP: row[17] || 0,
            GiaMuaText: row[18] || 0,
            GiaMuaTextHome: row[19] || 0,
            GiaMuaTextHeader: row[20] || 0,
            HoaHongGP: row[21] || 0,
            HoaHongText: row[22] || 0,
            NCC: row[25] || "",
            MaNCC: row[26] || "",
        }),
        spreadsheetId: SPREADSHEET_ID
    },
    content: {
        range: 'Content!Z3:AH',
        formatter: (row) => ({
            MaNCC: row[0] || "",
            TenSP: row[1] || "",
            GiaMua: row[3] || 0,
            GiaBan: row[4] || 0,
            Note: row[5] || "",
        }),
        spreadsheetId: CONTENT_SPREADSHEET_ID
    }
};

const getAuthClient = cache(async () => {
    const client = new google.auth.JWT(
        keys.client_email,
        undefined,
        keys.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
    );
    await client.authorize();
    return client;
});

const getSheetData = cache(async (gsapi: any, config: SheetConfig, configKey: string, userInfo: { role?: string, username?: string }) => {
    const { data } = await gsapi.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId || SPREADSHEET_ID,
        range: config.range,
    });
    // Lấy dữ liệu và ánh xạ qua formatter
    const formattedData = (data.values || []).map((row: any[], index: number) => config.formatter(row, index));

    // Filter based on role and config type
    let filteredData = formattedData;

    // Special handling for content data - skip filtering
    if (configKey === 'content') {
        return formattedData;
    }

    if (userInfo?.role === 'NCC') {
        if (configKey === 'updateVN' || configKey === 'updateNN') {
            // For NCC users, only show rows where row[26] matches their username
            filteredData = formattedData.filter((row: any, index: number) => {
                const rawRow = data.values?.[index];
                return rawRow?.[26] === userInfo?.username;
            });
        } else {
            // For other configs, don't show any data to NCC users
            filteredData = [];
        }
    } else {
        // For non-NCC users, apply the original "Bình thường" filter
        if (configKey !== 'updateVN' && configKey !== 'updateNN') {
            filteredData = formattedData.filter((row: any) => row["Tình trạng"] === "Bình thường");
        }
    }
    return filteredData;
});

export async function POST(req: Request) {
    try {
        const cookieStore = cookies();
        const userInfoCookie = cookieStore.get('userInfo');
        const userInfo = userInfoCookie ? JSON.parse(userInfoCookie.value) : {};

        const client = await getAuthClient();
        const gsapi = google.sheets({ version: 'v4', auth: client });

        const results = await Promise.all(
            Object.entries(sheetConfigs).map(async ([key, config]) => {
                const data = await getSheetData(gsapi, config, key, userInfo);
                return [key, data];
            })
        );

        return NextResponse.json(Object.fromEntries(results), { status: 200 });
    } catch (error: any) {
        console.error('Error accessing Google Sheets API:', error);
        return NextResponse.json({ error: true, message: error.message }, { status: 500 });
    }
}