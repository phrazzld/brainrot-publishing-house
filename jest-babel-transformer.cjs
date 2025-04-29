// Custom Jest transformer to handle React components
const babelJest = require('babel-jest').default;

// Create a Babel transformer with specific configuration for React 19
module.exports = babelJest.createTransformer({
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  babelrc: false,
  configFile: false,
});