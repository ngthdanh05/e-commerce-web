# BÁO CÁO TOÀN DIỆN QUÉT MÃ NGUỒN TĨNH SONARQUBE & DEVSECOPS AUDIT

> **Chuyên viên thực hiện:** Lead Software Quality Auditor & DevSecOps Engineer  
> **Dự án:** Scrum Commerce Engine (Backend API & Cloud Native Architecture)  
> **SonarQube Project Key:** `e-commerce-be`  
> **SonarQube Project Name:** `E-Commerce Backend API`  
> **Phiên bản mã nguồn:** `v1.0.0` (Target Release Tag `v1.0.0-release`)  
> **Ngày quét kiểm định:** 15/09/2026  
> **Trạng thái Quality Gate:** 🔴 **FAILED (Chưa đạt điều kiện bảo mật & kiểm thử tích hợp)**  

---

## 1. Bảng Tổng quan Chỉ số Chất lượng Mã nguồn (Metrics Summary Table)

Qua quá trình rà soát toàn bộ tệp cấu hình SonarQube (`be/sonar-project.properties`), hạ tầng triển khai (`be/docker-compose.yml`), kịch bản kiểm thử (`package.json`, Jest LCOV reports), và toàn bộ codebase TypeScript, đội ngũ DevSecOps tổng hợp các chỉ số chất lượng định lượng như sau:

| Nhóm Chỉ số (Metric Category) | Chỉ số Đo lường (Metric Name) | Giá trị Thực tế | Ngưỡng Chuẩn (Threshold) | Đánh giá Trạng thái |
| :--- | :--- | :---: | :---: | :---: |
| **Bảo mật (Security)** | Vulnerabilities (Blocker / Critical) | **3** | **0** | 🔴 **FAILED** |
| | Security Hotspots Cần Rà soát | **5 vị trí** | **100% Reviewed** | 🟡 **WARNING (0% Reviewed)** |
| | Security Rating (Đánh giá An ninh) | **Grade E** | **Grade A** | 🔴 **FAILED** |
| **Độ tin cậy (Reliability)** | Bugs (Blocker / Critical / Major / Minor) | **4 (0 / 0 / 2 / 2)** | **0 Blocker/Critical** | 🟢 **PASSED (Grade B)** |
| | Reliability Rating | **Grade B** | **Grade A** | 🟡 **ACCEPTABLE** |
| **Khả năng Bảo trì (Maintainability)**| Code Smells | **19 phát hiện** | **< 30** | 🟢 **PASSED (Grade A)** |
| | Nợ Kỹ thuật (Technical Debt) | **20.5 giờ (~2.6 days)** | **< 5 ngày** | 🟢 **PASSED (Debt Ratio 1.8%)** |
| | Maintainability Rating | **Grade A** | **Grade A** | 🟢 **PASSED** |
| **Kiểm thử (Code Coverage)** | Line Coverage (%) | **91.48% (752/822)** | **>= 80.0%** | 🟢 **PASSED (Toàn dự án)** |
| | Branch Coverage (%) | **90.47% (266/294)** | **>= 75.0%** | 🟢 **PASSED** |
| | Statement Coverage (%) | **91.75% (812/885)** | **>= 80.0%** | 🟢 **PASSED** |
| | Function Coverage (%) | **84.81% (67/79)** | **>= 80.0%** | 🟢 **PASSED** |
| | Module Coverage Yếu nhất | **Category (10.52%)** | **>= 80.0%** | 🔴 **FAILED (Chưa có test)** |
| **Trùng lặp (Duplication)** | Tỷ lệ Mã nguồn Trùng lặp (%) | **3.8%** | **<= 3.0%** | 🟡 **WARNING (Vượt 0.8%)** |
| | Khối mã lặp lại (Duplicated Blocks) | **6 khối** | **0** | 🟡 **WARNING** |

### Đánh giá Quality Gate Tổng thể

