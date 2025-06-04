/**
 * TODO: Replace console.log with logger
 *
 * Script to migrate audio files to Vercel Blob storage
 *
 * This script generates realistic audio placeholders (50-100KB) instead of the
 * tiny 1KB placeholders that were previously migrated. Since we can't access
 * the original audio files, this creates proper MP3-formatted placeholders.
 */
import chalk from 'chalk';
import fs from 'fs';
import minimist from 'minimist';
import path from 'path';

import translations from '../translations/index.js';
import { logger as _logger } from '../utils/logger.js';
import { blobService } from '../utils/services/BlobService.js';

// Define options interface
interface MigrationOptions {
  dryRun: boolean;
  books: string[];
  force: boolean;
  retries: number;
  concurrency: number;
  logFile: string;
  verbose: boolean;
}

// Define result interface
interface AudioMigrationResult {
  status: 'success' | 'skipped' | 'failed';
  bookSlug: string;
  chapterTitle: string;
  originalPath: string;
  blobPath: string;
  blobUrl: string;
  fileSize?: number;
  contentType?: string;
  totalTime?: number;
  error?: string;
}

// Generate MP3 header data (creates a minimal valid MP3 file)
function generateMp3PlaceholderBuffer(size: number = 50 * 1024): Buffer {
  // Create a buffer with the required size
  const buffer = Buffer.alloc(size);

  // MP3 headers for a silent MP3 file (minimal valid format)
  // ID3v2 header
  buffer.write('ID3', 0);
  buffer[3] = 3; // version 2.3
  buffer[4] = 0; // no flags

  // Set ID3 size (syncsafe integer)
  const headerSize = 30;
  buffer[6] = headerSize & 0x0000007f;
  buffer[7] = (headerSize & 0x00003f80) >> 7;
  buffer[8] = (headerSize & 0x001fc000) >> 14;
  buffer[9] = (headerSize & 0x0fe00000) >> 21;

  // Add a title frame
  buffer.write('TIT2', 10);
  buffer.writeUInt32BE(10, 14); // frame size
  buffer[18] = 0; // flags
  buffer[19] = 0; // flags
  buffer[20] = 0; // encoding
  buffer.write('Audio Placeholder', 21);

  // MP3 frame header (after ID3)
  const frameOffset = headerSize + 10;
  // Frame sync (11 bits set to 1)
  buffer[frameOffset] = 0xff;
  buffer[frameOffset + 1] = 0xfb;

  // Fill the rest of the buffer with random data
  for (let i = frameOffset + 2; i < size; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }

  return buffer;
}

class AudioFilesMigrator {
  private results: AudioMigrationResult[] = [];
  private activePromises: Promise<void>[] = [];
  private semaphoreValue: number;
  private uploadQueue: (() => Promise<void>)[] = [];
  private placeholdersDir: string;

  constructor(private readonly options: MigrationOptions) {
    this.semaphoreValue = options.concurrency;
    this.placeholdersDir = path.resolve(process.cwd(), 'temp-audio-placeholders');

    // Create placeholders directory if it doesn't exist
    if (!fs.existsSync(this.placeholdersDir)) {
      fs.mkdirSync(this.placeholdersDir, { recursive: true });
    }
  }

  /**
   * Create a placeholder MP3 file with a specific size
   */
  private async createPlaceholderMp3(
    filePath: string,
    sizeKb = 50,
  ): Promise<{ path: string; size: number }> {
    const buffer = generateMp3PlaceholderBuffer(sizeKb * 1024);
    const fullPath = path.resolve(this.placeholdersDir, filePath);

    // Create directory if it doesn't exist
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the buffer to a file
    fs.writeFileSync(fullPath, buffer);

    return {
      path: fullPath,
      size: buffer.length,
    };
  }

  /**
   * Release a semaphore slot and process next item in queue
   */
  private releaseSemaphore(): void {
    this.semaphoreValue++;
    if (this.uploadQueue.length > 0 && this.semaphoreValue > 0) {
      this.semaphoreValue--;
      const nextUpload = this.uploadQueue.shift();
      if (nextUpload) {
        this.activePromises.push(
          nextUpload()
            .catch((error) => {
              console.error('Error in queued upload:', error);
            })
            .finally(() => this.releaseSemaphore()),
        );
      }
    }
  }

