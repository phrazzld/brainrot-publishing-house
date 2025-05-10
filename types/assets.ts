/**
 * Core asset type definitions for the Brainrot Publishing asset service
 */

/**
 * Types of assets supported by the service
 */
export enum AssetType {
  AUDIO = 'audio',
  TEXT = 'text',
  IMAGE = 'image',
}

/**
 * Options for URL generation
 */
export interface AssetUrlOptions {
  /**
   * Whether to add cache-busting parameters to the URL
   */
  cacheBusting?: boolean;

  /**
   * Time in seconds until the URL expires (for future secure URL support)
   */
  expiresIn?: number;

  /**
   * Custom headers to apply to the request (for future use)
   */
  headers?: Record<string, string>;
}

/**
 * Options for asset uploads
 */
export interface UploadOptions {
  /**
   * MIME type of the content being uploaded
   */
  contentType?: string;

  /**
   * Custom metadata to store with the asset
   */
  metadata?: Record<string, string>;

  /**
   * Whether to overwrite an existing asset with the same path
   * Default: true
   */
  overwrite?: boolean;

  /**
   * Whether to add a random suffix to the filename to ensure uniqueness
   * Default: false
   */
  addRandomSuffix?: boolean;
}

/**
 * Result of asset upload operation
 */
export interface AssetUploadResult {
  /**
   * Public URL for accessing the uploaded asset
   */
  url: string;

  /**
   * Size of the uploaded asset in bytes
   */
  size: number;

  /**
   * MIME type of the uploaded asset
   */
  contentType: string;

  /**
   * Custom metadata stored with the asset (if any)
   */
  metadata?: Record<string, string>;

  /**
   * When the asset was uploaded
   */
  uploadedAt: Date;

  /**
   * Path to the asset in storage
   */
  path: string;
}

/**
 * Options for listing assets
 */
export interface ListOptions {
  /**
   * Maximum number of assets to return
   */
  limit?: number;

  /**
   * Cursor for pagination
   */
  cursor?: string;

  /**
   * Prefix to filter assets by
   */
  prefix?: string;
}

/**
 * Result of listing assets
 */
export interface AssetListResult {
  /**
   * List of assets
   */
  assets: AssetInfo[];

  /**
   * Cursor for fetching the next page of results
   */
  cursor?: string;

  /**
   * Whether there are more results available
   */
  hasMore: boolean;
}

/**
 * Information about an asset
 */
export interface AssetInfo {
  /**
   * Name of the asset (filename)
   */
  name: string;

  /**
   * Full path to the asset in storage
   */
  path: string;

  /**
   * Public URL for accessing the asset
   */
  url: string;

  /**
   * Size of the asset in bytes
   */
  size: number;

  /**
   * MIME type of the asset
   */
  contentType: string;

  /**
   * When the asset was uploaded
   */
  uploadedAt: Date;

  /**
   * Custom metadata stored with the asset (if any)
   */
  metadata?: Record<string, string>;
}

/**
 * Configuration for the asset service
 */
export interface AssetServiceConfig {
  /**
   * Base URL for public assets
   */
  baseUrl?: string;

  /**
   * Authentication token for storage operations
   */
  token?: string;

  /**
   * Asset root path prefix (e.g., "assets")
   */
  rootPrefix?: string;

  /**
   * Default cache control settings
   */
  defaultCacheControl?: string;

  /**
   * Whether to enable cache busting by default
   */
  defaultCacheBusting?: boolean;
}

/**
 * Error types for asset operations
 */
export enum AssetErrorType {
  NOT_FOUND = 'not_found',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  CONFLICT = 'conflict',
  STORAGE_ERROR = 'storage_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Custom error class for asset operations
 */
export class AssetError extends Error {
  /**
   * Type of error
   */
  readonly type: AssetErrorType;

  /**
   * HTTP status code associated with the error
   */
  readonly statusCode?: number;

  /**
   * Optional cause of the error
   */
  readonly cause?: unknown;

  /**
   * Operation that was being performed when the error occurred
   */
  readonly operation: string;

  /**
   * Asset path associated with the error
   */
  readonly assetPath?: string;

