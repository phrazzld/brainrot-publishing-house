// Custom Jest transformer for ESM modules
const babelJest = require('babel-jest').default;

// Create a Babel transformer specific for ESM modules
module.exports = babelJest.createTransformer({
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' },
        modules: 'auto', // Let Babel decide based on environment
      },
    ],
    '@babel/preset-typescript',
  ],
  plugins: [
    // Plugin to handle import.meta.url more robustly
    {
      visitor: {
        MetaProperty(path) {
          // Replace import.meta.url with a proper file URL
          if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
            const urlPropertyPath = path.parentPath;
            if (
              urlPropertyPath.isMemberExpression() &&
              urlPropertyPath.node.property.name === 'url'
            ) {
              // Create a proper file URL that works with our path utilities
              urlPropertyPath.replaceWithSourceString(
                `'file://' + require('path').resolve(__filename)`,
              );
            }
          }
        },
      },
    },
    // Handle node: prefixed imports
    [
      'babel-plugin-transform-import-meta',
      {
        module: 'CommonJS',
      },
    ],
  ],
  babelrc: false,
  configFile: false,
});
