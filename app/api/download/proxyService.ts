import { NextResponse } from 'next/server';

import { Logger } from '@/utils/logger';

import { safeLog } from './errorHandlers';

/**
 * Attempts to fetch a file from a URL with fallback handling
 */
export async function fetchWithFallback(primaryUrl: string, log: Logger): Promise<Response> {
  // Try to fetch the file from primary URL
  let fileResponse = await fetch(primaryUrl);

  // If the primary CDN URL fails, try a fallback to non-CDN URL if this is a CDN URL
  if (!fileResponse.ok && primaryUrl.includes('.cdn.digitaloceanspaces.com')) {
    const fallbackUrl = primaryUrl.replace(
      '.cdn.digitaloceanspaces.com',
      '.digitaloceanspaces.com'
    );

    safeLog(log, 'info', {
      msg: 'Primary URL failed, trying fallback URL',
      primaryUrl,
      fallbackUrl,
      primaryStatus: fileResponse.status,
    });

    // Try the fallback URL
    try {
      fileResponse = await fetch(fallbackUrl);

      // If fallback succeeds where primary failed, log this
      if (fileResponse.ok) {
        safeLog(log, 'info', {
          msg: 'Fallback URL succeeded where primary failed',
          fallbackUrl,
        });
      }
    } catch (fallbackError) {
      safeLog(log, 'error', {
        msg: 'Fallback URL also failed',
        fallbackUrl,
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
    }
  }

  return fileResponse;
}

/**
 * Creates appropriate headers for file download
 */
export function createDownloadHeaders(contentType: string, filename: string): Headers {
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  return headers;
}

/**
 * Handles proxying of file downloads through the API
 */
export async function proxyFileDownload(
  url: string,
  filename: string,
  log: Logger
): Promise<NextResponse> {
  // Try to fetch the file with fallback handling
  safeLog(log, 'debug', {
    msg: 'Attempting to fetch file',
    url,
  });

  const fileResponse = await fetchWithFallback(url, log);

  if (!fileResponse.ok) {
    safeLog(log, 'error', {
      msg: 'Failed to fetch file for proxying',
      status: fileResponse.status,
      statusText: fileResponse.statusText,
      url,
    });

    return NextResponse.json(
      {
        error: 'Processing error',
        message: `Failed to fetch file (${fileResponse.status})`,
      },
      { status: 502 }
    );
  }

  // Get content type from response
  const contentType = fileResponse.headers.get('content-type') || 'audio/mpeg';

  // Create headers for the download
  const headers = createDownloadHeaders(contentType, filename);

  // Return the file stream
  return new NextResponse(fileResponse.body, {
    status: 200,
    headers,
  });
}
