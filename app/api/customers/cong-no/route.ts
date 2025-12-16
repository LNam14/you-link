import { NextRequest } from "next/server";
import { google } from "googleapis";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";

const SPREADSHEET_ID = "1SDvAA8pPWUl2Fi2ubFIFttS5D7rA1P-DHrHuJj9X4Z8";

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);

    // Lấy credentials từ biến môi trường
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      throw new Error("Missing Google Sheets credentials. Please set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY in .env.local");
    }

    // Ủy quyền Google API
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    await auth.authorize();

    const gsapi = google.sheets({ version: "v4", auth });

    // Đọc dữ liệu từ Sheet 2C!B2:C
    const sheetResponse = await gsapi.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "CongNo!A4:B",
    });

    const sheetData = sheetResponse.data.values || [];

    // Trả về mảng [ma_moi, cong_no]
    const congNoData = sheetData
      .filter((row) => row && row.length >= 2 && row[0] && row[1])
      .map((row) => [row[0].trim(), row[1].trim()]);

    return successResponse(congNoData);
  } catch (error) {
    console.error("Error fetching Google Sheets data:", error);
    return errorResponse(error as Error);
  }
}

