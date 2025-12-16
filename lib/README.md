# Library Structure

Cấu trúc thư viện được tổ chức theo **Layered Architecture** để đảm bảo tính tái sử dụng, dễ bảo trì và mở rộng.

## 📁 Cấu trúc thư mục

```
lib/
├── config/           # Cấu hình ứng dụng
│   └── firebase.ts  # Firebase configuration
│
├── types/           # TypeScript types và interfaces
│   ├── index.ts     # Export tất cả types
│   ├── user.types.ts
│   └── team.types.ts
│
├── repositories/    # Data Access Layer
│   ├── base.repository.ts  # Base repository với CRUD operations
│   ├── user.repository.ts
│   └── team.repository.ts
│
├── services/        # Business Logic Layer
│   ├── user.service.ts
│   └── team.service.ts
│
└── utils/           # Utility functions
    ├── errors.ts    # Custom error classes
    ├── validators.ts # Validation functions
    └── response.ts  # API response helpers
```

## 🏗️ Kiến trúc

### 1. **Config Layer** (`config/`)
- Chứa các cấu hình của ứng dụng
- Firebase, database connections, etc.

### 2. **Types Layer** (`types/`)
- Định nghĩa TypeScript interfaces và types
- Tách riêng theo domain (user, team, ...)
- Export tập trung qua `index.ts`

### 3. **Repository Layer** (`repositories/`)
- **Data Access Layer** - tương tác trực tiếp với database
- `BaseRepository` cung cấp các operations chung (CRUD)
- Mỗi domain có repository riêng kế thừa từ `BaseRepository`
- Chỉ chứa logic truy cập dữ liệu, không có business logic

**Ví dụ:**
```typescript
// BaseRepository cung cấp: findAll, findById, create, update
// UserRepository thêm: findByUsername, getNextId
```

### 4. **Service Layer** (`services/`)
- **Business Logic Layer** - xử lý logic nghiệp vụ
- Sử dụng repositories để truy cập dữ liệu
- Xử lý validation, transformation, business rules
- Trả về dữ liệu đã được xử lý (ví dụ: loại bỏ password)

**Ví dụ:**
```typescript
// UserService.validateAndCreate() - validate + create
// UserService.excludePassword() - transform data
```

### 5. **Utils Layer** (`utils/`)
- **Shared utilities** - các hàm tiện ích dùng chung
- `errors.ts`: Custom error classes (ValidationError, NotFoundError, ...)
- `validators.ts`: Validation functions
- `response.ts`: API response helpers

## 🔄 Data Flow

```
API Route → Service → Repository → Database
           ↓
        Validator
           ↓
        Utils
```

1. **API Route** nhận request
2. **Validator** kiểm tra dữ liệu đầu vào
3. **Service** xử lý business logic
4. **Repository** truy cập database
5. **Response Helper** format response

## 📝 Quy tắc

### Khi thêm domain mới (ví dụ: `Product`):

1. **Tạo types:**
   ```typescript
   // lib/types/product.types.ts
   export interface Product { ... }
   export interface CreateProductDto { ... }
   ```

2. **Tạo repository:**
   ```typescript
   // lib/repositories/product.repository.ts
   export class ProductRepository extends BaseRepository<Product> {
     protected collectionName = "products";
     // Thêm methods đặc biệt nếu cần
   }
   ```

3. **Tạo service:**
   ```typescript
   // lib/services/product.service.ts
   export class ProductService {
     private productRepository = new ProductRepository();
     // Business logic methods
   }
   ```

4. **Sử dụng trong API:**
   ```typescript
   // app/api/products/route.ts
   const productService = new ProductService();
   ```

### Best Practices:

✅ **DO:**
- Tách biệt rõ ràng giữa các layers
- Sử dụng BaseRepository để tránh code lặp
- Đặt business logic trong Service, không phải Repository
- Sử dụng custom errors cho error handling
- Validate dữ liệu ở Service hoặc Validator layer

❌ **DON'T:**
- Đặt business logic trong Repository
- Truy cập database trực tiếp từ API routes
- Lặp lại code - sử dụng BaseRepository
- Trả về password trong API responses

## 🚀 Lợi ích

1. **Tái sử dụng**: BaseRepository có thể dùng cho mọi domain
2. **Dễ test**: Mỗi layer có thể test độc lập
3. **Dễ bảo trì**: Code được tổ chức rõ ràng, dễ tìm
4. **Dễ mở rộng**: Thêm domain mới chỉ cần follow pattern
5. **Type-safe**: TypeScript types đầy đủ ở mọi layer

