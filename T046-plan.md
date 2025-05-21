# T046: Update asset imports and logger initialization across all scripts

## Problem Statement

Currently, our codebase suffers from inconsistent patterns for:

1. **Logger initialization:** Scripts use various approaches to import and initialize loggers, leading to inconsistent context information, variable naming, and error handling.
2. **Asset service imports:** Scripts import asset services from different locations with different patterns, making it difficult to update service implementations or add new functionality.

These inconsistencies reduce code maintainability and make it harder to track issues through logs. This task aims to standardize these patterns across all scripts.

## Design Goals

1. Create a consistent pattern for initializing loggers across all scripts
2. Provide standardized context information for each script
3. Ensure proper error handling during asset service initialization
4. Make it easy to update service implementations in the future
5. Create a scalable approach that can be easily applied to new scripts

## Implementation Approach

### 1. Standardized Logger Initialization

#### Current Patterns Found

- Direct import: `import { logger } from '../utils/logger'`
- Custom named import: `import { logger as rootLogger } from '../utils/logger'`
- Various child logger creation: 
  - `logger.child({ script: '...' })`
  - `rootLogger.child({ module: '...' })`
  - Inconsistent context objects

#### Standardized Pattern

```typescript
import { logger as rootLogger } from '../utils/logger';

// Create script-specific logger
const logger = rootLogger.child({
  module: 'script-name',
  scriptId: 'T046', // Optional: task ID for trackability
  context: 'migration', // Optional: context category (migration, verification, audit, etc.)
});
```

Key improvements:
- Consistent naming: `rootLogger` for the import, `logger` for the instance
- Standard context structure with:
  - `module`: Script name for identification
  - Optional tags for filtering and categorization
- Consistent log structure

### 2. Standardized Asset Service Imports

#### Current Patterns Found

- Direct service import: `import { blobService } from '../utils/services/BlobService'`
- Barrel import: `import { blobService } from '../utils/services'`
- Factory import: `import { createAssetService } from '../utils/services/AssetServiceFactory'`
- Inconsistent error handling

#### Standardized Pattern

```typescript
import { logger as rootLogger } from '../utils/logger';
import { 
  assetService, 
  blobService, 
  AssetServiceFactory 
} from '../utils/services';

// Create script-specific logger
const logger = rootLogger.child({ module: 'script-name' });

// For scripts that need custom asset service configuration
try {
  const customAssetService = AssetServiceFactory.createAssetService({
    logger,
    config: {
      // Custom configuration
    }
  });
  
  // Use the service
} catch (error) {
  logger.error({
    msg: 'Failed to initialize asset service',
    error: error instanceof Error ? error.message : String(error),
    operation: 'initialize_services'
  });
  process.exit(1);
}
```

Key improvements:
- Consistent import paths using barrel exports
- Standard error handling pattern
- Better integration with logging
- Easy configuration with the factory
- Clear and consistent naming

## Implementation Plan

1. **Create utility for generating consistent relative paths**
   - Will help with properly importing from relative paths in deeply nested scripts

2. **Update logger initialization across scripts**
   - Start with migration scripts in the scripts/ directory
   - Move to verification scripts
   - Update utility scripts
   - Ensure consistent context objects

3. **Update asset service imports**
   - Standardize import paths
   - Add proper error handling
   - Ensure consistent configuration

4. **Create examples for new scripts**
   - Provide template examples for different script types

## Example Implementation

### Before:

```typescript
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';

import { logger } from '../utils/logger';
import { blobService } from '../utils/services/BlobService';

dotenv.config({ path: '.env.local' });

console.log('Starting script...');

async function main() {
  try {
    const result = await blobService.listFiles();
    console.log(`Found ${result.blobs.length} files`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
```

### After:

```typescript
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

import { logger as rootLogger } from '../utils/logger';
import { blobService } from '../utils/services';

// Create script-specific logger
const logger = rootLogger.child({ 
  module: 'example-script',
  context: 'example'
});

dotenv.config({ path: '.env.local' });

logger.info({ 
  msg: 'Starting script',
  operation: 'start'
});

async function main() {
  try {
    const result = await blobService.listFiles();
    logger.info({ 
      msg: `Found ${result.blobs.length} files`,
      count: result.blobs.length,
      operation: 'list_files'
    });
  } catch (error) {
    logger.error({ 
      msg: 'Failed to list files',
      error: error instanceof Error ? error.message : String(error),
      operation: 'list_files'
    });
    process.exit(1);
  }
}

main();
```

## Testing Strategy

1. Ensure scripts still function correctly after updates
2. Verify logs are properly formatted and contain the expected context
3. Test error handling scenarios
4. Create a test script to validate functionality across different service types

## Risk Mitigation

1. Apply changes incrementally, starting with simpler scripts
2. Create backups of original scripts before modification
3. Test each script after changes
4. Monitor logs to ensure consistent formatting

## Rollout Plan

1. Update most critical scripts first (migration, verification)
2. Create PR with changes for review
3. Deploy to development environment for testing
4. Update documentation to reflect new patterns
5. Create examples for future script development