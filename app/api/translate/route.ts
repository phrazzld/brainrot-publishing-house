import { NextRequest, NextResponse } from 'next/server';

import { randomUUID } from 'crypto';

import { createRequestLogger } from '@/utils/logger.js';
import { createRateLimitMiddleware, extractClientIP } from '@/utils/security/rateLimiter.js';

// ==================== Rate Limiting Configuration ====================

/**
 * Custom key generator for translation API rate limiting
 * Uses IP-based limiting with special handling for legitimate tools
 */
function createTranslateKeyGenerator(request: NextRequest): string {
  const ip = extractClientIP(request);
  return `translate:${ip}`;
}

/**
 * Rate limiting configuration for translation API
 * More generous limits for translation requests compared to file downloads
 */
const translateRateLimitConfig = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 100, // 100 translation requests per 10 minutes per IP
  keyGenerator: (request: Request) => createTranslateKeyGenerator(request as NextRequest),
  onLimitReached: (request: Request, retryAfter: number) => {
    const ip = extractClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    console.warn(
      `Translation rate limit exceeded for IP ${ip}, User-Agent: ${userAgent}, retry after ${retryAfter}ms`,
    );
  },
};

// Create the rate limiting middleware
const translateRateLimiter = createRateLimitMiddleware(translateRateLimitConfig);

// ==================== Route Handlers ====================

/**
 * Translation API route handler
 * Handles POST requests for text translation
 */
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting first - this may return a 429 response
    const rateLimitResponse = await translateRateLimiter(req);
    if (rateLimitResponse) {
      return rateLimitResponse; // Rate limit exceeded, return 429
    }

    // Generate correlation ID for request tracking
    const correlationId = randomUUID();
    const log = createRequestLogger(correlationId);

    // Extract request body
    const body = await req.json();

    // Log translation request
    log.info({
      msg: 'Translation request received',
      correlationId,
      method: req.method,
      url: req.url,
      sourceLanguage: body.sourceLanguage,
      targetLanguage: body.targetLanguage,
      textLength: body.text?.length || 0,
      userAgent: req.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
    });

    // Basic validation
    if (!body.text || !body.sourceLanguage || !body.targetLanguage) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Missing required fields: text, sourceLanguage, targetLanguage',
          correlationId,
        },
        { status: 400 },
      );
    }

    // Mock translation response for now
    // In a real implementation, this would call a translation service
    const translatedText = `[TRANSLATED: ${body.text}]`;

    log.info({
      msg: 'Translation completed successfully',
      correlationId,
      sourceLanguage: body.sourceLanguage,
      targetLanguage: body.targetLanguage,
      originalLength: body.text.length,
      translatedLength: translatedText.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        translatedText,
        originalText: body.text,
        sourceLanguage: body.sourceLanguage,
        targetLanguage: body.targetLanguage,
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
      msg: 'Translation request failed',
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Translation request failed. Please try again later.',
        correlationId,
      },
      { status: 500 },
    );
  }
}
