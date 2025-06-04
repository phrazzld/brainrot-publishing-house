#!/usr/bin/env node
/**
 * Audio Files Placeholder Creation Script
 *
 * This script creates placeholder files for audio files in Vercel Blob storage.
 * It creates minimal MP3 file placeholders that can be replaced with real content later.
 *
 * Usage:
 *   npx tsx scripts/migrateAudioFilesWithContent.ts [options]
 *
 * Options:
 *   --dry-run             Simulate migration without uploading (default: false)
 *   --books=slug1,slug2   Comma-separated list of book slugs to migrate (default: all)
 *   --force               Re-upload even if already migrated (default: false)
 *   --retries=3           Number of retries for failed operations (default: 3)
 *   --concurrency=5       Number of concurrent operations (default: 5)
 *   --log-file=path       Path to migration log file (default: audio-migration-with-content.json)
 *   --verbose             Enable detailed logging (default: false)
 */
// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import translations from '../translations/index.js';
import { blobService } from '../utils/services/BlobService.js';

dotenv.config({ path: '.env.local' });

// Get this file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Migration options interface
interface MigrationOptions {
  dryRun: boolean;
  books: string[];
  force: boolean;
  retries: number;
  concurrency: number;
  logFile: string;
  verbose: boolean;
}

// Audio file migration result
interface AudioMigrationResult {
  status: 'success' | 'skipped' | 'failed';
  bookSlug: string;
  chapterTitle: string;
  originalPath: string;
  blobPath: string;
  blobUrl: string;
  downloadSize?: number;
  uploadSize?: number;
  contentType?: string;
  error?: string;
  skipReason?: string;
  downloadTime?: number;
  uploadTime?: number;
  totalTime?: number;
  uploadedAt?: string;
}

// Migration summary
interface MigrationSummary {
  total: number;
  successful: number;
  skipped: number;
  failed: number;
  totalDownloadSize: number; // in bytes
  totalUploadSize: number; // in bytes
  totalDuration: number; // in milliseconds
  booksCovered: string[];
  startTime: string;
  endTime: string;
}

/**
 * Helper function to extract audio path from URL
 */
function getAudioPathFromUrl(url: string): string {
  // Extract the path from the URL
  if (url.startsWith('http')) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    } catch {
      // Silently ignore URL parsing errors and return the original URL
      return url;
    }
  }
  return url;
}

/**
 * Audio files migration service
 */
class AudioFilesMigrator {
  private results: AudioMigrationResult[] = [];
  private activePromises: Promise<void>[] = [];
  private semaphoreValue: number;
  private startTime: Date = new Date();

  constructor(private readonly options: MigrationOptions) {
    this.semaphoreValue = options.concurrency;
  }

