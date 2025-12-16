/**
 * Script tạo dữ liệu mẫu để test xử phạt
 * 
 * Chạy: npx tsx scripts/create-test-data.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

async function createTestData() {
  const username = "BH20";
  const date = "2025-12-15";
  const weekNumber = 51;

  try {
    // Lấy token từ env hoặc yêu cầu user đăng nhập trước
    const token = process.env.TEST_AUTH_TOKEN || "";

    if (!token) {
      console.log("⚠️  Cần token để tạo dữ liệu. Vui lòng:");
      console.log("1. Đăng nhập vào hệ thống");
      console.log("2. Lấy token từ localStorage hoặc cookie");
      console.log("3. Set TEST_AUTH_TOKEN trong .env.local");
      console.log("\nHoặc gọi API trực tiếp:");
      console.log(`POST /api/test/create-sample-data`);
      console.log(`Body: { "username": "${username}", "date": "${date}", "weekNumber": ${weekNumber} }`);
      return;
    }

    const response = await fetch("http://localhost:3000/api/test/create-sample-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username,
        date,
        weekNumber,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("✅ Đã tạo dữ liệu mẫu thành công!");
      console.log(JSON.stringify(data.data, null, 2));
    } else {
      console.error("❌ Lỗi:", data.error);
    }
  } catch (error) {
    console.error("❌ Lỗi khi tạo dữ liệu:", error);
  }
}

createTestData();

