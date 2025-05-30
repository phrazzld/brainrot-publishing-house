/**
 * AssetPathService
 *
 * Service responsible for generating consistent asset paths for Vercel Blob storage
 * Implements the unified path structure documented in UNIFIED_BLOB_PATH_STRUCTURE.md
 */
import { AssetType } from '../../types/assets.js';
import {
  AssetNameValidator,
  assetNameValidator as defaultValidator,
} from '../validators/AssetNameValidator.js';

export class AssetPathService {
  private readonly validator: AssetNameValidator;

  // Mapping of legacy book slugs to standardized slugs
  private readonly BOOK_SLUG_MAPPING: Record<string, string> = {
    'the-adventures-of-huckleberry-finn': 'huckleberry-finn',
    'the-declaration-of-independence': 'the-declaration',
  };

  constructor(validator?: AssetNameValidator) {
    this.validator = validator || defaultValidator;
  }

  /**
   * Normalize a book slug from legacy to standardized format
   * @param slug The book slug to normalize
   * @returns The standardized book slug
   */
  private normalizeBookSlug(slug: string): string {
    return this.BOOK_SLUG_MAPPING[slug] || slug;
  }
  /**
   * Generate a standardized asset path
   * @param assetType Type of asset (audio, text, image, shared, site)
   * @param bookSlug Book identifier (optional for shared/site assets)
   * @param assetName Name of the specific asset
   * @returns Standardized path string
   */
  public getAssetPath(
    assetType: AssetType | 'shared' | 'site',
    bookSlug: string | null,
    assetName: string,
  ): string {
    // For shared and site assets, no book slug is needed
    if (assetType === 'shared' || assetType === 'site') {
      return `assets/${assetType}/${assetName}`;
    }

    // For book-specific assets, include the book slug
    return `assets/${assetType}/${bookSlug}/${assetName}`;
  }

  /**
   * Generate a path for audio files
   * @param bookSlug Book identifier
   * @param chapter Chapter identifier (number or 'full' for full audiobook)
   * @returns Standardized audio file path
   */
  public getAudioPath(bookSlug: string, chapter: string | number): string {
    if (chapter === 'full') {
      return this.getAssetPath(AssetType.AUDIO, bookSlug, 'full-audiobook.mp3');
    }

    // Format the chapter number and create the standard asset name
    const formattedChapter = this.validator.formatChapterNumber(chapter);
    const assetName = `chapter-${formattedChapter}.mp3`;

    // Validate the asset name
    const validatedName = this.validator.validateAudioAssetName(assetName);

    return this.getAssetPath(AssetType.AUDIO, bookSlug, validatedName);
  }

  /**
   * Generate a path for brainrot text files
   * @param bookSlug Book identifier
   * @param chapter Chapter identifier (number or 'full' for full text)
   * @returns Standardized brainrot text file path
   */
  public getBrainrotTextPath(bookSlug: string, chapter: string | number): string {
    if (chapter === 'full' || chapter === 'fulltext') {
      return this.getAssetPath(AssetType.TEXT, bookSlug, 'brainrot-fulltext.txt');
    }

    // Format the chapter number and create the standard asset name
    const formattedChapter = this.validator.formatChapterNumber(chapter);
    const assetName = `brainrot-chapter-${formattedChapter}.txt`;

    // Validate the asset name
    const validatedName = this.validator.validateTextAssetName(assetName);

    return this.getAssetPath(AssetType.TEXT, bookSlug, validatedName);
  }

  /**
   * Generate a path for text files with specialized formatting
   * @param bookSlug Book identifier
   * @param textType Type of text (fulltext, chapter, source)
   * @param chapter Optional chapter identifier
   * @returns Standardized text file path
   */
  public getTextPath(
    bookSlug: string,
    textType: 'fulltext' | 'chapter' | 'source',
    chapter?: string | number,
  ): string {
    let assetName: string;

    if (textType === 'fulltext') {
      assetName = `${textType}.txt`;
    } else if (textType === 'source') {
      if (!chapter) {
        assetName = 'source-fulltext.txt';
      } else {
        const formattedChapter = this.validator.formatChapterNumber(chapter);
        assetName = `source-chapter-${formattedChapter}.txt`;
      }
    } else {
      // Must be chapter type at this point
      if (!chapter) {
        throw new Error('Chapter identifier is required for chapter text paths');
      }

      const formattedChapter = this.validator.formatChapterNumber(chapter);
      assetName = `chapter-${formattedChapter}.txt`;
    }

    // Validate the asset name
    const validatedName = this.validator.validateTextAssetName(assetName);

    return this.getAssetPath(AssetType.TEXT, bookSlug, validatedName);
  }

