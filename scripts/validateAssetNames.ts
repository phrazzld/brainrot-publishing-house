#!/usr/bin/env node
/**
 * Asset Naming Validation Script
 *
 * This script scans assets in the Vercel Blob storage and checks if they follow
 * the standardized naming conventions. It generates a report of non-compliant assets
 * and suggests standardized names.
 *
 * Usage:
 *   npx tsx scripts/validateAssetNames.ts [options]
 *
 * Options:
 *   --fix            Generate migration plan for non-compliant assets
 *   --verbose        Enable detailed logging
 *   --book=slug      Scan only assets for a specific book
 *   --type=assetType Scan only assets of a specific type (audio, text, image)
 */
import * as dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { AssetType } from '../types/assets';
import { AssetNameMigration } from '../utils/migration/AssetNameMigration';
import { blobService } from '../utils/services/BlobService';
import { assetNameValidator } from '../utils/validators/AssetNameValidator';

dotenv.config({ path: '.env.local' });

// Get this file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// IMPORTANT: Add Vercel Blob token check
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('❌ BLOB_READ_WRITE_TOKEN environment variable is not set.');
  console.error('Please set this variable in your .env.local file.');
  process.exit(1);
}

// Command line arguments
interface ValidatorOptions {
  fix: boolean;
  verbose: boolean;
  book?: string;
  type?: AssetType;
}

// Result of asset validation
interface ValidationResult {
  path: string;
  isValid: boolean;
  assetType: AssetType;
  bookSlug?: string;
  assetName: string;
  suggestedName?: string;
  error?: string;
}

// Migration plan
interface MigrationPlan {
  total: number;
  compliant: number;
  nonCompliant: number;
  toMigrate: Array<{
    originalPath: string;
    suggestedPath: string;
    assetType: AssetType;
    bookSlug?: string;
  }>;
}

/**
 * Asset name validator
 */
class AssetNameValidator {
  private migration: AssetNameMigration;
  private results: ValidationResult[] = [];
  private options: ValidatorOptions;

  constructor(options: ValidatorOptions) {
    this.migration = new AssetNameMigration();
    this.options = options;
  }

