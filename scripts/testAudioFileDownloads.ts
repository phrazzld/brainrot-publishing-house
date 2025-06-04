#!/usr/bin/env node
import * as dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { performance } from 'perf_hooks';

import translations from '../translations/index.js';
import { logger as baseLogger } from '../utils/logger.js';

dotenv.config({ path: '.env.local' });

// Initialize logger
const logger = baseLogger.child({ script: 'audio-download-test' });

// Configuration
const TEST_ENVIRONMENTS = ['local', 'development', 'staging', 'production'];
const DEFAULT_ENVIRONMENT = 'local';
const BASE_URLS = {
  local: 'http://localhost:3000',
  development: process.env.DEV_URL || 'https://dev.example.com',
  staging: process.env.STAGING_URL || 'https://staging.example.com',
  production: process.env.PROD_URL || 'https://www.brainrot-publishing-house.com',
};

// Types for test data
interface TestBook {
  slug: string;
  title: string;
  hasFullAudiobook: boolean;
  chapters: { index: number; title: string }[];
}

interface TestResult {
  bookSlug: string;
  bookTitle: string;
  assetType: 'full' | 'chapter';
  chapterNumber?: number;
  chapterTitle?: string;
  testType: 'api' | 'proxy';
  url: string;
  success: boolean;
  status?: number;
  contentLength?: number;
  contentType?: string;
  durationMs: number;
  error?: string;
  checksum?: string;
}

interface TestSuite {
  environment: string;
  baseUrl: string;
  startTime: number;
  endTime: number;
  totalBooks: number;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  results: TestResult[];
  verificationDate: string;
}

/**
 * Get the current environment from command line args
 */
function getEnvironment(): string {
  const args = process.argv.slice(2);
  const envArg = args.find((arg) => arg.startsWith('--env='));
  let env = DEFAULT_ENVIRONMENT;

  if (envArg) {
    env = envArg.split('=')[1];
  }

  if (!TEST_ENVIRONMENTS.includes(env)) {
    logger.warn({
      msg: `Invalid environment: ${env}, defaulting to ${DEFAULT_ENVIRONMENT}`,
      providedEnv: env,
      defaultEnv: DEFAULT_ENVIRONMENT,
    });
    env = DEFAULT_ENVIRONMENT;
  }

  return env;
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  environment: string;
  booksToTest: string[] | 'all';
  skipFullAudiobooks: boolean;
  maxChapters: number | null;
} {
  const args = process.argv.slice(2);
  const environment = getEnvironment();

  const booksArg = args.find((arg) => arg.startsWith('--books='));
  let booksToTest: string[] | 'all' = 'all';

  if (booksArg) {
    const booksVal = booksArg.split('=')[1];
    booksToTest = booksVal === 'all' ? 'all' : booksVal.split(',');
  }

  const skipFullAudiobooks = args.includes('--skip-full');

  const maxChaptersArg = args.find((arg) => arg.startsWith('--max-chapters='));
  let maxChapters: number | null = null;
  if (maxChaptersArg) {
    const maxChaptersVal = parseInt(maxChaptersArg.split('=')[1], 10);
    maxChapters = isNaN(maxChaptersVal) ? null : maxChaptersVal;
  }

  return {
    environment,
    booksToTest,
    skipFullAudiobooks,
    maxChapters,
  };
}

/**
 * Calculate MD5 hash of a buffer for integrity verification
 */
function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Get test books from translations data
 */
function getTestBooks(options: {
  booksToTest: string[] | 'all';
  maxChapters: number | null;
}): TestBook[] {
  const testBooks: TestBook[] = [];

  for (const book of translations) {
    // Skip books that aren't in the list if specific books were requested
    if (options.booksToTest !== 'all' && !options.booksToTest.includes(book.slug)) {
      continue;
    }

    // Skip books that don't have chapters
    if (!book.chapters || book.chapters.length === 0) {
      continue;
    }

    // Assume it has a full audiobook if it has chapters (we'll check actual accessibility separately)
    const hasFullAudiobook = true;

    // Limit chapters if maxChapters is set
    const chaptersToTest =
      options.maxChapters !== null ? book.chapters.slice(0, options.maxChapters) : book.chapters;

    // Map chapters to expected format
    const chapters = chaptersToTest.map((chapter, index) => ({
      index: index + 1,
      title: chapter.title,
    }));

    testBooks.push({
      slug: book.slug,
      title: book.title,
      hasFullAudiobook,
      chapters,
    });
  }

  return testBooks;
}

