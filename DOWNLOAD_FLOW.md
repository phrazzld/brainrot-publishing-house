# Audio Download Flow Analysis

## Download Path Flow

1. **Client-side `DownloadButton.tsx`**:

   - User clicks download button
   - Requests URL from `/api/download` API
   - API returns URL or proxies the file content

2. **Server-side `/api/download/route.ts`**:

   - Validates parameters using `validateRequestParameters`
   - Unnecessarily validates S3 credentials ❌ (to be removed)
   - Creates download service
   - Calls `downloadService.getDownloadUrl()`
   - Either returns URL or proxies content

3. **`DownloadService` in `services/downloadService.ts`**:

   - Constructs legacy path to audio file
   - Resolves URL using `assetUrlResolver`
   - If URL includes S3 endpoint, tries to sign it ❌ (unnecessary)
   - Otherwise returns direct URL

4. **S3 Signing in `s3SignedUrlGenerator.ts`**:
   - Validates S3 credentials (unnecessarily) ❌ (to be removed)
   - Generates signed URL using AWS SDK ❌ (can be removed)
   - Has fallbacks for non-production environments

## Key Issues

- **Unnecessary S3 Signing**: The app has been working with public URLs, not signed ones
- **Credential Validation**: Credentials are being validated but not actually required
- **Environment Logic**: Uses environment checks to determine validation behavior

## Files Needing Modification

1. `/app/api/download/requestValidation.ts` - Remove S3 validation
2. `/app/api/download/validators.ts` - Remove S3Config validation
3. `/services/downloadService.ts` - Simplify URL handling, remove signing
4. `/services/s3SignedUrlGenerator.ts` - Convert to simple URL generator
5. `/app/api/download/serviceFactory.ts` - Remove environment checks
6. `/utils/getEnvironmentType.ts` - Can be removed entirely
