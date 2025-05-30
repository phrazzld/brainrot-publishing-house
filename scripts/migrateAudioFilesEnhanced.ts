#!/usr/bin/env node
/**
 * Enhanced Audio Files Migration Script with Validation
 *
 * This script migrates audio files between different storage locations or verifies
 * existing files with robust validation, progress tracking, and error handling.
 * It now works exclusively with Vercel Blob storage.
 *
 * Usage:
 *   npx tsx scripts/migrateAudioFilesEnhanced.ts [options]
 *
 * Options:
 *   --dry-run             Simulate migration without uploading (default: false)
 *   --books=slug1,slug2   Comma-separated list of book slugs to migrate (default: all)
 *   --force               Re-upload even if already migrated (default: false)
 *   --retries=3           Number of retries for failed operations (default: 3)
 *   --concurrency=3       Number of concurrent operations (default: 3)
 *   --log-file=path       Path to migration log file (default: audio-migration-enhanced.json)
 *   --verbose             Enable detailed logging (default: false)
 *   --size-threshold=N    Minimum size (in KB) to consider file valid (default: 100)
 *   --inventory=path      Path to existing audio inventory JSON file (optional)
 */
// Load environment variables
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

import translations from '../translations/index.js';
import { generateAssetUrl, generateBlobPath, generateFilename } from '../utils/ScriptPathUtils.js';
import { createScriptLogger } from '../utils/createScriptLogger.js';
import { createServices } from '../utils/createServices.js';

dotenv.config({ path: '.env.local' });

// Initialize services with standardized logging
const logger = createScriptLogger({
  taskId: 'T046',
  context: 'migration',
});

// Initialize services
const { blobService } = createServices({ logger });

// Constants
const MIN_AUDIO_SIZE_KB = 100; // Minimum size in KB for a valid audio file
const MP3_HEADER_MAGIC = Buffer.from([0xff, 0xfb]); // Common MP3 frame header start

// Types
interface MigrationOptions {
  dryRun: boolean;
  books: string[];
  force: boolean;
  retries: number;
  concurrency: number;
  logFile: string;
  verbose: boolean;
  sizeThreshold: number; // in KB
  inventoryPath?: string;
}

interface AudioFile {
  blobPath: string;
  bookSlug: string;
  chapterTitle?: string;
  size?: number;
  blobUrl: string;
}

interface MigrationResult {
  status: 'success' | 'skipped' | 'failed';
  bookSlug: string;
  chapterTitle?: string;
  blobPath: string;
  blobUrl: string;
  contentType?: string;
  error?: string;
  skipReason?: string;
  totalTime?: number;
  uploadedAt?: string;
  validated: boolean;
  validationInfo?: {
    sizeValid: boolean;
    contentValidated: boolean;
    size?: number;
  };
}

interface MigrationSummary {
  timestamp: string;
  total: number;
  successful: number;
  skipped: number;
  failed: number;
  totalDuration: number; // in milliseconds
  booksCovered: string[];
  validationSuccess: number;
  validationFailed: number;
  startTime: string;
  endTime: string;
}

/**
 * Verify that a buffer contains valid audio content
 */
function verifyAudioContent(buffer: Buffer): boolean {
  // Check for MP3 header magic bytes
  for (let i = 0; i < Math.min(buffer.length, 4096) - 1; i++) {
    if (buffer[i] === MP3_HEADER_MAGIC[0] && buffer[i + 1] === MP3_HEADER_MAGIC[1]) {
      return true;
    }
  }

  return false;
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
  } else if (arg === '--verbose') {
    options.verbose = true;
  } else if (arg.startsWith('--size-threshold=')) {
    options.sizeThreshold = parseInt(arg.substring('--size-threshold='.length), 10);
  } else if (arg.startsWith('--inventory=')) {
    options.inventoryPath = arg.substring('--inventory='.length);
  }
}

/**
 * Parse command-line arguments
 */
function parseArgs(): MigrationOptions {
  const options: MigrationOptions = {
    dryRun: false,
    books: [],
    force: false,
    retries: 3,
    concurrency: 3,
    logFile: 'audio-migration-enhanced.json',
    verbose: false,
    sizeThreshold: MIN_AUDIO_SIZE_KB,
  };

  const args = process.argv.slice(2);
  for (const arg of args) {
    processArgument(arg, options);
  }

  return options;
}

