import { AssetType } from './assets';

/**
 * Migration options
 */
export interface MigrationOptions {
  /**
   * Whether to run in dry-run mode (don't actually migrate assets)
   */
  dryRun: boolean;

  /**
   * Maximum number of concurrent operations
   */
  concurrency: number;

  /**
   * Types of assets to migrate
   */
  assetTypes: AssetType[];

  /**
   * Optional list of book slugs to migrate (migrates all books if omitted)
   */
  bookSlugs?: string[];

  /**
   * Whether to skip verification after migration
   */
  skipVerification?: boolean;

  /**
   * Log level
   */
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  /**
   * Directory to output reports and logs
   */
  outputDir: string;

  /**
   * Whether to verify already migrated assets without migrating
   */
  verifyOnly?: boolean;

  /**
   * Maximum retry attempts for failed operations
   */
  maxRetries?: number;

  /**
   * Batch size for operations
   */
  batchSize?: number;
}

/**
 * Source type for migration operations
 */
export type AssetSourceType = 'digital-ocean' | 'vercel-blob';

/**
 * Migration operation
 */
export interface MigrationOperation {
  /**
   * Type of source storage
   */
  sourceType: AssetSourceType;

  /**
   * Path in the source storage
   */
  sourcePath: string;

  /**
   * Path in the destination storage
   */
  destinationPath: string;

  /**
   * Type of asset
   */
  assetType: AssetType;

  /**
   * Book slug
   */
  bookSlug: string | null;

  /**
   * Asset name
   */
  assetName: string;

  /**
   * Optional metadata
   */
  metadata?: Record<string, string>;

  /**
   * Content type of the asset
   */
  contentType?: string;

  /**
   * Size of the asset in bytes (if known)
   */
  size?: number;

  /**
   * Last modified date of the asset (if known)
   */
  lastModified?: Date;

  /**
   * Unique operation ID
   */
  id: string;
}

/**
 * Status of a migration operation
 */
export type MigrationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

/**
 * Result of a migration operation
 */
export interface MigrationResult {
  /**
   * The original operation
   */
  operation: MigrationOperation;

  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Error details if the operation failed
   */
  error?: Error;

  /**
   * Size of the source asset in bytes
   */
  sourceSize?: number;

  /**
   * Size of the destination asset in bytes
   */
  destinationSize?: number;

  /**
   * Duration of the operation in milliseconds
   */
  duration: number;

  /**
   * Status of verification
   */
  verificationStatus?: 'success' | 'failed' | 'skipped';

  /**
   * Number of retry attempts
   */
  retryCount?: number;

  /**
   * Operation status
   */
  status: MigrationStatus;

  /**
   * Timestamp when the operation started
   */
  startTime: Date;

  /**
   * Timestamp when the operation completed
   */
  endTime?: Date;
}

/**
 * Migration batch status
 */
export interface MigrationBatchStatus {
  /**
   * Total number of operations in the batch
   */
  total: number;

  /**
   * Number of completed operations
   */
  completed: number;

  /**
   * Number of failed operations
   */
  failed: number;

  /**
   * Number of skipped operations
   */
  skipped: number;

  /**
   * Number of operations in progress
   */
  inProgress: number;

  /**
   * Number of pending operations
   */
  pending: number;

  /**
   * Whether the batch is complete
   */
  isComplete: boolean;

  /**
   * Whether the batch had any failures
   */
  hasFailures: boolean;
}

/**
 * Migration report
 */
export interface MigrationReport {
  /**
   * Timestamp when migration started
   */
  startTime: Date;

  /**
   * Timestamp when migration ended
   */
  endTime: Date;

  /**
   * Total number of operations
   */
  totalOperations: number;

  /**
   * Number of successful operations
   */
  successfulOperations: number;

  /**
   * Number of failed operations
   */
  failedOperations: number;

  /**
   * Number of skipped operations
   */
  skippedOperations: number;

