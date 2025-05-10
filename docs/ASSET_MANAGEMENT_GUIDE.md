# Asset Management Guide

This guide provides detailed instructions for working with assets in the Brainrot Publishing House application, including path conventions, service APIs, and common operations.

## 1. Overview

The Brainrot Publishing House application uses a unified asset management system built on Vercel Blob. Assets are organized according to a consistent path structure, and all asset operations are performed through a centralized Asset Service.

### 1.1 Key Components

- **AssetPathService**: Generates consistent, standardized paths for all asset types
- **VercelBlobAssetService**: Core implementation of the asset service using Vercel Blob
- **AssetServiceFactory**: Factory for creating instances of the asset service with proper dependencies

### 1.2 Asset Types

The application manages several types of assets:

- **Audio**: MP3 files for audiobooks (chapters and full books)
- **Text**: Text content (brainrot text, source text)
- **Images**: Book covers, chapter images, thumbnails
- **Shared**: Shared resources used across multiple books
- **Site**: Site-wide UI and design assets

## 2. Asset Path Structure

All assets follow a consistent path structure as defined in `UNIFIED_BLOB_PATH_STRUCTURE.md`.

### 2.1 Standard Path Format

The standard path format for assets is:

```
assets/[type]/[book-slug]/[asset-name]
```

For shared and site-wide assets, the format is:

```
assets/[shared|site]/[category]/[asset-name]
```

### 2.2 File Naming Conventions

#### Audio Files

- Chapter audio: `chapter-[padded-number].mp3` (e.g., `chapter-01.mp3`, `chapter-10.mp3`)
- Full audiobook: `full-audiobook.mp3`

#### Text Files

- Brainrot chapter text: `brainrot-chapter-[padded-number].txt`
- Source chapter text: `source-chapter-[padded-number].txt`
- Brainrot full text: `brainrot-fulltext.txt`
- Source full text: `source-fulltext.txt`

#### Image Files

- Cover images: `cover.jpg`
- Chapter images: `chapter-[padded-number].jpg`
- Thumbnails: `thumbnail.jpg`

### 2.3 Chapter Numbering

All chapter numbers are padded with leading zeros to ensure consistent sorting:

- Single-digit chapters: `01`, `02`, ..., `09`
- Double-digit chapters: `10`, `11`, ..., `99`

### 2.4 Examples

| Asset Type            | Example Path                                      |
| --------------------- | ------------------------------------------------- |
| Chapter Audio         | `assets/audio/hamlet/chapter-01.mp3`              |
| Full Audiobook        | `assets/audio/the-iliad/full-audiobook.mp3`       |
| Brainrot Chapter Text | `assets/text/the-odyssey/brainrot-chapter-03.txt` |
| Source Full Text      | `assets/text/hamlet/source-fulltext.txt`          |
| Cover Image           | `assets/image/hamlet/cover.jpg`                   |
| Shared Logo           | `assets/shared/logos/publisher-logo.png`          |
| Site Icon             | `assets/site/icons/download-icon.svg`             |

## 3. Adding New Assets

### 3.1 Prerequisites

- Vercel Blob configured (see `VERCEL_BLOB_CONFIG.md`)
- Required environment variables set (see `ENVIRONMENT_VARIABLES.md`)
- Asset content available (audio files, text files, images)

### 3.2 Using the Asset Service

To add a new asset, use the `uploadAsset` method of the Asset Service:

```typescript
import { AssetType } from '@/types/assets';
import { createAssetService } from '@/utils/services/AssetServiceFactory';

async function uploadBookCover(bookSlug: string, coverImage: File) {
  const assetService = createAssetService();

  const result = await assetService.uploadAsset({
    assetType: AssetType.IMAGE,
    bookSlug,
    assetName: 'cover.jpg',
    content: coverImage,
    options: {
      contentType: 'image/jpeg',
      metadata: {
        createdBy: 'asset-management-tool',
        description: `Cover image for ${bookSlug}`,
      },
    }
  });

  console.log(`Uploaded cover to ${result.url}`);
  return result.url;
}
```

### 3.3 Adding Different Asset Types

#### Adding Audio Files

