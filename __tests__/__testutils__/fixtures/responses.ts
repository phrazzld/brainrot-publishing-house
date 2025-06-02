/**
 * Fixtures for API response-related test data
 * Provides factory functions for creating Response objects
 */
/**
 * Response options interface
 */
import { jest } from '@jest/globals';

/**
 * Type for response body
 */
type ResponseBodyType = string | ArrayBuffer | Blob | Record<string, unknown>;

/**
 * Response options interface
 */
interface ResponseOptions {
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
  url?: string;
}

/**
 * Split response creation into multiple functions to reduce complexity
 */
function processResponseBody(body: ResponseBodyType): {
  responseBody: string | ArrayBuffer | Blob;
  contentType: string;
} {
  let responseBody: string | ArrayBuffer | Blob;
  let contentType = 'text/plain';

  if (typeof body === 'string') {
    responseBody = body;
  } else if (body instanceof ArrayBuffer) {
    responseBody = body;
    contentType = 'application/octet-stream';
  } else if (body instanceof Blob) {
    responseBody = body;
    contentType = body.type || 'application/octet-stream';
  } else {
    // For other types (like objects), stringify them
    responseBody = JSON.stringify(body);
    contentType = 'application/json';
  }

  return { responseBody, contentType };
}

/**
 * Response methods interface
 */
interface ResponseMethods {
  text: jest.Mock<() => Promise<string>>;
  json: jest.Mock<() => Promise<unknown>>;
  arrayBuffer: jest.Mock<() => Promise<ArrayBuffer>>;
  blob: jest.Mock<() => Promise<Blob>>;
  formData: jest.Mock<() => Promise<FormData>>;
  clone: jest.Mock;
}

/**
 * Creates method implementations for the Response object
 */
function createResponseMethods(
  responseBody: string | ArrayBuffer | Blob,
  headers: Headers,
  contentType: string,
): ResponseMethods {
  // Create text implementation
  const textImpl = jest.fn().mockImplementation(async () => {
    if (typeof responseBody === 'string') {
      return responseBody;
    } else if (responseBody instanceof Blob) {
      return await responseBody.text();
    } else if (responseBody instanceof ArrayBuffer) {
      return new TextDecoder().decode(responseBody);
    }
    return '';
  });

  // Create json implementation
  const jsonImpl = jest.fn().mockImplementation(async () => {
    const text = await textImpl();
    try {
      return JSON.parse(text as string);
    } catch {
      throw new SyntaxError('Unexpected token in JSON at position 0');
    }
  });

  // Create arrayBuffer implementation
  const arrayBufferImpl = jest.fn().mockImplementation(async () => {
    if (responseBody instanceof ArrayBuffer) {
      return responseBody;
    } else if (typeof responseBody === 'string') {
      return new TextEncoder().encode(responseBody).buffer;
    } else if (responseBody instanceof Blob) {
      return await responseBody.arrayBuffer();
    }
    return new ArrayBuffer(0);
  });

  // Create blob implementation
  const blobImpl = jest.fn().mockImplementation(async () => {
    if (responseBody instanceof Blob) {
      return responseBody;
    }
    return new Blob([responseBody instanceof ArrayBuffer ? responseBody : String(responseBody)], {
      type: headers.get('content-type') || contentType,
    });
  });

  // Create formData implementation
  const formDataImpl = jest.fn<() => Promise<FormData>>().mockResolvedValue(new FormData());

  // Create bytes implementation
  const bytesImpl = jest.fn<() => Promise<Uint8Array>>().mockImplementation(async () => {
    if (responseBody instanceof ArrayBuffer) {
      return new Uint8Array(responseBody);
    } else if (typeof responseBody === 'string') {
      return new TextEncoder().encode(responseBody);
    } else if (responseBody instanceof Blob) {
      const buffer = await responseBody.arrayBuffer();
      return new Uint8Array(buffer);
    }
    return new Uint8Array(0);
  });

  // Create a mock for clone that returns itself
  const cloneImpl = jest.fn();

  return {
    text: textImpl as jest.Mock<() => Promise<string>>,
    json: jsonImpl as jest.Mock<() => Promise<unknown>>,
    arrayBuffer: arrayBufferImpl as jest.Mock<() => Promise<ArrayBuffer>>,
    blob: blobImpl as jest.Mock<() => Promise<Blob>>,
    formData: formDataImpl,
    bytes: bytesImpl,
    clone: cloneImpl,
  };
}

