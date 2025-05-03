# Linting Issues

This document catalogs the linting issues found in the codebase that need to be addressed. These should be fixed in a separate PR.

## Summary

Total issues: ~795 (113 errors, 682 warnings)

## Categories of Issues

### Error Categories

1. **Unused Variables and Imports** (~40 errors)

   - Example: `'screen' is defined but never used`
   - Example: `'container' is assigned a value but never used`
   - Example: `'path' is defined but never used`
   - Fix: Add underscore prefix to unused variables or remove them

2. **TypeScript Explicit Any** (~15 errors)

   - Example: `Unexpected any. Specify a different type`
   - Fix: Replace with proper types

3. **Require-style Imports** (~15 errors)

   - Example: `A 'require()' style import is forbidden`
   - Fix: Replace with ES Module imports when possible or add exceptions for specific config files

4. **Non-null Assertions** (~5 errors)

   - Example: `Forbidden non-null assertion`
   - Fix: Proper null checking or type guards

5. **Module Assignment** (~3 errors)
   - Example: `Do not assign to the variable 'module'`
   - Fix: Use ES Module exports or find alternative approaches

### Warning Categories

1. **Console Statements** (~300 warnings)

   - Example: `Unexpected console statement. Only these console methods are allowed: warn, error`
   - Fix: Replace with proper logging

2. **Complexity** (~15 warnings)

   - Example: `Function 'generateBlobUrl' has a complexity of 14. Maximum allowed is 10`
   - Example: `Async function 'main' has a complexity of 15. Maximum allowed is 10`
   - Fix: Refactor complex functions into smaller functions

3. **Nested Callbacks** (~10 warnings)

   - Example: `Too many nested callbacks (4). Maximum allowed is 3`
   - Fix: Refactor to use async/await or break into separate functions

4. **Max Depth** (~5 warnings)

   - Example: `Blocks are nested too deeply (5). Maximum allowed is 4`
   - Fix: Extract nested logic into separate functions

5. **File Length** (~5 warnings)
   - Example: `File has too many lines (949). Maximum allowed is 500`
   - Fix: Split large files into multiple modules

## Files with Most Issues

1. **Test Files**

   - `__tests__/scripts/*.test.ts`
   - `__tests__/utils/*.test.ts`
   - Fix: Add proper types, remove unused variables

2. **Configuration Files**

   - `jest.setup.cjs`
   - `.prettierrc.cjs`
   - Fix: Add exceptions for config files or update to ES modules

3. **Utility Files**

   - `utils/getBlobUrl.ts`
   - `utils/downloadFromSpaces.ts`
   - Fix: Remove console.log, reduce complexity, add proper types

4. **Scripts**
   - `scripts/verifyBlobStorage.ts`
   - `scripts/verifyDigitalOceanAccess.ts`
   - Fix: Remove console.log, reduce complexity, add proper types

## Recommended Approach

1. Create a separate PR to fix these issues
2. Prioritize fixing errors before warnings
3. Group fixes by category or by file, not mixing different types of fixes
4. Consider adding more detailed ESLint configuration to handle specific cases
5. Add more comprehensive Jest environment configuration for test files