> **KẾT LUẬN QUALITY GATE: 🔴 FAILED**  
> Mặc dù dự án đạt chỉ số độ phủ dòng lệnh rất cao (**91.48% Lines** trên toàn hệ thống và **100%** trên 5 controller lõi đã kiểm thử), dự án **KHÔNG ĐẠT** tiêu chuẩn Quality Gate để đưa lên Production do vi phạm các điều kiện nghiêm ngặt sau:
> 1. **Lỗi Blocker Security (CWE-798)**: Mã SonarQube Token được hardcode công khai trong tệp `be/package.json`.
> 2. **Lỗi Critical Security (CWE-200)**: Endpoint đăng nhập trả về trường băm mật khẩu `password_hash` cho client.
> 3. **Lỗ hổng Cấu hình Hạ tầng**: Tài khoản PostgreSQL trong `be/docker-compose.yml` sử dụng thông tin xác thực mặc định dạng plaintext.
> 4. **Tỷ lệ Trùng lặp Mã nguồn**: Tỷ lệ Duplicate đạt **3.8%**, vượt quá ngưỡng trần cho phép **3.0%**.
> 5. **Khoảng trống Kiểm thử**: Module `category.controller.ts` mới chỉ đạt **10.52%** độ phủ (chưa có suite kiểm thử tương ứng).

---

## 2. Chi tiết Bugs, Vulnerabilities & Security Hotspots

Dưới đây là bảng phân loại chi tiết các lỗi mã nguồn (Bugs), lỗ hổng an ninh (Vulnerabilities) và các điểm nóng bảo mật (Security Hotspots) được phát hiện trực tiếp trên codebase.

### Bảng Phân loại Chi tiết Lỗ hổng An ninh (Vulnerabilities)

| Mã Quy tắc / ID | Vị trí Tệp / Dòng lệnh | Mức độ Nghiêm trọng | Phân loại OWASP / CWE | Mô tả Chi tiết & Tác động Kỹ thuật | Hướng Khắc phục Triệt để |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **SEC-01** (`typescript:S6739`) | `be/package.json`: L13 | **BLOCKER** | OWASP A07:2021<br/>CWE-798 | **Hardcoded SonarQube Token**: Chuỗi xác thực `squ_b40f5fad250291f6b141738ae0dba0c5f06a2118` được gắn cứng trực tiếp trong câu lệnh script `sonar`. Bất kỳ ai có quyền đọc kho mã nguồn đều có thể mạo danh scanner để can thiệp kết quả audit. | Đưa token vào biến môi trường hệ thống CI/CD (`SONAR_TOKEN`), thay đổi script thành `npx sonar-scanner` không kèm token cứng. Thu hồi ngay token cũ trên SonarQube Server. |
| **SEC-02** (`typescript:S5689`) | `be/src/controllers/user.controller.ts`: L81 | **CRITICAL** | OWASP A02:2021<br/>CWE-200 / CWE-532 | **Sensitive Data Exposure (Password Hash Leak)**: Trong API `/login`, đối tượng `user` được lấy trực tiếp từ database và trả thẳng về client trong JSON response body: `res.json({ success: true, data: { user, token } })`. Trường `password_hash` bị lộ hoàn toàn qua mạng truyền thông. | Sử dụng projection `{ projection: { password_hash: 0 } }` hoặc hàm sanitize để loại bỏ trường nhạy cảm trước khi trả về: `const { password_hash, ...safeUser } = user;`. |
| **SEC-03** (`docker:S6505`) | `be/docker-compose.yml`: L12-14, L26-28 | **CRITICAL** | OWASP A05:2021<br/>CWE-798 | **Hardcoded Plaintext DB Credentials**: Mật khẩu cơ sở dữ liệu PostgreSQL cho SonarQube backend được lưu dạng chuỗi tĩnh `sonar/sonar` trong tệp cấu hình docker-compose, vi phạm nguyên tắc quản trị bí mật an toàn. | Chuyển toàn bộ chuỗi kết nối và mật khẩu thành biến môi trường thông qua tệp `.env` riêng biệt nằm trong danh sách `.gitignore`. |
| **SEC-04** (`typescript:S5443`) | `be/sonar-project.properties`: L20-22 | **MAJOR** | OWASP A05:2021<br/>CWE-377 | **Unsafe Multi-criteria Rule Suppression**: Cấu hình SonarQube tắt hoàn toàn cảnh báo `typescript:S5443` (sử dụng thư mục ghi công khai) cho toàn bộ tài nguyên `**/*`. Điều này che giấu các rủi ro liên quan đến xử lý tệp tạm hoặc thư mục upload. | Hủy bỏ cấu hình ignore diện rộng `**/*`, chỉ cho phép bỏ qua cục bộ kèm theo tài liệu đánh giá nguy cơ (Justification). |
| **SEC-05** (`typescript:S5122`) | `be/src/app.ts`: L23-28 | **MAJOR** | OWASP A07:2021<br/>CWE-942 | **Permissive/Hardcoded CORS Configuration**: Địa chỉ nguồn CORS được gán cứng `origin: "http://localhost:5173"`. Khi ứng dụng triển khai trên staging hoặc production, cấu hình này sẽ gây lỗi chặn hợp lệ hoặc buộc lập trình viên phải mở `origin: "*"`. | Cấu hình CORS động đọc từ biến môi trường `CLIENT_URL` hoặc danh sách whitelist tên miền được kiểm định. |

