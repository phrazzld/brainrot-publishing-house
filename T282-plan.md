# T282: Fix BlobService Tests

## Problem Analysis

The task is to resolve URL configuration issues in BlobService.test.ts to ensure proper test environment setup. After examining both the BlobService implementation and its tests, I've identified several issues:

1. The test uses TypeScript which has caused compatibility issues with ESM modules in other tests.
2. The environment variable handling for `NEXT_PUBLIC_BLOB_BASE_URL` is not consistent between tests.
3. The test does not properly clean up environment variables after tests.
4. The `File` and `Blob` constructors are not properly mocked in the TypeScript test.
5. The test does not use the simplified pattern established in the JavaScript version for mocking and assertions.

## Implementation Plan

I'll take a similar approach to what worked for the other tests:

1. Convert BlobService.test.ts to JavaScript (BlobService.test.js) to avoid TypeScript/ESM compatibility issues.
2. Properly set up and tear down environment variables in beforeEach/afterEach blocks.
3. Add proper mocks for the `File` and `Blob` constructors used by BlobService.
4. Add proper mocks for global.fetch.
5. Simplify the test structure to focus on essential functionality.
6. Ensure proper cleanup of environment state between tests.

## Success Criteria

- The test should pass without any URL configuration issues.
- All functions of BlobService should be properly tested.
- Environment variables should be properly managed during tests.
- The test should use the established patterns for mocking and assertions.
- The test should work in both development and CI environments.

## Risks and Mitigation

- **Risk**: TypeScript conversion might lose type information.
  **Mitigation**: Focus on asserting behavior rather than types, ensure all function calls have the right parameters.

- **Risk**: Environment variable handling might differ between environments.
  **Mitigation**: Add explicit setup and teardown of environment variables in the test.

- **Risk**: URL tests might be brittle if they depend on specific URL formats.
  **Mitigation**: Test for the essential URL structure rather than exact string matching where appropriate.