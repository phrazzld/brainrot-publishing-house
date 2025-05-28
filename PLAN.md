# Audio Download Debugging and Fix Plan

## Issue Description

The audio download functionality is broken on the preview deployment. When users attempt to download audio, they receive the error: "failed to download. please try again. (failed to download audio file (500))".

Console logs reveal the following sequence:

```
[Download] Using proxy approach for audio downloads
[Download] Fetching audio file through proxy: /api/download?slug=the-iliad&type=chapter&chapter=1&proxy=true
/api/download?slug=the-iliad&type=chapter&chapter=1&proxy=true:1 Failed to load resource: the server responded with a status of 500 ()
[Download] Proxy fetch error (500): {"error":"Proxy error","message":"Failed to proxy download through API"}
[Download] Error details: Error: failed to download audio file (500)
```

## Root Cause Analysis

### Potential Technical Issues

1. **CDN URL Generation Issues**

   - Recent refactoring from S3 signed URLs to direct CDN URLs may have broken URL generation
   - Environment variables might be missing or incorrect in the preview deployment
   - Path construction logic may be producing invalid URLs

2. **Proxy Implementation Problems**

   - The proxy function in `app/api/download/proxyService.ts` may not correctly handle direct CDN URLs
   - Error handling might be insufficient when CDN requests fail
   - Response streaming implementation could be broken

3. **Environment-Specific Issues**

   - Network access to CDN may be restricted in the preview environment
   - Environment configurations may differ between local and preview
   - Required credentials might be missing in the Vercel deployment

4. **Download Service Problems**
   - Recent refactoring may have introduced bugs in `downloadService.ts`
   - The service factory in `serviceFactory.ts` might not be correctly configured
   - TypeScript null safety issues could be causing runtime errors

### Systemic Issues

1. **Inadequate Error Handling**

   - Error messages are too generic to facilitate debugging
   - Error details aren't being properly propagated from internal services
   - Server-side errors aren't logged with sufficient detail

2. **Architectural Complexity**

   - Two-step download process (URL generation then proxy download) adds failure points
   - Proxy approach introduces complexity and server load
   - Service layer responsibilities may not be clearly defined

3. **Testing Gaps**

   - Proxy download functionality lacks comprehensive testing
   - End-to-end tests don't validate the full download flow
   - Environment-specific configurations aren't being tested

4. **Monitoring and Observability Issues**
   - Limited visibility into server-side errors
   - No monitoring of download success/failure rates
   - Difficult to diagnose production issues without proper instrumentation

## Investigation Plan

### 1. Enhanced Error Logging

Add detailed error logging to capture the exact failure point in the proxy download process:

```typescript
// In proxyService.ts or route.ts handling proxy downloads
try {
  // Existing proxy download logic
  log.info({ msg: 'Attempting proxy download', url: sanitizedUrl, slug, type });
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Failed to read error response');
    log.error({
      msg: 'CDN returned error response',
      status: response.status,
      statusText: response.statusText,
      errorText: errorText.substring(0, 200), // Truncate long responses
      slug, type, chapter
    });
    throw new Error(`CDN responded with status: ${response.status}`);
  }

  // Response handling...
} catch (error) {
  log.error({
    msg: 'Proxy download failed',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    slug, type, chapter
  });

  // Enhance error for client response
  return NextResponse.json({
    error: 'Proxy error',
    message: 'Failed to proxy download through API',
    details: process.env.NODE_ENV !== 'production'
      ? (error instanceof Error ? error.message : String(error))
      : undefined
  }, { status: 500 });
}
```

### 2. URL Generation Verification

Test CDN URL generation to verify it's working correctly across environments:

```typescript
// Create a script to test URL generation
import { generateCdnUrl } from '../utils/services/BlobPathService';

// Or wherever URL generation happens

const testCases = [
  { slug: 'the-iliad', type: 'chapter', chapter: 1 },
  { slug: 'the-iliad', type: 'full' },
];

console.log('Environment:', process.env.NODE_ENV);
console.log('CDN Base URL:', process.env.CDN_BASE_URL || 'Not set');

for (const test of testCases) {
  try {
    const url = generateCdnUrl(test.slug, test.type, test.chapter);
    console.log(`URL for ${JSON.stringify(test)}: ${sanitizeUrl(url)}`);

    // Try a HEAD request to check accessibility
    fetch(url, { method: 'HEAD' })
      .then((resp) => console.log(`Status: ${resp.status} ${resp.statusText}`))
      .catch((err) => console.error(`Error accessing URL: ${err.message}`));
  } catch (error) {
    console.error(`Error generating URL for ${JSON.stringify(test)}:`, error);
  }
}

// Helper to sanitize URLs for logs
function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/[path]`;
  } catch {
    return '[invalid-url]';
  }
}
```

### 3. Environment Comparison

Test the download flow in both local and preview environments to identify differences:

```typescript
// Create a script that compares the same flow across environments
const environments = [
  { name: 'Local', baseUrl: 'http://localhost:3000' },
  { name: 'Preview', baseUrl: 'https://your-preview-url.vercel.app' },
];

