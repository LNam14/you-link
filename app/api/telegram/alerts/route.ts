import { NextRequest } from "next/server";
import { google } from "googleapis";
import { TelegramService } from "@/lib/services/telegram.service";
import { CustomerService } from "@/lib/services/customer.service";
import { UserService } from "@/lib/services/user.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";
import { CustomerResponse } from "@/lib/types";

const telegramService = new TelegramService();
const customerService = new CustomerService();
const userService = new UserService();

const TELEGRAM_GROUP_ID = "-1002298300938";
const SPREADSHEET_ID = "1SDvAA8pPWUl2Fi2ubFIFttS5D7rA1P-DHrHuJj9X4Z8";

interface CustomerWithCaregivers extends CustomerResponse {
  ng_cham_1_telegram?: string;
  ng_cham_2_telegram?: string;
}

/**
 * Chuyển đổi số thành chuỗi với định dạng số
 */
function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) || 0 : value;
  return num.toLocaleString("vi-VN");
}

/**
 * Tạo bảng ASCII cho cảnh báo vượt tín dụng
 */
function formatCreditOverdueTable(customers: CustomerWithCaregivers[]): string {
  if (customers.length === 0) return "";

  // Tính độ rộng cột
  const colWidths = {
    ma_moi: Math.max(8, ...customers.map((c) => c.ma_moi.length)),
    cong_no: Math.max(8, ...customers.map((c) => formatNumber(c.cong_no).length)),
    tin_dung: Math.max(10, ...customers.map((c) => formatNumber(c.tin_dung).length)),
    ng_cham_1: Math.max(8, ...customers.map((c) => (c.ng_cham_1 || "").length)),
    ng_cham_2: Math.max(8, ...customers.map((c) => (c.ng_cham_2 || "").length)),
  };

  // Header
  const header = [
    "│",
    " Mã mới".padEnd(colWidths.ma_moi + 1),
    "│",
    " Công nợ".padEnd(colWidths.cong_no + 1),
    "│",
    " Tín dụng".padEnd(colWidths.tin_dung + 1),
    "│",
    " NgChăm1".padEnd(colWidths.ng_cham_1 + 1),
    "│",
    " NgChăm2".padEnd(colWidths.ng_cham_2 + 1),
    "│",
  ].join("");

  const separator = [
    "├",
    "─".repeat(colWidths.ma_moi + 1),
    "┼",
    "─".repeat(colWidths.cong_no + 1),
    "┼",
    "─".repeat(colWidths.tin_dung + 1),
    "┼",
    "─".repeat(colWidths.ng_cham_1 + 1),
    "┼",
    "─".repeat(colWidths.ng_cham_2 + 1),
    "┤",
  ].join("");

  const topBorder = [
    "┌",
    "─".repeat(colWidths.ma_moi + 1),
    "┬",
    "─".repeat(colWidths.cong_no + 1),
    "┬",
    "─".repeat(colWidths.tin_dung + 1),
    "┬",
    "─".repeat(colWidths.ng_cham_1 + 1),
    "┬",
    "─".repeat(colWidths.ng_cham_2 + 1),
    "┐",
  ].join("");

  const bottomBorder = [
    "└",
    "─".repeat(colWidths.ma_moi + 1),
    "┴",
    "─".repeat(colWidths.cong_no + 1),
    "┴",
    "─".repeat(colWidths.tin_dung + 1),
    "┴",
    "─".repeat(colWidths.ng_cham_1 + 1),
    "┴",
    "─".repeat(colWidths.ng_cham_2 + 1),
    "┘",
  ].join("");

  const rows = customers.map((customer) => {
    const ma_moi = customer.ma_moi.padEnd(colWidths.ma_moi);
    const cong_no = formatNumber(customer.cong_no).padStart(colWidths.cong_no);
    const tin_dung = formatNumber(customer.tin_dung).padStart(colWidths.tin_dung);
    const ng_cham_1 = (customer.ng_cham_1 || "").padEnd(colWidths.ng_cham_1);
    const ng_cham_2 = (customer.ng_cham_2 || "").padEnd(colWidths.ng_cham_2);

    return [
      "│",
      ` ${ma_moi}`,
      "│",
      ` ${cong_no}`,
      "│",
      ` ${tin_dung}`,
      "│",
      ` ${ng_cham_1}`,
      "│",
      ` ${ng_cham_2}`,
      "│",
    ].join("");
  });

  return [
    topBorder,
    header,
    separator,
    ...rows,
    bottomBorder,
  ].join("\n");
}

