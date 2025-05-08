/* eslint-disable max-lines */
import chalk from 'chalk';
import crypto from 'crypto';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { performance } from 'perf_hooks';
import { setTimeout as sleep } from 'timers/promises';

import { logger } from '../utils/logger';
import { generateHtmlReport } from './benchmark-report-generator';

// Configuration
const TEST_ENVIRONMENTS = ['local', 'development', 'staging', 'production'];
const BASE_URLS = {
  local: 'http://localhost:3000',
  development: process.env.DEV_URL || 'https://dev.example.com',
  staging: process.env.STAGING_URL || 'https://staging.example.com',
  production: process.env.PROD_URL || 'https://www.brainrot-publishing-house.com',
};

// Export constants for report generator
export const CONCURRENCY_LEVELS = [1, 5, 10];

// Test books with varied file sizes
const BENCHMARK_BOOKS = [
  // Small audiobooks (chapters < 5MB)
  { slug: 'hamlet', category: 'small', hasFullAudiobook: true, chapters: [1, 2, 3] },

  // Medium audiobooks (chapters 5-15MB)
  { slug: 'the-iliad', category: 'medium', hasFullAudiobook: true, chapters: [1, 2, 3] },

  // Large audiobooks (chapters > 15MB or full audiobook)
  { slug: 'the-aeneid', category: 'large', hasFullAudiobook: true, chapters: [1, 2] },
];

// Benchmark configurations
const REPEAT_COUNT = 3; // Number of times to repeat each test for more reliable results

// Types for test data
export interface PerformanceMetrics {
  // Basic metrics
  totalDurationMs: number;
  ttfbMs: number;
  downloadDurationMs: number;

  // Detailed info
  contentLength?: number;
  contentType?: string;
  transferSpeedKBps?: number;

  // Debugging info
  status?: number;
  error?: string;
  checksum?: string;
}

export interface BenchmarkResult {
  // Test identification
  assetType: string;
  bookSlug: string;
  assetName: string;
  category: 'small' | 'medium' | 'large';
  url: string;
  testType: 'direct' | 'api' | 'proxy';
  concurrencyLevel: number;
  testIndex: number;
  success: boolean;

  // Performance metrics
  metrics: PerformanceMetrics;
}

export interface BenchmarkSuite {
  environment: string;
  baseUrl: string;
  startTime: number;
  endTime: number;
  date: string;
  totalTests: number;
  successful: number;
  failed: number;
  results: BenchmarkResult[];
}

/**
 * Get command line arguments
 */
function getArgs(): { environment: string; concurrencyLevels: number[] } {
  const args = process.argv.slice(2);
  const envArg = args.find((arg) => arg.startsWith('--env='));
  let env = 'local';

  if (envArg) {
    env = envArg.split('=')[1];
  }

  if (!TEST_ENVIRONMENTS.includes(env)) {
    logger.warn(`Invalid environment: ${env}, defaulting to local`);
    env = 'local';
  }

  // Check if specific concurrency levels are requested
  const concurrencyArg = args.find((arg) => arg.startsWith('--concurrency='));
  let concurrencyLevels = CONCURRENCY_LEVELS;

  if (concurrencyArg) {
    const concurrencyValue = concurrencyArg.split('=')[1];
    try {
      // Parse as single value or comma-separated list
      if (concurrencyValue.includes(',')) {
        concurrencyLevels = concurrencyValue.split(',').map((c) => parseInt(c, 10));
      } else {
        concurrencyLevels = [parseInt(concurrencyValue, 10)];
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      logger.warn(`Invalid concurrency value: ${concurrencyArg}, using defaults`);
    }
  }

  return { environment: env, concurrencyLevels };
}

/**
 * Calculate MD5 hash of a buffer for integrity verification
 */
function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Calculate transfer speed in KBps
 */
function calculateTransferSpeed(bytes: number, durationMs: number): number {
  if (durationMs === 0) return 0;
  const durationSeconds = durationMs / 1000;
  const kilobytes = bytes / 1024;
  return Math.round(kilobytes / durationSeconds);
}

/**
 * Benchmark a direct URL fetch with detailed metrics
 */
async function benchmarkDirectUrl(
  url: string,
  metadata: {
    type: string;
    slug: string;
    asset: string;
    category: 'small' | 'medium' | 'large';
    concurrencyLevel: number;
    testIndex: number;
  }
): Promise<BenchmarkResult> {
  const startTime = performance.now();
  let ttfbTime = 0;
  let downloadTime = 0;

  const result: BenchmarkResult = {
    assetType: metadata.type,
    bookSlug: metadata.slug,
    assetName: metadata.asset,
    category: metadata.category,
    url,
    testType: 'direct',
    concurrencyLevel: metadata.concurrencyLevel,
    testIndex: metadata.testIndex,
    success: false,
    metrics: {
      totalDurationMs: 0,
      ttfbMs: 0,
      downloadDurationMs: 0,
    },
  };

  try {
    const startFetch = performance.now();
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BrainrotPublishingHouseBenchmark/1.0',
      },
    });
    ttfbTime = performance.now() - startFetch;

    result.metrics.status = response.status;
    result.metrics.contentType = response.headers.get('content-type') || undefined;
    result.metrics.contentLength =
      parseInt(response.headers.get('content-length') || '0', 10) || undefined;

    if (!response.ok) {
      result.metrics.error = `HTTP ${response.status}: ${response.statusText}`;
      return result;
    }

    // Download the content and time it
    const startDownload = performance.now();
    const buffer = Buffer.from(await response.arrayBuffer());
    downloadTime = performance.now() - startDownload;

    result.metrics.checksum = calculateChecksum(buffer);
    result.success = true;

    // Calculate transfer speed if content length is known
    if (result.metrics.contentLength) {
      result.metrics.transferSpeedKBps = calculateTransferSpeed(
        result.metrics.contentLength,
        downloadTime
      );
    }
  } catch (error) {
    result.metrics.error = error instanceof Error ? error.message : String(error);
  } finally {
    const endTime = performance.now();
    result.metrics.totalDurationMs = Math.round(endTime - startTime);
    result.metrics.ttfbMs = Math.round(ttfbTime);
    result.metrics.downloadDurationMs = Math.round(downloadTime);
  }

  return result;
}

