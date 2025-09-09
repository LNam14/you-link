import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = '8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U';
const CHAT_ID = '-1002298300938';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

interface CustomerData {
  MaMoi: string;
  CongNo: string;
  TinDung: string;
  NguoiCham1: string;
  NguoiCham2: string;
  TinhTrang: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to send message to Telegram', details: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error sending Telegram message:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to format customer data as HTML table
export function formatCustomerTable(customers: CustomerData[], caseType: 1 | 2): string {
  if (customers.length === 0) {
    return caseType === 1 
      ? 'Không có khách hàng nào có công nợ vượt tín dụng.'
      : 'Không có khách hàng nào có trạng thái rủi ro.';
  }

  let header = '';
  let message = '';

  if (caseType === 1) {
    header = '🚨 <b>THÔNG BÁO: KHÁCH HÀNG CÓ CÔNG NỢ VƯỢT TÍN DỤNG</b>\n\n';
    message = 'Các bạn kiểm tra và thu tiền nhé !!!';
  } else {
    header = '⚠️ <b>THÔNG BÁO: KHÁCH HÀNG CÓ TRẠNG THÁI RỦI RO</b>\n\n';
    message = 'Các bạn kiểm tra và thu tiền nhé';
  }

  const tableHeader = `
    <b>Khách hàng (Mã mới)</b> | <b>Công nợ</b> | <b>Tín dụng</b> | <b>Người chăm 1</b> | <b>Người chăm 2</b>
    ${'─'.repeat(80)}
  `;

  const tableRows = customers.map(customer => 
    `${customer.MaMoi} | ${customer.CongNo} | ${customer.TinDung} | ${customer.NguoiCham1 || 'N/A'} | ${customer.NguoiCham2 || 'N/A'}`
  ).join('\n');

  return `${header}${tableHeader}\n${tableRows}\n\n${message}`;
}
