/** @type {CodeceptJS.MainConfig} */
exports.config = {
  tests: './tests/e2e/*_test.js',
  output: './output',
  helpers: {
    Playwright: {
      url: 'http://localhost:5173',
      show: false,
      browser: 'chromium',
      waitForNavigation: 'domcontentloaded'
    }
  },
  include: {
    I: './steps_file.js'
  },
  name: 'e-commerce-web-fe'
};
