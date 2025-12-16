# Firebase Setup Guide

## Cấu hình Firebase Realtime Database

### Bước 1: Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Vào **Project Settings** > **General**
4. Scroll xuống phần **Your apps** và chọn **Web** (</> icon)

### Bước 2: Lấy thông tin cấu hình

Sau khi tạo web app, bạn sẽ nhận được thông tin cấu hình như sau:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com/"
};
```

### Bước 3: Tạo Realtime Database

1. Vào **Realtime Database** trong Firebase Console
2. Click **Create Database**
3. Chọn location (ví dụ: `asia-southeast1`)
4. Chọn **Start in test mode** (hoặc cấu hình rules phù hợp)

### Bước 4: Cấu hình Database Rules (Quan trọng!)

Vào **Realtime Database** > **Rules** và cập nhật như sau:

```json
{
  "rules": {
    "users": {
      ".read": true,
      ".write": true
    },
    "teams": {
      ".read": true,
      ".write": true
    },
    "attendance": {
      ".read": true,
      ".write": true
    },
    "workTasks": {
      ".read": true,
      ".write": true
    },
    "dailyTaskTemplates": {
      ".read": true,
      ".write": true
    },
    "customers": {
      ".read": true,
      ".write": true
    },
    "penalties": {
      ".read": true,
      ".write": true
    }
  }
}
```

**Lưu ý:** Rules trên cho phép đọc/ghi công khai. Trong production, bạn nên cấu hình authentication và rules phù hợp hơn.

### Bước 5: Tạo file .env.local

Tạo file `.env.local` trong thư mục root của project với nội dung:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com/

# JWT Secret for authentication (generate a strong random string)
JWT_SECRET=your-very-secure-random-secret-key-here
JWT_EXPIRES_IN=7d
```

Thay thế các giá trị bằng thông tin từ Firebase Console của bạn.

### Bước 6: Seed Admin User

Sau khi cấu hình xong, chạy lệnh để tạo admin user mặc định:

```bash
npm run seed:admin
```

Admin user sẽ được tạo với:
- Username: `admin`
- Password: `123456`

## API Endpoints

### Authentication API

- **POST** `/api/auth/login` - Đăng nhập
- **GET** `/api/auth/me` - Lấy thông tin user hiện tại (cần token)
- **POST** `/api/auth/logout` - Đăng xuất

**Request body cho POST /api/auth/login:**
```json
{
  "username": "admin",
  "password": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "fullname": "Administrator",
      "role": "admin",
      "position": "System Administrator",
      "telegram": "",
      "active": true,
      "team": ""
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Sử dụng token:**
- Gửi trong header: `Authorization: Bearer <token>`
- Hoặc token sẽ tự động được lưu trong cookie `auth-token`

**GET /api/auth/me:**
- Gửi token trong header `Authorization: Bearer <token>`
- Hoặc token sẽ tự động lấy từ cookie

### Users API

- **GET** `/api/users` - Lấy danh sách tất cả users
- **POST** `/api/users` - Tạo user mới

**Request body cho POST /api/users:**
```json
{
  "username": "john_doe",
  "password": "password123",
  "fullname": "John Doe",
  "role": "user",
  "position": "Developer",
  "telegram": "@johndoe",
  "active": true,
  "team": "team_id_here"
}
```

### Teams API

- **GET** `/api/teams` - Lấy danh sách tất cả teams
- **POST** `/api/teams` - Tạo team mới

**Request body cho POST /api/teams:**
```json
{
  "name": "Development Team",
  "description": "Team phát triển sản phẩm"
}
```

## Cấu trúc Database

```
{
  "users": {
    "1": {
      "id": 1,
      "username": "admin",
      "password": "123456",
      "fullname": "Administrator",
      "role": "admin",
      "position": "System Administrator",
      "telegram": "",
      "active": true,
      "team": "",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "teams": {
    "team_id_1": {
      "id": "team_id_1",
      "name": "Development Team",
      "description": "Team phát triển",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

