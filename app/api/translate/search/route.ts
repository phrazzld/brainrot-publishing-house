import { NextRequest, NextResponse } from 'next/server';

import { checkRateLimit, sanitizeString } from '@/utils/security/core.js';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check rate limit
    if (!checkRateLimit(request)) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }

    const url = new URL(request.url);
    const query = sanitizeString(url.searchParams.get('q') || '');

    if (!query) {
      return new NextResponse('Missing query parameter', { status: 400 });
    }

    // For now, return a simple response
    // In a real implementation, this would search translations
    return NextResponse.json({
      query,
      results: [`Search result for: ${query}`],
      count: 1,
    });
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }
}
