/**
 * Type-safe assertion utilities for common test patterns
 * These utilities improve testing by adding type safety to assertions
 */
const { expect } = require('@jest/globals');

/**
 * Asserts that a function was called with a parameter containing expected properties
 * This is type-safe compared to the standard toHaveBeenCalledWith that uses any
 *
 * @param mockFn The mock function to check
 * @param paramIndex Index of the parameter to check (0-based)
 * @param expectedProps Expected properties in the parameter object
 */
function expectCalledWithObjectContaining(mockFn, paramIndex, expectedProps) {
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
function expectLoggedWithContext(loggerFn, expectedContext) {
  expectCalledWithObjectContaining(loggerFn, 0, expectedContext);
}

/**
 * Asserts that a fetch request was made with specific parameters
 *
 * @param url Expected URL or URL pattern
 * @param options Optional expected request options
 */
function expectFetchCalledWith(url, options) {
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
function expectUrlContains(url, expectedParts) {
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
function expectValidAssetUrl(url, assetType, bookSlug, filename) {
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
function expectPathStructure(path, structure) {
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
function expectObjectShape(obj, schema) {
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
function expectCalledWithTypes(mockFn, ...predicates) {
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
function isObject(value) {
  return typeof value === 'object' && value !== null;
}

/**
 * Type predicate for checking if a value is a string
 */
function isString(value) {
  return typeof value === 'string';
}

/**
 * Type predicate for checking if a value is a number
 */
function isNumber(value) {
  return typeof value === 'number';
}

/**
 * Type predicate for checking if a value is a boolean
 */
function isBoolean(value) {
  return typeof value === 'boolean';
}

/**
 * Type predicate for checking if a value is an array
 */
function isArray(value) {
  return Array.isArray(value);
}

/**
 * Creates a type predicate for checking if a value is an array of a specific type
 */
function isArrayOf(predicate) {
  return (value) => {
    return Array.isArray(value) && value.every(predicate);
  };
}

/**
 * Asserts that a response has the expected status code and content type
 */
function expectResponseProperties(response, options = {}) {
  if (options.status !== undefined) {
    expect(response.status).toBe(options.status);
    expect(response.ok).toBe(options.status >= 200 && options.status < 300);
  }

  if (options.contentType !== undefined) {
    const contentTypeHeader = response.headers.get('content-type');
    expect(contentTypeHeader).not.toBeNull();

    if (options.contentType instanceof RegExp) {
      expect(contentTypeHeader).toMatch(options.contentType);
    } else {
      expect(contentTypeHeader).toContain(options.contentType);
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

module.exports = {
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