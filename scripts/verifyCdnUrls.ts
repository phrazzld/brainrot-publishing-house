/* eslint-disable max-lines */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

// Import necessary modules and types
import { DownloadRequestParams } from '../services/downloadService';
import { DownloadService } from '../services/downloadService';
import { assetExistsInBlobStorage, getBlobUrl } from '../utils/getBlobUrl';
import { getAssetUrlWithFallback } from '../utils/getBlobUrl';
import { createRequestLogger } from '../utils/logger';
import { blobPathService } from '../utils/services/BlobPathService';

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
 * Helper function to create a DownloadService instance for testing
 */
function createDownloadService() {
  // Create a simple asset resolver for testing
  const assetUrlResolver = {
    getAssetUrlWithFallback: getAssetUrlWithFallback,
    convertLegacyPath: (path: string) => blobPathService.convertLegacyPath(path),
  };

  return new DownloadService(assetUrlResolver);
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
 * Generates and validates a CDN URL for the given parameters
 * @param params Download request parameters
 * @param options Verification options
 * @returns Promise resolving to verification result
 */
async function verifyUrl(
  params: DownloadRequestParams,
  options: VerificationOptions
): Promise<UrlVerificationResult> {
  const { slug, type, chapter } = params;
  const { verbose, timeoutMs, headOnly, checkCdn, checkFallback, checkBlob } = options;

  // Create a DownloadService instance
  const downloadService = createDownloadService();

  // Create a logger with a correlation ID
  const correlationId = randomUUID();
  const log = createRequestLogger(correlationId);

  if (verbose) {
    console.log(`Verifying URLs for ${slug}, type=${type}, chapter=${chapter || 'N/A'}`);
  }

  // Generate the paths for this resource using internal method
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { cdnUrl, legacyPath } = (downloadService as any)['generatePaths'](
    slug,
    type,
    chapter,
    log
  );

  // Create the fallback URL (non-CDN)
  const fallbackUrl = cdnUrl.replace('.cdn.digitaloceanspaces.com', '.digitaloceanspaces.com');

  // Try to get a blob URL if possible
  let blobUrl: string | undefined;
  try {
    blobUrl = getBlobUrl(legacyPath);
  } catch (error) {
    if (verbose) {
      console.warn(`Failed to generate Blob URL for ${legacyPath}:`, error);
    }
  }

  // Initialize result structure
  const result: UrlVerificationResult = {
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

  // Check CDN URL accessibility
  if (checkCdn) {
    if (verbose) {
      console.log(`Checking CDN URL: ${cdnUrl}`);
    }

    const cdnCheck = await checkUrlAccessibility(cdnUrl, timeoutMs);

    result.exists.cdn = cdnCheck.exists;
    result.statusCodes.cdn = cdnCheck.statusCode;
    result.headers.cdn = cdnCheck.headers;
    result.errors.cdn = cdnCheck.error;
    result.durations.cdn = cdnCheck.duration;

    if (verbose) {
      if (cdnCheck.exists) {
        console.log(
          `✅ CDN URL accessible, status: ${cdnCheck.statusCode}, took ${cdnCheck.duration}ms`
        );
      } else {
        console.log(`❌ CDN URL not accessible, error: ${cdnCheck.error}`);
      }
    }
  }

  // Check fallback URL accessibility
  if (checkFallback) {
    if (verbose) {
      console.log(`Checking fallback URL: ${fallbackUrl}`);
    }

    const fallbackCheck = await checkUrlAccessibility(fallbackUrl, timeoutMs);

    result.exists.fallback = fallbackCheck.exists;
    result.statusCodes.fallback = fallbackCheck.statusCode;
    result.headers.fallback = fallbackCheck.headers;
    result.errors.fallback = fallbackCheck.error;
    result.durations.fallback = fallbackCheck.duration;

    if (verbose) {
      if (fallbackCheck.exists) {
        console.log(
          `✅ Fallback URL accessible, status: ${fallbackCheck.statusCode}, took ${fallbackCheck.duration}ms`
        );
      } else {
        console.log(`❌ Fallback URL not accessible, error: ${fallbackCheck.error}`);
      }
    }
  }

  // Check Blob URL accessibility
  if (checkBlob && blobUrl) {
    if (verbose) {
      console.log(`Checking Blob URL: ${blobUrl}`);
    }

    try {
      const blobExists = await assetExistsInBlobStorage(legacyPath, {}, false);
      result.exists.blob = blobExists;

      if (blobExists && !headOnly) {
        const blobCheck = await checkUrlAccessibility(blobUrl, timeoutMs);

        result.statusCodes.blob = blobCheck.statusCode;
        result.headers.blob = blobCheck.headers;
        result.errors.blob = blobCheck.error;
        result.durations.blob = blobCheck.duration;
      }

      if (verbose) {
        if (result.exists.blob) {
          console.log(`✅ Blob storage has the asset`);
        } else {
          console.log(`❌ Asset not found in Blob storage`);
        }
      }
    } catch (error) {
      result.exists.blob = false;
      result.errors.blob = error instanceof Error ? error.message : String(error);

      if (verbose) {
        console.log(`❌ Error checking Blob URL: ${result.errors.blob}`);
      }
    }
  }

  return result;
}

/**
 * Processes command line arguments
 * @returns Parsed verification options
 */
function parseCommandLineArgs(): VerificationOptions {
  const args = process.argv.slice(2);
  const options: VerificationOptions = {
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

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Parse known options
    if (arg === '--books' && i + 1 < args.length) {
      options.books = args[++i].split(',');
    } else if (arg === '--output' && i + 1 < args.length) {
      options.outputFile = args[++i];
    } else if (arg === '--format' && i + 1 < args.length) {
      const format = args[++i];
      if (format === 'json' || format === 'md') {
        options.format = format;
      } else {
        console.warn(`Unknown format: ${format}, using 'json'`);
      }
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--timeout' && i + 1 < args.length) {
      options.timeoutMs = parseInt(args[++i], 10) || 10000;
    } else if (arg === '--no-cdn') {
      options.checkCdn = false;
    } else if (arg === '--no-fallback') {
      options.checkFallback = false;
    } else if (arg === '--no-blob') {
      options.checkBlob = false;
    } else if (arg === '--compare-env' && i + 1 < args.length) {
      options.compareEnv = args[++i];
    } else if (arg === '--compare-file' && i + 1 < args.length) {
      options.compareFile = args[++i];
    } else if (arg === '--concurrent' && i + 1 < args.length) {
      options.maxConcurrent = parseInt(args[++i], 10) || 5;
    } else if (arg === '--full-check') {
      options.headOnly = false;
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

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
 * Prints help information
 */
function printHelp() {
  console.log(`
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
`);
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
 * Formats verification results as markdown
 * @param results Verification results
 * @returns Markdown representation of results
 */
function formatResultsAsMarkdown(results: UrlVerificationResult[]): string {
  // Count successful and failed URLs
  const totalTests = results.length;
  const cdnSuccesses = results.filter((r) => r.exists.cdn).length;
  const fallbackSuccesses = results.filter((r) => r.exists.fallback).length;
  const blobSuccesses = results.filter((r) => r.exists.blob).length;

  // Generate markdown
  let markdown = `# CDN URL Verification Report\n\n`;
  markdown += `*Generated on ${new Date().toISOString()}*\n\n`;

  markdown += `## Summary\n\n`;
  markdown += `- **Environment**: ${results[0]?.environment || 'unknown'}\n`;
  markdown += `- **Total tests**: ${totalTests}\n`;
  markdown += `- **CDN URLs**: ${cdnSuccesses}/${totalTests} accessible (${Math.round((cdnSuccesses / totalTests) * 100)}%)\n`;
  markdown += `- **Fallback URLs**: ${fallbackSuccesses}/${totalTests} accessible (${Math.round((fallbackSuccesses / totalTests) * 100)}%)\n`;
  markdown += `- **Blob Storage**: ${blobSuccesses}/${totalTests} available (${Math.round((blobSuccesses / totalTests) * 100)}%)\n\n`;

  // Group results by book
  const bookGroups: Record<string, UrlVerificationResult[]> = {};
  for (const result of results) {
    if (!bookGroups[result.slug]) {
      bookGroups[result.slug] = [];
    }
    bookGroups[result.slug].push(result);
  }

  // Add table for each book
  for (const [book, bookResults] of Object.entries(bookGroups)) {
    markdown += `## ${book}\n\n`;
    markdown += `| Type | Chapter | CDN | Fallback | Blob | CDN Status | Fallback Status | Notes |\n`;
    markdown += `| ---- | ------- | --- | -------- | ---- | ---------- | --------------- | ----- |\n`;

    for (const result of bookResults) {
      const cdnStatus = result.exists.cdn ? '✅' : '❌';
      const fallbackStatus = result.exists.fallback ? '✅' : '❌';
      const blobStatus = result.exists.blob ? '✅' : '❌';

      // Format status codes
      const cdnStatusCode =
        result.statusCodes.cdn === null
          ? 'N/A'
          : `${result.statusCodes.cdn} (${result.durations.cdn}ms)`;

      const fallbackStatusCode =
        result.statusCodes.fallback === null
          ? 'N/A'
          : `${result.statusCodes.fallback} (${result.durations.fallback}ms)`;

      // Generate notes based on errors
      let notes = '';
      if (result.errors.cdn) notes += `CDN: ${result.errors.cdn} `;
      if (result.errors.fallback) notes += `Fallback: ${result.errors.fallback} `;
      if (result.errors.blob) notes += `Blob: ${result.errors.blob}`;

      markdown += `| ${result.type} | ${result.chapter || 'N/A'} | ${cdnStatus} | ${fallbackStatus} | ${blobStatus} | ${cdnStatusCode} | ${fallbackStatusCode} | ${notes} |\n`;
    }

    markdown += `\n`;
  }

  markdown += `## Configurations\n\n`;
  markdown += `- **Bucket**: ${process.env.DO_SPACES_BUCKET || process.env.SPACES_BUCKET_NAME || 'brainrot-publishing'}\n`;
  markdown += `- **Region**: nyc3 (hardcoded)\n`;
  markdown += `- **Blob Base URL**: ${process.env.NEXT_PUBLIC_BLOB_BASE_URL || 'Not configured'}\n`;
  markdown += `- **Blob Dev URL**: ${process.env.NEXT_PUBLIC_BLOB_DEV_URL || 'Not configured'}\n`;

  return markdown;
}

/**
 * Formats verification results as a comparison report
 * @param currentResults Current verification results
 * @param previousResults Previous verification results for comparison
 * @returns Markdown comparison report
 */
function formatComparisonReport(
  currentResults: UrlVerificationResult[],
  previousResults: UrlVerificationResult[],
  currentEnv: string,
  compareEnv: string
): string {
  // Create lookup maps for quick comparison
  const currentMap = new Map<string, UrlVerificationResult>();
  const previousMap = new Map<string, UrlVerificationResult>();

  for (const result of currentResults) {
    const key = `${result.slug}-${result.type}-${result.chapter || 'full'}`;
    currentMap.set(key, result);
  }

  for (const result of previousResults) {
    const key = `${result.slug}-${result.type}-${result.chapter || 'full'}`;
    previousMap.set(key, result);
  }

  // Find differences
  const differences: Array<{
    slug: string;
    type: string;
    chapter?: string;
    field: string;
    current: string;
    previous: string;
  }> = [];

  for (const [key, currentResult] of currentMap.entries()) {
    const previousResult = previousMap.get(key);
    if (!previousResult) continue;

    // Compare CDN accessibility
    if (currentResult.exists.cdn !== previousResult.exists.cdn) {
      differences.push({
        slug: currentResult.slug,
        type: currentResult.type,
        chapter: currentResult.chapter,
        field: 'CDN Accessibility',
        current: currentResult.exists.cdn ? 'Accessible' : 'Not accessible',
        previous: previousResult.exists.cdn ? 'Accessible' : 'Not accessible',
      });
    }

    // Compare fallback accessibility
    if (currentResult.exists.fallback !== previousResult.exists.fallback) {
      differences.push({
        slug: currentResult.slug,
        type: currentResult.type,
        chapter: currentResult.chapter,
        field: 'Fallback Accessibility',
        current: currentResult.exists.fallback ? 'Accessible' : 'Not accessible',
        previous: previousResult.exists.fallback ? 'Accessible' : 'Not accessible',
      });
    }

    // Compare Blob availability
    if (currentResult.exists.blob !== previousResult.exists.blob) {
      differences.push({
        slug: currentResult.slug,
        type: currentResult.type,
        chapter: currentResult.chapter,
        field: 'Blob Availability',
        current: currentResult.exists.blob ? 'Available' : 'Not available',
        previous: previousResult.exists.blob ? 'Available' : 'Not available',
      });
    }

    // Compare CDN URL format
    if (currentResult.cdnUrl !== previousResult.cdnUrl) {
      differences.push({
        slug: currentResult.slug,
        type: currentResult.type,
        chapter: currentResult.chapter,
        field: 'CDN URL Format',
        current: currentResult.cdnUrl,
        previous: previousResult.cdnUrl,
      });
    }

    // Compare Fallback URL format
    if (currentResult.fallbackUrl !== previousResult.fallbackUrl) {
      differences.push({
        slug: currentResult.slug,
        type: currentResult.type,
        chapter: currentResult.chapter,
        field: 'Fallback URL Format',
        current: currentResult.fallbackUrl,
        previous: previousResult.fallbackUrl,
      });
    }

    // Compare Blob URL format if both exist
    if (
      currentResult.blobUrl &&
      previousResult.blobUrl &&
      currentResult.blobUrl !== previousResult.blobUrl
    ) {
      differences.push({
        slug: currentResult.slug,
        type: currentResult.type,
        chapter: currentResult.chapter,
        field: 'Blob URL Format',
        current: currentResult.blobUrl,
        previous: previousResult.blobUrl,
      });
    }
  }

  // Generate markdown report
  let markdown = `# CDN URL Comparison Report\n\n`;
  markdown += `*Generated on ${new Date().toISOString()}*\n\n`;

  markdown += `## Comparison Summary\n\n`;
  markdown += `- **Current Environment**: ${currentEnv}\n`;
  markdown += `- **Compared Environment**: ${compareEnv}\n`;
  markdown += `- **Total Differences Found**: ${differences.length}\n\n`;

  if (differences.length === 0) {
    markdown += `No differences found between environments.\n\n`;
  } else {
    markdown += `## Differences\n\n`;
    markdown += `| Book | Type | Chapter | Field | ${currentEnv} | ${compareEnv} |\n`;
    markdown += `| ---- | ---- | ------- | ----- | ${'--'.repeat(currentEnv.length)} | ${'--'.repeat(compareEnv.length)} |\n`;

    for (const diff of differences) {
      // Truncate very long URLs for readability
      const truncateUrl = (url: string) => {
        if (url.length > 60) {
          return url.substring(0, 57) + '...';
        }
        return url;
      };

      const current = diff.field.includes('URL') ? truncateUrl(diff.current) : diff.current;
      const previous = diff.field.includes('URL') ? truncateUrl(diff.previous) : diff.previous;

      markdown += `| ${diff.slug} | ${diff.type} | ${diff.chapter || 'N/A'} | ${diff.field} | ${current} | ${previous} |\n`;
    }
  }

  markdown += `\n## Configurations\n\n`;
  markdown += `### ${currentEnv}\n`;
  markdown += `- **Bucket**: ${process.env.DO_SPACES_BUCKET || process.env.SPACES_BUCKET_NAME || 'brainrot-publishing'}\n`;
  markdown += `- **Region**: nyc3 (hardcoded)\n`;
  markdown += `- **Blob Base URL**: ${process.env.NEXT_PUBLIC_BLOB_BASE_URL || 'Not configured'}\n`;
  markdown += `- **Blob Dev URL**: ${process.env.NEXT_PUBLIC_BLOB_DEV_URL || 'Not configured'}\n`;

  markdown += `\n### ${compareEnv}\n`;
  markdown += `- **Bucket**: ${previousResults[0]?.cdnUrl.split('.')[0].replace('https://', '') || 'unknown'}\n`;
  markdown += `- **Region**: ${previousResults[0]?.cdnUrl.split('.')[1] || 'unknown'}\n`;

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
      console.log(
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

  console.log(`🧪 CDN URL Verification Tool`);
  console.log(`Environment: ${options.environment}`);
  console.log(`Testing ${options.books.length} books with timeout ${options.timeoutMs}ms`);

  // Generate test cases
  const testCases = generateTestCases(options.books);
  console.log(`Generated ${testCases.length} test cases`);

  // Run verification tests
  console.log(`Running verification tests...`);
  const results = await runVerificationTests(testCases, options);

  // Count successful and failed URLs
  const cdnSuccesses = results.filter((r) => r.exists.cdn).length;
  const fallbackSuccesses = results.filter((r) => r.exists.fallback).length;
  const blobSuccesses = results.filter((r) => r.exists.blob).length;

  console.log(`✅ Tests completed successfully!`);
  console.log(`- CDN URLs: ${cdnSuccesses}/${results.length} accessible`);
  console.log(`- Fallback URLs: ${fallbackSuccesses}/${results.length} accessible`);
  console.log(`- Blob Storage: ${blobSuccesses}/${results.length} available`);

  // Compare with previous results if requested
  let outputContent: string;
  if (options.compareFile) {
    try {
      // Read previous results from file
      const previousResults = JSON.parse(
        fs.readFileSync(options.compareFile, 'utf-8')
      ) as UrlVerificationResult[];

      console.log(`Comparing with ${previousResults.length} results from ${options.compareFile}`);

      // Generate comparison report
      outputContent = formatComparisonReport(
        results,
        previousResults,
        options.environment,
        previousResults[0]?.environment || 'previous'
      );
    } catch (error) {
      console.error(
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
  console.log(`📝 Results written to ${options.outputFile}`);
}

// Run the main function
main().catch((error) => {
  console.error('Error running verification tool:', error);
  process.exit(1);
});
