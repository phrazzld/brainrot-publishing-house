# Environment Variable Analysis

## Current Environment Variables

From the local `.env.local` file, the following environment variables are configured:

```
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_82QOs1wlXBD4IQ1g_oedCHZ1wGaVFkBEcFW8OfVL0G9Hb51"
NEXT_PUBLIC_BLOB_BASE_URL=https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com
```

## Environment Variable Usage Analysis

### Blob Storage Configuration

| Variable                    | Usage                           | Analysis                                                                      |
| --------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `BLOB_READ_WRITE_TOKEN`     | Authentication with Vercel Blob | Appears to be correctly set, but might differ in preview environment          |
| `NEXT_PUBLIC_BLOB_BASE_URL` | Base URL for Blob storage       | Correctly set to tenant-specific URL, used in client-side code                |
| `NEXT_PUBLIC_BLOB_DEV_URL`  | Optional development URL        | Not set, which means `NEXT_PUBLIC_BLOB_BASE_URL` is used for all environments |

### Missing Variables

The codebase refers to several variables that are not found in the local environment:

1. `USE_DIRECT_AUDIO_PATHS` - Could be used to toggle between different path formats (would help solve the current path inconsistency)
2. `BLOB_AUDIOBOOK_PREFIX` - Could standardize the prefix used for audiobook paths

## Variable Usage in Code

### BlobService.ts

```typescript
// Uses NEXT_PUBLIC_BLOB_BASE_URL as the primary source for the base URL
let hostname =
  options?.baseUrl ||
  process.env.NEXT_PUBLIC_BLOB_BASE_URL ||
  'https://public.blob.vercel-storage.com';
```

### getBlobUrl.ts

```typescript
// Uses both NEXT_PUBLIC_BLOB_DEV_URL and NEXT_PUBLIC_BLOB_BASE_URL with environment-based fallback
blobBaseUrl =
  environment === 'development'
    ? process.env.NEXT_PUBLIC_BLOB_DEV_URL || process.env.NEXT_PUBLIC_BLOB_BASE_URL
    : process.env.NEXT_PUBLIC_BLOB_BASE_URL;
```

## Variable Inconsistency Analysis

1. **Missing Environment-Specific Configuration**:

   - No `NEXT_PUBLIC_BLOB_DEV_URL` is set, which means development and production use the same URL
   - No environment-specific path prefixes are defined

2. **Path Construction Variables**:
   - No variables control the path structure for different asset types
   - This leads to hardcoded prefixes like "books/" in the path construction logic

## Recommendations for Environment Variables

1. **Add Path Structure Variables**:

   - Add `BLOB_AUDIOBOOK_PREFIX` to control the prefix for audiobook paths
   - Add `USE_DIRECT_AUDIO_PATHS=true|false` to toggle between path formats

2. **Add Environment Validation**:

   - Implement validation for critical environment variables at application startup
   - Log clear error messages when required variables are missing

3. **Document Required Variables**:
   - Create a comprehensive list of all required environment variables
   - Include example values and descriptions
   - Document which variables are required in which environments

## Proposed Environment Variable Updates

```
# Vercel Blob Configuration
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token"
NEXT_PUBLIC_BLOB_BASE_URL=https://xyz.public.blob.vercel-storage.com

# Path Structure Configuration
BLOB_AUDIOBOOK_PREFIX="books/"  # Use empty string if no prefix is needed
USE_DIRECT_AUDIO_PATHS=true     # Set to false if paths should include prefix
```

## Environment-Specific Configurations

### Local Development

```
NEXT_PUBLIC_BLOB_DEV_URL=https://xyz.public.blob.vercel-storage.com
USE_DIRECT_AUDIO_PATHS=true
```

### Preview Deployment

```
NEXT_PUBLIC_BLOB_BASE_URL=https://xyz.public.blob.vercel-storage.com
USE_DIRECT_AUDIO_PATHS=true
```

### Production Deployment

```
NEXT_PUBLIC_BLOB_BASE_URL=https://xyz.public.blob.vercel-storage.com
USE_DIRECT_AUDIO_PATHS=true
```

## Implementation Plan

1. Update the environment variables in all environments (local, preview, production)
2. Modify `BlobPathService.ts` to use the new environment variables for path construction
3. Update `getBlobUrl.ts` to handle the different path formats based on environment variables
4. Add validation for critical environment variables at application startup

This environment variable standardization will help ensure consistent behavior across different environments and make it easier to debug issues in the future.
