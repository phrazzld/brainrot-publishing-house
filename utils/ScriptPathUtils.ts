/**
 * ScriptPathUtils
 *
 * Standardized utilities for handling asset paths in scripts.
 * This module provides a consistent interface for script-specific path operations,
 * ensuring compatibility with both legacy and standardized path formats.
 */
import { AssetType } from '../types/assets';
import { logger } from './logger';
import { assetPathService } from './services/AssetPathService';
import { assetNameValidator } from './validators/AssetNameValidator';

// Create a module-specific logger
const moduleLogger = logger.child({ module: 'ScriptPathUtils' });

/**
 * Interface for asset path information extracted from a path string
 */
export interface AssetPathInfo {
  /**
   * The original path that was analyzed
   */
  originalPath: string;

  /**
   * The normalized path in the standardized format
   */
  normalizedPath: string;

  /**
   * The type of asset (audio, text, image, etc.)
   */
  assetType: AssetType | 'shared' | 'site' | 'unknown';

  /**
   * The book slug if this is a book-specific asset, or null for shared/site assets
   */
  bookSlug: string | null;

  /**
   * The filename component of the path
   */
  filename: string;

  /**
   * Whether this path is in legacy format
   */
  isLegacyFormat: boolean;

  /**
   * For chapter assets, the chapter number (if available)
   */
  chapterNumber?: string | number;

  /**
   * Additional path metadata based on pattern matching
   */
  metadata: Record<string, unknown>;
}

/**
 * URL generation options
 */
export interface UrlGenerationOptions {
  /** Base URL to use (overrides environment variables) */
  baseUrl?: string;
  /** Force no-cache by adding timestamp parameter */
  noCache?: boolean;
}

/**
 * Options for filename generation
 */
export interface FilenameOptions {
  /** Prefix to add to the filename (e.g., 'brainrot' for 'brainrot-chapter-01.txt') */
  prefix?: string;
  /** File extension (defaults to standard extension for the asset type) */
  extension?: string;
}

/**
 * Checks if a path is in the legacy format
 *
 * Legacy formats include:
 * - Paths that start with '/' (e.g., '/assets/hamlet/audio/chapter-01.mp3')
 * - Paths that start with 'books/' (e.g., 'books/hamlet/audio/chapter-01.mp3')
 * - Direct book paths (e.g., 'hamlet/audio/chapter-01.mp3')
 * - Old asset patterns like 'images/', 'site-assets/'
 *
 * @param path The path to check
 * @returns True if the path is in a legacy format
 *
 * @example
 * isLegacyPath('/assets/hamlet/audio/chapter-01.mp3') // true
 * isLegacyPath('assets/audio/hamlet/chapter-01.mp3') // false
 */
