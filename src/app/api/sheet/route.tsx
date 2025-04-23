import { google } from "googleapis";
import { NextResponse } from 'next/server';
import { cache } from 'react';
import { cookies } from 'next/headers';

// Import keys securely (consider using environment variables instead)
import keys from "../../../../key.json";

const SPREADSHEET_ID = '10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU';

interface SheetConfig {
    range: string;
    formatter: (row: any[], index: number) => Record<string, string | number>;
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
            "Giá GP": row[34] || "",
            "Giá Footer": row[35] || "",
            "Giá Home": row[36] || "",
            "Giá Header": row[37] || "",
            GiaMuaGP: row[21] || 0,
            GiaMuaText: row[22] || 0,
            GiaMuaTextHome: row[23] || 0,
            GiaMuaTextHeader: row[24] || 0,
            HoaHongGP: row[25] || 0,
            HoaHongText: row[26] || 0,
            NCC: row[29] || "",
            MaNCC: row[30] || "",
        })
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
            "GP ($)": row[21] || 0,
            "Text Footer ($)": row[22] || 0,
            "Text Home ($)": row[23] || 0,
            "Text Header ($)": row[24] || 0,
            "HH GP": row[25] || 0,
            "HH Text": row[26] || 0,
        })
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
            "GP ($)": row[21] || 0,
            "Text Footer ($)": row[22] || 0,
            "Text Home ($)": row[23] || 0,
            "Text Header ($)": row[24] || 0,
            "HH GP": row[25] || 0,
            "HH Text": row[26] || 0,
        })
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
            "Giá GP": row[12] || "",
            "Giá Footer": row[13] || "",
            "Giá Home": row[14] || "",
            "Giá Header": row[15] || "",
            GiaMuaGP: row[21] || 0,
            GiaMuaText: row[22] || 0,
            GiaMuaTextHome: row[23] || 0,
            GiaMuaTextHeader: row[24] || 0,
            HoaHongGP: row[25] || 0,
            HoaHongText: row[26] || 0,
            NCC: row[29] || "",
            MaNCC: row[30] || "",
        })
    },
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
        spreadsheetId: SPREADSHEET_ID,
        range: config.range,
    });
    // Lấy dữ liệu và ánh xạ qua formatter
    const formattedData = (data.values || []).map((row: any[], index: number) => config.formatter(row, index));

    // Filter based on role and config type
    let filteredData = formattedData;

    if (userInfo.role === 'NCC') {
        if (configKey === 'updateVN' || configKey === 'updateNN') {
            // For NCC users, only show rows where row[30] matches their username
            filteredData = formattedData.filter((row: any, index: number) => {
                const rawRow = data.values?.[index];
                return rawRow?.[30] === userInfo.username;
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