### Bảng Phân loại Lỗi Logic & Khả năng Tin cậy (Bugs)

| Mã Bug | Vị trí Tệp / Dòng lệnh | Mức độ | Quy tắc SonarQube | Phân tích Lỗi Kỹ thuật | Nguy cơ Vận hành |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **BUG-01** | `be/src/controllers/category.controller.ts`: L8-10 | **MAJOR** | `typescript:S3776` / Data Validation | `parseInt(req.query.page as string) || 1`: Không kiểm tra số âm, số thực hoặc giá trị NaN. Biến `skip = (page - 1) * limit` có thể nhận giá trị âm dẫn đến lỗi truy vấn MongoDB Cursor. | Gây sập truy vấn hoặc lỗi 500 khi client gửi `page=-1` hoặc chuỗi ký tự lạ. |
| **BUG-02** | `be/src/controllers/category.controller.ts`: L57-60 | **MAJOR** | `typescript:S5852` / Input Sanitization | Biểu thức Regex loại bỏ ký tự đặc biệt `replace(/[^\w\-]+/g, "")` có thể tạo ra chuỗi rỗng `""` nếu chuỗi đầu vào chỉ chứa ký tự unicode/ký tự đặc biệt. | Tạo ra bản ghi danh mục có `category_id` là chuỗi rỗng trong cơ sở dữ liệu, phá vỡ tính duy nhất. |
| **BUG-03** | `be/src/lib/mongodb-wrapper.ts`: L59 | **MINOR** | `typescript:S2184` / Resource Leak | Đệ quy kết nối tự động `setTimeout(() => this.connect(), 4000)` không có cơ chế giới hạn số lần thử lại tối đa (Max Retries) hoặc Circuit Breaker. | Làm cạn kiệt tài nguyên bộ nhớ hệ thống (Memory Leak) nếu cụm MongoDB ngừng hoạt động kéo dài. |
| **BUG-04** | `be/src/lib/mongodb-wrapper.ts`: L78 | **MINOR** | `typescript:S2259` / Null Dereference | `return this.db!;`: Nếu `this.connect()` thất bại trong khối `catch`, `this.db` vẫn là `null`. Việc dùng toán tử `!` ép kiểu sẽ khiến hàm gọi sau đó sập khi truy cập `db.collection()`. | Gây lỗi `UnhandledPromiseRejection` đột ngột trên toàn bộ các controller khi mất kết nối DB. |

### Bảng Thống kê Điểm nóng An ninh (Security Hotspots)

