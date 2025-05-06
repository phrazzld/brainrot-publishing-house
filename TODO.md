# Audio Download Debugging Tasks

## Investigation Phase

- [ ] **T001: Add detailed error logging to proxy download handler**

  - Add structured logging at each step in proxy download flow
  - Capture full error details, response status, request params, and error stack traces
  - Log CDN response body text (truncated) when errors occur
  - Include conditional detailed error messages in non-production environments
  - dependencies: none

- [x] **T002: Fix missing error handling in primary fetch operation**

  - Add try/catch around primary URL fetch in fetchWithFallback function
  - Log detailed information about network errors during fetch
  - Properly handle and propagate errors from both primary and fallback URLs
  - dependencies: none

- [ ] **T003: Create CDN URL verification tool**

  - Develop a script to test CDN URL generation across environments
  - Verify URLs are correctly formatted with proper bucket and region
  - Test accessibility with HEAD requests to check if URLs are reachable
  - Compare URLs between local and preview environments
  - dependencies: none

- [ ] **T004: Run URL verification and document findings**

  - Execute verification script in both local and preview environments
  - Document differences in URL generation or accessibility
  - Identify potential environment variable or configuration issues
  - dependencies: [T003]

- [x] **T005: Add timeout handling to proxy fetches**

  - Implement AbortController with reasonable timeout for fetch requests
  - Configure timeout via environment variables
  - Handle aborted requests with specific error types
  - dependencies: none

- [ ] **T006: Review proxy implementation for streaming issues**

  - Examine stream processing for large files
  - Check for proper error handling in the streaming process
  - Verify content-type and header handling is correct
  - dependencies: [T001]

- [ ] **T007: Compare environments with test script**
  - Create script to test both endpoints across environments
  - Test URL generation endpoint (`/api/download`)
  - Test proxy endpoint (`/api/download?proxy=true`)
  - Document discrepancies between environments
  - dependencies: none

## Fix Implementation

- [ ] **T008: Fix CDN URL generation if issues found**

  - Address any issues identified in URL verification (T004)
  - Ensure bucket and region values are correctly set from environment variables
  - Add validation for URL format before attempting fetch
  - dependencies: [T004]

- [ ] **T009: Improve stream error handling in proxy**

  - Add error event handlers for Response.body stream
  - Implement proper stream cleanup on errors
  - Return appropriate error responses when streaming fails
  - dependencies: [T001], [T006]

- [ ] **T010: Fix environment variables configuration**

  - Ensure all required variables are present in Vercel deployment
  - Add validation of critical environment variables during service initialization
  - Document required variables for proper download functionality
  - dependencies: [T004], [T007]

- [ ] **T011: Implement buffering for smaller files**

  - Add logic to use arrayBuffer instead of streaming for files below threshold
  - Configure size threshold via environment variable
  - Add Content-Length header when using buffered approach
  - dependencies: [T009]

- [ ] **T012: Enhance client-side error handling**
  - Improve error display in DownloadButton component
  - Add structured error objects with error codes and messages
  - Provide more user-friendly error messages based on error type
  - dependencies: none

## Testing and Verification

- [ ] **T013: Create proxy download test suite**

  - Implement tests for proxy functionality
  - Test different error scenarios (network errors, timeouts)
  - Test fallback mechanism from CDN to non-CDN URLs
  - dependencies: [T002], [T005], [T009]

- [ ] **T014: Implement end-to-end download tests**

  - Create E2E tests for download flow
  - Test both chapter and full book downloads
  - Verify downloads work in CI environment
  - dependencies: [T008], [T009], [T010]

- [ ] **T015: Create manual verification checklist**
  - Define testing protocol for downloads
  - Test across environments (local, preview, production)
  - Test various book types and chapter configurations
  - dependencies: [T008], [T009], [T010]

## Monitoring and Documentation

- [ ] **T016: Implement correlation IDs for request tracking**

  - Generate unique ID on client for each download attempt
  - Propagate ID to server-side logs
  - Use ID to link client and server logs for each download
  - dependencies: [T001]

- [ ] **T017: Set up monitoring for download success/failure rates**

  - Track download initiation and completion events
  - Configure monitoring to show success rates over time
  - Create alerts for unusual error patterns
  - dependencies: [T016]

- [ ] **T018: Document download architecture and flow**

  - Create diagrams showing download process
  - Document proxy vs. direct approaches with tradeoffs
  - Explain environment configuration requirements
  - dependencies: [T015]

- [ ] **T019: Create troubleshooting guide for download issues**
  - Document common failure modes
  - List debugging steps for each failure type
  - Include references to logs and monitoring
  - dependencies: [T018]

## Future Improvements

- [ ] **T020: Research direct CDN download options**

  - Investigate configuring CORS headers on CDN
  - Evaluate direct download approach with fallback to proxy
  - Research CDN configuration options to eliminate proxy requirement
  - dependencies: [T018]

- [ ] **T021: Design simplified download architecture**
  - Evaluate eliminating two-step process
  - Consider direct CDN access with proper CORS headers
  - Propose more robust, simpler implementation
  - dependencies: [T020]
