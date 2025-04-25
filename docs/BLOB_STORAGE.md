# Vercel Blob Storage

This project uses Vercel Blob for storing and serving assets like images and text files. Vercel Blob provides a simple and efficient way to handle unstructured data with global edge distribution.

## Configuration

To use Vercel Blob, you need to set up the following environment variables:

- `BLOB_READ_WRITE_TOKEN`: A token for read and write access to your Blob storage

Create a `.env.local` file in the project root with the above variable (see `.env.local.example` for reference).

## Basic Usage

Vercel Blob provides a simple API for uploading, listing, and deleting files:

### Upload a file

```typescript
import { put } from '@vercel/blob';

// In a server action or API route:
const blob = await put('path/to/file.png', file, {
  access: 'public', // or 'private'
});

// blob.url -> The URL of the uploaded file
// blob.pathname -> The path of the file in the storage
```

### List files

```typescript
import { list } from '@vercel/blob';

// List all blobs
const { blobs } = await list();

// List blobs in a specific directory
const { blobs } = await list({ prefix: 'books/hamlet/' });
```

### Get file details

```typescript
import { head } from '@vercel/blob';

const blob = await head('path/to/file.png');
```

### Delete a file

```typescript
import { del } from '@vercel/blob';

await del('https://qz0xmohbvfpirfb6.public.blob.vercel-storage.com/path/to/file.png');
```

## Testing

A test page is available at `/blob-test` to verify that the Blob storage is properly configured. You can use this page to upload, list, and delete files.

## Migration from S3/DigitalOcean Spaces

When migrating from S3 or DigitalOcean Spaces:

1. Download the files from the existing storage
2. Upload the files to Vercel Blob using the same path structure
3. Update the references in your code to use the new Blob URLs

See the migration scripts in the project for more details.