interface ApiEndpointParams {
  baseUrl: string;
  slug: string;
  type: 'full' | 'chapter';
  metadata: {
    category: 'small' | 'medium' | 'large';
    concurrencyLevel: number;
    testIndex: number;
  };
  chapter?: number;
}

async function benchmarkApiEndpoint(params: ApiEndpointParams): Promise<BenchmarkResult> {
  const { baseUrl, slug, type, metadata, chapter } = params;
  const startTime = performance.now();
  let apiResponseTime = 0;
  let urlVerificationResult: BenchmarkResult | null = null;

  const apiParams = new URLSearchParams({
    slug,
    type,
    ...(chapter ? { chapter: String(chapter) } : {}),
  });

  const assetName =
    type === 'full' ? 'full-audiobook.mp3' : `chapter-${String(chapter).padStart(2, '0')}.mp3`;
  const apiUrl = `${baseUrl}/api/download?${apiParams.toString()}`;

  const result: BenchmarkResult = {
    assetType: 'audio',
    bookSlug: slug,
    assetName,
    category: metadata.category,
    url: apiUrl,
    testType: 'api',
    concurrencyLevel: metadata.concurrencyLevel,
    testIndex: metadata.testIndex,
    success: false,
    metrics: {
      totalDurationMs: 0,
      ttfbMs: 0,
      downloadDurationMs: 0,
    },
  };

  try {
    const apiStartTime = performance.now();
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'BrainrotPublishingHouseBenchmark/1.0',
      },
    });
    apiResponseTime = performance.now() - apiStartTime;

    result.metrics.status = response.status;

    if (!response.ok) {
      result.metrics.error = `HTTP ${response.status}: ${response.statusText}`;
      return result;
    }

    const data = await response.json();

    // Check that the URL is returned correctly
    if (!data.url) {
      result.metrics.error = 'API response did not include download URL';
      return result;
    }

    // Verify the actual URL works (separate test)
    urlVerificationResult = await benchmarkDirectUrl(data.url, {
      type: 'audio',
      slug,
      asset: assetName,
      category: metadata.category,
      concurrencyLevel: metadata.concurrencyLevel,
      testIndex: metadata.testIndex,
    });

    // Use URL verification result to update our result
    if (urlVerificationResult.success) {
      result.success = true;
      result.metrics.contentType = urlVerificationResult.metrics.contentType;
      result.metrics.contentLength = urlVerificationResult.metrics.contentLength;
      result.metrics.checksum = urlVerificationResult.metrics.checksum;
      result.metrics.transferSpeedKBps = urlVerificationResult.metrics.transferSpeedKBps;
      result.metrics.downloadDurationMs = urlVerificationResult.metrics.totalDurationMs;
    } else {
      result.metrics.error = `API returned URL, but accessing URL failed: ${urlVerificationResult.metrics.error}`;
    }
  } catch (error) {
    result.metrics.error = error instanceof Error ? error.message : String(error);
  } finally {
    const endTime = performance.now();
    result.metrics.totalDurationMs = Math.round(endTime - startTime);
    result.metrics.ttfbMs = Math.round(apiResponseTime);
  }

  return result;
}

