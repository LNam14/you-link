import { google } from "googleapis";
import keys from "../../../../../key.json";
import { NextResponse } from "next/server";
import { prisma, connectDB } from "@/lib/db";
import { AnyCnameRecord } from "dns";
// Add dynamic route configuration
export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = "1SDvAA8pPWUl2Fi2ubFIFttS5D7rA1P-DHrHuJj9X4Z8";

// Format ngày kiểu DD/MM/YYYY
const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; // Return original string if invalid date

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error("Error formatting date:", error);
        return dateStr; // Return original string if there's an error
    }
};

interface CustomerData {
    id: number;
    ma_moi: string;
    phan_loai: string;
    phien_ban: string;
    ma_cu: string;
    cty: string;
    ten: string[];
    telegram: string[];
    link_nhom: string;
    id_nhom: string;
    nhom: string;
    nguoi_cham: string;
    tab_don: string;
    cong_no: string;
    tin_dung: string;
    ngay_check: string | null;
    tinh_trang: string;
    note_kt: string;
    note_khac: string;
    created_at: Date;
    updated_at: Date;
}

interface Account {
    id: number;
    username: string | null;
    password: string | null;
    name: string | null;
    role: string;
    team: string | null;
    position: string | null;
    created_at: Date;
    updated_at: Date;
}

interface Team {
    id: number;
    name: string;
    created_at: Date;
    updated_at: Date;
}

export async function GET() {
    try {
        // Ensure database connection is established
        await connectDB();

        // Execute all queries in parallel using Promise.all
        const [customerResult, accountResult, teamResult] = await Promise.all([
            prisma.customer_data.findMany({
                orderBy: [
                    {
                        nhom: 'asc'
                    },
                    {
                        id: 'desc'
                    }
                ]
            }),
            prisma.account.findMany({
                where: {
                    role: 'Nhân viên'
                },
                select: {
                    name: true
                }
            }),
            prisma.team.findMany({
                select: {
                    name: true
                }
            })
        ]);

        // Process customer data
        const customerData = customerResult.map((row: any) => ({
            ...row,
            ngay_check: formatDate(row.ngay_check),
        }));

        const staffNames = accountResult.map((row: { name: string | null }) => row.name || '');
        const teamNames = teamResult.map((row: { name: any }) => row.name);

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
            const updatedCustomerData = customerData.map((customer: CustomerData & { ngay_check: string }) => ({
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
        console.error("Error in GET:", error);
        return NextResponse.json(
            {
                error: true,
                message: error.message,
                code: error.code // Include error code for better debugging
            },
            { status: 500 }
        );
    }
}
