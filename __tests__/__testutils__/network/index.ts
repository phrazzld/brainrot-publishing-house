/**
 * Network-related utilities for tests
 * Provides tools for mocking network requests and responses
 */
import { createMockFetch, createMockResponse } from '../mocks/factories.js';

export { createMockResponse, createMockFetch };

/**
 * Type definition for response options
 */
interface ResponseOptions {
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
  url?: string;
}

/**
 * Creates a success response with JSON content
 *
 * @param data The data to include in the JSON response
 * @param options Optional response configuration
 */
export function createJsonResponse<T>(data: T, options: ResponseOptions = {}): Response {
  const jsonString = JSON.stringify(data);
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  return createMockResponse(jsonString, {
    ...options,
    headers,
  });
}

/**
 * Creates a mock fetch implementation that returns JSON data
 *
 * @param data The data to return as JSON
 * @param options Optional response configuration
 */
export function createJsonFetch<T>(
  data: T,
  options: ResponseOptions = {},
): jest.MockedFunction<typeof fetch> {
  return createMockFetch(() => createJsonResponse(data, options));
}

/**
 * Creates an error response
 *
 * @param status HTTP status code
 * @param message Error message
 * @param details Optional error details
 */
export function createErrorResponse(
  status = 404,
  message = 'Not Found',
  details?: Record<string, unknown>,
): Response {
  const errorBody = details ? JSON.stringify({ error: message, ...details }) : message;

  const contentType = details ? 'application/json' : 'text/plain';

  const headers = new Headers();
  headers.set('Content-Type', contentType);

  return createMockResponse(errorBody, {
    status,
    statusText: message,
    headers,
  });
}

/**
 * Creates a mock fetch implementation that fails with a network error
 *
 * @param errorMessage The error message
 */
export function createNetworkErrorFetch(
  errorMessage = 'Network request failed',
): jest.MockedFunction<typeof fetch> {
  return jest.fn().mockRejectedValue(new Error(errorMessage));
}

/**
 * Creates a binary response (for files, audio, etc.)
 *
 * @param content The binary content
 * @param contentType The content MIME type
 */
export function createBinaryResponse(content: ArrayBuffer | Blob, contentType: string): Response {
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set(
    'Content-Length',
    content instanceof Blob ? content.size.toString() : content.byteLength.toString(),
  );

  return createMockResponse(content, {
    headers,
  });
}
