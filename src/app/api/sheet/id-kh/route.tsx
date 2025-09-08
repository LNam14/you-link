import { google } from "googleapis";
import keys from "../../../../../key.json";
import { NextResponse } from "next/server";

const SPREADSHEET_ID = "1SDvAA8pPWUl2Fi2ubFIFttS5D7rA1P-DHrHuJj9X4Z8";
const BOT_TOKEN = "8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U";
const FALLBACK_CHAT_ID = "-4793551677"; // Chat ID khi thiếu IdGroup

interface SheetConfig {
    range: string;
    formatter: (row: any[]) => Record<string, any>;
}

const sheetConfigs: Record<string, SheetConfig> = {
    ncc: {
        range: "IDTele!N:R",
        formatter: (row) => ({
            MaKH: row[0],
            IdGroup: row[4] || "",
        }),
    },
};

async function getAllSheetData(gsapi: any) {
    const { data } = await gsapi.spreadsheets.values.batchGet({
        spreadsheetId: SPREADSHEET_ID,
        ranges: [sheetConfigs.ncc.range],
    });
    return data.valueRanges[0]?.values?.map((row: any) => sheetConfigs.ncc.formatter(row)) || [];
}

async function sendTelegramMessage(chatId: string, text: string) {
    const url = `https://ylink.qctl44.workers.dev/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
    return await res.json();
}

export async function POST(req: Request) {
    try {
        const { MaKH, message } = await req.json();
        console.log("MaKH, message", MaKH, message);

        if (!MaKH) {
            return NextResponse.json({ error: "Thiếu thông tin MaKH" }, { status: 400 });
        }

        let chatId = "";
        let messageText = "";

        if (MaKH === "NoNCC") {
            chatId = FALLBACK_CHAT_ID;
            messageText = "Có đơn hàng nhưng thiếu KH, vui lòng check tại https://ylink.shop/gp-text";
        } else {
            const client = new google.auth.JWT(keys.client_email, undefined, keys.private_key, [
                "https://www.googleapis.com/auth/spreadsheets",
            ]);
            await client.authorize();
            const gsapi = google.sheets({ version: "v4", auth: client });

            const nccData = await getAllSheetData(gsapi);
            const matchedKH = nccData.find((ncc: any) => ncc.MaKH === MaKH);

            if (!matchedKH) {
                return NextResponse.json({ error: `Không tìm thấy KH ${MaKH}` }, { status: 404 });
            }

            if (!matchedKH.IdGroup) {
                chatId = FALLBACK_CHAT_ID;
                messageText = `Thiếu ID Group của KH ${MaKH}`;
            } else {
                chatId = matchedKH.IdGroup;
                messageText = message || `Bài đã được đăng, vui lòng check tại https://ylink.shop/gp-text`;
            }
        }

        const mainResponse = await sendTelegramMessage(chatId, messageText);

        if (!mainResponse.ok) {
            return NextResponse.json(
                { error: "Gửi tin nhắn chính thất bại", details: mainResponse.description },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: "Đã gửi tin nhắn thành công!" }, { status: 200 });
    } catch (e: any) {
        console.error("Lỗi:", e);
        return NextResponse.json({ error: true, message: e.message }, { status: 500 });
    }
}
