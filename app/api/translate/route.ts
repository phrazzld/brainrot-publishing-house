import { NextRequest, NextResponse } from 'next/server';

import { handleSearchRequest } from './handlers/searchHandler';
import { handleTranslationRequest } from './handlers/translationHandler';
import { instantiateOpenAI } from './services/openaiService';
import { sseSend } from './utils/sseUtils';

export const config = {
  runtime: 'edge',
};

/**
 * Validates the request parameters and checks authentication
 */
function validateRequest(
  query: string | null,
  password: string | null
): { isValid: boolean; errorResponse?: NextResponse } {
  if (!process.env.TRANSLATE_PASSWORD) {
    return {
      isValid: false,
      errorResponse: new NextResponse('no server password set', { status: 500 }),
    };
  }

  if (password !== process.env.TRANSLATE_PASSWORD) {
    return {
      isValid: false,
      errorResponse: new NextResponse('unauthorized', { status: 401 }),
    };
  }

  return { isValid: true };
}

/**
 * Main request handler that processes the SSE stream
 */
export async function GET(request: NextRequest) {
  try {
    // Parse request parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const model = searchParams.get('model') || '';
    const password = searchParams.get('password') || '';
    const notes = searchParams.get('notes') || '';
    const bookIdParam = searchParams.get('bookId');

    // Validate request
    const { isValid, errorResponse } = validateRequest(query, password);
    if (!isValid) {
      return errorResponse;
    }

    // Initialize OpenAI client
    const openai = instantiateOpenAI(model);

    // Set up SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!bookIdParam) {
            // Handle search request
            await handleSearchRequest(query, controller);
          } else {
            // Handle translation request
            const bookId = parseInt(bookIdParam, 10);
            await handleTranslationRequest({
              bookId,
              model,
              notes,
              openai,
              controller,
            });
          }
        } catch (err: unknown) {
          handleStreamError(err, controller);
        }
      },
    });

    // Return SSE response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

/**
 * Handles errors in the stream and sends an error event
 */
function handleStreamError(err: unknown, controller: ReadableStreamDefaultController): void {
  const errorMessage = err instanceof Error ? err.message : String(err);
  console.error('Stream Error:', err);
  sseSend(controller, 'error', `Stream error: ${errorMessage}`);
  controller.close();
}

/**
 * Handles API-level errors
 */
function handleApiError(err: unknown): NextResponse {
  console.error('API Route Error:', err);
  return new NextResponse(JSON.stringify({ error: 'An internal server error occurred' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
