# Vercel Blob Storage Path Structure

This document outlines the path structure for assets stored in Vercel Blob, maintaining compatibility with the current organization in the `public/assets` directory.

## Current Structure Analysis

The current asset organization follows this pattern:

```
public/assets/
├── [book-slug]/
│   ├── images/
│   │   └── [book-slug]-XX.png
│   └── text/
│       ├── brainrot/
│       │   ├── [chapter].txt
│       │   └── fulltext.txt
│       └── source/
│           ├── [book-slug]-source.txt
│           └── [book-slug]-source-processed.txt
└── images/
    └── [miscellaneous-images].png
```

Key observations:
1. Book assets are organized by book slug
2. Each book has its own images directory
3. Text files are split into "brainrot" (final content) and "source" versions
4. There's a shared "images" directory for miscellaneous images
5. Audio files follow a separate pattern and are stored in DO Spaces

## Blob Storage Path Structure

We will map the current structure to Vercel Blob as follows:

```
blob:/
├── books/
│   └── [book-slug]/
│       ├── images/
│       │   └── [book-slug]-XX.png
│       ├── text/
│       │   ├── brainrot/
│       │   │   ├── [chapter].txt
│       │   │   └── fulltext.txt
│       │   └── source/
│       │       ├── [book-slug]-source.txt
│       │       └── [book-slug]-source-processed.txt
│       └── audio/  # Future migration from DO Spaces
│           ├── [chapter].mp3
│           └── full-audiobook.mp3
├── images/
│   └── [miscellaneous-images].png
└── site-assets/
    └── [ui-elements].svg
```

## Path Generation Rules

1. **Book Assets**: `books/[book-slug]/[type]/[filename]`
   - Images: `books/hamlet/images/hamlet-01.png`
   - Brainrot Text: `books/hamlet/text/brainrot/act-i.txt`
   - Source Text: `books/hamlet/text/source/hamlet-source.txt`
   - Audio: `books/hamlet/audio/act-i.mp3` (future)

2. **Shared Assets**: `images/[filename]`
   - General images: `images/inferno-01.png`

3. **UI Assets**: `site-assets/[filename]`
   - UI elements: `site-assets/logo.svg`

## Path Generation Utilities

To standardize path generation and prevent errors, implement these utility functions:

```typescript
// In utils/services/BlobPathService.ts

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
}

// Export a singleton instance
export const blobPathService = new BlobPathService();
```

## Migration Considerations

When migrating assets to the new Blob structure:

1. **Path Mapping**: Create a mapping function that converts current paths to Blob paths:
   - `/assets/hamlet/images/hamlet-01.png` → `books/hamlet/images/hamlet-01.png`
   - `/assets/hamlet/text/brainrot/act-i.txt` → `books/hamlet/text/brainrot/act-i.txt`

2. **URL Generation**: Update the `translations/index.ts` file to use `blobService.getUrlForPath()` with the path service:
   ```typescript
   import { blobService } from '@/utils/services';
   import { blobPathService } from '@/utils/services';

   export const translations = [
     {
       // ...
       coverImage: blobService.getUrlForPath(
         blobPathService.getBookImagePath('hamlet', 'hamlet-07.png')
       ),
       text: blobService.getUrlForPath(
         blobPathService.getBrainrotTextPath('hamlet', 'act-i')
       ),
     }
   ];
   ```

3. **Access Control**: All assets will be uploaded with `access: 'public'` to maintain the current behavior.

4. **Caching**: Set appropriate caching headers:
   - Images: `max-age=31536000, immutable` (1 year)
   - Text files: `max-age=3600` (1 hour)
   - UI assets: `max-age=86400` (1 day)

## Implementation Steps

1. Create the BlobPathService utility class
2. Update BlobService to support the new path structure 
3. Create migration scripts for each asset type
4. Update the application code to use the new Blob URLs

The migration should be done incrementally by asset type:
1. Book cover images
2. Book chapter images
3. Brainrot text files
4. Source text files
5. Audio files (if/when migrating from DO Spaces)