| STT | Vị trí Mã nguồn | Quy tắc SonarQube | Điểm Cần Rà soát Bảo mật | Đánh giá Nguy cơ & Khuyến nghị |
| :---: | :--- | :--- | :--- | :--- |
| **HS-01** | `be/src/controllers/user.controller.ts`: L25, L59 | `typescript:S5344` (Weak Cryptography / CPU Cost) | Hàm băm mật khẩu `bcrypt.hash(password, 10)` sử dụng 10 vòng lặp (Cost factor = 10). | Khuyến nghị nâng lên `cost factor = 12` theo chuẩn OWASP 2026 đối với hệ thống thương mại điện tử để chống tấn công vét cạn GPU. |
| **HS-02** | `be/src/controllers/checkout.controller.ts`: L230-245 | `typescript:S4790` (Hashing Data) | Thuật toán tạo chữ ký bảo mật VNPay `crypto.createHmac("sha512", secretKey)`. | Cần đảm bảo bí mật `vnp_HashSecret` có độ dài entropy tối thiểu 256-bit và không được để trống trong tệp cấu hình `.env`. |
| **HS-03** | `be/src/middleware/auth.ts`: L23 | `typescript:S6748` (JWT Verification) | `jwt.verify(token, process.env.JWT_SECRET!)`: Sử dụng toán tử non-null assertion. | Nếu biến môi trường `JWT_SECRET` bị thiếu, thư viện có thể sử dụng chuỗi `undefined` làm khóa ký, cho phép kẻ tấn công tự ký giả mạo token người dùng. |
| **HS-04** | `be/src/controllers/product.controller.ts` & `imageCloudinary.controller.ts` | `typescript:S5147` (Resource Injection) | Tải ảnh lên máy chủ Cloudinary của bên thứ ba thông qua buffer bộ nhớ. | Cần bổ sung kiểm định dung lượng tệp (`maxFileSize: 5MB`) và xác thực MIME type ở mức Magic Bytes thay vì chỉ dựa vào phần mở rộng tệp. |
| **HS-05** | `be/src/controllers/category.controller.ts`: L62, L120 | `typescript:S5144` (NoSQL Injection) | Truy vấn trực tiếp `category_id` từ `req.params` hoặc `req.body` vào MongoDB không qua bộ lọc Zod Schema. | Có nguy cơ bị tấn công NoSQL Injection thông qua toán tử `$ne` hoặc `$gt` nếu đối tượng nhận được không phải là chuỗi nguyên thủy. |

---

## 3. Phân tích Code Smells & Nợ Kỹ thuật (Technical Debt Analysis)

Tổng số Code Smells ghi nhận trong đợt quét là **19 điểm**, tương ứng với tổng nợ kỹ thuật ước tính **20.5 giờ làm việc (~2.6 ngày công của kỹ sư)**. Chỉ số Technical Debt Ratio đạt **1.8%**, nằm trong ngưỡng an toàn (Grade A, dưới 5%), tuy nhiên cần xử lý dứt điểm để duy trì tính trong sạch của mã nguồn.

### Bảng Phân loại Code Smells Theo Trọng tâm

| Nhóm Code Smell | Số lượng Phát hiện | Vị trí Tệp Điển hình | Thời gian Khắc phục Ước tính | Tác động Đến Mã nguồn |
| :--- | :---: | :--- | :---: | :--- |
| **Dead Code / Unused Imports** | 5 | `user.controller.ts` (L8: `import { error } from "console"`), `imageGridFS.controller.ts` (L13, L29) | 0.5 giờ | Làm tăng dung lượng bundle và gây khó hiểu cho người đọc mã. |
| **Logging Code Smells** | 8 | Toàn bộ các controller (`console.log`, `console.error` rải rác) | 2.0 giờ | Lộ thông tin lỗi nội bộ hệ thống ra console môi trường staging/production; không cấu trúc được log theo chuẩn JSON. |
| **Inconsistent Error Contracts** | 3 | `category.controller.ts` vs `checkout.controller.ts` | 4.0 giờ | Sự bất đồng nhất giữa dạng `{ error: "MSG" }` và `{ success: false, errors: [...] }` khiến frontend khó chuẩn hóa bộ xử lý ngoại lệ. |
| **Lack of Schema Validation** | 2 | `category.controller.ts`, `imageGridFS.controller.ts` | 6.0 giờ | Module danh mục chưa được bảo vệ bằng Zod Middleware như các module khác (Auth, Cart, Product, Order, Checkout). |
| **Missing Test Coverage Debt** | 1 suite | `category.controller.ts` (Độ phủ dòng hiện chỉ đạt 10.52%) | 8.0 giờ | Tiềm ẩn rủi ro hồi quy nghiêm trọng khi triển khai tính năng quản trị danh mục sản phẩm. |

### Chi tiết Các Code Smells Trọng yếu Cần Khắc phục Ngay

- **Mã mùi Unused Import (`typescript:S1128`)**:
  - Tệp `be/src/controllers/user.controller.ts` dòng 8 import `error` từ `console` nhưng không sử dụng. Cần cấu hình ESLint rule `no-unused-vars` ở chế độ `error` để tự động loại bỏ.
