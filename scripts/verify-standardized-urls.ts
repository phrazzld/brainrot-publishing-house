#!/usr/bin/env tsx
/**
 * Verify standardized URLs are working correctly
 */
import * as dotenv from 'dotenv';

import translations from '../translations/index.js';
import { getAssetUrl } from '../utils/getBlobUrl.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testUrl(path: string, description: string) {
  const url = getAssetUrl(path, true);
  console.log(`\n${description}:`);
  console.log(`  Input: ${path}`);
  console.log(`  URL: ${url}`);

  try {
    const response = await fetch(url, { method: 'HEAD' });
    console.log(`  Status: ${response.status} ${response.ok ? '✅' : '❌'}`);

    if (response.status === 404) {
      // Try to fetch actual content to get error details
      const actualResponse = await fetch(url);
      const text = await actualResponse.text();
      if (text.includes('404')) {
        console.log(`  Error: File not found at URL`);
      }
    }
  } catch (error) {
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log('=== Verifying Standardized URLs ===');
  console.log(`NEXT_PUBLIC_BLOB_BASE_URL: ${process.env.NEXT_PUBLIC_BLOB_BASE_URL}`);

  // Test specific paths
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

  // Test actual translation URLs
  console.log('\n\n=== Testing Translation URLs ===');

  const booksToTest = ['hamlet', 'the-iliad', 'the-odyssey'];

  for (const bookSlug of booksToTest) {
    const book = translations.find((t) => t.slug === bookSlug);
    if (!book) continue;

    console.log(`\n${book.title}:`);

    // Test first chapter text
    if (book.chapters.length > 0) {
      const chapter = book.chapters[0];
      if (chapter.text) {
        console.log(`  Chapter 1 text URL: ${chapter.text}`);
        try {
          const response = await fetch(chapter.text, { method: 'HEAD' });
          console.log(`  Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
        } catch (error) {
          console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    // Test cover image
    if (book.coverImage) {
      console.log(`  Cover image URL: ${book.coverImage}`);
      try {
        const response = await fetch(book.coverImage, { method: 'HEAD' });
        console.log(`  Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}

main().catch(console.error);
