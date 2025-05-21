# T045 Implementation Plan: Address Technical Debt in Test Files

## Problem Statement

Our codebase currently suffers from several issues related to test files:

1. **Inconsistent Mocking Patterns**: Different tests mock the same services in different ways, leading to duplication and potential inconsistencies.
2. **Type Safety Issues**: Many mocks use `any` or `unknown` type assertions, reducing the benefits of TypeScript's type checking.
3. **Poor Organization**: Tests are organized by directory structure rather than by functionality, making it harder to find and maintain related tests.
4. **Limited Reusability**: Test utilities and mocks are often duplicated across test files rather than being shared.
5. **Brittle Tests**: Some tests rely on implementation details, making them prone to breaking when implementation changes.

## Design Goals

1. **Type Safety**: All mocks and test utilities should be fully typed, leveraging TypeScript's type system.
2. **Consistency**: Standardize how services are mocked across the codebase.
3. **Reusability**: Create reusable mock factories and test utilities to reduce duplication.
4. **Maintainability**: Improve organization and structure to make tests easier to maintain.
5. **Backward Compatibility**: Minimize disruption to existing tests during the transition.

## Implementation Approach

### Phase 1: Foundation - Test Utilities and Mock Interfaces

1. **Create Test Utilities Directory Structure**:
   ```
   __tests__/
   └── __testutils__/
       ├── mocks/
       │   ├── services/
       │   ├── apis/
       │   └── ui/
       ├── assertions/
       ├── factories/
       └── helpers/
   ```

2. **Implement Type-Safe Service Mock Interfaces**:
   - Create typed interfaces for all mock services in `__testutils__/mocks/interfaces.ts`
   - Ensure interfaces match the real service interfaces but with jest.Mock types

3. **Implement Mock Factory Functions**:
   - Create factory functions for commonly mocked services
   - Each factory should return a properly typed mock service
   - Include default implementations for common methods

### Phase 2: Implementation - Mock Factories and Utilities

1. **Create Service Mock Factories**:
   - Implement `createMockLogger()`, `createMockBlobService()`, `createMockBlobPathService()`, `createMockVercelBlobAssetService()`
   - Each factory should return a mock that implements the correct interface

2. **Enhance Network Mock Utilities**:
   - Expand `MockResponse` to handle more scenarios
   - Create a `MockFetch` utility for easier fetch mocking

3. **Implement Type-Safe Assertion Utilities**:
   - Create utilities for common assertion patterns
   - Ensure all assertion utilities are properly typed

### Phase 3: Demonstration and Documentation

1. **Create Example Test Files**:
   - Create example tests that demonstrate the new utilities
   - Add detailed comments explaining best practices

2. **Documentation**:
   - Add comprehensive README in `__testutils__/` directory
   - Document each utility and mock factory with examples

### Phase 4: Gradual Migration (Future Work)

1. **Update High-Impact Tests**:
   - Identify critical service tests to update first
   - Convert them to use the new mock factories

2. **Reorganize Test Files**:
   - Gradually reorganize tests by functionality
   - Update imports and dependencies

## Detailed Implementation Specifications

### 1. Mock Interfaces (in `__testutils__/mocks/interfaces.ts`)

