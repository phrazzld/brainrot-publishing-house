# Asset Service Design Document

## Overview

The Asset Service will provide a single, consistent interface for managing all digital assets (audio, text, images) in the Brainrot Publishing House application. This service will replace the current dual-provider approach that uses both Digital Ocean Spaces and Vercel Blob, simplifying our architecture and improving reliability.

## Design Goals

1. **Simplicity**: Single storage backend (Vercel Blob) with clear, consistent interfaces
2. **Reliability**: Robust error handling, retries, and comprehensive logging
3. **Maintainability**: Clear abstractions, thorough documentation, and testable components
4. **Performance**: Optimized for fast asset retrieval and effective caching
5. **Scalability**: Designed to handle growing asset libraries and traffic

## Architecture

### Core Components

1. **AssetService**: Central interface for all asset operations
2. **PathService**: Handles path generation and normalization
3. **StorageAdapter**: Implementation of storage operations (Vercel Blob)
4. **Asset Models**: Type definitions for different asset types

### Asset Types

1. **AudioAsset**: Audio files (MP3, etc.)
2. **TextAsset**: Text content (plain text, HTML, etc.)
3. **ImageAsset**: Image files (PNG, JPG, etc.)

## Path Structure

All assets will follow a consistent path structure in Vercel Blob:

```
assets/[type]/[book-slug]/[asset-name]
```

Examples:

- `assets/audio/the-iliad/chapter-01.mp3`
- `assets/text/the-odyssey/fulltext.txt`
- `assets/images/hamlet/cover.jpg`

Benefits of this structure:

- Consistent prefix (`assets/`) for all asset types
- Clear categorization by asset type
- Book-specific organization
- Predictable path generation

## Service Interface

```typescript
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
   * @param assetType Type of asset
   * @param bookSlug Book identifier
   * @param assetName Name of the specific asset
   * @param content Asset content
   * @param options Upload options
   * @returns Promise resolving when upload completes
   */
  uploadAsset(
    assetType: AssetType,
    bookSlug: string,
    assetName: string,
    content: Blob | ArrayBuffer | string,
    options?: UploadOptions
  ): Promise<AssetUploadResult>;

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
```

## Type Definitions

```typescript
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
  cacheBusting?: boolean;
  expiresIn?: number; // For future secure URL support
}

/**
 * Options for asset uploads
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  overwrite?: boolean;
}

/**
 * Result of asset upload operation
 */
export interface AssetUploadResult {
  url: string;
  size: number;
  contentType: string;
  metadata?: Record<string, string>;
  uploadedAt: Date;
}

/**
 * Options for listing assets
 */
export interface ListOptions {
  limit?: number;
  cursor?: string;
  prefix?: string;
}

/**
 * Result of listing assets
 */
export interface AssetListResult {
  assets: AssetInfo[];
  cursor?: string;
  hasMore: boolean;
}

/**
 * Information about an asset
 */
export interface AssetInfo {
  name: string;
  path: string;
  url: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
  metadata?: Record<string, string>;
}
```

## Implementation Strategy

### VercelBlobAssetService

This will be our initial implementation using Vercel Blob:

```typescript
export class VercelBlobAssetService implements AssetService {
  constructor(
    private readonly pathService: AssetPathService,
    private readonly config: AssetServiceConfig,
    private readonly logger?: Logger
  ) {}

  // Implementation of all interface methods using Vercel Blob SDK
  // ...
}
```

### AssetPathService

Dedicated service for path management:

```typescript
export class AssetPathService {
  /**
   * Generate a standardized asset path
   */
  getAssetPath(assetType: AssetType, bookSlug: string, assetName: string): string {
    return `assets/${assetType}/${bookSlug}/${assetName}`;
  }

  /**
   * Generate special paths for specific asset types
   */
  getAudioPath(bookSlug: string, chapter: string): string {
    // Handle special cases for audio files
    if (chapter === 'full') {
      return this.getAssetPath(AssetType.AUDIO, bookSlug, 'full-audiobook.mp3');
    }
    return this.getAssetPath(AssetType.AUDIO, bookSlug, `chapter-${this.padChapter(chapter)}.mp3`);
  }

  /**
   * Normalize legacy paths to new format
   */
  normalizeLegacyPath(legacyPath: string): string {
    // Implementation to convert legacy paths to new format
    // ...
  }

  /**
   * Pad chapter numbers with leading zeros
   */
  private padChapter(chapter: string | number): string {
    const num = typeof chapter === 'string' ? parseInt(chapter, 10) : chapter;
    return num.toString().padStart(2, '0');
  }
}
```

## Error Handling Strategy

The service will implement a comprehensive error handling strategy:

1. **Request Validation**: Validate all parameters before making storage requests
2. **Error Types**: Define specific error types for different failure scenarios
3. **Retries**: Implement exponential backoff retries for transient errors
4. **Detailed Logging**: Log detailed error information with context
5. **Error Normalization**: Present consistent error structures to consumers
6. **Graceful Degradation**: Provide fallbacks where possible
7. **Correlation IDs**: Include correlation IDs in all logs for traceability

## Logging Strategy

Each operation will include structured logging:

1. **Entry Logging**: Log the start of each operation with parameters
2. **Success Logging**: Log successful operations with key metrics
3. **Error Logging**: Detailed error logging with context
4. **Performance Metrics**: Include timing information for operations
5. **Correlation**: Use correlation IDs to link related operations

## Migration Strategy

1. **Parallel Implementation**: Implement new service alongside existing code
2. **Gradual Rollout**: Migrate one asset type at a time
3. **Dual-Read Mode**: Read from both systems during transition
4. **Verification**: Verify all assets are correctly migrated before cutover
5. **Rollback Plan**: Maintain ability to roll back to previous implementation

## Testing Strategy

1. **Unit Tests**: Test all service methods in isolation
2. **Integration Tests**: Test interactions with Vercel Blob
3. **End-to-End Tests**: Test entire asset flow in application
4. **Migration Tests**: Verify migration correctness
5. **Performance Tests**: Measure and optimize asset access performance

## Implementation Timeline

1. **Phase 1**: Implement core interfaces and path service
2. **Phase 2**: Implement Vercel Blob adapter
3. **Phase 3**: Create migration tools and verification
4. **Phase 4**: Integrate with application code
5. **Phase 5**: Remove legacy Digital Ocean code

## Conclusion

This Asset Service design provides a clear path to simplifying our asset management architecture while improving reliability, maintainability, and performance. By standardizing on Vercel Blob with a well-defined interface, we'll reduce complexity and improve the user experience.

The migration plan allows for a gradual, safe transition without disrupting the application, and the comprehensive error handling and logging strategies will make the system more robust and easier to debug.
