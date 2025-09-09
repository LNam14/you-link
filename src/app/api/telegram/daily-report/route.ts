import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface CustomerData {
  MaMoi: string;
  CongNo: string;
  TinDung: string;
  NguoiCham1: string;
  NguoiCham2: string;
  TinhTrang: string;
  NguoiCham1Position?: string;
  NguoiCham2Position?: string;
}

interface Account {
  name: string;
  position: string;
}

function formatCustomerTable(customers: CustomerData[], caseType: 1 | 2): string {
  if (customers.length === 0) {
    return caseType === 1
      ? "✅ Không có khách hàng nào có công nợ vượt tín dụng."
      : "✅ Không có khách hàng nào có trạng thái rủi ro.";
  }

  const headers =
    caseType === 1
      ? ["Mã mới", "Công nợ", "Tín dụng", "NgChăm1", "NgChăm2"]
      : ["Mã mới", "Tình trạng", "NgChăm1", "NgChăm2"];

  const validCustomers = customers.filter((c) => c.MaMoi && c.MaMoi.trim() !== "");
  if (validCustomers.length === 0) {
    return caseType === 1
      ? "✅ Không có khách hàng nào có công nợ vượt tín dụng."
      : "✅ Không có khách hàng nào có trạng thái rủi ro.";
  }

  const colWidths = headers.map((h, i) =>
    Math.max(
      h.length,
      ...validCustomers.map((c) => {
        switch (i) {
          case 0:
            return c.MaMoi.length;
          case 1:
            return caseType === 1 ? c.CongNo.length : c.TinhTrang.length;
          case 2:
            return c.NguoiCham1.length;
          case 3:
            return c.NguoiCham2.length;
          case 4:
            return 0;
          default:
            return 0;
        }
      })
    )
  );

  const pad = (text: string, len: number, align: "left" | "right" = "left") =>
    align === "left" ? text.padEnd(len, " ") : text.padStart(len, " ");

  const lineTop = "┌" + colWidths.map((w) => "─".repeat(w + 2)).join("┬") + "┐";
  const lineMid = "├" + colWidths.map((w) => "─".repeat(w + 2)).join("┼") + "┤";
  const lineBot = "└" + colWidths.map((w) => "─".repeat(w + 2)).join("┴") + "┘";

  const headerRow =
    "│ " + headers.slice(0, colWidths.length).map((h, i) => pad(h, colWidths[i])).join(" │ ") + " │";

  const dataRows = validCustomers
    .filter((c) => (caseType === 1 ? Number(c.CongNo) > Number(c.TinDung) : true))
    .map((c) => {
      const row =
        caseType === 1
          ? [
              pad(c.MaMoi, colWidths[0]),
              pad(c.CongNo, colWidths[1], "right"),
              pad(c.TinDung, colWidths[2], "right"),
              pad(c.NguoiCham1, colWidths[3]),
              pad(c.NguoiCham2, colWidths[4] || 0),
            ]
          : [
              pad(c.MaMoi, colWidths[0]),
              pad(c.TinhTrang, colWidths[1]),
              pad(c.NguoiCham1, colWidths[2]),
              pad(c.NguoiCham2, colWidths[3] || 0),
            ];
      return "│ " + row.join(" │ ") + " │";
    })
    .join("\n");

  return `<pre>\n${lineTop}\n${headerRow}\n${lineMid}\n${dataRows}\n${lineBot}\n</pre>`;
}

const addPosition = (list: CustomerData[], accounts: Account[]) =>
  list.map((c) => {
    const acc1 = accounts.find((a) => a.name === c.NguoiCham1);
    const acc2 = accounts.find((a) => a.name === c.NguoiCham2);

    return {
      ...c,
      NguoiCham1Position: acc1?.position || "",
      NguoiCham2Position: acc2?.position || "",
    };
  });

function buildPositionsText(customers: CustomerData[]): string {
  const positionsSet = new Set<string>();
  customers.forEach((c) => {
    if (c.NguoiCham1Position) positionsSet.add(c.NguoiCham1Position);
    if (c.NguoiCham2Position) positionsSet.add(c.NguoiCham2Position);
  });
  return Array.from(positionsSet).join("\n");
}

async function sendTelegramMessage(message: string): Promise<boolean> {
  try {
    const baseUrl = "https://www.ylink.shop";
    const chunks: string[] = [];
    for (let i = 0; i < message.length; i += 4000) {
      chunks.push(message.slice(i, i + 4000));
    }

    for (const chunk of chunks) {
      const resp = await fetch(`${baseUrl}/api/telegram/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chunk }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        console.error("Failed to send Telegram message:", err);
        return false;
      }
    }
    return true;
  } catch (e) {
    console.error("Error sending Telegram message:", e);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const baseUrl = "https://www.ylink.shop";

    const accounts: any = await prisma.account.findMany({
      select: { name: true, position: true },
    });

    const customerDataResponse = await fetch(`${baseUrl}/api/telegram/get-customer-data`);
    if (!customerDataResponse.ok) {
      throw new Error("Failed to get customer data");
    }
    const { case1, case2 } = await customerDataResponse.json();

    const case1WithPos = addPosition(case1, accounts);
    const case2WithPos = addPosition(case2, accounts);

    let messagesSent = 0;
    const results: string[] = [];

    const message1 =
      "🚨 <b>Công nợ vượt tín dụng</b>\n\n" +
      formatCustomerTable(case1WithPos, 1) +
      "\n" +
      buildPositionsText(case1WithPos);
    const sent1 = await sendTelegramMessage(message1);
    results.push(sent1 ? "Case 1: Sent OK" : "Case 1: Failed");
    if (sent1) messagesSent++;

    const message2 =
      "⚠️ <b>Khách hàng rủi ro</b>\n\n" +
      formatCustomerTable(case2WithPos, 2) +
      "\n" +
      buildPositionsText(case2WithPos);
    const sent2 = await sendTelegramMessage(message2);
    results.push(sent2 ? "Case 2: Sent OK" : "Case 2: Failed");
    if (sent2) messagesSent++;

    return NextResponse.json({
      success: true,
      messagesSent,
      results,
      case1Count: case1WithPos.length,
      case2Count: case2WithPos.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Daily report process failed",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
