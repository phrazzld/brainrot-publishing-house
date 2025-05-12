/* eslint-disable max-lines */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

// Import necessary modules and types
import { DownloadRequestParams } from '../services/downloadService';
import { assetExistsInBlobStorage, getAssetUrlWithFallback, getBlobUrl } from '../utils/getBlobUrl';
import { createRequestLogger, logger } from '../utils/logger';
import { blobPathService } from '../utils/services/BlobPathService';

const moduleLogger = logger.child({ module: 'verifyCdnUrls' });

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * URL Verification result structure
 */
interface UrlVerificationResult {
  slug: string;
  type: 'full' | 'chapter';
  chapter?: string;
  cdnUrl: string;
  fallbackUrl: string;
  blobUrl?: string;
  exists: {
    cdn: boolean;
    fallback: boolean;
    blob: boolean;
  };
  statusCodes: {
    cdn: number | null;
    fallback: number | null;
    blob: number | null;
  };
  headers: {
    cdn: Record<string, string>;
    fallback: Record<string, string>;
    blob: Record<string, string>;
  };
  errors: {
    cdn: string | null;
    fallback: string | null;
    blob: string | null;
  };
  durations: {
    cdn: number | null;
    fallback: number | null;
    blob: number | null;
  };
  environment: string;
}

/**
 * Command line options for the verification script
 */
interface VerificationOptions {
  books: string[];
  outputFile: string;
  format: 'json' | 'md';
  verbose: boolean;
  environment: string;
  checkCdn: boolean;
  checkFallback: boolean;
  checkBlob: boolean;
  timeoutMs: number;
  compareEnv: string | null;
  compareFile: string | null;
  maxConcurrent: number;
  headOnly: boolean;
}

/**
 * Default test books to use if none specified
 */
const DEFAULT_TEST_BOOKS = ['the-iliad', 'hamlet', 'the-odyssey', 'the-republic'];

/**
 * Mock of DownloadService just for testing purposes
 */
class MockDownloadService {
  private assetUrlResolver: {
    getAssetUrlWithFallback: typeof getAssetUrlWithFallback;
    convertLegacyPath: (path: string) => string;
  };

  constructor(assetUrlResolver: {
    getAssetUrlWithFallback: typeof getAssetUrlWithFallback;
    convertLegacyPath: (path: string) => string;
  }) {
    this.assetUrlResolver = assetUrlResolver;
  }

  // This is the method we expose for testing
  generatePaths(
    slug: string,
    type: 'full' | 'chapter',
    log: { info: (message: string) => void; error: (message: string) => void },
    chapter?: string
  ) {
    // Generate paths in a simplified way for testing only
    const cdnBase = 'https://brainrot-publishing.cdn.digitaloceanspaces.com';
    const assetPath =
      type === 'full'
        ? `/assets/${slug}/audio/full-audiobook.mp3`
        : `/assets/${slug}/audio/chapter-${chapter?.padStart(2, '0')}.mp3`;

    return {
      cdnUrl: `${cdnBase}${assetPath}`,
      legacyPath: assetPath,
    };
  }
}

/**
 * Helper function to create a MockDownloadService instance for testing
 */
function createDownloadService() {
  // Create a simple asset resolver for testing
  const assetUrlResolver = {
    getAssetUrlWithFallback: getAssetUrlWithFallback,
    convertLegacyPath: (path: string) => blobPathService.convertLegacyPath(path),
  };

  return new MockDownloadService(assetUrlResolver);
}

/**
 * Performs a HEAD request to check if a URL is accessible
 * @param url URL to check
 * @param timeoutMs Timeout in milliseconds
 * @returns Object with status code, headers, and error message if any
 */
async function checkUrlAccessibility(
  url: string,
  timeoutMs: number
): Promise<{
  exists: boolean;
  statusCode: number | null;
  headers: Record<string, string>;
  error: string | null;
  duration: number;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    const duration = Date.now() - startTime;
    clearTimeout(timeoutId);

    // Extract headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      exists: response.ok,
      statusCode: response.status,
      headers,
      error: null,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    clearTimeout(timeoutId);

    return {
      exists: false,
      statusCode: null,
      headers: {},
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  }
}

/**
 * Generates resource paths (CDN, fallback, blob) for a given asset
 * @param params Download request parameters
 * @param log Logger instance
 * @param verbose Whether to log verbose information
 * @returns Object containing generated URLs and paths
 */
function generateResourcePaths(
  params: DownloadRequestParams,
  log: ReturnType<typeof createRequestLogger>,
  verbose: boolean
): {
  cdnUrl: string;
  fallbackUrl: string;
  blobUrl?: string;
  legacyPath: string;
} {
  const { slug, type, chapter } = params;
  const downloadService = createDownloadService();

  // Generate the paths for this resource using internal method
  const { cdnUrl, legacyPath } = downloadService.generatePaths(slug, type, log, chapter);

  // Create the fallback URL (non-CDN)
  const fallbackUrl = cdnUrl.replace('.cdn.digitaloceanspaces.com', '.digitaloceanspaces.com');

  // Try to get a blob URL if possible
  let blobUrl: string | undefined;
  try {
    blobUrl = getBlobUrl(legacyPath);
  } catch (error) {
    if (verbose) {
      moduleLogger.warn(
        { error: error instanceof Error ? error.message : String(error), legacyPath },
        `Failed to generate Blob URL`
      );
    }
  }

  return {
    cdnUrl,
    fallbackUrl,
    blobUrl,
    legacyPath,
  };
}

