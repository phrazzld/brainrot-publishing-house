/**
 * Jest configuration specifically for ESM tests
 */
const baseConfig = require('./jest.config.cjs');

module.exports = {
  ...baseConfig,
  // Use Node environment for script tests
  testEnvironment: 'node',
  // Override transformers for test files
  transform: {
    // For test files
    '^.+\\.test\\.ts$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
          '@babel/preset-typescript',
        ],
        plugins: [
          // Handle import.meta transformation
          ['babel-plugin-transform-import-meta', { module: 'ES6' }],
        ],
      },
    ],
    // For script files
    'scripts/.*\\.ts$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
          '@babel/preset-typescript',
        ],
        plugins: [
          // Handle import.meta transformation
          ['babel-plugin-transform-import-meta', { module: 'ES6' }],
        ],
      },
    ],
    // For other files
    '^.+\\.ts$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
};