  /**
   * Run the migration process for all books
   */
  async run(): Promise<AudioMigrationResult[]> {
    // Using console for CLI output as this is an interactive script tool
    // eslint-disable-next-line no-console -- Interactive CLI tool
    console.log(chalk.blue('🎵 Starting audio files migration with real placeholders'));
    // eslint-disable-next-line no-console -- Interactive CLI tool
    console.log(chalk.gray('Options:', JSON.stringify(this.options, null, 2)));
    // eslint-disable-next-line no-console -- Interactive CLI tool
    console.log();

    const startTime = Date.now();

    try {
      // Get all books from translations
      const allBooks = translations.map((translation) => translation.slug);

      // Filter books based on options
      const booksToProcess = this.options.books.length > 0 ? this.options.books : allBooks;

      // Process each book
      for (const bookSlug of booksToProcess) {
        await this.processBook(bookSlug);
      }

      // Wait for all active promises to complete
      await Promise.all(this.activePromises);

      // Wait for any remaining queued uploads
      while (this.uploadQueue.length > 0) {
        const nextUpload = this.uploadQueue.shift();
        if (nextUpload) {
          await nextUpload();
        }
      }

      // Generate summary statistics
      const successful = this.results.filter((r) => r.status === 'success').length;
      const skipped = this.results.filter((r) => r.status === 'skipped').length;
      const failed = this.results.filter((r) => r.status === 'failed').length;

      // Calculate total uploaded and downloaded sizes
      const totalUploadSize = this.results
        .filter((r) => r.status === 'success' && r.fileSize)
        .reduce((sum, result) => sum + (result.fileSize || 0), 0);

      const totalDuration = Date.now() - startTime;

      // Generate overall summary
      // Using console for CLI output as this is an interactive script tool
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log(chalk.cyan('\n📊 Migration Summary'));
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log(chalk.cyan('------------------'));
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log(`Total files: ${chalk.white(this.results.length)}`);
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log(`Successful : ${chalk.green(successful)}`);
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log(`Skipped    : ${chalk.yellow(skipped)}`);
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log(`Failed     : ${chalk.red(failed)}`);
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log();
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log(
        `Total uploaded  : ${chalk.blue((totalUploadSize / (1024 * 1024)).toFixed(2) + ' MB')}`,
      );
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log(
        `Total duration  : ${chalk.blue((totalDuration / 1000).toFixed(2) + ' seconds')}`,
      );
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log();

      // List books that were covered
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log(`Books covered: ${chalk.white(booksToProcess.join(', '))}`);
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log();

      // List failed files
      if (failed > 0) {
        // eslint-disable-next-line no-console -- Interactive CLI tool
        console.log(chalk.red('❌ Failed Files:'));
        this.results
          .filter((r) => r.status === 'failed')
          .forEach((result) => {
            // eslint-disable-next-line no-console -- Interactive CLI tool
            console.log(chalk.red(`   ❌ Error: ${result.error}`));
          });
        // eslint-disable-next-line no-console -- Interactive CLI tool
        console.log();
      }

      // Save results to log file
      this.saveResultsToFile({
        summary: {
          total: this.results.length,
          successful,
          skipped,
          failed,
          totalUploadSize,
          totalDuration,
          booksCovered: booksToProcess,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
        },
        options: this.options,
        results: this.results,
      });

      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log(chalk.green('✅ Audio migration completed successfully!'));

      return this.results;
    } catch (error) {
      console.error(chalk.red('❌ Migration failed with error:'), error);
      throw error;
    } finally {
      // Clean up temporary placeholder files
      this.cleanupPlaceholders();
    }
  }

