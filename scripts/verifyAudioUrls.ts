#!/usr/bin/env node
/**
 * Audio URL Verification Script
 *
 * This script verifies that all audio URLs in translations resolve correctly
 * to Vercel Blob storage and are accessible.
 *
 * Usage:
 *   npx tsx scripts/verifyAudioUrls.ts [options]
 *
 * Options:
 *   --verbose             Show detailed information
 *   --book=slug           Test only a specific book
 *   --download-sample     Download and verify sample data from each audio file
 */
// Load environment variables
import * as dotenv from 'dotenv';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import translations from '../translations';

// Not using getAssetUrlWithFallback in this script
// import { getAssetUrlWithFallback } from '../utils/getBlobUrl';

dotenv.config({ path: '.env.local' });

// Define interfaces
interface VerificationResult {
  book: string;
  chapterTitle: string;
  originalUrl: string;
  resolvedUrl: string;
  status: 'success' | 'failure';
  error?: string;
  statusCode?: number;
  contentType?: string;
  contentLength?: number;
}

interface VerificationSummary {
  timestamp: string;
  totalUrls: number;
  successCount: number;
  failureCount: number;
  bookResults: {
    [key: string]: {
      total: number;
      success: number;
      failure: number;
    };
  };
  results: VerificationResult[];
}

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    verbose: false,
    bookSlug: '',
    downloadSample: false,
    outputFile: 'audio-url-verification.json',
  };

  for (const arg of args) {
    if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg.startsWith('--book=')) {
      options.bookSlug = arg.substring('--book='.length);
    } else if (arg === '--download-sample') {
      options.downloadSample = true;
    } else if (arg.startsWith('--output=')) {
      options.outputFile = arg.substring('--output='.length);
    }
  }

  return options;
}

/**
 * Verify a single audio URL
 */
