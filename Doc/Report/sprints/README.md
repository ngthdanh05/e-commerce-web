# 🧪 BÁO CÁO TỔNG KẾT KIỂM THỬ PHẦN MỀM (QA SPRINT REPORT)

> **Dự án:** Web Application Testing (E-Commerce / Booking API)  
> **Người thực hiện:** QA Lead & QA Team  
> **Công cụ quản lý:** Jira Software | **Kiểm thử API:** Postman, Jest, Zod

---

## 📌 TỔNG QUAN TIẾN ĐỘ THEO SPRINT

| Sprint       | Phạm vi công việc chính                                | Trạng thái | Jira Key liên quan                 |
| :----------- | :----------------------------------------------------- | :--------: | :--------------------------------- |
| **Sprint 1** | Khởi tạo nhóm, setup môi trường & Workspace Postman    |    DONE    | SCRUM-1 → SCRUM-8                  |
| **Sprint 2** | Nghiên cứu lý thuyết, lập Test Plan & soạn Test Cases  |    DONE    | SCRUM-9 → SCRUM-15                 |
| **Sprint 3** | Setup Test Framework tự động & Kiểm thử tích hợp DB    |    DONE    | SCRUM-14, SCRUM-16                 |
| **Sprint 4** | Kiểm thử Module Auth, Product CRUD & Cart Edge Cases   |    DONE    | SCRUM-17 → SCRUM-25                |
| **Sprint 5** | Kiểm thử Checkout VNPay, Order State & Log Bug         |    DONE    | SCRUM-26 → SCRUM-31, SCRUM-33 → 39 |
| **Sprint 6** | Chuẩn hóa toàn bộ bộ kiểm thử BVA cho 5 mô-đun cốt lõi |    DONE    | SCRUM-40 → SCRUM-44                |

---

## 📅 NỘI DUNG CHI TIẾT THEO TUẦN LÀM VIỆC (SPRINTS)

### 🚀 Sprint 1: Setup Môi trường & Khởi động Dự án

- **Mục tiêu:** Đảm bảo toàn bộ team chạy thành công dự án local và sẵn sàng môi trường test.
- **Chi tiết công việc:**
  - **[SCRUM-6]** Thành lập nhóm QA/Dev và phân công nhiệm vụ.
  - **[SCRUM-2, SCRUM-7]** Chạy thành công dự án trên máy tính cá nhân.
  - **[SCRUM-1, SCRUM-8]** Nghiên cứu chuyên sâu Postman (Environment, Collection, Workspace).
  - **[SCRUM-5]** Khai báo và chia sẻ Workspace Postman chung cho các thành viên.

---

### 📖 Sprint 2: Lập Kế hoạch & Thiết kế Test Case

- **Mục tiêu:** Chuẩn bị cơ sở lý thuyết và tài liệu kiểm thử chuẩn mực.
- **Chi tiết công việc:**
  - **[SCRUM-9, SCRUM-10]** Hoàn thiện E-learning 1 và nghiên cứu các phương pháp kiểm thử phần mềm.
  - **[SCRUM-11, SCRUM-12]** Xây dựng Test Plan, cấu hình môi trường kiểm thử theo chương 3.
  - **[SCRUM-13]** Soạn thảo danh sách Test Cases và chuẩn bị dữ liệu thử nghiệm (Test Data).
  - **[SCRUM-15]** Thực hiện đánh giá sơ bộ về hiệu năng, chịu tải và bảo mật hệ thống.

---

### 🔍 Sprint 3: R&D & Test Automation Framework _(Sprint bổ sung)_

- **Mục tiêu:** Đảm bảo hạ tầng kiểm thử tự động sẵn sàng trước khi test các module phức tạp.
- **Chi tiết công việc:**
  - **[SCRUM-14]** Cấu hình Jest & Supertest để phục vụ Automation Test cho REST API.
  - **[SCRUM-16]** Thiết kế bộ dữ liệu test mẫu (Seed Data) cho cơ sở dữ liệu để test luồng giao dịch.

---

### 🔑 Sprint 4: Kiểm thử Xác thực (Auth) & Quản lý Sản phẩm / Giỏ hàng

