/**
 * BlobPathService
 *
 * Utility service for generating consistent Blob storage paths
 * Ensures that all code uses the same path structure when interacting with Blob storage
 */

export class BlobPathService {
  /**
   * Generate a path for book images
   */
  public getBookImagePath(bookSlug: string, filename: string): string {
    return `books/${bookSlug}/images/${filename}`;
  }

  /**
   * Generate a path for brainrot text
   */
  public getBrainrotTextPath(bookSlug: string, chapter: string): string {
    return `books/${bookSlug}/text/brainrot/${chapter}.txt`;
  }

  /**
   * Generate a path for fulltext brainrot
   */
  public getFulltextPath(bookSlug: string): string {
    return `books/${bookSlug}/text/brainrot/fulltext.txt`;
  }

  /**
   * Generate a path for source text
   */
  public getSourceTextPath(bookSlug: string, filename: string): string {
    return `books/${bookSlug}/text/source/${filename}`;
  }

  /**
   * Generate a path for shared images
   */
  public getSharedImagePath(filename: string): string {
    return `images/${filename}`;
  }

  /**
   * Generate a path for UI assets
   */
  public getSiteAssetPath(filename: string): string {
    return `site-assets/${filename}`;
  }

  /**
   * Generate a path for audio files (future migration)
   */
  public getAudioPath(bookSlug: string, chapter: string): string {
    return `books/${bookSlug}/audio/${chapter}.mp3`;
  }

  /**
   * Convert a legacy asset path to a blob path
   * Example: /assets/hamlet/images/hamlet-01.png → books/hamlet/images/hamlet-01.png
   */
  public convertLegacyPath(legacyPath: string): string {
    // Handle shared images case
    if (legacyPath.match(/^\/assets\/images\//)) {
      return legacyPath.replace(/^\/assets\/images\//, 'images/');
    }

    // Handle book assets
    const bookMatch = legacyPath.match(/^\/assets\/([^/]+)\/([^/]+)\/(.+)$/);
    if (bookMatch) {
      const [, bookSlug, assetType, remainder] = bookMatch;
      return `books/${bookSlug}/${assetType}/${remainder}`;
    }

    // Handle audio files (which don't have "assets" in the path)
    const audioMatch = legacyPath.match(/^\/([^/]+)\/audio\/(.+)$/);
    if (audioMatch) {
      const [, bookSlug, filename] = audioMatch;
      return `books/${bookSlug}/audio/${filename}`;
    }

    // If no pattern matches, return the path unchanged
    return legacyPath.replace(/^\//, '');
  }

  /**
   * Get the book slug from a path
   */
  public getBookSlugFromPath(path: string): string | null {
    // For blob paths
    const blobMatch = path.match(/^books\/([^/]+)\//);
    if (blobMatch) {
      return blobMatch[1];
    }

    // For legacy paths
    const legacyMatch = path.match(/^\/assets\/([^/]+)\//);
    if (legacyMatch) {
      return legacyMatch[1];
    }

    // For legacy audio paths
    const audioMatch = path.match(/^\/([^/]+)\/audio\//);
    if (audioMatch) {
      return audioMatch[1];
    }

    return null;
  }
}

// Export a singleton instance
export const blobPathService = new BlobPathService();
