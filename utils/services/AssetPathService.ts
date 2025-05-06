/**
 * AssetPathService
 *
 * Service responsible for generating consistent asset paths for Vercel Blob storage
 * Implements the unified path structure documented in UNIFIED_BLOB_PATH_STRUCTURE.md
 */
import { AssetType } from '../../types/assets';

export class AssetPathService {
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
    assetName: string
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
    return this.getAssetPath(AssetType.AUDIO, bookSlug, `chapter-${this.padChapter(chapter)}.mp3`);
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
    return this.getAssetPath(
      AssetType.TEXT,
      bookSlug,
      `brainrot-chapter-${this.padChapter(chapter)}.txt`
    );
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
    chapter?: string | number
  ): string {
    if (textType === 'fulltext') {
      return this.getAssetPath(AssetType.TEXT, bookSlug, `${textType}.txt`);
    }

    if (textType === 'source') {
      if (!chapter) {
        return this.getAssetPath(AssetType.TEXT, bookSlug, 'source-fulltext.txt');
      }
      return this.getAssetPath(
        AssetType.TEXT,
        bookSlug,
        `source-chapter-${this.padChapter(chapter)}.txt`
      );
    }

    // Must be chapter type at this point
    if (!chapter) {
      throw new Error('Chapter identifier is required for chapter text paths');
    }

    return this.getAssetPath(AssetType.TEXT, bookSlug, `chapter-${this.padChapter(chapter)}.txt`);
  }

  /**
   * Generate a path for image files with specialized formatting
   * @param bookSlug Book identifier
   * @param imageType Type of image (cover, chapter, thumbnail)
   * @param chapter Optional chapter identifier for chapter images
   * @returns Standardized image path
   */
  public getImagePath(
    bookSlug: string,
    imageType: 'cover' | 'chapter' | 'thumbnail',
    chapter?: string | number
  ): string {
    if (imageType === 'cover') {
      return this.getAssetPath(AssetType.IMAGE, bookSlug, 'cover.jpg');
    }

    if (imageType === 'thumbnail') {
      return this.getAssetPath(AssetType.IMAGE, bookSlug, 'thumbnail.jpg');
    }

    // Must be chapter type at this point
    if (!chapter) {
      throw new Error('Chapter identifier is required for chapter images');
    }

    return this.getAssetPath(AssetType.IMAGE, bookSlug, `chapter-${this.padChapter(chapter)}.jpg`);
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
    // If the filename appears to be a chapter number
    if (/^\d+$/.test(filename)) {
      return this.getAssetPath(
        AssetType.TEXT,
        bookSlug,
        `source-chapter-${this.padChapter(filename)}.txt`
      );
    } else if (filename === 'full' || filename === 'fulltext') {
      return this.getAssetPath(AssetType.TEXT, bookSlug, 'source-fulltext.txt');
    }

    // Otherwise, preserve the original filename with a source- prefix
    return this.getAssetPath(AssetType.TEXT, bookSlug, `source-${filename}`);
  }

  /**
   * Generate a path for book images
   * @param bookSlug Book identifier
   * @param filename Image filename
   * @returns Standardized book image path
   */
  public getBookImagePath(bookSlug: string, filename: string): string {
    return this.getAssetPath(AssetType.IMAGE, bookSlug, filename);
  }

  /**
   * Generate a path for shared images
   * @param filename Image filename
   * @param category Optional category subfolder
   * @returns Standardized shared image path
   */
  public getSharedImagePath(filename: string, category?: string): string {
    if (category) {
      return this.getAssetPath('shared', null, `${category}/${filename}`);
    }
    return this.getAssetPath('shared', null, filename);
  }

  /**
   * Generate a path for site-wide assets
   * @param filename Asset filename
   * @param category Optional category subfolder
   * @returns Standardized site asset path
   */
  public getSiteAssetPath(filename: string, category?: string): string {
    if (category) {
      return this.getAssetPath('site', null, `${category}/${filename}`);
    }
    return this.getAssetPath('site', null, filename);
  }

  /**
   * Convert a legacy asset path to the new unified path structure
   * @param legacyPath Original path from either DO Spaces or Vercel Blob
   * @returns New standardized path
   */
  public convertLegacyPath(legacyPath: string): string {
    // Normalize the path to remove leading slashes
    const normalizedPath = legacyPath.replace(/^\/+/, '');

    // Handle shared images case (current: images/file.jpg → new: assets/shared/file.jpg)
    if (normalizedPath.match(/^images\//)) {
      return normalizedPath.replace(/^images\//, 'assets/shared/');
    }

    // Handle site assets (current: site-assets/file.svg → new: assets/site/file.svg)
    if (normalizedPath.match(/^site-assets\//)) {
      return normalizedPath.replace(/^site-assets\//, 'assets/site/');
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

    if (assetType === 'audio') {
      // Convert to new chapter format if needed
      if (remainder.match(/^\d+\.mp3$/)) {
        const chapter = remainder.replace(/\.mp3$/, '');
        return `assets/audio/${bookSlug}/chapter-${this.padChapter(chapter)}.mp3`;
      }
      return `assets/audio/${bookSlug}/${remainder}`;
    }

    // For other asset types
    return `assets/${this.mapAssetType(assetType)}/${bookSlug}/${remainder}`;
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
    remainder: string
  ): string {
    switch (assetType) {
      case 'images':
        return `assets/image/${bookSlug}/${remainder}`;
      case 'audio':
        return this.processAudioRemainder(bookSlug, remainder);
      case 'text':
        return this.processTextRemainder(bookSlug, remainder);
      default:
        return `assets/${assetType}/${bookSlug}/${remainder}`;
    }
  }

  /**
   * Process audio path remainder
   * @param bookSlug Book slug
   * @param remainder Remaining path portion
   * @returns Standardized audio path
   */
  private processAudioRemainder(bookSlug: string, remainder: string): string {
    // Convert to new chapter format if needed
    if (remainder.match(/^\d+\.mp3$/)) {
      const chapter = remainder.replace(/\.mp3$/, '');
      return `assets/audio/${bookSlug}/chapter-${this.padChapter(chapter)}.mp3`;
    }
    return `assets/audio/${bookSlug}/${remainder}`;
  }

  /**
   * Process text path remainder
   * @param bookSlug Book slug
   * @param remainder Remaining path portion
   * @returns Standardized text path
   */
  private processTextRemainder(bookSlug: string, remainder: string): string {
    // Handle brainrot text
    if (remainder.startsWith('brainrot/')) {
      const filename = remainder.replace(/^brainrot\//, '');
      if (filename === 'fulltext.txt') {
        return `assets/text/${bookSlug}/brainrot-fulltext.txt`;
      }
      const chapter = filename.replace(/\.txt$/, '');
      return `assets/text/${bookSlug}/brainrot-chapter-${this.padChapter(chapter)}.txt`;
    }

    // Handle source text
    if (remainder.startsWith('source/')) {
      const filename = remainder.replace(/^source\//, '');
      return `assets/text/${bookSlug}/source-${filename}`;
    }

    return `assets/text/${bookSlug}/${remainder}`;
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
   */
  private padChapter(chapter: string | number): string {
    if (typeof chapter === 'string' && !chapter.match(/^\d+$/)) {
      return chapter; // Return as-is if not a numeric string
    }

    const num = typeof chapter === 'string' ? parseInt(chapter, 10) : chapter;
    return num.toString().padStart(2, '0');
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
}

// Export a singleton instance
export const assetPathService = new AssetPathService();