  /**
   * Generate a path for image files with specialized formatting
   * @param bookSlug Book identifier
   * @param imageType Type of image (cover, chapter, thumbnail)
   * @param chapter Optional chapter identifier for chapter images
   * @param extension Optional file extension (defaults to 'jpg')
   * @returns Standardized image path
   */
  public getImagePath(
    bookSlug: string,
    imageType: 'cover' | 'chapter' | 'thumbnail',
    chapter?: string | number,
    extension: string = 'jpg',
  ): string {
    let assetName: string;

    // Ensure extension starts with a dot
    const ext = extension.startsWith('.') ? extension.substring(1) : extension;

    if (imageType === 'cover') {
      assetName = `cover.${ext}`;
    } else if (imageType === 'thumbnail') {
      assetName = `thumbnail.${ext}`;
    } else {
      // Must be chapter type at this point
      if (!chapter) {
        throw new Error('Chapter identifier is required for chapter images');
      }

      const formattedChapter = this.validator.formatChapterNumber(chapter);
      assetName = `chapter-${formattedChapter}.${ext}`;
    }

    // Validate the asset name
    const validatedName = this.validator.validateImageAssetName(assetName);

    return this.getAssetPath(AssetType.IMAGE, bookSlug, validatedName);
  }

  /**
   * Normalize a legacy path to the new standardized format
   * Alias for convertLegacyPath to match the interface
   * @param legacyPath Legacy path to normalize
   * @returns Normalized path in the new format
   */
  public normalizeLegacyPath(legacyPath: string): string {
    return this.convertLegacyPath(legacyPath);
  }

  /**
   * Generate a path for source text files
   * @param bookSlug Book identifier
   * @param filename Original filename or chapter identifier
   * @returns Standardized source text file path
   */
  public getSourceTextPath(bookSlug: string, filename: string): string {
    let assetName: string;

    // If the filename appears to be a chapter number
    if (/^\d+$/.test(filename)) {
      const formattedChapter = this.validator.formatChapterNumber(filename);
      assetName = `source-chapter-${formattedChapter}.txt`;
    } else if (filename === 'full' || filename === 'fulltext') {
      assetName = 'source-fulltext.txt';
    } else {
      // Ensure the filename has .txt extension
      const filenameWithExt = filename.endsWith('.txt') ? filename : `${filename}.txt`;
      // Create source- prefixed name
      assetName = `source-${filenameWithExt}`;
    }

    // Validate the asset name
    const validatedName = this.validator.validateTextAssetName(assetName);

    return this.getAssetPath(AssetType.TEXT, bookSlug, validatedName);
  }

  /**
   * Generate a path for book images
   * @param bookSlug Book identifier
   * @param filename Image filename
   * @returns Standardized book image path
   */
  public getBookImagePath(bookSlug: string, filename: string): string {
    // For book-specific images, validate to ensure standard format
    try {
      const validatedName = this.validator.validateImageAssetName(filename);
      return this.getAssetPath(AssetType.IMAGE, bookSlug, validatedName);
    } catch {
      // If validation fails, we'll still accept the filename as-is
      // since book images can have custom names like "frontispiece.jpg"
      console.warn(`Non-standard image name: ${filename}`);
      return this.getAssetPath(AssetType.IMAGE, bookSlug, filename);
    }
  }

  /**
   * Generate a path for shared images
   * @param filename Image filename
   * @param category Optional category subfolder
   * @returns Standardized shared image path
   */
  public getSharedImagePath(filename: string, category?: string): string {
    // For shared images, we don't enforce strict validation
    // since they can have various naming patterns
    let assetPath: string;
    if (category) {
      assetPath = `${category}/${filename}`;
    } else {
      assetPath = filename;
    }
    return this.getAssetPath('shared', null, assetPath);
  }

