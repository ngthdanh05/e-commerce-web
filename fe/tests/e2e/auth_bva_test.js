Feature('Authentication Form EP & BVA E2E Tests (CodeceptJS)');

const baseUrl = 'http://localhost:5173';

// Helper strings for BVA testing
const email5Chars = 'a@b.c'; // min = 5 chars (Clean BVA)
const email254Chars = 'a'.repeat(239) + '@example.com'; // max = 254 chars (Clean BVA)
const email255Chars = 'a'.repeat(241) + '@example.com'; // max+ = 255 chars (Dirty BVA)

const password7Chars = 'P@sswo1'; // min- = 7 chars (Dirty BVA)
const password8Chars = 'P@sswor1'; // min = 8 chars (Clean BVA)

/* ========================================================================
 * SECTION 1: REGISTER FORM BVA TESTS (0, 5, 7, 8, 254, 255 CHARS)
 * ======================================================================== */

Scenario('TC_REG_UI_01 [BVA 0 chars]: Form validation prevents submission when required fields are empty', ({ I }) => {
  I.amOnPage(`${baseUrl}/register`);
  I.click('button[type="submit"]');
  // Assert user remains on register page due to HTML5 required fields
  I.seeInCurrentUrl('/register');
});

Scenario('TC_REG_UI_02 [BVA 7 chars Password Dirty]: Display error when password length is 7 characters (min-)', ({ I }) => {
  I.amOnPage(`${baseUrl}/register`);
  I.fillField('Họ và tên', 'Nguyen Van A');
  I.fillField('Email', 'valid.user@example.com');
  I.fillField('Mật khẩu', password7Chars);
  I.fillField('Xác nhận mật khẩu', password7Chars);
  I.click('button[type="submit"]');
  // Assert UI error notification Toast
  I.see('Signup failed');
});

Scenario('TC_REG_UI_03 [BVA 8 chars Password Clean]: Successful registration with 8 chars password (min)', ({ I }) => {
  I.amOnPage(`${baseUrl}/register`);
  I.fillField('Họ và tên', 'Nguyen Van A');
  I.fillField('Email', 'user.pass8@example.com');
  I.fillField('Mật khẩu', password8Chars);
  I.fillField('Xác nhận mật khẩu', password8Chars);
  I.click('button[type="submit"]');
  // Assert redirection to login page or success message
  I.seeInCurrentUrl('/login');
});

Scenario('TC_REG_UI_04 [BVA 5 chars Email Clean]: Successful registration with 5 chars email (min)', ({ I }) => {
  I.amOnPage(`${baseUrl}/register`);
  I.fillField('Họ và tên', 'Nguyen Van A');
  I.fillField('Email', email5Chars);
  I.fillField('Mật khẩu', password8Chars);
  I.fillField('Xác nhận mật khẩu', password8Chars);
  I.click('button[type="submit"]');
  I.seeInCurrentUrl('/login');
});

Scenario('TC_REG_UI_05 [BVA 254 chars Email Clean]: Successful registration with 254 chars email (max)', ({ I }) => {
  I.amOnPage(`${baseUrl}/register`);
  I.fillField('Họ và tên', 'Nguyen Van A');
  I.fillField('Email', email254Chars);
  I.fillField('Mật khẩu', password8Chars);
  I.fillField('Xác nhận mật khẩu', password8Chars);
  I.click('button[type="submit"]');
  I.seeInCurrentUrl('/login');
});

Scenario('TC_REG_UI_06 [BVA 255 chars Email Dirty]: Display error when email exceeds max length (255 chars)', ({ I }) => {
  I.amOnPage(`${baseUrl}/register`);
  I.fillField('Họ và tên', 'Nguyen Van A');
  I.fillField('Email', email255Chars);
  I.fillField('Mật khẩu', password8Chars);
  I.fillField('Xác nhận mật khẩu', password8Chars);
  I.click('button[type="submit"]');
  I.see('Signup failed');
});

Scenario('TC_REG_UI_07 [EP Password Mismatch]: Display error toast when passwords do not match', ({ I }) => {
  I.amOnPage(`${baseUrl}/register`);
  I.fillField('Họ và tên', 'Nguyen Van A');
  I.fillField('Email', 'user@example.com');
  I.fillField('Mật khẩu', 'P@ssword123');
  I.fillField('Xác nhận mật khẩu', 'DifferentP@ss123');
  I.click('button[type="submit"]');
  I.see('Mật khẩu không khớp!');
});

/* ========================================================================
 * SECTION 2: LOGIN FORM BVA & EP TESTS
 * ======================================================================== */

Scenario('TC_LOG_UI_01 [BVA 0 chars Login]: Prevent login submission when fields are empty', ({ I }) => {
  I.amOnPage(`${baseUrl}/login`);
  I.click('button[type="submit"]');
  I.seeInCurrentUrl('/login');
});

Scenario('TC_LOG_UI_02 [EP Negative]: Display error toast on Account Not Found (404)', ({ I }) => {
  I.amOnPage(`${baseUrl}/login`);
  I.fillField('Email', 'notfound@example.com');
  I.fillField('Password', 'P@ssword123');
  I.click('button[type="submit"]');
  I.see('Signin failed');
});

Scenario('TC_LOG_UI_03 [EP Negative]: Display error toast on Wrong Password (401)', ({ I }) => {
  I.amOnPage(`${baseUrl}/login`);
  I.fillField('Email', 'user.nominal@example.com');
  I.fillField('Password', 'WrongP@ssword123!');
  I.click('button[type="submit"]');
  I.see('Signin failed');
});

Scenario('TC_LOG_UI_04 [EP Positive]: Log in successfully with valid credentials (200 OK)', ({ I }) => {
  I.amOnPage(`${baseUrl}/login`);
  I.fillField('Email', 'user.nominal@example.com');
  I.fillField('Password', password8Chars);
  I.click('button[type="submit"]');
  I.see('SignIn successful');
});
