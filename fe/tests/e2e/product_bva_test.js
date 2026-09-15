Feature("Product Catalog & Search EP & BVA E2E Tests (CodeceptJS)");

const baseUrl = "http://localhost:5173";

Scenario(
  "TC_PROD_UI_01 [BVA Price Min 0]: Filter products with min price boundary (0 VND)",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/products`);
    I.fillField('input[name="minPrice"]', "0");
    I.fillField('input[name="maxPrice"]', "50000000");
    I.click('button[type="submit"]');
    I.wait(2);
    I.seeElement(".product-card");
  },
);

Scenario(
  "TC_PROD_UI_02 [BVA Price Max Boundary]: Filter products with max price boundary (100,000,000 VND)",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/products`);
    I.fillField('input[name="minPrice"]', "100000");
    I.fillField('input[name="maxPrice"]', "100000000");
    I.click('button[type="submit"]');
    I.wait(2);
    I.seeElement(".product-card");
  },
);

Scenario(
  "TC_PROD_UI_03 [EP Search Keyword Clean]: Search with valid product name",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/products`);
    I.fillField('input[name="keyword"]', "Laptop");
    I.click('button[type="submit"]');
    I.wait(1);
    I.seeInCurrentUrl("keyword=Laptop");
  },
);

Scenario(
  "TC_PROD_UI_04 [EP Pagination]: Navigate through product list pages",
  ({ I }) => {
    I.amOnPage(`${baseUrl}/products?page=1`);
    I.click(".pagination-next");
    I.wait(1);
    I.seeInCurrentUrl("page=2");
  },
);
