# CDN URL Verification Tool

This document explains how to use the CDN URL verification tool to test and compare URL generation and accessibility across different environments.

## Overview

The CDN URL verification tool helps diagnose issues with audio file downloads by testing:

1. CDN URL generation (format, bucket, region)
2. URL accessibility (HTTP status codes)
3. Fallback URL functionality
4. Blob storage availability
5. Differences between environments

This is particularly useful for investigating download failures in production or preview environments.

## Basic Usage

```bash
# Run the verification with default settings
npm run verify:cdn

# Generate markdown report
npm run verify:cdn:md

# Run with verbose output
npm run verify:cdn:verbose

# Compare with previous run
npm run verify:cdn:compare
```

## Advanced Usage

For more control, run the script directly:

```bash
npx tsx scripts/verifyCdnUrls.ts [options]
```

### Command Line Options

| Option                     | Description                                | Default                       |
| -------------------------- | ------------------------------------------ | ----------------------------- | ---- |
| `--books=book1,book2`      | Comma-separated list of book slugs to test | iliad,hamlet,odyssey,republic |
| `--output=file.json`       | Output file path                           | cdn-url-verification.json     |
| `--format=json             | md`                                        | Output format                 | json |
| `--verbose`                | Enable verbose logging                     | false                         |
| `--timeout=10000`          | Request timeout in milliseconds            | 10000                         |
| `--no-cdn`                 | Skip checking CDN URLs                     | false                         |
| `--no-fallback`            | Skip checking fallback URLs                | false                         |
| `--no-blob`                | Skip checking Blob storage                 | false                         |
| `--compare-env=production` | Compare with another environment           | null                          |
| `--compare-file=file.json` | Compare with a previous run                | null                          |
| `--concurrent=5`           | Maximum concurrent requests                | 5                             |
| `--full-check`             | Use GET instead of HEAD requests           | false                         |
| `--help`                   | Show help information                      | n/a                           |

## Example Commands

```bash
# Test specific books
npx tsx scripts/verifyCdnUrls.ts --books=the-iliad,hamlet

# Generate markdown report with verbose logging
npx tsx scripts/verifyCdnUrls.ts --format=md --output=verification.md --verbose

# Run faster with more concurrency
npx tsx scripts/verifyCdnUrls.ts --concurrent=10

# Compare with a previous verification run
npx tsx scripts/verifyCdnUrls.ts --compare-file=previous-verification.json
```

## Understanding Results

### JSON Format

The JSON output contains an array of test results, each with:

```json
{
  "slug": "the-iliad",
  "type": "chapter",
  "chapter": "1",
  "cdnUrl": "https://bucket.region.cdn.digitaloceanspaces.com/...",
  "fallbackUrl": "https://bucket.region.digitaloceanspaces.com/...",
  "blobUrl": "https://public.blob.vercel-storage.com/...",
  "exists": {
    "cdn": true,
    "fallback": true,
    "blob": false
  },
  "statusCodes": {
    "cdn": 200,
    "fallback": 200,
    "blob": null
  },
  "headers": {
    "cdn": {
      /* Response headers */
    },
    "fallback": {
      /* Response headers */
    },
    "blob": {}
  },
  "errors": {
    "cdn": null,
    "fallback": null,
    "blob": "Asset not found in blob storage"
  },
  "durations": {
    "cdn": 123,
    "fallback": 145,
    "blob": null
  },
  "environment": "development"
}
```

### Markdown Format

The markdown output provides:

1. **Summary section** with:

   - Environment info
   - Success rates for CDN, fallback, and Blob URLs
   - Configuration details

2. **Tables for each book** showing:

   - Accessibility status (✅/❌)
   - HTTP status codes
   - Response times
   - Error notes

3. **Comparison section** (when using `--compare-file`):
   - Differences between environments
   - Changes in URL format or accessibility

## Troubleshooting Download Issues

Follow these steps when investigating download problems:

1. **Run the verification tool**:

   ```
   npm run verify:cdn:md
   ```

2. **Check accessibility patterns**:

   - Are all CDN URLs failing?
   - Are fallback URLs working?
   - Do patterns match specific books or chapters?

3. **Compare environments**:

   - Run in both development and production environments
   - Compare the results to find discrepancies

   ```
   # In development environment
   npm run verify:cdn -- --output=dev-verification.json

   # In production environment
   npm run verify:cdn -- --output=prod-verification.json

   # Compare results
   npm run verify:cdn -- --compare-file=prod-verification.json
   ```

4. **Examine URL formats**:

   - Check if bucket and region are correct
   - Verify the path structure is consistent
   - Check that chapter numbers are formatted correctly

5. **Review HTTP responses**:
   - Status codes (403 = permission issues, 404 = missing files)
   - Response headers for CDN configuration
   - Error messages from servers

## Common Issues and Solutions

| Issue                            | Potential Causes                        | Solutions                                              |
| -------------------------------- | --------------------------------------- | ------------------------------------------------------ |
| All CDN URLs return 403          | Bucket permissions, incorrect region    | Check bucket policy, verify region setting             |
| Specific book URLs fail          | Missing files for that book             | Check if files exist, re-upload if necessary           |
| CDN works but fallback fails     | Fallback path configured incorrectly    | Ensure non-CDN domain is accessible                    |
| Slow response times              | Network latency, CDN edge issues        | Try different region, check CDN configuration          |
| Different behavior in production | Environment variables not set correctly | Verify environment variables match across environments |

## Related Documentation

- [BLOB_STORAGE.md](./BLOB_STORAGE.md) - How the Blob storage system works
- [VERCEL_BLOB_CONFIG.md](./VERCEL_BLOB_CONFIG.md) - Vercel Blob configuration details
- [BLOB_PATH_STRUCTURE.md](./BLOB_PATH_STRUCTURE.md) - Path structure for assets
- [DIGITAL_OCEAN_ACCESS.md](./DIGITAL_OCEAN_ACCESS.md) - Digital Ocean Spaces configuration
