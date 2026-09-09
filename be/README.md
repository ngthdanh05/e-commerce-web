# Clone & Run code

- git clone https://github.com/DanhKhongUs/e-commerce-web.git

- npm install

- npm run code

# Run test coverage

- npm run test:coverage

# Single file run jest coverage

- for auth: npx jest src/tests/auth.test.ts --coverage --collectCoverageFrom="src/controllers/user.controller.ts"
- for cart: npx jest src/tests/cart.test.ts --coverage --collectCoverageFrom="src/controllers/cart.controller.ts"
- for product: npx jest src/tests/product.test.ts --coverage --collectCoverageFrom="src/controllers/product.controller.ts"
- for checkout: npx jest src/tests/checkout.test.ts --coverage --collectCoverageFrom="src/controllers/checkout.controller.ts"
- for order: npx jest src/tests/order.test.ts --coverage --collectCoverageFrom="src/controllers/order.controller.ts"
