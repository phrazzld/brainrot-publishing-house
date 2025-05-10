# Complete Migration from Digital Ocean to Vercel Blob

## Overview

This TODO list details the tasks required to fully migrate all asset management from Digital Ocean Spaces to Vercel Blob. Our verification has revealed path inconsistencies between the two systems and a complex dual-provider approach that's causing reliability issues. This migration will simplify our architecture, improve reliability, and reduce maintenance overhead.

## Technical Debt & Code Quality

- [ ] **T022: Fix ESLint errors across the codebase**
  - [ ] Address unused variables by properly prefixing with underscore (_)
      - [ ] Fix 'planLogger' in generateReorganizationPlan.ts
      - [ ] Fix 'options' unused parameter in generateReorganizationPlan.ts
      - [ ] Fix 'container' in SimpleTestComponent.test.tsx
      - [ ] Fix 'translations' in reading-room-blob.test.tsx
      - [ ] Fix unused imports in test files (path, fs, fileURLToPath)
  - [ ] Fix duplicate else-if conditions in generateReorganizationPlan.ts (line 225)
  - [ ] Remove `any` types and replace with proper TypeScript types
      - [ ] Fix in migrateAudioFilesWithContent.test.ts
      - [ ] Fix in migrateRemainingAssets.test.ts
      - [ ] Fix in downloadFromSpaces.test.ts
      - [ ] Fix in getBlobUrl.test.ts
  - [ ] Fix `no-require-imports` in .prettierrc.cjs
  - [ ] Remove non-null assertions and implement proper null checking (verifyDigitalOceanAccess.ts)
  - [ ] Fix module variable assignment issues in test files
      - [ ] Fix in migrateAudioFilesWithContent.test.ts
      - [ ] Fix in migrateRemainingAssets.test.ts
  - Dependencies: none

- [ ] **T023: Refactor complex functions for maintainability**
  - [ ] Reduce complexity of functions exceeding the limit of 10:
      - [ ] verifyCdnUrls.ts: verifyUrl (complexity: 24)
      - [ ] verifyCdnUrls.ts: parseCommandLineArgs (complexity: 31)
      - [ ] verifyCdnUrls.ts: formatResultsAsMarkdown (complexity: 20)
      - [ ] verifyCdnUrls.ts: formatComparisonReport (complexity: 34)
      - [ ] app/api/download/errorHandlers.ts: handleDownloadServiceError (complexity: 14)
      - [ ] app/api/download/proxyService.ts: createProxyErrorResponse (complexity: 24)
      - [ ] app/api/download/proxyService.ts: extractErrorDetails (complexity: 23)
      - [ ] app/api/download/proxyService.ts: proxyAssetDownload (complexity: 35)
      - [ ] reorganize-blob-paths.ts: parseArgs (complexity: 16)
      - [ ] generateReorganizationPlan.ts: generateReorganizationPlan (complexity: 18)
      - [ ] utils/getBlobUrl.ts: generateBlobUrl (complexity: 14)
      - [ ] utils/getBlobUrl.ts: assetExistsInBlobStorage (complexity: 16)
      - [ ] services/downloadService.ts: getDownloadUrl (complexity: 12)
      - [ ] utils/validators/AssetNameValidator.ts: validateTextAssetName (complexity: 12)
  - [ ] Break down large files exceeding the 500 line limit:
      - [ ] reorganize-blob-paths.ts (516 lines)
      - [ ] translations/index.ts (949 lines)
      - [ ] app/api/download/proxyService.ts (too many lines)
  - [ ] Reduce parameter count for functions with too many parameters:
      - [ ] app/api/download/proxyService.ts: proxyAssetDownload (7 parameters)
  - [ ] Split large functions into smaller, more focused functions:
      - [ ] app/api/download/proxyService.ts: proxyAssetDownload (308 lines)
  - Dependencies: none

- [ ] **T024: Remove console statements and implement proper logging**
  - [ ] Replace console.log statements with logger.info across the codebase:
      - [ ] scripts/test-path-migration.ts (36+ console statements)
      - [ ] scripts/validateAssetNames.ts
      - [ ] scripts/verifyCdnUrls.ts (25+ console statements)
      - [ ] scripts/verifyDigitalOceanAccess.ts (15+ console statements)
      - [ ] utils/getBlobUrl.ts (9+ console statements)
  - [ ] Ensure scripts use structured logging with proper context
      - [ ] Update all scripts to use the standard logger with proper context
      - [ ] Ensure all error handling includes proper context objects
  - [ ] Standardize error logging approach across all utilities
      - [ ] Create consistent error logging pattern with structured metadata
      - [ ] Include correlation IDs for tracking related log entries
  - [ ] Develop script to automatically detect and replace console statements
      - [ ] Create a tool to refactor console.log to logger.info with proper context
      - [ ] Run across entire codebase with --fix flag
  - Dependencies: none

## Phase 1: Audit & Planning

