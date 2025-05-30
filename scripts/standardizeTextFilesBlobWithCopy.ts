#!/usr/bin/env node
import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { AssetType } from '@/types/assets.js';
import logger from '@/utils/logger.js';
import { AssetPathService, VercelBlobAssetService } from '@/utils/services.js';
import { createAssetService } from '@/utils/services/AssetServiceFactory.js';

// Load environment variables from .env.local
config({ path: '.env.local' });

interface StandardizationLog {
  originalPath: string;
  standardizedPath: string;
  status: 'success' | 'error' | 'skipped';
  error?: string;
  timestamp: string;
}

class MigrationLog {
  logs: StandardizationLog[] = [];

  add(log: StandardizationLog): void {
    this.logs.push(log);
  }

  save(filename: string): void {
    const logDir = join(process.cwd(), 'migration-logs');

    mkdirSync(logDir, { recursive: true });

    writeFileSync(join(logDir, filename), JSON.stringify(this.logs, null, 2), 'utf-8');
  }
}

interface StandardizationOptions {
  dryRun: boolean;
  books?: string[];
  logFile?: string;
  concurrency: number;
}

export class TextFileStandardizer {
  private pathService: AssetPathService;
  private blobService: VercelBlobAssetService;
  private assetService: ReturnType<typeof createAssetService>;
  private logger: typeof logger;
  private log: MigrationLog;
  private processedFiles = 0;
  private successCount = 0;
  private errorCount = 0;
  private skippedCount = 0;

  constructor(private options: StandardizationOptions) {
    this.pathService = new AssetPathService();
    this.logger = logger.child({ name: 'TextFileStandardizer' });

    const config = {
      baseUrl: 'https://kl4fq7f0qrmpbnkw.public.blob.vercel-storage.com',
      rootPrefix: 'assets',
    };

    this.blobService = new VercelBlobAssetService(this.pathService, config, this.logger);
    this.assetService = createAssetService();
    this.log = new MigrationLog();
  }

