# Standardized Import Patterns

This document defines the standardized import patterns for the brainrot-publishing-house project.

## Overview

This project uses ES modules (`"type": "module"` in package.json) with TypeScript. All imports should follow these standardized patterns for consistency and reliability across development, test, and production environments.

## Node.js Built-in Modules

Always use the `node:` prefix for Node.js built-in modules:

### File System Operations
```typescript
// ✅ CORRECT
import { readFile, writeFile, existsSync } from 'node:fs';
import { readFile as readFileAsync, writeFile as writeFileAsync } from 'node:fs/promises';

// ❌ INCORRECT
import fs from 'fs';
import * as fs from 'fs';
import { readFile } from 'fs';
```

### Path Operations
```typescript
// ✅ CORRECT
import path from 'node:path';

// ❌ INCORRECT
import * as path from 'path';
import { join, resolve } from 'path';
```

### URL Operations
```typescript
// ✅ CORRECT
import { fileURLToPath, pathToFileURL } from 'node:url';

// ❌ INCORRECT
import { fileURLToPath } from 'url';
```

### Process and OS
```typescript
// ✅ CORRECT
import { exit } from 'node:process';
import { platform, arch } from 'node:os';

// ❌ INCORRECT
import process from 'process';
import * as os from 'os';
```

## Path Resolution

Use the standardized path utilities from `utils/paths.ts`:

```typescript
// ✅ CORRECT
import { getDirname, resolveFromModule, isMainModule } from '../utils/paths.js';

// Get current directory (equivalent to __dirname)
const __dirname = getDirname(import.meta.url);

// Resolve relative to current module
const configPath = resolveFromModule(import.meta.url, '../config.json');

// Check if being run directly
if (isMainModule(import.meta.url)) {
  // Main script logic
}

// ❌ INCORRECT - Direct import.meta.url manipulation
const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (import.meta.url === `file://${process.argv[1]}`) {
  // This is fragile and doesn't work in all environments
}
```

## External Libraries

### Vercel Blob
```typescript
// ✅ CORRECT
import { put, list, del } from '@vercel/blob';
import type { ListBlobResult, PutBlobResult } from '@vercel/blob';

// ❌ INCORRECT
import * as blob from '@vercel/blob';
```

### Dotenv
```typescript
// ✅ CORRECT
import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.resolve(process.cwd(), '.env.local') });

// ❌ INCORRECT
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
```

### Logger (Internal)
```typescript
// ✅ CORRECT
import { createScriptLogger } from '../utils/createScriptLogger.js';

const logger = createScriptLogger({
  taskId: 'T047',
  context: 'migration'
});

// ❌ INCORRECT
import { logger as rootLogger } from '../utils/logger.js';
const logger = rootLogger.child({ script: 'my-script' });
```

## Internal Modules

### Relative Imports
```typescript
// ✅ CORRECT - Always include .js extension for local files
import { someUtil } from '../utils/helper.js';
import translations from '../translations/index.js';

// ❌ INCORRECT - Missing .js extension
import { someUtil } from '../utils/helper';
import translations from '../translations';
```

### Same-Directory Imports
```typescript
// ✅ CORRECT
import { helperFunction } from './helper.js';

// ❌ INCORRECT
import { helperFunction } from './helper';
```

## Script Structure Template

Here's a standardized script template:

```typescript
#!/usr/bin/env tsx
/**
 * Script description
 * 
 * Usage: tsx scripts/my-script.ts [options]
 */

// Node.js built-ins with node: prefix
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

// External libraries
import { config } from 'dotenv';

// Internal utilities (with .js extensions)
import { createScriptLogger } from '../utils/createScriptLogger.js';
import { getDirname, resolveFromModule, isMainModule } from '../utils/paths.js';
import translations from '../translations/index.js';

// Initialize environment
config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize logger
const logger = createScriptLogger({
  scriptName: 'my-script',
  context: 'utility'
});

// Get current directory and resolve paths
const __dirname = getDirname(import.meta.url);
const configPath = resolveFromModule(import.meta.url, '../config.json');

// Main script logic
async function main(): Promise<void> {
  try {
    logger.info({ 
      msg: 'Starting script execution',
      operation: 'start'
    });

    // Script implementation here

    logger.info({ 
      msg: 'Script completed successfully',
      operation: 'complete'
    });
  } catch (error) {
    logger.error({ 
      msg: 'Script failed',
      operation: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// Execute if run directly
if (isMainModule(import.meta.url)) {
  main();
}

// Export for testing/importing
export { main };
export default main;
```

## Testing Imports

In test files:

```typescript
// ✅ CORRECT
import { describe, it, expect } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Import the module under test (with .js extension)
import { myFunction } from '../../utils/helper.js';

// ❌ INCORRECT
import * as jest from '@jest/globals';
import fs from 'fs';
import { myFunction } from '../../utils/helper';
```

## Migration Checklist

When updating existing scripts:

1. ✅ Add `node:` prefix to all Node.js built-in imports
2. ✅ Use standardized path utilities from `utils/paths.ts`
3. ✅ Add `.js` extensions to all relative imports
4. ✅ Use standardized logger initialization
5. ✅ Follow the script template structure
6. ✅ Update dotenv configuration pattern
7. ✅ Use consistent import styles (named imports preferred)
8. ✅ Test the script in development environment
9. ✅ Verify the script works with Jest tests

## ESLint Rules

These patterns are enforced by our ESLint configuration:

- `@typescript-eslint/prefer-namespace-keyword`: Prefer `namespace` over `module`
- `import/no-nodejs-modules`: Enforces `node:` prefix for Node.js built-ins
- `import/extensions`: Requires `.js` extensions for local imports in ESM

## Troubleshooting

### Common Issues

1. **Module not found errors**: Ensure `.js` extensions are included for relative imports
2. **import.meta.url issues in tests**: Use the standardized path utilities instead
3. **CommonJS/ESM mixing**: Stick to ESM patterns consistently
4. **Path resolution failures**: Use `resolveFromModule` instead of manual path manipulation

### Environment-Specific Behavior

- **Development**: Scripts run via `tsx` with full TypeScript support
- **Production**: Code is transpiled to JavaScript, paths must resolve correctly
- **Testing**: Jest transforms modules, import.meta.url is handled by custom transformer