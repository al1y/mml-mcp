export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: [
    "**/tests/**/*.test.js",
    "**/tests/**/*.test.ts",
    "**/tests/**/*.spec.js",
    "**/tests/**/*.spec.ts",
  ],
  collectCoverageFrom: [
    "packages/*/src/**/*.{js,ts}",
    "apps/*/src/**/*.{js,ts}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/build/**",
    "!**/dist/**",
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testTimeout: 30000, // 30 seconds for integration tests
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!((@modelcontextprotocol|@mml-io)/.*|three|jsdom)/)",
  ],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
}
