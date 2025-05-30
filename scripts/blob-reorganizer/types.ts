/**
 * Type definitions for the blob reorganization tool
 */
import { AssetType } from '../../types/assets.js';

/**
 * Extended Blob result with additional fields
 */
export interface ExtendedBlobResult {
  pathname: string;
  url: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

/**
 * CLI options for the reorganization tool
 */
export interface CliOptions {
  dryRun: boolean;
  limit?: number;
  prefix?: string;
  outputDir: string;
  verbose: boolean;
  skipVerification: boolean;
}

/**
 * Path mapping between original and new paths
 */
export interface PathMapping {
  originalPath: string;
  newPath: string;
  assetType: AssetType | 'shared' | 'site';
  bookSlug: string | null;
  contentType: string;
  size: number;
  url: string;
}

/**
 * Statistics for the migration process
 */
export interface MigrationStats {
  totalAssets: number;
  processedAssets: number;
  skippedAssets: number;
  movedAssets: number;
  failedAssets: number;
  byAssetType: Record<
    string,
    {
      total: number;
      processed: number;
      skipped: number;
      moved: number;
      failed: number;
    }
  >;
  byError: Record<string, number>;
  errors: Array<{
    path: string;
    newPath: string;
    error: string;
  }>;
}

/**
 * Command-line flag definition
 */
export interface FlagDefinition {
  fullName: string;
  shortName: string;
  description: string;
  takesValue: boolean;
  handler: (value?: string) => boolean | string | number;
}
