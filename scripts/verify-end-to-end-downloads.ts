import chalk from 'chalk';
import crypto from 'crypto';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { performance } from 'perf_hooks';

import { logger as _logger } from '../utils/logger';

// Configuration
const TEST_ENVIRONMENTS = ['local', 'development', 'staging', 'production'];
const BASE_URLS = {
  local: 'http://localhost:3000',
  development: process.env.DEV_URL || 'https://dev.example.com',
  staging: process.env.STAGING_URL || 'https://staging.example.com',
  production: process.env.PROD_URL || 'https://www.brainrot-publishing-house.com',
};

// Test data - we can expand this as needed
const TEST_BOOKS = [
  { slug: 'the-iliad', hasFullAudiobook: true, chapters: [1, 2] },
  { slug: 'hamlet', hasFullAudiobook: true, chapters: [1, 2] },
  { slug: 'the-aeneid', hasFullAudiobook: true, chapters: [1, 2] },
];

// Types for test data
interface TestResult {
  assetType: string;
  bookSlug: string;
  assetName: string;
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
  totalTests: number;
  successful: number;
  failed: number;
  results: TestResult[];
}

/**
 * Get the current environment from command line args
 */
function getEnvironment(): string {
  const args = process.argv.slice(2);
  const envArg = args.find((arg) => arg.startsWith('--env='));
  let env = 'local';

  if (envArg) {
    env = envArg.split('=')[1];
  }

  if (!TEST_ENVIRONMENTS.includes(env)) {
    logger.warn({ message: `Invalid environment: ${env}, defaulting to local` });
    env = 'local';
  }

  return env;
}

/**
 * Calculate MD5 hash of a buffer for integrity verification
 */
function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Test a direct URL fetch
 */
async function testDirectUrl(
  url: string,
  expected: { type: string; slug: string; asset: string }
): Promise<TestResult> {
  const startTime = performance.now();
  const result: TestResult = {
    assetType: expected.type,
    bookSlug: expected.slug,
    assetName: expected.asset,
    url,
    success: false,
    durationMs: 0,
  };

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BrainrotPublishingHouseE2ETest/1.0',
      },
    });

    result.status = response.status;
    result.contentType = response.headers.get('content-type') || undefined;
    result.contentLength = parseInt(response.headers.get('content-length') || '0', 10) || undefined;

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      return result;
    }

    // Download the content to calculate checksum
    const buffer = Buffer.from(await response.arrayBuffer());
    result.checksum = calculateChecksum(buffer);
    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    result.durationMs = Math.round(performance.now() - startTime);
  }

  return result;
}

/**
 * Test the API endpoint for URL generation
 */
async function testApiEndpoint(
  baseUrl: string,
  slug: string,
  type: 'full' | 'chapter',
  chapter?: number
): Promise<TestResult> {
  const startTime = performance.now();
  const params = new URLSearchParams({
    slug,
    type,
    ...(chapter ? { chapter: String(chapter) } : {}),
  });

  const assetName =
    type === 'full' ? 'full-audiobook.mp3' : `chapter-${String(chapter).padStart(2, '0')}.mp3`;
  const apiUrl = `${baseUrl}/api/download?${params.toString()}`;

  const result: TestResult = {
    assetType: 'audio',
    bookSlug: slug,
    assetName,
    url: apiUrl,
    success: false,
    durationMs: 0,
  };

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'BrainrotPublishingHouseE2ETest/1.0',
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

    // Verify the actual URL works
    const urlVerification = await testDirectUrl(data.url, {
      type: 'audio',
      slug,
      asset: assetName,
    });

    // Update result with URL verification data
    result.success = urlVerification.success;
    result.contentType = urlVerification.contentType;
    result.contentLength = urlVerification.contentLength;
    result.checksum = urlVerification.checksum;

    if (!urlVerification.success) {
      result.error = `API returned URL, but accessing URL failed: ${urlVerification.error}`;
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    result.durationMs = Math.round(performance.now() - startTime);
  }

  return result;
}

/**
 * Test the proxy download functionality
 */
async function testProxyEndpoint(
  baseUrl: string,
  slug: string,
  type: 'full' | 'chapter',
  chapter?: number
): Promise<TestResult> {
  const startTime = performance.now();
  const params = new URLSearchParams({
    slug,
    type,
    ...(chapter ? { chapter: String(chapter) } : {}),
    proxy: 'true',
  });

  const assetName =
    type === 'full' ? 'full-audiobook.mp3' : `chapter-${String(chapter).padStart(2, '0')}.mp3`;
  const proxyUrl = `${baseUrl}/api/download?${params.toString()}`;

  const result: TestResult = {
    assetType: 'audio',
    bookSlug: slug,
    assetName,
    url: proxyUrl,
    success: false,
    durationMs: 0,
  };

  try {
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'BrainrotPublishingHouseE2ETest/1.0',
      },
    });

    result.status = response.status;
    result.contentType = response.headers.get('content-type') || undefined;
    result.contentLength = parseInt(response.headers.get('content-length') || '0', 10) || undefined;

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      return result;
    }

    // Download the content to calculate checksum
    const buffer = Buffer.from(await response.arrayBuffer());
    result.checksum = calculateChecksum(buffer);
    result.success = true;
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
  book: { slug: string; hasFullAudiobook: boolean; chapters: number[] }
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test API endpoint for full audiobook if available
  if (book.hasFullAudiobook) {
    logger.info({ message: `Testing full audiobook API endpoint for ${book.slug}` });
    results.push(await testApiEndpoint(baseUrl, book.slug, 'full'));

    logger.info({ message: `Testing full audiobook proxy endpoint for ${book.slug}` });
    results.push(await testProxyEndpoint(baseUrl, book.slug, 'full'));
  }

  // Test API endpoint for each chapter
  for (const chapter of book.chapters) {
    logger.info({ message: `Testing chapter ${chapter} API endpoint for ${book.slug}` });
    results.push(await testApiEndpoint(baseUrl, book.slug, 'chapter', chapter));

    logger.info({ message: `Testing chapter ${chapter} proxy endpoint for ${book.slug}` });
    results.push(await testProxyEndpoint(baseUrl, book.slug, 'chapter', chapter));
  }

  return results;
}

