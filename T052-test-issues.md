# T053: Fix Linting Issues in Test Files

## Issues identified:

1. Require-style imports in test utilities:
   - `__tests__/__testutils__/assertions/index.ts`
   - `__tests__/__testutils__/fixtures/books.ts`
   - `__tests__/__testutils__/fixtures/index.ts`
   - `__tests__/__testutils__/fixtures/responses.ts`

2. Unused variables not prefixed with underscore:
   - `Book` and `Chapter` in `__tests__/__testutils__/fixtures/books.ts`
   - `createTextResponse` in `__tests__/utils/fetchTextWithFallback.simple.test.ts`
   - `createTextResponse` in `__tests__/utils/fetchTextWithFallback.test.js`

## Plan to address these issues:

1. Update require-style imports to use ES module imports
2. Prefix unused variables with underscore
3. Update test utilities to use proper TypeScript patterns

This will be tracked as a separate task to keep our focus on the current task (T052).