/**
 * Initializes the verification result structure
 * @param params Asset parameters
 * @param urls URLs for the asset
 * @returns Initialized result structure
 */
function initializeVerificationResult(
  params: DownloadRequestParams,
  urls: {
    cdnUrl: string;
    fallbackUrl: string;
    blobUrl?: string;
  }
): UrlVerificationResult {
  const { slug, type, chapter } = params;
  const { cdnUrl, fallbackUrl, blobUrl } = urls;

  return {
    slug,
    type,
    chapter,
    cdnUrl,
    fallbackUrl,
    blobUrl,
    exists: {
      cdn: false,
      fallback: false,
      blob: false,
    },
    statusCodes: {
      cdn: null,
      fallback: null,
      blob: null,
    },
    headers: {
      cdn: {},
      fallback: {},
      blob: {},
    },
    errors: {
      cdn: null,
      fallback: null,
      blob: null,
    },
    durations: {
      cdn: null,
      fallback: null,
      blob: null,
    },
    environment: process.env.NODE_ENV || 'development',
  };
}

/**
 * Checks CDN URL accessibility and updates the result
 * @param cdnUrl URL to check
 * @param timeoutMs Timeout in milliseconds
 * @param verbose Whether to log verbose information
 * @returns Object with CDN check results
 */
async function checkCdnAccessibility(
  cdnUrl: string,
  timeoutMs: number,
  verbose: boolean
): Promise<{
  exists: boolean;
  statusCode: number | null;
  headers: Record<string, string>;
  error: string | null;
  duration: number;
}> {
  if (verbose) {
    moduleLogger.info({ cdnUrl }, `Checking CDN URL`);
  }

  const cdnCheck = await checkUrlAccessibility(cdnUrl, timeoutMs);

  if (verbose) {
    if (cdnCheck.exists) {
      moduleLogger.info(
        { statusCode: cdnCheck.statusCode, duration: cdnCheck.duration },
        `CDN URL accessible`
      );
    } else {
      moduleLogger.warn({ error: cdnCheck.error }, `CDN URL not accessible`);
    }
  }

  return cdnCheck;
}

/**
 * Checks fallback URL accessibility and updates the result
 * @param fallbackUrl URL to check
 * @param timeoutMs Timeout in milliseconds
 * @param verbose Whether to log verbose information
 * @returns Object with fallback check results
 */
async function checkFallbackAccessibility(
  fallbackUrl: string,
  timeoutMs: number,
  verbose: boolean
): Promise<{
  exists: boolean;
  statusCode: number | null;
  headers: Record<string, string>;
  error: string | null;
  duration: number;
}> {
  if (verbose) {
    moduleLogger.info({ fallbackUrl }, `Checking fallback URL`);
  }

  const fallbackCheck = await checkUrlAccessibility(fallbackUrl, timeoutMs);

  if (verbose) {
    if (fallbackCheck.exists) {
      moduleLogger.info(
        { statusCode: fallbackCheck.statusCode, duration: fallbackCheck.duration },
        `Fallback URL accessible`
      );
    } else {
      moduleLogger.warn({ error: fallbackCheck.error }, `Fallback URL not accessible`);
    }
  }

  return fallbackCheck;
}

/**
 * Checks Blob storage accessibility and updates the result
 * @param legacyPath Legacy asset path
 * @param blobUrl Generated Blob URL
 * @param timeoutMs Timeout in milliseconds
 * @param headOnly Whether to only check existence (not content)
 * @param verbose Whether to log verbose information
 * @returns Object with blob check results
 */
async function checkBlobAccessibility(
  legacyPath: string,
  blobUrl: string | undefined,
  timeoutMs: number,
  headOnly: boolean,
  verbose: boolean
): Promise<{
  exists: boolean;
  statusCode: number | null;
  headers: Record<string, string>;
  error: string | null;
  duration: number | null;
}> {
  const result = {
    exists: false,
    statusCode: null as number | null,
    headers: {} as Record<string, string>,
    error: null as string | null,
    duration: null as number | null,
  };

  if (!blobUrl) {
    return result;
  }

  if (verbose) {
    moduleLogger.info({ blobUrl }, `Checking Blob URL`);
  }

  try {
    const blobExists = await assetExistsInBlobStorage(legacyPath, {}, false);
    result.exists = blobExists;

    if (blobExists && !headOnly) {
      const blobCheck = await checkUrlAccessibility(blobUrl, timeoutMs);
      result.statusCode = blobCheck.statusCode;
      result.headers = blobCheck.headers;
      result.error = blobCheck.error;
      result.duration = blobCheck.duration;
    }

    if (verbose) {
      if (result.exists) {
        moduleLogger.info(`Blob storage has the asset`);
      } else {
        moduleLogger.warn(`Asset not found in Blob storage`);
      }
    }
  } catch (error) {
    result.exists = false;
    result.error = error instanceof Error ? error.message : String(error);

    if (verbose) {
      moduleLogger.error({ error: result.error }, `Error checking Blob URL`);
    }
  }

  return result;
}

/**
 * Updates verification result with check results
 * @param result Result object to update
 * @param checkType Type of check (cdn, fallback, blob)
 * @param checkResult Check results
 */
function updateResultWithCheckResults(
  result: UrlVerificationResult,
  checkType: 'cdn' | 'fallback' | 'blob',
  checkResult: {
    exists: boolean;
    statusCode: number | null;
    headers: Record<string, string>;
    error: string | null;
    duration: number | null;
  }
): void {
  result.exists[checkType] = checkResult.exists;
  result.statusCodes[checkType] = checkResult.statusCode;
  result.headers[checkType] = checkResult.headers;
  result.errors[checkType] = checkResult.error;
  result.durations[checkType] = checkResult.duration;
}