/**
 * Create a readline interface for user confirmation
 */
function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
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
 * Main class for enhanced audio file migration and validation
 */
class EnhancedAudioMigrator {
  private results: MigrationResult[] = [];
  private activePromises: Promise<void>[] = [];
  private semaphoreValue: number;
  private startTime: Date = new Date();
  private progressCount = 0;
  private totalFiles = 0;
  private audioFiles: AudioFile[] = [];

  constructor(private readonly options: MigrationOptions) {
    this.semaphoreValue = options.concurrency;
  }

  /**
   * Run the migration process
   */
  public async run(): Promise<MigrationSummary> {
    this.startTime = new Date();
    this.logStartupInfo();

    try {
      // Process books and gather files
      await this.prepareAudioFiles();

      // Confirm and process files
      if (!this.options.dryRun && !(await this.confirmOperation())) {
        this.logOperationCancelled();
        process.exit(0);
      }

      // Process files with concurrency
      await this.processAudioFilesWithConcurrency();

      // Generate summary and save results
      return await this.finalizeMigration();
    } catch (error) {
      this.logMigrationFailure(error);
      throw error;
    }
  }

  /**
   * Log startup information
   */
  private logStartupInfo(): void {
    logger.info({
      msg: `Starting enhanced audio files validation ${this.options.dryRun ? '(DRY RUN)' : ''}`,
      operation: 'start',
      dryRun: this.options.dryRun,
    });
  }

  /**
   * Log operation cancelled message
   */
  private logOperationCancelled(): void {
    logger.info({
      msg: 'Operation cancelled by user',
      operation: 'cancelled',
    });
  }

