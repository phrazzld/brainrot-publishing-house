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
 * Type definition for request context to simplify passing around common objects
 */
type RequestContext = {
  correlationId: string;
  log: ReturnType<typeof createRequestLogger>;
  searchParams: URLSearchParams;
};

/**
 * Type for validated parameters
 */
type ValidationResult = {
  valid: boolean;
  slug?: string;
  type?: 'full' | 'chapter';
  chapter?: string;
  errorResponse?: NextResponse;
};

/**
 * Initialize request processing by setting up logging and correlation ID
 * @param req - The incoming request
 * @returns Request context with correlationId, logger, and searchParams
 */
function initializeRequest(req: NextRequest): RequestContext {
  const correlationId = randomUUID();
  const log = createRequestLogger(correlationId);

  // Log request received with structured data
  safeLog(log, 'info', {
    msg: 'Download API request received',
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
  });

  const { searchParams } = new URL(req.url);

  return { correlationId, log, searchParams };
}

/**
 * Validate request parameters and return early if invalid
 * @param context - Request context
 * @returns Validation result and error response if invalid
 */
function validateRequest(context: RequestContext): ValidationResult {
  const { searchParams, log, correlationId } = context;
  return validateRequestParameters(searchParams, log, correlationId);
}

/**
 * Create a direct download response (no proxy)
 * @param url - The download URL
 * @returns NextResponse with URL and metadata
 */
function createDirectDownloadResponse(url: string): NextResponse {
  const isCdnUrl = url.includes('cdn.digitaloceanspaces.com');

  return NextResponse.json(
    {
      url,
      isCdnUrl,
      shouldProxy: isCdnUrl, // Recommend proxy for CDN URLs which might have CORS issues
    },
    { status: 200 }
  );
}

/**
 * Create a filename for the download based on the validation parameters
 * @param validatedSlug - The validated slug
 * @param validatedType - The validated type (full or chapter)
 * @param chapter - Optional chapter number
 * @returns Formatted filename
 */
function createDownloadFilename(
  validatedSlug: string,
  validatedType: 'full' | 'chapter',
  chapter?: string
): string {
  return validatedType === 'full'
    ? `${validatedSlug}.mp3`
    : `${validatedSlug}-chapter-${chapter}.mp3`;
}

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
 * Get the download URL from the service
 * @param params - Download request parameters
 * @param downloadService - The download service instance
 * @param log - Logger instance
 * @returns The generated URL and validated parameters
 */
async function getDownloadUrl(
  params: {
    slug: string;
    type: 'full' | 'chapter';
    chapter?: string;
    correlationId: string;
  },
  downloadService: ReturnType<typeof createDownloadService>,
  log: ReturnType<typeof createRequestLogger>
) {
  const { slug, type, chapter, correlationId } = params;

  // Call the download service to get the URL
  const url = await downloadService.getDownloadUrl({
    slug,
    type,
    chapter,
    correlationId,
  });

  // Log successful URL generation
  safeLog(log, 'info', {
    msg: 'Successfully generated download URL',
    slug,
    type,
    chapter,
    urlType: url.includes('cdn.digitaloceanspaces.com') ? 'cdn' : 'blob',
  });

  return { url, validatedSlug: slug, validatedType: type, chapter };
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

    const { url } = await getDownloadUrl(
      {
        slug: validatedSlug,
        type: validatedType,
        chapter: validation.chapter,
        correlationId,
      },
      downloadService,
      log
    );

    // Create filename for download
    const filename = createDownloadFilename(validatedSlug, validatedType, validation.chapter);

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
    return createDirectDownloadResponse(url);
  } catch (error) {
    // Map service errors to appropriate responses
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
  try {
    // Initialize request handling with logging and correlation ID
    const context = initializeRequest(req);

    // Validate request parameters
    const validation = validateRequest(context);

    // Return error response if validation fails
    if (!validation.valid || !validation.slug || !validation.type) {
      return (
        validation.errorResponse || NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      );
    }

    // Process the download request
    return processDownloadRequest(
      validation,
      context.searchParams,
      context.correlationId,
      context.log
    );
  } catch (error) {
    // For critical errors, create a correlation ID if we don't have one yet
    // Define a type for errors that might contain a correlationId
    type ErrorWithCorrelation = { correlationId?: string };

    // Try to extract correlationId from the error or generate a new one
    const correlationId =
      typeof error === 'object' &&
      error !== null &&
      'correlationId' in (error as ErrorWithCorrelation)
        ? (error as ErrorWithCorrelation).correlationId || randomUUID()
        : randomUUID();

    const log = createRequestLogger(correlationId);

    // Handle critical errors that occur during request processing
    return handleCriticalError(error, correlationId, log);
  }
}