  /**
   * Run the migration process
   */
  public async run(): Promise<MigrationSummary> {
    this.startTime = new Date();
    // Use process.stderr for allowed console output
    process.stderr.write(
      `\n🎵 Starting audio placeholder creation ${this.options.dryRun ? '(DRY RUN)' : ''}\n`,
    );
    process.stderr.write(`Options: ${JSON.stringify(this.options, null, 2)}\n\n`);

    try {
      // Get all books to process
      const booksToProcess =
        this.options.books.length > 0 ? this.options.books : translations.map((book) => book.slug);

      // Process each book
      for (const bookSlug of booksToProcess) {
        await this.processBook(bookSlug);
      }

      // Wait for any remaining active promises
      if (this.activePromises.length > 0) {
        this.log(`Waiting for ${this.activePromises.length} remaining operations to complete...`);
        await Promise.all(this.activePromises);
      }

      // Generate and return summary
      const summary = this.generateSummary();
      this.printSummary(summary);

      // Save results to file
      await this.saveResults(summary);

      return summary;
    } catch (error) {
      // Use process.stderr for error output
      process.stderr.write(
        `Migration failed: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      throw error;
    }
  }

  /**
   * Process a single book
   */
  private async processBook(bookSlug: string): Promise<void> {
    const book = translations.find((t) => t.slug === bookSlug);

    if (!book) {
      process.stderr.write(`⚠️ Book not found: ${bookSlug}\n`);
      return;
    }

    process.stderr.write(`\n📖 Processing book: ${book.title} (${book.slug})\n`);

    // Get all audio files for this book
    const audioFiles = this.getBookAudioFiles(book);

    if (audioFiles.length === 0) {
      process.stderr.write(`   No audio files found for this book\n`);
      return;
    }

    process.stderr.write(`   Found ${audioFiles.length} audio files\n`);

    // Process each audio file with concurrency limit
    for (const audioFile of audioFiles) {
      // Wait if we've reached the concurrency limit
      if (this.semaphoreValue <= 0) {
        await Promise.race(this.activePromises);
      }

      // Process this audio file
      this.semaphoreValue--;

      const promise = this.processAudioFile(audioFile.path, book.slug, audioFile.chapterTitle)
        .catch((error) => {
          process.stderr.write(`   ❌ Error processing ${audioFile.path}: ${error}\n`);
        })
        .finally(() => {
          this.semaphoreValue++;
          this.activePromises = this.activePromises.filter((p) => p !== promise);
        });

      this.activePromises.push(promise);
    }
  }

  /**
   * Get audio files from a book
   */
  private getBookAudioFiles(
    book: (typeof translations)[0],
  ): Array<{ path: string; chapterTitle: string }> {
    const audioFiles: Array<{ path: string; chapterTitle: string }> = [];

    if (!book.chapters) {
      return audioFiles;
    }

    for (const chapter of book.chapters) {
      if (chapter.audioSrc && typeof chapter.audioSrc === 'string') {
        audioFiles.push({
          path: chapter.audioSrc,
          chapterTitle: chapter.title,
        });
      }
    }

    return audioFiles;
  }

  /**
   * Process a single audio file
   */
  private async processAudioFile(
    audioSrc: string,
    bookSlug: string,
    chapterTitle: string,
  ): Promise<void> {
    const operationStartTime = Date.now();

    // Initialize paths and result object
    const { audioPath, targetBlobPath, blobUrl, result } = this.initializeAudioFileProcessing(
      audioSrc,
      bookSlug,
      chapterTitle,
    );

    try {
      // Check if file exists and handle early returns
      const exists = await this.checkFileExists(blobUrl, result);
      if (exists && !this.options.force) {
        this.handleSkippedFile(result, 'already exists');
        return;
      }

      // Handle dry run mode
      if (this.options.dryRun) {
        this.handleDryRun(result, audioPath);
        return;
      }

      // Create placeholder and upload it
      const placeholderResult = await this.createPlaceholderFile(audioPath, chapterTitle, result);
      await this.uploadPlaceholderFile(
        placeholderResult,
        targetBlobPath,
        result,
        operationStartTime,
      );

      this.log(`   🎉 Successfully created placeholder in ${result.totalTime}ms`);
    } catch (err) {
      this.handleProcessingError(err, result, operationStartTime);
    }

    // Add to results
    this.results.push(result);
  }

  /**
   * Initialize audio file processing by setting up paths and result object
   */
  private initializeAudioFileProcessing(
    audioSrc: string,
    bookSlug: string,
    chapterTitle: string,
  ): { audioPath: string; targetBlobPath: string; blobUrl: string; result: AudioMigrationResult } {
    // Parse the audio path for Blob storage
    const audioPath = getAudioPathFromUrl(audioSrc);

    // Determine the target blob path - create a standardized path directly
    const targetBlobPath = `books/${bookSlug}/audio/${path.basename(audioPath)}`;

    // Get URL for verification and uploading
    const blobUrl = blobService.getUrlForPath(targetBlobPath);

    this.log(`   🔄 Processing: ${audioPath} -> ${targetBlobPath}`);

    // Initialize result object
    const result: AudioMigrationResult = {
      status: 'failed',
      bookSlug,
      chapterTitle,
      originalPath: audioSrc,
      blobPath: targetBlobPath,
      blobUrl,
      totalTime: 0,
    };

    return { audioPath, targetBlobPath, blobUrl, result };
  }

  /**
   * Check if file already exists in Blob storage
   */
  private async checkFileExists(blobUrl: string, _result: AudioMigrationResult): Promise<boolean> {
    try {
      const fileInfo = await blobService.getFileInfo(blobUrl);
      // Consider it exists only if it's a real file (not a tiny placeholder)
      const exists = fileInfo && fileInfo.size > 0;

      if (exists) {
        this.log(`   ℹ️ File already exists in Blob storage (${fileInfo.size} bytes)`);
      }

      return exists;
    } catch {
      // File doesn't exist, we'll upload it
      return false;
    }
  }

  /**
   * Handle skipped file case
   */
  private handleSkippedFile(result: AudioMigrationResult, reason: string): void {
    this.log(`   ⏩ Skipping (${reason})`);

    result.status = 'skipped';
    result.skipReason = reason;
    this.results.push(result);
  }

  /**
   * Handle dry run mode
   */
  private handleDryRun(result: AudioMigrationResult, audioPath: string): void {
    this.log(`   🔍 DRY RUN: Would create and upload placeholder for ${audioPath}`);

    result.status = 'skipped';
    result.skipReason = 'dry run';
    this.results.push(result);
  }

  /**
   * Create a minimal placeholder MP3 file
   * This creates a tiny MP3 file with ID3v2 tag
   */
  private async createPlaceholderFile(
    audioPath: string,
    chapterTitle: string,
    result: AudioMigrationResult,
  ): Promise<{ size: number; contentType: string; content: ArrayBuffer }> {
    this.log(`   🔄 Creating placeholder for: ${audioPath}`);
    const creationStartTime = Date.now();

    // Create a minimal valid MP3 file with an ID3v2 tag
    // The header consists of "ID3" followed by version, flags and size
    // We're creating an extremely basic ID3v2 tag followed by silence
    const header = new Uint8Array([
      0x49,
      0x44,
      0x33, // "ID3"
      0x03,
      0x00, // Version 2.3.0
      0x00, // Flags
      0x00,
      0x00,
      0x00,
      0x20, // Size (32 bytes)
      // Title frame
      0x54,
      0x49,
      0x54,
      0x32, // "TIT2" (Title frame)
      0x00,
      0x00,
      0x00,
      0x10, // Frame size (16 bytes)
      0x00,
      0x00, // Flags
      0x00, // Encoding
      // Content: "Audio Placeholder"
      0x41,
      0x75,
      0x64,
      0x69,
      0x6f,
      0x20,
      0x50,
      0x6c,
      0x61,
      0x63,
      0x65,
      0x68,
      0x6f,
      0x6c,
      0x64,
      0x65,
      // MP3 frame header (silent)
      0xff,
      0xe0,
      0x00,
      0x00, // Empty MPEG frame
    ]);

    const content = header.buffer;
    const size = content.byteLength;
    const contentType = 'audio/mpeg';

    const creationDuration = Date.now() - creationStartTime;
    this.log(`   ✅ Created ${size} bytes placeholder in ${creationDuration}ms`);

    // Use the explicit type properties we know exist
    result.downloadSize = size;
    result.contentType = contentType;
    result.downloadTime = creationDuration;

    return { size, contentType, content };
  }

  /**
   * Upload placeholder to Vercel Blob storage and verify
   */
  private async uploadPlaceholderFile(
    placeholderResult: { size: number; contentType: string; content: ArrayBuffer },
    targetBlobPath: string,
    result: AudioMigrationResult,
    operationStartTime: number,
  ): Promise<void> {
    // Create a File object from the placeholder buffer
    const file = new File(
      [placeholderResult.content || new Uint8Array()],
      path.basename(targetBlobPath),
      {
        type: placeholderResult.contentType || 'audio/mpeg',
      },
    );

    // Upload to Vercel Blob storage
    this.log(`   ⬆️ Uploading to Vercel Blob: ${targetBlobPath}`);
    const uploadStartTime = Date.now();

    const uploadResult = await blobService.uploadFile(file, {
      pathname: path.dirname(targetBlobPath),
      filename: path.basename(targetBlobPath),
      access: 'public',
      contentType: placeholderResult.contentType,
      addRandomSuffix: false,
    });

    const uploadDuration = Date.now() - uploadStartTime;
    this.log(`   ✅ Uploaded to ${uploadResult.url} in ${uploadDuration}ms`);

    // Verify the upload
    await this.verifyUpload(uploadResult.url, placeholderResult.size);

    // Record successful result
    result.status = 'success';
    result.uploadSize = placeholderResult.size;
    result.uploadTime = uploadDuration;
    result.uploadedAt = new Date().toISOString();
    result.totalTime = Date.now() - operationStartTime;
  }

  /**
   * Verify that the uploaded file matches the expected size
   */
  private async verifyUpload(uploadUrl: string, expectedSize: number): Promise<void> {
    const verifyResult = await blobService.getFileInfo(uploadUrl);
    if (verifyResult?.size !== expectedSize) {
      throw new Error(
        `Upload verification failed: size mismatch (expected ${expectedSize}, got ${verifyResult?.size || 0})`,
      );
    }
  }

  /**
   * Handle processing error
   */
  private handleProcessingError(
    err: unknown,
    result: AudioMigrationResult,
    operationStartTime: number,
  ): void {
    const errorMessage = err instanceof Error ? err.message : String(err);
    process.stderr.write(`   ❌ Error: ${errorMessage}\n`);

    result.status = 'failed';
    result.error = errorMessage;
    result.totalTime = Date.now() - operationStartTime;
  }

  /**
   * Generate migration summary
   */
  private generateSummary(): MigrationSummary {
    const endTime = new Date();

    const successful = this.results.filter((r) => r.status === 'success').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;

    const totalDownloadSize = this.results.reduce((total, r) => total + (r.downloadSize || 0), 0);
    const totalUploadSize = this.results.reduce((total, r) => total + (r.uploadSize || 0), 0);
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    const booksCovered = [...new Set(this.results.map((r) => r.bookSlug))];

    return {
      total: this.results.length,
      successful,
      skipped,
      failed,
      totalDownloadSize,
      totalUploadSize,
      totalDuration,
      booksCovered,
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
  }

  /**
   * Print migration summary
   */
  private printSummary(summary: MigrationSummary): void {
    process.stderr.write('\n📊 Migration Summary\n');
    process.stderr.write('------------------\n');
    process.stderr.write(`Total files: ${summary.total}\n`);
    process.stderr.write(`Successful : ${summary.successful}\n`);
    process.stderr.write(`Skipped    : ${summary.skipped}\n`);
    process.stderr.write(`Failed     : ${summary.failed}\n`);

    const downloadSizeMB = (summary.totalDownloadSize / (1024 * 1024)).toFixed(2);
    const uploadSizeMB = (summary.totalUploadSize / (1024 * 1024)).toFixed(2);
    const durationSec = (summary.totalDuration / 1000).toFixed(2);

    process.stderr.write(`\nTotal placeholder size: ${downloadSizeMB} MB\n`);
    process.stderr.write(`Total uploaded size   : ${uploadSizeMB} MB\n`);
    process.stderr.write(`Total duration        : ${durationSec} seconds\n`);

    process.stderr.write(`\nBooks covered: ${summary.booksCovered.join(', ')}\n`);

    if (summary.failed > 0) {
      process.stderr.write('\n❌ Failed Files:\n');
      this.results
        .filter((r) => r.status === 'failed')
        .forEach((r) => {
          process.stderr.write(`   - ${r.bookSlug} (${r.chapterTitle}): ${r.error}\n`);
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
      : path.join(projectRoot, this.options.logFile);

    try {
      await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');
      process.stderr.write(`\n💾 Results saved to ${outputPath}\n`);
    } catch (err) {
      process.stderr.write(
        `Failed to save results: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }

  /**
   * Conditionally log messages based on verbose option
   */
  private log(message: string): void {
    if (this.options.verbose) {
      process.stderr.write(`${message}\n`);
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions {
  const options: MigrationOptions = {
    dryRun: false,
    books: [],
    force: false,
    retries: 3,
    concurrency: 5,
    logFile: 'audio-migration-with-content.json',
    verbose: false,
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

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
    }
  }

  return options;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();
    const migrator = new AudioFilesMigrator(options);
    await migrator.run();

    process.stderr.write('\n✅ Audio placeholder creation completed successfully!\n');
    process.exit(0);
  } catch (error) {
    process.stderr.write(
      `\n❌ Audio placeholder creation failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
}

// Export for testing
export { AudioFilesMigrator, parseArgs, main };

// Run the script
main();