/**
 * Generates and validates a CDN URL for the given parameters
 * @param params Download request parameters
 * @param options Verification options
 * @returns Promise resolving to verification result
 */
async function verifyUrl(
  params: DownloadRequestParams,
  options: VerificationOptions
): Promise<UrlVerificationResult> {
  const { verbose, timeoutMs, headOnly, checkCdn, checkFallback, checkBlob } = options;

  // Create a logger with a correlation ID
  const correlationId = randomUUID();
  const log = createRequestLogger(correlationId);

  if (verbose) {
    moduleLogger.info(
      { slug: params.slug, type: params.type, chapter: params.chapter || 'N/A' },
      `Verifying URLs`
    );
  }

  // Generate paths for this resource
  const paths = generateResourcePaths(params, log, verbose);

  // Initialize the result structure
  const result = initializeVerificationResult(params, paths);

  // Perform the checks based on options
  if (checkCdn) {
    const cdnCheck = await checkCdnAccessibility(paths.cdnUrl, timeoutMs, verbose);
    updateResultWithCheckResults(result, 'cdn', cdnCheck);
  }

  if (checkFallback) {
    const fallbackCheck = await checkFallbackAccessibility(paths.fallbackUrl, timeoutMs, verbose);
    updateResultWithCheckResults(result, 'fallback', fallbackCheck);
  }

  if (checkBlob) {
    const blobCheck = await checkBlobAccessibility(
      paths.legacyPath,
      paths.blobUrl,
      timeoutMs,
      headOnly,
      verbose
    );
    updateResultWithCheckResults(result, 'blob', blobCheck);
  }

  return result;
}

/**
 * Creates default options for verification
 */
function createDefaultOptions(): VerificationOptions {
  return {
    books: [],
    outputFile: 'cdn-url-verification.json',
    format: 'json',
    verbose: false,
    environment: process.env.NODE_ENV || 'development',
    checkCdn: true,
    checkFallback: true,
    checkBlob: true,
    timeoutMs: 10000,
    compareEnv: null,
    compareFile: null,
    maxConcurrent: 5,
    headOnly: true,
  };
}

/**
 * Processes a simple boolean flag option
 * @param arg Current argument
 * @param flag Flag to check for
 * @param options Options object to update
 * @param value Value to set if flag matches
 * @returns True if flag was handled
 */
function parseFlag(
  arg: string,
  flag: string,
  options: VerificationOptions,
  key: keyof VerificationOptions,
  value: boolean
): boolean {
  if (arg === flag) {
    options[key] = value as unknown;
    return true;
  }
  return false;
}

/**
 * Processes an option with a value parameter
 * @param args Arguments array
 * @param index Current index
 * @param flag Flag to check for
 * @param options Options object to update
 * @param key Key to update in options
 * @param transform Optional transform function
 * @returns New index position or -1 if not handled
 */
function parseOptionWithValue(
  args: string[],
  index: number,
  flag: string,
  options: VerificationOptions,
  key: keyof VerificationOptions,
  transform?: (value: string) => unknown
): number {
  if (args[index] === flag && index + 1 < args.length) {
    const value = args[index + 1];
    options[key] = transform ? transform(value) : (value as unknown);
    return index + 1;
  }
  return -1;
}

/**
 * Processes output-related command line options
 * @param args Command line arguments
 * @param index Current index
 * @param options Options object to update
 * @returns New index position or original if not handled
 */
function parseOutputOptions(args: string[], index: number, options: VerificationOptions): number {
  // Handle --output option
  const outputIdx = parseOptionWithValue(args, index, '--output', options, 'outputFile');
  if (outputIdx > -1) return outputIdx;

  // Handle --format option
  const formatIdx = parseOptionWithValue(args, index, '--format', options, 'format', (value) => {
    if (value === 'json' || value === 'md') {
      return value;
    } else {
      moduleLogger.warn({ format: value }, `Unknown format, using 'json'`);
      return 'json';
    }
  });
  if (formatIdx > -1) return formatIdx;

  return index;
}

/**
 * Processes check-related command line options
 * @param args Command line arguments
 * @param index Current index
 * @param options Options object to update
 * @returns New index position or original if not handled
 */
function parseCheckOptions(args: string[], index: number, options: VerificationOptions): number {
  const arg = args[index];

  // Handle boolean flags for disabling checks
  if (parseFlag(arg, '--no-cdn', options, 'checkCdn', false)) return index;
  if (parseFlag(arg, '--no-fallback', options, 'checkFallback', false)) return index;
  if (parseFlag(arg, '--no-blob', options, 'checkBlob', false)) return index;
  if (parseFlag(arg, '--full-check', options, 'headOnly', false)) return index;

  return index;
}

/**
 * Processes comparison-related command line options
 * @param args Command line arguments
 * @param index Current index
 * @param options Options object to update
 * @returns New index position or original if not handled
 */
function parseCompareOptions(args: string[], index: number, options: VerificationOptions): number {
  // Handle --compare-env option
  const envIdx = parseOptionWithValue(args, index, '--compare-env', options, 'compareEnv');
  if (envIdx > -1) return envIdx;

  // Handle --compare-file option
  const fileIdx = parseOptionWithValue(args, index, '--compare-file', options, 'compareFile');
  if (fileIdx > -1) return fileIdx;

  return index;
}

