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

export default [
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
    ],
  },
];
