import { google } from "googleapis";
import { NextResponse } from 'next/server';
import { cache } from 'react';
import keys from "../../../../../key.json";

const SPREADSHEET_ID = '1SDvAA8pPWUl2Fi2ubFIFttS5D7rA1P-DHrHuJj9X4Z8';

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

export async function POST() {
    try {
        const client = await getAuthClient();
        const gsapi = google.sheets({ version: 'v4', auth: client });

        const { data } = await gsapi.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'CongNo!A3:B',
        });

        const formattedData = (data.values || [])
            .filter((row: any[]) => row[0] && row[1]) // chỉ lấy khi cả 2 đều có dữ liệu
            .map((row: any[]) => ({
                MaMoi: row[0],
                CongNo: row[1],
            }));

        return NextResponse.json({ content: formattedData }, { status: 200 });
    } catch (error: any) {
        console.error('Error accessing Google Sheets API:', error);
        return NextResponse.json({ error: true, message: error.message }, { status: 500 });
    }
}
