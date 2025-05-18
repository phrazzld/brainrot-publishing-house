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
  rootLogger.error('BLOB_READ_WRITE_TOKEN is required for production migration');
  process.exit(1);
}

async function checkAndCopyFile(originalPath: string): Promise<MigrationResult> {
  const fileLogger = rootLogger.child({ originalPath });

  try {
    // Get standardized path
    const standardizedPath = blobPathService.convertLegacyPath(originalPath);

    // Skip if already standardized
    if (originalPath === standardizedPath) {
      fileLogger.info('Path already standardized');
      return {
        originalPath,
        standardizedPath,
        status: 'skipped',
      };
    }

    fileLogger.info({ standardizedPath, msg: 'Converting path' });

    // Check if file already exists at standard path
    try {
      const exists = await blobService.exists(standardizedPath);
      if (exists) {
        fileLogger.info('File already exists at standardized path');
        return {
          originalPath,
          standardizedPath,
          status: 'skipped',
        };
      }
    } catch {
      // File doesn't exist, which is expected
    }

    // Get the file content from original path
    let content: Buffer;
    try {
      const response = await fetch(blobService.getUrlForPath(originalPath));
      if (!response.ok) {
        throw new Error(`Failed to fetch original file: ${response.status} ${response.statusText}`);
      }
      content = Buffer.from(await response.arrayBuffer());
    } catch (error) {
      fileLogger.error({ error, msg: 'Failed to download original file' });
      return {
        originalPath,
        standardizedPath,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // Upload to standardized path
    try {
      // Convert buffer to string for text files
      const textContent = content.toString('utf-8');

      const uploadResult = await blobService.uploadText(textContent, standardizedPath, {
        access: 'public',
        contentType: 'text/plain',
      });

      fileLogger.info({
        url: uploadResult.url,
        msg: 'Successfully uploaded to standardized path',
      });

      return {
        originalPath,
        standardizedPath,
        status: 'success',
      };
    } catch (error) {
      fileLogger.error({ error, msg: 'Failed to upload to standardized path' });
      return {
        originalPath,
        standardizedPath,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
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

async function main() {
  const startTime = new Date();
  const results: MigrationResult[] = [];

  rootLogger.info('Starting text standardization migration');

  // Load file list from migration logs
  let filesToMigrate: string[] = [];

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

        // Extract file paths from migration data
        for (const book of Object.values(data)) {
          if (typeof book === 'object' && book !== null) {
            interface FileInfo {
              blobPath?: string;
            }

            for (const fileInfo of Object.values(book as Record<string, FileInfo>)) {
              if (fileInfo.blobPath && !fileInfo.blobPath.startsWith('http')) {
                filesToMigrate.push(fileInfo.blobPath);
              }
            }
          }
        }
      } catch (error) {
        rootLogger.error({
          file: migrationFile,
          error,
          msg: 'Failed to load migration file',
        });
      }
    }
  }

  // Also check translation files
  const books = ['hamlet', 'the-iliad', 'the-odyssey', 'the-aeneid', 'huckleberry-finn'];

  for (const book of books) {
    try {
      const translation = await import(`../translations/books/${book}.js`);
      const bookData = translation.default;

      if (bookData.chapters) {
        for (const chapter of bookData.chapters) {
          if (chapter.text && !chapter.text.startsWith('http')) {
            // Extract path from getAssetUrl result
            const match = chapter.text.match(/\/assets\/.+\.txt$/);
            if (match) {
              filesToMigrate.push(match[0].substring(1)); // Remove leading slash
            }
          }
        }
      }
    } catch (error) {
      rootLogger.warn({ book, error, msg: 'Could not load translation' });
    }
  }

  // Remove duplicates
  filesToMigrate = [...new Set(filesToMigrate)];

  rootLogger.info({ count: filesToMigrate.length, msg: 'Files to migrate' });

  // Process files with concurrency control
  const concurrency = 5;
  const chunks = [];
  for (let i = 0; i < filesToMigrate.length; i += concurrency) {
    chunks.push(filesToMigrate.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map((file) => checkAndCopyFile(file)));
    results.push(...chunkResults);
  }

  // Generate summary
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

  rootLogger.info({
    ...summary,
    reportPath,
    msg: 'Migration complete',
  });

  // Exit with appropriate code
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  rootLogger.error({ error, msg: 'Fatal error' });
  process.exit(1);
});