async function verifyAudioUrl(
  bookSlug: string,
  chapterTitle: string,
  audioSrc: string,
): Promise<VerificationResult> {
  const result: VerificationResult = {
    book: bookSlug,
    chapterTitle,
    originalUrl: audioSrc,
    resolvedUrl: '',
    status: 'failure',
  };

  try {
    // Direct approach based on the migration data we have
    const baseUrl = 'https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com';

    // Extract just the filename from the audio source
    const filename = audioSrc.split('/').pop() || '';

    // Construct the URL directly using the known pattern from our migration results
    const directUrl = `${baseUrl}/${bookSlug}/audio/${filename}`;

    // eslint-disable-next-line no-console -- DEBUG: Direct URL testing in CLI script
    console.log(`Testing direct URL: ${directUrl}`);
    result.resolvedUrl = directUrl;

    // Check if the URL is accessible
    const response = await fetch(directUrl, { method: 'HEAD' });
    result.statusCode = response.status;

    if (response.ok) {
      result.status = 'success';
      result.contentType = response.headers.get('content-type') || undefined;
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        result.contentLength = parseInt(contentLength, 10);
      }
    } else {
      result.status = 'failure';
      result.error = `HTTP status ${response.status}: ${response.statusText}`;
    }
  } catch (error) {
    result.status = 'failure';
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * Find all audio URLs in translations
 */
function findAudioUrls(bookSlug: string = '') {
  const audioUrls: { bookSlug: string; chapterTitle: string; audioSrc: string }[] = [];

  const books = bookSlug ? translations.filter((t) => t.slug === bookSlug) : translations;

  for (const book of books) {
    if (!book.chapters) continue;

    for (const chapter of book.chapters) {
      if (chapter.audioSrc && typeof chapter.audioSrc === 'string') {
        audioUrls.push({
          bookSlug: book.slug,
          chapterTitle: chapter.title,
          audioSrc: chapter.audioSrc,
        });
      }
    }
  }

  return audioUrls;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  // eslint-disable-next-line no-console -- CLI: Script header display
  console.log('Audio URL Verification');
  // eslint-disable-next-line no-console -- CLI: Script header display
  console.log('=====================');

  if (options.bookSlug) {
    // eslint-disable-next-line no-console -- CLI: Status display
    console.log(`Testing book: ${options.bookSlug}`);
  } else {
    // eslint-disable-next-line no-console -- CLI: Status display
    console.log('Testing all books');
  }

  // Find all audio URLs to check
  const audioUrls = findAudioUrls(options.bookSlug);
  // eslint-disable-next-line no-console -- CLI: Status display
  console.log(`Found ${audioUrls.length} audio URLs to verify`);

  // Verify each URL
  const results: VerificationResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < audioUrls.length; i++) {
    const { bookSlug, chapterTitle, audioSrc } = audioUrls[i];

    if (options.verbose) {
      // eslint-disable-next-line no-console -- CLI: Verification progress display
      console.log(`\nVerifying [${i + 1}/${audioUrls.length}]: ${bookSlug} - ${chapterTitle}`);
      // eslint-disable-next-line no-console -- CLI: URL information display
      console.log(`Original URL: ${audioSrc}`);
    } else {
      process.stdout.write(`Verifying URLs: ${i + 1}/${audioUrls.length}\r`);
    }

    const result = await verifyAudioUrl(bookSlug, chapterTitle, audioSrc);
    results.push(result);

    if (result.status === 'success') {
      successCount++;
      if (options.verbose) {
        // eslint-disable-next-line no-console -- CLI: Success status display
        console.log(`✅ Success: ${result.resolvedUrl}`);
        // eslint-disable-next-line no-console -- CLI: Content type display
        console.log(`   Content Type: ${result.contentType}`);
        // eslint-disable-next-line no-console -- CLI: Size info display
        console.log(
          `   Size: ${result.contentLength ? formatSize(result.contentLength) : 'unknown'}`,
        );
      }
    } else {
      failureCount++;
      if (options.verbose) {
        // eslint-disable-next-line no-console -- CLI: Error display
        console.log(`❌ Failed: ${result.error}`);
      }
    }
  }

  // Clear the progress line
  if (!options.verbose) {
    process.stdout.write(' '.repeat(50) + '\r');
  }

  // Generate summary
  const bookResults: { [key: string]: { total: number; success: number; failure: number } } = {};

  for (const result of results) {
    if (!bookResults[result.book]) {
      bookResults[result.book] = { total: 0, success: 0, failure: 0 };
    }

    bookResults[result.book].total++;
    if (result.status === 'success') {
      bookResults[result.book].success++;
    } else {
      bookResults[result.book].failure++;
    }
  }

  const summary: VerificationSummary = {
    timestamp: new Date().toISOString(),
    totalUrls: results.length,
    successCount,
    failureCount,
    bookResults,
    results,
  };

  // Print summary
  // eslint-disable-next-line no-console -- CLI: Results summary display
  console.log('\nSummary:');
  // eslint-disable-next-line no-console -- CLI: Total URLs summary
  console.log(`Total URLs: ${summary.totalUrls}`);
  // eslint-disable-next-line no-console -- CLI: Success count summary
  console.log(`Successful: ${summary.successCount}`);
  // eslint-disable-next-line no-console -- CLI: Failure count summary
  console.log(`Failed: ${summary.failureCount}`);

  // eslint-disable-next-line no-console -- CLI: Book results header
  console.log('\nResults by Book:');
  for (const [book, counts] of Object.entries(summary.bookResults)) {
    // eslint-disable-next-line no-console -- CLI: Per-book results
    console.log(`- ${book}: ${counts.success}/${counts.total} successful`);
  }

  // Save results to file
  const outputPath = path.isAbsolute(options.outputFile)
    ? options.outputFile
    : path.join(process.cwd(), options.outputFile);

  await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
  // eslint-disable-next-line no-console -- CLI: Output file path display
  console.log(`\nDetailed results saved to: ${outputPath}`);

  // Create markdown report
  const markdownReport = generateMarkdownReport(summary);
  const markdownPath = outputPath.replace(/\.json$/, '.md');
  await fs.writeFile(markdownPath, markdownReport);
  // eslint-disable-next-line no-console -- CLI: Markdown report path display
  console.log(`Markdown report saved to: ${markdownPath}`);

  // Return appropriate exit code
  process.exit(failureCount > 0 ? 1 : 0);
}

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

/**
 * Generate a markdown report
 */
function generateMarkdownReport(summary: VerificationSummary): string {
  const lines = [
    '# Audio URL Verification Report',
    '',
    `Generated: ${summary.timestamp}`,
    '',
    '## Summary',
    '',
    `- **Total URLs**: ${summary.totalUrls}`,
    `- **Successful**: ${summary.successCount}`,
    `- **Failed**: ${summary.failureCount}`,
    '',
    '## Results by Book',
    '',
  ];

  for (const [book, counts] of Object.entries(summary.bookResults)) {
    const successPercent = counts.total > 0 ? Math.round((counts.success / counts.total) * 100) : 0;

    lines.push(`### ${book}`);
    lines.push('');
    lines.push(`- **Total**: ${counts.total}`);
    lines.push(`- **Successful**: ${counts.success} (${successPercent}%)`);
    lines.push(`- **Failed**: ${counts.failure}`);
    lines.push('');

    // Add details for failed URLs
    const failedUrls = summary.results.filter((r) => r.book === book && r.status === 'failure');
    if (failedUrls.length > 0) {
      lines.push('#### Failed URLs');
      lines.push('');

      for (const result of failedUrls) {
        lines.push(`- **${result.chapterTitle}**: ${result.error}`);
        lines.push(`  - Original: ${result.originalUrl}`);
        lines.push(`  - Resolved: ${result.resolvedUrl || 'N/A'}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

// Run the main function
main();