```typescript
import { jest } from '@jest/globals';
import { BlobService, UploadOptions } from '../../utils/services/BlobService';
import { BlobPathService } from '../../utils/services/BlobPathService';
import { Logger, LogData } from '../../utils/logger';
import { AssetType, AssetUrlOptions } from '../../types/assets';
import { VercelBlobAssetService } from '../../utils/services/VercelBlobAssetService';

/**
 * Type-safe mock for the Logger service
 */
export interface MockLogger extends Logger {
  info: jest.MockedFunction<Logger['info']>;
  debug: jest.MockedFunction<Logger['debug']>;
  warn: jest.MockedFunction<Logger['warn']>;
  error: jest.MockedFunction<Logger['error']>;
  child: jest.MockedFunction<Logger['child']>;
}

/**
 * Type-safe mock for the BlobService
 */
export interface MockBlobService extends Omit<BlobService, 'uploadFile'> {
  uploadFile: jest.MockedFunction<BlobService['uploadFile']>;
  uploadText: jest.MockedFunction<BlobService['uploadText']>;
  listFiles: jest.MockedFunction<BlobService['listFiles']>;
  getFileInfo: jest.MockedFunction<BlobService['getFileInfo']>;
  deleteFile: jest.MockedFunction<BlobService['deleteFile']>;
  getUrlForPath: jest.MockedFunction<BlobService['getUrlForPath']>;
  fetchText: jest.MockedFunction<BlobService['fetchText']>;
}

/**
 * Type-safe mock for the BlobPathService
 */
export interface MockBlobPathService extends BlobPathService {
  getAssetPath: jest.MockedFunction<BlobPathService['getAssetPath']>;
  getBookImagePath: jest.MockedFunction<BlobPathService['getBookImagePath']>;
  getBrainrotTextPath: jest.MockedFunction<BlobPathService['getBrainrotTextPath']>;
  getFulltextPath: jest.MockedFunction<BlobPathService['getFulltextPath']>;
  getSourceTextPath: jest.MockedFunction<BlobPathService['getSourceTextPath']>;
  getSharedImagePath: jest.MockedFunction<BlobPathService['getSharedImagePath']>;
  getSiteAssetPath: jest.MockedFunction<BlobPathService['getSiteAssetPath']>;
  getAudioPath: jest.MockedFunction<BlobPathService['getAudioPath']>;
  convertLegacyPath: jest.MockedFunction<BlobPathService['convertLegacyPath']>;
  getBookSlugFromPath: jest.MockedFunction<BlobPathService['getBookSlugFromPath']>;
}

/**
 * Type-safe mock for VercelBlobAssetService
 */
export interface MockVercelBlobAssetService extends VercelBlobAssetService {
  getAssetUrl: jest.MockedFunction<VercelBlobAssetService['getAssetUrl']>;
  assetExists: jest.MockedFunction<VercelBlobAssetService['assetExists']>;
  fetchAsset: jest.MockedFunction<VercelBlobAssetService['fetchAsset']>;
  fetchTextAsset: jest.MockedFunction<VercelBlobAssetService['fetchTextAsset']>;
  uploadAsset: jest.MockedFunction<VercelBlobAssetService['uploadAsset']>;
  deleteAsset: jest.MockedFunction<VercelBlobAssetService['deleteAsset']>;
  listAssets: jest.MockedFunction<VercelBlobAssetService['listAssets']>;
}
```

### 2. Mock Factory Functions (in `__testutils__/mocks/factories.ts`)

```typescript
import { jest } from '@jest/globals';
import { MockLogger, MockBlobService, MockBlobPathService, MockVercelBlobAssetService } from './interfaces';
import { LogData } from '../../utils/logger';

/**
 * Creates a type-safe mock Logger instance
 */
export function createMockLogger(): MockLogger {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  };
}

/**
 * Creates a type-safe mock BlobService instance
 * @param customImplementations Optional custom implementations for methods
 */
export function createMockBlobService(
  customImplementations: Partial<MockBlobService> = {}
): MockBlobService {
  return {
    uploadFile: jest.fn().mockResolvedValue({
      url: 'https://example.com/mock-file.txt',
      pathname: 'mock-file.txt',
    }),
    uploadText: jest.fn().mockResolvedValue({
      url: 'https://example.com/mock-text.txt',
      pathname: 'mock-text.txt',
    }),
    listFiles: jest.fn().mockResolvedValue({
      blobs: [],
      cursor: undefined,
    }),
    getFileInfo: jest.fn().mockResolvedValue({
      url: 'https://example.com/mock-file.txt',
      pathname: 'mock-file.txt',
      contentType: 'text/plain',
      contentLength: 100,
    }),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    getUrlForPath: jest.fn().mockImplementation((path) => `https://example.com/${path}`),
    fetchText: jest.fn().mockResolvedValue('Mock text content'),
    ...customImplementations,
  };
}

/**
 * Creates a type-safe mock BlobPathService instance
 * @param customImplementations Optional custom implementations for methods
 */
