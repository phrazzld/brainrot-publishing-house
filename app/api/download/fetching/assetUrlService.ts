import { AssetType } from '@/types/assets';
import { Logger } from '@/utils/logger';

import { safeLog, sanitizeUrlForLogging } from '../logging/safeLogger';

/**
 * Parameters for getting an asset URL with logging
 */
export type GetAssetUrlParams = {
  log: Logger;
  opId: string;
  operation: string;
  assetService: {
    getAssetUrl: (assetType: AssetType, bookSlug: string, assetName: string) => Promise<string>;
  };
  assetType: AssetType;
  bookSlug: string;
  assetName: string;
};

/**
 * Gets an asset URL from the asset service with logging
 * 
 * @param params Parameters for the operation
 * @returns Promise resolving to the asset URL
 */
export async function getAssetUrlWithLogging(params: GetAssetUrlParams): Promise<string> {
  const { log, opId, operation, assetService, assetType, bookSlug, assetName } = params;

  safeLog(log, 'debug', {
    msg: 'Fetching asset URL',
    opId,
    operation,
    assetType,
    bookSlug,
    assetName,
  });

  // Get URL from the AssetService
  const assetUrl = await assetService.getAssetUrl(assetType, bookSlug, assetName);

  safeLog(log, 'debug', {
    msg: 'Asset URL retrieved successfully',
    opId,
    operation,
    assetUrl: sanitizeUrlForLogging(assetUrl),
  });

  return assetUrl;
}

/**
 * Log details about the proxy download request
 */
export type LogProxyRequestParams = {
  log: Logger;
  opId: string;
  operation: string;
  assetType: AssetType;
  bookSlug: string;
  assetName: string;
  filename: string;
  requestParams?: Record<string, string | string[]>;
};

/**
 * Logs detailed information about a proxy request
 * 
 * @param params Parameters for the log operation
 */
export function logProxyRequest(params: LogProxyRequestParams): void {
  const { log, opId, operation, assetType, bookSlug, assetName, filename, requestParams } = params;

  safeLog(log, 'info', {
    msg: 'Proxy download request received',
    opId,
    operation,
    assetType,
    bookSlug,
    assetName,
    filename,
    requestParams,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
}