# BÁO CÁO PHÂN TÍCH TẢI VÀ NGHIỆM THU KIỂM THỬ (BVA & EP REPORT)

**Ngày lập:** 19/08/2026  
**Phạm vi:** mã nguồn hiện tại của `be/src`, `be/src/tests`, `fe/src` và `fe/tests/e2e`.  
**Phương pháp:** phân tích tĩnh Route -> Middleware -> Controller -> Model, đối chiếu payload ở frontend và chạy kiểm thử backend bằng Jest.

## 1. TỔNG QUAN DỰ ÁN & PHẠM VI KIỂM THỬ

### 1.1. Module/API đã phân tích

| Module                  | API/nhóm route đã rà soát                                                                | Cơ chế kiểm tra đầu vào                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Auth                    | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`               | Zod ở register/login; controller kiểm tra thiếu field                                         |
| User/Profile            | `GET /api/profile`                                                                       | JWT middleware; không có schema query                                                         |
| Cart                    | `GET /api/cart`, `POST /api/cart/add`, `PUT /api/cart/update`, `DELETE /api/cart/delete` | Zod cho body add/update/delete; controller kiểm tra tồn tại sản phẩm/giỏ hàng                 |
| Product                 | `GET /api/products`, `GET/POST/PUT/DELETE /api/products/:id`                             | Zod cho query, body create/update và ObjectId params                                          |
| Admin product           | `/api/admin/products...`                                                                 | Tái sử dụng Zod product; quyền admin chưa được gắn vào route                                  |
| Category                | `/api/admin/categories...`                                                               | Chỉ kiểm tra thủ công trong controller; không có schema riêng                                 |
| Order                   | `/api/orders...`, `/api/admin/orders...`                                                 | Auth; status admin kiểm tra bằng mảng giá trị; các query/page/limit chưa có schema            |
| Checkout/VNPAY          | `POST /api/checkout/create`, `GET /api/checkout/vnpay-callback`                          | Không có schema; kiểm tra type payment bằng nhánh controller; chữ ký callback đang bị comment |
| Image Cloudinary/GridFS | `/api/images/upload`, `/get`, `/delete`                                                  | Multer + kiểm tra thủ công mimetype/kích thước; chưa giới hạn query và ID đồng nhất           |
| Dashboard               | `GET /api/admin/dashboard`                                                               | Auth middleware; không có schema đầu vào                                                      |

Không tìm thấy thư mục DTO riêng. Không sử dụng Joi; validation tập trung ở `be/src/schemas` bằng Zod và một số `if` trong controller.

### 1.2. Business Rules chính

1. Register: `name` sau trim dài 2..50; email được trim/lowercase, dài 5..254 và phải đúng regex; password dài 8..64, phải có chữ hoa, chữ thường, số và ký tự đặc biệt.
2. Login: email không rỗng và đúng định dạng; password không rỗng. Login không áp dụng giới hạn tối đa hay complexity như register.
3. Cart add: `productId` là chuỗi không rỗng; `quantity` là số nguyên từ 1 đến 99. Cart update cho phép quantity = 0 để xóa item, nên miền là 0..99.
4. Product: tên/mô tả không rỗng sau trim; price là số nguyên 1.000..1.000.000.000 VND; category/image/public ID là chuỗi tùy chọn; ID URL phải là Mongo ObjectId hợp lệ.
5. Pagination product: page mặc định 1, giới hạn 1..1000; limit mặc định 10, giới hạn 1..100. Giá trị sai/nhỏ hơn 1 được fallback, limit lớn hơn 100 được clamp.
6. Category: `category_name` và `category_id` phải truthy; category_id được slugify và phải chưa tồn tại. Chưa có giới hạn độ dài, kiểu chuỗi hoặc kiểm tra sau chuẩn hóa không bị rỗng.
7. Order: status admin chỉ nhận `pending`, `success`, `failed`; user chỉ được xóa order của chính mình.
8. Checkout: chỉ có hai luồng `cod` và `vnpay`; checkout phải có cart. `shippingInfo` và các field thanh toán chưa có schema kiểu/độ dài/định dạng.
9. Image: phải có file, mimetype bắt đầu bằng `image/`, kích thước không vượt 5 MiB theo code hiện tại. Cloudinary delete cần `public_id`; GridFS delete cần `id`.
10. Auth middleware: bắt buộc cookie `session_token` hoặc Bearer token hợp lệ. `isAdmin` có tồn tại nhưng các route `/api/admin/*` hiện chỉ dùng `verifyToken`, chưa dùng `isAdmin`.

## 2. PHÂN TÍCH VÀ TẠO BẢNG TEST CASE (BVA & EP)

**Quy ước Status:** “Đã handle” nghĩa là có rule thực thi trong schema/controller; không đồng nghĩa đã có test tự động. “Chưa handle” nghĩa là không có rào chắn tương ứng hoặc rào chắn không bảo đảm rule nghiệp vụ.

### 2.1. Auth - Register

| Field / Attribute | Kỹ thuật áp dụng | Vùng tương đương / Biên       | Input Test Value                                          | Expected Outcome                            | Status trong Codebase (Đã handle / Chưa handle)                                                               |
| ----------------- | ---------------- | ----------------------------- | --------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| name              | BVA              | Min-1 / Min / Min+1           | `a` / `ab` / `abc`                                        | 400 / 200 / 200                             | Đã handle: Zod `.min(2)`                                                                                      |
| name              | BVA              | Nominal / Max-1 / Max / Max+1 | 10 / 49 / 50 / 51 ký tự                                   | 200 / 200 / 200 / 400                       | Đã handle: `.max(50)`                                                                                         |
| name              | EP               | Invalid type/blank sau trim   | `123`, `"   "`, null, thiếu field                         | 400                                         | Đã handle kiểu và min sau trim; controller cũng có guard                                                      |
| email             | BVA              | Min-1 / Min / Min+1           | 4 ký tự hợp lệ về độ dài / 5 / 6                          | 400 / phụ thuộc regex / 200 nếu đúng format | Đã handle `.min(5)` và regex; biên 5 bị test hiện tại kỳ vọng sai với `a@b.c`                                 |
| email             | BVA              | Max-1 / Max / Max+1           | 253 / 254 / 255 ký tự, format hợp lệ                      | 200 / 200 / 400                             | Đã handle `.max(254)`                                                                                         |
| email             | EP               | Valid format / invalid format | `user@example.com` / thiếu `@`, domain hoặc có whitespace | 200 / 400                                   | Đã handle regex; regex đăng ký yêu cầu TLD tối thiểu 2 ký tự                                                  |
| email             | EP               | Canonicalization              | `Test@Example.COM`                                        | Lưu `test@example.com`                      | Đã handle `.trim().toLowerCase()`                                                                             |
| password          | BVA              | Min-1 / Min / Min+1           | 7 / 8 / 9 ký tự, đủ complexity                            | 400 / 200 / 200                             | Đã handle `.min(8)`                                                                                           |
| password          | BVA              | Max-1 / Max / Max+1           | 63 / 64 / 65 ký tự, đủ complexity                         | 200 / 200 / 400                             | Đã handle `.max(64)`                                                                                          |
| password          | EP               | Thiếu từng nhóm ký tự         | thiếu hoa, thường, số hoặc special                        | 400                                         | Đã handle 4 regex complexity                                                                                  |
| password          | EP               | Invalid type/empty            | number, null, `""`, thiếu field                           | 400                                         | Đã handle Zod và controller                                                                                   |
| unknown fields    | EP               | Field ngoài contract          | `{role:"admin"}` kèm payload hợp lệ                       | Không được phép ghi đè role                 | Chưa handle rõ: `z.object` không khai báo `.strict()`; cần xác nhận hành vi strip/error theo policy mong muốn |

### 2.2. Auth - Login và User

| Field / Attribute | Kỹ thuật áp dụng | Vùng tương đương / Biên                            | Input Test Value                               | Expected Outcome                    | Status trong Codebase (Đã handle / Chưa handle)                                                |
| :---------------- | :--------------- | :------------------------------------------------- | :--------------------------------------------- | :---------------------------------- | :--------------------------------------------------------------------------------------------- |
| login.email       | EP               | Empty/missing / invalid / valid                    | `""`, thiếu / `abc` / `user@example.com`       | 400 / 400 / tiếp tục xác thực       | Đã handle `.min(1)` + regex                                                                    |
| login.password    | EP               | Empty/missing / non-empty                          | `""`, thiếu / `x`                              | 400 / xác thực bcrypt               | Đã handle `.min(1)`; chưa có max length/complexity                                             |
| login credentials | EP               | User không tồn tại / sai password / blocked / đúng | các bản ghi tương ứng                          | 404 / 401 / 403 / 200               | Đã handle trong controller và đã có test một phần                                              |
| toggle block      | EP               | Boolean valid / wrong type / missing               | true, false / `"true"`, 1 / thiếu              | 200 / 400 / 400                     | Đã handle Zod `z.boolean()`; ID route chưa được schema hóa                                     |
| user/:id          | EP               | ObjectId hợp lệ / malformed / không tồn tại        | 24 hex / `abc` / ID hợp lệ nhưng không có user | 200/404 hoặc 400 / 400 / 404        | Chưa handle đầy đủ: controller gọi `new ObjectId(id)` trực tiếp, có thể rơi vào 500 với ID sai |
| pagination users  | BVA/EP           | page, limit <1 / nominal / rất lớn / non-numeric   | `0`, `1`, `10`, `999999`, `abc`                | Nên reject hoặc clamp theo contract | Chưa handle bằng schema; `parseInt(...) default` nhận số âm và không có max                    |

### 2.3. Cart

| Field / Attribute      | Kỹ thuật áp dụng | Vùng tương đương / Biên                | Input Test Value                   | Expected Outcome                 | Status trong Codebase (Đã handle / Chưa handle)                                                 |
| ---------------------- | ---------------- | -------------------------------------- | ---------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| add.quantity           | BVA              | Min-1 / Min / Min+1                    | 0 / 1 / 2                          | 400 / 200 / 200                  | Đã handle `.int().min(1)`                                                                       |
| add.quantity           | BVA              | Nominal / Max-1 / Max / Max+1          | 50 / 98 / 99 / 100                 | 200 / 200 / 200 / 400            | Đã handle `.max(99)`                                                                            |
| add.quantity           | EP               | Negative/float/string/null             | -1 / 1.5 / `"five"` / null         | 400                              | Đã handle Zod; các case này có test                                                             |
| update.quantity        | BVA              | Min-1 / Min / Min+1                    | -1 / 0 / 1                         | 400 / 200 và xóa item / 200      | Đã handle `.min(0)` và controller có nhánh zero                                                 |
| update.quantity        | BVA              | Max-1 / Max / Max+1                    | 98 / 99 / 100                      | 200 / 200 / 400                  | Đã handle `.max(99)`                                                                            |
| productId              | EP               | Empty/missing / non-empty / wrong type | `""`, thiếu / `prod_1` / 123       | 400 / tiếp tục kiểm tra DB / 400 | Đã handle `.string().min(1)`; chưa xác thực ObjectId vì dữ liệu test/controller hỗ trợ ID chuỗi |
| cart product existence | EP               | Có sản phẩm / không có sản phẩm        | ID tồn tại / ID lạ                 | 200 / 404                        | Đã handle controller                                                                            |
| cart total price       | EP               | Client gửi giá giả / giá DB            | `price:10` nhưng DB=500000         | Tính theo giá DB                 | Đã handle: payload price bị bỏ qua; đã có test                                                  |
| cart products array    | BVA              | 0 / 1 / nhiều / quá lớn                | rỗng, item hợp lệ, hàng nghìn item | Không được làm tràn dữ liệu/DoS  | Chưa handle: không có schema array length hoặc giới hạn số item trong cart                      |

### 2.4. Product và phân trang

| Field / Attribute   | Kỹ thuật áp dụng | Vùng tương đương / Biên                             | Input Test Value                              | Expected Outcome                                                                      | Status trong Codebase (Đã handle / Chưa handle)                                                  |
| ------------------- | ---------------- | --------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| product.name        | BVA/EP           | Empty/Min/nominal                                   | `""`, `"A"`, chuỗi thường                     | 400 / 200 / 200                                                                       | Đã handle `.min(1)` nhưng `.trim()` đặt sau min nên cần kiểm tra chuỗi toàn khoảng trắng         |
| product.description | BVA/EP           | Empty/Min/nominal                                   | `""`, `"x"`, chuỗi thường                     | 400 / 200 / 200                                                                       | Đã handle tương tự name; thứ tự trim/min cần chuẩn hóa                                           |
| product.price       | BVA              | Min-1 / Min / Min+1                                 | 999 / 1000 / 1001                             | 400 / 200 / 200                                                                       | Đã handle `.int().min(1000)`                                                                     |
| product.price       | BVA              | Nominal / Max-1 / Max / Max+1                       | 500000 / 999999999 / 1000000000 / 1000000001  | 200 / 200 / 200 / 400                                                                 | Đã handle `.max(1000000000)`                                                                     |
| product.price       | EP               | Integer/float/numeric string/non-numeric            | 5000 / 1500.5 / `"5000"` / `"abc"`            | 200 / 400 / 200 / 400                                                                 | Đã handle `z.coerce.number().int()`; chấp nhận chuỗi số là policy cần ghi rõ                     |
| category            | EP               | Optional/missing / text / special-only              | thiếu / `Đồ gia dụng` / `!!!`                 | default/text slug / cần reject nếu slug rỗng                                          | Chưa handle đầy đủ: schema chỉ optional string, controller có thể tạo category rỗng sau sanitize |
| imageUrl/public_id  | EP               | Missing/empty / string / malformed URL              | thiếu / `""` / `"not-url"`                    | default hoặc lưu theo policy                                                          | Chưa handle định dạng URL/độ dài; public_id không giới hạn                                       |
| product/:id         | EP               | Valid ObjectId / invalid length/charset / not found | 24 hex / `abc`, 24 non-hex / ID không tồn tại | 200 / 400 / 404                                                                       | Đã handle Zod `ObjectId.isValid` và controller guard                                             |
| page                | BVA              | Min-1 / Min / Min+1                                 | 0 / 1 / 2                                     | fallback 1 / 200 page 1 / 200 page 2                                                  | Đã handle preprocess fallback + `.min(1)`                                                        |
| page                | BVA              | Max-1 / Max / Max+1                                 | 999 / 1000 / 1001                             | 200 / 200 / fallback 1                                                                | Đã handle max 1000, nhưng chính sách fallback khác reject                                        |
| limit               | BVA              | Min-1 / Min / Min+1                                 | 0 / 1 / 2                                     | fallback 10 / 200 / 200                                                               | Đã handle preprocess fallback + `.min(1)`                                                        |
| limit               | BVA              | Max-1 / Max / Max+1                                 | 99 / 100 / 101                                | 200 / 200 / clamp 100                                                                 | Đã handle `.max(100)` và preprocess clamp                                                        |
| update body         | EP               | Empty body / partial body / required fields         | `{}`, chỉ `price`, đủ field                   | Schema nhận `{}`/partial nhưng controller lại reject nếu thiếu name/price/description | Chưa nhất quán: updateSchema partial không khớp controller partial update                        |

### 2.5. Category, Order và Checkout

| Field / Attribute      | Kỹ thuật áp dụng | Vùng tương đương / Biên                                      | Input Test Value                                             | Expected Outcome                                  | Status trong Codebase (Đã handle / Chưa handle)                                          |
| ---------------------- | ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| category.category_name | EP               | Missing/empty / non-empty / wrong type                       | thiếu, `""`, `"Điện thoại"`, 123                             | 400 / 400 / 200 / 400                             | Chưa handle đầy đủ: chỉ truthy, không có type/length/trim                                |
| category.category_id   | EP               | Missing/empty / valid slug source / special-only / duplicate | thiếu, `""`, `phone case`, `!!!`, ID trùng                   | 400 / 400 / 200 / 400                             | Đã handle truthy + duplicate; chưa reject slug rỗng sau sanitize                         |
| category/:id           | EP               | Valid/invalid/nonexistent ObjectId                           | 24 hex / `abc` / ID lạ                                       | 200 / 400 / 404                                   | Đã handle format trong controller; admin route chưa dùng schema cho delete               |
| order.status           | EP               | Allowed / invalid / missing                                  | pending, success, failed / `paid`, null                      | 200 / 400                                         | Đã handle admin update bằng `includes`; chưa có Zod schema dùng chung                    |
| order page/limit       | BVA/EP           | <1 / nominal / negative / huge / text                        | 0, 1, 10, -1, 999999, abc                                    | Nên reject hoặc clamp ổn định                     | Chưa handle: parseInt fallback cho một số trường hợp nhưng nhận số âm và không max       |
| checkout.typePayment   | EP               | Valid COD / valid VNPAY / invalid/missing                    | cod / vnpay / bank, thiếu                                    | 200 nếu cart tồn tại / 200 nếu cart tồn tại / 400 | Đã handle enum bằng nhánh `if`; chưa validate trước khi truy vấn/ghi và chưa có schema   |
| checkout.shippingInfo  | EP/BVA           | Missing, wrong type, empty, nominal, oversized               | thiếu, object sai, field rỗng, dữ liệu hợp lệ, chuỗi rất dài | 400 với invalid; 200 với valid                    | Chưa handle: không kiểm tra field, format phone/email, length hoặc nesting               |
| VNPAY callback         | EP               | Missing/malformed response/order info / valid response       | thiếu `vnp_OrderInfo`, orderInfo bất thường, code 00/khác    | 400 hoặc 404 / redirect success/failure           | Chưa handle: gọi `.replace` trên undefined có thể 500; kiểm tra secure hash đang comment |

### 2.6. Image và upload

| Field / Attribute      | Kỹ thuật áp dụng | Vùng tương đương / Biên                | Input Test Value                       | Expected Outcome                         | Status trong Codebase (Đã handle / Chưa handle)                                                 |
| ---------------------- | ---------------- | -------------------------------------- | -------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| image file             | EP               | Missing / image mimetype / non-image   | không có file / image/png / text/plain | 400 / tiếp tục upload / 400              | Đã handle mimetype và file tồn tại                                                              |
| file.size              | BVA              | 0 / Max-1 / Max / Max+1 bytes          | 0 / 5 MiB-1 / 5 MiB / 5 MiB+1          | policy upload / 201 / hiện tại 201 / 400 | Chưa nhất quán: code chỉ reject `> 5 MiB`, nên nhận đúng 5 MiB dù message ghi `<5MB`            |
| image query limit/page | BVA/EP           | 0 / 1 / nominal / >max / non-numeric   | `0`, `1`, `20`, `9999`, `abc`          | Nên default/clamp/reject ổn định         | Chưa handle bằng schema; Cloudinary có thể gửi limit bất thường, GridFS có thể tính skip âm/NaN |
| Cloudinary public_id   | EP               | Missing/empty / valid / arbitrary type | thiếu, `""`, chuỗi hợp lệ, object      | 400 / 200 / 200 / 400                    | Đã handle truthy; chưa kiểm tra type/độ dài/thuộc folder                                        |
| GridFS id              | EP               | Missing / valid ObjectId / malformed   | thiếu / 24 hex / `abc`                 | 400 / 200 / 400                          | Chưa handle format trước `new ObjectId(id)`, malformed có thể 500                               |

### 2.7. Bằng chứng kiểm thử đã chạy

Lệnh thực tế: `cd be && npm test -- --runInBand`.

- 3 test suite: 2 pass, 1 fail.
- 33 test: 32 pass, 1 fail.
- Failure: `src/tests/auth.test.ts`, case email `a@b.c` kỳ vọng 200 nhưng thực tế 400. Nguyên nhân là regex register yêu cầu phần TLD có ít nhất 2 ký tự (`{2,}`), trong khi test dùng TLD một ký tự.
- Các test Auth/Cart/Product đã bao phủ một số biên quantity, price, password, email, ObjectId và pagination, nhưng chưa bao phủ Category, Order, Checkout, Image và phần lớn query/admin authorization.
- `npm run build` chưa nghiệm thu được: TypeScript dừng ở `be/tsconfig.json`, option `ignoreDeprecations: "6.0"` bị compiler hiện tại báo `TS5103` là giá trị không hợp lệ.

## 3. ĐÁNH GIÁ CHẤT LƯỢNG CODEBASE HIỆN TẠI

### 3.1. Vị trí thiếu hoặc lệch validation

- [be/src/schemas/auth.schema.ts](../../be/src/schemas/auth.schema.ts): register email có hai `.min()` liên tiếp; case 5 ký tự `a@b.c` vượt min length nhưng không vượt regex. Cần thống nhất contract giữa schema và test.
- [be/src/schemas/product.schema.ts](../../be/src/schemas/product.schema.ts): `updateProductSchema = createProductSchema.partial()`, nhưng [be/src/controllers/product.controller.ts](../../be/src/controllers/product.controller.ts) vẫn bắt buộc `name`, `price`, `description`. Đây là mâu thuẫn giữa ý nghĩa PATCH/partial và hành vi controller.
- [be/src/controllers/category.controller.ts](../../be/src/controllers/category.controller.ts): category chỉ dùng truthy check; không giới hạn độ dài, không ép kiểu chuỗi, không trim, không kiểm tra kết quả slugify khác rỗng. `category_id` trùng sau normalize cũng cần unique index DB, không chỉ `findOne` trước insert.
- [be/src/controllers/user.controller.ts](../../be/src/controllers/user.controller.ts): `new ObjectId(id)` trong toggle/delete user không có guard `ObjectId.isValid`; ID sai có nguy cơ thành 500. Pagination user không có max và có thể nhận page/limit âm.
- [be/src/controllers/order.controller.ts](../../be/src/controllers/order.controller.ts): order route nhận `:id` và query trực tiếp; page/limit không dùng schema. `getOrderById` không xác minh user sở hữu order, trong khi delete có kiểm tra ownership.
- [be/src/controllers/checkout.controller.ts](../../be/src/controllers/checkout.controller.ts): toàn bộ body checkout chưa có schema. Callback không validate `vnp_OrderInfo` trước `.replace`; xác minh `vnp_SecureHash` đang comment, là thiếu kiểm soát tính toàn vẹn của thanh toán.
- [be/src/controllers/imageCloudinary.controller.ts](../../be/src/controllers/imageCloudinary.controller.ts) và [be/src/controllers/imageGridFS.controller.ts](../../be/src/controllers/imageGridFS.controller.ts): upload không đặt giới hạn Multer ở route, chỉ kiểm tra sau khi file đã được nhận; query page/limit chưa được giới hạn; GridFS ID chưa kiểm tra ObjectId.
- [be/src/routes/admin.route.ts](../../be/src/routes/admin.route.ts): nhiều route dưới `/api/admin` chỉ dùng `verifyToken`, không dùng `isAdmin`. Đây là lỗi phân quyền nghiêm trọng, dù không phải lỗi EP/BVA thuần túy.
- [be/src/app.ts](../../be/src/app.ts): `express.json` và `urlencoded` cho phép body tới 10 MB, trong khi upload image chỉ intended 5 MiB; cần cân nhắc limit riêng và Multer limits để tránh tiêu thụ tài nguyên.

### 3.2. Tính nhất quán với Database Constraints

- Các model chỉ là `CollectionManager` mỏng, không có Mongoose schema, validator, required, min/max, enum hoặc unique index trong code. Vì vậy phần lớn ràng buộc hiện chỉ tồn tại ở request layer/controller.
- Register kiểm tra email tồn tại bằng `findOne` nhưng chưa thấy unique index được khai báo/tạo. Hai request đồng thời có thể cùng vượt qua `findOne` và tạo duplicate.
- Product price được kiểm tra ở Zod nhưng không có database validator; dữ liệu ghi từ script khác hoặc route chưa gắn schema vẫn có thể sai miền.
- Cart không có constraint quantity, array length hay totalPrice. `totalPrice` được tính lại ở một số nhánh nhưng không có invariant DB để ngăn dữ liệu âm/float hoặc giá giả.
- Order status được kiểm tra thủ công ở một controller, nhưng không có enum DB dùng chung; các đường ghi khác có thể tạo status tùy ý.
- Category duplicate được kiểm tra bằng read-before-write nhưng thiếu unique index trên `category_id`.
- ID Mongo được kiểm tra ở product nhưng không đồng nhất ở user/category/order/image.
- Frontend types trong [fe/src/types/index.ts](../../fe/src/types/index.ts) không phải runtime validation và có khác biệt với backend, ví dụ `IUser.role` dùng `member` trong khi backend dùng `user`; vì vậy không thể xem TypeScript frontend là một lớp nghiệm thu dữ liệu.

### 3.3. Đánh giá coverage

Để tránh tạo tỷ lệ ảo, coverage được tính theo **30 nhóm thuộc tính/rule đầu vào có ý nghĩa kiểm thử** được nhận diện trong route/controller: 18 nhóm có Zod hoặc guard controller rõ ràng, 12 nhóm chỉ manual không đầy đủ hoặc chưa có guard. Theo định nghĩa này:

- Coverage validation có thực thi: **18/30 = 60%**.
- Coverage có test tự động chứng minh trực tiếp: tập trung vào Auth/Cart/Product; chưa đủ dữ liệu để coi 30 nhóm là đã test.
- Test run hiện tại: **32/33 = 96,97% test pass**, nhưng không nên dùng tỷ lệ này thay cho coverage rule vì còn một failure ở email và nhiều module chưa có test.
- Build gate: **chưa đạt**, do lỗi cấu hình TypeScript.
- Kết luận nghiệm thu kỹ thuật: **Chưa đủ điều kiện nghiệm thu toàn bộ validation/API**; có thể nghiệm thu có điều kiện cho các lát Auth/Cart/Product đã được test, sau khi xử lý failure email và build configuration.

## 4. KẾT LUẬN & ĐỀ XUẤT CẢI TIẾN

### 4.1. Kết luận

Validation Zod đang tạo nền tảng tốt cho Auth, Cart và Product, đặc biệt các biên số nguyên, giá và quantity đã được mô tả rõ. Tuy nhiên validation chưa bao phủ đồng đều toàn hệ thống: Category, Checkout, Order, User admin, Image và pagination admin vẫn phụ thuộc vào `if`/`parseInt` hoặc không có guard. Rủi ro cao nhất là bypass quyền admin, callback VNPAY không kiểm chữ ký, malformed ObjectId gây 500 và contract update product không nhất quán.

### 4.2. Refactor đề xuất

**a. Tạo schema dùng chung cho Category, Checkout, Order, ID và pagination**

```ts
import { z } from "zod";
import { ObjectId } from "mongodb";

const objectId = z.string().refine(ObjectId.isValid, "INVALID_OBJECT_ID");

export const categorySchema = z.object({
  category_id: z.string().trim().min(1).max(100),
  category_name: z.string().trim().min(1).max(100),
});

export const checkoutSchema = z.object({
  typePayment: z.enum(["cod", "vnpay"]),
  shippingInfo: z.object({
    fullName: z.string().trim().min(2).max(100),
    phoneNumber: z.string().regex(/^[0-9+ ()-]{8,20}$/),
    email: z.string().email().max(254),
    address: z.string().trim().min(5).max(255),
    note: z.string().max(500).optional(),
  }),
});

export const orderIdParamSchema = z.object({
  id: z.string().trim().min(1).max(100),
});
export const orderStatusSchema = z.object({
  status: z.enum(["pending", "success", "failed"]),
});
```

Gắn schema vào route bằng `validate({ body, params, query })`, thay vì lặp lại `if` trong controller.

**b. Chọn rõ semantics cho update product**

- Nếu là full update: đổi schema thành required và bỏ `.partial()`.
- Nếu là partial update: giữ `.partial()` nhưng controller không được reject khi thiếu field; chỉ `$set` các field có mặt và vẫn validate từng field.

**c. Đặt ràng buộc tại MongoDB**

Tạo unique index cho `users.email` và `category.category_id`; thêm validator/transaction hoặc centralized repository cho `price`, `quantity`, `status`. Xử lý duplicate key (`E11000`) thành HTTP 409.

**d. Bảo vệ admin và payment callback**

Gắn `verifyToken, isAdmin` cho toàn bộ `/api/admin/*`. Bật lại việc tính và so sánh `vnp_SecureHash`; reject callback thiếu `vnp_OrderInfo`, `vnp_ResponseCode` hoặc sai chữ ký trước khi cập nhật order/cart.

**e. Chuẩn hóa file/query boundaries**

Dùng Multer `limits.fileSize = 5 * 1024 * 1024`, thống nhất policy `<5 MiB` hoặc `<=5 MiB`, và dùng schema pagination chung cho user/order/image. Kiểm tra `ObjectId.isValid` trước mọi `new ObjectId`.

**f. Bổ sung test nghiệm thu tối thiểu**

1. Sửa hoặc xác nhận contract email `a@b.c`, sau đó thêm test cho 4/5/6 và 253/254/255 ký tự với email thực sự hợp lệ về format.
2. Thêm EP/BVA cho Category, Checkout shippingInfo, Order status/ownership, Image 5 MiB và malformed IDs.
3. Thêm test bảo mật xác nhận user thường không truy cập được `/api/admin/*`.
4. Thêm test duplicate race/unique index và callback VNPAY sai chữ ký.
5. Sửa `ignoreDeprecations` hoặc đồng bộ TypeScript version để build trở thành quality gate trong CI.

**Tài liệu tham chiếu chính:** [be/src/middleware/validate.ts](../../be/src/middleware/validate.ts), [be/src/schemas/auth.schema.ts](../../be/src/schemas/auth.schema.ts), [be/src/schemas/cart.schema.ts](../../be/src/schemas/cart.schema.ts), [be/src/schemas/product.schema.ts](../../be/src/schemas/product.schema.ts), [be/src/tests/auth.test.ts](../../be/src/tests/auth.test.ts), [be/src/tests/cart.test.ts](../../be/src/tests/cart.test.ts), [be/src/tests/product.test.ts](../../be/src/tests/product.test.ts).
