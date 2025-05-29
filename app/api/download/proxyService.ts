import { NextResponse } from 'next/server';

import { AssetType } from '@/types/assets';
import { Logger } from '@/utils/logger';

import { handleAssetUrlError } from './errors/assetUrlErrorHandler';
import { handleUnexpectedProxyError } from './errors/unexpectedErrorHandler';
import { createSuccessResponse, fetchAssetWithLogging, handleErrorResponse } from './fetching/assetFetcher';
import { getAssetUrlWithLogging, logProxyRequest } from './fetching/assetUrlService';
import { proxyFileDownload } from './fetching/legacyProxyService';
import { createDownloadHeaders } from './responses/responseHeaders';

// Re-export the legacy proxy function
export { proxyFileDownload };

// Re-export utility functions
export { createDownloadHeaders };

/**
 * Configuration for proxying asset downloads
 */
export type ProxyAssetConfig = {
  /** Type of asset (audio, text, image) */
  assetType: AssetType;
  /** Book identifier */
  bookSlug: string;
  /** Name of the specific asset */
  assetName: string;
  /** Filename for the download */
  filename: string;
  /** Logger instance */
  log: Logger;
  /** Asset URL resolver for retrieving asset URLs */
  assetService: {
    getAssetUrl: (assetType: AssetType, bookSlug: string, assetName: string) => Promise<string>;
  };
  /** Additional request parameters for context */
  requestParams?: Record<string, string | string[]>;
};

/**
 * Handles proxying of file downloads through the API
 * Uses the unified asset service for consistent asset handling
 *
 * @param config Configuration object containing all parameters
 * @returns Promise resolving to NextResponse
 */
export async function proxyAssetDownload(config: ProxyAssetConfig): Promise<NextResponse> {
  const { assetType, bookSlug, assetName, filename, log, assetService, requestParams } = config;
  // Create a unique operation ID for correlating logs within this request
  const opId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  const operation = 'proxyAssetDownload';

  try {
    // Step 1: Log detailed information about the proxy request
    logProxyRequest({
      log,
      opId,
      operation,
      assetType,
      bookSlug,
      assetName,
      filename,
      requestParams,
    });

    // Step 2: Get the asset URL from the asset service
    let assetUrl: string;
    try {
      assetUrl = await getAssetUrlWithLogging({
        log,
        opId,
        operation,
        assetService,
        assetType,
        bookSlug,
        assetName,
      });
    } catch (assetError) {
      return handleAssetUrlError({
        assetError,
        log,
        opId,
        operation,
        assetType,
        bookSlug,
        assetName,
      });
    }

    // Step 3: Perform the fetch with timeout handling
    const fetchResult = await fetchAssetWithLogging({
      assetUrl,
      log,
      opId,
      operation,
      assetType,
      bookSlug,
      assetName,
    });

    // If fetch resulted in an error response, return early
    if ('error' in fetchResult) {
      return fetchResult.error;
    }

    const { fileResponse, metrics } = fetchResult;

    // Step 4: Handle error responses from the fetch
    if (!fileResponse.ok) {
      return handleErrorResponse({
        fileResponse,
        log,
        opId,
        operation,
        assetUrl,
        assetType,
        bookSlug,
        assetName,
        metrics,
      });
    }

    // Step 5: Create and return the successful response
    return createSuccessResponse({
      fileResponse,
      filename,
      log,
      opId,
      operation,
      assetType,
      bookSlug,
      assetName,
      metrics,
    });
  } catch (error) {
    // Step 6: Handle unexpected errors
    return handleUnexpectedProxyError({
      error,
      log,
      opId,
      operation,
      assetType,
      bookSlug,
      assetName,
      filename,
      requestParams,
    });
  }
}