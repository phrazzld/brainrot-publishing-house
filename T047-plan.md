# T047: Fix script dependency loading and module resolution

## Problem Statement

The codebase currently suffers from inconsistent module import patterns which can lead to runtime errors, testing issues, and maintenance challenges. Specific issues include:

1. **Mixed Module Patterns**: While the project is configured with `"type": "module"` in package.json, some files use CommonJS syntax, and others use different styles of ESM imports.

2. **Inconsistent Node.js Built-in Imports**: Different approaches to importing Node.js built-in modules (e.g., `fs`, `path`) without following current best practices.

3. **import.meta.url Issues**: Various approaches to using `import.meta.url` for file path resolution, which can cause compatibility issues across different environments.

4. **Configuration Mismatches**: Multiple configuration files (tsconfig.json, jest.config.cjs) with potentially conflicting settings for module resolution.

5. **Extension Handling**: Inconsistent use of file extensions in imports (sometimes including `.js`, sometimes omitting it).

## Design Goals

1. Create consistent patterns for imports across all files
2. Ensure compatibility with both development and production environments
3. Standardize Node.js built-in module imports for better maintainability
4. Provide reliable file path resolution that works consistently
5. Maintain compatibility with the testing environment

## Implementation Approach

### 1. Standardize Module Import Syntax

**ESM Standardization**:
- Confirm project commitment to ESM with `"type": "module"` in package.json
- Use named imports where possible: `import { x } from 'y'`
- Use default imports only when necessary: `import x from 'y'`
- Avoid namespace imports (`import * as x`) unless absolutely necessary

**Node.js Built-ins**:
- Use the `node:` prefix for all Node.js built-in modules
- Use consistent import patterns for each built-in:
  ```typescript
  // CORRECT
  import { readFile, writeFile } from 'node:fs/promises';
  import path from 'node:path';
  import { fileURLToPath } from 'node:url';
  ```

### 2. Path Resolution Utility

Create a dedicated path utility that handles all file path resolution consistently:

```typescript
// src/utils/paths.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Gets the directory name of the current module
 * Works in both ESM and CommonJS environments
 */
export function getDirname(importMetaUrl: string): string {
  const __filename = fileURLToPath(importMetaUrl);
  return path.dirname(__filename);
}

/**
 * Resolves a path relative to the current module
 * Works in both ESM and CommonJS environments
 */
export function resolveFromModule(importMetaUrl: string, relativePath: string): string {
  return path.resolve(getDirname(importMetaUrl), relativePath);
}

/**
 * Check if this module is being run directly (not imported)
 */
export function isMainModule(importMetaUrl: string): boolean {
  const scriptPath = process.argv[1];
  const normalizedScriptPath = scriptPath.startsWith('file:') 
    ? scriptPath 
    : `file://${scriptPath}`;
  
  return importMetaUrl === normalizedScriptPath || 
         importMetaUrl.endsWith(scriptPath.replace(/^file:\/\//, ''));
}
```

### 3. TypeScript Configuration Updates

Update `tsconfig.json` to ensure proper ESM support:

```json
{
  "compilerOptions": {
    // ... existing settings
    "module": "NodeNext", // or "ESNext" with additional settings
    "moduleResolution": "NodeNext", // or "bundler" with proper settings
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    // ... other settings
  }
}
```

### 4. Jest Configuration Updates

Ensure Jest properly handles ESM modules:

1. Update `jest.config.cjs` to better handle ESM modules
2. Create a unified transformer approach for all TypeScript files 
3. Ensure proper handling of import.meta.url across all test environments

### 5. Implementation Plan

1. **Create Path Utilities**:
   - Implement the path resolution utility first
   - Test it thoroughly across different environments

2. **Update Scripts Systematically**:
   - Start with commonly used utility scripts
   - Update import patterns to follow new standards
   - Test each script after modifications
   - Update scripts that use import.meta.url to use the new utility

3. **Update Configuration Files**:
   - Modify tsconfig.json for better ESM support
   - Update Jest configuration for consistent module handling
   - Test the changes with a subset of scripts/tests

4. **Systematic Script Updates**:
   - Analyze the most critical scripts
   - Apply the new standards to each script
   - Test thoroughly after each update

5. **Documentation**:
   - Document the standardized approach in a README or CONTRIBUTING guide
   - Provide examples for future development

## Implementation Details

### Node.js Built-in Module Imports

For ALL Node.js built-in modules, standardize imports by:

1. Using the `node:` prefix
2. Using named or default imports (not namespace imports)
3. Being consistent with import style for each module

Example:
```typescript
// Instead of:
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Use:
import { readFile, writeFile, existsSync } from 'node:fs';
import { readFile as readFilePromise } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
```

### Path Resolution Pattern

For all scripts that need to work with local file paths:

```typescript
import { resolveFromModule, isMainModule } from '../utils/paths.js';

// Get path relative to current module
const configPath = resolveFromModule(import.meta.url, '../config.json');

// Check if being run directly
if (isMainModule(import.meta.url)) {
  // Main script execution logic
}
```

### TypeScript Configuration

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    // ... existing options
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "allowImportingTsExtensions": false,
    "esModuleInterop": true,
    // ... other options
  }
}
```

### Package.json Updates

Confirm `"type": "module"` in package.json, and ensure all scripts are using `tsx` for execution.

## Testing Strategy

1. Create a comprehensive test suite that verifies:
   - Import compatibility across different environments
   - Path resolution works correctly
   - Module loading is consistent
   - ESM features work as expected

2. Test in multiple environments:
   - Local development
   - Test runner (Jest)
   - Production-like environment

3. Create sample scripts that demonstrate the standardized patterns for future reference.

## Risk Mitigation

1. Apply changes incrementally, focusing on one module pattern at a time
2. Test thoroughly after each set of changes
3. Document any issues encountered and their resolutions
4. Focus on backward compatibility to avoid breaking existing functionality