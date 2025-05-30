#!/usr/bin/env node
/**
 * Book Cover Images Migration Script
 *
 * This script migrates book cover images from the local filesystem to Vercel Blob storage.
 * It uses the BlobService and BlobPathService utilities to handle the migration.
 *
 * Usage:
 *   npx tsx scripts/migrateBookCoverImages.ts [options]
 *
 * Options:
 *   --dry-run             Simulate migration without uploading (default: false)
 *   --books=slug1,slug2   Comma-separated list of book slugs to migrate (default: all)
 *   --force               Re-upload even if already migrated (default: false)
 *   --retries=3           Number of retries for failed uploads (default: 3)
 *   --concurrency=5       Number of concurrent uploads (default: 5)
 *   --log-file=path       Path to migration log file (default: cover-images-migration.json)
 */
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import translations from '../translations/index.js';
import { generateAssetUrl, normalizePath } from '../utils/ScriptPathUtils.js';
import { createScriptLogger } from '../utils/createScriptLogger.js';
import { BlobService } from '../utils/services/BlobService.js';
// Import BlobService
import { blobService } from '../utils/services/BlobService.js';

// Get this file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Configure logger
const logger = createScriptLogger({
  taskId: 'T051',
  context: 'book-cover-migration',
});

// Migration options
interface MigrationOptions {
  dryRun?: boolean;
  books?: string[];
  force?: boolean;
  retries?: number;
  concurrency?: number;
  logFile?: string;
}

// Book migration result
interface BookMigrationResult {
  status: 'success' | 'skipped' | 'failed';
  originalPath: string;
  blobPath: string;
  blobUrl: string;
  error?: string;
  size?: number;
  uploadedAt?: string;
}

// Overall migration result
interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  books: Record<string, BookMigrationResult>;
  startTime: string;
  endTime: string;
  duration: number; // in milliseconds
}

/**
 * Process a single command line argument
 */
