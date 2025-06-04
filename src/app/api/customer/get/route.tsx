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
    const client = await pool.connect();
    try {
        // Start a transaction
        await client.query('BEGIN');

        // Execute all queries in parallel using Promise.all
        const [customerResult, accountResult, teamResult] = await Promise.all([
            client.query("SELECT * FROM customer_data ORDER BY id DESC"),
            client.query("SELECT name FROM account WHERE role = 'Nhân viên'"),
            client.query("SELECT name FROM team")
        ]);

        // Process customer data
        const customerData = customerResult.rows.map(row => ({
            ...row,
            ngay_check: formatDate(row.ngay_check),
        }));

        const staffNames = accountResult.rows.map(row => row.name);
        const teamNames = teamResult.rows.map(row => row.name);

        // Commit the transaction
        await client.query('COMMIT');

        // Get Google Sheets data after database operations are complete
        try {
            // Ủy quyền Google API
            const auth = new google.auth.JWT(
                keys.client_email,
                undefined,
                keys.private_key,
                ["https://www.googleapis.com/auth/spreadsheets.readonly"]
            );
            await auth.authorize();

            const gsapi = google.sheets({ version: "v4", auth });

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
        } catch (sheetsError) {
            console.error("Error fetching Google Sheets data:", sheetsError);
            // If Google Sheets fails, still return the database data
            return NextResponse.json(
                {
                    customers: customerData,
                    staffNames,
                    teamNames,
                    sheetsError: "Failed to fetch Google Sheets data"
                },
                { status: 200 }
            );
        }
    } catch (error: any) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error("Error in GET:", error);
        return NextResponse.json(
            {
                error: true,
                message: error.message,
                code: error.code // Include error code for better debugging
            },
            { status: 500 }
        );
    } finally {
        // Always release the client back to the pool
        client.release();
    }
}
