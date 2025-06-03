import { google } from "googleapis";
import keys from "../../../../../key.json";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

const SPREADSHEET_ID = "1SDvAA8pPWUl2Fi2ubFIFttS5D7rA1P-DHrHuJj9X4Z8";

// Format ngày kiểu DD/MM/YYYY
const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export async function GET() {
    try {
        // Lấy dữ liệu từ database
        const customerResult = await pool.query("SELECT * FROM customer_data ORDER BY id DESC");
        const customerData = customerResult.rows.map(row => ({
            ...row,
            ngay_check: formatDate(row.ngay_check),
        }));

        const accountResult = await pool.query("SELECT name FROM account WHERE role = 'Nhân viên'");
        const staffNames = accountResult.rows.map(row => row.name);

        const teamResult = await pool.query("SELECT name FROM team");
        const teamNames = teamResult.rows.map(row => row.name);

        // Ủy quyền Google API
        const client = new google.auth.JWT(
            keys.client_email,
            undefined,
            keys.private_key,
            ["https://www.googleapis.com/auth/spreadsheets.readonly"]
        );
        await client.authorize();

        const gsapi = google.sheets({ version: "v4", auth: client });

        // Đọc dữ liệu từ Sheet CongNo!B2:C
        const sheetResponse = await gsapi.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "CongNo!B2:C",
        });

        const sheetData = sheetResponse.data.values || [];

        // Map dữ liệu: ma_moi => cong_no
        const congNoMap = new Map<string, string>();
        for (const [maMoi, congNo] of sheetData) {
            if (maMoi && congNo) {
                congNoMap.set(maMoi.trim(), congNo.trim());
            }
        }

        // Gắn giá trị công nợ vào từng customer
        const updatedCustomerData = customerData.map(customer => ({
            ...customer,
            cong_no: congNoMap.get(customer.ma_moi) || "", // Gắn nếu trùng
        }));

        return NextResponse.json(
            {
                customers: updatedCustomerData,
                staffNames,
                teamNames,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error in GET:", error);
        return NextResponse.json({ error: true, message: error.message }, { status: 500 });
    }
}
