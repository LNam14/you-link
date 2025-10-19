# Hướng dẫn Setup Bầu Cua Tự Động

## 🎯 Tính năng đã hoàn thành

### 1. **API Endpoints**
- `/api/bau-cua/process-result` - Xử lý kết quả bầu cua
- `/api/cron/bau-cua-daily` - Cron job chạy vào 12:11 hàng ngày
- `/api/telegram/bau-cua` - Gửi tin nhắn tới Telegram

### 2. **Logic xử lý**
- Tìm con vật ít người chọn nhất
- Tính phần thưởng: 1.000.000 VNĐ ÷ số người chọn
- Tạo wheel reward cho từng người thắng
- Gửi kết quả tới Telegram
- **Thời gian công bố**: 12:11 hàng ngày

### 3. **Admin Panel**
- Chỉ hiển thị cho Admin
- Nút xử lý kết quả thủ công
- Nút chạy cron job thủ công

## 🔧 Setup Cron Job

### Option 1: Vercel Cron (Recommended)
Thêm vào `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/bau-cua-daily",
      "schedule": "11 12 * * *"
    }
  ]
}
```

### Option 2: External Cron Service
Sử dụng dịch vụ như cron-job.org:

- **URL**: `https://your-domain.com/api/cron/bau-cua-daily`
- **Schedule**: `11 12 * * *` (12:11 hàng ngày)
- **Method**: GET
- **Headers**: `Authorization: Bearer YOUR_CRON_SECRET`

### Option 3: Server Cron
Nếu có server riêng:

```bash
# Thêm vào crontab
11 12 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/bau-cua-daily
```

## 🔐 Environment Variables

Thêm vào `.env.local`:

```env
CRON_SECRET=your-secret-key-here
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## 📱 Telegram Setup

Bot token và chat ID đã được cấu hình:
- **Bot Token**: `8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U`
- **Chat ID**: `-4942533474`

## 🎮 Cách hoạt động

### 1. **Hàng ngày (11:00 - 22:55)**
- Người dùng chọn con vật
- Thông tin được lưu vào Firebase
- Gửi tin nhắn tới Telegram khi chọn

### 2. **12:11 hàng ngày**
- Cron job tự động chạy
- Tìm con vật ít người chọn nhất
- Tính phần thưởng cho mỗi người thắng
- Tạo wheel reward cho từng người
- Gửi kết quả tới Telegram

### 3. **Admin Panel**
- Admin có thể xử lý kết quả thủ công
- Test cron job
- Xem log và debug

## 🧪 Testing

### Test API trực tiếp:
```bash
# Test xử lý kết quả
curl -X POST https://your-domain.com/api/bau-cua/process-result

# Test cron job
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/bau-cua-daily
```

### Test thủ công:
1. Đăng nhập với tài khoản Admin
2. Vào trang Bầu Cua
3. Click "Xử lý kết quả hôm nay"
4. Kiểm tra kết quả trong console và Telegram

## 📊 Format Wheel Reward

Mỗi người thắng sẽ nhận wheel reward với format:
- **username**: Tên người dùng
- **reward**: "500.000 VND" (ví dụ)
- **date**: "2024-01-01" (YYYY-MM-DD)

## 🎯 Ví dụ kết quả

```
Con vật thắng: Hươu
Số người chọn: 3 người
Phần thưởng mỗi người: 333.333 VND

Danh sách người thắng:
• Nguyễn Văn A (@user1)
• Trần Thị B (@user2)  
• Lê Văn C (@user3)
```

## 🔍 Troubleshooting

### Lỗi thường gặp:
1. **Cron không chạy**: Kiểm tra CRON_SECRET và schedule
2. **Telegram không gửi**: Kiểm tra bot token và chat ID
3. **Wheel API lỗi**: Kiểm tra kết nối database
4. **Không có dữ liệu**: Kiểm tra Firebase connection

### Debug:
- Xem log trong console
- Kiểm tra response từ API
- Test từng endpoint riêng lẻ
