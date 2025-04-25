# Vercel Blob Storage

This project uses Vercel Blob for storing and serving assets like images and text files. Vercel Blob provides a simple and efficient way to handle unstructured data with global edge distribution.

## Configuration

To use Vercel Blob, you need to set up the following environment variables:

- `BLOB_READ_WRITE_TOKEN`: A token for read and write access to your Blob storage
- `NEXT_PUBLIC_BLOB_BASE_URL`: The base URL for public blob storage (defaults to https://public.blob.vercel-storage.com)

Create a `.env.local` file in the project root with the above variables (see `.env.local.example` for reference).

## Using BlobService

The project includes a `BlobService` utility class to simplify interactions with Vercel Blob. This provides a consistent interface for all blob operations:

```typescript
import { blobService } from '@/utils/services';

// Upload a file
const result = await blobService.uploadFile(file, {
  pathname: 'books/hamlet/images',
  access: 'public'
});

// Upload text content
await blobService.uploadText('Hello world', 'books/hamlet/text/greeting.txt');

// List files
const { blobs } = await blobService.listFiles({
  prefix: 'books/hamlet/'
});

// Get file info
const info = await blobService.getFileInfo(blobUrl);

// Delete a file
await blobService.deleteFile(blobUrl);

// Get URL for a path (without uploading)
const url = blobService.getUrlForPath('books/hamlet/text/act1.txt');

// Fetch text from a blob URL
const text = await blobService.fetchText(textBlobUrl);
```

## BlobService API

### `uploadFile(file: File, options?: UploadOptions): Promise<PutBlobResult>`

Uploads a file to Blob storage.

Options:
- `pathname`: Directory path (e.g., 'books/hamlet/images')
- `filename`: Custom filename (defaults to file.name)
- `access`: 'public' or 'private' (defaults to 'public')
- `addRandomSuffix`: Whether to add a random suffix to the filename
- `cacheControl`: Cache-Control header
- `contentType`: Content-Type header

### `uploadText(content: string, path: string, options?): Promise<PutBlobResult>`

Uploads text content to Blob storage.

Parameters:
- `content`: The text content to upload
- `path`: The full path including filename (e.g., 'books/hamlet/text/act1.txt')
- `options`: Additional upload options

### `listFiles(options?: ListOptions): Promise<{ blobs: ListBlobResultBlob[]; cursor?: string }>`

Lists files in Blob storage.

Options:
- `prefix`: Filter files by prefix
- `limit`: Maximum number of files to return
- `cursor`: Pagination cursor

### `getFileInfo(url: string): Promise<HeadBlobResult>`

Gets information about a file.

### `deleteFile(url: string): Promise<void>`

Deletes a file from Blob storage.

### `getUrlForPath(path: string): string`

Generates a URL for a path (useful for referencing files before they're uploaded).

### `fetchText(url: string): Promise<string>`

Fetches text content from a Blob URL.

## Testing

A test page is available at `/blob-test` to verify that the Blob storage is properly configured. You can use this page to upload, list, and delete files.

## Asset Inventory and Migration

### Asset Inventory Script

The project includes a script to inventory all assets in the `public/assets` directory:

```bash
# Generate inventory in JSON format (prints to stdout)
npm run inventory

# Generate inventory in Markdown format and save to file
npm run inventory:md

# Custom options
npx tsx scripts/inventory-assets.ts --format=csv --output=asset-inventory.csv
```

The inventory includes:
- All image and text files categorized by book and type
- File sizes and last modified dates
- Future Blob paths for each asset 
- Summary statistics by book and asset type

### Migration from S3/DigitalOcean Spaces

When migrating from S3 or DigitalOcean Spaces:

1. Run the inventory script to understand the assets to migrate
2. Download the files from the existing storage
3. Upload the files to Vercel Blob using the path structure defined in BLOB_PATH_STRUCTURE.md
4. Update the references in your code to use the new Blob URLs

#### Migration Scripts

The following scripts are available for migrating different asset types:

##### Book Cover Images Migration

```bash
# Dry run (simulation without uploading)
npm run migrate:cover-images:dry

# Perform actual migration
npm run migrate:cover-images

# Advanced options
npx tsx scripts/migrateBookCoverImages.ts --books=hamlet,the-iliad --force
```

Options:
- `--dry-run`: Simulate migration without uploading
- `--books=slug1,slug2`: Comma-separated list of book slugs to migrate (default: all)
- `--force`: Re-upload even if already migrated
- `--retries=3`: Number of retries for failed uploads (default: 3)
- `--concurrency=5`: Number of concurrent uploads (default: 5)
- `--log-file=path`: Path to migration log file (default: cover-images-migration.json)

The script:
- Identifies all book cover images from translations/index.ts
- Maps local paths to Blob paths using BlobPathService
- Uploads files with appropriate caching headers
- Verifies successful uploads
- Maintains a migration log for tracking progress
- Provides detailed output with success/failure information

##### Book Chapter Images Migration

```bash
# Dry run (simulation without uploading)
npm run migrate:chapter-images:dry

# Perform actual migration
npm run migrate:chapter-images

# Advanced options
npx tsx scripts/migrateBookChapterImages.ts --books=hamlet,the-republic --force
```

Options:
- `--dry-run`: Simulate migration without uploading
- `--books=slug1,slug2`: Comma-separated list of book slugs to migrate (default: all)
- `--force`: Re-upload even if already migrated
- `--retries=3`: Number of retries for failed uploads (default: 3)
- `--concurrency=5`: Number of concurrent uploads (default: 5)
- `--log-file=path`: Path to migration log file (default: chapter-images-migration.json)

The script:
- Scans the filesystem for chapter images in each book's directory
- Also migrates shared images in the general images directory
- Maps local paths to Blob paths using BlobPathService
- Uploads files with appropriate caching headers
- Verifies successful uploads
- Maintains a migration log for tracking progress
- Provides detailed output with success/failure information by book