import { describe, expect, test } from '@jest/globals';

// Let's create stubs for our type replacements and test their behavior

// Standard error handling pattern test
describe('Standard error handling pattern', () => {
  test('Error instance is processed correctly', () => {
    const processError = (error: unknown): string => {
      if (error instanceof Error) {
        return error.message;
      } else {
        return String(error);
      }
    };

    // Test with an Error instance
    const errorInstance = new Error('Test error message');
    expect(processError(errorInstance)).toBe('Test error message');

    // Test with a string
    expect(processError('String error')).toBe('String error');

    // Test with an object
    const objError = { error: 'Object error' };
    expect(processError(objError)).toBe('[object Object]');
  });
});

// Test our type guards
describe('Type guards for API responses', () => {
  // Define the interfaces
  interface BookSearchResult {
    id: number;
    title: string;
    authors: string;
    downloadCount: number;
  }

  // Type guard function
  function isBookSearchResultArray(data: unknown): data is BookSearchResult[] {
    if (!Array.isArray(data)) return false;
    return data.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as BookSearchResult).id === 'number' &&
        typeof (item as BookSearchResult).title === 'string' &&
        typeof (item as BookSearchResult).authors === 'string' &&
        typeof (item as BookSearchResult).downloadCount === 'number',
    );
  }

  test('Valid BookSearchResult array is recognized', () => {
    const validData = [
      { id: 1, title: 'Book 1', authors: 'Author 1', downloadCount: 100 },
      { id: 2, title: 'Book 2', authors: 'Author 2', downloadCount: 200 },
    ];

    expect(isBookSearchResultArray(validData)).toBe(true);
  });

  test('Invalid data is rejected', () => {
    // Missing properties
    const missingProps = [
      { id: 1, title: 'Book 1', downloadCount: 100 }, // missing authors
      { id: 2, title: 'Book 2', authors: 'Author 2' }, // missing downloadCount
    ];
    expect(isBookSearchResultArray(missingProps)).toBe(false);

    // Wrong property types
    const wrongTypes = [
      { id: '1', title: 'Book 1', authors: 'Author 1', downloadCount: 100 }, // id is string
      { id: 2, title: 'Book 2', authors: 'Author 2', downloadCount: '200' }, // downloadCount is string
    ];
    expect(isBookSearchResultArray(wrongTypes)).toBe(false);

    // Not an array
    const notArray = { id: 1, title: 'Book 1', authors: 'Author 1', downloadCount: 100 };
    expect(isBookSearchResultArray(notArray)).toBe(false);
  });
});

// Test JSON parsing with type checking
describe('Safe JSON parsing with type checking', () => {
  test('Valid JSON is parsed and validated', () => {
    const jsonString = '{"name":"Test","value":123}';

    // Parse to unknown first
    const parsed: unknown = JSON.parse(jsonString);

    // Type check before using
    const isValidObject =
      typeof parsed === 'object' &&
      parsed !== null &&
      'name' in parsed &&
      typeof (parsed as { name: unknown }).name === 'string' &&
      'value' in parsed &&
      typeof (parsed as { value: unknown }).value === 'number';

    expect(isValidObject).toBe(true);

    // Now safe to use after type checking
    if (isValidObject) {
      const typedObject = parsed as { name: string; value: number };
      expect(typedObject.name).toBe('Test');
      expect(typedObject.value).toBe(123);
    }
  });
});
