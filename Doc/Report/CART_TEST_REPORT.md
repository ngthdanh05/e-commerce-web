# 📄 BÁO CÁO KIỂM THỬ TÍNH NĂNG CART MANAGEMENT

---

## 🟢 PHẦN 1: BỘ TEST CASE BLACKBOX (EP + BVA)

### 1. Phân tích Phân vùng tương đương (Equivalence Partitioning - EP) & Giá trị biên (Boundary Value Analysis - BVA)

#### Bảng 1.1: Phân tích Phân vùng tương đương (EP) cho các tham số Cart Module

| Tham số (Input) | Ràng buộc nghiệp vụ & Kỹ thuật | Phân vùng hợp lệ (Valid EP) | Phân vùng không hợp lệ (Invalid EP) |
| :--- | :--- | :--- | :--- |
| `productId` | Chuỗi ký tự định danh sản phẩm (BSON ObjectId / String ID). Bắt buộc có độ dài >= 1. | • **EP-V1**: Chuỗi ký tự ID hợp lệ và tồn tại trong collection `products` (vd: `"prod_123"`). | • **EP-I1**: Bỏ trống hoặc chuỗi rỗng `""` (`Product ID is required`).<br>• **EP-I2**: ID hợp lệ về format nhưng **không tồn tại** trong CSDL (Kích hoạt 404 `Product not found`).<br>• **EP-I3**: Sai kiểu dữ liệu (`number`, `boolean`, `array`). |
| `quantity` | Số lượng sản phẩm thêm/sửa vào giỏ. Là số nguyên. Giới hạn thêm mới: 1 <= quantity <= 99. Giới hạn cập nhật: 0 <= quantity <= 99. | • **EP-V2**: Số nguyên nằm trong khoảng cho phép (1 <= q <= 99 với Add; 0 <= q <= 99 với Update). | • **EP-I4**: Số lượng nhỏ hơn mức tối thiểu (q < 1 đối với Add, q < 0 đối với Update).<br>• **EP-I5**: Số lượng vượt quá mức tối đa cho phép (q > 99).<br>• **EP-I6**: Số thập phân / số thực (vd: `1.5`, `2.8`).<br>• **EP-I7**: Sai kiểu dữ liệu (`string`, `null`, `undefined`). |
| `user` (Auth Token) | Người dùng phải đăng nhập hệ thống và gửi cùng JWT Auth Header. | • **EP-V3**: Request có kèm thông tin User hợp lệ (`req.user` chứa `_id`, `email`, `role`). | • **EP-I8**: Request **không có thông tin User** / chưa đăng nhập (`req.user = undefined`). |

---

### 2. Danh sách Test Cases & Kết quả Thực thi Unit Test (Integration & Controller Level)

#### Bảng 1.2: Danh sách chi tiết 21 Test Cases (Mã chuẩn TC-CART-01 -> TC-CART-21)

