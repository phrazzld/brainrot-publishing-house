// Custom Jest transformer to handle React components
// This file is only used by Jest and not detected by Next.js/Turbopack
const babelJest = require('babel-jest').default;

// Create a Babel transformer with specific configuration for React 19
module.exports = babelJest.createTransformer({
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' },
        modules: 'commonjs', // Force modules to commonjs for Jest compatibility
      },
    ],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  babelrc: false,
  configFile: false,
});
