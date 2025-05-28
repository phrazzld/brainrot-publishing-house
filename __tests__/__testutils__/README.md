# Test Utilities

This directory contains standardized utilities for writing type-safe, maintainable tests.

## Directory Structure

```
__testutils/
├── mocks/            # Mock interfaces and factories
│   ├── interfaces.ts # Type-safe mock interfaces
│   ├── factories.ts  # Factory functions for creating mocks
│   ├── services/     # Service-specific mocks
│   ├── apis/         # API-specific mocks
│   └── ui/           # UI component mocks
├── assertions/       # Type-safe assertion utilities
├── network/          # Network request/response utilities
├── helpers/          # General test helper functions
├── fixtures/         # Test data factories
│   ├── index.ts      # Entry point for all fixtures
│   ├── books.ts      # Book and chapter fixtures
│   ├── assets.ts     # Asset-related fixtures
│   └── responses.ts  # Response fixtures for fetch mocking
```

## Usage

### Fixtures

Use these factory functions to create consistent test data:

```typescript
import { BookBuilder, createBookFixture } from '../__testutils__/fixtures';

describe('BookComponent', () => {
  it('should render book information', () => {
    // Simple factory approach
    const book = createBookFixture({ title: 'Custom Title' });

    // Or use the builder pattern for more complex scenarios
    const customBook = new BookBuilder()
      .withSlug('hamlet')
      .withTitle('Hamlet')
      .withChapters(5)
      .build();

    // ... test with these fixtures
  });
});
```

### Response Fixtures

Create type-safe mock responses for fetch testing:

```typescript
import { createErrorResponse, createTextResponse } from '../__testutils__/fixtures';

describe('FetchComponent', () => {
  it('should fetch and display text', async () => {
    // Create a successful text response
    const response = createTextResponse('Hello, world!');
    global.fetch = jest.fn().mockResolvedValue(response);

    // ... test code that uses fetch
  });

  it('should handle error responses', async () => {
    // Create an error response
    const errorResponse = createErrorResponse(404, 'Not Found');
    global.fetch = jest.fn().mockResolvedValue(errorResponse);

    // ... test error handling
  });
});
```

### Mock Factories

Use these factories to create consistent mocks across test files:

```typescript
import { createMockBlobService, createMockLogger } from '../__testutils__/mocks/factories';

describe('MyComponent', () => {
  it('should log events properly', () => {
    // Create a typed mock logger
    const mockLogger = createMockLogger();

    // Use in your test
    const result = myFunction(mockLogger);

    // Type-safe assertions
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Operation completed' }),
    );
  });
});
```

### Network Utilities

Easily mock network requests:

```typescript
import { createErrorFetch, createSuccessFetch } from '../__testutils__/fixtures';

describe('DataFetcher', () => {
  it('should fetch data successfully', async () => {
    // Mock the global fetch with a JSON response
    global.fetch = createSuccessFetch({ data: 'test' });

    const result = await fetchData('/api/endpoint');

    expect(result).toEqual({ data: 'test' });
  });

  it('should handle error responses', async () => {
    // Create an error response
    global.fetch = createErrorFetch(404, 'Not Found', { code: 'RESOURCE_NOT_FOUND' });

    await expect(fetchData('/api/endpoint')).rejects.toThrow();
  });
});
```

### Assertion Utilities

Type-safe custom assertions:

```typescript
import {
  expectFetchCalledWith,
  expectLoggedWithContext,
  expectPathStructure,
  expectValidAssetUrl,
} from '../__testutils__/assertions';

describe('LoggingService', () => {
  it('should log with correct context', () => {
    const mockLogger = createMockLogger();
    const service = new LoggingService(mockLogger);

    service.logEvent('test', { userId: '123' });

    // Type-safe assertion for log context
    expectLoggedWithContext(mockLogger.info, {
      event: 'test',
      userId: '123',
    });
  });

  it('should generate paths correctly', () => {
    const pathService = new AssetPathService();
    const path = pathService.getAssetPath('audio', 'hamlet', 'chapter-01.mp3');

    // Assert path structure
    expectPathStructure(path, {
      prefix: 'assets',
      assetType: 'audio',
      bookSlug: 'hamlet',
      filename: 'chapter-01.mp3',
    });
  });

  it('should generate valid asset URLs', () => {
    const assetService = new AssetService();
    const url = assetService.getAssetUrl('audio', 'hamlet', 'chapter-01.mp3');

    // Assert URL structure for assets
    expectValidAssetUrl(url, 'audio', 'hamlet', 'chapter-01.mp3');
  });
});
```

## Best Practices

1. **Use Type-Safe Fixtures**: Always use the provided fixtures rather than manually creating test data
2. **Use Type-Safe Mocks**: Always use the provided interfaces and factories rather than manually creating mocks
3. **Group Tests By Functionality**: Organize tests based on behavior, not implementation details
4. **Avoid Implementation Details**: Test the public API of components, not internal implementation
5. **Use Descriptive Test Names**: Name tests to describe the behavior being tested
6. **Use Shared Utilities**: Avoid duplicating mock setup and assertions
7. **Avoid Type Assertions**: Use type predicates and assertion functions instead of `as` casts
8. **Use Builder Pattern for Complex Objects**: For complex test data, use the builder pattern for better readability

## Migration Guide

To migrate existing tests to use these utilities:

1. Replace direct jest.mock() calls with the appropriate mock factory
2. Replace manual type assertions (as any) with type-safe interfaces
3. Use the assertion utilities for common test patterns
4. Update imports to use the new utilities
5. Replace inline test data with fixture factory functions
6. Replace manual Response object creation with response fixtures

Example:

```typescript
// Before
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    // other methods missing or inconsistent
  },
}));

const mockResponse = {
  ok: true,
  status: 200,
  text: jest.fn().mockResolvedValue('Test text'),
  json: jest.fn().mockResolvedValue({ data: 'test' }),
} as unknown as Response;

// After
import { createMockLogger } from '../__testutils__/mocks/factories';
import { createTextResponse } from '../__testutils__/fixtures';

const mockLogger = createMockLogger();
jest.mock('../../utils/logger', () => ({
  logger: mockLogger,
  createRequestLogger: jest.fn().mockReturnValue(mockLogger),
}));

const mockResponse = createTextResponse('Test text');
```