async function compareDownloadFlow() {
  for (const env of environments) {
    console.log(`\nTesting in ${env.name} environment:`);

    // Test URL generation endpoint
    try {
      const urlResponse = await fetch(
        `${env.baseUrl}/api/download?slug=the-iliad&type=chapter&chapter=1`,
      );
      console.log(`URL Generation Status: ${urlResponse.status}`);
      if (urlResponse.ok) {
        const data = await urlResponse.json();
        console.log(`URL Generation Response: ${JSON.stringify(data).substring(0, 100)}...`);
      }
    } catch (error) {
      console.error(`URL Generation Error: ${error.message}`);
    }

    // Test proxy endpoint (just headers to avoid full download)
    try {
      const proxyResponse = await fetch(
        `${env.baseUrl}/api/download?slug=the-iliad&type=chapter&chapter=1&proxy=true`,
        { method: 'HEAD' },
      );
      console.log(`Proxy Status: ${proxyResponse.status}`);
      console.log(`Proxy Headers: ${JSON.stringify(Object.fromEntries(proxyResponse.headers))}`);
    } catch (error) {
      console.error(`Proxy Error: ${error.message}`);
    }
  }
}
```

### 4. Proxy Implementation Debug

Examine the proxy implementation for potential issues:

1. Check for proper error handling and HTTP client configuration
2. Verify content-type and header handling
3. Examine stream processing for large files
4. Check for timeout or buffer size issues

## Potential Fixes

### Short-term Fixes

1. **Fix CDN URL Generation**

   - Ensure base URL is correctly set from environment variables
   - Validate URL construction for different asset types
   - Add fallback mechanisms for path generation

2. **Improve Proxy Implementation**

   - Add proper timeout handling for CDN requests
   - Enhance error handling with specific error types
   - Consider using arrayBuffer instead of streaming for smaller files

3. **Add Client-Side Fallback**
   - Implement direct download as fallback when proxy fails
   - Add retry logic for failed downloads
   - Provide better user feedback during download attempts

### Medium-term Improvements

1. **Simplify Download Architecture**

   - Consider eliminating the two-step process
   - Use direct CDN URLs with proper CORS headers
   - Implement client-side downloads with server fallback

2. **Enhance Error Handling and Logging**

   - Create specific error types for different failure scenarios
   - Implement structured logging throughout the download flow
   - Add correlation IDs to track requests across systems

3. **Improve Testing Coverage**
   - Create end-to-end tests for download functionality
   - Add integration tests for proxy downloads
   - Implement environment-specific configuration tests

## Testing Strategy

1. **Manual Testing Protocol**

   - Test downloads in all environments (local, preview, production)
   - Verify different book types and chapter configurations
   - Test both proxy and direct download methods

2. **Automated Tests**

   - Create end-to-end tests for the download flow
   - Add integration tests for CDN access
   - Implement unit tests for URL generation and error handling

3. **Environment Verification**
   - Develop scripts to verify environment configurations
   - Test CDN accessibility from different environments
   - Validate required environment variables

## Prevention Measures

1. **Development Process Improvements**

   - Implement pre-deployment checks for download functionality
   - Create feature flags for download method changes
   - Use canary deployments for risky changes

2. **Monitoring and Alerting**

   - Add monitoring for download success rates
   - Create alerts for unusual error patterns
   - Track performance metrics for downloads

3. **Documentation and Knowledge Sharing**
   - Document download architecture and flow
   - Create troubleshooting guide for common issues
   - Maintain list of known edge cases and solutions

## Action Items

### Immediate (Today)

1. Deploy enhanced error logging to capture detailed error information
2. Create test scripts to verify CDN URL generation and accessibility
3. Test direct download as a potential workaround

### Short-term (This Week)

1. Identify and fix the root cause of the proxy download failure
2. Add client-side fallback for proxy download failures
3. Create regression tests to prevent recurrence

### Medium-term (Next Sprint)

1. Review and simplify the download architecture
2. Implement comprehensive download monitoring
3. Add automated tests for download functionality

### Long-term (Next Quarter)

1. Consider architectural redesign for downloads
2. Implement redundant download mechanisms
3. Create comprehensive download analytics