```typescript
// Add a chapter audio file
async function uploadChapterAudio(bookSlug: string, chapterNumber: number, audioFile: File) {
  const assetService = createAssetService();
  const assetName = `chapter-${chapterNumber.toString().padStart(2, '0')}.mp3`;

  await assetService.uploadAsset({
    assetType: AssetType.AUDIO,
    bookSlug,
    assetName,
    content: audioFile,
    options: {
      contentType: 'audio/mpeg',
    }
  });
}

// Add a full audiobook
async function uploadFullAudiobook(bookSlug: string, audioFile: File) {
  const assetService = createAssetService();

  await assetService.uploadAsset({
    assetType: AssetType.AUDIO,
    bookSlug,
    assetName: 'full-audiobook.mp3',
    content: audioFile,
    options: {
      contentType: 'audio/mpeg',
    }
  });
}
```

#### Adding Text Files

```typescript
// Add brainrot chapter text
async function uploadBrainrotChapter(bookSlug: string, chapterNumber: number, text: string) {
  const assetService = createAssetService();
  const assetName = `brainrot-chapter-${chapterNumber.toString().padStart(2, '0')}.txt`;

  await assetService.uploadAsset({
    assetType: AssetType.TEXT,
    bookSlug,
    assetName,
    content: text,
    options: {
      contentType: 'text/plain',
    }
  });
}

// Add source full text
async function uploadSourceText(bookSlug: string, text: string) {
  const assetService = createAssetService();

  await assetService.uploadAsset({
    assetType: AssetType.TEXT,
    bookSlug,
    assetName: 'source-fulltext.txt',
    content: text,
    options: {
      contentType: 'text/plain',
    }
  });
}
```

#### Adding Images

```typescript
// Add chapter image
async function uploadChapterImage(bookSlug: string, chapterNumber: number, imageFile: File) {
  const assetService = createAssetService();
  const assetName = `chapter-${chapterNumber.toString().padStart(2, '0')}.jpg`;

  await assetService.uploadAsset({
    assetType: AssetType.IMAGE,
    bookSlug,
    assetName,
    content: imageFile,
    options: {
      contentType: 'image/jpeg',
    }
  });
}
```

### 3.4 Batch Upload Script Example

For bulk uploads, create a script using the Asset Service:

```typescript
import { readFile } from 'fs/promises';
import { join } from 'path';

import { AssetType } from '@/types/assets';
import { createAssetService } from '@/utils/services/AssetServiceFactory';

async function batchUploadChapterAudio(bookSlug: string, audioDir: string, chapters: number[]) {
  const assetService = createAssetService();

  for (const chapter of chapters) {
    const paddedChapter = chapter.toString().padStart(2, '0');
    const filePath = join(audioDir, `chapter-${paddedChapter}.mp3`);
    const content = await readFile(filePath);

    const assetName = `chapter-${paddedChapter}.mp3`;
    await assetService.uploadAsset({
      assetType: AssetType.AUDIO,
      bookSlug,
      assetName,
      content,
      options: {
        contentType: 'audio/mpeg',
      }
    });

    console.log(`Uploaded ${bookSlug} chapter ${paddedChapter}`);
  }
}
```

## 4. Asset Service API

The Asset Service provides a comprehensive API for all asset operations. It is accessed through the `AssetServiceFactory`.

### 4.1 Creating a Service Instance

```typescript
import { createAssetService } from '@/utils/services/AssetServiceFactory';

// Create a default instance
const assetService = createAssetService();

// Create a customized instance with correlation ID for request tracking
const requestAssetService = createAssetService({
  correlationId: 'request-123',
  config: {
    defaultCacheBusting: true,
  },
});
```

### 4.2 Core Methods

#### Getting Asset URLs

```typescript
// Get a URL for an audio chapter
const url = await assetService.getAssetUrl(AssetType.AUDIO, 'hamlet', 'chapter-01.mp3');

// Get a URL with cache busting
const cacheBustedUrl = await assetService.getAssetUrl(AssetType.IMAGE, 'the-iliad', 'cover.jpg', {
  cacheBusting: true,
});
```

#### Checking Asset Existence

```typescript
// Check if an asset exists
const exists = await assetService.assetExists(
  AssetType.TEXT,
  'the-odyssey',
  'brainrot-fulltext.txt'
);

if (exists) {
  console.log('The asset exists in Blob storage');
} else {
  console.log('The asset does not exist');
}
```

#### Fetching Asset Content