interface ProxyEndpointParams {
  baseUrl: string;
  slug: string;
  type: 'full' | 'chapter';
  metadata: {
    category: 'small' | 'medium' | 'large';
    concurrencyLevel: number;
    testIndex: number;
  };
  chapter?: number;
}

async function benchmarkProxyEndpoint(params: ProxyEndpointParams): Promise<BenchmarkResult> {
  const { baseUrl, slug, type, metadata, chapter } = params;
  const startTime = performance.now();
  let ttfbTime = 0;
  let downloadTime = 0;

  const proxyParams = new URLSearchParams({
    slug,
    type,
    ...(chapter ? { chapter: String(chapter) } : {}),
    proxy: 'true',
  });

  const assetName =
    type === 'full' ? 'full-audiobook.mp3' : `chapter-${String(chapter).padStart(2, '0')}.mp3`;
  const proxyUrl = `${baseUrl}/api/download?${proxyParams.toString()}`;

  const result: BenchmarkResult = {
    assetType: 'audio',
    bookSlug: slug,
    assetName,
    category: metadata.category,
    url: proxyUrl,
    testType: 'proxy',
    concurrencyLevel: metadata.concurrencyLevel,
    testIndex: metadata.testIndex,
    success: false,
    metrics: {
      totalDurationMs: 0,
      ttfbMs: 0,
      downloadDurationMs: 0,
    },
  };

  try {
    const fetchStartTime = performance.now();
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'BrainrotPublishingHouseBenchmark/1.0',
      },
    });
    ttfbTime = performance.now() - fetchStartTime;

    result.metrics.status = response.status;
    result.metrics.contentType = response.headers.get('content-type') || undefined;
    result.metrics.contentLength =
      parseInt(response.headers.get('content-length') || '0', 10) || undefined;

    if (!response.ok) {
      result.metrics.error = `HTTP ${response.status}: ${response.statusText}`;
      return result;
    }

    // Download the content and time it
    const downloadStartTime = performance.now();
    const buffer = Buffer.from(await response.arrayBuffer());
    downloadTime = performance.now() - downloadStartTime;

    result.metrics.checksum = calculateChecksum(buffer);
    result.success = true;

    // Calculate transfer speed if content length is known
    if (result.metrics.contentLength) {
      result.metrics.transferSpeedKBps = calculateTransferSpeed(
        result.metrics.contentLength,
        downloadTime
      );
    }
  } catch (error) {
    result.metrics.error = error instanceof Error ? error.message : String(error);
  } finally {
    const endTime = performance.now();
    result.metrics.totalDurationMs = Math.round(endTime - startTime);
    result.metrics.ttfbMs = Math.round(ttfbTime);
    result.metrics.downloadDurationMs = Math.round(downloadTime);
  }

  return result;
}

/**
 * Run concurrent tests for a given benchmark function
 */
async function runConcurrentTests<
  T extends (params: Record<string, unknown>) => Promise<BenchmarkResult>,
>(benchmarkFn: T, concurrencyLevel: number, args: Parameters<T>[]): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  // Process in batches of concurrencyLevel
  for (let i = 0; i < args.length; i += concurrencyLevel) {
    const batch = args.slice(i, i + concurrencyLevel);

    // Run the batch concurrently
    const batchPromises = batch.map((argSet) => benchmarkFn(...argSet));
    const batchResults = await Promise.all(batchPromises);

    results.push(...batchResults);

    // Small delay between batches to avoid overwhelming the server
    if (i + concurrencyLevel < args.length) {
      await sleep(500);
    }
  }

  return results;
}

/**
 * Benchmark a book's download capabilities at different concurrency levels
 */