- [x] **T001: Create Comprehensive Asset Inventory**

  - ✅ Develop script to catalog all assets from both storage systems
  - ✅ Map each asset to its expected location in translations data
  - ✅ Identify missing/inconsistent assets or duplicate files
  - ✅ Document current path patterns and inconsistencies
  - ✅ Created `create-asset-inventory.ts` script
  - Dependencies: none

- [x] **T002: Design Unified Blob Path Structure**

  - ✅ Define clear, consistent path structure for all asset types (audio, text, images)
  - ✅ Document path naming conventions and hierarchy
  - ✅ Create migration mapping between current and new paths
  - ✅ Address the "books/" prefix inconsistency
  - ✅ Created `docs/UNIFIED_BLOB_PATH_STRUCTURE.md` with comprehensive design
  - ✅ Implemented `utils/services/AssetPathService.ts` with full tests
  - Dependencies: T001

- [x] **T003: Define Asset Service API Contract**
  - ✅ Design unified asset service interface that abstracts storage details
  - ✅ Define required methods (getUrl, exists, fetch, etc.)
  - ✅ Document all method signatures and return types
  - ✅ Create TypeScript interfaces for service contracts
  - ✅ Created `types/assets.ts` with full type definitions
  - ✅ Created `docs/ASSET_SERVICE_DESIGN.md` with comprehensive design
  - Dependencies: none

## Phase 2: Asset Migration & Verification

- [x] **T004: Create Path Reorganization Tool for Vercel Blob**

  - ✅ Develop script to reorganize existing assets WITHIN Vercel Blob to follow the new path structure
  - ✅ Use AssetPathService to map current Blob paths to new standardized paths
  - ✅ Support dry-run mode to preview path changes without executing
  - ✅ Include verification to ensure all assets remain accessible after reorganization
  - ✅ Generate detailed HTML and JSON reports of path changes
  - ✅ Focus on standardizing path structure, not migrating between systems
  - ✅ Created `scripts/reorganize-blob-paths.ts` with path mapping and verification
  - ✅ Added npm scripts: `reorganize:blob`, `reorganize:blob:dry`, `reorganize:blob:verbose`
  - Dependencies: T001, T002

- [x] **T005: Standardize Text Assets in Vercel Blob**

  - ✅ Created audit tools to analyze and report on text assets in Vercel Blob
  - ✅ Developed scripts to catalog text asset path inconsistencies
  - ✅ Implemented clear reporting with HTML and JSON output
  - ✅ Integrated with reorganization tool from T004 for path standardization
  - ✅ Created unified tooling for asset auditing and reorganization
  - ✅ Added detailed reports to identify assets needing path standardization
  - ✅ Extended approach to cover image and audio assets as well
  - ✅ Created comprehensive reorganization planning tool
  - ✅ Added npm scripts for all audit and reorganization operations
  - Dependencies: T004

- [x] **T006: Standardize Image Assets in Vercel Blob**

  - ✅ Created audit tools to analyze and report on image assets in Vercel Blob
  - ✅ Developed scripts to catalog image asset path inconsistencies
  - ✅ Implemented clear reporting with HTML and JSON output
  - ✅ Integrated with reorganization tool from T004 for path standardization
  - ✅ Supported various image categories (book-specific, shared, site assets)
  - ✅ Added npm scripts for image asset auditing
  - ✅ Included in comprehensive reorganization planning tool
  - Dependencies: T004, T005

- [x] **T007: Standardize Audio Assets in Vercel Blob**

  - ✅ Created audit tools to analyze and report on audio assets in Vercel Blob
  - ✅ Developed scripts to catalog audio asset path inconsistencies
  - ✅ Implemented clear reporting with HTML and JSON output
  - ✅ Integrated with reorganization tool from T004 for path standardization
  - ✅ Supported various audio types (chapter, full audiobook)
  - ✅ Added npm scripts for audio asset auditing
  - ✅ Included in comprehensive reorganization planning tool
  - Dependencies: T004, T005

- [x] **T008: Implement Asset Verification Tests**
  - ✅ Create test suite for accessing all assets with standardized paths
  - ✅ Test direct URL access for each asset type
  - ✅ Implement verification for file integrity and metadata
  - ✅ Develop regression tests for future changes
  - ✅ Update existing tests to use standardized paths
  - ✅ Create a test fixture with mock assets for CI
  - Dependencies: T005, T006, T007

## Phase 3: Code Refactoring

- [x] **T009: Implement Unified Asset Service**

  - ✅ Created new VercelBlobAssetService class implementing the AssetService interface
  - ✅ Implemented support for Vercel Blob as the only storage backend
  - ✅ Added detailed structured logging for all operations
  - ✅ Implemented robust error handling with retry mechanisms
  - ✅ Created comprehensive test suite to verify functionality
  - ✅ Added AssetServiceFactory for dependency injection and configuration
  - Dependencies: T003, T008

- [x] **T010: Refactor BlobPathService**

  - ✅ Updated to ensure consistent path generation through AssetPathService
  - ✅ Simplified implementation by delegating to AssetPathService
  - ✅ Maintained backward compatibility for existing code
  - ✅ Added appropriate deprecation notices to encourage migration
  - ✅ Added comprehensive tests for all methods
  - Dependencies: T002

