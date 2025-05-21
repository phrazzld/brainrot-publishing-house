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

import translations from '../translations';
import { generateAssetUrl, generateBlobPath, generateFilename } from '../utils/ScriptPathUtils';
import { createScriptLogger } from '../utils/createScriptLogger';
import { createServices } from '../utils/createServices';

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
 * Parse command-line arguments
 *
 * This function has high complexity due to parsing many different command line args
 * eslint-disable-next-line complexity
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
    logger.info({
      msg: `Starting enhanced audio files validation ${this.options.dryRun ? '(DRY RUN)' : ''}`,
      operation: 'start',
      dryRun: this.options.dryRun,
    });

    try {
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

      // Confirm operation before beginning
      if (!this.options.dryRun && !(await this.confirmOperation())) {
        logger.info({
          msg: 'Operation cancelled by user',
          operation: 'cancelled',
        });
        process.exit(0);
      }

      // Process files in parallel with semaphore
      for (const audioFile of this.audioFiles) {
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

      // Wait for all remaining operations
      if (this.activePromises.length > 0) {
        logger.info({
          msg: `Waiting for ${this.activePromises.length} remaining operations...`,
          operation: 'wait_remaining',
          count: this.activePromises.length,
        });
        await Promise.all(this.activePromises);
      }

      // Generate and save summary
      const summary = this.generateSummary();
      this.printSummary(summary);
      await this.saveResults(summary);

      return summary;
    } catch (error) {
      logger.error({
        msg: 'Migration failed',
        operation: 'migration_failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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

    process.stdout.write(
      `\rProgress: ${this.progressCount}/${this.totalFiles} (${percent}%) - Success: ${success}, Skipped: ${skipped}, Failed: ${failed}`
    );
  }

  /**
   * Gather all audio files that need to be processed
   */
  private async gatherAudioFiles(booksToProcess: string[]): Promise<void> {
    // If inventory path is provided, load from there
    if (this.options.inventoryPath && existsSync(this.options.inventoryPath)) {
      console.error(`Loading audio inventory from ${this.options.inventoryPath}...`);
      await this.loadAudioFilesFromInventory();
      return;
    }

    // Otherwise build list from translations and check Vercel Blob
    console.error('Building audio files list from translations...');
    for (const bookSlug of booksToProcess) {
      const book = translations.find((t) => t.slug === bookSlug);

      if (!book) {
        console.warn(`Book not found: ${bookSlug}`);
        continue;
      }

      if (!book.chapters) {
        console.error(`No chapters found for book: ${bookSlug}`);
        continue;
      }

      for (const chapter of book.chapters) {
        if (!chapter.audioSrc) continue;

        // Extract the file name and chapter number
        const fileName = path.basename(chapter.audioSrc);
        const chapterNumber = fileName.replace(/\.mp3$/, '').replace(/^.*?([\d]+)$/, '$1');

        // Construct standardized filename and path using ScriptPathUtils
        const standardFilename = generateFilename('audio', chapterNumber);
        const blobPath = generateBlobPath(bookSlug, 'audio', standardFilename);

        // Get URL for verification and uploading
        const blobUrl = generateAssetUrl(blobPath);

        this.audioFiles.push({
          blobPath,
          bookSlug,
          chapterTitle: chapter.title,
          blobUrl,
        });
      }
    }
  }

  /**
   * Load audio files from an existing inventory JSON file
   *
   * This method is complex due to parsing JSON data
   * eslint-disable-next-line complexity
   */
  private async loadAudioFilesFromInventory(): Promise<void> {
    if (!this.options.inventoryPath) return;

    try {
      const inventoryData = await fs.readFile(this.options.inventoryPath, 'utf8');
      const inventory = JSON.parse(inventoryData);

      // Check if this is the expected format
      if (inventory.books && Array.isArray(inventory.books)) {
        // Filter to only include books specified in options.books if any
        const booksToInclude =
          this.options.books.length > 0
            ? inventory.books.filter((b: Record<string, unknown>) =>
                this.options.books.includes(b.slug as string)
              )
            : inventory.books;

        for (const book of booksToInclude) {
          if (!book.files || !Array.isArray(book.files)) continue;

          for (const file of book.files) {
            // Skip placeholder files
            if (file.isPlaceholder) continue;

            // Skip non-existent files
            if (!file.exists) continue;

            // Use the blobUrl directly from the inventory if available
            if (file.blobUrl) {
              this.audioFiles.push({
                blobPath: file.blobPath || `books/${book.slug}/audio/${path.basename(file.key)}`,
                bookSlug: book.slug,
                chapterTitle: file.chapterTitle,
                size: file.size,
                blobUrl: file.blobUrl,
              });
            }
          }
        }
      } else {
        throw new Error('Invalid inventory format');
      }

      console.error(`Loaded ${this.audioFiles.length} audio files from inventory`);
    } catch (error) {
      console.error('Error loading inventory:', error);
      throw new Error(
        `Failed to load inventory: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Process a single audio file
   *
   * This is a complex method that handles file validation
   * eslint-disable-next-line complexity
   */
  private async processAudioFile(audioFile: AudioFile): Promise<void> {
    const operationStartTime = Date.now();
    const { blobPath, bookSlug, chapterTitle, blobUrl } = audioFile;

    this.log(`\nProcessing: ${blobPath}`);

    const result: MigrationResult = {
      status: 'failed',
      bookSlug,
      chapterTitle,
      blobPath,
      blobUrl,
      totalTime: 0,
      validated: false,
    };

    try {
      // Check if file exists in Blob storage
      let exists = false;
      let fileSize = 0;

      try {
        const fileInfo = await blobService.getFileInfo(blobUrl);
        fileSize = fileInfo?.size || 0;

        // Consider it exists only if it's a real file (not a tiny placeholder)
        exists = fileInfo && fileInfo.size > this.options.sizeThreshold * 1024;

        if (exists) {
          this.log(`File exists in Blob storage (${formatSize(fileInfo.size)})`);
        } else if (fileSize > 0) {
          this.log(`Small placeholder file exists (${formatSize(fileSize)}) - will replace`);
        }
      } catch {
        // File doesn't exist, skip or validate
        exists = false;
      }

      // Skip if doesn't exist and not in force mode
      if (!exists && !this.options.force) {
        this.log(`Skipping (file doesn't exist)`);

        result.status = 'skipped';
        result.skipReason = "file doesn't exist";
        this.results.push(result);
        return;
      }

      // In dry run mode, simulate the operation
      if (this.options.dryRun) {
        this.log(`DRY RUN: Would validate ${blobPath}`);

        result.status = 'skipped';
        result.skipReason = 'dry run';
        this.results.push(result);
        return;
      }

      // Validate the file content
      if (exists) {
        this.log(`Validating file content: ${blobPath}`);

        // Fetch the file content
        const response = await fetch(blobUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || 'audio/mpeg';
        const buffer = await response.arrayBuffer();
        const content = Buffer.from(buffer);

        // Verify the content is valid audio
        const contentValid = verifyAudioContent(content);

        if (!contentValid) {
          this.log(`WARNING: Content validation failed - file doesn't appear to be valid MP3`);
        } else {
          this.log(`Content validation passed - file appears to be valid MP3`);
        }

        // Record validation information
        result.validated = true;
        result.validationInfo = {
          sizeValid: fileSize > this.options.sizeThreshold * 1024,
          contentValidated: contentValid,
          size: fileSize,
        };

        // Mark as success if validation passed
        result.status = result.validationInfo.sizeValid && contentValid ? 'success' : 'failed';
        result.contentType = contentType;
        result.totalTime = Date.now() - operationStartTime;

        if (result.status === 'success') {
          this.log(`Successfully validated audio file in ${result.totalTime}ms`);
        } else {
          if (!result.validationInfo.sizeValid) {
            result.error = `Size validation failed: file too small (${formatSize(fileSize)})`;
          } else {
            result.error = `Content validation failed: not a valid MP3 file`;
          }
          this.log(`Validation failed: ${result.error}`);
        }
      } else {
        result.status = 'skipped';
        result.skipReason = "file doesn't exist and not in force mode";
        result.validated = false;
        this.log(`Skipping (file doesn't exist and not in force mode)`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Error: ${errorMessage}`);

      result.status = 'failed';
      result.error = errorMessage;
      result.totalTime = Date.now() - operationStartTime;
    }

    // Add to results
    this.results.push(result);
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
      (r) => r.validated && r.validationInfo?.sizeValid && r.validationInfo?.contentValidated
    ).length;
    const validationFailed = this.results.filter(
      (r) => r.validated && (!r.validationInfo?.sizeValid || !r.validationInfo?.contentValidated)
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
   * Save a human-readable Markdown report
   *
   * This method is complex due to report generation format
   * eslint-disable-next-line complexity
   */
  private async saveMarkdownReport(summary: MigrationSummary, filePath: string): Promise<void> {
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

    // Add book-by-book breakdown
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

    // Add detailed logs for failures
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

    await fs.writeFile(filePath, lines.join('\n'), 'utf8');
  }

  /**
   * Print migration summary
   */
  private printSummary(summary: MigrationSummary): void {
    console.error('\n\n📊 Validation Summary');
    console.error('------------------');
    console.error(`Total files: ${summary.total}`);
    console.error(`Successful : ${summary.successful}`);
    console.error(`Skipped    : ${summary.skipped}`);
    console.error(`Failed     : ${summary.failed}`);

    console.error('\nValidation:');
    console.error(`Success    : ${summary.validationSuccess}`);
    console.error(`Failed     : ${summary.validationFailed}`);

    const durationMin = (summary.totalDuration / (1000 * 60)).toFixed(2);
    console.error(`\nTotal duration  : ${durationMin} minutes`);

    console.error(`\nBooks covered: ${summary.booksCovered.join(', ')}`);

    if (summary.failed > 0) {
      console.error('\n❌ Failed Files:');
      this.results
        .filter((r) => r.status === 'failed')
        .forEach((r) => {
          console.error(`   - ${r.bookSlug} / ${r.blobPath}: ${r.error}`);
        });
    }
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
    console.error(`\n💾 Results saved to ${outputPath}`);

    // Also save a human-readable report
    const reportPath = outputPath.replace(/\.json$/, '.md');
    await this.saveMarkdownReport(summary, reportPath);
    console.error(`📝 Report saved to ${reportPath}`);
  }

  /**
   * Conditionally log messages based on verbose option
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.error(message);
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

    console.error('\n✅ Enhanced audio validation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(
      '\n❌ Enhanced audio validation failed:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Run the main function
main();
