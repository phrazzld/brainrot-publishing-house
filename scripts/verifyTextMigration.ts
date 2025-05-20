#!/usr/bin/env tsx
import * as path from 'path';
import { head } from '@vercel/blob';
import { config } from 'dotenv';
import { promises as fs } from 'fs';

import { AssetType } from '../types/assets';
import { logger } from '../utils/logger';
import { AssetPathService } from '../utils/services/AssetPathService';
import { createAssetService } from '../utils/services/AssetServiceFactory';

// Load environment variables from .env.local
config({ path: '.env.local' });

interface VerificationResult {
  path: string;
  exists: boolean;
  error?: string;
}

export class TextMigrationVerifier {
  private blobService: ReturnType<typeof createAssetService>;
  private pathService: AssetPathService;
  private log = logger.child({ name: 'TextMigrationVerifier' });

  constructor() {
    this.blobService = createAssetService();
    this.pathService = new AssetPathService();
  }

  async verifyStandardizedPaths(sampleSize: number = 10): Promise<void> {
    try {
      // Read from all migration JSON files to gather standardized paths
      const files: { from: string; to: string }[] = [];

      // Read from individual migration JSONs
      const migrationFiles = [
        'source-text-migration.json',
        'custom-text-migration.json',
        'brainrot-text-migration.json',
      ];

      for (const file of migrationFiles) {
        try {
          const content = await fs.readFile(
            path.join('/Users/phaedrus/Development/brainrot-publishing-house', file),
            'utf-8'
          );
          const migration = JSON.parse(content);

          // Structure is book -> files -> migration data
          for (const book in migration) {
            const bookFiles = migration[book];
            for (const filename in bookFiles) {
              if (bookFiles[filename] && bookFiles[filename].blobPath) {
                // Use AssetPathService to get standardized path
                const standardizedPath = this.pathService.convertLegacyPath(
                  bookFiles[filename].blobPath
                );
                files.push({
                  from: bookFiles[filename].blobPath,
                  to: standardizedPath,
                });
              }
            }
          }
        } catch (error) {
          this.log.debug({ msg: `Could not read ${file}`, error });
        }
      }

      // Sample random files for verification
      const sampled = files
        .filter((f) => f.to.includes('/text/')) // Only text files
        .sort(() => Math.random() - 0.5)
        .slice(0, sampleSize);

      this.log.info({
        msg: 'Verifying standardized paths',
        totalFiles: files.length,
        sampleSize: sampled.length,
      });

      const results: VerificationResult[] = [];

      for (const file of sampled) {
        const result = await this.verifyFile(file.to);
        results.push(result);

        this.log.info({
          msg: 'Verification result',
          path: file.to,
          exists: result.exists,
          originalPath: file.from,
        });
      }

      // Generate summary
      const successful = results.filter((r) => r.exists).length;
      const failed = results.filter((r) => !r.exists).length;

      this.log.info({
        msg: 'Verification summary',
        total: results.length,
        successful,
        failed,
        successRate: ((successful / results.length) * 100).toFixed(2) + '%',
      });

      // Save verification report
      const verificationReport = {
        timestamp: new Date().toISOString(),
        summary: {
          total: results.length,
          successful,
          failed,
          successRate: ((successful / results.length) * 100).toFixed(2) + '%',
        },
        results,
      };

      const reportPath = path.join(
        '/Users/phaedrus/Development/brainrot-publishing-house/migration-logs',
        `text-verification-${Date.now()}.json`
      );

      await fs.writeFile(reportPath, JSON.stringify(verificationReport, null, 2));
      this.log.info({ msg: 'Verification report saved', path: reportPath });
    } catch (error) {
      this.log.error({ msg: 'Failed to verify migration', error });
      throw error;
    }
  }

  private async verifyFile(blobPath: string): Promise<VerificationResult> {
    try {
      // Extract components from standardized path
      // Format: assets/text/{bookSlug}/{assetName}
      const pathMatch = blobPath.match(/^assets\/text\/([^/]+)\/(.+)$/);
      if (!pathMatch) {
        throw new Error(`Invalid standardized path format: ${blobPath}`);
      }

      const [, bookSlug, assetName] = pathMatch;

      // Get URL using the service method
      const blobUrl = await this.blobService.getAssetUrl(AssetType.TEXT, bookSlug, assetName, {
        cacheBusting: false,
      });

      // Try to get file metadata from blob storage
      await head(blobUrl);
      return { path: blobPath, exists: true };
    } catch (error: unknown) {
      // If file doesn't exist, return false
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        path: blobPath,
        exists: false,
        error: errorMessage,
      };
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new TextMigrationVerifier();

  // Parse arguments
  const args = process.argv.slice(2);
  let sampleSize = 10;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sample-size' && i + 1 < args.length) {
      sampleSize = parseInt(args[i + 1], 10);
      i++;
    }
  }

  verifier.verifyStandardizedPaths(sampleSize).catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}
