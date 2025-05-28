/**
 * Fixtures for API response-related test data
 * Provides type-safe factory functions for creating Response objects
 */

/**
 * Response options interface
 */
export interface ResponseOptions {
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
  url?: string;
}

/**
 * Split response creation into multiple functions to reduce complexity
 */
function processResponseBody(body: string | ArrayBuffer | Blob | unknown): {
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
 * Creates method implementations for the Response object
 */
function createResponseMethods(
  responseBody: string | ArrayBuffer | Blob,
  headers: Headers,
  contentType: string,
): {
  text: jest.Mock;
  json: jest.Mock;
  arrayBuffer: jest.Mock;
  blob: jest.Mock;
  formData: jest.Mock;
  clone: jest.Mock;
} {
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
      return JSON.parse(text);
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
  const formDataImpl = jest.fn().mockResolvedValue(new FormData());

  // Create a mock for clone that returns itself
  const cloneImpl = jest.fn();

  return {
    text: textImpl,
    json: jsonImpl,
    arrayBuffer: arrayBufferImpl,
    blob: blobImpl,
    formData: formDataImpl,
    clone: cloneImpl,
  };
}

/**
 * Creates a type-safe Response object
 */
export function createResponseFixture<T = unknown>(
  body: string | ArrayBuffer | Blob | T,
  options: ResponseOptions = {},
): Response {
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

  // Create response object
  const response: Partial<Response> = {
    status,
    statusText,
    headers,
    ok: status >= 200 && status < 300,
    redirected: false,
    type: 'basic' as ResponseType,
    url,
    bodyUsed: false,
    body: null,
  };

  // Create and add method implementations
  const methods = createResponseMethods(responseBody, headers, contentType);
  Object.assign(response, methods);

  // Set up circular reference for clone method
  methods.clone.mockReturnValue(response);

  return response as Response;
}

/**
 * Creates a successful JSON response
 */
export function createJsonResponse<T = unknown>(data: T, options: ResponseOptions = {}): Response {
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
export function createTextResponse(text: string, options: ResponseOptions = {}): Response {
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
export function createErrorResponse(
  status = 404,
  statusText = 'Not Found',
  errorBody: string | Record<string, unknown> = '',
): Response {
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
export function createNetworkError(message = 'Network error'): () => never {
  return () => {
    throw new TypeError(message);
  };
}

/**
 * Creates a fetch function that returns a successful response
 */
export function createSuccessFetch<T = unknown>(
  data: T,
  options: ResponseOptions = {},
): jest.MockedFunction<typeof fetch> {
  return jest
    .fn()
    .mockResolvedValue(
      typeof data === 'string'
        ? createTextResponse(data, options)
        : createJsonResponse(data, options),
    );
}

/**
 * Creates a fetch function that returns an error response
 */
export function createErrorFetch(
  status = 404,
  statusText = 'Not Found',
  errorBody: string | Record<string, unknown> = '',
): jest.MockedFunction<typeof fetch> {
  return jest.fn().mockResolvedValue(createErrorResponse(status, statusText, errorBody));
}

/**
 * Creates a fetch function that throws a network error
 */
export function createNetworkErrorFetch(
  message = 'Network error',
): jest.MockedFunction<typeof fetch> {
  return jest.fn().mockImplementation(() => {
    throw new TypeError(message);
  });
}
