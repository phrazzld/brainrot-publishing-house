/**
 * Type-safe assertion utilities for common test patterns
 * These utilities improve testing by adding type safety to assertions
 */
import { expect } from '@jest/globals';

/**
 * Asserts that a function was called with a parameter containing expected properties
 * This is type-safe compared to the standard toHaveBeenCalledWith that uses any
 *
 * @param mockFn The mock function to check
 * @param paramIndex Index of the parameter to check (0-based)
 * @param expectedProps Expected properties in the parameter object
 */
function expectCalledWithObjectContaining(
  mockFn: jest.Mock,
  paramIndex: number,
  expectedProps: Record<string, unknown>,
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
 *
 * @param loggerFn The logger function mock to check (e.g., mockLogger.info)
 * @param expectedContext The expected context fields
 */
function expectLoggedWithContext(
  loggerFn: jest.Mock,
  expectedContext: Record<string, unknown>,
): void {
  expectCalledWithObjectContaining(loggerFn, 0, expectedContext);
}

/**
 * Asserts that a fetch request was made with specific parameters
 *
 * @param url Expected URL or URL pattern
 * @param options Optional expected request options
 */
function expectFetchCalledWith(url: string | RegExp, options?: Record<string, unknown>): void {
  expect(global.fetch).toHaveBeenCalled();

  if (url instanceof RegExp) {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(url),
      options ? expect.objectContaining(options) : undefined,
    );
  } else {
    expect(global.fetch).toHaveBeenCalledWith(
      url,
      options ? expect.objectContaining(options) : undefined,
    );
  }
}

/**
 * Asserts that a URL was constructed correctly with expected parts
 *
 * @param url The URL to check
 * @param expectedParts Expected parts of the URL
 */
function expectUrlContains(url: string, expectedParts: string[]): void {
  for (const part of expectedParts) {
    expect(url).toContain(part);
  }
}

/**
 * Asserts that a URL has the expected asset structure
 *
 * @param url The URL to check
 * @param assetType Type of asset (audio, text, image)
 * @param bookSlug Book slug identifier
 * @param filename Filename or pattern to match
 */
function expectValidAssetUrl(
  url: string,
  assetType: string,
  bookSlug: string,
  filename: string | RegExp,
): void {
  expect(url).toContain(`/${assetType}/`);
  expect(url).toContain(`/${bookSlug}/`);

  if (filename instanceof RegExp) {
    expect(url).toMatch(filename);
  } else {
    const encodedFilename = encodeURIComponent(filename).replace(/%2F/g, '/');
    expect(url.endsWith(encodedFilename) || url.endsWith(filename)).toBeTruthy();
  }
}

/**
 * Asserts that a path follows the expected structure
 * Useful for testing path generation functions
 *
 * @param path The path to check
 * @param structure Expected path structure with parts
 */
function expectPathStructure(
  path: string,
  structure: Record<string, string | RegExp | undefined>,
): void {
  if (structure.prefix) {
    expect(path).toMatch(new RegExp(`^${structure.prefix}`));
  }

  if (structure.bookSlug) {
    expect(path).toContain(`/${structure.bookSlug}/`);
  }

  if (structure.assetType) {
    expect(path).toContain(`/${structure.assetType}/`);
  }

  if (structure.filename) {
    if (structure.filename instanceof RegExp) {
      expect(path).toMatch(structure.filename);
    } else {
      expect(path).toMatch(new RegExp(`${structure.filename}$`));
    }
  }
}

/**
 * Asserts that an object has all expected keys with values of the correct type
 *
 * @param obj The object to check
 * @param schema Expected keys and their types
 */
function expectObjectShape(
  obj: Record<string, unknown>,
  schema: Record<string, string | (new (...args: unknown[]) => unknown)>,
): Record<string, unknown> {
  expect(obj).toBeTruthy();

  for (const [key, expectedType] of Object.entries(schema)) {
    expect(obj).toHaveProperty(key);

    if (typeof expectedType === 'string') {
      expect(typeof obj[key]).toBe(expectedType);
    } else {
      expect(obj[key]).toBeInstanceOf(expectedType);
    }
  }

  return obj;
}

/**
 * Asserts that a mock function was called with parameters meeting type predicates
 *
 * @param mockFn The mock function to check
 * @param predicates Functions that check if parameters are of the expected type/shape
 */
function expectCalledWithTypes(
  mockFn: jest.Mock,
  ...predicates: Array<(value: unknown) => boolean>
): void {
  expect(mockFn).toHaveBeenCalled();
  const calls = mockFn.mock.calls;
  const lastCall = calls[calls.length - 1];

  expect(lastCall).toHaveLength(predicates.length);

  for (let i = 0; i < predicates.length; i++) {
    const predicate = predicates[i];
    const param = lastCall[i];
    expect(predicate(param)).toBe(true);
  }
}

/**
 * Type predicate for checking if a value is a non-null object
 */
function isObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null;
}

/**
 * Type predicate for checking if a value is a string
 */
function isString(value: unknown): boolean {
  return typeof value === 'string';
}

/**
 * Type predicate for checking if a value is a number
 */
function isNumber(value: unknown): boolean {
  return typeof value === 'number';
}

/**
 * Type predicate for checking if a value is a boolean
 */
function isBoolean(value: unknown): boolean {
  return typeof value === 'boolean';
}

/**
 * Type predicate for checking if a value is an array
 */
function isArray(value: unknown): boolean {
  return Array.isArray(value);
}

/**
 * Creates a type predicate for checking if a value is an array of a specific type
 */
function isArrayOf(predicate: (value: unknown) => boolean): (value: unknown) => boolean {
  return (value: unknown): boolean => {
    return Array.isArray(value) && value.every(predicate);
  };
}

/**
 * Asserts that a response has the expected status code and content type
 */
function expectResponseProperties(response: Response, options: Record<string, unknown> = {}): void {
  if (options.status !== undefined) {
    expect(response.status).toBe(options.status);
    expect(response.ok).toBe(Number(options.status) >= 200 && Number(options.status) < 300);
  }

  if (options.contentType !== undefined) {
    const contentTypeHeader = response.headers.get('content-type');
    expect(contentTypeHeader).not.toBeNull();

    if (options.contentType instanceof RegExp) {
      expect(contentTypeHeader).toMatch(options.contentType);
    } else {
      expect(contentTypeHeader).toContain(String(options.contentType));
    }
  }

  if (options.hasBody !== undefined) {
    if (options.hasBody) {
      expect(response.body).not.toBeNull();
    } else {
      expect(response.body).toBeNull();
    }
  }
}

export {
  expectCalledWithObjectContaining,
  expectLoggedWithContext,
  expectFetchCalledWith,
  expectUrlContains,
  expectValidAssetUrl,
  expectPathStructure,
  expectObjectShape,
  expectCalledWithTypes,
  isObject,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isArrayOf,
  expectResponseProperties,
};