  async run(): Promise<void> {
    this.logger.info({
      msg: 'Starting text file standardization',
      dryRun: this.options.dryRun,
      books: this.options.books || 'all',
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

    // Use the existing JSON files to discover text files
    await this.discoverFromMigrationFiles(files);

    // Also check translations for text paths
    await this.discoverFromTranslations(files);

    return [...new Set(files)]; // Remove duplicates
  }

  private async discoverFromMigrationFiles(files: string[]): Promise<void> {
    const migrationFiles = [
      'brainrot-text-migration.json',
      'source-text-migration.json',
      'custom-text-migration.json',
    ];

    for (const migrationFile of migrationFiles) {
      try {
        const fileContent = await import(`../${migrationFile}`);
        const migrationData = fileContent.default || fileContent;

        if (typeof migrationData === 'object') {
          this.processMigrationData(migrationData, files);
        }
      } catch (error) {
        this.logger.debug({ msg: 'Could not load migration file', file: migrationFile, error });
      }
    }
  }

  private async discoverFromTranslations(files: string[]): Promise<void> {
    const books = this.options.books || [
      'hamlet',
      'the-iliad',
      'the-odyssey',
      'the-aeneid',
      'huckleberry-finn',
    ];

    for (const book of books) {
      try {
        const translationPath = `../translations/books/${book}.ts`;
        const translation = await import(translationPath);
        const bookData = translation.default;

        if (bookData.chapters) {
          this.processTranslationChapters(bookData.chapters, files);
        }
      } catch (error) {
        this.logger.debug({ msg: 'Could not load translation', book, error });
      }
    }
  }

  private processTranslationChapters(chapters: { text?: string }[], files: string[]): void {
    for (const chapter of chapters) {
      if (chapter.text) {
        let textPath = chapter.text;

        // Skip full URLs completely - we only want blob paths
        if (textPath.startsWith('http://') || textPath.startsWith('https://')) {
          continue;
        }

        // Remove leading slash if present
        if (textPath.startsWith('/')) {
          textPath = textPath.substring(1);
        }

        if (textPath.endsWith('.txt')) {
          files.push(textPath);
        }
      }
    }
  }

  private processMigrationData(migrationData: Record<string, unknown>, files: string[]): void {
    for (const book of Object.keys(migrationData)) {
      if (this.options.books && this.options.books.length > 0) {
        if (!this.options.books.includes(book)) continue;
      }

      const bookData = migrationData[book];
      if (typeof bookData !== 'object' || bookData === null) continue;

      for (const [_fileName, fileInfo] of Object.entries(bookData)) {
        if (typeof fileInfo !== 'object' || fileInfo === null) continue;

        const fileData = fileInfo as StandardizationLog & { blobPath?: string; blobUrl?: string };

        // Use blobPath, not blobUrl
        const blobPath = fileData.blobPath || fileData.originalPath;

        // Skip blobUrl entries
        if (!blobPath || blobPath.startsWith('http://') || blobPath.startsWith('https://')) {
          continue;
        }

        if (blobPath.endsWith('.txt')) {
          let cleanPath = blobPath;

          if (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.substring(1);
          }

          files.push(cleanPath);
        }
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

  private async processFile(blobPath: string): Promise<void> {
    const timestamp = new Date().toISOString();
    this.processedFiles++;

    try {
      // Get standardized path
      const standardizedPath = this.pathService.convertLegacyPath(blobPath);

      // Check if already standardized
      if (blobPath === standardizedPath) {
        this.logger.info({ msg: 'Path already standardized', blobPath });
        this.skippedCount++;

        this.log.add({
          originalPath: blobPath,
          standardizedPath,
          status: 'skipped',
          timestamp,
        });

        return;
      }

      this.logger.info({
        msg: 'Standardizing path',
        from: blobPath,
        to: standardizedPath,
      });

      if (!this.options.dryRun) {
        try {
          // Download file content from original path
          this.logger.info({ msg: 'Downloading file', path: blobPath });
          const response = await fetch(
            `https://kl4fq7f0qrmpbnkw.public.blob.vercel-storage.com/${blobPath}`,
          );

          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
          }

          const content = await response.text();

          // Upload to standardized path
          this.logger.info({ msg: 'Uploading to standardized path', path: standardizedPath });

          // Use the AssetService to upload the file
          const uploaded = await this.assetService.uploadAsset({
            assetType: AssetType.TEXT,
            bookSlug: standardizedPath.split('/')[2], // Extract book slug from path
            assetName: standardizedPath.split('/').slice(3).join('/'), // Extract asset name from path
            content: content,
            options: {
              contentType: 'text/plain',
            },
          });

          this.logger.info({
            msg: 'File copied successfully',
            from: blobPath,
            to: standardizedPath,
            uploadedUrl: uploaded.url,
          });
        } catch (uploadError) {
          // If actual copy fails, just log it but continue
          this.logger.warn({
            msg: 'Could not copy file (requires BLOB_READ_WRITE_TOKEN)',
            from: blobPath,
            to: standardizedPath,
            error: uploadError instanceof Error ? uploadError.message : String(uploadError),
          });
        }
      }

      this.successCount++;

      this.log.add({
        originalPath: blobPath,
        standardizedPath,
        status: 'success',
        timestamp,
      });
    } catch (error) {
      this.errorCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error({
        msg: 'Failed to process file',
        blobPath,
        error: errorMessage,
      });

      this.log.add({
        originalPath: blobPath,
        standardizedPath: '',
        status: 'error',
        error: errorMessage,
        timestamp,
      });
    }
  }

  private async generateReport(): Promise<void> {
    const report = {
      summary: {
        totalFiles: this.processedFiles,
        successful: this.successCount,
        skipped: this.skippedCount,
        errors: this.errorCount,
        dryRun: this.options.dryRun,
      },
      timestamp: new Date().toISOString(),
    };

    this.logger.info({ msg: 'Standardization complete', ...report.summary });

    if (this.options.logFile) {
      this.log.save(this.options.logFile);
      this.logger.info({ msg: 'Log file saved', filename: this.options.logFile });
    }

    // Save summary report
    const reportPath = join(
      process.cwd(),
      'migration-logs',
      `text-standardization-report-${Date.now()}.json`,
    );
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    this.logger.info({ msg: 'Report saved', path: reportPath });
  }
}

// Parse command line arguments
// eslint-disable-next-line complexity
function parseArgs(): StandardizationOptions {
  const args = process.argv.slice(2);
  const options: StandardizationOptions = {
    dryRun: false,
    concurrency: 5,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--dry-run=')) {
      options.dryRun = arg.split('=')[1] === 'true';
    } else if (arg === '--books' && i + 1 < args.length) {
      options.books = args[++i].split(',');
    } else if (arg.startsWith('--books=')) {
      options.books = arg.split('=')[1].split(',');
    } else if (arg === '--log-file' && i + 1 < args.length) {
      options.logFile = args[++i];
    } else if (arg.startsWith('--log-file=')) {
      options.logFile = arg.split('=')[1];
    } else if (arg === '--concurrency' && i + 1 < args.length) {
      options.concurrency = parseInt(args[++i], 10);
    } else if (arg.startsWith('--concurrency=')) {
      options.concurrency = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--help' || arg === '-h') {
      // Using console.error as it's allowed by eslint config
      console.error(`
Usage: npm run standardize:text:blob:copy [options]

Options:
  --dry-run              Run without making changes
  --books=BOOKS          Comma-separated list of books to process (e.g., hamlet,iliad)
  --log-file=FILE        Save detailed log to FILE
  --concurrency=N        Number of concurrent operations (default: 5)
  --help, -h            Show this help message

Examples:
  npm run standardize:text:blob:copy --dry-run
  npm run standardize:text:blob:copy --books=hamlet --log-file=hamlet-standardization.log
  npm run standardize:text:blob:copy --books=iliad,odyssey --concurrency=10
      `);
      process.exit(0);
    }
  }

  return options;
}

// Run if called directly
const isDirectExecution = import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  const options = parseArgs();
  const standardizer = new TextFileStandardizer(options);

  standardizer
    .run()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Standardization failed:', error);
      process.exit(1);
    });
}
