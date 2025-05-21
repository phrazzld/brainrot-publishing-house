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
export function expectCalledWithObjectContaining<T, K extends keyof T>(
  mockFn: jest.MockedFunction<(...args: unknown[]) => unknown>,
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
 *
 * @param loggerFn The logger function mock to check (e.g., mockLogger.info)
 * @param expectedContext The expected context fields
 */
export function expectLoggedWithContext(
  loggerFn: jest.MockedFunction<(...args: unknown[]) => unknown>,
  expectedContext: Record<string, unknown>
): void {
  expectCalledWithObjectContaining(loggerFn, 0, expectedContext);
}

/**
 * Asserts that a fetch request was made with specific parameters
 *
 * @param url Expected URL or URL pattern
 * @param options Optional expected request options
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

/**
 * Asserts that a URL was constructed correctly with expected parts
 *
 * @param url The URL to check
 * @param expectedParts Expected parts of the URL
 */
export function expectUrlContains(url: string, expectedParts: string[]): void {
  for (const part of expectedParts) {
    expect(url).toContain(part);
  }
}

/**
 * Asserts that a path follows the expected structure
 * Useful for testing path generation functions
 *
 * @param path The path to check
 * @param structure Expected path structure with parts
 */
export function expectPathStructure(
  path: string,
  structure: {
    prefix?: string;
    bookSlug?: string;
    assetType?: string;
    filename?: string;
  }
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
    expect(path).toMatch(new RegExp(`${structure.filename}$`));
  }
}

/**
 * Asserts that an object has all expected keys with values of the correct type
 *
 * @param obj The object to check
 * @param schema Expected keys and their types
 */
export function expectObjectShape<T extends Record<string, unknown>>(
  obj: unknown,
  schema: Record<keyof T, string | (new (...args: unknown[]) => unknown)>
): void {
  expect(obj).toBeTruthy();
  const typedObj = obj as T;

  for (const [key, expectedType] of Object.entries(schema)) {
    expect(typedObj).toHaveProperty(key);

    if (typeof expectedType === 'string') {
      expect(typeof typedObj[key as keyof T]).toBe(expectedType);
    } else {
      expect(typedObj[key as keyof T]).toBeInstanceOf(expectedType);
    }
  }
}

/**
 * Asserts that a mock function was called with parameters meeting type predicates
 *
 * @param mockFn The mock function to check
 * @param predicates Functions that check if parameters are of the expected type/shape
 */
export function expectCalledWithTypes(
  mockFn: jest.MockedFunction<(...args: unknown[]) => unknown>,
  ...predicates: ((arg: unknown) => boolean)[]
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
