import { NextRequest, NextResponse } from 'next/server';

import { randomUUID } from 'crypto';

import { createRequestLogger } from '@/utils/logger';

import { handleCriticalError, handleDownloadServiceError, safeLog } from './errorHandlers';
import { proxyFileDownload } from './proxyService';
import { validateRequestParameters } from './requestValidation';
import { createDownloadService } from './serviceFactory';

/**
 * Download API route handler
 * Processes download requests for audio files (full audiobooks or chapters)
 *
 * This API route follows these principles:
 *
 * 1. URL Generation:
 *    - Uses direct CDN URLs for Digital Ocean Spaces as the primary source
 *    - Falls back to Vercel Blob URLs when available
 *    - No S3 signing or credentials required
 *
 * 2. Download Methods:
 *    - Direct client-side download: Returns URL for client to fetch directly
 *    - API proxy: Downloads file server-side and streams to client
 *      (used to avoid CORS issues with certain storage providers)
 *
 * 3. Response Formats:
 *    - Without proxy: Returns JSON with download URL and metadata
 *    - With proxy: Streams file directly with appropriate headers
 *
 * This approach ensures consistent downloads across all environments
 * without requiring environment-specific credentials or configurations.
 */
/**
 * Handles the case when a proxy is requested
 *
 * @param url - The URL to proxy
 * @param filename - The filename to use for the download
 * @param validation - The validated request parameters
 * @param log - Logger instance
 * @returns Response with the proxied file
 */
async function handleProxyRequest(
  url: string,
  filename: string,
  validation: { slug: string; type: 'full' | 'chapter'; chapter?: string },
  log: ReturnType<typeof createRequestLogger>
): Promise<NextResponse> {
  // If proxy is requested, download the file and stream it to the client
  safeLog(log, 'info', {
    msg: 'Proxying download through API',
    slug: validation.slug,
    type: validation.type,
    chapter: validation.chapter,
  });

  try {
    return await proxyFileDownload(url, filename, log);
  } catch (proxyError) {
    safeLog(log, 'error', {
      msg: 'Error while proxying file',
      error: proxyError instanceof Error ? proxyError.message : String(proxyError),
      stack: proxyError instanceof Error ? proxyError.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Proxy error',
        message: 'Failed to proxy download through API',
      },
      { status: 500 }
    );
  }
}

/**
 * Processes a valid download request
 *
 * @param validation - The validated request parameters
 * @param searchParams - The search parameters from the request
 * @param correlationId - The correlation ID for the request
 * @param log - Logger instance
 * @returns Response with the download URL or proxied file
 */
async function processDownloadRequest(
  validation: { valid: boolean; slug?: string; type?: 'full' | 'chapter'; chapter?: string },
  searchParams: URLSearchParams,
  correlationId: string,
  log: ReturnType<typeof createRequestLogger>
): Promise<NextResponse> {
  // Create the download service
  const downloadService = createDownloadService(log);
  if (!downloadService) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Service initialization failed. Please try again later.',
        type: 'SERVICE_ERROR',
        correlationId,
      },
      { status: 500 }
    );
  }

  try {
    // At this point we've validated that slug and type exist
    // TypeScript doesn't know this, so we'll use non-null assertion alternatives
    const validatedSlug = validation.slug || '';
    const validatedType = validation.type || 'full';

    // Call the download service to get the URL
    const url = await downloadService.getDownloadUrl({
      slug: validatedSlug,
      type: validatedType,
      chapter: validation.chapter,
      correlationId,
    });

    // Log successful URL generation
    safeLog(log, 'info', {
      msg: 'Successfully generated download URL',
      slug: validatedSlug,
      type: validatedType,
      chapter: validation.chapter,
      urlType: url.includes('cdn.digitaloceanspaces.com') ? 'cdn' : 'blob',
    });

    // Create filename for download
    const filename =
      validatedType === 'full'
        ? `${validatedSlug}.mp3`
        : `${validatedSlug}-chapter-${validation.chapter}.mp3`;

    // Determine if the fetch request has a 'proxy' parameter
    // If present, we'll stream the file directly from our API
    const proxyRequested = searchParams.get('proxy') === 'true';

    if (proxyRequested) {
      return handleProxyRequest(
        url,
        filename,
        {
          slug: validatedSlug,
          type: validatedType,
          chapter: validation.chapter,
        },
        log
      );
    }

    // If no proxy requested, respond with the URL for client-side download
    // Check if URL is a DigitalOcean CDN URL
    const isCdnUrl = url.includes('cdn.digitaloceanspaces.com');

    return NextResponse.json(
      {
        url,
        isCdnUrl,
        shouldProxy: isCdnUrl, // Recommend proxy for CDN URLs which might have CORS issues
      },
      { status: 200 }
    );
  } catch (error) {
    // Map service errors to appropriate responses
    // Use our validated variables from above
    const validatedSlug = validation.slug || '';
    const validatedType = validation.type || 'full';

    return handleDownloadServiceError(
      error,
      {
        slug: validatedSlug,
        type: validatedType,
        chapter: validation.chapter,
        correlationId,
      },
      log
    );
  }
}

/**
 * Main API route handler for the download endpoint
 */
export async function GET(req: NextRequest) {
  // Generate a unique correlation ID for this request
  const correlationId = randomUUID();

  // Create a logger instance with the correlation ID
  const log = createRequestLogger(correlationId);

  // Log request received with structured data
  safeLog(log, 'info', {
    msg: 'Download API request received',
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
  });

  try {
    // Get search parameters from the request URL
    const { searchParams } = new URL(req.url);

    // Validate all request parameters
    const validation = validateRequestParameters(searchParams, log, correlationId);
    if (!validation.valid || !validation.slug || !validation.type) {
      return (
        validation.errorResponse || NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      );
    }

    return processDownloadRequest(validation, searchParams, correlationId, log);
  } catch (error) {
    // Handle critical errors that occur during request processing
    return handleCriticalError(error, correlationId, log);
  }
}