- **Mục tiêu:** Đánh giá chất lượng API Validation (Zod) và logic nghiệp vụ Auth/Cart.
- **Chi tiết công việc:**
  - **[SCRUM-17, SCRUM-18]** Test Zod Middleware (BE) và giao diện xác thực form real-time (FE).
  - **[SCRUM-19]** Thực thi bộ Test Case cho Quản lý tài khoản áp dụng Phân vùng tương đương (EP) & Phân tích giá trị biên (BVA).
  - **[SCRUM-20]** Kiểm tra thiết lập Repo, quy tắc GitHub và biến môi trường.
  - **[SCRUM-21, SCRUM-23]** Kiểm thử API Product CRUD, phân trang và giới hạn bộ lọc tìm kiếm.
  - **[SCRUM-22, SCRUM-24, SCRUM-25]** Kiểm thử logic bảo mật giỏ hàng, tính lại giá và các trường hợp biên (Edge Cases).

---

### 💳 Sprint 5: Kiểm thử Thanh toán VNPay, Đơn hàng & Quản lý Lỗi (Defect Tracking)

- **Mục tiêu:** Đảm bảo toàn vẹn giao dịch tài chính và ghi nhận các lỗi giá trị biên.
- **Chi tiết công việc:**
  - **[SCRUM-26, SCRUM-28]** Kiểm thử form vận chuyển và luồng chuyển hướng/callback thanh toán VNPay Sandbox.
  - **[SCRUM-27, SCRUM-30, SCRUM-31]** Đánh giá Máy trạng thái đơn hàng (Order State Machine) và quyền Quản trị viên.
  - **[SCRUM-29]** Kiểm thử tích hợp toàn bộ Checkout Flow.

#### 🐞 Danh sách Defect / Bug phát hiện trong Sprint 4 & 5:

| Bug Key      | Mô-đun   | Tóm tắt lỗi phát hiện                                                                  | Trạng thái |
| :----------- | :------- | :------------------------------------------------------------------------------------- | :--------: |
| **SCRUM-33** | Auth API | TC01/02: Server trả 400 Validation Error cho Email hợp lệ (5 & 254 chars)              |   CLOSED   |
| **SCRUM-34** | Auth API | TC02: Server trả 400 VALIDATION_ERROR khi đăng ký email max boundary (254 chars)       |   CLOSED   |
| **SCRUM-35** | Auth API | TC05: Server báo `ACCOUNT_ALREADY_EXISTS` khi test Min Password hợp lệ                 |   CLOSED   |
| **SCRUM-37** | Cart API | TC02: `POST /api/cart/add` trả 400 Bad Request khi thêm `quantity = 1`                 |   CLOSED   |
| **SCRUM-38** | Cart API | TC03: `POST /api/cart/add` trả 400 Bad Request khi thêm `quantity = 99` (Max Boundary) |   CLOSED   |
| **SCRUM-39** | Cart API | TC05: `PUT /api/cart/update` trả 400 Bad Request khi cập nhật `quantity = 0`           |   CLOSED   |

---

### 🎯 Sprint 6: Chuẩn hóa Bộ kiểm thử Giá trị biên (BVA Execution)

- **Mục tiêu:** Áp dụng triệt để kỹ thuật Phân tích giá trị biên (BVA) trên toàn hệ thống để chuẩn bị đóng dự án.
- **Chi tiết công việc:**
  - **[SCRUM-40]** Triển khai Validation & BVA Test Cases cho thông tin người dùng (Auth).
  - **[SCRUM-41]** Triển khai Validation & BVA Test Cases cho số lượng sản phẩm trong giỏ (Cart).
  - **[SCRUM-42]** Triển khai Validation & BVA Test Cases cho giá sản phẩm (Product Price).
  - **[SCRUM-43]** Triển khai Validation & BVA Test Cases cho thông tin giao hàng (Checkout Shipping Info).
  - **[SCRUM-44]** Triển khai Validation & BVA Test Cases cho Vòng đời quản lý đơn hàng (Order Management).

---

## 📊 TỔNG HỢP MỆNH ĐỀ ĐÁNH GIÁ CHẤT LƯỢNG (QA CONCLUSION)

1. **Độ bao phủ kiểm thử (Test Coverage):** Hệ thống đã được phủ kín các kỹ thuật **EP (Equivalence Partitioning)** và **BVA (Boundary Value Analysis)** cho cả 5 mô-đun cốt lõi.
2. **Chất lượng xử lý lỗi Boundary:** Các lỗi nghiêm trọng về biên độ dài Email (254 ký tự) và biên số lượng Giỏ hàng (0, 1, 99) đã được ghi nhận trên Jira và khắc phục triệt để.
3. **Đánh giá phát hành:** Sản phẩm đạt yêu cầu về tính ổn định, độ tin cậy của dữ liệu và sẵn sàng để báo cáo với Giảng viên.
