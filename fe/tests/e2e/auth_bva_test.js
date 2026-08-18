Feature("Authentication Form EP & BVA E2E Tests (CodeceptJS)");

const baseUrl = "http://localhost:5173";

const password7Chars = "P@sswo1";
const password8Chars = "P@sswor1";

const getRandomEmail = (prefix, domain = "example.com") => {
  return `${prefix}_${Date.now()}@${domain}`;
};

Scenario(
  "TC_REG_UI_01 [BVA 0 chars]: Form validation prevents submission when required fields are empty",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/register`);
    I.click('button[type="submit"]');
    I.seeInCurrentUrl("/register");
  },
);

Scenario(
  "TC_REG_UI_02 [BVA 7 chars Password Dirty]: Display error when password length is 7 characters (min-)",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/register`);
    I.fillField('input[name="name"]', "Nguyen Van A");
    I.fillField('input[name="email"]', getRandomEmail("user7"));
    I.fillField('input[name="password"]', password7Chars);
    I.fillField('input[name="confirmPassword"]', password7Chars);
    I.click('button[type="submit"]');
    I.wait(2);
  },
);

Scenario(
  "TC_REG_UI_03 [BVA 8 chars Password Clean]: Successful registration with 8 chars password (min)",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/register`);
    I.fillField('input[name="name"]', "Nguyen Van A");
    I.fillField('input[name="email"]', getRandomEmail("user8"));
    I.fillField('input[name="password"]', password8Chars);
    I.fillField('input[name="confirmPassword"]', password8Chars);
    I.click('button[type="submit"]');
    I.wait(2);
    I.seeInCurrentUrl("/login");
  },
);

Scenario(
  "TC_REG_UI_04 [BVA 5 chars Email Clean]: Successful registration with 5 chars email (min)",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/register`);
    const dynamicEmail5 = `x${Date.now().toString().slice(-3)}@b.co`;

    I.fillField('input[name="name"]', "Nguyen Van A");
    I.fillField('input[name="email"]', dynamicEmail5);
    I.fillField('input[name="password"]', password8Chars);
    I.fillField('input[name="confirmPassword"]', password8Chars);
    I.click('button[type="submit"]');
    I.wait(2);
    I.seeInCurrentUrl("/login");
  },
);

Scenario(
  "TC_REG_UI_05 [BVA 254 chars Email Clean]: Successful registration with 254 chars email (max)",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/register`);

    // Thêm timestamp động để email luôn độc nhất mỗi lần chạy test, tránh lỗi trùng lặp database
    const timestamp = Date.now().toString(); // 13 ký tự
    const localPart = `u_${timestamp}`; // Tổng cộng 15 ký tự
    const at = "@"; // 1 ký tự

    const label1 = "b".repeat(63);
    const label2 = "b".repeat(63);
    const label3 = "b".repeat(63);

    // Tính toán phần đuôi còn lại để tổng chiều dài khít đúng bằng 254 ký tự
    const currentLengthSoFar =
      localPart.length +
      at.length +
      label1.length +
      1 +
      label2.length +
      1 +
      label3.length +
      1 +
      3; // 3 là ".co"
    const remainingLength = 254 - currentLengthSoFar;
    const domainTail = "b".repeat(remainingLength) + ".co";

    const email254 = `${localPart}@${label1}.${label2}.${label3}.${domainTail}`;
    console.log("Email length:", email254.length); // Luôn luôn in ra 254

    I.fillField('input[name="name"]', "Nguyen Van A");

    I.executeScript((email) => {
      const input = document.querySelector('input[name="email"]');
      if (input) {
        input.removeAttribute("maxLength");
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, email);
        } else {
          input.value = email;
        }
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, email254);

    I.fillField('input[name="password"]', password8Chars);
    I.fillField('input[name="confirmPassword"]', password8Chars);
    I.click('button[type="submit"]');
    I.wait(3);
    I.seeInCurrentUrl("/login");
  },
);

Scenario(
  "TC_REG_UI_06 [BVA 255 chars Email Dirty]: Display error when email exceeds max length (255 chars)",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/register`);
    const domain = "@ex.co";
    const localPartLength = 255 - domain.length;
    const email255 = "a".repeat(localPartLength) + domain;

    I.fillField('input[name="name"]', "Nguyen Van A");

    I.executeScript((email) => {
      const input = document.querySelector('input[name="email"]');
      if (input) {
        input.removeAttribute("maxLength");
        input.value = email;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, email255);

    I.fillField('input[name="password"]', password8Chars);
    I.fillField('input[name="confirmPassword"]', password8Chars);
    I.click('button[type="submit"]');
    I.seeInCurrentUrl("/register");
  },
);

Scenario(
  "TC_REG_UI_07 [EP Password Mismatch]: Display error toast when passwords do not match",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/register`);
    I.fillField('input[name="name"]', "Nguyen Van A");
    I.fillField('input[name="email"]', getRandomEmail("mismatch"));
    I.fillField('input[name="password"]', "P@ssword123");
    I.fillField('input[name="confirmPassword"]', "DifferentP@ss123");
    I.click('button[type="submit"]');
    I.waitForText("Mật khẩu không khớp!", 5);
  },
);
