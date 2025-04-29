# T280: Fix ESM Module Import Issues in Tests

## Task Overview
Update the Jest configuration to properly handle ESM modules, especially in scripts like cleanupLocalAssets.test.ts that use import.meta.

## Analysis

This task is about making the Jest testing infrastructure properly handle ESM (ECMAScript modules) which are used in the project. The specific issue is with tests that use `import.meta`, which is an ESM-specific feature not available in CommonJS modules.

The project appears to be using ESM modules (as indicated by "type": "module" in package.json), but Jest traditionally runs in a CommonJS environment. This mismatch causes issues with certain module features like `import.meta.url`.

### Key files to investigate:
1. `jest.config.cjs` - The main Jest configuration file
2. `__tests__/scripts/cleanupLocalAssets.test.ts` - An example of a test that's having ESM import issues
3. `scripts/cleanupLocalAssets.ts` - The corresponding implementation file
4. `package.json` - Contains module type configuration

### Current setup and issues:
- The project is configured to use ESM modules
- Jest is configured as CommonJS (indicated by the .cjs extension)
- Tests that use ESM-specific features like import.meta.url are failing

## Implementation Plan

1. **Examine the failing test file**
   - Check how `cleanupLocalAssets.test.ts` uses import.meta and identify the specific errors

2. **Update Jest configuration**
   - Modify `jest.config.cjs` to properly handle ESM modules
   - Make sure `transformIgnorePatterns` handles ESM modules in node_modules correctly
   - Configure `extensionsToTreatAsEsm` to include .ts and .tsx files
   - Set up proper module mapping for ESM modules

3. **Create or update module transformer**
   - Create or update Jest transformers to properly handle ESM modules
   - Ensure `import.meta` is properly polyfilled in the test environment

4. **Update jest.setup.cjs**
   - Add any necessary polyfills for ESM features in the Jest setup file
   - Ensure `import.meta.url` is properly mocked

5. **Test the changes**
   - Run the failing tests to verify they now pass
   - Make sure no other tests were broken by the changes

## Implementation Approach
1. First, isolate and focus on fixing the `cleanupLocalAssets.test.ts` file
2. Make targeted changes to the Jest configuration to support ESM modules
3. Create necessary polyfills for ESM features
4. Test and verify the changes fix the issues
5. Apply the same approach to any other tests with similar issues

## Success Criteria
- The `cleanupLocalAssets.test.ts` test runs successfully
- All other tests continue to pass
- The Jest configuration properly handles ESM modules across the codebase
- No new errors appear related to module handling