/** @type {CodeceptJS.MainConfig} */
export const config = {
  tests: "./tests/e2e/*_test.js",
  output: "./output",
  helpers: {
    Playwright: {
      url: "http://localhost:5173",
      show: false,
      browser: "chromium",
      waitForNavigation: "domcontentloaded",
    },
  },

  name: "e-commerce-web-fe",
};
