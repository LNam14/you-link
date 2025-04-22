import { google } from "googleapis";
import keys from "../../../../../key.json";
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU';

export async function POST(req: Request) {
    try {
        const client = new google.auth.JWT(
            keys.client_email,
            undefined,
            keys.private_key,
            ['https://www.googleapis.com/auth/spreadsheets']
        );

        await client.authorize();
        const gsapi = google.sheets({ version: 'v4', auth: client });

        const body = await req.json();
        const { rows, sheetType } = body;

        if (!Array.isArray(rows)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        // Convert rows to 2D array format for Google Sheets
        const values = rows.map(row => [
            '', // STT
            row['Site'] || '',
            '', // Blank column
            row['Chủ đề'] || '',
            row['Nước'] || '',
            '', // Blank column
            row['Link out'] || '',
            row['DR'] || '',
            row['Keywords'] || '',
            row['Traffic Tool'] || '',
            '', // Blank column
            row['Tình trạng'] || 'Bình thường',
            '', // Many blank columns...
            '', '', '', '', '', '', '', '', '',
            row['GP ($)'] || '',
            row['Text Footer ($)'] || '',
            row['Text Home ($)'] || '',
            row['Text Header ($)'] || '',
            '', '', '', '',
            row['HH GP'] || '',
            row['HH Text'] || ''
        ]);

        // Append rows to the sheet
        const response = await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetType === 1 ? '1' : '2'}!A:ZZ`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values
            }
        });

        return NextResponse.json({ success: true, response: response.data }, { status: 200 });
    } catch (error: any) {
        console.error('Error appending to Google Sheet:', error);
        return NextResponse.json({ error: true, message: error.message }, { status: 500 });
    }
} 