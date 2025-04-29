// CommonJS format for Jest
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Use jsdom for browser-like environment
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true, // Moved from globals to transform config for ts-jest
      jsx: 'react-jsx', // Use React 19 JSX transform
    }],
  },
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js)',
    '**/__tests__/**/*.test.tsx',
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.js',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironmentOptions: {
    customExportConditions: [''], // For React 19 compatibility with ESM
  },
  // Removed deprecated globals section
};