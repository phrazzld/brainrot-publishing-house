# Signed URL Configuration

This document outlines the configuration for signed URLs used in the download API, specifically for audio assets that are served from S3-compatible storage.

## Overview

The application supports serving downloadable assets from both Vercel Blob and S3-compatible storage (Digital Ocean Spaces). While most assets have been migrated to Vercel Blob (see [T227-migration-report.md](../migration-logs/T227-migration-report.md)), the S3 signed URL generation functionality is maintained for compatibility and for specific assets.

## Environment Variables

Configure S3 signed URL generation using these environment variables:

```
# Standard variables (recommended)
SPACES_ACCESS_KEY_ID=your_access_key
SPACES_SECRET_ACCESS_KEY=your_secret_key
SPACES_ENDPOINT=your_s3_endpoint.com
SPACES_BUCKET_NAME=your_bucket_name

# Legacy variables (supported for backward compatibility)
DO_SPACES_ACCESS_KEY=your_access_key
DO_SPACES_SECRET_KEY=your_secret_key
DO_SPACES_ENDPOINT=your_s3_endpoint.com
DO_SPACES_BUCKET=your_bucket_name

# Optional variables
SPACES_REGION=us-east-1  # Optional: Default is us-east-1
SPACES_EXPIRY_SECONDS=900  # Optional: Default is 900 (15 minutes)
```

The system checks for both the standard and legacy variable names, using whichever is defined. If both are defined, the standard names take precedence.

## Signed URL Expiry Configuration

The expiry time for signed URLs is an important security configuration that determines how long a generated URL remains valid.

### Default Configuration

- **Default value**: 900 seconds (15 minutes)
- **Environment variable**: `SPACES_EXPIRY_SECONDS`
- **Maximum value**: 604800 seconds (7 days) - AWS SDK's maximum allowed value
- **Recommended range**: 5-15 minutes for balancing security and user experience

### Behavior

- If `SPACES_EXPIRY_SECONDS` is not set, the default value of 15 minutes is used
- If an invalid value is provided (not a number, negative, zero), the default is used
- If a value greater than the maximum (7 days) is provided, it's capped at the maximum

### Security Considerations

1. **Shorter expiry times** increase security by limiting the window during which a signed URL can be used
2. **Longer expiry times** improve user experience by allowing more time to complete downloads
3. The system enforces a **maximum limit of 7 days** to prevent security issues with excessively long expiry periods

## Implementation Details

The signed URL expiry configuration is implemented in `services/s3SignedUrlGenerator.ts`:

```typescript
// Configure URL expiry time with fallback to default
const configuredExpiry = process.env.SPACES_EXPIRY_SECONDS;
this.expirySeconds = configuredExpiry
  ? parseInt(configuredExpiry, 10)
  : DEFAULT_CONFIG.expirySeconds;

// Validate expiry is a reasonable number
const MAX_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days (AWS SDK max)
if (isNaN(this.expirySeconds) || this.expirySeconds <= 0) {
  this.expirySeconds = DEFAULT_CONFIG.expirySeconds;
} else if (this.expirySeconds > MAX_EXPIRY_SECONDS) {
  // Cap the expiry time to the maximum allowed
  this.expirySeconds = MAX_EXPIRY_SECONDS;
}
```

When generating a signed URL, this configured expiry time is passed to the AWS SDK:

```typescript
// Generate the signed URL with the configured expiry
const signedUrl = await getSignedUrl(this.s3Client, command, {
  expiresIn: this.expirySeconds,
});
```

## Client-Side Usage

When implementing download functionality in client-side components, **always use the `/api/download` API endpoint** rather than trying to generate or access Blob URLs directly. This ensures proper access control and prevents Vercel Blob token errors in local development.

The download API has two operating modes:

1. **URL Generation Mode**: Returns a URL that the client can use to download directly
2. **Proxy Mode**: Streams the file content through the API route to bypass CORS restrictions

Example of the recommended approach that handles both modes:

```typescript
// Fetch the download URL from our API
const params = new URLSearchParams({
  slug,
  type,
  ...(chapter ? { chapter: String(chapter) } : {}),
});

const apiUrl = `/api/download?${params.toString()}`;
const response = await fetch(apiUrl);

if (response.ok) {
  const { url, shouldProxy } = await response.json();

  let blob;

  // If the API suggests proxying (likely due to CORS issues), use the proxy approach
  if (shouldProxy) {
    // Create a proxy URL by adding the proxy parameter
    const proxyParams = new URLSearchParams({
      slug,
      type,
      ...(chapter ? { chapter: String(chapter) } : {}),
      proxy: 'true',
    });

    const proxyUrl = `/api/download?${proxyParams.toString()}`;

    // Fetch directly from our API endpoint which will proxy the file
    const fileRes = await fetch(proxyUrl);

    if (fileRes.ok) {
      blob = await fileRes.blob();
    }
  } else {
    // Direct fetch if no proxy needed (e.g., Vercel Blob URLs)
    const fileRes = await fetch(url);

    if (fileRes.ok) {
      blob = await fileRes.blob();
    }
  }

  if (blob) {
    // Create a download link from the blob
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `filename.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
```

This approach provides several advantages:

1. **CORS Compatibility**: Handles both CORS-enabled and CORS-restricted URLs
2. **Security**: All token-based authentication happens on the server side
3. **Reliability**: Works across all environments (local development, staging, production)
4. **Simplicity**: Client code doesn't need to worry about storage backends

## Testing

The configuration and validation of expiry times are covered by the unit tests in `__tests__/services/s3SignedUrlGenerator.test.ts`.
