import { jest } from "@jest/globals";

// 1. Tăng timeout mặc định cho các test case (ví dụ: làm việc với DB hoặc async task)
jest.setTimeout(10000);

// 2. Tự động dọn dẹp các mock/spy sau mỗi test case
afterEach(() => {
  jest.clearAllMocks();
});

// 3. Đóng các kết nối (Database, Redis, Server...) sau khi tất cả test hoàn thành
afterAll(async () => {
  // Ví dụ nếu dùng Prisma / TypeORM / Mongoose:
  // await prisma.$disconnect();
  // await mongoose.connection.close();
});