- **Mã mùi Commented-out Code (`typescript:S125`)**:
  - Tệp `be/src/controllers/imageGridFS.controller.ts` có nhiều đoạn code chú thích bị bỏ quên (`// author: string`, `// author,`). Mã nguồn cũ cần được xóa bỏ hoàn toàn vì hệ thống Git đã lưu lại lịch sử.
- **Mã mùi Standard Output Logging (`typescript:S106`)**:
  - Có 8 tệp controller sử dụng trực tiếp `console.log` và `console.error`. Cần thay thế bằng thư viện ghi log chuyên dụng như `winston` hoặc `pino` hỗ trợ phân cấp log (`debug`, `info`, `warn`, `error`) và ẩn các stack trace nhạy cảm ở môi trường triển khai thực tế.
- **Mã mùi Khối lệnh Try-Catch Trùng lặp (`typescript:S1186`)**:
  - Mô thức bắt lỗi `try { ... } catch (error) { console.error(error); res.status(500).json(...) }` lặp lại tại hơn 15 endpoint. Khuyến nghị áp dụng kiến trúc **Centralized Error Handling Middleware** kết hợp với wrapper `express-async-handler` để loại bỏ hoàn toàn các khối bắt lỗi thủ công.

---

## 4. Báo cáo Code Coverage & Mã nguồn Trùng lặp (Code Duplication)

Số liệu kiểm thử và độ bao phủ được trích xuất trực tiếp từ báo cáo Jest LCOV (`be/coverage/lcov.info` và `be/coverage/lcov-report/index.html`).

### Bảng Chi tiết Độ bao phủ Theo Từng Tệp và Thư mục (Detailed Coverage Breakdown)

| Thư mục / Tệp Mã nguồn | Statements (%) | Branches (%) | Functions (%) | Lines (%) | Đánh giá DevSecOps |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **src/controllers/cart.controller.ts** | 100.0% (112/112) | 100.0% (34/34) | 100.0% (13/13) | 100.0% (101/101) | 🟢 **Xuất sắc (Full Branch Coverage)** |
| **src/controllers/checkout.controller.ts** | 100.0% (85/85) | 100.0% (39/39) | 100.0% (6/6) | 100.0% (83/83) | 🟢 **Xuất sắc (HMAC & VNPay Pass)** |
| **src/controllers/dashboard.controller.ts**| 100.0% (25/25) | 100.0% (7/7) | 100.0% (4/4) | 100.0% (23/23) | 🟢 **Xuất sắc** |
| **src/controllers/imageCloudinary.controller.ts**| 100.0% (42/42) | 100.0% (13/13) | 100.0% (7/7) | 100.0% (37/37) | 🟢 **Xuất sắc (Cloudinary Mock Pass)** |
| **src/controllers/order.controller.ts** | 100.0% (133/133) | 100.0% (62/62) | 100.0% (13/13) | 100.0% (120/120) | 🟢 **Xuất sắc (State Machine Pass)** |
| **src/controllers/product.controller.ts** | 100.0% (94/94) | 100.0% (48/48) | 100.0% (6/6) | 100.0% (88/88) | 🟢 **Xuất sắc (BVA & EP Pass)** |
| **src/controllers/user.controller.ts** | 100.0% (95/95) | 100.0% (29/29) | 100.0% (7/7) | 100.0% (87/87) | 🟢 **Xuất sắc (Auth & Guard Pass)** |
| **src/controllers/category.controller.ts** | **16.12% (10/62)** | **0.0% (0/22)** | **0.0% (0/5)** | **10.52% (6/57)** | 🔴 **Nguy cấp (Chưa viết Test Case)** |
| **src/lib/mongodb-wrapper.ts** | **41.66% (15/36)** | **25.0% (2/8)** | **30.0% (3/10)** | **42.42% (14/33)** | 🔴 **Cảnh báo (Mock thiếu sự kiện .on)** |
| **src/middleware (auth, validate)** | 100.0% (35/35) | 100.0% (14/14) | 100.0% (5/5) | 100.0% (31/31) | 🟢 **Xuất sắc** |
| **src/models (Data schemas)** | 100.0% (12/12) | 100.0% (0/0) | 100.0% (0/0) | 100.0% (12/12) | 🟢 **Xuất sắc** |
| **src/routes (Express routes)** | 100.0% (91/91) | 100.0% (0/0) | 100.0% (0/0) | 100.0% (91/91) | 🟢 **Xuất sắc** |
| **src/schemas (Zod schemas)** | 100.0% (31/31) | 100.0% (18/18) | 100.0% (3/3) | 100.0% (27/27) | 🟢 **Xuất sắc** |
| **TOÀN BỘ DỰ ÁN BACKEND** | **91.75% (812/885)** | **90.47% (266/294)** | **84.81% (67/79)** | **91.48% (752/822)** | 🟢 **Đạt chuẩn tổng thể > 80%** |

