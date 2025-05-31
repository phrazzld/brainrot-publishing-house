/**
 * Download API Module
 *
 * This module provides functionality for proxying file downloads through the API
 * with robust error handling, logging, and metrics.
 */

// Export main proxy service functions
export { proxyAssetDownload, proxyFileDownload, createDownloadHeaders } from './proxyService.js';
export type { ProxyAssetConfig } from './proxyService.js';
export type { ProxyFileConfig } from './fetching/legacyProxyService.js';

// Export error handling utilities
export { createProxyErrorResponse } from './errors/errorResponses.js';
export { extractErrorDetails } from './errors/errorExtractor.js';
export { TimeoutError } from './errors/errorTypes.js';

// Export fetching utilities
export { fetchWithTimeout } from './fetching/fetchWithTimeout.js';
export { FETCH_TIMEOUT_MS } from './fetching/fetchWithTimeout.js';

// Export logging utilities
export { safeLog, sanitizeUrlForLogging } from './logging/safeLogger.js';
