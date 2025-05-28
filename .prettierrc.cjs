/**
 * Prettier configuration for brainrot-publishing-house
 *
 * This configuration aims to:
 * 1. Maintain a consistent code style across the project
 * 2. Work well with ESLint and Next.js conventions
 * 3. Provide clear, readable code that follows best practices
 */

// Explicitly require the plugin in CJS format
const sortImports = require('@trivago/prettier-plugin-sort-imports');

module.exports = {
  // Basic formatting
  printWidth: 100, // Line length where Prettier will try to wrap
  tabWidth: 2, // Number of spaces per indentation level
  useTabs: false, // Use spaces instead of tabs
  semi: true, // Add semicolons at the end of statements
  singleQuote: true, // Use single quotes instead of double quotes

  // JSX specific
  jsxSingleQuote: false, // Use double quotes in JSX
  bracketSameLine: false, // Put the closing bracket of JSX elements on a new line

  // Object formatting
  trailingComma: 'all', // Include trailing commas where valid in ES5 (objects, arrays, etc.)
  bracketSpacing: true, // Put spaces between brackets in object literals

  // Special parser options
  arrowParens: 'always', // Always include parentheses around a sole arrow function parameter
  quoteProps: 'as-needed', // Only add quotes around object properties where required

  // End of file handling
  endOfLine: 'lf', // Line feed only for consistent line endings

  // Prose wrapping for Markdown
  proseWrap: 'preserve', // Preserve existing line wrapping in prose

  // Import order configuration (requires @trivago/prettier-plugin-sort-imports)
  importOrder: [
    '^(react|next)(/.*)?$', // React and Next.js imports first
    '<THIRD_PARTY_MODULES>', // Then other third-party modules
    '^@/(.*)$', // Then local aliases
    '^[./]', // Then relative imports
  ],
  importOrderSeparation: true, // Add newline between import groups
  importOrderSortSpecifiers: true, // Sort named imports within import statements
  importOrderGroupNamespaceSpecifiers: true, // Group namespace imports

  // Configure overrides for specific file types
  overrides: [
    {
      files: '*.{json,md}',
      options: {
        tabWidth: 2,
      },
    },
    {
      files: '*.{ts,tsx}',
      options: {
        parser: 'typescript',
      },
    },
  ],

  // Explicitly define the plugins to use
  plugins: [sortImports],
};
