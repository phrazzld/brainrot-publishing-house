// Custom Jest transformer for ESM modules
const babelJest = require('babel-jest').default;

// Create a Babel transformer specific for ESM modules
module.exports = babelJest.createTransformer({
  presets: [
    ['@babel/preset-env', { 
      targets: { node: 'current' },
      modules: false // Preserve ESM modules
    }],
    '@babel/preset-typescript',
  ],
  plugins: [
    // Plugin to handle import.meta.url
    {
      visitor: {
        MetaProperty(path) {
          // Replace import.meta.url with a file path
          if (
            path.node.meta.name === 'import' && 
            path.node.property.name === 'meta'
          ) {
            const urlPropertyPath = path.parentPath;
            if (
              urlPropertyPath.isMemberExpression() && 
              urlPropertyPath.node.property.name === 'url'
            ) {
              urlPropertyPath.replaceWithSourceString(
                "'file://' + __filename"
              );
            }
          }
        }
      }
    }
  ],
  babelrc: false,
  configFile: false,
});