- [x] **T011: Update Download API Routes**

  - ✅ Modified API route to use the new unified asset service
  - ✅ Removed all Digital Ocean and fallback logic
  - ✅ Updated error handling to use AssetError types
  - ✅ Added detailed logging for troubleshooting
  - ✅ Updated tests to verify new functionality
  - Dependencies: T009

- [x] **T012: Update Proxy Download Handler**

  - ✅ Refactor proxy download to use unified asset service
  - ✅ Simplify streaming logic without fallbacks
  - ✅ Enhance error reporting for troubleshooting
  - ✅ Add performance metrics for monitoring
  - ✅ Added new proxyAssetDownload function with comprehensive tests
  - ✅ Maintained backward compatibility with legacy proxyFileDownload
  - Dependencies: T009, T011

- [x] **T021A: Refactor Download Service**

  - ✅ Integrated unified asset service with consistent error handling
  - ✅ Added robust proxy mechanism for serving files through the API
  - ✅ Implemented comprehensive logging for performance monitoring
  - ✅ Enhanced error responses with detailed context and proper status codes
  - ✅ Improved URL generation with standardized path structure
  - ✅ Added complete test suite for direct and proxied downloads
  - Dependencies: T009, T011, T012

- [x] **T013: Refactor Client-Side Components**
  - ✅ Updated DownloadButton component to use new unified asset service API
  - ✅ Updated error handling with improved error message extraction
  - ✅ Modified to always use proxy downloading for consistency
  - ✅ Fixed class name handling for empty classNames
  - ✅ Updated tests to match new implementation
  - Dependencies: T011

## Phase 4: Clean Up & Documentation

- [x] **T014: Remove Digital Ocean Dependencies**

  - ✅ Removed @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner dependencies
  - ✅ Removed aws-sdk dependency
  - ✅ Deprecated unused S3/DO integration code by renaming files
  - ✅ Documented deprecated DO environment variables
  - ✅ Created comprehensive environment variable documentation
  - Dependencies: T009, T011, T012, T013

- [x] **T015: Update Configuration Documentation**

  - ✅ Created detailed documentation for Vercel Blob setup
  - ✅ Documented required environment variables
  - ✅ Added troubleshooting guide for common issues
  - ✅ Included links to Vercel Blob documentation
  - Dependencies: T014

- [x] **T016: Create Asset Management Guide**

  - ✅ Documented asset path structure and naming conventions
  - ✅ Created guide for adding new assets to the system
  - ✅ Documented asset service API and usage patterns
  - ✅ Included examples for common operations
  - Dependencies: T009, T010, T015

- [x] **T017: Implement Monitoring for Asset Access**
  - ✅ Added structured logging for all asset operations
  - ✅ Created dashboard for monitoring asset access patterns
  - ✅ Set up alerts for failed access attempts
  - ✅ Documented monitoring approach in ASSET_MONITORING.md
  - Dependencies: T009

## Phase 5: Testing & Verification

- [x] **T018: Run End-to-End Download Tests**

  - ✅ Implemented comprehensive E2E test script
  - ✅ Added tests for both direct and proxied downloads
  - ✅ Included support for testing in various environments
  - ✅ Added performance metrics and content verification
  - ✅ Created detailed HTML and JSON reporting
  - ✅ Documented testing approach in E2E_DOWNLOAD_TESTING.md
  - Dependencies: All code refactoring tasks

- [x] **T019: Create Performance Baseline**

  - ✅ Created comprehensive benchmarking script for download performance
  - ✅ Established baseline metrics for different asset types and concurrency levels
  - ✅ Identified performance bottlenecks and optimization opportunities
  - ✅ Documented performance comparison with previous implementation
  - ✅ Created PERFORMANCE_BASELINE.md with detailed analysis and monitoring recommendations
  - Dependencies: T018

- [x] **T020: Complete Final Verification**

  - ✅ Verified all assets are accessible in production
  - ✅ Checked all references in translations data
  - ✅ Ensured no regressions in functionality
  - ✅ Created comprehensive verification report
  - ✅ Added verification script with detailed reporting
  - ✅ Documented results in FINAL_VERIFICATION_REPORT.md
  - Dependencies: T018, T019

- [x] **T021: COMPLEX - Create and implement standardized file naming convention**
  - ✅ Audited current file naming practices across ALL asset types
  - ✅ Resolved inconsistencies between implementation ("chapter-XX.mp3") and tests ("book-XX.mp3")
  - ✅ Defined explicit rules for each asset type (audio, text, images)
  - ✅ Created standardized rules for numeric components (zero-padding to 2 digits)
  - ✅ Updated AssetPathService to enforce these standards and use the validator
  - ✅ Documented migration plan for non-compliant legacy assets
  - ✅ Created AssetNameValidator utility to catch non-compliant paths
  - ✅ Created AssetNameMigration utility for converting legacy names
  - ✅ Created validateAssetNames.ts script for scanning assets
  - ✅ Documented conventions in ASSET_NAMING_CONVENTIONS.md
  - ✅ Updated all tests to use standardized file naming
  - Dependencies: T009, T010, T016
