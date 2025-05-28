/**
 * Simple implementation of the Response interface for tests
 * This mock can be used directly in place of Response without type assertions
 */

/**
 * Response options interface to avoid too many parameters
 */
interface ResponseOptions {
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
  url?: string;
}

/**
 * Creates and initializes the basic properties for a Response
 */
function initializeResponse(
  body: string | Blob | ArrayBuffer,
  options: ResponseOptions = {},
): Response {
  // Extract options with defaults
  const status = options.status || 200;
  const statusText = options.statusText || '';
  const headers = options.headers || {};
  const url = options.url || '';
  // Create base response properties
  const isOk = status >= 200 && status < 300;
  const responseHeaders = new Headers(headers);

  // Create response with minimal properties
  const response: Partial<Response> = {
    status,
    statusText: statusText || (status === 200 ? 'OK' : ''),
    headers: responseHeaders,
    ok: isOk,
    redirected: false,
    type: 'basic' as ResponseType,
    url,
    bodyUsed: false,
    body: null,
  };

  // Add methods
  response.text = async () => {
    if (typeof body === 'string') {
      return body;
    } else if (body instanceof Blob) {
      return await body.text();
    } else if (body instanceof ArrayBuffer) {
      return new TextDecoder().decode(body);
    }
    return '';
  };

  response.json = async () => {
    const textFn = response.text as () => Promise<string>;
    const text = await textFn();
    return JSON.parse(text);
  };

  response.arrayBuffer = async () => {
    if (body instanceof ArrayBuffer) {
      return body;
    } else if (typeof body === 'string') {
      return new TextEncoder().encode(body).buffer;
    } else if (body instanceof Blob) {
      return await body.arrayBuffer();
    }
    return new ArrayBuffer(0);
  };

  response.blob = async () => {
    if (body instanceof Blob) {
      return body;
    } else if (typeof body === 'string' || body instanceof ArrayBuffer) {
      return new Blob([body]);
    }
    return new Blob([]);
  };

  response.formData = async () => new FormData();

  response.clone = () =>
    initializeResponse(body, {
      status,
      statusText,
      headers: responseHeaders,
      url,
    });

  return response as Response;
}

/**
 * Creates a success response with the given content and options
 */
export function createSuccessResponse(
  content: string | Blob | ArrayBuffer,
  options?: ResponseOptions,
): Response {
  // Set default status text to 'OK' for success responses
  const updatedOptions = {
    ...options,
    status: options?.status || 200,
    statusText: options?.statusText || 'OK',
  };

  return initializeResponse(content, updatedOptions);
}

/**
 * Creates an error response with the given status code and message
 */
export function createErrorResponse(
  status = 404,
  statusText = 'Not Found',
  errorBody = '',
): Response {
  const body = errorBody || `Error ${status}: ${statusText}`;
  return initializeResponse(body, {
    status,
    statusText,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// Export MockResponse as a type alias for the Response interface
// This allows test code to reference 'MockResponse' for clarity
export type MockResponse = Response;