/**
 * Test the API endpoint for URL generation
 */
/**
 * API endpoint test arguments
 */
interface ApiEndpointTestArgs {
  baseUrl: string;
  book: TestBook;
  type: 'full' | 'chapter';
  chapterNumber?: number;
  chapterTitle?: string;
}

/**
 * Test the API endpoint for URL generation
 */
async function testApiEndpoint({
  baseUrl,
  book,
  type,
  chapterNumber,
  chapterTitle,
}: ApiEndpointTestArgs): Promise<TestResult> {
  const startTime = performance.now();
  const params = new URLSearchParams({
    slug: book.slug,
    type,
    ...(chapterNumber ? { chapter: String(chapterNumber) } : {}),
  });

  const apiUrl = `${baseUrl}/api/download?${params.toString()}`;

  const result: TestResult = {
    bookSlug: book.slug,
    bookTitle: book.title,
    assetType: type,
    chapterNumber: chapterNumber,
    chapterTitle: chapterTitle,
    testType: 'api',
    url: apiUrl,
    success: false,
    durationMs: 0,
  };

  try {
    logger.info({
      msg: `Testing API endpoint for ${book.slug} ${type}${chapterNumber ? ` chapter ${chapterNumber}` : ''}`,
      url: apiUrl,
    });

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'BrainrotPublishingHouseAudioTest/1.0',
      },
    });

    result.status = response.status;

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      return result;
    }

    const data = await response.json();

    // Check that the URL is returned correctly
    if (!data.url) {
      result.error = 'API response did not include download URL';
      return result;
    }

    // Try to access the URL to verify it works (just a HEAD request)
    const urlVerification = await fetch(data.url, { method: 'HEAD' });

    result.success = urlVerification.ok;
    result.contentType = urlVerification.headers.get('content-type') || undefined;
    result.contentLength =
      parseInt(urlVerification.headers.get('content-length') || '0', 10) || undefined;

    if (!urlVerification.ok) {
      result.error = `API returned URL, but URL is not accessible: HTTP ${urlVerification.status}`;
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    result.durationMs = Math.round(performance.now() - startTime);
  }

  return result;
}

/**
 * Proxy endpoint test arguments
 */
interface ProxyEndpointTestArgs {
  baseUrl: string;
  book: TestBook;
  type: 'full' | 'chapter';
  chapterNumber?: number;
  chapterTitle?: string;
}

/**
 * Test the proxy download functionality
 */
async function testProxyEndpoint({
  baseUrl,
  book,
  type,
  chapterNumber,
  chapterTitle,
}: ProxyEndpointTestArgs): Promise<TestResult> {
  const startTime = performance.now();
  const params = new URLSearchParams({
    slug: book.slug,
    type,
    ...(chapterNumber ? { chapter: String(chapterNumber) } : {}),
    proxy: 'true',
  });

  const proxyUrl = `${baseUrl}/api/download?${params.toString()}`;

  const result: TestResult = {
    bookSlug: book.slug,
    bookTitle: book.title,
    assetType: type,
    chapterNumber: chapterNumber,
    chapterTitle: chapterTitle,
    testType: 'proxy',
    url: proxyUrl,
    success: false,
    durationMs: 0,
  };

  try {
    logger.info({
      msg: `Testing proxy endpoint for ${book.slug} ${type}${chapterNumber ? ` chapter ${chapterNumber}` : ''}`,
      url: proxyUrl,
    });

    // First, just check if the proxy is accessible with a HEAD request
    const headResponse = await fetch(proxyUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'BrainrotPublishingHouseAudioTest/1.0',
      },
    });

    result.status = headResponse.status;
    result.contentType = headResponse.headers.get('content-type') || undefined;
    result.contentLength =
      parseInt(headResponse.headers.get('content-length') || '0', 10) || undefined;

    if (!headResponse.ok) {
      result.error = `HTTP ${headResponse.status}: ${headResponse.statusText}`;
      return result;
    }

    // If the HEAD request is successful, we'll consider the test successful without actually downloading the file
    // This is to avoid excessive bandwidth usage during testing
    result.success = true;

    // Calculate a checksum only for small files (< 5MB) to verify integrity
    if (result.contentLength && result.contentLength < 5 * 1024 * 1024) {
      // Get a small sample of the file to check integrity (e.g., first 1KB)
      const sampleResponse = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'BrainrotPublishingHouseAudioTest/1.0',
          Range: 'bytes=0-1023', // First 1KB
        },
      });

      if (sampleResponse.ok) {
        const buffer = Buffer.from(await sampleResponse.arrayBuffer());
        result.checksum = calculateChecksum(buffer);
      }
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    result.durationMs = Math.round(performance.now() - startTime);
  }

  return result;
}

