Feature("Checkout Flow & VNPay Gateway EP & BVA E2E Tests (CodeceptJS)");

const baseUrl = "http://localhost:5173";

Scenario(
  "TC_CHK_UI_01 [BVA Phone 10 digits Clean]: Successful checkout with valid 10-digit phone number",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/product/1`);
    I.click("button.btn-add-to-cart");
    I.amOnPage(`${baseUrl}/checkout`);

    I.fillField('input[name="fullName"]', "Nguyen Van A");
    I.fillField('input[name="phone"]', "0912345678"); // 10 digits boundary
    I.fillField('textarea[name="address"]', "123 Duong Le Loi, Quan 1, TP.HCM");
    I.click('input[value="COD"]');
    I.click('button[type="submit"]');
    I.wait(3);
    I.seeInCurrentUrl("/order-success");
  },
);

Scenario(
  "TC_CHK_UI_02 [BVA Phone Invalid Dirty]: Prevent submission when phone number is less than 10 digits",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/checkout`);
    I.fillField('input[name="fullName"]', "Nguyen Van A");
    I.fillField('input[name="phone"]', "09123456"); // 8 digits (invalid boundary)
    I.fillField('textarea[name="address"]', "123 Duong Le Loi, Quan 1, TP.HCM");
    I.click('button[type="submit"]');
    I.seeInCurrentUrl("/checkout");
  },
);

Scenario(
  "TC_CHK_UI_03 [EP VNPay Redirect]: Successfully redirect to VNPay Sandbox Payment Gateway",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/checkout`);
    I.fillField('input[name="fullName"]', "Nguyen Van A");
    I.fillField('input[name="phone"]', "0912345678");
    I.fillField('textarea[name="address"]', "123 Duong Le Loi, Quan 1, TP.HCM");
    I.click('input[value="VNPAY"]');
    I.click('button[type="submit"]');
    I.wait(4);
    I.seeInCurrentUrl("vnpay.vn");
  },
);
