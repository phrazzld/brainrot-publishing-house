# TypeScript Module Resolution Guide

## Overview

This document describes the proper patterns for module imports in our codebase to ensure consistent TypeScript module resolution.

## Module Resolution Configuration

In our tsconfig.json, we use the following module resolution settings:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "allowImportingTsExtensions": false
  }
}
```

With these settings, TypeScript requires explicit file extensions in import statements for ESM imports.

## Import Patterns

### Correct Import Patterns

1. **Internal modules with explicit .js extension:**

```typescript
import { someFunction } from '../../utils/helpers.js';
import { SomeType } from '../types/interfaces.js';
```

2. **External packages (no extension needed):**

```typescript
import { useEffect, useState } from 'react';

import { del, put } from '@vercel/blob';
```

3. **Path aliased imports:**

```typescript
import { logger } from '@/utils/logger.js';
```

### Common Issues and Solutions

1. **Missing .js extension**

Incorrect:

```typescript
import { helper } from './helpers';
```

Correct:

```typescript
import { helper } from './helpers.js';
```

2. **Using .ts extension**

Incorrect:

```typescript
import { helper } from './helpers.ts';
```

Correct:

```typescript
import { helper } from './helpers.js';
```

3. **Module Not Found errors**

If you see errors like "Cannot find module '../../utils/helper.js'", check:

- The file exists at the specified path
- The import statement uses the correct casing
- The file extension is included in the import

## Jest Configuration

For Jest tests, we need to ensure that module resolution is consistent with TypeScript. This means:

1. All imports should use explicit .js extensions
2. All mocked modules should also reference the .js extension:

```typescript
// Correct mocking with .js extension
jest.mock('../../utils/services/BlobService.js', () => ({
  blobService: {
    getUrlForPath: jest.fn(),
  },
}));
```

## Type Compatibility with External Modules

Sometimes external modules have type definitions that don't align perfectly with our code. In these cases:

1. Use interfaces to define the expected shape of the external module's objects
2. Use type assertions carefully to bridge the gap between types
3. Prefer explicit type definitions over `any` or `unknown` types
4. Use `ArrayBufferLike` instead of `ArrayBuffer` for broader compatibility

## Best Practices

1. Always include the `.js` extension in imports of local files
2. Group imports logically:
   - Node.js built-in modules
   - External dependencies
   - Internal modules using path aliases
   - Internal modules using relative paths
3. Use explicit types for parameters and return values
4. Avoid `any` and `unknown` types when possible
5. Use interfaces to define the shape of complex objects
