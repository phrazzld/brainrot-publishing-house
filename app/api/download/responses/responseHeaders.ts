/**
 * Creates appropriate headers for file download
 * 
 * @param contentType The MIME type of the file content
 * @param filename The filename to use for the downloaded file
 * @returns Headers object with appropriate Content-Type and Content-Disposition
 */
export function createDownloadHeaders(contentType: string, filename: string): Headers {
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  return headers;
}

/**
 * Creates headers for error responses
 * 
 * @param errorType The type of error
 * @param errorCategory The category of error
 * @param operationId Unique operation ID for tracking
 * @returns Headers object with error tracking information
 */
export function createErrorHeaders(
  errorType: string,
  errorCategory: string,
  operationId?: string
): Headers {
  const headers = new Headers();
  headers.set('X-Error-Type', errorType);
  headers.set('X-Error-Category', errorCategory);
  headers.set('X-Operation-ID', operationId || 'none');
  return headers;
}