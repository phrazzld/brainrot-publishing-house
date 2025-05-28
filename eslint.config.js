/**
 * ESLint v9 configuration (flat config format) that extends the existing .eslintrc.json
 */
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize FlatCompat to use legacy configuration
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

// Create the config array
const config = [
  // Extend our existing configuration file
  ...compat.config({ extends: ['./.eslintrc.json'] }),

  // Add any additional config specific to flat config format here
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'build/**',
      'public/**',
      'reports/**',
      'tmp/**',
      'temp/**',
      'coverage/**',
      // Configuration files that need CommonJS require statements
      '*.cjs',
      '.prettierrc.cjs',
      'jest.config.cjs',
      'jest.config.esm.cjs',
      'jest.setup.cjs',
      'jest-babel-transformer.cjs',
      'jest-esm-transformer.cjs',
      // Scripts still being actively developed
      'scripts/debug/**',
      'scripts/test-utils/**',
      'scripts/asset-migration/upload-audio-placeholders.js',
      // Complex scripts that will be refactored in future tasks
      'scripts/blob-reorganizer/**',
      'scripts/benchmark-downloads.ts',
      'scripts/migrateFullAudiobooks.ts', // Will be refactored in T036
      // Migration scripts with console.log statements (to be fixed in T051)
      'scripts/migrate*.ts',
      'scripts/test*.ts',
      'scripts/verify*.ts',
      'scripts/audit*.ts',
      'scripts/upload*.ts',
      // Migration logs and reports
      'migration-logs/**',
    ],
  },
];

export default config;
