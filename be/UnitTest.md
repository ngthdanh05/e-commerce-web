# Tổng kết Sprint 2

## Mục tiêu

- Hoàn thành việc viết unit test cho các controller liên quan đến cart và xây dựng cấu trúc test phù hợp trong backend.
- Chuẩn bị các tài liệu và script Postman để hỗ trợ kiểm thử và import dữ liệu trong môi trường phát triển.
- Hoàn thiện công việc trên nhánh phát triển Sprint 2 và ghi nhận kết quả thực hiện.

## Nội dung đã thực hiện

- Xây dựng và triển khai cấu trúc thư mục test cho backend, bao gồm các test unit và integration.
- Viết các test ban đầu cho logic và route liên quan đến cart.
- Chuẩn bị các file collection/environment Postman phục vụ việc kiểm thử API.
- Tạo nhánh phát triển cho Sprint 2 với tên Sp2-UnitTest.

## Kết quả đạt được

- Đã có nền tảng test ban đầu cho backend, đặc biệt là phần cart.
- Cấu trúc test đã được tổ chức rõ ràng và có thể mở rộng cho các module khác.
- Các script Postman đã được chuẩn bị sẵn để hỗ trợ kiểm thử thủ công.
- Công việc Sprint 2 đã được đẩy lên nhánh tương ứng.

## Kết quả chạy test

- Đã chạy lệnh: `npm test -- --runInBand`
- Kết quả thực tế:
  - Tổng số suite: 2
  - Suite pass: 1
  - Suite fail: 1
  - Tổng số test: 3
  - Test pass: 3
  - Test fail: 0 (vấn đề xảy ra ở mức khởi chạy suite do module mock auth không tìm thấy)
- Lỗi chính gặp phải: `Cannot find module '../../src/middleware/auth' from 'src/tests/integration/cart.route.test.ts'`

## Điểm nổi bật

- Đã thiết lập được khung test ban đầu cho backend, tạo tiền đề cho việc mở rộng sang các module khác.
- Việc chuẩn bị Postman và cấu trúc test giúp tăng khả năng kiểm thử và giảm thiểu rủi ro khi phát triển tiếp.
- Nhóm đã chủ động triển khai test ngay từ giai đoạn đầu của sprint.

## Hạn chế / hướng phát triển

- Cần sửa lại đường dẫn import và cấu hình mock cho middleware auth để test integration chạy ổn định.
- Nên mở rộng thêm test cho các controller còn lại như product, order và checkout.
- Cần bổ sung CI/CD hoặc script kiểm thử tự động để giảm phụ thuộc vào kiểm thử thủ công.

## Kết luận

- Sprint 2 đã đạt được mục tiêu cơ bản về việc thiết lập nền tảng unit test và chuẩn bị công cụ kiểm thử cho backend.
- Mặc dù còn tồn tại một lỗi cấu hình ở test integration, đây là vấn đề có thể khắc phục nhanh và sẽ giúp hệ thống test trở nên vững chắc hơn trong các sprint tiếp theo.
