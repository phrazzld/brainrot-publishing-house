# Environment Variables

This document provides a comprehensive overview of all environment variables used in the application.

## Required Environment Variables

### Vercel Blob Configuration

These variables are required for accessing assets stored in Vercel Blob:

| Variable                    | Description                          | Example                                          |
| --------------------------- | ------------------------------------ | ------------------------------------------------ |
| `BLOB_READ_WRITE_TOKEN`     | Token for read/write access to Blob  | `vercel_blob_rw_token123456`                     |
| `NEXT_PUBLIC_BLOB_BASE_URL` | Public URL for accessing Blob assets | `https://example.public.blob.vercel-storage.com` |

## Optional Environment Variables

### Development Environment

These variables can be used to customize the development environment:

| Variable                   | Description                        | Default Value                        |
| -------------------------- | ---------------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_BLOB_DEV_URL` | Override Blob URL in development   | Value of `NEXT_PUBLIC_BLOB_BASE_URL` |
| `BLOB_AUDIOBOOK_PREFIX`    | Prefix for audiobook paths in Blob | (empty string)                       |
| `USE_DIRECT_AUDIO_PATHS`   | Toggle between path formats        | `true`                               |

### API Timeouts

| Variable                 | Description                             | Default Value |
| ------------------------ | --------------------------------------- | ------------- |
| `DOWNLOAD_FETCH_TIMEOUT` | Timeout for download API fetch requests | 10000 (10s)   |

## Deprecated Environment Variables

The following environment variables are no longer used after migration to Vercel Blob:

| Variable                   | Description                      | Status     |
| -------------------------- | -------------------------------- | ---------- |
| `DO_SPACES_ACCESS_KEY`     | Digital Ocean Spaces access key  | Deprecated |
| `DO_SPACES_SECRET_KEY`     | Digital Ocean Spaces secret key  | Deprecated |
| `DO_SPACES_ENDPOINT`       | Digital Ocean Spaces endpoint    | Deprecated |
| `DO_SPACES_BUCKET`         | Digital Ocean Spaces bucket name | Deprecated |
| `SPACES_BUCKET_NAME`       | Duplicate of DO_SPACES_BUCKET    | Deprecated |
| `DO_SPACES_EXPIRY_SECONDS` | Expiry time for signed URLs      | Deprecated |

## Environment Configuration

### Local Development

For local development, create a `.env.local` file with the following variables:

```
BLOB_READ_WRITE_TOKEN="your_vercel_blob_token"
NEXT_PUBLIC_BLOB_BASE_URL=https://your-project.public.blob.vercel-storage.com
```

### Production Environment

In production, these variables should be set in your Vercel project settings.
