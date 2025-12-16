# Utilities

## JWT Utils (`jwt.ts`)

Quản lý JWT tokens cho authentication.

### Functions:

- `generateToken(user)`: Tạo JWT token từ user info
- `verifyToken(token)`: Verify và decode JWT token
- `extractTokenFromHeader(authHeader)`: Extract token từ Authorization header

### Environment Variables:

- `JWT_SECRET`: Secret key để sign tokens (required)
- `JWT_EXPIRES_IN`: Token expiration time (default: "7d")

## Auth Utils (`auth.ts`)

Helper functions cho authentication trong API routes.

### Functions:

- `getAuthToken(request)`: Lấy token từ header hoặc cookie
- `verifyAuthToken(request)`: Verify token và trả về decoded user info

### Usage:

```typescript
import { verifyAuthToken } from "@/lib/utils/auth";

export async function GET(request: NextRequest) {
  const decoded = verifyAuthToken(request);
  // decoded = { userId: 1, username: "admin", role: "admin" }
}
```

## Errors (`errors.ts`)

Custom error classes cho error handling.

### Classes:

- `AppError`: Base error class
- `ValidationError`: Validation errors (400)
- `NotFoundError`: Resource not found (404)
- `ConflictError`: Conflict errors (409)

## Validators (`validators.ts`)

Validation functions cho input data.

### Functions:

- `validateCreateUser(data)`: Validate user creation data
- `validateCreateTeam(data)`: Validate team creation data

## Response (`response.ts`)

Helper functions để tạo standardized API responses.

### Functions:

- `successResponse(data, status)`: Tạo success response
- `errorResponse(error, status)`: Tạo error response

### Usage:

```typescript
import { successResponse, errorResponse } from "@/lib/utils/response";

// Success
return successResponse({ data: "result" }, 200);

// Error
return errorResponse(new ValidationError("Invalid input"));
```

## Date (`date.ts`)

Utility functions để format và xử lý date/time theo format chuẩn: **YYYY-MM-DD HH:MM:SS**

### Format chuẩn:
- Format: `YYYY-MM-DD HH:MM:SS`
- Ví dụ: `2024-12-14 15:30:45`

### Functions:

- `formatDateTime(date?)`: Format date thành YYYY-MM-DD HH:MM:SS
- `getCurrentDateTime()`: Lấy thời gian hiện tại theo format chuẩn
- `parseDateTime(dateString)`: Parse date string thành Date object

### Usage:

```typescript
import { getCurrentDateTime, formatDateTime } from "@/lib/utils/date";

// Get current date time
const now = getCurrentDateTime(); // "2024-12-14 15:30:45"

// Format specific date
const formatted = formatDateTime(new Date()); // "2024-12-14 15:30:45"
const formatted2 = formatDateTime("2024-12-14T15:30:45.000Z"); // "2024-12-14 15:30:45"
```

### Lưu ý:
- Tất cả date/time trong project phải sử dụng format này
- Không sử dụng `toISOString()` trực tiếp
- Luôn sử dụng `getCurrentDateTime()` hoặc `formatDateTime()` từ utility này

