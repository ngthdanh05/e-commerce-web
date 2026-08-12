export const config: CodeceptJS.MainConfig = {
  tests: "./tests/*_test.ts",
  output: "./output",
  helpers: {
    Playwright: {
      browser: "chromium",
      url: "http://localhost:5173",
      show: true,
    },
  },
  include: {
    I: "./steps_file.ts",
  },
  noGlobals: false,
  plugins: {
    // ⚠️ Sửa plugin screenshotOnFail thành screenshot để hết cảnh báo deprecated
    screenshot: {
      enabled: true,
      event: "step",
    },
  },
  name: "be",
  require: ["ts-node/register"],
};