/**
 * Test a book's download capabilities - both API URL generation and proxy download
 */
async function testBookDownloads(
  baseUrl: string,
  book: TestBook,
  options: { skipFullAudiobooks: boolean },
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test full audiobook if available and not skipped
  if (book.hasFullAudiobook && !options.skipFullAudiobooks) {
    logger.info({
      msg: `Testing full audiobook for ${book.title} (${book.slug})`,
    });

    // Test API endpoint (URL generation)
    results.push(
      await testApiEndpoint({
        baseUrl,
        book,
        type: 'full',
      }),
    );

    // Test proxy endpoint (direct download)
    results.push(
      await testProxyEndpoint({
        baseUrl,
        book,
        type: 'full',
      }),
    );
  }

  // Test each chapter
  for (const chapter of book.chapters) {
    logger.info({
      msg: `Testing chapter ${chapter.index} for ${book.title} (${book.slug})`,
      chapter,
    });

    // Test API endpoint (URL generation)
    results.push(
      await testApiEndpoint({
        baseUrl,
        book,
        type: 'chapter',
        chapterNumber: chapter.index,
        chapterTitle: chapter.title,
      }),
    );

    // Test proxy endpoint (direct download)
    results.push(
      await testProxyEndpoint({
        baseUrl,
        book,
        type: 'chapter',
        chapterNumber: chapter.index,
        chapterTitle: chapter.title,
      }),
    );
  }

  return results;
}

/**
 * Generate an HTML report from test results
 */
