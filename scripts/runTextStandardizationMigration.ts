#!/usr/bin/env tsx
/**
 * Run the actual text standardization migration in production
 * This script copies text files from legacy blob paths to standardized blob paths
 */
import * as dotenv from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { logger } from '../utils/logger.js';
import { blobPathService } from '../utils/services/BlobPathService.js';
import { blobService } from '../utils/services/BlobService.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface MigrationResult {
  originalPath: string;
  standardizedPath: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

interface MigrationSummary {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: MigrationResult[];
  startTime: string;
  endTime: string;
  durationMs: number;
}

const rootLogger = logger.child({ module: 'text-standardization-migration' });

// Check if running locally
const isLocal =
  process.env.NODE_ENV !== 'production' &&
  process.env.VERCEL_ENV !== 'production' &&
  process.argv.includes('--local');

if (!process.env.BLOB_READ_WRITE_TOKEN && !isLocal) {
  rootLogger.error({ msg: 'BLOB_READ_WRITE_TOKEN is required for production migration' });
  process.exit(1);
}

/**
 * Check if file needs to be migrated and if so, upload to standardized path
 */
async function checkAndCopyFile(originalPath: string): Promise<MigrationResult> {
  const fileLogger = rootLogger.child({ originalPath });

  try {
    // Get standardized path
    const standardizedPath = blobPathService.convertLegacyPath(originalPath);

    // Skip if already standardized
    if (originalPath === standardizedPath) {
      fileLogger.info({ msg: 'Path already standardized' });
      return {
        originalPath,
        standardizedPath,
        status: 'skipped',
      };
    }

    fileLogger.info({ standardizedPath, msg: 'Converting path' });

    // Check if destination already exists
    if (await isFileAlreadyMigrated(standardizedPath, fileLogger)) {
      return {
        originalPath,
        standardizedPath,
        status: 'skipped',
      };
    }

    // Get the file content from original path
    const downloadResult = await downloadOriginalFile(originalPath, fileLogger);
    if (downloadResult.status === 'failed') {
      return downloadResult;
    }

    // Upload to standardized path
    return await uploadToStandardizedPath(downloadResult.content, standardizedPath, fileLogger);
  } catch (error) {
    fileLogger.error({ error, msg: 'Unexpected error during migration' });
    return {
      originalPath,
      standardizedPath: '',
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if a file already exists at the standardized path
 */
async function isFileAlreadyMigrated(
  standardizedPath: string,
  logger: ReturnType<typeof rootLogger.child>
): Promise<boolean> {
  try {
    const standardUrl = blobService.getUrlForPath(standardizedPath);
    const fileInfo = await blobService.getFileInfo(standardUrl);
    if (fileInfo.size > 0) {
      logger.info({ msg: 'File already exists at standardized path' });
      return true;
    }
    return false;
  } catch {
    // File doesn't exist, which is expected
    return false;
  }
}

/**
 * Download the original file content
 */
async function downloadOriginalFile(
  originalPath: string,
  logger: ReturnType<typeof rootLogger.child>
): Promise<{
  status: 'success' | 'failed';
  content?: Buffer;
  error?: string;
  originalPath: string;
  standardizedPath: string;
}> {
  try {
    const response = await fetch(blobService.getUrlForPath(originalPath));
    if (!response.ok) {
      throw new Error(`Failed to fetch original file: ${response.status} ${response.statusText}`);
    }
    const content = Buffer.from(await response.arrayBuffer());
    return { status: 'success', content, originalPath, standardizedPath: '' };
  } catch (error) {
    logger.error({ error, msg: 'Failed to download original file' });
    return {
      status: 'failed',
      originalPath,
      standardizedPath: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Upload content to the standardized path
 */
async function uploadToStandardizedPath(
  content: Buffer,
  standardizedPath: string,
  logger: ReturnType<typeof rootLogger.child>
): Promise<MigrationResult> {
  try {
    // Convert buffer to string for text files
    const textContent = content.toString('utf-8');

    const uploadResult = await blobService.uploadText(textContent, standardizedPath, {
      access: 'public',
      contentType: 'text/plain',
    });

    logger.info({
      url: uploadResult.url,
      msg: 'Successfully uploaded to standardized path',
    });

    return {
      originalPath: '',
      standardizedPath,
      status: 'success',
    };
  } catch (error) {
    logger.error({ error, msg: 'Failed to upload to standardized path' });
    return {
      originalPath: '',
      standardizedPath,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Load files from migration JSON files
 */
async function loadFilesFromMigrationData(): Promise<string[]> {
  const filesToMigrate: string[] = [];
  const migrationFiles = [
    'brainrot-text-migration.json',
    'source-text-migration.json',
    'custom-text-migration.json',
  ];

  for (const migrationFile of migrationFiles) {
    const filePath = join(process.cwd(), migrationFile);
    if (existsSync(filePath)) {
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        const paths = extractPathsFromMigrationData(data);
        filesToMigrate.push(...paths);
      } catch (error) {
        rootLogger.error({
          file: migrationFile,
          error,
          msg: 'Failed to load migration file',
        });
      }
    }
  }

  return filesToMigrate;
}

/**
 * Extract paths from migration data
 */
function extractPathsFromMigrationData(data: unknown): string[] {
  const paths: string[] = [];

  interface FileInfo {
    blobPath?: string;
  }

  if (typeof data !== 'object' || data === null) {
    return paths;
  }

  // Process each book in the data
  for (const book of Object.values(data)) {
    if (typeof book !== 'object' || book === null) {
      continue;
    }

    // Extract blob paths from file info objects
    extractPathsFromBook(book as Record<string, FileInfo>, paths);
  }

  return paths;
}

/**
 * Helper to extract paths from a book object
 */
function extractPathsFromBook(book: Record<string, { blobPath?: string }>, paths: string[]): void {
  for (const fileInfo of Object.values(book)) {
    if (!fileInfo.blobPath || fileInfo.blobPath.startsWith('http')) {
      continue;
    }
    paths.push(fileInfo.blobPath);
  }
}

/**
 * Load files from translation book files
 */
async function loadFilesFromTranslations(): Promise<string[]> {
  const filesToMigrate: string[] = [];
  const books = ['hamlet', 'the-iliad', 'the-odyssey', 'the-aeneid', 'huckleberry-finn'];

  for (const book of books) {
    try {
      const translation = await import(`../translations/books/${book}.js`);
      const bookData = translation.default;

      // Skip if no chapters
      if (!bookData.chapters) {
        continue;
      }

      // Extract paths from chapters
      extractPathsFromChapters(bookData.chapters, filesToMigrate);
    } catch (error) {
      rootLogger.warn({ book, error, msg: 'Could not load translation' });
    }
  }

  return filesToMigrate;
}

/**
 * Helper to extract paths from chapter objects
 */
function extractPathsFromChapters(chapters: Array<{ text?: string }>, paths: string[]): void {
  for (const chapter of chapters) {
    if (!chapter.text || chapter.text.startsWith('http')) {
      continue;
    }

    // Extract path from getAssetUrl result
    const match = chapter.text.match(/\/assets\/.+\.txt$/);
    if (match) {
      paths.push(match[0].substring(1)); // Remove leading slash
    }
  }
}

/**
 * Process files in batches with concurrency control
 */
async function processFilesInBatches(filesToMigrate: string[]): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];
  const concurrency = 5;

  // Create chunks for concurrent processing
  const chunks = [];
  for (let i = 0; i < filesToMigrate.length; i += concurrency) {
    chunks.push(filesToMigrate.slice(i, i + concurrency));
  }

  // Process each chunk
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map((file) => checkAndCopyFile(file)));
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Generate and save migration summary
 */
function generateMigrationSummary(results: MigrationResult[], startTime: Date): MigrationSummary {
  const endTime = new Date();

  const summary: MigrationSummary = {
    total: results.length,
    successful: results.filter((r) => r.status === 'success').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    results,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationMs: endTime.getTime() - startTime.getTime(),
  };

  // Save report
  const reportPath = join(
    process.cwd(),
    'migration-logs',
    `text-standardization-production-${Date.now()}.json`
  );
  writeFileSync(reportPath, JSON.stringify(summary, null, 2));

  // Log summary
  rootLogger.info({
    ...summary,
    reportPath,
    msg: 'Migration complete',
  });

  return summary;
}

/**
 * Main function that orchestrates the migration process
 */
async function main() {
  const startTime = new Date();
  rootLogger.info({ msg: 'Starting text standardization migration' });

  // Load file list from migration logs and translation files
  const filesFromMigration = await loadFilesFromMigrationData();
  const filesFromTranslations = await loadFilesFromTranslations();

  // Combine and deduplicate files
  const filesToMigrate = [...new Set([...filesFromMigration, ...filesFromTranslations])];
  rootLogger.info({ count: filesToMigrate.length, msg: 'Files to migrate' });

  // Process files
  const results = await processFilesInBatches(filesToMigrate);

  // Generate summary
  const summary = generateMigrationSummary(results, startTime);

  // Exit with appropriate code
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  rootLogger.error({ error, msg: 'Fatal error' });
  process.exit(1);
});
