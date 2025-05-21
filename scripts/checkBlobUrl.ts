/**
 * Script to check if specific blob URLs are accessible
 */
import dotenv from 'dotenv';
import fetch from 'node-fetch';

import { logger } from '../utils/logger';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Create a script-specific logger
const scriptLogger = logger.child({
  script: 'checkBlobUrl',
  context: 'blob-verification',
});

// Get the base URL from environment variables
const BASE_URL = process.env.NEXT_PUBLIC_BLOB_BASE_URL;

if (!BASE_URL) {
  scriptLogger.error({
    msg: 'NEXT_PUBLIC_BLOB_BASE_URL environment variable is not set',
    error: 'Missing required environment variable',
  });
  process.exit(1);
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const status = response.status;

    scriptLogger.info({
      msg: `Checked URL: ${url}`,
      url,
      status,
      exists: response.ok,
    });

    return response.ok;
  } catch (error) {
    scriptLogger.error({
      msg: `Error checking URL ${url}`,
      url,
      error,
    });
    return false;
  }
}

async function main() {
  // Test URLs for the custom migrated assets
  const testUrls = [
    `${BASE_URL}/books/the-iliad/text/book-01.txt`,
    `${BASE_URL}/books/the-odyssey/text/book-01.txt`,
    `${BASE_URL}/books/the-aeneid/text/book-01.txt`,
    `${BASE_URL}/books/the-declaration-of-independence/text/the-declaration-of-independence.txt`,
  ];

  scriptLogger.info({
    msg: 'Starting URL verification',
    baseUrl: BASE_URL,
    urlCount: testUrls.length,
  });

  let successCount = 0;

  for (const url of testUrls) {
    scriptLogger.info({
      msg: 'Checking URL',
      url,
    });

    const exists = await checkUrl(url);
    if (exists) successCount++;
  }

  scriptLogger.info({
    msg: 'URL verification completed',
    summary: `${successCount} out of ${testUrls.length} URLs are accessible`,
    successCount,
    totalUrls: testUrls.length,
    successRate: `${Math.round((successCount / testUrls.length) * 100)}%`,
  });
}

main().catch((error) => {
  scriptLogger.error({
    msg: 'Unhandled error in main execution',
    error,
  });
});