### Phân tích Mã nguồn Trùng lặp (Code Duplication Analysis)

Tỷ lệ trùng lặp mã nguồn đo được là **3.8%** (~280 dòng trùng lặp), vượt ngưỡng chuẩn khuyến cáo **3.0%** của SonarQube Way.

- **Khối trùng lặp 1 - Logic Phân trang (Pagination Clamping)**:
  - Tồn tại tại `category.controller.ts`, `product.controller.ts`, và `order.controller.ts`. Đoạn mã bóc tách `page`, `limit`, tính toán `skip`, `totalPages`, `hasNext`, `hasPrev` lặp lại 100% về cấu trúc.
  - *Giải pháp*: Tách thành hàm tiện ích tái sử dụng `paginateQuery<T>(model, query, options)` trong thư mục `src/utils/pagination.ts`.
- **Khối trùng lặp 2 - Cấu trúc Phản hồi Lỗi Bắt ngoại lệ**:
  - Các khối bắt lỗi trong mọi hàm xử lý controller trả về cấu trúc lỗi 500 kèm tin nhắn nội bộ `INTERNAL_SERVER_ERROR`.
  - *Giải pháp*: Sử dụng chung middleware xử lý lỗi tập trung để giảm thiểu hơn 150 dòng mã lặp.
- **Khối trùng lặp 3 - Kiểm tra Tính hợp lệ của MongoDB ObjectId**:
  - `ObjectId.isValid(id)` kết hợp việc khởi tạo `new ObjectId(id)` xuất hiện phân tán tại nhiều controller.
  - *Giải pháp*: Chuẩn hóa vào Zod Schema `z.string().refine((val) => ObjectId.isValid(val))` để tự động kiểm tra tại tầng routing.

---

## 5. Kế hoạch Khắc phục & Tối ưu hóa Clean Code cho các Sprint Tiếp theo

Để đưa dự án vượt qua Quality Gate (chuyển trạng thái từ 🔴 **FAILED** sang 🟢 **PASSED**) và đạt chuẩn sẵn sàng bàn giao (Production Ready), đội ngũ DevSecOps đề xuất lộ trình hành động chi tiết phân kỳ theo 3 giai đoạn:

### Giai đoạn 1: Khắc phục Khẩn cấp Lỗ hổng Bảo mật (Hotfix Security - Sprint 8 Kickoff)

> Thời gian dự kiến: 1 - 2 ngày làm việc  
> Mục tiêu: Đưa Security Rating từ **Grade E** lên **Grade A**.

- **Hành động 1.1: Loại bỏ Secret Hardcoded trong `package.json`**:
  - Xóa chuỗi token `squ_b40f5fad250291f6b141738ae0dba0c5f06a2118` khỏi script `npm run sonar`.
  - Cập nhật tài liệu hướng dẫn: Nhà phát triển cấu hình biến môi trường cục bộ qua tệp `.env` hoặc tham số dòng lệnh `npx sonar-scanner -Dsonar.token=$SONAR_TOKEN`.
  - Thu hồi token cũ trên giao diện quản trị SonarQube Server.
- **Hành động 1.2: Triệt tiêu Lỗ hổng Rò rỉ Băm Mật khẩu trong API Login**:
  - Chỉnh sửa `be/src/controllers/user.controller.ts` tại hàm `loginUser`:
    ```typescript
    // Loại trừ triệt để password_hash trước khi trả về client
    const { password_hash, ...safeUserData } = user;
    return res.json({ success: true, data: { user: safeUserData, token } });
    ```
- **Hành động 1.3: Cách ly Thông tin Xác thực Hạ tầng SonarQube**:
  - Cập nhật `be/docker-compose.yml`, chuyển `SONAR_JDBC_PASSWORD` và `POSTGRES_PASSWORD` sang sử dụng `${POSTGRES_PASSWORD}` đọc từ tệp cấu hình môi trường bảo mật.
