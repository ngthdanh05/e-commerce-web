Feature("Cart Operations EP & BVA E2E Tests (CodeceptJS)");

const baseUrl = "http://localhost:5173";

Scenario(
  "TC_CART_UI_01 [BVA Quantity 1 Min Clean]: Add product with minimum valid quantity (1 item)",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/product/1`);
    I.fillField('input[name="quantity"]', "1");
    I.click("button.btn-add-to-cart");
    I.wait(2);
    I.amOnPage(`${baseUrl}/cart`);
    I.see("1", ".cart-item-quantity");
  },
);

Scenario(
  "TC_CART_UI_02 [BVA Quantity 99 Max Clean]: Update cart item to maximum valid boundary (99 items)",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/cart`);
    I.fillField('input[name="cartQuantity"]', "99");
    I.click("button.btn-update-cart");
    I.wait(2);
    I.see("99", ".cart-item-quantity");
  },
);

Scenario(
  "TC_CART_UI_03 [BVA Quantity 0 Remove]: Setting quantity to 0 removes item from cart",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/cart`);
    I.fillField('input[name="cartQuantity"]', "0");
    I.click("button.btn-update-cart");
    I.wait(2);
    I.see("Giỏ hàng của bạn đang trống", ".empty-cart-message");
  },
);

Scenario(
  "TC_CART_UI_04 [BVA Quantity 100 Dirty]: Display error when quantity exceeds max boundary (100 items)",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/cart`);
    I.fillField('input[name="cartQuantity"]', "100");
    I.click("button.btn-update-cart");
    I.waitForText("Số lượng tối đa cho phép là 99", 5);
  },
);