/**
 * Tạo bảng ASCII cho cảnh báo rủi ro
 */
function formatRiskTable(customers: CustomerWithCaregivers[]): string {
  if (customers.length === 0) return "";

  // Tính độ rộng cột
  const colWidths = {
    ma_moi: Math.max(8, ...customers.map((c) => c.ma_moi.length)),
    tinh_trang: Math.max(12, ...customers.map((c) => (c.tinh_trang || "").length)),
    ng_cham_1: Math.max(8, ...customers.map((c) => (c.ng_cham_1 || "").length)),
    ng_cham_2: Math.max(8, ...customers.map((c) => (c.ng_cham_2 || "").length)),
  };

  // Header
  const header = [
    "│",
    " Mã mới".padEnd(colWidths.ma_moi + 1),
    "│",
    " Tình trạng".padEnd(colWidths.tinh_trang + 1),
    "│",
    " NgChăm1".padEnd(colWidths.ng_cham_1 + 1),
    "│",
    " NgChăm2".padEnd(colWidths.ng_cham_2 + 1),
    "│",
  ].join("");

  const separator = [
    "├",
    "─".repeat(colWidths.ma_moi + 1),
    "┼",
    "─".repeat(colWidths.tinh_trang + 1),
    "┼",
    "─".repeat(colWidths.ng_cham_1 + 1),
    "┼",
    "─".repeat(colWidths.ng_cham_2 + 1),
    "┤",
  ].join("");

  const topBorder = [
    "┌",
    "─".repeat(colWidths.ma_moi + 1),
    "┬",
    "─".repeat(colWidths.tinh_trang + 1),
    "┬",
    "─".repeat(colWidths.ng_cham_1 + 1),
    "┬",
    "─".repeat(colWidths.ng_cham_2 + 1),
    "┐",
  ].join("");

  const bottomBorder = [
    "└",
    "─".repeat(colWidths.ma_moi + 1),
    "┴",
    "─".repeat(colWidths.tinh_trang + 1),
    "┴",
    "─".repeat(colWidths.ng_cham_1 + 1),
    "┴",
    "─".repeat(colWidths.ng_cham_2 + 1),
    "┘",
  ].join("");

  const rows = customers.map((customer) => {
    const ma_moi = customer.ma_moi.padEnd(colWidths.ma_moi);
    const tinh_trang = (customer.tinh_trang || "").padEnd(colWidths.tinh_trang);
    const ng_cham_1 = (customer.ng_cham_1 || "").padEnd(colWidths.ng_cham_1);
    const ng_cham_2 = (customer.ng_cham_2 || "").padEnd(colWidths.ng_cham_2);

    return [
      "│",
      ` ${ma_moi}`,
      "│",
      ` ${tinh_trang}`,
      "│",
      ` ${ng_cham_1}`,
      "│",
      ` ${ng_cham_2}`,
      "│",
    ].join("");
  });

  return [
    topBorder,
    header,
    separator,
    ...rows,
    bottomBorder,
  ].join("\n");
}

/**
 * Lấy danh sách telegram của người chăm sóc
 */