```typescript
// Fetch binary content (for audio, images)
const audioData = await assetService.fetchAsset(AssetType.AUDIO, 'hamlet', 'chapter-01.mp3');

// Fetch text content
const textContent = await assetService.fetchTextAsset('the-odyssey', 'brainrot-chapter-03.txt');
```

#### Listing Assets

```typescript
// List all audio assets for a book
const audioAssets = await assetService.listAssets(AssetType.AUDIO, 'hamlet', { limit: 50 });

// Process the list
for (const asset of audioAssets.assets) {
  console.log(`Found: ${asset.name}, Size: ${asset.size} bytes`);
}

// Handle pagination
if (audioAssets.hasMore) {
  const nextPage = await assetService.listAssets(AssetType.AUDIO, 'hamlet', {
    limit: 50,
    cursor: audioAssets.cursor,
  });
}
```

#### Deleting Assets

```typescript
// Delete an asset
const deleted = await assetService.deleteAsset(AssetType.IMAGE, 'obsolete-book', 'cover.jpg');

if (deleted) {
  console.log('Asset successfully deleted');
}
```

### 4.3 Using the Path Service

The AssetPathService can be used directly for complex path generation:

```typescript
import { assetPathService } from '@/utils/services/AssetPathService';

// Generate audio path
const audioPath = assetPathService.getAudioPath('hamlet', 5);
// Result: assets/audio/hamlet/chapter-05.mp3

// Generate audio path for full audiobook
const fullAudioPath = assetPathService.getAudioPath('hamlet', 'full');
// Result: assets/audio/hamlet/full-audiobook.mp3

// Generate brainrot text path
const brainrotPath = assetPathService.getBrainrotTextPath('the-odyssey', 3);
// Result: assets/text/the-odyssey/brainrot-chapter-03.txt

// Generate image path for cover
const coverPath = assetPathService.getImagePath('hamlet', 'cover');
// Result: assets/image/hamlet/cover.jpg
```

## 5. Common Asset Operations

### 5.1 Downloading Assets

For client-side asset downloads:

```typescript
import { createAssetService } from '@/utils/services/AssetServiceFactory';

async function downloadAudiobook(bookSlug: string) {
  const assetService = createAssetService();

  try {
    // Get URL for the full audiobook
    const url = await assetService.getAssetUrl('audio', bookSlug, 'full-audiobook.mp3');

    // Use the download API endpoint for improved reliability
    window.location.href = `/api/download?slug=${bookSlug}&type=full`;
  } catch (error) {
    console.error('Failed to download audiobook:', error);
  }
}
```

### 5.2 Proxying Assets

For sensitive assets or to add server-side processing:

```typescript
// Server-side Next.js API route
import { NextRequest, NextResponse } from 'next/server';

import { AssetType } from '@/types/assets';
import { createAssetService } from '@/utils/services/AssetServiceFactory';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const chapter = searchParams.get('chapter');

  if (!slug || !chapter) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const assetService = createAssetService({
    correlationId: crypto.randomUUID(),
  });

  try {
    // Stream the asset through the server
    const assetContent = await assetService.fetchAsset(
      AssetType.AUDIO,
      slug,
      `chapter-${chapter.padStart(2, '0')}.mp3`
    );

    return new NextResponse(assetContent, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${slug}-chapter-${chapter}.mp3"`,
      },
    });
  } catch (error) {
    console.error('Error proxying asset:', error);
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }
}
```

### 5.3 Displaying Images

Client-side image display:

```typescript
import { createAssetService } from '@/utils/services/AssetServiceFactory';
import { useState, useEffect } from 'react';
import Image from 'next/image';

function BookCover({ bookSlug }: { bookSlug: string }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCoverImage() {
      try {
        const assetService = createAssetService();
        const url = await assetService.getAssetUrl(
          'image',
          bookSlug,
          'cover.jpg'
        );
        setCoverUrl(url);
      } catch (err) {
        console.error('Failed to load cover image:', err);
        setError('Cover image not available');
      }
    }

    loadCoverImage();
  }, [bookSlug]);

  if (error) return <div className="error-message">{error}</div>;
  if (!coverUrl) return <div className="loading">Loading cover...</div>;

  return (
    <Image
      src={coverUrl}
      alt={`Cover for ${bookSlug}`}
      width={300}
      height={450}
      priority
    />
  );
}
```

### 5.4 Loading Text Content

Loading and displaying text content:

```typescript
import { createAssetService } from '@/utils/services/AssetServiceFactory';
import { useState, useEffect } from 'react';