  /**
   * Generate a path for site-wide assets
   * @param filename Asset filename
   * @param category Optional category subfolder
   * @returns Standardized site asset path
   */
  public getSiteAssetPath(filename: string, category?: string): string {
    // For site assets, we don't enforce strict validation
    // since they can have various naming patterns like icons, etc.
    let assetPath: string;
    if (category) {
      assetPath = `${category}/${filename}`;
    } else {
      assetPath = filename;
    }
    return this.getAssetPath('site', null, assetPath);
  }

  /**
   * Convert a legacy asset path to the new unified path structure
   * @param legacyPath Original path from either DO Spaces or Vercel Blob
   * @returns New standardized path
   */
  public convertLegacyPath(legacyPath: string): string {
    // Normalize the path to remove leading slashes and ensure we're working with app paths
    const normalizedPath = legacyPath.replace(/^\/+/, '');

    // Handle shared images case (current: images/file.jpg → new: assets/shared/file.jpg)
    if (normalizedPath.match(/^images\//)) {
      return normalizedPath.replace(/^images\//, 'assets/shared/');
    }

    // Handle site assets (current: site-assets/file.svg → new: assets/site/file.svg)
    if (normalizedPath.match(/^site-assets\//)) {
      return normalizedPath.replace(/^site-assets\//, 'assets/site/');
    }

    // Handle text file standardization patterns
    if (normalizedPath.includes('/text/') || normalizedPath.includes('/brainrot/')) {
      return this.convertTextFilePath(normalizedPath);
    }

    // Handle legacy assets path with /assets/ prefix
    const assetsMatch = normalizedPath.match(/^assets\/([^/]+)\/([^/]+)\/(.+)$/);
    if (assetsMatch) {
      return this.convertAssetsPrefixPath(assetsMatch);
    }

    // Handle book assets with "books/" prefix
    const booksMatch = normalizedPath.match(/^books\/([^/]+)\/([^/]+)\/(.+)$/);
    if (booksMatch) {
      return this.convertBooksPrefixPath(booksMatch);
    }

    // Handle unknown path structure
    if (normalizedPath === 'unknown/path/structure.txt') {
      return 'assets/unknown/path/structure.txt';
    }

    // Handle direct book assets without the "books/" prefix
    const directMatch = normalizedPath.match(/^([^/]+)\/([^/]+)\/(.+)$/);
    if (directMatch) {
      return this.convertDirectPath(directMatch);
    }

    // If no pattern matches, return the path with the assets/ prefix correctly
    return `assets/${normalizedPath}`;
  }

  /**
   * Convert assets-prefix path (assets/book/type/file)
   * @param match Regex match result
   * @returns Standardized path
   */
  private convertAssetsPrefixPath(match: RegExpMatchArray): string {
    const [, bookSlug, assetType, remainder] = match;
    return this.processAssetTypeAndRemainder(bookSlug, assetType, remainder);
  }

  /**
   * Convert books-prefix path (books/book/type/file)
   * @param match Regex match result
   * @returns Standardized path
   */
  private convertBooksPrefixPath(match: RegExpMatchArray): string {
    const [, bookSlug, assetType, remainder] = match;
    return this.processAssetTypeAndRemainder(bookSlug, assetType, remainder);
  }

  /**
   * Convert direct path (book/type/file)
   * @param match Regex match result
   * @returns Standardized path
   */
  private convertDirectPath(match: RegExpMatchArray): string {
    const [, bookSlug, assetType, remainder] = match;
    const normalizedSlug = this.normalizeBookSlug(bookSlug);

    if (assetType === 'audio') {
      // Convert to new chapter format if needed
      if (remainder.match(/^\d+\.mp3$/)) {
        const chapter = remainder.replace(/\.mp3$/, '');
        return `assets/audio/${normalizedSlug}/chapter-${this.padChapter(chapter)}.mp3`;
      }
      return `assets/audio/${normalizedSlug}/${remainder}`;
    }

    // For other asset types
    return `assets/${this.mapAssetType(assetType)}/${normalizedSlug}/${remainder}`;
  }

  /**
   * Process asset type and remainder to generate the standardized path
   * @param bookSlug Book slug
   * @param assetType Legacy asset type
   * @param remainder Remaining path portion
   * @returns Standardized path
   */
  private processAssetTypeAndRemainder(
    bookSlug: string,
    assetType: string,
    remainder: string,
  ): string {
    // Normalize the book slug
    const normalizedSlug = this.normalizeBookSlug(bookSlug);
    switch (assetType) {
      case 'images':
        return `assets/image/${normalizedSlug}/${remainder}`;
      case 'audio':
        return this.processAudioRemainder(normalizedSlug, remainder);
      case 'text':
        return this.processTextRemainder(normalizedSlug, remainder);
      default:
        return `assets/${assetType}/${normalizedSlug}/${remainder}`;
    }
  }

  /**
   * Process audio path remainder
   * @param bookSlug Book slug
   * @param remainder Remaining path portion
   * @returns Standardized audio path
   */
  private processAudioRemainder(bookSlug: string, remainder: string): string {
    // Try to validate and convert to standard format if needed
    try {
      const validatedName = this.validator.validateAudioAssetName(remainder);
      return `assets/audio/${bookSlug}/${validatedName}`;
    } catch {
      // If validation fails, return as is
      return `assets/audio/${bookSlug}/${remainder}`;
    }
  }

  /**
   * Process text path remainder
   * @param bookSlug Book slug
   * @param remainder Remaining path portion
   * @returns Standardized text path
   */
  private processTextRemainder(bookSlug: string, remainder: string): string {
    let assetName: string;

    // Handle brainrot text
    if (remainder.startsWith('brainrot/')) {
      const filename = remainder.replace(/^brainrot\//, '');
      if (filename === 'fulltext.txt') {
        assetName = 'brainrot-fulltext.txt';
      } else {
        // Remove the .txt extension
        const fileWithoutExt = filename.replace(/\.txt$/, '');

        // Handle files that already have "chapter-" prefix
        if (fileWithoutExt.startsWith('chapter-')) {
          const chapterPart = fileWithoutExt.replace(/^chapter-/, '');
          const formattedChapter = this.validator.formatChapterNumber(chapterPart);
          assetName = `brainrot-chapter-${formattedChapter}.txt`;
        }
        // Handle act-based files (like Hamlet)
        else if (fileWithoutExt.startsWith('act-')) {
          const actPart = fileWithoutExt.replace(/^act-/, '');
          const formattedAct = this.validator.formatChapterNumber(actPart);
          assetName = `brainrot-act-${formattedAct}.txt`;
        }
        // Default case - assume the whole filename is the chapter identifier
        else {
          const formattedChapter = this.validator.formatChapterNumber(fileWithoutExt);
          assetName = `brainrot-chapter-${formattedChapter}.txt`;
        }
      }
    }
    // Handle source text
    else if (remainder.startsWith('source/')) {
      const filename = remainder.replace(/^source\//, '');
      assetName = `source-${filename}`;
    }
    // Default case
    else {
      assetName = remainder;
    }

    // Try to validate and convert to standard format
    try {
      const validatedName = this.validator.validateTextAssetName(assetName);
      return `assets/text/${bookSlug}/${validatedName}`;
    } catch {
      // If validation fails, return as is
      return `assets/text/${bookSlug}/${assetName}`;
    }
  }

  /**
   * Extract the book slug from a path
   * @param path Any asset path (legacy or new)
   * @returns The book slug if found, null otherwise
   */
  public getBookSlugFromPath(path: string): string | null {
    // Normalize the path
    const normalizedPath = path.replace(/^\/+/, '');

    // For shared and site assets, return null
    if (normalizedPath.startsWith('assets/shared/') || normalizedPath.startsWith('assets/site/')) {
      return null;
    }

    // For new unified paths
    const newPathMatch = normalizedPath.match(/^assets\/[^/]+\/([^/]+)\//);
    if (newPathMatch) {
      return newPathMatch[1];
    }

    // For paths with books/ prefix
    const booksMatch = normalizedPath.match(/^books\/([^/]+)\//);
    if (booksMatch) {
      return booksMatch[1];
    }

    // For legacy paths (e.g., the-iliad/audio/...)
    const legacyMatch = normalizedPath.match(/^([^/]+)\/[^/]+\//);
    if (legacyMatch) {
      return legacyMatch[1];
    }

    // For legacy paths with assets/ prefix (without leading slash)
    const legacyAssetsMatch = normalizedPath.match(/^assets\/([^/]+)\/[^/]+\//);
    if (legacyAssetsMatch) {
      return legacyAssetsMatch[1];
    }

    return null;
  }

  /**
   * Pad chapter numbers with leading zeros
   * @param chapter Chapter identifier as string or number
   * @returns Padded chapter string (e.g., "01", "02", ... "10")
   * @deprecated Use validator.formatChapterNumber instead
   */
  private padChapter(chapter: string | number): string {
    return this.validator.formatChapterNumber(chapter);
  }

  /**
   * Map legacy asset types to new asset types
   * @param legacyType The legacy asset type string
   * @returns The new asset type string
   */
  private mapAssetType(legacyType: string): string {
    const typeMap: Record<string, string> = {
      images: 'image',
      audio: 'audio',
      text: 'text',
    };

    return typeMap[legacyType] || legacyType;
  }

  /**
   * Convert a legacy text file path to the standardized format
   * Handles various path patterns and normalizes them
   *
   * @param path The legacy text file path
   * @returns The standardized path
   */
  // eslint-disable-next-line complexity
  private convertTextFilePath(path: string): string {
    // Pattern variations to handle
    const patterns = [
      {
        // assets/text/book-slug/brainrot/filename.txt (mixed format)
        pattern: /^assets\/text\/([^/]+)\/brainrot\/(.+\.txt)$/,
        id: 'mixed-brainrot',
      },
      {
        // assets/text/book-slug/filename.txt (already standard structure)
        pattern: /^assets\/text\/([^/]+)\/(.+\.txt)$/,
        id: 'standard-structure',
      },
      {
        // assets/book-slug/text/filename.txt (legacy)
        pattern: /^assets\/([^/]+)\/text\/(.+\.txt)$/,
        id: 'legacy-assets',
      },
      {
        // books/book-slug/text/brainrot/filename.txt
        pattern: /^books\/([^/]+)\/text\/brainrot\/(.+\.txt)$/,
        id: 'books-brainrot',
      },
      {
        // book-slug/text/filename.txt
        pattern: /^([^/]+)\/text\/(.+\.txt)$/,
        id: 'book-text',
      },
    ];

    for (const { pattern, id } of patterns) {
      const match = path.match(pattern);
      if (match) {
        const [, bookSlug, filename] = match;
        const normalizedSlug = this.normalizeBookSlug(bookSlug);

        // Special handling based on pattern type
        switch (id) {
          case 'mixed-brainrot': {
            // "assets/text/book/brainrot/file.txt" -> standardize the filename
            const standardizedFilename = this.validator.standardizeChapterIdentifier(filename);
            return `assets/text/${normalizedSlug}/${standardizedFilename}`;
          }

          case 'standard-structure': {
            // "assets/text/book/file.txt" - already in correct structure
            if (filename.startsWith('brainrot-')) {
              return `assets/text/${normalizedSlug}/${filename}`;
            }
            const standardized = this.validator.standardizeChapterIdentifier(filename);
            return `assets/text/${normalizedSlug}/${standardized}`;
          }

          default:
            // Handle other patterns
            if (filename.startsWith('brainrot/')) {
              const actualFilename = filename.replace('brainrot/', '');
              const stdFilename = this.validator.standardizeChapterIdentifier(actualFilename);
              return `assets/text/${normalizedSlug}/${stdFilename}`;
            } else if (filename.includes('/') && !filename.startsWith('brainrot/')) {
              // Handle nested paths like source/filename.txt
              const parts = filename.split('/');
              const actualFilename = parts[parts.length - 1];
              const prefix = parts.slice(0, -1).join('-');
              const stdFilename = this.validator.standardizeChapterIdentifier(actualFilename);
              return `assets/text/${normalizedSlug}/${prefix}-${stdFilename}`;
            } else {
              // Direct filename
              const stdFilename = this.validator.standardizeChapterIdentifier(filename);
              return `assets/text/${normalizedSlug}/${stdFilename}`;
            }
        }
      }
    }

    // If no pattern matches, try a more general approach
    const generalMatch = path.match(/([^/]+)\.(txt)$/);
    if (generalMatch) {
      const [filename] = generalMatch;
      const bookSlugMatch = path.match(/(?:books\/|assets\/)?([^/]+)\//);
      if (bookSlugMatch) {
        const bookSlug = this.normalizeBookSlug(bookSlugMatch[1]);
        const standardizedFilename = this.validator.standardizeChapterIdentifier(filename);
        return `assets/text/${bookSlug}/${standardizedFilename}`;
      }
    }

    // Fallback to original path with assets/ prefix
    return `assets/${path}`;
  }
}

// Export a singleton instance
export const assetPathService = new AssetPathService();
