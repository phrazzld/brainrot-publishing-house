import { NextRequest, NextResponse } from 'next/server';

import { checkRateLimit, sanitizeString } from '@/utils/security/core.js';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check rate limit
    if (!checkRateLimit(request)) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }

    const body = await request.json();
    const text = sanitizeString(body.text || '');

    if (!text) {
      return new NextResponse('Missing text parameter', { status: 400 });
    }

    // For now, return a simple response
    // In a real implementation, this would call a translation service
    return NextResponse.json({
      originalText: text,
      translatedText: `[Translation of: ${text}]`,
      language: 'en',
    });
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }
}