function processArgument(arg: string, options: MigrationOptions): void {
  if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg.startsWith('--books=')) {
    const books = arg.substring('--books='.length).split(',');
    options.books = books.map((b) => b.trim()).filter(Boolean);
  } else if (arg === '--force') {
    options.force = true;
  } else if (arg.startsWith('--retries=')) {
    options.retries = parseInt(arg.substring('--retries='.length), 10);
  } else if (arg.startsWith('--concurrency=')) {
    options.concurrency = parseInt(arg.substring('--concurrency='.length), 10);
  } else if (arg.startsWith('--log-file=')) {
    options.logFile = arg.substring('--log-file='.length);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions {
  const options: MigrationOptions = {
    dryRun: false,
    force: false,
    retries: 3,
    concurrency: 5,
    logFile: 'cover-images-migration.json',
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    processArgument(arg, options);
  }

  return options;
}

/**
 * Migration log class for tracking migration status
 */
class MigrationLog {
  private log: Record<string, BookMigrationResult> = {};
  private readonly logPath: string;

  constructor(logFile: string) {
    this.logPath = path.isAbsolute(logFile) ? logFile : path.join(projectRoot, logFile);
  }

  /**
   * Load existing migration log if available
   */
  public async load(): Promise<void> {
    try {
      if (existsSync(this.logPath)) {
        const data = await fs.readFile(this.logPath, 'utf8');
        this.log = JSON.parse(data);
        logger.info({
          msg: 'Loaded migration log',
          logPath: this.logPath,
        });
      } else {
        logger.info({
          msg: 'No existing migration log found. Starting fresh',
          logPath: this.logPath,
        });
        this.log = {};
      }
    } catch (error) {
      logger.warn({
        msg: 'Error loading migration log',
        error: error instanceof Error ? error.message : String(error),
        logPath: this.logPath,
      });
      this.log = {};
    }
  }

  /**
   * Save migration log to disk
   */
  public async save(): Promise<void> {
    try {
      await fs.writeFile(this.logPath, JSON.stringify(this.log, null, 2), 'utf8');
      logger.info({
        msg: 'Migration log saved',
        logPath: this.logPath,
      });
    } catch (error) {
      logger.error({
        msg: 'Error saving migration log',
        error: error instanceof Error ? error.message : String(error),
        logPath: this.logPath,
      });
      throw new Error(
        `Failed to save migration log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Add a book migration entry
   */
  public add(bookSlug: string, result: BookMigrationResult): void {
    this.log[bookSlug] = result;
  }

  /**
   * Check if a book has been migrated
   */
  public has(bookSlug: string): boolean {
    return bookSlug in this.log && this.log[bookSlug].status === 'success';
  }

  /**
   * Get a specific book's migration result
   */
  public get(bookSlug: string): BookMigrationResult | undefined {
    return this.log[bookSlug];
  }

  /**
   * Get all migration results
   */
  public getAll(): Record<string, BookMigrationResult> {
    return { ...this.log };
  }
}

/**
 * Cover Image Migration Service
 */
class CoverImageMigrationService {
  private migrationLog: MigrationLog;

  constructor(
    private readonly blobService: BlobService,
    logFile: string = 'cover-images-migration.json',
  ) {
    this.migrationLog = new MigrationLog(logFile);
  }

  /**
   * Migrate all book cover images
   */
  public async migrateAll(options: MigrationOptions = {}): Promise<MigrationResult> {
    const startTime = new Date();

    // Initialize result
    const result = this.initializeResult(startTime);

    // Start migration
    logger.info({
      msg: 'Starting book cover images migration',
      options,
    });

    try {
      // Load existing migration log
      await this.migrationLog.load();

      // Get books with cover images
      const books = this.getBooksToProcess(options);
      result.total = books.length;

      // Log migration details
      this.logMigrationDetails(result.total, options);

      // Process books with limited concurrency
      await this.processBooksInChunks(books, options, result);

      // Save migration log
      if (!options.dryRun) {
        await this.migrationLog.save();
      }

      // Calculate duration
      const endTime = new Date();
      result.endTime = endTime.toISOString();
      result.duration = endTime.getTime() - startTime.getTime();

      return result;
    } catch (error) {
      logger.error({
        msg: 'Error during migration',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize result object
   */
  private initializeResult(startTime: Date): MigrationResult {
    return {
      total: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      books: {},
      startTime: startTime.toISOString(),
      endTime: '',
      duration: 0,
    };
  }

  /**
   * Get books to process based on options
   */
  private getBooksToProcess(options: MigrationOptions): Array<(typeof translations)[0]> {
    return translations
      .filter((book) => book.coverImage)
      .filter((book) => !options.books || options.books.includes(book.slug));
  }

  /**
   * Log migration details
   */
  private logMigrationDetails(totalBooks: number, options: MigrationOptions): void {
    logger.info({
      msg: 'Found books with cover images',
      totalBooks,
    });

    if (options.dryRun) {
      logger.info({
        msg: 'DRY RUN: No files will be uploaded',
      });
    }
  }

  /**
   * Process books in chunks for concurrency control
   */
  private async processBooksInChunks(
    books: Array<(typeof translations)[0]>,
    options: MigrationOptions,
    result: MigrationResult,
  ): Promise<void> {
    const concurrency = options.concurrency || 5;
    const chunks = this.chunkArray(books, concurrency);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (book) => {
          const migrationResult = await this.processBookMigration(book, options);
          this.updateMigrationStatistics(book.slug, migrationResult, result);
          result.books[book.slug] = migrationResult;
          this.migrationLog.add(book.slug, migrationResult);
        }),
      );
    }
  }

  /**
   * Process migration for a single book
   */
  private async processBookMigration(
    book: (typeof translations)[0],
    options: MigrationOptions,
  ): Promise<BookMigrationResult> {
    try {
      // Skip if already migrated and not forced
      if (this.shouldSkipBook(book.slug, options)) {
        return this.handleSkippedBook(book.slug);
      }

      // Calculate paths using ScriptPathUtils
      const originalPath = book.coverImage;
      const blobPath = normalizePath(originalPath);
      const blobUrl = generateAssetUrl(blobPath);

      // Handle dry run mode
      if (options.dryRun) {
        return this.handleDryRunBook(book.slug, originalPath, blobPath);
      }

      // Perform actual migration
      logger.info({
        msg: 'Starting book cover migration',
        bookSlug: book.slug,
        originalPath,
        blobPath,
      });

      return await this.migrateBookCover(book, options.retries || 3);
    } catch (error) {
      return this.handleMigrationError(book, error);
    }
  }

  /**
   * Check if a book should be skipped
   */
  private shouldSkipBook(bookSlug: string, options: MigrationOptions): boolean {
    return this.migrationLog.has(bookSlug) && !options.force && !options.dryRun;
  }

  /**
   * Handle a book that should be skipped
   */
  private handleSkippedBook(bookSlug: string): BookMigrationResult {
    const existingResult = this.migrationLog.get(bookSlug);
    if (existingResult) {
      logger.info({
        msg: 'Skipping book - already migrated',
        bookSlug,
        blobPath: existingResult.blobPath,
      });
    }
    return existingResult;
  }

  /**
   * Handle book in dry run mode
   */
  private handleDryRunBook(
    bookSlug: string,
    originalPath: string,
    blobPath: string,
  ): BookMigrationResult {
    logger.info({
      msg: 'DRY RUN: Would migrate cover image',
      bookSlug,
      originalPath,
      blobPath,
    });

    return {
      status: 'skipped',
      originalPath,
      blobPath,
      blobUrl: '',
    };
  }

  /**
   * Handle migration error
   */
  private handleMigrationError(
    book: (typeof translations)[0],
    error: unknown,
  ): BookMigrationResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({
      msg: 'Error during book migration',
      bookSlug: book.slug,
      error: errorMessage,
    });

    return {
      status: 'failed',
      originalPath: book.coverImage,
      blobPath: normalizePath(book.coverImage),
      blobUrl: '',
      error: errorMessage,
    };
  }

  /**
   * Update migration statistics based on result
   */
  private updateMigrationStatistics(
    bookSlug: string,
    migrationResult: BookMigrationResult,
    result: MigrationResult,
  ): void {
    if (migrationResult.status === 'success') {
      logger.info({
        msg: 'Successfully migrated book cover',
        bookSlug,
        blobUrl: migrationResult.blobUrl,
      });
      result.migrated++;
    } else if (migrationResult.status === 'skipped') {
      logger.info({
        msg: 'Skipped book cover migration',
        bookSlug,
      });
      result.skipped++;
    } else {
      logger.error({
        msg: 'Failed to migrate book cover',
        bookSlug,
        error: migrationResult.error,
      });
      result.failed++;
    }
  }

  /**
   * Read file and create File object
   */
  private async readBookCoverFile(fullPath: string, originalPath: string): Promise<File> {
    const fileBuffer = await fs.readFile(fullPath);
    return new File([fileBuffer], path.basename(originalPath), {
      type: this.getContentType(originalPath),
    });
  }

  /**
   * Attempt upload with retries
   */
  private async attemptUploadWithRetries(
    file: File,
    pathname: string,
    filename: string,
    maxRetries: number,
  ): Promise<{ success: boolean; result?: { url: string; uploadedAt: string }; error?: string }> {
    let lastError = '';

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Upload to Blob storage
        const uploadResult = await this.blobService.uploadFile(file, {
          pathname,
          filename,
          access: 'public',
          cacheControl: 'max-age=31536000, immutable', // 1 year cache
        });

        // Verify upload
        const verified = await this.verifyUpload(uploadResult.url);
        if (!verified) {
          lastError = 'Verification failed after upload';
          this.logUploadRetry(attempt, maxRetries, lastError);
          await this.delayBeforeRetry(attempt);
          continue;
        }

        return { success: true, result: uploadResult };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        this.logUploadRetry(attempt, maxRetries, lastError);

        if (attempt < maxRetries - 1) {
          await this.delayBeforeRetry(attempt);
        }
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
    };
  }

  /**
   * Log upload retry
   */
  private logUploadRetry(attempt: number, maxRetries: number, error: string): void {
    logger.warn({
      msg: 'Upload attempt failed',
      attempt: attempt + 1,
      maxRetries,
      error,
    });
  }

  /**
   * Delay before retry with exponential backoff
   */
  private async delayBeforeRetry(attempt: number): Promise<void> {
    const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, etc.
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Migrate a single book cover image
   */
  private async migrateBookCover(
    book: (typeof translations)[0],
    maxRetries: number = 3,
  ): Promise<BookMigrationResult> {
    const originalPath = book.coverImage;
    const blobPath = normalizePath(originalPath);

    // Verify file exists
    const fullPath = path.join(projectRoot, 'public', originalPath);
    if (!existsSync(fullPath)) {
      return {
        status: 'failed',
        originalPath,
        blobPath,
        blobUrl: '',
        error: `File not found: ${fullPath}`,
      };
    }

    try {
      // Read file
      const file = await this.readBookCoverFile(fullPath, originalPath);

      // Get the directory path
      const pathname = path.dirname(blobPath);
      const filename = path.basename(blobPath);

      // Try upload with retries
      const uploadAttempt = await this.attemptUploadWithRetries(
        file,
        pathname,
        filename,
        maxRetries,
      );

      if (uploadAttempt.success && uploadAttempt.result) {
        return {
          status: 'success',
          originalPath,
          blobPath,
          blobUrl: uploadAttempt.result.url,
          uploadedAt: uploadAttempt.result.uploadedAt,
        };
      } else {
        return {
          status: 'failed',
          originalPath,
          blobPath,
          blobUrl: '',
          error: uploadAttempt.error,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'failed',
        originalPath,
        blobPath,
        blobUrl: '',
        error: errorMessage,
      };
    }
  }

  /**
   * Verify a file was uploaded successfully
   */
  private async verifyUpload(blobUrl: string): Promise<boolean> {
    try {
      // Get file info to verify it exists
      const fileInfo = await this.blobService.getFileInfo(blobUrl);
      return fileInfo.size > 0;
    } catch (error) {
      logger.warn({
        msg: 'Upload verification failed',
        blobUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();

    switch (extension) {
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.gif':
        return 'image/gif';
      case '.svg':
        return 'image/svg+xml';
      case '.webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Split an array into chunks for concurrency control
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Print migration results
 */
function printResults(result: MigrationResult): void {
  const failedMigrations = Object.entries(result.books)
    .filter(([_, r]) => r.status === 'failed')
    .map(([slug, r]) => ({ slug, error: r.error }));

  logger.info({
    msg: 'Migration completed',
    summary: {
      total: result.total,
      migrated: result.migrated,
      skipped: result.skipped,
      failed: result.failed,
      durationSeconds: (result.duration / 1000).toFixed(2),
      completedAt: result.endTime,
      failedMigrations: failedMigrations.length > 0 ? failedMigrations : undefined,
    },
  });
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Parse arguments
    const options = parseArgs();

    // Create migration service (updated to use ScriptPathUtils, no longer needs blobPathService)
    const migrationService = new CoverImageMigrationService(blobService, options.logFile);

    // Run migration
    const result = await migrationService.migrateAll(options);

    // Print results
    printResults(result);

    // Exit with appropriate code
    process.exit(result.failed > 0 ? 1 : 0);
  } catch (error) {
    logger.error({
      msg: 'Migration failed',
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Run the script
main();