async function benchmarkBook(
  baseUrl: string,
  book: {
    slug: string;
    category: 'small' | 'medium' | 'large';
    hasFullAudiobook: boolean;
    chapters: number[];
  },
  concurrencyLevel: number
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  // Generate test configurations for API endpoint
  const apiTestConfigs: Parameters<typeof benchmarkApiEndpoint>[] = [];

  // Full audiobook API tests
  if (book.hasFullAudiobook) {
    for (let i = 0; i < REPEAT_COUNT; i++) {
      apiTestConfigs.push([
        {
          baseUrl,
          slug: book.slug,
          type: 'full',
          metadata: {
            category: book.category,
            concurrencyLevel,
            testIndex: i,
          },
        },
      ]);
    }
  }

  // Chapter API tests
  for (const chapter of book.chapters) {
    for (let i = 0; i < REPEAT_COUNT; i++) {
      apiTestConfigs.push([
        {
          baseUrl,
          slug: book.slug,
          type: 'chapter',
          metadata: {
            category: book.category,
            concurrencyLevel,
            testIndex: i,
          },
          chapter,
        },
      ]);
    }
  }

  // Run API tests with specified concurrency
  logger.info(`Running API tests for ${book.slug} with concurrency ${concurrencyLevel}`);
  const apiResults = await runConcurrentTests(
    benchmarkApiEndpoint,
    concurrencyLevel,
    apiTestConfigs
  );
  results.push(...apiResults);

  // Generate test configurations for proxy endpoint
  const proxyTestConfigs: Parameters<typeof benchmarkProxyEndpoint>[] = [];

  // Full audiobook proxy tests
  if (book.hasFullAudiobook) {
    for (let i = 0; i < REPEAT_COUNT; i++) {
      proxyTestConfigs.push([
        {
          baseUrl,
          slug: book.slug,
          type: 'full',
          metadata: {
            category: book.category,
            concurrencyLevel,
            testIndex: i,
          },
        },
      ]);
    }
  }

  // Chapter proxy tests
  for (const chapter of book.chapters) {
    for (let i = 0; i < REPEAT_COUNT; i++) {
      proxyTestConfigs.push([
        {
          baseUrl,
          slug: book.slug,
          type: 'chapter',
          metadata: {
            category: book.category,
            concurrencyLevel,
            testIndex: i,
          },
          chapter,
        },
      ]);
    }
  }

  // Run proxy tests with specified concurrency
  logger.info(`Running proxy tests for ${book.slug} with concurrency ${concurrencyLevel}`);
  const proxyResults = await runConcurrentTests(
    benchmarkProxyEndpoint,
    concurrencyLevel,
    proxyTestConfigs
  );
  results.push(...proxyResults);

  return results;
}

/**
 * Calculate statistical metrics for a set of benchmark results
 */
export interface StatisticalMetrics {
  name: string;
  category: 'small' | 'medium' | 'large';
  testType: 'api' | 'proxy';
  concurrencyLevel: number;
  count: number;
  successRate: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number; // 95th percentile
  avgTtfb: number;
  avgTransferSpeed: number;
  avgSize: number;
}

function calculateStats(results: BenchmarkResult[]): StatisticalMetrics[] {
  // Group results by relevant dimensions
  const groupedResults = new Map<string, BenchmarkResult[]>();

  for (const result of results) {
    if (!result.success) continue; // Skip failed tests

    // Create a key for grouping
    const key = `${result.bookSlug}|${result.category}|${result.testType}|${result.concurrencyLevel}`;

    if (!groupedResults.has(key)) {
      groupedResults.set(key, []);
    }

    const group = groupedResults.get(key);
    if (group) {
      group.push(result);
    }
  }

  // Calculate metrics for each group
  const metrics: StatisticalMetrics[] = [];

  for (const [key, groupResults] of groupedResults.entries()) {
    if (groupResults.length === 0) continue;

    const [bookSlug, category, testType, concurrencyLevel] = key.split('|');

    // Get durations and sort them
    const durations = groupResults.map((r) => r.metrics.totalDurationMs).sort((a, b) => a - b);
    const ttfbs = groupResults.map((r) => r.metrics.ttfbMs);
    const transferSpeeds = groupResults.map((r) => r.metrics.transferSpeedKBps || 0);
    const sizes = groupResults.map((r) => r.metrics.contentLength || 0);

    const count = durations.length;
    const min = durations[0];
    const max = durations[count - 1];
    const avg = durations.reduce((sum, val) => sum + val, 0) / count;
    const median =
      count % 2 === 0
        ? (durations[count / 2 - 1] + durations[count / 2]) / 2
        : durations[Math.floor(count / 2)];
    const p95Index = Math.ceil(count * 0.95) - 1;
    const p95 = durations[p95Index];

    const avgTtfb = ttfbs.reduce((sum, val) => sum + val, 0) / count;
    const avgTransferSpeed = transferSpeeds.reduce((sum, val) => sum + val, 0) / count;
    const avgSize = sizes.reduce((sum, val) => sum + val, 0) / count;

    metrics.push({
      name: bookSlug,
      category: category as 'small' | 'medium' | 'large',
      testType: testType as 'api' | 'proxy',
      concurrencyLevel: parseInt(concurrencyLevel, 10),
      count,
      successRate: count / groupResults.length,
      min,
      max,
      avg,
      median,
      p95,
      avgTtfb,
      avgTransferSpeed,
      avgSize,
    });
  }

  return metrics;
}

