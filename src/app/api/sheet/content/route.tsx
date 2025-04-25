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
            range: 'Content!Z3:AH',
        });

        const formattedData = (data.values || []).map((row: any[]) => ({
            MaNCC: row[0] || "",
            TenSP: row[3],
            GiaMua: row[4],
            GiaBan: row[5],
            IDNhom: row[6],
            Note: row[7],
        }));

        return NextResponse.json({ content: formattedData }, { status: 200 });
    } catch (error: any) {
        console.error('Error accessing Google Sheets API:', error);
        return NextResponse.json({ error: true, message: error.message }, { status: 500 });
    }
}