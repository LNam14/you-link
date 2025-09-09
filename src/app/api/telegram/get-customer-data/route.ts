import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import sheetApiRequest from '@/apiRequests/sheet';

// Check if Firebase is properly initialized
if (!database) {
  console.error('Firebase database is not initialized');
}

interface CustomerData {
  MaMoi: string;
  CongNo: string;
  TinDung: string;
  NguoiCham1: string;
  NguoiCham2: string;
  TinhTrang: string;
}

// Helper function to get cong no value by MaMoi
const getCongNoByMaMoi = (maMoi: string, congNoData: any[]): string => {
  const congNoItem = congNoData.find(item => item.MaMoi === maMoi);
  if (congNoItem) {
    console.log(`Found cong no for ${maMoi}: ${congNoItem.CongNo}`);
  } else {
    console.log(`No cong no found for ${maMoi}, using default 0`);
  }
  return congNoItem?.CongNo || "0";
};

export async function GET(request: NextRequest) {
  try {
    console.log('Getting customer data from Firebase...');
    console.log('Environment variables check:');
    console.log('NEXT_PUBLIC_FIREBASE_DATABASE_URL:', process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ? 'Set' : 'Not set');
    console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Set' : 'Not set');
    
    if (!database) {
      throw new Error('Firebase database is not initialized');
    }
    
    // Get customer data from Firebase
    const customersRef = ref(database, 'customers');
    const snapshot = await get(customersRef);
    
    if (!snapshot.exists()) {
      console.log('No customer data found in Firebase');
      return NextResponse.json({ 
        case1: [], 
        case2: [],
        message: 'No customer data found' 
      });
    }

    const firebaseData = snapshot.val();
    const customersArray = Object.entries(firebaseData).map(([key, value]: [string, any]) => {
      return [...(value as any[]), key]; // Add Firebase key as last element
    });

    // Get cong no data from API
    console.log('Getting cong no data from API...');
    let congNoData = [];
    try {
      // Try direct API call first
      const baseUrl = "https://www.ylink.shop";
      const directResponse = await fetch(`${baseUrl}/api/sheet/receivable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (directResponse.ok) {
        const directData = await directResponse.json();
        console.log('Direct API response:', JSON.stringify(directData, null, 2));
        congNoData = directData.content || [];
      } else {
        console.log('Direct API failed, trying sheetApiRequest...');
        const congNoResponse:any = await sheetApiRequest.getCongNo();
        console.log('Sheet API response:', JSON.stringify(congNoResponse, null, 2));
        congNoData = congNoResponse.content || [];
      }
      
      console.log(`Found ${congNoData.length} cong no records`);
      if (congNoData.length > 0) {
        console.log('Sample cong no data:', congNoData.slice(0, 3));
      }
    } catch (error) {
      console.error('Error getting cong no data:', error);
      // Continue with empty cong no data
    }

    // Process customers and filter by conditions
    const case1Customers: CustomerData[] = []; // CongNo > TinDung
    const case2Customers: CustomerData[] = []; // TinhTrang === "Rủi ro" || "Rủi ro cao"

    console.log(`Processing ${customersArray.length} customers...`);

    customersArray.forEach((customer: any[]) => {
      const maMoi = customer[0] || ''; // Mã Mới
      const congNo = getCongNoByMaMoi(maMoi, congNoData); // Get from API
      const tinDung = customer[18] || '0'; // Tín Dụng
      const nguoiCham1 = customer[14] || ''; // Ng Chăm 1
      const nguoiCham2 = customer[15] || ''; // Ng Chăm 2
      const tinhTrang = customer[19] || ''; // Tình Trạng

      const customerData: CustomerData = {
        MaMoi: maMoi,
        CongNo: congNo,
        TinDung: tinDung,
        NguoiCham1: nguoiCham1,
        NguoiCham2: nguoiCham2,
        TinhTrang: tinhTrang,
      };

      // Case 1: CongNo > TinDung
      const congNoNum = parseFloat(congNo.replace(/,/g, '')) || 0;
      const tinDungNum = parseFloat(tinDung.replace(/,/g, '')) || 0;
      console.log(`Customer ${maMoi}: CongNo=${congNo} (${congNoNum}), TinDung=${tinDung} (${tinDungNum})`);
      if (congNoNum > tinDungNum) {
        case1Customers.push(customerData);
      }

      // Case 2: TinhTrang === "Rủi ro" || "Rủi ro cao"
      if (tinhTrang === 'Rủi ro' || tinhTrang === 'Rủi ro cao') {
        case2Customers.push(customerData);
      }
    });

    console.log(`Found ${case1Customers.length} customers for case 1 (CongNo > TinDung)`);
    console.log(`Found ${case2Customers.length} customers for case 2 (Risky status)`);

    return NextResponse.json({
      case1: case1Customers,
      case2: case2Customers,
      totalCustomers: customersArray.length,
      message: 'Data retrieved successfully'
    });

  } catch (error: any) {
    console.error('Error getting customer data:', error);
    return NextResponse.json(
      { error: 'Failed to get customer data', details: error.message },
      { status: 500 }
    );
  }
}
