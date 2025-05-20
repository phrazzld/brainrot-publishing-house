#!/usr/bin/env tsx
/**
 * Migration script to standardize text file names and paths
 * Copies text files from legacy locations to standardized Vercel Blob paths
 */
import * as path from 'path';
import { put } from '@vercel/blob';
import { existsSync } from 'fs';
import { readFile, readdir, writeFile } from 'fs/promises';

import { logger as defaultLogger } from '../utils/logger';
import { AssetPathService } from '../utils/services/AssetPathService';
import { BlobService } from '../utils/services/BlobService';

const { join, relative } = path;

interface MigrationOptions {
  dryRun: boolean;
  books?: string[];
  force: boolean;
  concurrency: number;
  logFile?: string;
}

interface MigrationResult {
  originalPath: string;
  standardizedPath: string;
  status: 'UPLOADED' | 'SKIPPED_DRY_RUN' | 'SKIPPED_EXISTS' | 'FAILED';
  error?: string;
  fileSize?: number;
  timestamp: string;
}

// Simple migration log class for recording results
class MigrationLog {
  private entries: MigrationResult[] = [];

  constructor(
    private logFile: string,
    private type: string,
    private logger: typeof defaultLogger
  ) {}

  addEntry(entry: MigrationResult) {
    this.entries.push(entry);
  }

  async saveLog() {
    const logData = {
      type: this.type,
      timestamp: new Date().toISOString(),
      entries: this.entries,
    };

    try {
      await writeFile(this.logFile, JSON.stringify(logData, null, 2));
      this.logger.info({ msg: 'Migration log saved', path: this.logFile });
    } catch (error) {
      this.logger.error({ msg: 'Failed to save migration log', error });
    }
  }
}

class TextFileMigrator {
  private assetPathService: AssetPathService;
  private blobService: BlobService;
  private logger: typeof defaultLogger;
  private options: MigrationOptions;
  private results: MigrationResult[] = [];

  constructor(
    assetPathService: AssetPathService,
    blobService: BlobService,
    logger: typeof defaultLogger,
    options: MigrationOptions
  ) {
    this.assetPathService = assetPathService;
    this.blobService = blobService;
    this.logger = logger;
    this.options = options;
  }

  async migrate(): Promise<void> {
    this.logger.info({
      msg: 'Starting text file standardization migration',
      dryRun: this.options.dryRun,
      books: this.options.books,
      force: this.options.force,
    });

    try {
      const files = await this.discoverTextFiles();
      this.logger.info({ msg: 'Discovered text files', count: files.length });

      // Process files in batches for concurrency control
      const batches = this.createBatches(files, this.options.concurrency);

      for (const batch of batches) {
        await Promise.all(batch.map((file) => this.processFile(file)));
      }

      await this.generateReport();
    } catch (error) {
      this.logger.error({ msg: 'Migration failed', error });
      throw error;
    }
  }

  private async discoverTextFiles(): Promise<string[]> {
    const files: string[] = [];
    const publicPath = join(process.cwd(), 'public');

    if (this.options.books && this.options.books.length > 0) {
      // Process specific books only
      for (const book of this.options.books) {
        const bookPath = join(publicPath, 'assets', book);
        if (existsSync(bookPath)) {
          await this.scanDirectory(bookPath, files);
        }
      }
    } else {
      // Process all books
      const assetsPath = join(publicPath, 'assets');
      if (existsSync(assetsPath)) {
        await this.scanDirectory(assetsPath, files);
      }
    }

    // Filter to only .txt files in text directories
    return files.filter(
      (file) => file.endsWith('.txt') && (file.includes('/text/') || file.includes('/brainrot/'))
    );
  }

