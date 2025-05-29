/**
 * Download API Module
 *
 * This module provides functionality for proxying file downloads through the API
 * with robust error handling, logging, and metrics.
 */

// Export main proxy service functions
export { proxyAssetDownload, proxyFileDownload, createDownloadHeaders } from './proxyService';
export type { ProxyAssetConfig } from './proxyService';
export type { ProxyFileConfig } from './fetching/legacyProxyService';

// Export error handling utilities
export { createProxyErrorResponse } from './errors/errorResponses';
export { extractErrorDetails } from './errors/errorExtractor';
export { TimeoutError } from './errors/errorTypes';

// Export fetching utilities
export { fetchWithTimeout } from './fetching/fetchWithTimeout';
export { FETCH_TIMEOUT_MS } from './fetching/fetchWithTimeout';

// Export logging utilities
export { safeLog, sanitizeUrlForLogging } from './logging/safeLogger';
