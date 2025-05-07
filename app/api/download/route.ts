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
  const { searchParams, pathname } = new URL(req.url);

  // Extract relevant headers for logging (skipping sensitive ones)
  const headers: Record<string, string> = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];

  req.headers.forEach((value, key) => {
    if (!sensitiveHeaders.includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  // Extract request parameters for logging (skipping sensitive ones)
  const params: Record<string, string> = {};
  const sensitiveParams = ['auth', 'token', 'key', 'secret', 'password'];

  searchParams.forEach((value, key) => {
    if (!sensitiveParams.includes(key.toLowerCase())) {
      params[key] = value;
    }
  });

  // Log detailed request information
  safeLog(log, 'info', {
    msg: 'Download API request received',
    correlationId,
    method: req.method,
    url: req.url,
    pathname,
    params,
    isProxyRequest: searchParams.get('proxy') === 'true',
    referer: req.headers.get('referer'),
    userAgent: req.headers.get('user-agent'),
    acceptHeaders: {
      accept: req.headers.get('accept'),
      acceptEncoding: req.headers.get('accept-encoding'),
      acceptLanguage: req.headers.get('accept-language'),
    },
    origin: req.headers.get('origin'),
    host: req.headers.get('host'),
    contentType: req.headers.get('content-type'),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    deployment: process.env.VERCEL_URL || 'local',
  });

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
 * @param searchParams - The original search parameters from the request
 * @returns Response with the proxied file
 */
/**
 * Handles proxy download requests with comprehensive context and error handling
 *
 * @param url URL to proxy
 * @param filename Filename for the download
 * @param validation Validated request parameters
 * @param log Logger instance
 * @param correlationId Request correlation ID for tracing
 * @param searchParams Original search parameters
 * @param headers Request headers for context
 * @returns Promise resolving to NextResponse
 */
async function handleProxyRequest(
  url: string,
  filename: string,
  validation: { slug: string; type: 'full' | 'chapter'; chapter?: string },
  log: ReturnType<typeof createRequestLogger>,
  correlationId: string,
  searchParams?: URLSearchParams,
  headers?: Record<string, string>
): Promise<NextResponse> {
  // Generate a unique operation ID for this proxy operation
  // This is different from the correlation ID and specific to this proxy operation
  const operationId = `px-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;

  // Convert search params to a record for logging, skipping sensitive ones
  const requestParams: Record<string, string | string[]> = {};
  const sensitiveParams = ['auth', 'token', 'key', 'secret', 'password', 'apikey', 'api_key'];

  if (searchParams) {
    searchParams.forEach((value, key) => {
      if (!sensitiveParams.includes(key.toLowerCase())) {
        requestParams[key] = value;
      }
    });
  }

  // Add request validation data to parameters with enhanced context
  const allParams = {
    ...requestParams,
    slug: validation.slug,
    type: validation.type,
    chapter: validation.chapter,
    correlationId,
    operationId,
    environment: process.env.NODE_ENV || 'development',
    deployment: process.env.VERCEL_URL || 'local',
    timestamp: new Date().toISOString(),
  };

  // Gather client information for debugging
  const clientInfo = {
    userAgent: headers?.['user-agent'] || '',
    referer: headers?.['referer'] || '',
    origin: headers?.['origin'] || '',
    accept: headers?.['accept'] || '',
    acceptEncoding: headers?.['accept-encoding'] || '',
    acceptLanguage: headers?.['accept-language'] || '',
  };

  // Determine client platform/browser for analytics
  const isMobile =
    clientInfo.userAgent.includes('Mobile') || clientInfo.userAgent.includes('Android');
  const isIOS = clientInfo.userAgent.includes('iPhone') || clientInfo.userAgent.includes('iPad');
  const isAndroid = clientInfo.userAgent.includes('Android');
  const isSafari =
    clientInfo.userAgent.includes('Safari') && !clientInfo.userAgent.includes('Chrome');
  const isChrome = clientInfo.userAgent.includes('Chrome');
  const isFirefox = clientInfo.userAgent.includes('Firefox');
  const isEdge = clientInfo.userAgent.includes('Edg/');

  // Log proxy request with detailed context
  safeLog(log, 'info', {
    msg: 'Proxying download through API',
    correlationId,
    operationId,
    slug: validation.slug,
    type: validation.type,
    chapter: validation.chapter,
    requestOrigin: process.env.VERCEL_URL || 'local',
    requestParams,
    requestUrl: url,
    clientInfo,
    clientClassification: {
      isMobile,
      isIOS,
      isAndroid,
      browser: isChrome
        ? 'Chrome'
        : isSafari
          ? 'Safari'
          : isFirefox
            ? 'Firefox'
            : isEdge
              ? 'Edge'
              : 'Other',
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });

  try {
    // Start timing the operation
    const proxyStartTime = Date.now();

    // Pass all parameters to proxy download function (note: function signature updated to accept operationId)
    const response = await proxyFileDownload(url, filename, log, allParams);

    // Log successful proxy completion with timing
    const proxyDuration = Date.now() - proxyStartTime;
    safeLog(log, 'info', {
      msg: 'Proxy download completed successfully',
      correlationId,
      operationId,
      slug: validation.slug,
      type: validation.type,
      chapter: validation.chapter,
      durationMs: proxyDuration,
      timestamp: new Date().toISOString(),
    });

    return response;
  } catch (proxyError) {
    // Enhanced error logging with detailed context
    safeLog(log, 'error', {
      msg: 'Error while proxying file',
      correlationId,
      operationId,
      slug: validation.slug,
      type: validation.type,
      chapter: validation.chapter,
      error: proxyError instanceof Error ? proxyError.message : String(proxyError),
      stack: proxyError instanceof Error ? proxyError.stack : undefined,
      errorType: proxyError instanceof Error ? proxyError.constructor.name : typeof proxyError,
      requestParams,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });

    // Return environment-aware structured error response
    const errorResponse = {
      error: 'Proxy error',
      message: 'Failed to proxy download through API',
      correlationId,
      operationId,
    };

    // Add detailed error information in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      Object.assign(errorResponse, {
        details: proxyError instanceof Error ? proxyError.message : String(proxyError),
        errorType: proxyError instanceof Error ? proxyError.constructor.name : typeof proxyError,
        stack: proxyError instanceof Error ? proxyError.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(errorResponse, { status: 500 });
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
  downloadService: NonNullable<ReturnType<typeof createDownloadService>>,
  log: ReturnType<typeof createRequestLogger>
) {
  const { slug, type, chapter, correlationId } = params;

  // Call the download service to get the URL
  // We're using NonNullable in the function parameter so we know it's not null
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
      // Extract headers for additional context
      const requestHeaders: Record<string, string> = {};
      ['user-agent', 'referer', 'origin', 'accept', 'accept-encoding', 'accept-language'].forEach(
        (header) => {
          const value = req.headers.get(header);
          if (value) {
            requestHeaders[header] = value;
          }
        }
      );

      return handleProxyRequest(
        url,
        filename,
        {
          slug: validatedSlug,
          type: validatedType,
          chapter: validation.chapter,
        },
        log,
        correlationId,
        searchParams,
        requestHeaders
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