  private async scanDirectory(dir: string, files: string[]): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath, files);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  private async processFile(localPath: string): Promise<void> {
    const timestamp = new Date().toISOString();

    try {
      // Convert local path to app path
      const publicPath = join(process.cwd(), 'public');
      const relativePath = relative(publicPath, localPath);
      const appPath = `/${relativePath}`;

      // Get standardized path
      const standardizedPath = this.assetPathService.convertLegacyPath(appPath);

      this.logger.info({
        msg: 'Processing file',
        localPath,
        appPath,
        standardizedPath,
      });

      // Check if file already exists in Blob storage (unless force flag is set)
      if (!this.options.force) {
        try {
          const standardUrl = this.blobService.getUrlForPath(standardizedPath);
          const fileInfo = await this.blobService.getFileInfo(standardUrl);
          if (fileInfo.size > 0) {
            this.results.push({
              originalPath: appPath,
              standardizedPath,
              status: 'SKIPPED_EXISTS',
              timestamp,
            });
            this.logger.info({
              msg: 'File already exists in blob storage, skipping',
              standardizedPath,
            });
            return;
          }
        } catch (error) {
          // If error checking existence, continue with upload
          this.logger.warn({
            msg: 'Error checking file existence, proceeding with upload',
            standardizedPath,
            error,
          });
        }
      }

      if (this.options.dryRun) {
        this.results.push({
          originalPath: appPath,
          standardizedPath,
          status: 'SKIPPED_DRY_RUN',
          timestamp,
        });
        this.logger.info({
          msg: 'Dry run - would upload file',
          standardizedPath,
        });
        return;
      }

      // Read file content
      const content = await readFile(localPath, 'utf-8');
      const fileSize = Buffer.byteLength(content, 'utf-8');

      // Upload to Vercel Blob
      const blob = await put(standardizedPath, content, {
        access: 'public',
        cacheControlMaxAge: 31536000, // 1 year
        contentType: 'text/plain; charset=utf-8',
      });

      this.results.push({
        originalPath: appPath,
        standardizedPath,
        status: 'UPLOADED',
        fileSize,
        timestamp,
      });

      this.logger.info({
        msg: 'Successfully uploaded file',
        standardizedPath,
        blobUrl: blob.url,
        fileSize,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.results.push({
        originalPath: localPath,
        standardizedPath: 'ERROR',
        status: 'FAILED',
        error: errorMessage,
        timestamp,
      });

      this.logger.error({
        msg: 'Failed to process file',
        localPath,
        error: errorMessage,
      });
    }
  }

  private async generateReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      options: this.options,
      summary: {
        total: this.results.length,
        uploaded: this.results.filter((r) => r.status === 'UPLOADED').length,
        skippedExists: this.results.filter((r) => r.status === 'SKIPPED_EXISTS').length,
        skippedDryRun: this.results.filter((r) => r.status === 'SKIPPED_DRY_RUN').length,
        failed: this.results.filter((r) => r.status === 'FAILED').length,
      },
      results: this.results,
    };

    // Log summary
    this.logger.info({
      msg: 'Migration complete',
      summary: report.summary,
    });

    // Save report to file if specified
    if (this.options.logFile) {
      const migrationLog = new MigrationLog(
        this.options.logFile,
        'text-standardization',
        this.logger
      );

      for (const result of this.results) {
        migrationLog.addEntry(result);
      }

      await migrationLog.saveLog();
    }
  }
}

// Parse command line arguments
// eslint-disable-next-line complexity
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: false,
    force: false,
    concurrency: 5,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--help') {
      // Using console.error as it's allowed by eslint config
      console.error(`
Text File Standardization Migration Script

Usage: npm run standardize:text -- [options]

Options:
  --dry-run         Show what would be uploaded without making changes
  --books           Comma-separated list of book slugs to process (default: all)
  --force           Re-upload files even if they already exist
  --concurrency     Number of concurrent uploads (default: 5)
  --log-file        Path to save migration log (default: none)
  --help           Show this help message

Examples:
  npm run standardize:text -- --dry-run
  npm run standardize:text -- --books=hamlet,the-iliad
  npm run standardize:text -- --force --concurrency=10 --log-file=migration.log
      `);
      process.exit(0);
    } else if (arg.startsWith('--books=')) {
      options.books = arg.substring('--books='.length).split(',');
    } else if (arg.startsWith('--concurrency=')) {
      options.concurrency = parseInt(arg.substring('--concurrency='.length), 10);
    } else if (arg.startsWith('--log-file=')) {
      options.logFile = arg.substring('--log-file='.length);
    } else if (arg === '--books' && i + 1 < args.length) {
      options.books = args[++i].split(',');
    } else if (arg === '--concurrency' && i + 1 < args.length) {
      options.concurrency = parseInt(args[++i], 10);
    } else if (arg === '--log-file' && i + 1 < args.length) {
      options.logFile = args[++i];
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  return options;
}

// Main function
async function main() {
  const options = parseArgs();

  const assetPathService = new AssetPathService();
  const blobService = new BlobService();
  const logger = defaultLogger;

  const migrator = new TextFileMigrator(assetPathService, blobService, logger, options);

  try {
    await migrator.migrate();
    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'Migration failed', error });
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
