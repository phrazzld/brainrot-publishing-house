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

## Migration from S3/DigitalOcean Spaces

When migrating from S3 or DigitalOcean Spaces:

1. Download the files from the existing storage
2. Upload the files to Vercel Blob using the same path structure
3. Update the references in your code to use the new Blob URLs

See the migration scripts in the project for more details.