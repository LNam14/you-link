import { google } from "googleapis";
import keys from "../../../../../key.json";
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU';

// Map of field names to their column indices (0-based)
const FIELD_COLUMN_MAP = {
    'Site': 1, // B column
    'Chủ đề': 4, // D column
    'Nước': 5, // E column
    'Link out': 7, // G column
    'DR': 8, // H column
    'Keywords': 9, // I column
    'Traffic Tool': 10, // J column
    'Tình trạng': 12, // L column
    'GP ($)': 22, // U column (GP ($))
    'Text Footer ($)': 23, // V column (Text Footer($))
    'Text Home ($)': 24, // W column (Text Home($))
    'Text Header ($)': 25, // X column (Text Header($))
    'HH GP': 26, // Y column (HH GP)
    'HH Text': 27, // Z column (HH Text)
};

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
        const { data, sheetType } = body;

        if (!Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        // Group updates by row to minimize API calls
        const updatesByRow = data.reduce((acc: Record<string, any[]>, row: any) => {
            const rowIndex = row.rowIndex;
            Object.entries(row.changes).forEach(([field, value]) => {
                const columnIndex = FIELD_COLUMN_MAP[field as keyof typeof FIELD_COLUMN_MAP];
                if (columnIndex === undefined) return;

                const columnLetter = String.fromCharCode(65 + columnIndex);
                const range = `${sheetType === 1 ? '1' : '2'}!${columnLetter}${rowIndex}`;

                if (!acc[range]) {
                    acc[range] = [];
                }
                acc[range].push(value);
            });
            return acc;
        }, {});

        // Convert grouped updates to batch update format
        const updates = Object.entries(updatesByRow).map(([range, values]) => ({
            range,
            values: values.map(value => [value])
        }));

        if (updates.length === 0) {
            return NextResponse.json({ success: true, message: 'No updates to apply' }, { status: 200 });
        }

        // Batch update the sheet
        const response = await gsapi.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: 'USER_ENTERED',
                data: updates
            }
        });

        return NextResponse.json({ success: true, response: response.data }, { status: 200 });
    } catch (error: any) {
        console.error('Error updating Google Sheet:', error);
        return NextResponse.json({ error: true, message: error.message }, { status: 500 });
    }
} 