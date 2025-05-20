#!/usr/bin/env tsx
/**
 * Verify standardized URLs are working correctly
 */
import * as dotenv from 'dotenv';

import translations from '../translations/index.js';
import { Translation } from '../translations/types.js';
import { getAssetUrl } from '../utils/getBlobUrl.js';
import { Logger, createRequestLogger } from '../utils/logger.js';

// Create a verification-specific logger
const verifyLogger = createRequestLogger('verify-standardized-urls');

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Tests a URL and logs the results
 */
async function testUrl(path: string, description: string) {
  const url = getAssetUrl(path, true);
  const testLogger = verifyLogger.child({ path, description });

  testLogger.info({ msg: `Testing URL for ${description}` });
  testLogger.info({ path, url, msg: 'Generated URL' });

  try {
    const response = await fetch(url, { method: 'HEAD' });
    const status = response.status;
    const ok = response.ok;

    testLogger.info({
      status,
      ok,
      msg: `Response status: ${status} ${ok ? '✅' : '❌'}`,
    });

    if (status === 404) {
      // Try to fetch actual content to get error details
      const actualResponse = await fetch(url);
      const text = await actualResponse.text();
      if (text.includes('404')) {
        testLogger.error({ msg: 'File not found at URL' });
      }
    }
  } catch (error) {
    testLogger.error({ error, msg: 'Error fetching URL' });
  }
}

/**
 * Tests specific predefined paths
 */
async function testSpecificPaths() {
  const testPaths = [
    // Hamlet text (standard format)
    { path: '/assets/text/hamlet/brainrot-act-01.txt', desc: 'Hamlet Act 1 (standard)' },

    // Iliad text (non-standard format)
    { path: '/assets/the-iliad/text/book-01.txt', desc: 'Iliad Book 1 (non-standard)' },

    // Odyssey text
    { path: '/assets/the-odyssey/text/book-01.txt', desc: 'Odyssey Book 1 (non-standard)' },

    // Images
    { path: '/assets/hamlet/images/hamlet-07.png', desc: 'Hamlet cover image' },
    { path: '/assets/the-iliad/images/the-iliad-01.png', desc: 'Iliad cover image' },
  ];

  for (const test of testPaths) {
    await testUrl(test.path, test.desc);
  }
}

/**
 * Tests a book's chapter URL
 */
async function testBookChapter(book: Translation, bookLogger: Logger) {
  // Test first chapter text
  if (book.chapters.length > 0) {
    const chapter = book.chapters[0];
    if (chapter.text) {
      bookLogger.info({ url: chapter.text, msg: `Chapter 1 text URL` });
      try {
        const response = await fetch(chapter.text, { method: 'HEAD' });
        bookLogger.info({
          status: response.status,
          ok: response.ok,
          msg: `Text status: ${response.status} ${response.ok ? '✅' : '❌'}`,
        });
      } catch (error) {
        bookLogger.error({ error, msg: 'Error fetching chapter text' });
      }
    }
  }
}

/**
 * Tests a book's cover image URL
 */
async function testBookCover(book: Translation, bookLogger: Logger) {
  if (book.coverImage) {
    bookLogger.info({ url: book.coverImage, msg: `Cover image URL` });
    try {
      const response = await fetch(book.coverImage, { method: 'HEAD' });
      bookLogger.info({
        status: response.status,
        ok: response.ok,
        msg: `Cover status: ${response.status} ${response.ok ? '✅' : '❌'}`,
      });
    } catch (error) {
      bookLogger.error({ error, msg: 'Error fetching cover image' });
    }
  }
}

/**
 * Tests URLs from book translations
 */
async function testTranslationUrls() {
  verifyLogger.info({ msg: '=== Testing Translation URLs ===' });

  const booksToTest = ['hamlet', 'the-iliad', 'the-odyssey'];

  for (const bookSlug of booksToTest) {
    const book = translations.find((t) => t.slug === bookSlug);
    if (!book) continue;

    const bookLogger = verifyLogger.child({ book: book.title, slug: bookSlug });
    bookLogger.info({ msg: `Testing book URLs` });

    await testBookChapter(book, bookLogger);
    await testBookCover(book, bookLogger);
  }
}

/**
 * Main function that orchestrates the verification
 */
async function main() {
  verifyLogger.info({ msg: '=== Verifying Standardized URLs ===' });
  verifyLogger.info({
    baseUrl: process.env.NEXT_PUBLIC_BLOB_BASE_URL,
    msg: 'Using Blob base URL',
  });

  await testSpecificPaths();
  await testTranslationUrls();
}

main().catch((error) => {
  verifyLogger.error({ error, msg: 'Verification process failed' });
  process.exit(1);
});