/**
 * Generate an HTML report from test results
 */
function generateHtmlReport(testSuite: TestSuite): string {
  const successRate = (testSuite.successful / testSuite.totalTests) * 100;
  const totalDuration = testSuite.endTime - testSuite.startTime;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download E2E Test Results - ${testSuite.environment}</title>
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
  </style>
</head>
<body>
  <div class="container">
    <h1>Download E2E Test Results</h1>
    
    <div class="summary">
      <h2>Summary</h2>
      <p><strong>Environment:</strong> ${testSuite.environment}</p>
      <p><strong>Base URL:</strong> ${testSuite.baseUrl}</p>
      <p><strong>Test Date:</strong> ${new Date().toISOString()}</p>
      <p><strong>Total Duration:</strong> ${(totalDuration / 1000).toFixed(2)}s</p>
      <p><strong>Tests:</strong> ${testSuite.totalTests}</p>
      <p><strong>Success Rate:</strong> <span class="${successRate === 100 ? 'success' : 'failure'}">${successRate.toFixed(2)}%</span> (${testSuite.successful} passed, ${testSuite.failed} failed)</p>
    </div>

    <h2>Test Results</h2>
    <table>
      <thead>
        <tr>
          <th>Book</th>
          <th>Asset</th>
          <th>Test Type</th>
          <th>Status</th>
          <th>Content Type</th>
          <th class="content-length">Size (KB)</th>
          <th class="duration">Duration (ms)</th>
        </tr>
      </thead>
      <tbody>
        ${testSuite.results
          .map((result) => {
            const isProxy = result.url.includes('proxy=true');
            return `
            <tr class="${result.success ? 'success' : 'failure'}">
              <td>${result.bookSlug}</td>
              <td>${result.assetName}</td>
              <td>${isProxy ? 'Proxy' : 'Direct API'}</td>
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
  </div>
</body>
</html>
  `;
}

/**
 * Generate a JSON report from test results
 */
function generateJsonReport(testSuite: TestSuite): string {
  return JSON.stringify(testSuite, null, 2);
}

/**
 * Main function to run all tests
 */
async function runTests() {
  const environment = getEnvironment();
  const baseUrl = BASE_URLS[environment as keyof typeof BASE_URLS];

  logger.info({ message: `Running download E2E tests in ${environment} environment (${baseUrl})` });

  const testSuite: TestSuite = {
    environment,
    baseUrl,
    startTime: performance.now(),
    endTime: 0,
    totalTests: 0,
    successful: 0,
    failed: 0,
    results: [],
  };

  // Run tests for each book
  for (const book of TEST_BOOKS) {
    logger.info({ message: `Testing downloads for book: ${book.slug}` });
    const bookResults = await testBookDownloads(baseUrl, book);
    testSuite.results.push(...bookResults);
  }

  // Finalize results
  testSuite.endTime = performance.now();
  testSuite.totalTests = testSuite.results.length;
  testSuite.successful = testSuite.results.filter((r) => r.success).length;
  testSuite.failed = testSuite.totalTests - testSuite.successful;

  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'test-reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save reports
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlPath = path.join(outputDir, `download-e2e-${environment}-${timestamp}.html`);
  const jsonPath = path.join(outputDir, `download-e2e-${environment}-${timestamp}.json`);

  fs.writeFileSync(htmlPath, generateHtmlReport(testSuite));
  fs.writeFileSync(jsonPath, generateJsonReport(testSuite));

  // Log results
  const successRate = (testSuite.successful / testSuite.totalTests) * 100;
  logger.info({
    message: `Tests completed: ${testSuite.totalTests} total, ${testSuite.successful} passed, ${testSuite.failed} failed (${successRate.toFixed(2)}% success rate)`,
  });
  logger.info({ message: `Reports saved to ${htmlPath} and ${jsonPath}` });

  // Log some colored summary to the console
  // Using console.warn is allowed by the linting rules
  console.warn('\n=======================================');
  console.warn(chalk.bold(`Download E2E Test Results (${environment})`));
  console.warn('=======================================');
  console.warn(`Total Tests: ${chalk.bold(testSuite.totalTests)}`);
  console.warn(`Passed: ${chalk.green.bold(testSuite.successful)}`);
  console.warn(`Failed: ${chalk.red.bold(testSuite.failed)}`);
  console.warn(
    `Success Rate: ${successRate === 100 ? chalk.green.bold(`${successRate.toFixed(2)}%`) : chalk.yellow.bold(`${successRate.toFixed(2)}%`)}`
  );
  console.warn(`Duration: ${chalk.bold((testSuite.endTime - testSuite.startTime) / 1000)}s`);
  console.warn('=======================================');

  // Return failure exit code if any tests failed
  if (testSuite.failed > 0) {
    process.exit(1);
  }
}

// Execute the tests
runTests().catch((error) => {
  logger.error({ message: 'Fatal error running tests:', error });
  process.exit(1);
});