  /**
   * Log migration failure
   */
  private logMigrationFailure(error: unknown): void {
    logger.error({
      msg: 'Migration failed',
      operation: 'migration_failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  /**
   * Prepare audio files for processing
   */
  private async prepareAudioFiles(): Promise<void> {
    // Get books to process
    const booksToProcess =
      this.options.books.length > 0 ? this.options.books : translations.map((book) => book.slug);

    logger.info({
      msg: `Processing books: ${booksToProcess.join(', ')}`,
      operation: 'process_books',
      books: booksToProcess,
    });

    // Gather all audio files to process
    await this.gatherAudioFiles(booksToProcess);

    // Process each audio file with concurrency
    this.totalFiles = this.audioFiles.length;
    logger.info({
      msg: `Found ${this.totalFiles} audio files to process`,
      operation: 'files_found',
      count: this.totalFiles,
    });
  }

  /**
   * Process audio files with concurrency control
   */
  private async processAudioFilesWithConcurrency(): Promise<void> {
    for (const audioFile of this.audioFiles) {
      await this.processAudioFileWithSemaphore(audioFile);
    }

    // Wait for all remaining operations
    if (this.activePromises.length > 0) {
      await this.waitForRemainingOperations();
    }
  }

  /**
   * Wait for remaining operations to complete
   */
  private async waitForRemainingOperations(): Promise<void> {
    logger.info({
      msg: `Waiting for ${this.activePromises.length} remaining operations...`,
      operation: 'wait_remaining',
      count: this.activePromises.length,
    });
    await Promise.all(this.activePromises);
  }

  /**
   * Process a single audio file with semaphore control
   */
  private async processAudioFileWithSemaphore(audioFile: AudioFile): Promise<void> {
    // Wait if we've reached concurrency limit
    if (this.semaphoreValue <= 0) {
      await Promise.race(this.activePromises);
    }

    // Process the file
    this.semaphoreValue--;

    const promise = this.processAudioFile(audioFile)
      .catch((error) => {
        logger.error({
          msg: `Error processing ${audioFile.blobPath}`,
          operation: 'process_file',
          path: audioFile.blobPath,
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        this.semaphoreValue++;
        this.activePromises = this.activePromises.filter((p) => p !== promise);
        this.progressCount++;
        this.updateProgress();
      });

    this.activePromises.push(promise);
  }

  /**
   * Finalize migration with summary and saved results
   */
  private async finalizeMigration(): Promise<MigrationSummary> {
    // Generate and save summary
    const summary = this.generateSummary();
    this.printSummary(summary);
    await this.saveResults(summary);

    return summary;
  }

  /**
   * Display progress update
   */
  private updateProgress(): void {
    if (this.totalFiles === 0) return;

    const percent = Math.round((this.progressCount / this.totalFiles) * 100);
    const success = this.results.filter((r) => r.status === 'success').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;

    // Replace console output with structured logging
    logger.info({
      msg: 'Progress update',
      operation: 'progress',
      current: this.progressCount,
      total: this.totalFiles,
      percent,
      success,
      skipped,
      failed,
    });
  }

  /**
   * Gather all audio files that need to be processed
   */
  private async gatherAudioFiles(booksToProcess: string[]): Promise<void> {
    // If inventory path is provided, load from there
    if (this.options.inventoryPath && existsSync(this.options.inventoryPath)) {
      logger.info({
        msg: 'Loading audio inventory from file',
        inventoryPath: this.options.inventoryPath,
      });
      await this.loadAudioFilesFromInventory();
      return;
    }

    // Otherwise build list from translations and check Vercel Blob
    logger.info({ msg: 'Building audio files list from translations' });
    await this.buildAudioFilesFromTranslations(booksToProcess);
  }

  /**
   * Build audio files list from translations
   */
  private async buildAudioFilesFromTranslations(booksToProcess: string[]): Promise<void> {
    for (const bookSlug of booksToProcess) {
      const book = translations.find((t) => t.slug === bookSlug);

      if (!book) {
        logger.warn({
          msg: 'Book not found in translations',
          bookSlug,
        });
        continue;
      }

      if (!book.chapters) {
        logger.error({
          msg: 'No chapters found for book',
          bookSlug,
        });
        continue;
      }

      this.processBookChapters(book);
    }
  }

  /**
   * Process chapters from a book to add audio files
   */
  private processBookChapters(book: (typeof translations)[0]): void {
    for (const chapter of book.chapters) {
      if (!chapter.audioSrc) continue;

      // Extract the file name and chapter number
      const fileName = path.basename(chapter.audioSrc);
      const chapterNumber = fileName.replace(/\.mp3$/, '').replace(/^.*?([\d]+)$/, '$1');

      // Construct standardized filename and path using ScriptPathUtils
      const standardFilename = generateFilename('audio', chapterNumber);
      const blobPath = generateBlobPath(book.slug, 'audio', standardFilename);

      // Get URL for verification and uploading
      const blobUrl = generateAssetUrl(blobPath);

      this.audioFiles.push({
        blobPath,
        bookSlug: book.slug,
        chapterTitle: chapter.title,
        blobUrl,
      });
    }
  }

  /**
   * Load audio files from an existing inventory JSON file
   */
  private async loadAudioFilesFromInventory(): Promise<void> {
    if (!this.options.inventoryPath) return;

    try {
      const inventoryData = await fs.readFile(this.options.inventoryPath, 'utf8');
      const inventory = JSON.parse(inventoryData);

      // Check if this is the expected format
      if (inventory.books && Array.isArray(inventory.books)) {
        this.processInventoryBooks(inventory.books);
      } else {
        throw new Error('Invalid inventory format');
      }

      logger.info({
        msg: 'Loaded audio files from inventory',
        audioFilesCount: this.audioFiles.length,
      });
    } catch (error) {
      logger.error({
        msg: 'Error loading inventory',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Failed to load inventory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Process books from inventory data
   */
  private processInventoryBooks(books: Array<Record<string, unknown>>): void {
    // Filter to only include books specified in options.books if any
    const booksToInclude =
      this.options.books.length > 0
        ? books.filter((b) => this.options.books.includes(b.slug as string))
        : books;

    for (const book of booksToInclude) {
      this.processInventoryBook(book);
    }
  }

  /**
   * Process a single book from inventory
   */
  private processInventoryBook(book: Record<string, unknown>): void {
    if (!book.files || !Array.isArray(book.files)) return;

    for (const file of book.files) {
      if (this.shouldProcessInventoryFile(file)) {
        this.addAudioFileFromInventory(book, file);
      }
    }
  }

  /**
   * Determine if an inventory file should be processed
   */
  private shouldProcessInventoryFile(file: Record<string, unknown>): boolean {
    // Skip placeholder files
    if (file.isPlaceholder) return false;

    // Skip non-existent files
    if (!file.exists) return false;

    // Only process files with blob URLs
    return !!file.blobUrl;
  }

  /**
   * Add an audio file from inventory data
   */
  private addAudioFileFromInventory(
    book: Record<string, unknown>,
    file: Record<string, unknown>,
  ): void {
    this.audioFiles.push({
      blobPath:
        (file.blobPath as string) ||
        `books/${book.slug as string}/audio/${path.basename(file.key as string)}`,
      bookSlug: book.slug as string,
      chapterTitle: file.chapterTitle as string,
      size: file.size as number,
      blobUrl: file.blobUrl as string,
    });
  }

  /**
   * Process a single audio file
   */
  private async processAudioFile(audioFile: AudioFile): Promise<void> {
    const operationStartTime = Date.now();
    const { blobPath, blobUrl } = audioFile;

    this.logVerbose(`Processing: ${blobPath}`);

    const result = this.createInitialResult(audioFile);

    try {
      const fileStatus = await this.checkFileExistence(blobUrl);

      if (this.shouldSkipFile(fileStatus)) {
        this.handleSkippedFile(result, fileStatus);
        return;
      }

      if (this.options.dryRun) {
        this.handleDryRunFile(result, blobPath);
        return;
      }

      if (fileStatus.exists) {
        await this.validateFileContent(result, blobUrl, fileStatus.size, operationStartTime);
      } else {
        this.handleNonExistentFile(result);
      }
    } catch (error) {
      this.handleFileError(result, error, operationStartTime);
    }

    this.results.push(result);
  }

  /**
   * Create initial result object for a file
   */
  private createInitialResult(audioFile: AudioFile): MigrationResult {
    return {
      status: 'failed',
      bookSlug: audioFile.bookSlug,
      chapterTitle: audioFile.chapterTitle,
      blobPath: audioFile.blobPath,
      blobUrl: audioFile.blobUrl,
      totalTime: 0,
      validated: false,
    };
  }

  /**
   * Check if a file exists in blob storage
   */
  private async checkFileExistence(blobUrl: string): Promise<{ exists: boolean; size: number }> {
    try {
      const fileInfo = await blobService.getFileInfo(blobUrl);
      const fileSize = fileInfo?.size || 0;
      const exists = fileInfo && fileInfo.size > this.options.sizeThreshold * 1024;

      if (exists) {
        this.logVerbose(`File exists in Blob storage (${formatSize(fileInfo.size)})`);
      } else if (fileSize > 0) {
        this.logVerbose(`Small placeholder file exists (${formatSize(fileSize)}) - will replace`);
      }

      return { exists, size: fileSize };
    } catch {
      return { exists: false, size: 0 };
    }
  }

  /**
   * Determine if a file should be skipped
   */
  private shouldSkipFile(fileStatus: { exists: boolean; size: number }): boolean {
    return !fileStatus.exists && !this.options.force;
  }

  /**
   * Handle a file that is being skipped
   */
  private handleSkippedFile(
    result: MigrationResult,
    _fileStatus: { exists: boolean; size: number },
  ): void {
    this.logVerbose(`Skipping (file doesn't exist)`);
    result.status = 'skipped';
    result.skipReason = "file doesn't exist";
    this.results.push(result);
  }

  /**
   * Handle a file in dry run mode
   */
  private handleDryRunFile(result: MigrationResult, blobPath: string): void {
    this.logVerbose(`DRY RUN: Would validate ${blobPath}`);
    result.status = 'skipped';
    result.skipReason = 'dry run';
    this.results.push(result);
  }

  /**
   * Validate file content for a blob
   */
  private async validateFileContent(
    result: MigrationResult,
    blobUrl: string,
    fileSize: number,
    operationStartTime: number,
  ): Promise<void> {
    this.logVerbose(`Validating file content: ${result.blobPath}`);

    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const buffer = await response.arrayBuffer();
    const content = Buffer.from(buffer);
    const contentValid = verifyAudioContent(content);

    this.logValidationResult(contentValid);

    result.validated = true;
    result.validationInfo = {
      sizeValid: fileSize > this.options.sizeThreshold * 1024,
      contentValidated: contentValid,
      size: fileSize,
    };

    this.setValidationStatus(result, contentType, operationStartTime);
  }

  /**
   * Log validation result
   */
  private logValidationResult(contentValid: boolean): void {
    if (!contentValid) {
      this.logVerbose(`WARNING: Content validation failed - file doesn't appear to be valid MP3`);
    } else {
      this.logVerbose(`Content validation passed - file appears to be valid MP3`);
    }
  }

  /**
   * Set the validation status on the result
   */
  private setValidationStatus(
    result: MigrationResult,
    contentType: string,
    operationStartTime: number,
  ): void {
    const isValid = result.validationInfo?.sizeValid && result.validationInfo?.contentValidated;
    result.status = isValid ? 'success' : 'failed';
    result.contentType = contentType;
    result.totalTime = Date.now() - operationStartTime;

    if (result.status === 'success') {
      this.logVerbose(`Successfully validated audio file in ${result.totalTime}ms`);
    } else {
      result.error = this.getValidationError(result);
      this.logVerbose(`Validation failed: ${result.error}`);
    }
  }

  /**
   * Get validation error message
   */
  private getValidationError(result: MigrationResult): string {
    if (!result.validationInfo?.sizeValid) {
      return `Size validation failed: file too small (${formatSize(result.validationInfo?.size || 0)})`;
    }
    return `Content validation failed: not a valid MP3 file`;
  }

  /**
   * Handle a non-existent file
   */
  private handleNonExistentFile(result: MigrationResult): void {
    result.status = 'skipped';
    result.skipReason = "file doesn't exist and not in force mode";
    result.validated = false;
    this.logVerbose(`Skipping (file doesn't exist and not in force mode)`);
  }

  /**
   * Handle a file error
   */
  private handleFileError(
    result: MigrationResult,
    error: unknown,
    operationStartTime: number,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logVerbose(`Error: ${errorMessage}`);

    result.status = 'failed';
    result.error = errorMessage;
    result.totalTime = Date.now() - operationStartTime;
  }

  /**
   * Confirm operation with user
   */
  private async confirmOperation(): Promise<boolean> {
    if (this.options.force) return true;

    const rl = createInterface();

    return new Promise((resolve) => {
      rl.question(`About to validate ${this.totalFiles} audio files. Proceed? (y/N) `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * Generate migration summary
   */
  private generateSummary(): MigrationSummary {
    const endTime = new Date();

    const successful = this.results.filter((r) => r.status === 'success').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;

    const totalDuration = endTime.getTime() - this.startTime.getTime();

    const booksCovered = [...new Set(this.results.map((r) => r.bookSlug))];

    const validationSuccess = this.results.filter(
      (r) => r.validated && r.validationInfo?.sizeValid && r.validationInfo?.contentValidated,
    ).length;
    const validationFailed = this.results.filter(
      (r) => r.validated && (!r.validationInfo?.sizeValid || !r.validationInfo?.contentValidated),
    ).length;

    return {
      timestamp: new Date().toISOString(),
      total: this.results.length,
      successful,
      skipped,
      failed,
      totalDuration,
      booksCovered,
      validationSuccess,
      validationFailed,
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
  }

  /**
   * Generate book breakdown sections for Markdown report
   */
  private generateBookBreakdownSection(summary: MigrationSummary): string[] {
    const lines: string[] = [];
    lines.push('## Book-by-Book Breakdown', '');

    for (const bookSlug of summary.booksCovered) {
      const bookResults = this.results.filter((r) => r.bookSlug === bookSlug);
      const bookSuccess = bookResults.filter((r) => r.status === 'success').length;
      const bookSkipped = bookResults.filter((r) => r.status === 'skipped').length;
      const bookFailed = bookResults.filter((r) => r.status === 'failed').length;
      const bookTotal = bookResults.length;

      // Skip books with no files
      if (bookTotal === 0) continue;

      lines.push(`### ${bookSlug}`, '');
      lines.push(`- **Total**: ${bookTotal}`);
      lines.push(`- **Success**: ${bookSuccess}`);
      lines.push(`- **Skipped**: ${bookSkipped}`);
      lines.push(`- **Failed**: ${bookFailed}`);
      lines.push('');

      if (bookFailed > 0) {
        lines.push('#### Failed Files', '');

        for (const result of bookResults.filter((r) => r.status === 'failed')) {
          lines.push(`- **${result.blobPath}**: ${result.error}`);
        }

        lines.push('');
      }
    }

    return lines;
  }

  /**
   * Generate detailed failure logs section for Markdown report
   */
  private generateFailureLogsSection(summary: MigrationSummary): string[] {
    const lines: string[] = [];

    if (summary.failed > 0) {
      lines.push('## Detailed Failure Logs', '');

      for (const result of this.results.filter((r) => r.status === 'failed')) {
        lines.push(`### ${result.bookSlug} / ${result.blobPath}`, '');
        lines.push(`- **Status**: ${result.status}`);
        lines.push(`- **Error**: ${result.error}`);

        if (result.validated) {
          lines.push(`- **Size Valid**: ${result.validationInfo?.sizeValid}`);
          lines.push(`- **Content Valid**: ${result.validationInfo?.contentValidated}`);
          if (result.validationInfo?.size) {
            lines.push(`- **Size**: ${formatSize(result.validationInfo.size)}`);
          }
        }

        lines.push('');
      }
    }

    return lines;
  }

  /**
   * Generate summary section for Markdown report
   */
  private generateSummarySection(summary: MigrationSummary): string[] {
    const lines = [
      '# Enhanced Audio Validation Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      '',
      `- **Total files**: ${summary.total}`,
      `- **Successful**: ${summary.successful}`,
      `- **Skipped**: ${summary.skipped}`,
      `- **Failed**: ${summary.failed}`,
      '',
      '### Validation',
      '',
      `- **Success**: ${summary.validationSuccess}`,
      `- **Failed**: ${summary.validationFailed}`,
      '',
      '### Performance Statistics',
      '',
      `- **Total duration**: ${(summary.totalDuration / (1000 * 60)).toFixed(2)} minutes`,
      '',
      '### Books Covered',
      '',
      ...summary.booksCovered.map((book) => `- ${book}`),
      '',
    ];

    return lines;
  }

  /**
   * Save a human-readable Markdown report
   */
  private async saveMarkdownReport(summary: MigrationSummary, filePath: string): Promise<void> {
    // Generate the different sections
    const summarySection = this.generateSummarySection(summary);
    const bookBreakdownSection = this.generateBookBreakdownSection(summary);
    const failureLogsSection = this.generateFailureLogsSection(summary);

    // Combine all sections
    const lines = [...summarySection, ...bookBreakdownSection, ...failureLogsSection];

    await fs.writeFile(filePath, lines.join('\n'), 'utf8');
  }

  /**
   * Print migration summary
   */
  private printSummary(summary: MigrationSummary): void {
    const durationMin = (summary.totalDuration / (1000 * 60)).toFixed(2);

    // Get failed files details (limit to 10 for logging)
    const failedFiles = this.results
      .filter((r) => r.status === 'failed')
      .slice(0, 10)
      .map((r) => ({
        bookSlug: r.bookSlug,
        blobPath: r.blobPath,
        error: r.error,
      }));

    logger.info({
      msg: 'Migration validation summary',
      summary: {
        totalFiles: summary.total,
        successful: summary.successful,
        skipped: summary.skipped,
        failed: summary.failed,
        validationSuccess: summary.validationSuccess,
        validationFailed: summary.validationFailed,
        durationMinutes: durationMin,
        booksCovered: summary.booksCovered,
        failedFiles: failedFiles.length > 0 ? failedFiles : undefined,
        additionalFailures: summary.failed > 10 ? summary.failed - 10 : 0,
      },
    });
  }

  /**
   * Save migration results to file
   */
  private async saveResults(summary: MigrationSummary): Promise<void> {
    const output = {
      summary,
      options: this.options,
      results: this.results,
    };

    const outputPath = path.isAbsolute(this.options.logFile)
      ? this.options.logFile
      : path.join(process.cwd(), this.options.logFile);

    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');
    logger.info({
      msg: 'Migration results saved',
      outputPath,
    });

    // Also save a human-readable report
    const reportPath = outputPath.replace(/\.json$/, '.md');
    await this.saveMarkdownReport(summary, reportPath);
    logger.info({
      msg: 'Migration report saved',
      reportPath,
    });
  }

  /**
   * Conditionally log messages based on verbose option
   */
  private logVerbose(message: string): void {
    if (this.options.verbose) {
      logger.info({
        msg: message,
        context: 'verbose',
      });
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();
    const migrator = new EnhancedAudioMigrator(options);
    await migrator.run();

    logger.info({
      msg: 'Enhanced audio validation completed successfully',
    });
    process.exit(0);
  } catch (error) {
    logger.error({
      msg: 'Enhanced audio validation failed',
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Run the main function
main();