function ChapterText({ bookSlug, chapter }: { bookSlug: string, chapter: number }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChapterText() {
      try {
        setLoading(true);
        const assetService = createAssetService();
        const paddedChapter = chapter.toString().padStart(2, '0');
        const content = await assetService.fetchTextAsset(
          bookSlug,
          `brainrot-chapter-${paddedChapter}.txt`
        );
        setText(content);
      } catch (err) {
        console.error('Failed to load chapter text:', err);
        setError('Chapter text not available');
      } finally {
        setLoading(false);
      }
    }

    loadChapterText();
  }, [bookSlug, chapter]);

  if (loading) return <div className="loading">Loading chapter text...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!text) return <div className="no-content">No text available</div>;

  return (
    <div className="chapter-text">
      {text.split('\n').map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}
```

## 6. Error Handling

The Asset Service provides a standardized error handling mechanism using the `AssetError` class.

### 6.1 Error Types

The `AssetErrorType` enum defines various types of errors:

- `NOT_FOUND`: Asset doesn't exist
- `UNAUTHORIZED`: Authentication failure
- `FORBIDDEN`: Authorization failure
- `CONFLICT`: Resource conflict
- `STORAGE_ERROR`: Error from the storage provider
- `NETWORK_ERROR`: Network communication issue
- `VALIDATION_ERROR`: Invalid input parameters
- `UNKNOWN_ERROR`: Other unexpected errors

### 6.2 Catching and Handling Errors

```typescript
import { AssetError, AssetErrorType } from '@/types/assets';
import { createAssetService } from '@/utils/services/AssetServiceFactory';

async function safelyLoadAsset(bookSlug: string, chapter: number) {
  try {
    const assetService = createAssetService();
    const paddedChapter = chapter.toString().padStart(2, '0');
    return await assetService.fetchTextAsset(bookSlug, `brainrot-chapter-${paddedChapter}.txt`);
  } catch (error) {
    if (error instanceof AssetError) {
      switch (error.type) {
        case AssetErrorType.NOT_FOUND:
          console.log(`Asset not found: ${error.assetPath}`);
          // Try an alternative asset or display a user-friendly message
          return null;

        case AssetErrorType.NETWORK_ERROR:
          console.log(`Network error loading asset: ${error.message}`);
          // Retry the operation or show a connectivity error
          return null;

        default:
          console.error(`Asset error: ${error.message} (${error.type})`);
          return null;
      }
    }

    // Handle non-AssetError cases
    console.error('Unexpected error:', error);
    return null;
  }
}
```

## 7. Best Practices

### 7.1 Performance Optimization

- Use appropriate caching settings for different asset types
- Audio and images: Long cache times (max-age=31536000, 1 year)
- Dynamic text content: Shorter cache times (max-age=3600, 1 hour)
- Add cache busting only when necessary
- Consider proxying large assets through the server

### 7.2 Resource Management

- Regularly audit unused assets with the listAssets method
- Delete obsolete assets to manage storage costs
- Use the `metadata` field to add useful information to assets
- Follow the standardized naming conventions for all new assets

### 7.3 Error Handling and Logging

- Always wrap asset operations in try/catch blocks
- Handle AssetError instances differently based on their type
- Add correlation IDs to asset service operations to link logs
- Log all critical asset operations for auditing

### 7.4 Asset Service Configuration

- Use the AssetServiceFactory for consistent configuration
- Create request-specific instances with correlation IDs
- Customize service behavior for specific contexts
- Follow the principle of least privilege for access tokens

## 8. Conclusion

This guide provides a comprehensive overview of asset management in the Brainrot Publishing House application. By following these patterns and best practices, you can ensure consistent, reliable handling of all asset types across the application.

## 9. References

- [UNIFIED_BLOB_PATH_STRUCTURE.md](./UNIFIED_BLOB_PATH_STRUCTURE.md) - Detailed path structure documentation
- [VERCEL_BLOB_CONFIG.md](./VERCEL_BLOB_CONFIG.md) - Vercel Blob configuration guide
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Environment variable documentation
- [ASSET_SERVICE_DESIGN.md](./ASSET_SERVICE_DESIGN.md) - Detailed service design document
- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob) - Official Vercel Blob documentation
