# Environment Variable Analysis

## Current Environment Variables

From the local `.env.local` file, the following environment variables are configured:

```
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_82QOs1wlXBD4IQ1g_oedCHZ1wGaVFkBEcFW8OfVL0G9Hb51"
NEXT_PUBLIC_BLOB_BASE_URL=https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com
SPACES_BUCKET_NAME=brainrot-publishing
DO_SPACES_ACCESS_KEY=DO00YBMJYBZNPYHLA9EL
DO_SPACES_SECRET_KEY=BMhC2gQ2iEhFgjECDl92nbcINT/Y8jXoyRtnIOxagjU
DO_SPACES_BUCKET=brainrot-publishing
DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
```

## Environment Variable Usage Analysis

### Blob Storage Configuration

| Variable                    | Usage                           | Analysis                                                                      |
| --------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `BLOB_READ_WRITE_TOKEN`     | Authentication with Vercel Blob | Appears to be correctly set, but might differ in preview environment          |
| `NEXT_PUBLIC_BLOB_BASE_URL` | Base URL for Blob storage       | Correctly set to tenant-specific URL, used in client-side code                |
| `NEXT_PUBLIC_BLOB_DEV_URL`  | Optional development URL        | Not set, which means `NEXT_PUBLIC_BLOB_BASE_URL` is used for all environments |

### DigitalOcean Spaces Configuration

| Variable               | Usage                                  | Analysis                                                 |
| ---------------------- | -------------------------------------- | -------------------------------------------------------- |
| `SPACES_BUCKET_NAME`   | Bucket name for DigitalOcean Spaces    | Duplicate of `DO_SPACES_BUCKET`, potential for confusion |
| `DO_SPACES_BUCKET`     | Bucket name for DigitalOcean Spaces    | Same value as `SPACES_BUCKET_NAME`                       |
| `DO_SPACES_ACCESS_KEY` | Authentication for DigitalOcean Spaces | Appears to be correctly set                              |
| `DO_SPACES_SECRET_KEY` | Authentication for DigitalOcean Spaces | Appears to be correctly set                              |
| `DO_SPACES_ENDPOINT`   | Endpoint for DigitalOcean Spaces       | Correctly set to nyc3 region                             |

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

1. **Duplicate Bucket Name Variables**:

   - Both `SPACES_BUCKET_NAME` and `DO_SPACES_BUCKET` are used in different parts of the code
   - These could be set to different values in the preview environment, causing inconsistency

2. **Missing Environment-Specific Configuration**:

   - No `NEXT_PUBLIC_BLOB_DEV_URL` is set, which means development and production use the same URL
   - No environment-specific path prefixes are defined

3. **Path Construction Variables**:
   - No variables control the path structure for different asset types
   - This leads to hardcoded prefixes like "books/" in the path construction logic

## Recommendations for Environment Variables

1. **Standardize Bucket Name Variable**:

   - Choose either `SPACES_BUCKET_NAME` or `DO_SPACES_BUCKET` and use it consistently
   - Update all code to reference only the chosen variable

2. **Add Path Structure Variables**:

   - Add `BLOB_AUDIOBOOK_PREFIX` to control the prefix for audiobook paths
   - Add `USE_DIRECT_AUDIO_PATHS=true|false` to toggle between path formats

3. **Add Environment Validation**:

   - Implement validation for critical environment variables at application startup
   - Log clear error messages when required variables are missing

4. **Document Required Variables**:
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

# DigitalOcean Spaces Configuration
DO_SPACES_BUCKET=brainrot-publishing  # Standardize on DO_SPACES_BUCKET
DO_SPACES_ACCESS_KEY=access_key
DO_SPACES_SECRET_KEY=secret_key
DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
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