export function createMockBlobPathService(
  customImplementations: Partial<MockBlobPathService> = {}
): MockBlobPathService {
  return {
    getAssetPath: jest.fn().mockImplementation((assetType, bookSlug, assetName) => 
      `books/${bookSlug}/${assetType}/${assetName}`),
    getBookImagePath: jest.fn().mockImplementation((bookSlug, filename) => 
      `books/${bookSlug}/images/${filename}`),
    getBrainrotTextPath: jest.fn().mockImplementation((bookSlug, chapter) => 
      `books/${bookSlug}/text/brainrot/${chapter}.txt`),
    getFulltextPath: jest.fn().mockImplementation((bookSlug) => 
      `books/${bookSlug}/text/brainrot/fulltext.txt`),
    getSourceTextPath: jest.fn().mockImplementation((bookSlug, filename) => 
      `books/${bookSlug}/text/source/${filename}`),
    getSharedImagePath: jest.fn().mockImplementation((filename) => 
      `images/${filename}`),
    getSiteAssetPath: jest.fn().mockImplementation((filename) => 
      `site-assets/${filename}`),
    getAudioPath: jest.fn().mockImplementation((bookSlug, chapter) => 
      `books/${bookSlug}/audio/${chapter}.mp3`),
    convertLegacyPath: jest.fn().mockImplementation((legacyPath) => legacyPath),
    getBookSlugFromPath: jest.fn().mockImplementation((path) => {
      const match = path.match(/books\/([^/]+)/);
      return match ? match[1] : null;
    }),
    ...customImplementations,
  } as MockBlobPathService;
}

/**
 * Creates a type-safe mock VercelBlobAssetService instance
 * @param customImplementations Optional custom implementations for methods
 */
export function createMockVercelBlobAssetService(
  customImplementations: Partial<MockVercelBlobAssetService> = {}
): MockVercelBlobAssetService {
  return {
    getAssetUrl: jest.fn().mockImplementation((assetType, bookSlug, assetName) => 
      Promise.resolve(`https://example.com/assets/${assetType}/${bookSlug}/${assetName}`)),
    assetExists: jest.fn().mockResolvedValue(true),
    fetchAsset: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
    fetchTextAsset: jest.fn().mockResolvedValue('Mock text content'),
    uploadAsset: jest.fn().mockResolvedValue({
      url: 'https://example.com/assets/mock-asset.txt',
      size: 100,
      contentType: 'text/plain',
      uploadedAt: new Date(),
    }),
    deleteAsset: jest.fn().mockResolvedValue(true),
    listAssets: jest.fn().mockResolvedValue({
      assets: [],
      hasMore: false,
    }),
    ...customImplementations,
  } as MockVercelBlobAssetService;
}
```

### 3. Assertion Utilities (in `__testutils__/assertions/index.ts`)

```typescript
/**
 * Type-safe assertion utilities for common test patterns
 */

/**
 * Asserts that a function was called with a parameter containing expected properties
 * This is type-safe compared to the standard toHaveBeenCalledWith that uses any
 */
export function expectCalledWithObjectContaining<T, K extends keyof T>(
  mockFn: jest.MockedFunction<(...args: any[]) => any>,
  paramIndex: number,
  expectedProps: Pick<T, K>
): void {
  expect(mockFn).toHaveBeenCalled();
  const calls = mockFn.mock.calls;
  const actualParam = calls[calls.length - 1][paramIndex];
  
  for (const [key, value] of Object.entries(expectedProps)) {
    expect(actualParam[key]).toEqual(value);
  }
}

/**
 * Assert that a mock was called with a context parameter containing required fields
 * Specifically useful for logger calls that often use context objects
 */
export function expectLoggedWithContext(
  loggerFn: jest.MockedFunction<(...args: any[]) => any>,
  expectedContext: Record<string, unknown>
): void {
  expectCalledWithObjectContaining(loggerFn, 0, expectedContext);
}

/**
 * Asserts that a fetch request was made with specific parameters
 */
