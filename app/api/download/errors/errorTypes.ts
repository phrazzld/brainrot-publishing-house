// This file contains type definitions for error handling

/**
 * Error class for timeout errors
 */
export class TimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Configuration for creating proxy error responses
 */
export type ProxyErrorConfig = {
  /** HTTP status code */
  status: number;
  /** User-facing error message */
  errorMessage: string;
  /** Optional technical error details (only included in non-production) */
  details?: string;
  /** Optional operation ID for log correlation */
  operationId?: string;
};

/**
 * Error type and category information
 */
export interface ErrorTypeInfo {
  /** User-friendly error type description */
  errorType: string;
  /** Error category for grouping and reporting */
  errorCategory: string;
}
