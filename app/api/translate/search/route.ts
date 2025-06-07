import { NextRequest, NextResponse } from 'next/server';

import { randomUUID } from 'crypto';

import { createRequestLogger } from '@/utils/logger.js';
import { createRateLimitMiddleware, extractClientIP } from '@/utils/security/rateLimiter.js';

// ==================== Rate Limiting Configuration ====================

/**
 * Custom key generator for translation search API rate limiting
 * Uses IP-based limiting shared with main translate endpoint
 */
function createTranslateSearchKeyGenerator(request: NextRequest): string {
  const ip = extractClientIP(request);
  return `translate:${ip}`; // Share rate limit with main translate endpoint
}

/**
 * Rate limiting configuration for translation search API
 * Uses same limits as main translation endpoint since they're related operations
 */
const translateSearchRateLimitConfig = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 100, // 100 requests per 10 minutes per IP (shared with main translate)
  keyGenerator: (request: Request) => createTranslateSearchKeyGenerator(request as NextRequest),
  onLimitReached: (request: Request, retryAfter: number) => {
    const ip = extractClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    console.warn(
      `Translation search rate limit exceeded for IP ${ip}, User-Agent: ${userAgent}, retry after ${retryAfter}ms`,
    );
  },
};

// Create the rate limiting middleware
const translateSearchRateLimiter = createRateLimitMiddleware(translateSearchRateLimitConfig);

// ==================== Route Handlers ====================

/**
 * Translation search API route handler
 * Handles GET requests for translation search queries
 */
export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting first - this may return a 429 response
    const rateLimitResponse = await translateSearchRateLimiter(req);
    if (rateLimitResponse) {
      return rateLimitResponse; // Rate limit exceeded, return 429
    }

    // Generate correlation ID for request tracking
    const correlationId = randomUUID();
    const log = createRequestLogger(correlationId);

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const language = searchParams.get('lang');

    // Log search request
    log.info({
      msg: 'Translation search request received',
      correlationId,
      method: req.method,
      url: req.url,
      query,
      language,
      userAgent: req.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
    });

    // Basic validation
    if (!query) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Missing required query parameter: q',
          correlationId,
        },
        { status: 400 },
      );
    }

    // Mock search response for now
    // In a real implementation, this would search translation databases or services
    const results = [
      `Translation result 1 for "${query}"`,
      `Translation result 2 for "${query}"`,
      `Alternative translation for "${query}"`,
    ];

    log.info({
      msg: 'Translation search completed successfully',
      correlationId,
      query,
      language,
      resultCount: results.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        results,
        query,
        language,
        resultCount: results.length,
        correlationId,
      },
      { status: 200 },
    );
  } catch (error) {
    // Generate correlation ID for error handling
    const correlationId = randomUUID();
    const log = createRequestLogger(correlationId);

    // Log error
    log.error({
      msg: 'Translation search request failed',
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Translation search request failed. Please try again later.',
        correlationId,
      },
      { status: 500 },
    );
  }
}