- **Hành động 1.4: Gỡ bỏ Quy tắc Bỏ qua Cảnh báo Toàn cục**:
  - Loại bỏ các dòng `sonar.issue.ignore.multicriteria` trong `be/sonar-project.properties` để SonarQube giám sát đầy đủ mọi nguy cơ ghi tệp.

### Giai đoạn 2: Lấp đầy Khoảng trống Kiểm thử & Nâng cao Độ tin cậy (Sprint 8)

> Thời gian dự kiến: 3 - 4 ngày làm việc  
> Mục tiêu: Nâng độ phủ module Category lên trên 90% và sửa lỗi Test Suite MongoDB Wrapper.

- **Hành động 2.1: Bổ sung Bộ Kiểm thử Toàn diện cho `category.controller.ts`**:
  - Xây dựng tệp test mới `be/src/tests/category.test.ts` bao phủ đầy đủ các ca kiểm thử:
    - Lấy danh sách danh mục (kèm phân trang biên: `page=1`, `page=0`, `page=-1`, `limit=100`).
    - Tạo danh mục mới (hợp lệ, trùng lặp tên, ID chứa ký tự đặc biệt).
    - Cập nhật và xóa danh mục (kiểm tra phân quyền Admin).
  - Đưa độ phủ dòng lệnh của `category.controller.ts` từ **10.52%** lên tối thiểu **95.0%**.
- **Hành động 2.2: Sửa lỗi Mock trong `mongodb-wrapper.test.ts`**:
  - Cập nhật đối tượng giả lập `mockMongoClient` bổ sung đầy đủ các bộ lắng nghe sự kiện `.on("open", ...)` và `.on("close", ...)`.
  - Đảm bảo 100% Test Suites (10/10 suites) và 217/217 test cases đều đạt trạng thái **PASS**.

### Giai đoạn 3: Tối ưu hóa Clean Code, Tái cấu trúc & Giảm Trùng lặp (Sprint 9)

> Thời gian dự kiến: 1 tuần làm việc  
> Mục tiêu: Giảm tỷ lệ Duplication xuống dưới 2.0% và loại bỏ toàn bộ Code Smells.

- **Hành động 3.1: Chuẩn hóa Hợp đồng Phản hồi API (API Response Contract)**:
  - Thống nhất một format JSON duy nhất cho toàn hệ thống:
    ```typescript
    interface ApiResponse<T> {
      success: boolean;
      data?: T;
      errors?: Array<{ field?: string; message: string }>;
      meta?: Record<string, unknown>;
    }
    ```
- **Hành động 3.2: Tích hợp Bộ Ghi Log Tập trung (Structured Logger)**:
  - Thay thế toàn bộ các lệnh `console.log` và `console.error` bằng `logger.info()` và `logger.error()` sử dụng thư viện **Winston**.
  - Thiết lập cơ chế tự động che dấu (masking) các trường nhạy cảm (`password`, `token`, `cardNumber`) trong nhật ký hệ thống.
- **Hành động 3.3: Tích hợp SonarQube Scan vào CI/CD Pipeline**:
  - Khởi tạo tệp `.github/workflows/ci.yml` tự động kích hoạt kiểm tra chất lượng mỗi khi tạo Pull Request:
    - Bước 1: Lint mã nguồn (`eslint`).
    - Bước 2: Chạy kiểm thử tự động và xuất báo cáo độ phủ (`npm run test:coverage`).
    - Bước 3: Quét SonarQube Scanner và kiểm tra Quality Gate Status (`sonarqube-quality-gate-action`). Chặn merge tự động nếu trạng thái là **FAILED**.
- **Hành động 3.4: Tái cấu trúc Giảm Trùng lặp (Refactoring Duplications)**:
  - Trích xuất hàm `getPaginationMeta` và `parsePaginationQuery` vào tiện ích chung `src/utils/pagination.ts`.
  - Trích xuất middleware xác thực quyền `isAdmin` và kiểm tra `ObjectId` hợp lệ vào thư mục `src/middleware`.

---

> **Phê duyệt bởi:** Lead Software Quality Auditor & DevSecOps Lead  
> **Ký duyệt:** Đã kiểm định và ban hành tài liệu chính thức vào hồ sơ dự án.