export function isLegacyPath(path: string): boolean {
  // Normalize path by removing leading slash
  const normalizedPath = path.replace(/^\/+/, '');

  // Check if path is already in standardized format
  if (normalizedPath.match(/^assets\/(audio|text|image|shared|site)\//)) {
    return false;
  }

  // These are all legacy format indicators
  return (
    path.startsWith('/') ||
    normalizedPath.startsWith('books/') ||
    normalizedPath.match(/^[^/]+\/(audio|text|images)\//) !== null ||
    normalizedPath.startsWith('images/') ||
    normalizedPath.startsWith('site-assets/')
  );
}

/**
 * Normalizes a path to the standardized format
 *
 * This function handles various legacy path formats and converts them
 * to the standardized format used by the asset system.
 *
 * @param path The path to normalize
 * @returns The normalized path in standardized format
 *
 * @example
 * normalizePath('/assets/hamlet/audio/chapter-01.mp3') // 'assets/audio/hamlet/chapter-01.mp3'
 * normalizePath('books/the-odyssey/images/cover.jpg') // 'assets/image/the-odyssey/cover.jpg'
 */
export function normalizePath(path: string): string {
  // If already in standardized format, return as is
  if (!isLegacyPath(path)) {
    return path;
  }

  // Special case for placeholder cover image
  if (path === '/assets/covers/placeholder.jpg') {
    return 'assets/shared/placeholder.jpg';
  }

  // Use the AssetPathService to convert legacy paths
  return assetPathService.convertLegacyPath(path);
}

/**
 * Extracts detailed information about an asset path
 *
 * This function analyzes a path string and extracts structured information
 * about the asset it represents, including asset type, book slug, filename, etc.
 *
 * @param path The path to analyze
 * @returns Structured asset path information
 *
 * @example
 * extractAssetInfo('/assets/hamlet/audio/chapter-01.mp3')
 * // {
 * //   originalPath: '/assets/hamlet/audio/chapter-01.mp3',
 * //   normalizedPath: 'assets/audio/hamlet/chapter-01.mp3',
 * //   assetType: 'audio',
 * //   bookSlug: 'hamlet',
 * //   filename: 'chapter-01.mp3',
 * //   isLegacyFormat: true,
 * //   chapterNumber: '01',
 * //   metadata: { assetCategory: 'chapter' }
 * // }
 */
export function extractAssetInfo(path: string): AssetPathInfo {
  // Normalize the path
  const normalizedPath = normalizePath(path);

  // Default metadata
  const metadata: Record<string, unknown> = {};

  // Extract components from normalized path
  const normalizedMatch = normalizedPath.match(/^assets\/([^/]+)\/(?:([^/]+)\/)?(.+)$/);

  if (!normalizedMatch) {
    // Fallback for unrecognized paths
    moduleLogger.warn({
      msg: 'Unrecognized path format',
      path,
      normalizedPath,
    });

    return {
      originalPath: path,
      normalizedPath,
      assetType: 'unknown',
      bookSlug: null,
      filename: path.split('/').pop() || '',
      isLegacyFormat: isLegacyPath(path),
      metadata,
    };
  }

  const [, assetType, bookOrCategory, filename] = normalizedMatch;

  // Initialize result
  const result: AssetPathInfo = {
    originalPath: path,
    normalizedPath,
    assetType: assetType as AssetType | 'shared' | 'site' | 'unknown',
    bookSlug: null,
    filename,
    isLegacyFormat: isLegacyPath(path),
    metadata,
  };

  // Handle shared and site assets
  if (assetType === 'shared' || assetType === 'site') {
    result.bookSlug = null;
    result.filename = bookOrCategory ? `${bookOrCategory}/${filename}` : filename;
    metadata.assetCategory = assetType;
    return result;
  }

  // For book-specific assets
  result.bookSlug = bookOrCategory;

  // Extract chapter number if applicable
  const chapterMatch = filename.match(/(?:brainrot-)?(?:chapter|act)-(\d+)\./);
  if (chapterMatch) {
    result.chapterNumber = chapterMatch[1];
    metadata.assetCategory = filename.startsWith('brainrot-') ? 'brainrot' : 'chapter';
  } else if (filename === 'cover.jpg') {
    metadata.assetCategory = 'cover';
  } else if (filename === 'full-audiobook.mp3') {
    metadata.assetCategory = 'full-audio';
  } else if (filename === 'fulltext.txt' || filename === 'brainrot-fulltext.txt') {
    metadata.assetCategory = filename.startsWith('brainrot-') ? 'brainrot' : 'fulltext';
  }

  return result;
}

/**
 * Generates a standardized blob path for storing assets
 *
 * @param bookSlug The book slug (or null for shared/site assets)
 * @param assetType The type of asset
 * @param filename The filename
 * @returns The standardized blob path
 *
 * @example
 * generateBlobPath('hamlet', 'audio', 'chapter-01.mp3') // 'assets/audio/hamlet/chapter-01.mp3'
 * generateBlobPath(null, 'shared', 'placeholder.jpg') // 'assets/shared/placeholder.jpg'
 */
export function generateBlobPath(
  bookSlug: string | null,
  assetType: AssetType | 'shared' | 'site',
  filename: string,
): string {
  return assetPathService.getAssetPath(assetType, bookSlug, filename);
}

/**
 * Generates a URL for an asset with configurable options
 *
 * @param path The asset path (can be legacy or standardized)
 * @param options URL generation options
 * @returns The full URL to the asset
 *
 * @example
 * generateAssetUrl('assets/audio/hamlet/chapter-01.mp3')
 * // 'https://example.blob.vercel-storage.com/assets/audio/hamlet/chapter-01.mp3'
 *
 * generateAssetUrl('/assets/hamlet/audio/chapter-01.mp3', { baseUrl: 'https://custom.example.com' })
 * // 'https://custom.example.com/assets/audio/hamlet/chapter-01.mp3'
 */
export function generateAssetUrl(path: string, options: UrlGenerationOptions = {}): string {
  // Normalize path first
  const normalizedPath = normalizePath(path);

  // Determine base URL
  const baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_BLOB_BASE_URL || '';

  // Generate full URL
  let url = `${baseUrl}/${normalizedPath}`;

  // Add cache-busting if requested
  if (options.noCache) {
    const timestamp = Date.now();
    url += `?t=${timestamp}`;
  }

  return url;
}

/**
 * Gets the appropriate file extension for a given asset type
 *
 * @param assetType The type of asset
 * @param subType Optional sub-type for more specific extension mapping
 * @returns The file extension (without the dot)
 *
 * @example
 * getFileExtension('audio') // 'mp3'
 * getFileExtension('image', 'cover') // 'jpg'
 */
export function getFileExtension(assetType: AssetType, subType?: string): string {
  switch (assetType) {
    case AssetType.AUDIO:
      return 'mp3';
    case AssetType.TEXT:
      return 'txt';
    case AssetType.IMAGE:
      // Different image types based on sub-type
      if (subType === 'cover' || subType === 'thumbnail') {
        return 'jpg';
      }
      return 'png';
    default:
      moduleLogger.warn({
        msg: 'Unknown asset type for extension',
        assetType,
        subType,
      });
      return 'bin';
  }
}

/**
 * Generates a standardized filename for an asset
 *
 * @param assetType The type of asset
 * @param identifier Chapter number, 'full', 'cover', etc.
 * @param options Optional configuration for filename generation
 * @returns The standardized filename
 *
 * @example
 * generateFilename('audio', 1) // 'chapter-01.mp3'
 * generateFilename('text', 'full', { prefix: 'brainrot' }) // 'brainrot-fulltext.txt'
 * generateFilename('image', 'cover') // 'cover.jpg'
 */
export function generateFilename(
  assetType: AssetType,
  identifier: string | number,
  options: FilenameOptions = {},
): string {
  const { prefix, extension } = options;

  // Handle special cases first
  if (identifier === 'cover' && assetType === AssetType.IMAGE) {
    return `cover.${extension || getFileExtension(assetType, 'cover')}`;
  }

  if (identifier === 'full' || identifier === 'fulltext') {
    if (assetType === AssetType.AUDIO) {
      return `full-audiobook.${extension || getFileExtension(assetType)}`;
    }

    const prefixPart = prefix ? `${prefix}-` : '';
    return `${prefixPart}fulltext.${extension || getFileExtension(assetType)}`;
  }

  // Format chapter number (if numeric)
  let formattedIdentifier = identifier;
  if (typeof identifier === 'number' || /^\d+$/.test(String(identifier))) {
    formattedIdentifier = assetNameValidator.formatChapterNumber(identifier);
  }

  // Construct the filename
  const prefixPart = prefix ? `${prefix}-` : '';
  const ext = extension || getFileExtension(assetType);

  return `${prefixPart}chapter-${formattedIdentifier}.${ext}`;
}