/**
 * Processes performance-related command line options
 * @param args Command line arguments
 * @param index Current index
 * @param options Options object to update
 * @returns New index position or original if not handled
 */
function parsePerformanceOptions(
  args: string[],
  index: number,
  options: VerificationOptions
): number {
  // Handle --timeout option
  const timeoutIdx = parseOptionWithValue(
    args,
    index,
    '--timeout',
    options,
    'timeoutMs',
    (value) => parseInt(value, 10) || 10000
  );
  if (timeoutIdx > -1) return timeoutIdx;

  // Handle --concurrent option
  const concurrentIdx = parseOptionWithValue(
    args,
    index,
    '--concurrent',
    options,
    'maxConcurrent',
    (value) => parseInt(value, 10) || 5
  );
  if (concurrentIdx > -1) return concurrentIdx;

  return index;
}

/**
 * Processes book-related command line options
 * @param args Command line arguments
 * @param index Current index
 * @param options Options object to update
 * @returns New index position or original if not handled
 */
function parseBooksOption(args: string[], index: number, options: VerificationOptions): number {
  // Handle --books option
  const booksIdx = parseOptionWithValue(args, index, '--books', options, 'books', (value) =>
    value.split(',')
  );
  if (booksIdx > -1) return booksIdx;

  return index;
}

/**
 * Finalizes options after parsing
 * @param options The parsed options to finalize
 * @returns Finalized options
 */
function finalizeOptions(options: VerificationOptions): VerificationOptions {
  // Use default books if none specified
  if (options.books.length === 0) {
    options.books = DEFAULT_TEST_BOOKS;
  }

  // If format is markdown, adjust the output file extension
  if (options.format === 'md' && !options.outputFile.endsWith('.md')) {
    options.outputFile = options.outputFile.replace(/\.\w+$/, '.md');
    if (!options.outputFile.includes('.')) {
      options.outputFile += '.md';
    }
  }

  return options;
}

/**
 * Processes command line arguments
 * @returns Parsed verification options
 */
function parseCommandLineArgs(): VerificationOptions {
  const args = process.argv.slice(2);
  const options = createDefaultOptions();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Handle help flag immediately
    if (arg === '--help') {
      printHelp();
      process.exit(0);
    }

    // Handle verbose flag
    if (parseFlag(arg, '--verbose', options, 'verbose', true)) {
      continue;
    }

    // Try option parsers and update index if handled
    const newIndex = parseBooksOption(args, i, options);
    if (newIndex > i) {
      i = newIndex;
      continue;
    }

    const outputIndex = parseOutputOptions(args, i, options);
    if (outputIndex > i) {
      i = outputIndex;
      continue;
    }

    const checkIndex = parseCheckOptions(args, i, options);
    if (checkIndex > i) {
      i = checkIndex;
      continue;
    }

    const compareIndex = parseCompareOptions(args, i, options);
    if (compareIndex > i) {
      i = compareIndex;
      continue;
    }

    const perfIndex = parsePerformanceOptions(args, i, options);
    if (perfIndex > i) {
      i = perfIndex;
      continue;
    }

    // If we get here, it's an unknown argument
    moduleLogger.warn({ argument: arg }, 'Unknown command line argument');
  }

  return finalizeOptions(options);
}

/**
 * Prints help information
 */
function printHelp() {
  moduleLogger.info({
    topic: 'help',
    message: `
CDN URL Verification Script

Usage: npx tsx scripts/verifyCdnUrls.ts [options]

Options:
  --books         Comma-separated list of book slugs to test (default: iliad,hamlet,odyssey,republic)
  --output        Output file path (default: cdn-url-verification.json)
  --format        Output format: 'json' or 'md' (default: json)
  --verbose       Enable verbose logging
  --timeout       Request timeout in milliseconds (default: 10000)
  --no-cdn        Skip checking CDN URLs
  --no-fallback   Skip checking fallback URLs
  --no-blob       Skip checking Blob storage
  --compare-env   Compare with results from another environment (production/development)
  --compare-file  Compare with results from a previous run (file path)
  --concurrent    Maximum number of concurrent requests (default: 5)
  --full-check    Perform full GET requests instead of just HEAD requests
  --help          Show this help information

Examples:
  # Check all URLs for the Iliad and Hamlet
  npx tsx scripts/verifyCdnUrls.ts --books=the-iliad,hamlet --verbose

  # Output in markdown format
  npx tsx scripts/verifyCdnUrls.ts --format=md --output=verification-results.md

  # Compare with production environment
  npx tsx scripts/verifyCdnUrls.ts --compare-env=production
`,
  });
}

/**
 * Generates a set of test cases for the given books
 * @param books List of book slugs to test
 * @returns Array of download request params for testing
 */
function generateTestCases(books: string[]): DownloadRequestParams[] {
  const testCases: DownloadRequestParams[] = [];
  const correlationId = randomUUID();

  for (const slug of books) {
    // Add full audiobook case
    testCases.push({
      slug,
      type: 'full',
      correlationId,
    });

    // Add first 5 chapters
    for (let i = 1; i <= 5; i++) {
      testCases.push({
        slug,
        type: 'chapter',
        chapter: i.toString(),
        correlationId,
      });
    }
  }

  return testCases;
}

/**
 * Calculates summary statistics for verification results
 * @param results Verification results
 * @returns Object with calculated statistics
 */
