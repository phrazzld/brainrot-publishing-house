import { NextRequest, NextResponse } from 'next/server';

import { createRequestLogger } from '@/utils/logger.js';
import { checkRateLimit, sanitizeString } from '@/utils/security/core.js';

// Simple validation for download requests
function validateDownloadParams(searchParams: URLSearchParams) {
  const assetType = searchParams.get('assetType');
  const assetPath = searchParams.get('assetPath');

  if (!assetType || !assetPath) {
    throw new Error('Missing required parameters: assetType and assetPath');
  }

  return {
    assetType: sanitizeString(assetType),
    assetPath: sanitizeString(assetPath),
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const log = createRequestLogger('download-api');

  try {
    // Check rate limit
    if (!checkRateLimit(request)) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }

    // Validate parameters
    const url = new URL(request.url);
    const params = validateDownloadParams(url.searchParams);

    log.info('Download request validated', params);

    // For now, return a simple response
    // In a real implementation, this would proxy to the asset storage
    return new NextResponse('Download functionality simplified for security audit', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Download request failed', { error: errorMessage });
    return new NextResponse('Bad Request', { status: 400 });
  }
}
