import { createDefaultPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  preset: "ts-jest",
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
  testMatch: ["**/*.test.ts", "**/*.spec.ts"],
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  moduleNameMapper: {
    "^lib/(.*)$": "<rootDir>/src/lib/$1",
    "^controllers/(.*)$": "<rootDir>/src/controllers/$1",
    "^middleware/(.*)$": "<rootDir>/src/middleware/$1",
    "^routes/(.*)$": "<rootDir>/src/routes/$1",
    "^models/(.*)$": "<rootDir>/src/models/$1",
    "^config/(.*)$": "<rootDir>/src/config/$1",
    "^utils/(.*)$": "<rootDir>/src/utils/$1",
    "^services/(.*)$": "<rootDir>/src/services/$1",
    "^schemas/(.*)$": "<rootDir>/src/schemas/$1", // Thêm dòng này
  },
};