  /**
   * Migration options used
   */
  options: MigrationOptions;

  /**
   * Statistics by asset type
   */
  byAssetType: Record<
    string,
    {
      total: number;
      success: number;
      failed: number;
      skipped: number;
    }
  >;

  /**
   * Statistics by book
   */
  byBook: Record<
    string,
    {
      total: number;
      success: number;
      failed: number;
      skipped: number;
    }
  >;

  /**
   * Statistics by source type
   */
  bySourceType: Record<
    AssetSourceType,
    {
      total: number;
      success: number;
      failed: number;
      skipped: number;
    }
  >;

  /**
   * List of errors
   */
  errors: Array<{
    operation: MigrationOperation;
    error: string;
    retryCount: number;
  }>;

  /**
   * Total bytes migrated
   */
  totalBytesMigrated: number;

  /**
   * Migration duration in milliseconds
   */
  durationMs: number;
}

/**
 * Source adapter for retrieving assets from a storage system
 */
export interface AssetSourceAdapter {
  /**
   * Name of the adapter
   */
  readonly name: string;

  /**
   * Type of source
   */
  readonly type: AssetSourceType;

  /**
   * List all assets in the source
   * @param prefix Optional prefix to filter by
   * @param options Optional listing options
   */
  listAssets(
    prefix?: string,
    options?: {
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    assets: {
      path: string;
      size?: number;
      contentType?: string;
      lastModified?: Date;
      metadata?: Record<string, string>;
    }[];
    cursor?: string;
    hasMore: boolean;
  }>;

  /**
   * Fetch asset content
   * @param path Path to the asset
   */
  fetchAsset(path: string): Promise<{
    content: ArrayBuffer;
    contentType?: string;
    size: number;
    metadata?: Record<string, string>;
  }>;

  /**
   * Check if an asset exists
   * @param path Path to the asset
   */
  assetExists(path: string): Promise<boolean>;

  /**
   * Get asset metadata
   * @param path Path to the asset
   */
  getAssetInfo(path: string): Promise<{
    path: string;
    size?: number;
    contentType?: string;
    lastModified?: Date;
    metadata?: Record<string, string>;
  } | null>;
}

/**
 * Destination adapter for storing migrated assets
 */
export interface AssetDestinationAdapter {
  /**
   * Name of the adapter
   */
  readonly name: string;

  /**
   * Upload an asset
   * @param context Object containing upload parameters:
   * - path: Destination path
   * - content: Asset content
   * - options: Upload options
   */
  uploadAsset(context: {
    path: string;
    content: ArrayBuffer;
    options?: {
      contentType?: string;
      metadata?: Record<string, string>;
    };
  }): Promise<{
    path: string;
    url: string;
    size: number;
    contentType?: string;
  }>;

  /**
   * Check if an asset exists
   * @param path Path to the asset
   */
  assetExists(path: string): Promise<boolean>;

  /**
   * Get asset metadata
   * @param path Path to the asset
   */
  getAssetInfo(path: string): Promise<{
    path: string;
    size?: number;
    contentType?: string;
    lastModified?: Date;
    metadata?: Record<string, string>;
  } | null>;
}

/**
 * Interface for the migration service
 */
export interface MigrationService {
  /**
   * Initialize the migration service
   * @param options Migration options
   */
  initialize(options: MigrationOptions): Promise<void>;

  /**
   * Create the migration plan
   */
  createMigrationPlan(): Promise<MigrationOperation[]>;

  /**
   * Execute the migration plan
   * @param operations List of operations to execute
   */
  executeMigrationPlan(operations: MigrationOperation[]): Promise<MigrationReport>;

  /**
   * Verify migrated assets
   * @param operations List of operations to verify
   */
  verifyMigratedAssets(operations: MigrationOperation[]): Promise<MigrationReport>;

  /**
   * Generate a migration report
   * @param results List of migration results
   */
  generateMigrationReport(results: MigrationResult[]): MigrationReport;
}