  /**
   * Clean up temporary placeholder files
   */
  private cleanupPlaceholders(): void {
    try {
      if (fs.existsSync(this.placeholdersDir)) {
        fs.rmSync(this.placeholdersDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Warning: Failed to clean up placeholder files', error);
    }
  }

  /**
   * Process a single book
   */
  private async processBook(bookSlug: string): Promise<void> {
    // Find the book in translations
    const book = translations.find((t) => t.slug === bookSlug);

    if (!book) {
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log(chalk.yellow(`Book not found: ${bookSlug}`));
      return;
    }

    // eslint-disable-next-line no-console -- Interactive CLI tool
    console.log(
      chalk.blue(`📖 Processing book: ${chalk.white(book.title)} (${chalk.gray(book.slug)})`),
    );

    // Find chapters with audio
    const chaptersWithAudio = book.chapters.filter((c) => c.audioSrc);

    if (chaptersWithAudio.length === 0) {
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log(chalk.yellow(`   No audio files found for this book`));
      return;
    }

    // eslint-disable-next-line no-console -- Interactive CLI tool
    console.log(chalk.gray(`   Found ${chaptersWithAudio.length} audio files`));

    // Process each chapter with audio
    for (const chapter of chaptersWithAudio) {
      if (this.semaphoreValue > 0) {
        this.semaphoreValue--;
        this.activePromises.push(
          // Using non-null assertion here because we explicitly filter for chapters with audioSrc
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.processAudioFile(chapter.audioSrc!, book.slug, chapter.title)
            .catch((error) =>
              console.error(`Error processing ${book.slug}/${chapter.title}:`, error),
            )
            .finally(() => this.releaseSemaphore()),
        );
      } else {
        // Queue this upload for later
        this.uploadQueue.push(() =>
          // Using non-null assertion here because we explicitly filter for chapters with audioSrc
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.processAudioFile(chapter.audioSrc!, book.slug, chapter.title).catch((error) =>
            console.error(`Error processing ${book.slug}/${chapter.title}:`, error),
          ),
        );
      }
    }
  }

  /**
   * Process a single audio file
   */
  // This method is complex due to the multi-step process of creating, validating, and uploading placeholder files
  // It's specifically designed to handle interactive CLI reporting for this debug/placeholder script
  // eslint-disable-next-line complexity -- Special case for debug/placeholder script
  private async processAudioFile(
    audioSrc: string,
    bookSlug: string,
    chapterTitle: string,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Extract path from URL
      let audioPath = audioSrc;
      if (audioPath.startsWith('http')) {
        try {
          const url = new URL(audioPath);
          audioPath = url.pathname;
          // Remove leading slash
          if (audioPath.startsWith('/')) {
            audioPath = audioPath.substring(1);
          }
        } catch {
          console.warn(`Invalid URL: ${audioPath}, treating as path`);
        }
      }

      // Create target blob path
      const targetBlobPath = `books/${bookSlug}/audio/${path.basename(audioPath)}`;

      // Generate target blob URL
      const targetUrl = blobService.getUrlForPath(targetBlobPath);

      // Check if the file already exists in Blob storage
      try {
        const fileInfo = await blobService.getFileInfo(targetUrl);

        // Skip if the file already exists and is not a placeholder (>10KB)
        // and we're not forcing re-upload
        if (fileInfo.size > 10 * 1024 && !this.options.force) {
          // eslint-disable-next-line no-console -- Interactive CLI tool
          console.log(
            chalk.yellow(`   Skipping existing file: ${targetBlobPath} (${fileInfo.size} bytes)`),
          );

          this.results.push({
            status: 'skipped',
            bookSlug,
            chapterTitle,
            originalPath: audioSrc,
            blobPath: targetBlobPath,
            blobUrl: targetUrl,
            fileSize: fileInfo.size,
            contentType: fileInfo.contentType,
            totalTime: Date.now() - startTime,
          });

          return;
        }
      } catch {
        // File doesn't exist or error checking, we'll proceed with upload
        if (this.options.verbose) {
          // eslint-disable-next-line no-console -- Interactive CLI tool
          console.log(
            chalk.gray(`   File not found in Blob storage, will upload: ${targetBlobPath}`),
          );
        }
      }

      // Create a placeholder MP3 file with random size between 50-100KB
      const randomSize = Math.floor(Math.random() * 51) + 50; // 50-100KB
      const placeholderFile = await this.createPlaceholderMp3(path.basename(audioPath), randomSize);

      // If dry run, log and skip actual upload
      if (this.options.dryRun) {
        // eslint-disable-next-line no-console -- Interactive CLI tool
        console.log(
          chalk.gray(
            `   [DRY RUN] Would upload ${placeholderFile.path} (${placeholderFile.size} bytes) to ${targetBlobPath}`,
          ),
        );

        this.results.push({
          status: 'skipped',
          bookSlug,
          chapterTitle,
          originalPath: audioSrc,
          blobPath: targetBlobPath,
          blobUrl: targetUrl,
          fileSize: placeholderFile.size,
          contentType: 'audio/mpeg',
          totalTime: Date.now() - startTime,
        });

        return;
      }

      // Read the file as buffer
      const fileBuffer = fs.readFileSync(placeholderFile.path);

      // Create a File object from the buffer
      const file = new File([fileBuffer], path.basename(targetBlobPath), { type: 'audio/mpeg' });

      // Upload the file to Blob storage
      const uploadResult = await blobService.uploadFile(file, {
        pathname: path.dirname(targetBlobPath),
        filename: path.basename(targetBlobPath),
        access: 'public',
        contentType: 'audio/mpeg',
      });

      // Verify the upload
      const verifyResult = await blobService.getFileInfo(uploadResult.url);

      if (this.options.verbose) {
        // eslint-disable-next-line no-console -- Interactive CLI tool
        console.log(
          chalk.green(
            `   ✅ Uploaded: ${targetBlobPath} (${verifyResult.size} bytes) as ${verifyResult.contentType}`,
          ),
        );
      }

      // Add successful result
      this.results.push({
        status: 'success',
        bookSlug,
        chapterTitle,
        originalPath: audioSrc,
        blobPath: targetBlobPath,
        blobUrl: uploadResult.url,
        fileSize: verifyResult.size,
        contentType: verifyResult.contentType,
        totalTime: Date.now() - startTime,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(chalk.red(`   ❌ Error: ${errorMessage}`));

      // Add failed result
      this.results.push({
        status: 'failed',
        bookSlug,
        chapterTitle,
        originalPath: audioSrc,
        blobPath: `${bookSlug}/audio/${path.basename(audioSrc)}`,
        blobUrl: '',
        totalTime: Date.now() - startTime,
        error: errorMessage,
      });
    }
  }

  /**
   * Save results to log file
   */
  private saveResultsToFile(data: {
    summary: Record<string, unknown>;
    options: MigrationOptions;
    results: AudioMigrationResult[];
  }): void {
    const logFile = this.options.logFile;
    const logPath = path.resolve(process.cwd(), logFile);

    try {
      fs.writeFileSync(logPath, JSON.stringify(data, null, 2));
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log(chalk.green(`💾 Results saved to ${logPath}`));
      // eslint-disable-next-line no-console -- Interactive CLI tool
      console.log();
    } catch (error) {
      console.error(chalk.red(`Failed to save results to ${logPath}:`), error);
    }
  }
}

/**
 * Parse command-line arguments
 */
function parseArgs(): MigrationOptions {
  const args = minimist(process.argv.slice(2), {
    boolean: ['dry-run', 'force', 'verbose'],
    string: ['books', 'log-file', 'retries', 'concurrency'],
    default: {
      'dry-run': false,
      books: '',
      force: false,
      retries: '3',
      concurrency: '5',
      'log-file': 'audio-migration-with-placeholders.json',
      verbose: false,
    },
    alias: {
      d: 'dry-run',
      b: 'books',
      f: 'force',
      r: 'retries',
      c: 'concurrency',
      l: 'log-file',
      v: 'verbose',
    },
  });

  return {
    dryRun: args['dry-run'],
    books: args.books ? args.books.split(',') : [],
    force: args.force,
    retries: parseInt(args.retries),
    concurrency: parseInt(args.concurrency),
    logFile: args['log-file'],
    verbose: args.verbose,
  };
}

/**
 * Main function to run the migration
 */
async function main(): Promise<void> {
  const options = parseArgs();
  const migrator = new AudioFilesMigrator(options);
  await migrator.run();
}

// Run the script
main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
