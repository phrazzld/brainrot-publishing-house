# Vercel Blob Configuration Guide

This guide provides comprehensive documentation for setting up and configuring Vercel Blob storage for the Brainrot Publishing House application.

## 1. Overview

[Vercel Blob](https://vercel.com/docs/storage/vercel-blob) is a storage solution optimized for storing and serving unstructured data like images, audio files, and text files. Our application uses Vercel Blob as the exclusive storage backend for all assets after migration from Digital Ocean Spaces.

Key benefits of Vercel Blob:
- Global edge distribution for low-latency access
- Built-in content delivery network (CDN)
- Simple API with Next.js integration
- Automatic backup and redundancy
- Consistent and predictable storage costs

## 2. Initial Setup

### 2.1 Enabling Vercel Blob

To enable Vercel Blob for your project:

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to "Storage" in the sidebar
4. Select "Blob" and click "Create"
5. Follow the prompts to enable Blob storage for your project

### 2.2 Environment Variables

After enabling Blob storage, you'll need to configure the following environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `BLOB_READ_WRITE_TOKEN` | Token for read/write access to Blob storage | Yes |
| `NEXT_PUBLIC_BLOB_BASE_URL` | Public URL for accessing Blob assets | Yes |

#### For Local Development

Create a `.env.local` file in the project root with:

```
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
NEXT_PUBLIC_BLOB_BASE_URL=https://your-project.public.blob.vercel-storage.com
```

You can find your token and public URL in your Vercel project's Storage settings.

#### For Production

In production, these variables are automatically set by Vercel when you enable Blob storage. You can verify and manage them in:

1. Vercel Dashboard → Your Project
2. Settings → Environment Variables

### 2.3 Reading the Environment Variables

The application is configured to read these variables at runtime through Next.js's built-in environment variable support. For client-side access, only variables prefixed with `NEXT_PUBLIC_` will be available.

## 3. Using the Asset Service

The application uses a unified asset service to interact with Vercel Blob. This service is implemented in `utils/services/VercelBlobAssetService.ts`.

### 3.1 Creating an Asset Service Instance

```typescript
import { createAssetService } from '@/utils/services/AssetServiceFactory';

// Create a service instance
const assetService = createAssetService();

// Get a URL for an asset
const url = await assetService.getAssetUrl({
  assetType: 'audio',
  bookSlug: 'hamlet',
  chapter: '01',
  variant: 'chapter'
});
```

### 3.2 Available Methods

The asset service provides the following methods:

| Method | Description |
|--------|-------------|
| `getAssetUrl` | Get a URL for accessing an asset |
| `checkAssetExists` | Check if an asset exists in Blob storage |
| `fetchAssetContent` | Fetch the content of an asset |
| `streamAssetContent` | Stream the content of an asset (useful for proxying) |

## 4. Asset Path Structure

All assets in Vercel Blob follow a consistent path structure defined in `UNIFIED_BLOB_PATH_STRUCTURE.md`.

The general format is:
```
assets/{assetType}/{bookSlug}/{specificPath}
```

For example:
- Audio: `assets/audio/hamlet/chapter-01.mp3`
- Images: `assets/images/hamlet/cover.jpg`
- Text: `assets/text/hamlet/full-text.txt`

## 5. Troubleshooting

### 5.1 Common Issues

#### Asset Not Found

If you receive a 404 error when accessing an asset:

1. Verify the asset path is correct using the AssetPathService
2. Check if the asset exists in Blob storage using the Vercel Dashboard
3. Confirm that the asset was migrated correctly
4. Check for typos in the book slug or chapter number

#### Authentication Failures

If you encounter authentication errors:

1. Verify your `BLOB_READ_WRITE_TOKEN` is correctly set
2. Check that your token hasn't expired (regenerate if needed)
3. Ensure your Vercel project has Blob storage enabled

#### Slow Asset Loading

If assets are loading slowly:

1. Check the asset file size (large files may take longer to load)
2. Verify your internet connection
3. Test from different geographic locations to rule out CDN issues
4. Consider implementing a proxy download for large assets

### 5.2 Verifying Blob Storage Configuration

Run the verification script to test your Blob storage configuration:

```bash
npx tsx scripts/verifyBlobStorage.ts
```

This script will:
- Verify that your environment variables are correctly set
- Test uploading a small file to Blob storage
- Test fetching the file from Blob storage
- Clean up the test file

## 6. Monitoring and Logging

The asset service includes comprehensive logging for all operations. Look for logs with the following contexts:

- `context: "AssetService"`
- `context: "VercelBlobAssetService"`

These logs include:
- Operation type (get, check, fetch, stream)
- Asset path and URL
- Performance metrics
- Error details if applicable

## 7. References

- [Official Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Blob API Reference](https://vercel.com/docs/storage/vercel-blob/blob-api-reference)
- [Next.js with Vercel Blob Examples](https://github.com/vercel/examples/tree/main/storage/blob)
- [Vercel Blob Pricing](https://vercel.com/docs/storage/vercel-blob/usage-and-pricing)

## 8. Migration from Digital Ocean

If you're still using Digital Ocean Spaces or encountering issues during migration, refer to `MIGRATION_PLAN.md` for detailed migration steps and `ENVIRONMENT_VARIABLE_ANALYSIS.md` for information about deprecated Digital Ocean-related environment variables.