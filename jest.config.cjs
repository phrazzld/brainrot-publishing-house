/**
 * Jest configuration for Next.js and React 19
 * CommonJS format for better compatibility with Jest
 */

module.exports = {
  // Use JSDOM test environment for browser-like environment
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost',
    customExportConditions: [''],
  },

  // File patterns
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js|jsx)',
    '**/__tests__/**/*.test.tsx',
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.jsx',
  ],

  // File transformations
  transform: {
    // Use custom babel transformer for React components (TSX files)
    '^.+\\.tsx$': '<rootDir>/jest-babel-transformer.cjs',
    // Use custom ESM transformer for script files, utils/paths.ts, security modules, security test files, config tests, integration tests, API tests, dependency tests, and testutils
    '(scripts/.*|utils/paths|utils/security/.*|__tests__/utils/security/.*|__tests__/config/.*|__tests__/integration/.*|__tests__/api/.*|__tests__/dependencies/.*|__tests__/__testutils__/.*)\\.ts$':
      '<rootDir>/jest-esm-transformer.cjs',
    // Use ts-jest for all other TypeScript files
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        useESM: true,
        extensionsToTreatAsEsm: ['.ts'],
      },
    ],
    // Use babel-jest for JavaScript files
    '^.+\\.(js|jsx|mjs)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
        ],
      },
    ],
  },

  // Ignore patterns - transform certain node_modules that use ESM
  transformIgnorePatterns: [
    '/node_modules/(?!(@vercel/blob|react|react-dom|wavesurfer.js|next|process|dotenv)/)',
  ],

  // Module name mapping for node: prefixed imports
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/$1',

    // Handle node: prefixed imports
    '^node:(.*)$': '$1',

    // Handle CSS imports (with CSS modules)
    '\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',

    // Handle CSS imports (without CSS modules)
    '\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',

    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // Handle ESM modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],

  // ESM module support
  resolver: 'jest-ts-webcompat-resolver',
};
