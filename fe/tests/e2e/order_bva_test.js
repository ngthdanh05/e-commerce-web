Feature("Order Management & State Machine EP E2E Tests (CodeceptJS)");

const baseUrl = "http://localhost:5173";

Scenario(
  "TC_ORD_UI_01 [EP User History]: User can view list of past orders and filter by status",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/orders`);
    I.click("button.filter-completed");
    I.wait(1);
    I.seeElement(".order-status-completed");
  },
);

Scenario(
  "TC_ORD_UI_02 [EP Order Cancel]: User can cancel pending order",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/orders`);
    I.click(".order-item-pending button.btn-cancel");
    I.waitForText("Đơn hàng đã được hủy thành công", 5);
    I.see("CANCELLED", ".order-status");
  },
);

Scenario(
  "TC_ORD_UI_03 [EP Admin State Machine]: Admin updates order status from Pending to Processing",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/admin/orders`);
    I.click(".order-row-pending button.btn-process");
    I.wait(2);
    I.see("PROCESSING", ".admin-order-status");
  },
);