function calculateSummaryStats(results: UrlVerificationResult[]): {
  totalTests: number;
  cdnSuccesses: number;
  fallbackSuccesses: number;
  blobSuccesses: number;
  cdnSuccessPercentage: number;
  fallbackSuccessPercentage: number;
  blobSuccessPercentage: number;
} {
  const totalTests = results.length;
  const cdnSuccesses = results.filter((r) => r.exists.cdn).length;
  const fallbackSuccesses = results.filter((r) => r.exists.fallback).length;
  const blobSuccesses = results.filter((r) => r.exists.blob).length;

  return {
    totalTests,
    cdnSuccesses,
    fallbackSuccesses,
    blobSuccesses,
    cdnSuccessPercentage: totalTests > 0 ? Math.round((cdnSuccesses / totalTests) * 100) : 0,
    fallbackSuccessPercentage:
      totalTests > 0 ? Math.round((fallbackSuccesses / totalTests) * 100) : 0,
    blobSuccessPercentage: totalTests > 0 ? Math.round((blobSuccesses / totalTests) * 100) : 0,
  };
}

/**
 * Generates report header and summary section
 * @param results Verification results
 * @param stats Summary statistics
 * @returns Markdown header and summary
 */
function generateReportHeader(
  results: UrlVerificationResult[],
  stats: ReturnType<typeof calculateSummaryStats>
): string {
  let markdown = `# CDN URL Verification Report\n\n`;
  markdown += `*Generated on ${new Date().toISOString()}*\n\n`;

  markdown += `## Summary\n\n`;
  markdown += `- **Environment**: ${results[0]?.environment || 'unknown'}\n`;
  markdown += `- **Total tests**: ${stats.totalTests}\n`;
  markdown += `- **CDN URLs**: ${stats.cdnSuccesses}/${stats.totalTests} accessible (${stats.cdnSuccessPercentage}%)\n`;
  markdown += `- **Fallback URLs**: ${stats.fallbackSuccesses}/${stats.totalTests} accessible (${stats.fallbackSuccessPercentage}%)\n`;
  markdown += `- **Blob Storage**: ${stats.blobSuccesses}/${stats.totalTests} available (${stats.blobSuccessPercentage}%)\n\n`;

  return markdown;
}

/**
 * Groups results by book slug
 * @param results Verification results
 * @returns Object with results grouped by book
 */
function groupResultsByBook(
  results: UrlVerificationResult[]
): Record<string, UrlVerificationResult[]> {
  const bookGroups: Record<string, UrlVerificationResult[]> = {};

  for (const result of results) {
    if (!bookGroups[result.slug]) {
      bookGroups[result.slug] = [];
    }
    bookGroups[result.slug].push(result);
  }

  return bookGroups;
}

/**
 * Formats a status code with duration
 * @param statusCode Status code (or null)
 * @param duration Duration in ms (or null)
 * @returns Formatted status code string
 */
function formatStatusCode(statusCode: number | null, duration: number | null): string {
  return statusCode === null ? 'N/A' : `${statusCode} (${duration}ms)`;
}

/**
 * Generates notes from error messages
 * @param result Verification result
 * @returns Notes string
 */
function generateErrorNotes(result: UrlVerificationResult): string {
  let notes = '';
  if (result.errors.cdn) notes += `CDN: ${result.errors.cdn} `;
  if (result.errors.fallback) notes += `Fallback: ${result.errors.fallback} `;
  if (result.errors.blob) notes += `Blob: ${result.errors.blob}`;
  return notes;
}

/**
 * Generates a table row for a result
 * @param result Verification result
 * @returns Markdown table row
 */
function generateResultTableRow(result: UrlVerificationResult): string {
  const cdnStatus = result.exists.cdn ? '✅' : '❌';
  const fallbackStatus = result.exists.fallback ? '✅' : '❌';
  const blobStatus = result.exists.blob ? '✅' : '❌';

  const cdnStatusCode = formatStatusCode(result.statusCodes.cdn, result.durations.cdn);
  const fallbackStatusCode = formatStatusCode(
    result.statusCodes.fallback,
    result.durations.fallback
  );

  const notes = generateErrorNotes(result);

  return `| ${result.type} | ${result.chapter || 'N/A'} | ${cdnStatus} | ${fallbackStatus} | ${blobStatus} | ${cdnStatusCode} | ${fallbackStatusCode} | ${notes} |\n`;
}

/**
 * Generates a book section with results table
 * @param book Book slug
 * @param bookResults Results for the book
 * @returns Markdown section
 */
function generateBookSection(book: string, bookResults: UrlVerificationResult[]): string {
  let markdown = `## ${book}\n\n`;
  markdown += `| Type | Chapter | CDN | Fallback | Blob | CDN Status | Fallback Status | Notes |\n`;
  markdown += `| ---- | ------- | --- | -------- | ---- | ---------- | --------------- | ----- |\n`;

  for (const result of bookResults) {
    markdown += generateResultTableRow(result);
  }

  markdown += `\n`;
  return markdown;
}

/**
 * Generates configuration section
 * @returns Markdown configuration section
 */
function generateConfigSection(): string {
  let markdown = `## Configurations\n\n`;
  markdown += `- **Bucket**: ${process.env.DO_SPACES_BUCKET || process.env.SPACES_BUCKET_NAME || 'brainrot-publishing'}\n`;
  markdown += `- **Region**: nyc3 (hardcoded)\n`;
  markdown += `- **Blob Base URL**: ${process.env.NEXT_PUBLIC_BLOB_BASE_URL || 'Not configured'}\n`;
  markdown += `- **Blob Dev URL**: ${process.env.NEXT_PUBLIC_BLOB_DEV_URL || 'Not configured'}\n`;

  return markdown;
}