  /**
   * Run the validation process
   */
  async run(): Promise<MigrationPlan> {
    console.warn(
      `\n🔍 Starting asset name validation ${this.options.fix ? '(with migration plan)' : ''}`
    );
    console.warn(`Options: ${JSON.stringify(this.options, null, 2)}\n`);

    try {
      // Scan each asset type unless a specific type is specified
      if (!this.options.type) {
        await this.scanAssetType(AssetType.AUDIO);
        await this.scanAssetType(AssetType.TEXT);
        await this.scanAssetType(AssetType.IMAGE);
      } else {
        await this.scanAssetType(this.options.type);
      }

      // Generate migration plan
      const plan = this.generateMigrationPlan();
      await this.saveReport(plan);

      // Print summary
      this.printSummary(plan);

      return plan;
    } catch (error) {
      console.error('Validation failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Scan assets of a specific type
   */
  private async scanAssetType(assetType: AssetType): Promise<void> {
    this.log(`Scanning ${assetType} assets...`);

    // Get prefix for listing
    const prefix = this.options.book
      ? `assets/${assetType}/${this.options.book}/`
      : `assets/${assetType}/`;

    // List all assets of this type
    let hasMore = true;
    let cursor: string | undefined;
    let count = 0;

    while (hasMore) {
      try {
        const listResult = await blobService.listFiles({
          prefix,
          limit: 100,
          cursor,
        });

        // Process each file
        for (const file of listResult.blobs) {
          await this.validateFile(file.pathname, assetType);
          count++;
        }

        // Update pagination
        hasMore = !!listResult.cursor;
        cursor = listResult.cursor;

        this.log(`Processed ${count} ${assetType} assets so far...`);
      } catch (error) {
        console.error(
          `Error listing ${assetType} assets:`,
          error instanceof Error ? error.message : String(error)
        );
        break;
      }
    }

    this.log(`Completed scanning ${count} ${assetType} assets`);
  }

  /**
   * Validate a single file
   */
  private async validateFile(filePath: string, assetType: AssetType): Promise<void> {
    // Parse path to extract components
    // Expected format: assets/{type}/{book-slug}/{asset-name}
    const pathMatch = filePath.match(/^assets\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!pathMatch) {
      this.log(`Skipping file with invalid path: ${filePath}`);
      return;
    }

    const [, pathType, bookSlug, assetName] = pathMatch;

    // Skip if type doesn't match
    if (pathType !== assetType) {
      this.log(`Skipping file with mismatched type: ${filePath}`);
      return;
    }

    // Validate the asset name
    try {
      // Just try validating - this will throw if invalid
      assetNameValidator.validateAssetName(assetType, assetName);

      // If we get here, the asset name is valid
      this.results.push({
        path: filePath,
        isValid: true,
        assetType,
        bookSlug,
        assetName,
      });
    } catch (error) {
      // Asset name is not valid
      const migrationResult = this.migration.migrateAssetName(assetType, assetName);

      this.results.push({
        path: filePath,
        isValid: false,
        assetType,
        bookSlug,
        assetName,
        suggestedName: migrationResult.success ? migrationResult.migratedName : undefined,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate a migration plan
   */
  private generateMigrationPlan(): MigrationPlan {
    const compliant = this.results.filter((r) => r.isValid).length;
    const nonCompliant = this.results.filter((r) => !r.isValid).length;

    // Create list of assets to migrate
    const toMigrate = this.results
      .filter((r) => !r.isValid && r.suggestedName)
      .map((r) => ({
        originalPath: r.path,
        suggestedPath: r.suggestedName ? r.path.replace(r.assetName, r.suggestedName) : r.path,
        assetType: r.assetType,
        bookSlug: r.bookSlug,
      }));

    return {
      total: this.results.length,
      compliant,
      nonCompliant,
      toMigrate,
    };
  }

  /**
   * Save validation report and migration plan
   */
  private async saveReport(plan: MigrationPlan): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      options: this.options,
      summary: {
        total: plan.total,
        compliant: plan.compliant,
        nonCompliant: plan.nonCompliant,
        compliance: plan.total > 0 ? (plan.compliant / plan.total) * 100 : 0,
      },
      nonCompliantByType: this.results
        .filter((r) => !r.isValid)
        .reduce(
          (acc, r) => {
            acc[r.assetType] = (acc[r.assetType] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      assets: this.results,
      migrationPlan: plan.toMigrate,
    };

    // Format for output
    const reportJson = JSON.stringify(report, null, 2);
    const migrationPlanJson = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        plan: plan.toMigrate,
      },
      null,
      2
    );

    // Save report
    const reportPath = path.join(projectRoot, 'asset-naming-report.json');
    await fs.writeFile(reportPath, reportJson, 'utf8');
    console.warn(`\n💾 Validation report saved to ${reportPath}`);

    // Save migration plan if requested
    if (this.options.fix && plan.toMigrate.length > 0) {
      const planPath = path.join(projectRoot, 'asset-naming-migration-plan.json');
      await fs.writeFile(planPath, migrationPlanJson, 'utf8');
      console.warn(`💾 Migration plan saved to ${planPath}`);
    }
  }

  /**
   * Print migration summary
   */
  private printSummary(plan: MigrationPlan): void {
    console.warn('\n📊 Asset Naming Validation Summary');
    console.warn('----------------------------------');
    console.warn(`Total assets: ${plan.total}`);
    console.warn(
      `Compliant   : ${plan.compliant} (${((plan.compliant / plan.total) * 100).toFixed(2)}%)`
    );
    console.warn(
      `Non-compliant: ${plan.nonCompliant} (${((plan.nonCompliant / plan.total) * 100).toFixed(2)}%)`
    );

    // Print non-compliant assets by type
    const nonCompliantByType = this.results
      .filter((r) => !r.isValid)
      .reduce(
        (acc, r) => {
          acc[r.assetType] = (acc[r.assetType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

    console.warn('\nNon-compliant assets by type:');
    for (const [type, count] of Object.entries(nonCompliantByType)) {
      console.warn(`- ${type}: ${count}`);
    }

    // Print migration plan summary
    if (this.options.fix) {
      console.warn(`\nAssets that can be migrated: ${plan.toMigrate.length}`);

      if (plan.toMigrate.length > 0) {
        console.warn('\nMigration plan generated. Run the migration with:');
        console.warn('npx tsx scripts/migrateAssetNames.ts');
      }
    }
  }

  /**
   * Conditionally log messages based on verbose option
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(message);
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): ValidatorOptions {
  const options: ValidatorOptions = {
    fix: false,
    verbose: false,
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === '--fix') {
      options.fix = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg.startsWith('--book=')) {
      options.book = arg.substring('--book='.length);
    } else if (arg.startsWith('--type=')) {
      const typeArg = arg.substring('--type='.length);
      if (Object.values(AssetType).includes(typeArg as AssetType)) {
        options.type = typeArg as AssetType;
      } else {
        console.warn(
          `Warning: Invalid asset type "${typeArg}". Valid types are: ${Object.values(AssetType).join(', ')}`
        );
      }
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
    const validator = new AssetNameValidator(options);
    await validator.run();

    console.warn('\n✅ Asset naming validation completed!');
    process.exit(0);
  } catch (error) {
    console.error(
      '\n❌ Asset naming validation failed:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Run the script
main();
