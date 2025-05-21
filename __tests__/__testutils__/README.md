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
└── factories/        # Test data factories
```

## Usage

### Mock Factories

Use these factories to create consistent mocks across test files:

```typescript
import { createMockLogger, createMockBlobService } from '../__testutils__/mocks/factories';

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

### Network Utilities

Easily mock network requests:

```typescript
import { createJsonFetch, createErrorResponse } from '../__testutils__/network';

describe('DataFetcher', () => {
  it('should fetch data successfully', async () => {
    // Mock the global fetch with a JSON response
    global.fetch = createJsonFetch({ data: 'test' });
    
    const result = await fetchData('/api/endpoint');
    
    expect(result).toEqual({ data: 'test' });
  });
  
  it('should handle error responses', async () => {
    // Create an error response
    global.fetch = createMockFetch(() => 
      createErrorResponse(404, 'Not Found', { code: 'RESOURCE_NOT_FOUND' })
    );
    
    await expect(fetchData('/api/endpoint')).rejects.toThrow();
  });
});
```

### Assertion Utilities

Type-safe custom assertions:

```typescript
import { 
  expectLoggedWithContext, 
  expectFetchCalledWith,
  expectPathStructure
} from '../__testutils__/assertions';

describe('LoggingService', () => {
  it('should log with correct context', () => {
    const mockLogger = createMockLogger();
    const service = new LoggingService(mockLogger);
    
    service.logEvent('test', { userId: '123' });
    
    // Type-safe assertion for log context
    expectLoggedWithContext(mockLogger.info, {
      event: 'test',
      userId: '123'
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
      filename: 'chapter-01.mp3'
    });
  });
});
```

## Best Practices

1. **Use Type-Safe Mocks**: Always use the provided interfaces and factories rather than manually creating mocks
2. **Group Tests By Functionality**: Organize tests based on behavior, not implementation details
3. **Avoid Implementation Details**: Test the public API of components, not internal implementation
4. **Use Descriptive Test Names**: Name tests to describe the behavior being tested
5. **Use Shared Utilities**: Avoid duplicating mock setup and assertions

## Migration Guide

To migrate existing tests to use these utilities:

1. Replace direct jest.mock() calls with the appropriate mock factory
2. Replace manual type assertions (as any) with type-safe interfaces
3. Use the assertion utilities for common test patterns
4. Update imports to use the new utilities

Example:

```typescript
// Before
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    // other methods missing or inconsistent
  }
}));

// After
import { createMockLogger } from '../__testutils__/mocks/factories';
const mockLogger = createMockLogger();
jest.mock('../../utils/logger', () => ({
  logger: mockLogger,
  createRequestLogger: jest.fn().mockReturnValue(mockLogger)
}));
```