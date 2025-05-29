import { ErrorTypeInfo } from './errorTypes';

/**
 * Maps HTTP status code to error type
 */
function mapStatusToErrorType(status: number): string {
  if (status === 400) return 'Invalid request';
  if (status === 401 || status === 403) return 'Access denied';
  if (status === 404) return 'Resource not found';
  if (status === 429) return 'Rate limit exceeded';
  if (status === 500) return 'Proxy error';
  if (status === 502) return 'Gateway error';
  if (status === 504) return 'Request timeout';
  return 'Processing error';
}

/**
 * Maps HTTP status code to error category
 */
function mapStatusToErrorCategory(status: number): string {
  // Client errors (4xx)
  if (status >= 400 && status < 500) {
    // Special case categories
    if (status === 401 || status === 403) return 'Authorization';
    if (status === 404) return 'NotFound';
    if (status === 429) return 'RateLimit';
    
    // Default client error category
    return 'Client';
  }
  
  // Server errors (5xx)
  if (status >= 500) {
    // Special case categories
    if (status === 502) return 'Gateway';
    if (status === 504) return 'Timeout';
    
    // Default server error category
    return 'Server';
  }
  
  // Default for any other status
  return 'Unknown';
}

/**
 * Categorizes an HTTP status code into appropriate error type and category
 *
 * @param status HTTP status code
 * @returns Error type and category information
 */
export function categorizeError(status: number): ErrorTypeInfo {
  return {
    errorType: mapStatusToErrorType(status),
    errorCategory: mapStatusToErrorCategory(status)
  };
}

/**
 * Gets developer-friendly hints for certain error types in non-production environments
 * 
 * @param status HTTP status code
 * @returns Developer hint or undefined if no hint is available
 */
export function getDeveloperHint(status: number): string | undefined {
  if (status === 504) {
    return 'This is likely a timeout issue. Check if the upstream server is slow or unavailable.';
  } 
  
  if (status === 502) {
    return 'This indicates a problem communicating with the upstream server. Check if it is reachable and working correctly.';
  } 
  
  if (status === 500) {
    return 'This is a server-side error. Check the server logs for more details.';
  }

  return undefined;
}