export function expectFetchCalledWith(
  url: string | RegExp,
  options?: RequestInit | Record<string, unknown>
): void {
  expect(global.fetch).toHaveBeenCalled();
  
  if (url instanceof RegExp) {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(url),
      options ? expect.objectContaining(options) : undefined
    );
  } else {
    expect(global.fetch).toHaveBeenCalledWith(
      url,
      options ? expect.objectContaining(options) : undefined
    );
  }
}
```

### 4. Network Utilities (in `__testutils__/network/index.ts`)

```typescript
import { createSuccessResponse, createErrorResponse } from '../../../__mocks__/MockResponse';

export { createSuccessResponse, createErrorResponse };

/**
 * Creates a mock fetch implementation that returns the provided response
 */
export function createMockFetch(response: Response): jest.MockedFunction<typeof fetch> {
  return jest.fn().mockResolvedValue(response);
}

/**
 * Creates a mock fetch implementation that returns a JSON response
 */
export function createMockJsonFetch<T>(data: T, status = 200): jest.MockedFunction<typeof fetch> {
  const jsonString = JSON.stringify(data);
  const response = createSuccessResponse(jsonString, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
  
  return createMockFetch(response);
}

/**
 * Creates a mock fetch implementation that fails with the specified error
 */
export function createMockFailedFetch(errorMessage: string): jest.MockedFunction<typeof fetch> {
  return jest.fn().mockRejectedValue(new Error(errorMessage));
}
```

### 5. Example Usage (in `__testutils__/README.md`)

```markdown
# Test Utilities

This directory contains standardized utilities for writing type-safe, maintainable tests.

## Mock Factories

Use these factories to create consistent mocks across test files:

```typescript
import { createMockLogger, createMockBlobService } from './__testutils__/mocks/factories';

describe('MyComponent', () => {
  it('should log events properly', () => {
    // Create a typed mock logger
    const mockLogger = createMockLogger();
    
    // Use in your test
    const result = myFunction(mockLogger);
    
    // Type-safe assertions
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Operation completed' })
    );
  });
});
```

## Network Utilities

Easy mocking of network requests:

```typescript
import { createMockJsonFetch } from './__testutils__/network';

describe('DataFetcher', () => {
  it('should fetch data successfully', async () => {
    // Mock the global fetch with a JSON response
    global.fetch = createMockJsonFetch({ data: 'test' });
    
    const result = await fetchData('/api/endpoint');
    
    expect(result).toEqual({ data: 'test' });
  });
});
```

## Assertion Utilities

Type-safe custom assertions:

```typescript
import { expectLoggedWithContext, expectFetchCalledWith } from './__testutils__/assertions';

describe('LoggingService', () => {
  it('should log with correct context', () => {
    const mockLogger = createMockLogger();
    const service = new LoggingService(mockLogger);
    
    service.logEvent('test', { userId: '123' });
    
    // Type-safe assertion
    expectLoggedWithContext(mockLogger.info, {
      event: 'test',
      userId: '123'
    });
  });
});
```
```

## Implementation Plan

1. **Week 1: Foundation**
   - Create the directory structure for test utilities
   - Implement interface definitions and basic factory functions
   - Write documentation and examples

2. **Week 2: Assertion Utilities**
   - Implement assertion utilities
   - Create network mock utilities
   - Write tests for the test utilities themselves

3. **Week 3: Demonstration**
   - Create example tests using new utilities
   - Update a few key test files to serve as examples
   - Document best practices 

4. **Future Work: Migration**
   - Gradually update existing tests to use new utilities
   - Reorganize test files by functionality
   - Update test documentation

## Testing Strategy

1. Test the test utilities themselves to ensure they work correctly
2. Create example test files that use the new utilities
3. Validate that the new approach addresses the identified issues
4. Get feedback from the team on usability and documentation

## Risks and Mitigations

1. **Risk**: Disrupting existing tests during migration
   **Mitigation**: Keep changes backward compatible, migrate incrementally

2. **Risk**: Team resistance to new patterns
   **Mitigation**: Provide clear documentation, examples, and benefits

3. **Risk**: Introducing new bugs in test utilities
   **Mitigation**: Thoroughly test the test utilities themselves

4. **Risk**: Overhead of migration outweighs benefits
   **Mitigation**: Focus on highest impact areas first, demonstrate value