| STT | Mã Test Case | Nhóm chức năng | Mô tả kịch bản test | Dữ liệu đầu vào (Input) | Kết quả kỳ vọng (Expected Output) | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | **TC-CART-01** | `GET /api/cart` | Lấy giỏ hàng khi người dùng chưa đăng nhập | `req.user = undefined` | HTTP `400 Bad Request`<br>`{ error: "UNAUTHORIZED" }` | Đã khớp 100% | **PASS** |
| 2 | **TC-CART-02** | `GET /api/cart` | Lấy giỏ hàng khi người dùng chưa có giỏ hàng trong CSDL | User đã auth, DB chưa có record `cart` | HTTP `200 OK`<br>`{ success: true, data: { products: [], totalPrice: 0 } }` | Đã khớp 100% | **PASS** |
| 3 | **TC-CART-03** | `GET /api/cart` | Lấy giỏ hàng thành công (Ẩn trường `_id` nội bộ DB) | User đã auth, DB trả về 1 giỏ hàng có sản phẩm | HTTP `200 OK`<br>Trả về dữ liệu chứa `userId`, `products`, `totalPrice` | Đã khớp 100% | **PASS** |
| 4 | **TC-CART-04** | `GET /api/cart` | Xử lý ngoại lệ khi truy vấn CSDL thất bại | `cartCollection.getCollection` quăng lỗi (`Error("db")`) | HTTP `500 Internal Server Error`<br>`{ error: "INTERNAL_SERVER_ERROR" }` | Đã khớp 100% | **PASS** |
| 5 | **TC-CART-05** | `POST /api/cart` | Thêm vào giỏ khi người dùng chưa đăng nhập | `req.user = undefined`, `productId`, `quantity: 1` | HTTP `400 Bad Request` | Đã khớp 100% | **PASS** |
| 6 | **TC-CART-06** | `POST /api/cart` | Bị từ chối khi thiếu `productId` hoặc `quantity` | `body: { productId }` (Thiếu `quantity`) | HTTP `400 Bad Request`<br>`{ error: "Missing productId or quantity" }` | Đã khớp 100% | **PASS** |
| 7 | **TC-CART-07** | `POST /api/cart` | Thêm sản phẩm không tồn tại trong CSDL | `productId` không có trong bảng `products` | HTTP `404 Not Found` | Đã khớp 100% | **PASS** |
| 8 | **TC-CART-08** | `POST /api/cart` | Tạo mới giỏ hàng và tính tổng tiền theo giá chuẩn DB | Giỏ hàng chưa tồn tại, `productId`, `quantity: 2` | Gọi `insertOne` với `totalPrice = 1,000,000`<br>HTTP `200 OK` | Đã khớp 100% | **PASS** |
| 9 | **TC-CART-09** | `POST /api/cart` | Cộng dồn số lượng khi thêm sản phẩm đã có trong giỏ | Giỏ đã có `quantity: 2`, gửi thêm `quantity: 3` | Gọi `updateOne` với `quantity: 5`, `totalPrice = 2,500,000` | Đã khớp 100% | **PASS** |
| 10 | **TC-CART-10** | `POST /api/cart` | Thêm một loại sản phẩm mới vào giỏ hàng hiện có | Giỏ đã có món A, gửi request thêm món B | Gọi `updateOne` ghép món B vào mảng `products` | Đã khớp 100% | **PASS** |
| 11 | **TC-CART-11** | `POST /api/cart` | Xử lý lỗi khi không tìm thấy thông tin giá để tính lại | Giỏ có item chứa `productId` lạ không có trong DB | HTTP `500 Internal Server Error` | Đã khớp 100% | **PASS** |
| 12 | **TC-CART-12** | `POST /api/cart` | Xử lý ngoại lệ kết nối CSDL bị ngắt đột ngột | `productCollection.getCollection` quăng lỗi | HTTP `500 Internal Server Error` | Đã khớp 100% | **PASS** |
| 13 | **TC-CART-13** | `PUT /api/cart` | Validate chưa auth, giỏ hàng không tồn tại hoặc item không có | Chuỗi kịch bản test validation tổng hợp | HTTP `400` (khi chưa Auth), HTTP `404` (khi không thấy Giỏ/Item) | Đã khớp 100% | **PASS** |
| 14 | **TC-CART-14** | `PUT /api/cart` | Tự động xóa sản phẩm ra khỏi giỏ khi cập nhật `quantity = 0` | `productId`, `quantity: 0` | Xóa item khỏi danh sách, cập nhật `totalPrice = 0` | Đã khớp 100% | **PASS** |
| 15 | **TC-CART-15** | `PUT /api/cart` | Cập nhật số lượng sản phẩm mới và tính toán lại tổng giá | Giỏ đang có `quantity: 2`, gửi `quantity: 4` | Cập nhật `quantity: 4`, tính lại `totalPrice = 2,000,000` | Đã khớp 100% | **PASS** |
| 16 | **TC-CART-16** | `PUT /api/cart` | Xử lý ngoại lệ khi lệnh cập nhật Database thất bại | `cartCollection.getCollection` quăng lỗi | HTTP `500 Internal Server Error` | Đã khớp 100% | **PASS** |
| 17 | **TC-CART-17** | `DELETE /api/cart` | Validate chưa auth, không có giỏ hoặc item không tồn tại | Chuỗi kịch bản test validation xóa item | HTTP `400` (khi chưa Auth), HTTP `404` (khi không tìm thấy) | Đã khớp 100% | **PASS** |
| 18 | **TC-CART-18** | `DELETE /api/cart` | Xóa 1 sản phẩm khỏi giỏ và tính lại tổng tiền | Giỏ đang có 2 món, thực hiện xóa 1 món | Món chỉ định bị xóa, giỏ giữ lại món còn lại & recalculate | Đã khớp 100% | **PASS** |
| 19 | **TC-CART-19** | `DELETE /api/cart` | Xử lý ngoại lệ khi lệnh xóa Database thất bại | `cartCollection.getCollection` quăng lỗi | HTTP `500 Internal Server Error` | Đã khớp 100% | **PASS** |
| 20 | **TC-CART-20** | `Cart Schemas` | Kiểm thử Zod Schema với các giá trị biên hợp lệ | `quantity: 1`, `quantity: 99` (Add); `quantity: 0` (Update) | Zod parse thành công, trả về đúng object input | Đã khớp 100% | **PASS** |
| 21 | **TC-CART-21** | `Cart Schemas` | Kiểm thử Zod Schema từ chối các giá trị biên vi phạm | `quantity: 0` (Add), `quantity: 100`, `quantity: 1.5`, `productId: ""` | Zod quăng exception/error validation (`toThrow`) | Đã khớp 100% | **PASS** |

---

## 🔴 PHẦN 2: BÁO CÁO ĐỘ BAO PHỦ MÃ NGUỒN (CODE COVERAGE REPORT)

### Kết quả đo lường bằng Jest Coverage Engine

| File được kiểm thử | % Statements | % Branch | % Functions | % Lines | Trạng thái Uncovered Lines |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`src/controllers/cart.controller.ts`** | **100%** | **100%** | **100%** | **100%** | *None (Bao phủ tuyệt đối)* |
| **`src/schemas/cart.schema.ts`** | **100%** | **100%** | **100%** | **100%** | *None (Bao phủ tuyệt đối)* |

* **Tổng số Test Suites:** 1 passed, 1 total
* **Tổng số Tests:** 21 passed, 21 total
* **Thời gian thực thi:** ~2.172 giây