/**
 * Formats verification results as markdown
 * @param results Verification results
 * @returns Markdown representation of results
 */
function formatResultsAsMarkdown(results: UrlVerificationResult[]): string {
  // Calculate statistics for the summary
  const stats = calculateSummaryStats(results);

  // Generate the header and summary section
  let markdown = generateReportHeader(results, stats);

  // Group results by book
  const bookGroups = groupResultsByBook(results);

  // Generate a section for each book
  for (const [book, bookResults] of Object.entries(bookGroups)) {
    markdown += generateBookSection(book, bookResults);
  }

  // Add configuration section
  markdown += generateConfigSection();

  return markdown;
}

/**
 * Creates a unique key for a verification result
 * @param result The verification result
 * @returns A unique key
 */
function createResultKey(result: UrlVerificationResult): string {
  return `${result.slug}-${result.type}-${result.chapter || 'full'}`;
}

/**
 * Creates maps for quick lookup of results
 * @param currentResults Current verification results
 * @param previousResults Previous verification results
 * @returns Maps for current and previous results
 */
function createComparisonMaps(
  currentResults: UrlVerificationResult[],
  previousResults: UrlVerificationResult[]
): {
  currentMap: Map<string, UrlVerificationResult>;
  previousMap: Map<string, UrlVerificationResult>;
} {
  const currentMap = new Map<string, UrlVerificationResult>();
  const previousMap = new Map<string, UrlVerificationResult>();

  for (const result of currentResults) {
    currentMap.set(createResultKey(result), result);
  }

  for (const result of previousResults) {
    previousMap.set(createResultKey(result), result);
  }

  return { currentMap, previousMap };
}

/**
 * Type definition for a difference object
 */
interface DifferenceItem {
  slug: string;
  type: string;
  chapter?: string;
  field: string;
  current: string;
  previous: string;
}

/**
 * Creates a difference object for a specific comparison
 * @param currentResult Current result
 * @param previousResult Previous result
 * @param field Field being compared
 * @param current Current value as string
 * @param previous Previous value as string
 * @returns Difference object
 */
function createDifference(
  currentResult: UrlVerificationResult,
  previousResult: UrlVerificationResult,
  field: string,
  current: string,
  previous: string
): DifferenceItem {
  return {
    slug: currentResult.slug,
    type: currentResult.type,
    chapter: currentResult.chapter,
    field,
    current,
    previous,
  };
}

/**
 * Compares CDN accessibility between results
 */
function compareCdnAccessibility(
  currentResult: UrlVerificationResult,
  previousResult: UrlVerificationResult
): { isDifferent: boolean; difference?: DifferenceItem } {
  if (currentResult.exists.cdn !== previousResult.exists.cdn) {
    return {
      isDifferent: true,
      difference: createDifference(
        currentResult,
        previousResult,
        'CDN Accessibility',
        currentResult.exists.cdn ? 'Accessible' : 'Not accessible',
        previousResult.exists.cdn ? 'Accessible' : 'Not accessible'
      ),
    };
  }
  return { isDifferent: false };
}

/**
 * Compares fallback accessibility between results
 */
function compareFallbackAccessibility(
  currentResult: UrlVerificationResult,
  previousResult: UrlVerificationResult
): { isDifferent: boolean; difference?: DifferenceItem } {
  if (currentResult.exists.fallback !== previousResult.exists.fallback) {
    return {
      isDifferent: true,
      difference: createDifference(
        currentResult,
        previousResult,
        'Fallback Accessibility',
        currentResult.exists.fallback ? 'Accessible' : 'Not accessible',
        previousResult.exists.fallback ? 'Accessible' : 'Not accessible'
      ),
    };
  }
  return { isDifferent: false };
}

/**
 * Compares blob availability between results
 */
function compareBlobAvailability(
  currentResult: UrlVerificationResult,
  previousResult: UrlVerificationResult
): { isDifferent: boolean; difference?: DifferenceItem } {
  if (currentResult.exists.blob !== previousResult.exists.blob) {
    return {
      isDifferent: true,
      difference: createDifference(
        currentResult,
        previousResult,
        'Blob Availability',
        currentResult.exists.blob ? 'Available' : 'Not available',
        previousResult.exists.blob ? 'Available' : 'Not available'
      ),
    };
  }
  return { isDifferent: false };
}

/**
 * Compares CDN URL format between results
 */
function compareCdnUrlFormat(
  currentResult: UrlVerificationResult,
  previousResult: UrlVerificationResult
): { isDifferent: boolean; difference?: DifferenceItem } {
  if (currentResult.cdnUrl !== previousResult.cdnUrl) {
    return {
      isDifferent: true,
      difference: createDifference(
        currentResult,
        previousResult,
        'CDN URL Format',
        currentResult.cdnUrl,
        previousResult.cdnUrl
      ),
    };
  }
  return { isDifferent: false };
}

/**
 * Compares fallback URL format between results
 */
function compareFallbackUrlFormat(
  currentResult: UrlVerificationResult,
  previousResult: UrlVerificationResult
): { isDifferent: boolean; difference?: DifferenceItem } {
  if (currentResult.fallbackUrl !== previousResult.fallbackUrl) {
    return {
      isDifferent: true,
      difference: createDifference(
        currentResult,
        previousResult,
        'Fallback URL Format',
        currentResult.fallbackUrl,
        previousResult.fallbackUrl
      ),
    };
  }
  return { isDifferent: false };
}