// Note: HTML report generation functions moved to benchmark-report-generator.ts

/**
 * Main function to run the benchmarks
 */
async function runBenchmarks() {
  const { environment, concurrencyLevels } = getArgs();
  const baseUrl = BASE_URLS[environment as keyof typeof BASE_URLS];

  // Initialize benchmark suite
  const benchmarkSuite: BenchmarkSuite = {
    environment,
    baseUrl,
    date: new Date().toISOString(),
    startTime: performance.now(),
    endTime: 0,
    totalTests: 0,
    successful: 0,
    failed: 0,
    results: [],
  };

  logger.info(`Running download benchmarks in ${environment} environment (${baseUrl})`);
  logger.info(`Testing with concurrency levels: ${concurrencyLevels.join(', ')}`);

  // Run benchmarks for each book and concurrency level
  for (const level of concurrencyLevels) {
    logger.info(`===== Testing with concurrency level: ${level} =====`);

    for (const book of BENCHMARK_BOOKS) {
      logger.info(`Benchmarking downloads for book: ${book.slug} (${book.category})`);
      const bookResults = await benchmarkBook(baseUrl, book, level);
      benchmarkSuite.results.push(...bookResults);
    }
  }

  // Finalize results
  benchmarkSuite.endTime = performance.now();
  benchmarkSuite.totalTests = benchmarkSuite.results.length;
  benchmarkSuite.successful = benchmarkSuite.results.filter((r) => r.success).length;
  benchmarkSuite.failed = benchmarkSuite.totalTests - benchmarkSuite.successful;

  // Calculate statistics from results
  const stats = calculateStats(benchmarkSuite.results);

  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'performance-baselines');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save reports
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlPath = path.join(outputDir, `download-baseline-${environment}-${timestamp}.html`);
  const jsonPath = path.join(outputDir, `download-baseline-${environment}-${timestamp}.json`);

  fs.writeFileSync(htmlPath, generateHtmlReport(benchmarkSuite, stats));
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        suite: benchmarkSuite,
        statistics: stats,
      },
      null,
      2
    )
  );

  // Log results
  const successRate = (benchmarkSuite.successful / benchmarkSuite.totalTests) * 100;
  logger.info(
    `Benchmarks completed: ${benchmarkSuite.totalTests} total, ${benchmarkSuite.successful} passed, ${benchmarkSuite.failed} failed (${successRate.toFixed(2)}% success rate)`
  );
  logger.info(`Reports saved to ${htmlPath} and ${jsonPath}`);

  // Log some colored summary to the console
  console.warn('\n=======================================');
  console.warn(chalk.bold(`Download Performance Baseline (${environment})`));
  console.warn('=======================================');
  console.warn(`Total Tests: ${chalk.bold(benchmarkSuite.totalTests)}`);
  console.warn(`Successful: ${chalk.green.bold(benchmarkSuite.successful)}`);
  console.warn(`Failed: ${chalk.red.bold(benchmarkSuite.failed)}`);
  console.warn(`Success Rate: ${successRate.toFixed(2)}%`);
  console.warn(
    `Duration: ${((benchmarkSuite.endTime - benchmarkSuite.startTime) / 1000).toFixed(2)}s`
  );

  // Summary of key metrics
  const apiResponseTime = Math.round(
    stats.filter((s) => s.testType === 'api').reduce((sum, s) => sum + s.avg, 0) /
      stats.filter((s) => s.testType === 'api').length
  );
  const proxyResponseTime = Math.round(
    stats.filter((s) => s.testType === 'proxy').reduce((sum, s) => sum + s.avg, 0) /
      stats.filter((s) => s.testType === 'proxy').length
  );

  console.warn(`\nAverage API Response Time: ${chalk.cyan.bold(apiResponseTime)} ms`);
  console.warn(`Average Proxy Response Time: ${chalk.cyan.bold(proxyResponseTime)} ms`);
  console.warn('=======================================');

  // Return failure exit code if any tests failed
  if (benchmarkSuite.failed > 0) {
    process.exit(1);
  }
}

// Execute the benchmarks
runBenchmarks().catch((error) => {
  logger.error('Fatal error running benchmarks:', error);
  process.exit(1);
});