function generateHtmlReport(testSuite: TestSuite): string {
  const successRate = (testSuite.successfulTests / testSuite.totalTests) * 100;
  const totalDuration = testSuite.endTime - testSuite.startTime;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audio Downloads Test Results - ${testSuite.environment}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
    h1, h2, h3 { margin-top: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .success { color: #2e7d32; }
    .failure { color: #c62828; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
    tr.success { background-color: #e8f5e9; }
    tr.failure { background-color: #ffebee; }
    .content-length { text-align: right; }
    .duration { text-align: right; }
    .book-header { background-color: #f0f0f0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Audio Downloads Test Results</h1>
    
    <div class="summary">
      <h2>Summary</h2>
      <p><strong>Environment:</strong> ${testSuite.environment}</p>
      <p><strong>Base URL:</strong> ${testSuite.baseUrl}</p>
      <p><strong>Test Date:</strong> ${new Date(testSuite.verificationDate).toLocaleString()}</p>
      <p><strong>Total Duration:</strong> ${(totalDuration / 1000).toFixed(2)}s</p>
      <p><strong>Books Tested:</strong> ${testSuite.totalBooks}</p>
      <p><strong>Total Tests:</strong> ${testSuite.totalTests}</p>
      <p><strong>Success Rate:</strong> <span class="${successRate === 100 ? 'success' : 'failure'}">${successRate.toFixed(2)}%</span> (${testSuite.successfulTests} passed, ${testSuite.failedTests} failed)</p>
    </div>

    <h2>Test Results by Book</h2>
    
    <!-- Group results by book -->
    ${Array.from(new Set(testSuite.results.map((r) => r.bookSlug)))
      .map((bookSlug) => {
        const bookResults = testSuite.results.filter((r) => r.bookSlug === bookSlug);
        const bookSuccessRate =
          (bookResults.filter((r) => r.success).length / bookResults.length) * 100;
        const bookInfo = bookResults[0]; // Use the first result to get book title

        return `
      <h3>${bookInfo.bookTitle} (${bookSlug})</h3>
      <p>Success Rate: <span class="${bookSuccessRate === 100 ? 'success' : 'failure'}">${bookSuccessRate.toFixed(2)}%</span></p>
      
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Test Type</th>
            <th>Status</th>
            <th>Content Type</th>
            <th class="content-length">Size (KB)</th>
            <th class="duration">Duration (ms)</th>
          </tr>
        </thead>
        <tbody>
          ${bookResults
            .map((result) => {
              const assetName =
                result.assetType === 'full'
                  ? 'Full Audiobook'
                  : `Chapter ${result.chapterNumber}: ${result.chapterTitle || ''}`;

              return `
            <tr class="${result.success ? 'success' : 'failure'}">
              <td>${assetName}</td>
              <td>${result.testType === 'api' ? 'API' : 'Proxy'}</td>
              <td>${result.success ? '<span class="success">✓ Success</span>' : `<span class="failure">✗ Failed: ${result.error}</span>`}</td>
              <td>${result.contentType || 'N/A'}</td>
              <td class="content-length">${result.contentLength ? (result.contentLength / 1024).toFixed(2) : 'N/A'}</td>
              <td class="duration">${result.durationMs}</td>
            </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
      `;
      })
      .join('')}
  </div>
</body>
</html>
  `;
}

/**
 * Main function to run all tests
 */
async function runTests() {
  const options = parseArgs();
  const environment = options.environment;
  const baseUrl = BASE_URLS[environment as keyof typeof BASE_URLS];

  logger.info({
    msg: `🔍 Running audio download tests in ${environment} environment (${baseUrl})`,
    options,
  });

  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'test-reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Get test books
    const testBooks = getTestBooks({
      booksToTest: options.booksToTest,
      maxChapters: options.maxChapters,
    });

    logger.info({
      msg: `Found ${testBooks.length} books to test`,
      bookCount: testBooks.length,
      books: testBooks.map((b) => b.slug),
    });

    // Initialize test suite
    const testSuite: TestSuite = {
      environment,
      baseUrl,
      startTime: performance.now(),
      endTime: 0,
      totalBooks: testBooks.length,
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      results: [],
      verificationDate: new Date().toISOString(),
    };

    // Run tests for each book
    for (const book of testBooks) {
      logger.info({
        msg: `Testing downloads for book: ${book.title} (${book.slug})`,
        book,
      });

      const bookResults = await testBookDownloads(baseUrl, book, {
        skipFullAudiobooks: options.skipFullAudiobooks,
      });

      testSuite.results.push(...bookResults);

      // Log per-book results
      const bookSuccessCount = bookResults.filter((r) => r.success).length;
      const bookFailCount = bookResults.length - bookSuccessCount;

      logger.info({
        msg: `Completed tests for ${book.title}: ${bookSuccessCount} passed, ${bookFailCount} failed`,
        bookSlug: book.slug,
        totalTests: bookResults.length,
        passed: bookSuccessCount,
        failed: bookFailCount,
      });
    }

    // Finalize results
    testSuite.endTime = performance.now();
    testSuite.totalTests = testSuite.results.length;
    testSuite.successfulTests = testSuite.results.filter((r) => r.success).length;
    testSuite.failedTests = testSuite.totalTests - testSuite.successfulTests;

    // Generate and save reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlReportPath = path.join(outputDir, `audio-downloads-${environment}-${timestamp}.html`);
    const jsonReportPath = path.join(outputDir, `audio-downloads-${environment}-${timestamp}.json`);

    fs.writeFileSync(htmlReportPath, generateHtmlReport(testSuite));
    fs.writeFileSync(jsonReportPath, JSON.stringify(testSuite, null, 2));

    // Log summary
    const successRate = (testSuite.successfulTests / testSuite.totalTests) * 100;
    const duration = (testSuite.endTime - testSuite.startTime) / 1000;

    logger.info({
      msg: `✅ Tests completed in ${duration.toFixed(2)}s. Reports saved to:`,
      duration: duration.toFixed(2),
      htmlReportPath,
      jsonReportPath,
    });

    logger.info({
      msg: '📊 Summary:',
      totalBooks: testSuite.totalBooks,
      totalTests: testSuite.totalTests,
      successful: testSuite.successfulTests,
      failed: testSuite.failedTests,
      successRate: `${successRate.toFixed(2)}%`,
    });

    // Return failure exit code if any tests failed
    if (testSuite.failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    logger.error({
      msg: 'Fatal error running tests:',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Execute the tests
runTests().catch((error) => {
  logger.error({
    msg: 'Unhandled error running tests:',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
