import { google } from "googleapis";
import keys from "../../../../../key.json";
import { NextResponse } from 'next/server';

// Mark route as dynamic
export const dynamic = 'force-dynamic'

const SPREADSHEET_ID = '10GTx3pu_xGGMgeskiflaKla8ACHBn-bNzUvEEtGHyDU';

interface SheetConfig {
    range: string;
    formatter: (row: any[], allData: Record<string, any[]>) => Record<string, any>;
}

const sheetConfigs: Record<string, SheetConfig> = {
    data: {
        range: 'VN!A3:L,NN!A3:L',
        formatter: (row, allData) => {
            return {
                site: row[0] || "",
                topic: row[1] || "",
                linkOut: row[2] || "",
                DR: row[3] || "",
                TF: row[4] || "",
                note: row[5] || "",
                status: row[6] || "",
                gp: row[7] || "",
                footer: row[8] || "",
                home: row[9] || "",
                header: row[10] || "",
                attention: row[11] || ""
            };
        }
    },
};

async function getAllSheetData(gsapi: any) {
    const ranges = Object.values(sheetConfigs).map(config => config.range.split(',').map(range => range.trim())).flat();

    const { data } = await gsapi.spreadsheets.values.batchGet({
        spreadsheetId: SPREADSHEET_ID,
        ranges: ranges,
    });

    const rawData: Record<string, any[]> = {};
    let currentIndex = 0;

    for (const [key, config] of Object.entries(sheetConfigs)) {
        const numRanges = config.range.split(',').length;
        rawData[key] = data.valueRanges.slice(currentIndex, currentIndex + numRanges).flatMap((range: any) => range.values || []);
        currentIndex += numRanges;
    }

    return rawData;
}

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

        const rawData = await getAllSheetData(gsapi);

        // Then, format the data
        const formattedData: Record<string, any[]> = {};
        for (const [key, config] of Object.entries(sheetConfigs)) {
            formattedData[key] = rawData[key].map(row => config.formatter(row, rawData));
        }

        return NextResponse.json(formattedData, { status: 200 });

    } catch (e: any) {
        console.error('Error accessing Google Sheets API:', e);
        return NextResponse.json({ error: true, message: e.message }, { status: 500 });
    }
}

