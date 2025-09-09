import { NextRequest, NextResponse } from 'next/server';

interface CustomerData {
  MaMoi: string;
  CongNo: string;
  TinDung: string;
  NguoiCham1: string;
  NguoiCham2: string;
  TinhTrang: string;
}

// Helper function to format customer data as HTML table
function formatCustomerTable(customers: CustomerData[], caseType: 1 | 2): string {
  if (customers.length === 0) {
    return caseType === 1 
      ? '✅ Không có khách hàng nào có công nợ vượt tín dụng.'
      : '✅ Không có khách hàng nào có trạng thái rủi ro.';
  }

  let header = '';
  let message = '';

  if (caseType === 1) {
    header = '🚨 <b>THÔNG BÁO: CÔNG NỢ VƯỢT TÍN DỤNG</b>\n\n';
    message = '💰 <b>Các bạn kiểm tra và thu tiền nhé !!!</b>';
  } else {
    header = '⚠️ <b>THÔNG BÁO: TRẠNG THÁI RỦI RO</b>\n\n';
    message = '🔍 <b>Các bạn kiểm tra và thu tiền nhé</b>';
  }

  // Create a more readable table format
  const tableHeader = `
<pre>
┌─────────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ <b>Mã mới</b>         │ <b>Công nợ</b>     │ <b>Tín dụng</b>   │ <b>Người chăm 1</b> │ <b>Người chăm 2</b> │
├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤`;

  const tableRows = customers.map(customer => {
    const maMoi = customer.MaMoi.padEnd(15);
    const congNo = customer.CongNo.padEnd(11);
    const tinDung = customer.TinDung.padEnd(11);
    const nguoiCham1 = (customer.NguoiCham1 || 'N/A').padEnd(11);
    const nguoiCham2 = (customer.NguoiCham2 || 'N/A').padEnd(11);
    
    return `│ ${maMoi} │ ${congNo} │ ${tinDung} │ ${nguoiCham1} │ ${nguoiCham2} │`;
  }).join('\n');

  const tableFooter = `
└─────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
</pre>`;

  return `${header}${tableHeader}\n${tableRows}${tableFooter}\n\n${message}`;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Testing new message format...');

    // Create test data
    const testCustomers1: CustomerData[] = [
      {
        MaMoi: 'KH001',
        CongNo: '1,500,000',
        TinDung: '1,000,000',
        NguoiCham1: 'BH1',
        NguoiCham2: 'BH2',
        TinhTrang: 'Bình thường'
      },
      {
        MaMoi: 'KH002',
        CongNo: '2,500,000',
        TinDung: '2,000,000',
        NguoiCham1: 'BH3',
        NguoiCham2: 'BH4',
        TinhTrang: 'Bình thường'
      }
    ];

    const testCustomers2: CustomerData[] = [
      {
        MaMoi: 'KH003',
        CongNo: '500,000',
        TinDung: '1,000,000',
        NguoiCham1: 'BH5',
        NguoiCham2: 'BH6',
        TinhTrang: 'Rủi ro'
      },
      {
        MaMoi: 'KH004',
        CongNo: '800,000',
        TinDung: '1,500,000',
        NguoiCham1: 'BH7',
        NguoiCham2: 'BH8',
        TinhTrang: 'Rủi ro cao'
      }
    ];

    // Send test message for Case 1
    const message1 = formatCustomerTable(testCustomers1, 1);
    const response1 = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/telegram/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: message1 }),
    });

    // Send test message for Case 2
    const message2 = formatCustomerTable(testCustomers2, 2);
    const response2 = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/telegram/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: message2 }),
    });

    return NextResponse.json({
      success: true,
      message: 'Test format messages sent successfully',
      case1Sent: response1.ok,
      case2Sent: response2.ok,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Test format error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test format failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