/**
 * Creates a type-safe Response object
 */
function createResponseFixture(body: ResponseBodyType, options: ResponseOptions = {}): Response {
  // Process the body
  const { responseBody, contentType } = processResponseBody(body);

  // Extract options with defaults
  const status = options.status || 200;
  const statusText = options.statusText || (status === 200 ? 'OK' : '');
  const url = options.url || 'https://example.com/api';
  const headers = new Headers(options.headers || {});

  // Add content-type if not specified
  if (!headers.has('content-type')) {
    headers.set('content-type', contentType);
  }

  // Create and add method implementations first
  const methods = createResponseMethods(responseBody, headers, contentType);

  // Create response object with proper properties
  const response = {
    status,
    statusText,
    headers,
    ok: status >= 200 && status < 300,
    redirected: false,
    type: 'basic' as ResponseType,
    url,
    bodyUsed: false,
    body: null,
    ...methods,
  };

  // Set up circular reference for clone method
  methods.clone.mockReturnValue(response);

  return response as Response;
}

/**
 * Creates a successful JSON response
 */
function createJsonResponse(data: unknown, options: ResponseOptions = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('content-type', 'application/json');

  return createResponseFixture(JSON.stringify(data), {
    ...options,
    headers,
    status: options.status || 200,
    statusText: options.statusText || 'OK',
  });
}

/**
 * Creates a successful text response
 */
function createTextResponse(text: string, options: ResponseOptions = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('content-type', 'text/plain');

  return createResponseFixture(text, {
    ...options,
    headers,
    status: options.status || 200,
    statusText: options.statusText || 'OK',
  });
}

/**
 * Creates an error response
 */
function createErrorResponse(
  status = 404,
  statusText = 'Not Found',
  errorBody: string | Record<string, unknown> = '',
) {
  const isJson = typeof errorBody !== 'string';
  const body = isJson ? JSON.stringify(errorBody) : errorBody || `Error ${status}: ${statusText}`;
  const contentType = isJson ? 'application/json' : 'text/plain';

  return createResponseFixture(body, {
    status,
    statusText,
    headers: { 'content-type': contentType },
  });
}

/**
 * Creates a network error (throws instead of returning a Response)
 */
function createNetworkError(message = 'Network error') {
  return () => {
    throw new TypeError(message);
  };
}

/**
 * Creates a fetch function that returns a successful response
 */
function createSuccessFetch(
  data: unknown,
  options: ResponseOptions = {},
): jest.Mock<() => Promise<Response>> {
  return jest
    .fn<() => Promise<Response>>()
    .mockResolvedValue(
      typeof data === 'string'
        ? createTextResponse(data, options)
        : createJsonResponse(data, options),
    );
}

/**
 * Creates a fetch function that returns an error response
 */
function createErrorFetch(
  status = 404,
  statusText = 'Not Found',
  errorBody: string | Record<string, unknown> = '',
): jest.Mock<() => Promise<Response>> {
  return jest
    .fn<() => Promise<Response>>()
    .mockResolvedValue(createErrorResponse(status, statusText, errorBody));
}

/**
 * Creates a fetch function that throws a network error
 */
function createNetworkErrorFetch(message = 'Network error') {
  return jest.fn().mockImplementation(() => {
    throw new TypeError(message);
  });
}

export {
  createResponseFixture,
  createJsonResponse,
  createTextResponse,
  createErrorResponse,
  createNetworkError,
  createSuccessFetch,
  createErrorFetch,
  createNetworkErrorFetch,
};