function getMentionText(customers: CustomerWithCaregivers[]): string {
  const mentionedUsers = new Set<string>();
  
  customers.forEach((customer) => {
    if (customer.ng_cham_1_telegram) {
      const telegram = customer.ng_cham_1_telegram.startsWith("@") 
        ? customer.ng_cham_1_telegram 
        : `@${customer.ng_cham_1_telegram}`;
      mentionedUsers.add(telegram);
    }
    if (customer.ng_cham_2_telegram) {
      const telegram = customer.ng_cham_2_telegram.startsWith("@") 
        ? customer.ng_cham_2_telegram 
        : `@${customer.ng_cham_2_telegram}`;
      mentionedUsers.add(telegram);
    }
  });

  if (mentionedUsers.size === 0) return "";

  return `\n\n${Array.from(mentionedUsers).join(" ")}`;
}

/**
 * POST /api/telegram/alerts
 * Gửi cảnh báo vượt tín dụng và rủi ro tới Telegram
 * 
 * Body (optional):
 * {
 *   "chatId": "-1002298300938" (optional, mặc định là "-1002298300938")
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);

    const body = await request.json().catch(() => ({}));
    const chatId = body.chatId || TELEGRAM_GROUP_ID;

    // Lấy tất cả khách hàng
    const allCustomers = await customerService.getAllCustomers();
    
    // Lấy công nợ từ Google Sheets
    let congNoMap = new Map<string, string>();
    try {
      const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

      if (clientEmail && privateKey) {
        const auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey.replace(/\\n/g, "\n"),
          scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        await auth.authorize();
        const gsapi = google.sheets({ version: "v4", auth });

        const sheetResponse = await gsapi.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "CongNo!A4:B",
        });

        const sheetData = sheetResponse.data.values || [];
        sheetData
          .filter((row) => row && row.length >= 2 && row[0] && row[1])
          .forEach((row) => {
            congNoMap.set(row[0].trim(), row[1].trim());
          });
      }
    } catch (error) {
      console.warn("Could not fetch cong no from sheet:", error);
    }

    // Gắn công nợ vào khách hàng
    const customersWithCongNo = allCustomers.map((customer) => ({
      ...customer,
      cong_no: congNoMap.get(customer.ma_moi) || customer.cong_no || "0",
    }));

    // Lấy tất cả users để map fullname sang telegram
    const allUsers = await userService.getAllUsers();
    const userMap = new Map<string, string>();
    allUsers.forEach((user) => {
      if (user.fullname && user.telegram) {
        userMap.set(user.fullname.trim(), user.telegram.trim());
      }
    });

    // Lọc khách hàng vượt tín dụng
    const creditOverdueCustomers: CustomerWithCaregivers[] = customersWithCongNo
      .filter((customer) => {
        const congNo = parseFloat(customer.cong_no || "0") || 0;
        const tinDung = parseFloat(customer.tin_dung || "0") || 0;
        return congNo > tinDung;
      })
      .map((customer) => ({
        ...customer,
        ng_cham_1_telegram: customer.ng_cham_1 ? userMap.get(customer.ng_cham_1.trim()) : undefined,
        ng_cham_2_telegram: customer.ng_cham_2 ? userMap.get(customer.ng_cham_2.trim()) : undefined,
      }));

    // Lọc khách hàng rủi ro
    const riskCustomers: CustomerWithCaregivers[] = customersWithCongNo
      .filter((customer) => {
        const tinhTrang = (customer.tinh_trang || "").trim();
        return tinhTrang === "Rủi ro" || tinhTrang === "Rủi ro cao";
      })
      .map((customer) => ({
        ...customer,
        ng_cham_1_telegram: customer.ng_cham_1 ? userMap.get(customer.ng_cham_1.trim()) : undefined,
        ng_cham_2_telegram: customer.ng_cham_2 ? userMap.get(customer.ng_cham_2.trim()) : undefined,
      }));

    const messages: string[] = [];

    // Gửi cảnh báo vượt tín dụng
    if (creditOverdueCustomers.length > 0) {
      const table = formatCreditOverdueTable(creditOverdueCustomers);
      const mentionText = getMentionText(creditOverdueCustomers);
      const message = `🚨 Công nợ vượt tín dụng\n\n${table}${mentionText}`;
      
      await telegramService.sendMessage({
        chatId,
        message,
      });
      
      messages.push("Đã gửi cảnh báo vượt tín dụng");
    }

    // Gửi cảnh báo rủi ro
    if (riskCustomers.length > 0) {
      const table = formatRiskTable(riskCustomers);
      const mentionText = getMentionText(riskCustomers);
      const message = `⚠️ Khách hàng rủi ro\n\n${table}${mentionText}`;
      
      await telegramService.sendMessage({
        chatId,
        message,
      });
      
      messages.push("Đã gửi cảnh báo rủi ro");
    }

    if (messages.length === 0) {
      return successResponse({
        message: "Không có khách hàng nào cần cảnh báo",
        creditOverdueCount: 0,
        riskCount: 0,
      });
    }

    return successResponse({
      message: messages.join(", "),
      creditOverdueCount: creditOverdueCustomers.length,
      riskCount: riskCustomers.length,
    });
  } catch (error) {
    console.error("Error sending alerts:", error);
    return errorResponse(error as Error);
  }
}

/**
 * GET /api/telegram/alerts
 * Lấy danh sách khách hàng cần cảnh báo (không gửi tin nhắn)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);

    // Lấy tất cả khách hàng
    const allCustomers = await customerService.getAllCustomers();
    
    // Lấy công nợ từ Google Sheets
    let congNoMap = new Map<string, string>();
    try {
      const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

      if (clientEmail && privateKey) {
        const auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey.replace(/\\n/g, "\n"),
          scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        await auth.authorize();
        const gsapi = google.sheets({ version: "v4", auth });

        const sheetResponse = await gsapi.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "CongNo!A4:B",
        });

        const sheetData = sheetResponse.data.values || [];
        sheetData
          .filter((row) => row && row.length >= 2 && row[0] && row[1])
          .forEach((row) => {
            congNoMap.set(row[0].trim(), row[1].trim());
          });
      }
    } catch (error) {
      console.warn("Could not fetch cong no from sheet:", error);
    }

    // Gắn công nợ vào khách hàng
    const customersWithCongNo = allCustomers.map((customer) => ({
      ...customer,
      cong_no: congNoMap.get(customer.ma_moi) || customer.cong_no || "0",
    }));

    // Lấy tất cả users để map fullname sang telegram
    const allUsers = await userService.getAllUsers();
    const userMap = new Map<string, string>();
    allUsers.forEach((user) => {
      if (user.fullname && user.telegram) {
        userMap.set(user.fullname.trim(), user.telegram.trim());
      }
    });

    // Lọc khách hàng vượt tín dụng
    const creditOverdueCustomers = customersWithCongNo
      .filter((customer) => {
        const congNo = parseFloat(customer.cong_no || "0") || 0;
        const tinDung = parseFloat(customer.tin_dung || "0") || 0;
        return congNo > tinDung;
      })
      .map((customer) => ({
        ...customer,
        ng_cham_1_telegram: customer.ng_cham_1 ? userMap.get(customer.ng_cham_1.trim()) : undefined,
        ng_cham_2_telegram: customer.ng_cham_2 ? userMap.get(customer.ng_cham_2.trim()) : undefined,
      }));

    // Lọc khách hàng rủi ro
    const riskCustomers = customersWithCongNo
      .filter((customer) => {
        const tinhTrang = (customer.tinh_trang || "").trim();
        return tinhTrang === "Rủi ro" || tinhTrang === "Rủi ro cao";
      })
      .map((customer) => ({
        ...customer,
        ng_cham_1_telegram: customer.ng_cham_1 ? userMap.get(customer.ng_cham_1.trim()) : undefined,
        ng_cham_2_telegram: customer.ng_cham_2 ? userMap.get(customer.ng_cham_2.trim()) : undefined,
      }));

    return successResponse({
      creditOverdue: creditOverdueCustomers,
      risk: riskCustomers,
      creditOverdueCount: creditOverdueCustomers.length,
      riskCount: riskCustomers.length,
    });
  } catch (error) {
    console.error("Error getting alerts data:", error);
    return errorResponse(error as Error);
  }
}