/**
 * Compares blob URL format between results
 */
function compareBlobUrlFormat(
  currentResult: UrlVerificationResult,
  previousResult: UrlVerificationResult
): { isDifferent: boolean; difference?: DifferenceItem } {
  if (
    currentResult.blobUrl &&
    previousResult.blobUrl &&
    currentResult.blobUrl !== previousResult.blobUrl
  ) {
    return {
      isDifferent: true,
      difference: createDifference(
        currentResult,
        previousResult,
        'Blob URL Format',
        currentResult.blobUrl,
        previousResult.blobUrl
      ),
    };
  }
  return { isDifferent: false };
}

/**
 * Finds all differences between current and previous results
 * @param currentMap Map of current results
 * @param previousMap Map of previous results
 * @returns Array of differences
 */
function findDifferences(
  currentMap: Map<string, UrlVerificationResult>,
  previousMap: Map<string, UrlVerificationResult>
): DifferenceItem[] {
  const differences: DifferenceItem[] = [];

  for (const [key, currentResult] of currentMap.entries()) {
    const previousResult = previousMap.get(key);
    if (!previousResult) continue;

    // Compare all aspects and collect differences
    const comparisonFunctions = [
      compareCdnAccessibility,
      compareFallbackAccessibility,
      compareBlobAvailability,
      compareCdnUrlFormat,
      compareFallbackUrlFormat,
      compareBlobUrlFormat,
    ];

    for (const compareFunc of comparisonFunctions) {
      const { isDifferent, difference } = compareFunc(currentResult, previousResult);
      if (isDifferent && difference) {
        differences.push(difference);
      }
    }
  }

  return differences;
}

/**
 * Truncates a URL for readability
 * @param url URL to truncate
 * @returns Truncated URL
 */
function truncateUrl(url: string): string {
  if (url.length > 60) {
    return url.substring(0, 57) + '...';
  }
  return url;
}

/**
 * Generates the report header and summary
 * @param differences Differences found
 * @param currentEnv Current environment name
 * @param compareEnv Comparison environment name
 * @returns Markdown header and summary
 */
function generateComparisonHeader(
  differences: DifferenceItem[],
  currentEnv: string,
  compareEnv: string
): string {
  let markdown = `# CDN URL Comparison Report\n\n`;
  markdown += `*Generated on ${new Date().toISOString()}*\n\n`;

  markdown += `## Comparison Summary\n\n`;
  markdown += `- **Current Environment**: ${currentEnv}\n`;
  markdown += `- **Compared Environment**: ${compareEnv}\n`;
  markdown += `- **Total Differences Found**: ${differences.length}\n\n`;

  return markdown;
}

/**
 * Generates the differences table
 * @param differences Differences found
 * @param currentEnv Current environment name
 * @param compareEnv Comparison environment name
 * @returns Markdown table of differences
 */
function generateDifferencesTable(
  differences: DifferenceItem[],
  currentEnv: string,
  compareEnv: string
): string {
  if (differences.length === 0) {
    return `No differences found between environments.\n\n`;
  }

  let markdown = `## Differences\n\n`;
  markdown += `| Book | Type | Chapter | Field | ${currentEnv} | ${compareEnv} |\n`;
  markdown += `| ---- | ---- | ------- | ----- | ${'--'.repeat(currentEnv.length)} | ${'--'.repeat(compareEnv.length)} |\n`;

  for (const diff of differences) {
    const current = diff.field.includes('URL') ? truncateUrl(diff.current) : diff.current;
    const previous = diff.field.includes('URL') ? truncateUrl(diff.previous) : diff.previous;

    markdown += `| ${diff.slug} | ${diff.type} | ${diff.chapter || 'N/A'} | ${diff.field} | ${current} | ${previous} |\n`;
  }

  return markdown;
}

/**
 * Generates the configuration section for current environment
 * @param currentEnv Current environment name
 * @returns Markdown configuration section
 */
function generateCurrentEnvConfig(currentEnv: string): string {
  let markdown = `\n## Configurations\n\n`;
  markdown += `### ${currentEnv}\n`;
  markdown += `- **Bucket**: ${process.env.DO_SPACES_BUCKET || process.env.SPACES_BUCKET_NAME || 'brainrot-publishing'}\n`;
  markdown += `- **Region**: nyc3 (hardcoded)\n`;
  markdown += `- **Blob Base URL**: ${process.env.NEXT_PUBLIC_BLOB_BASE_URL || 'Not configured'}\n`;
  markdown += `- **Blob Dev URL**: ${process.env.NEXT_PUBLIC_BLOB_DEV_URL || 'Not configured'}\n`;

  return markdown;
}

/**
 * Generates the configuration section for comparison environment
 * @param compareEnv Comparison environment name
 * @param previousResults Previous verification results
 * @returns Markdown configuration section
 */
function generateCompareEnvConfig(
  compareEnv: string,
  previousResults: UrlVerificationResult[]
): string {
  let markdown = `\n### ${compareEnv}\n`;
  markdown += `- **Bucket**: ${previousResults[0]?.cdnUrl.split('.')[0].replace('https://', '') || 'unknown'}\n`;
  markdown += `- **Region**: ${previousResults[0]?.cdnUrl.split('.')[1] || 'unknown'}\n`;

  return markdown;
}