  constructor(
    message: string,
    type: AssetErrorType,
    operation: string,
    options?: {
      cause?: unknown;
      statusCode?: number;
      assetPath?: string;
    }
  ) {
    super(message, { cause: options?.cause });
    this.type = type;
    this.statusCode = options?.statusCode;
    this.cause = options?.cause;
    this.operation = operation;
    this.assetPath = options?.assetPath;
    this.name = 'AssetError';
  }
}

/**
 * Core interface for all asset operations
 */
export interface AssetService {
  /**
   * Get a public URL for an asset
   * @param assetType Type of asset (audio, text, image)
   * @param bookSlug Book identifier
   * @param assetName Name of the specific asset
   * @param options Additional options (e.g., cache control)
   * @returns Promise resolving to a public URL for the asset
   */
  getAssetUrl(
    assetType: AssetType,
    bookSlug: string,
    assetName: string,
    options?: AssetUrlOptions
  ): Promise<string>;

  /**
   * Check if an asset exists
   * @param assetType Type of asset
   * @param bookSlug Book identifier
   * @param assetName Name of the specific asset
   * @returns Promise resolving to boolean indicating existence
   */
  assetExists(assetType: AssetType, bookSlug: string, assetName: string): Promise<boolean>;

  /**
   * Fetch an asset's content
   * @param assetType Type of asset
   * @param bookSlug Book identifier
   * @param assetName Name of the specific asset
   * @returns Promise resolving to the asset content
   */
  fetchAsset(assetType: AssetType, bookSlug: string, assetName: string): Promise<ArrayBuffer>;

  /**
   * Fetch text asset content
   * @param bookSlug Book identifier
   * @param assetName Name of the specific asset
   * @returns Promise resolving to the text content
   */
  fetchTextAsset(bookSlug: string, assetName: string): Promise<string>;

  /**
   * Upload an asset
   * @param context Object containing upload parameters:
   * - assetType: Type of asset
   * - bookSlug: Book identifier
   * - assetName: Name of the specific asset
   * - content: Asset content
   * - options: Upload options
   * @returns Promise resolving when upload completes
   */
  uploadAsset(context: {
    assetType: AssetType;
    bookSlug: string;
    assetName: string;
    content: Blob | ArrayBuffer | string;
    options?: UploadOptions;
  }): Promise<AssetUploadResult>;

  /**
   * Delete an asset
   * @param assetType Type of asset
   * @param bookSlug Book identifier
   * @param assetName Name of the specific asset
   * @returns Promise resolving when deletion completes
   */
  deleteAsset(assetType: AssetType, bookSlug: string, assetName: string): Promise<boolean>;

  /**
   * List assets of a specific type for a book
   * @param assetType Type of asset
   * @param bookSlug Book identifier
   * @param options List options (e.g., pagination)
   * @returns Promise resolving to list of assets
   */
  listAssets(
    assetType: AssetType,
    bookSlug: string,
    options?: ListOptions
  ): Promise<AssetListResult>;
}

/**
 * Service for generating standardized asset paths
 */
export interface AssetPathService {
  /**
   * Generate a standardized asset path
   * @param assetType Type of asset
   * @param bookSlug Book identifier
   * @param assetName Name of the asset
   * @returns Full path to the asset
   */
  getAssetPath(assetType: AssetType, bookSlug: string, assetName: string): string;

  /**
   * Generate an audio asset path with special handling
   * @param bookSlug Book identifier
   * @param chapter Chapter identifier or "full" for the full audiobook
   * @returns Path to the audio asset
   */
  getAudioPath(bookSlug: string, chapter: string | number): string;

  /**
   * Generate a text asset path with special handling
   * @param bookSlug Book identifier
   * @param textType Type of text (e.g., "fulltext", "chapter")
   * @param chapter Optional chapter identifier
   * @returns Path to the text asset
   */
  getTextPath(
    bookSlug: string,
    textType: 'fulltext' | 'chapter' | 'source',
    chapter?: string | number
  ): string;

  /**
   * Generate an image asset path with special handling
   * @param bookSlug Book identifier
   * @param imageType Type of image (e.g., "cover", "chapter")
   * @param chapter Optional chapter identifier
   * @returns Path to the image asset
   */
  getImagePath(
    bookSlug: string,
    imageType: 'cover' | 'chapter' | 'thumbnail',
    chapter?: string | number
  ): string;

  /**
   * Normalize a legacy path to the new standardized format
   * @param legacyPath Legacy path to normalize
   * @returns Normalized path in the new format
   */
  normalizeLegacyPath(legacyPath: string): string;
}