/**
 * Formats verification results as a comparison report
 * @param currentResults Current verification results
 * @param previousResults Previous verification results for comparison
 * @param currentEnv Current environment name
 * @param compareEnv Comparison environment name
 * @returns Markdown comparison report
 */
function formatComparisonReport(
  currentResults: UrlVerificationResult[],
  previousResults: UrlVerificationResult[],
  currentEnv: string,
  compareEnv: string
): string {
  // Create lookup maps for quick comparison
  const { currentMap, previousMap } = createComparisonMaps(currentResults, previousResults);

  // Find differences between results
  const differences = findDifferences(currentMap, previousMap);

  // Generate report header and summary
  let markdown = generateComparisonHeader(differences, currentEnv, compareEnv);

  // Generate differences table or no differences message
  markdown += generateDifferencesTable(differences, currentEnv, compareEnv);

  // Add configuration sections
  markdown += generateCurrentEnvConfig(currentEnv);
  markdown += generateCompareEnvConfig(compareEnv, previousResults);

  return markdown;
}

/**
 * Runs URL verification tests in batches
 * @param testCases Test cases to run
 * @param options Verification options
 * @returns Array of verification results
 */
async function runVerificationTests(
  testCases: DownloadRequestParams[],
  options: VerificationOptions
): Promise<UrlVerificationResult[]> {
  const results: UrlVerificationResult[] = [];
  const { maxConcurrent, verbose } = options;

  // Process test cases in batches
  for (let i = 0; i < testCases.length; i += maxConcurrent) {
    const batch = testCases.slice(i, i + maxConcurrent);

    if (verbose) {
      moduleLogger.info(
        {
          operation: 'process_batch',
          batch: Math.floor(i / maxConcurrent) + 1,
          totalBatches: Math.ceil(testCases.length / maxConcurrent),
        },
        `Processing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(testCases.length / maxConcurrent)}`
      );
    }

    // Run batch in parallel
    const batchResults = await Promise.all(batch.map((params) => verifyUrl(params, options)));

    results.push(...batchResults);
  }

  return results;
}

/**
 * Main function - runs the verification process
 */
async function main() {
  // Parse command line arguments
  const options = parseCommandLineArgs();

  moduleLogger.info({ operation: 'start' }, `🧪 CDN URL Verification Tool`);
  moduleLogger.info(
    { operation: 'environment', env: options.environment },
    `Environment: ${options.environment}`
  );
  moduleLogger.info(
    { operation: 'config', books: options.books.length, timeout: options.timeoutMs },
    `Testing ${options.books.length} books with timeout ${options.timeoutMs}ms`
  );

  // Generate test cases
  const testCases = generateTestCases(options.books);
  moduleLogger.info(
    { operation: 'test_cases', count: testCases.length },
    `Generated ${testCases.length} test cases`
  );

  // Run verification tests
  moduleLogger.info({ operation: 'run_tests' }, `Running verification tests...`);
  const results = await runVerificationTests(testCases, options);

  // Count successful and failed URLs
  const cdnSuccesses = results.filter((r) => r.exists.cdn).length;
  const fallbackSuccesses = results.filter((r) => r.exists.fallback).length;
  const blobSuccesses = results.filter((r) => r.exists.blob).length;

  moduleLogger.info({ operation: 'test_results' }, `✅ Tests completed successfully!`);
  moduleLogger.info(
    { operation: 'cdn_results', success: cdnSuccesses, total: results.length },
    `- CDN URLs: ${cdnSuccesses}/${results.length} accessible`
  );
  moduleLogger.info(
    { operation: 'fallback_results', success: fallbackSuccesses, total: results.length },
    `- Fallback URLs: ${fallbackSuccesses}/${results.length} accessible`
  );
  moduleLogger.info(
    { operation: 'blob_results', success: blobSuccesses, total: results.length },
    `- Blob Storage: ${blobSuccesses}/${results.length} available`
  );

  // Compare with previous results if requested
  let outputContent: string;
  if (options.compareFile) {
    try {
      // Read previous results from file
      const previousResults = JSON.parse(
        fs.readFileSync(options.compareFile, 'utf-8')
      ) as UrlVerificationResult[];

      moduleLogger.info(
        { operation: 'comparison', count: previousResults.length, file: options.compareFile },
        `Comparing with ${previousResults.length} results from ${options.compareFile}`
      );

      // Generate comparison report
      outputContent = formatComparisonReport(
        results,
        previousResults,
        options.environment,
        previousResults[0]?.environment || 'previous'
      );
    } catch (error) {
      moduleLogger.error(
        {
          operation: 'comparison_error',
          file: options.compareFile,
          error: error instanceof Error ? error.message : String(error),
        },
        `Error reading comparison file: ${error instanceof Error ? error.message : String(error)}`
      );
      outputContent =
        options.format === 'md'
          ? formatResultsAsMarkdown(results)
          : JSON.stringify(results, null, 2);
    }
  } else {
    // Generate standard output
    outputContent =
      options.format === 'md' ? formatResultsAsMarkdown(results) : JSON.stringify(results, null, 2);
  }

  // Write output to file
  fs.writeFileSync(options.outputFile, outputContent);
  moduleLogger.info(
    { operation: 'output', file: options.outputFile },
    `📝 Results written to ${options.outputFile}`
  );
}

// Run the main function
main().catch((error) => {
  moduleLogger.error(
    {
      operation: 'fatal_error',
      error: error instanceof Error ? error.message : String(error),
    },
    'Error running verification tool:'
  );
  process.exit(1);
});
