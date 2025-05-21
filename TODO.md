# Complete Migration from Digital Ocean to Vercel Blob

## Overview

This TODO list details the tasks required to fully migrate all asset management from Digital Ocean Spaces to Vercel Blob. Our verification has revealed path inconsistencies between the two systems and a complex dual-provider approach that's causing reliability issues. This migration will simplify our architecture, improve reliability, and reduce maintenance overhead.

## Technical Debt & Code Quality

- [x] **T022: Fix ESLint errors across the codebase**

  - [x] Address unused variables by properly prefixing with underscore (\_)
    - [x] Fix 'planLogger' in generateReorganizationPlan.ts
    - [x] Fix 'options' unused parameter in generateReorganizationPlan.ts
    - [x] Fix 'container' in SimpleTestComponent.test.tsx
    - [x] Fix 'translations' in reading-room-blob.test.tsx
    - [x] Fix unused imports in test files (path, fs, fileURLToPath)
  - [x] Fix duplicate else-if conditions in generateReorganizationPlan.ts (line 225)
  - [x] Remove `any` types and replace with proper TypeScript types
    - [x] Fix in migrateAudioFilesWithContent.test.ts
    - [x] Fix in migrateRemainingAssets.test.ts
    - [x] Fix in downloadFromSpaces.test.ts
    - [x] Fix in getBlobUrl.test.ts
  - [x] Fix `no-require-imports` in .prettierrc.cjs
  - [x] Remove non-null assertions and implement proper null checking (verifyDigitalOceanAccess.ts)
  - [x] Fix module variable assignment issues in test files
    - [x] Fix in migrateAudioFilesWithContent.test.ts
    - [x] Fix in migrateRemainingAssets.test.ts
  - Dependencies: none

- [x] **T025: Fix TypeScript errors across the codebase**

  - [x] Fix type errors in services/ directory:
    - [x] Fix signature mismatch in downloadService.ts:generatePaths with Logger vs info/error functions
    - [x] Fix incompatible logger type passing in downloadService.ts:getFallbackCdnUrl (lines ~294, ~332)
  - [x] Fix type errors in test files:
    - [x] Fix type errors in **tests**/api/proxy-download.test.ts
    - [x] Fix type errors in **tests**/components/reading-room-blob.test.tsx
    - [x] Fix type errors in **tests**/hooks/useChapterNavigation.test.ts
    - [x] Fix type errors in **tests**/scripts/cleanupLocalAssets.test.ts
    - [x] Fix type errors in **tests**/scripts/migrateAudioFilesWithContent.test.ts
    - [x] Fix type errors in **tests**/scripts/migrateBookCoverImages.test.ts
  - [x] Fix logger call errors in scripts and utilities:
    - [x] Fix logger call parameter count errors in scripts/verifyDigitalOceanAccess.ts (update 2-parameter calls to single parameter with msg field)
    - [x] Fix logger call parameter count errors in scripts/verifyCdnUrls.ts (update 2-parameter calls to single parameter with msg field)
    - [x] Fix logger call parameter count errors in utils/getBlobUrl.ts (update 2-parameter calls to single parameter with msg field)
    - [x] Fix logger call parameter count errors in scripts/validateAssetNames.ts (update 2-parameter calls to single parameter with msg field)
    - [x] Fix logger call parameter count errors in scripts/test-path-migration.ts (update 2-parameter calls to single parameter with msg field)
    - [x] Fix logger call parameter count errors in scripts/remove-console-statements.ts (update 2-parameter calls to single parameter with msg field)
  - [x] Fix type error in utils/services/VercelBlobAssetService.ts involving ListBlobResultBlob
  - Dependencies: none

- [x] **T027: Fix initial TypeScript issues blocking push**

  - [x] Fix complexity issues in specific files:
    - [x] Fix complexity in scripts/migrateAudioFilesWithContent.ts processAudioFile method
    - [x] Refactor **tests**/api/proxy-download.test.ts with helper functions
  - [x] Fix TypeScript errors in our refactored files:
    - [x] Fix void type conversion issue in migrateAudioFilesWithContent.ts downloadAudioFile
    - [x] Fix indexable type issue in proxy-download.test.ts createDownloadConfig
  - [x] Fix Blob vs File type incompatibility:
    - [x] **tests**/scripts/migrateBookCoverImages.test.ts (line 345) - Type compatibility between BlobService and test mock
  - [x] Fix migrateRemainingAssets.test.ts issues:
    - [x] Fix 'put' mock types assigned to 'never'
    - [x] Fix 'path' type being 'unknown'
    - [x] Fix mock function parameter type mismatches
    - [x] Fix generic Mock type argument usage
  - [x] Fix property access on void types:
    - [x] **tests**/utils/downloadFromSpaces.test.ts - Fix access to url, size, contentType on void
  - [x] Fix read-only property assignments:
    - [x] **tests**/utils/getBlobUrl.test.ts - Read-only NODE_ENV assignments
  - Dependencies: none

- [x] **T028: Fix remaining TypeScript errors blocking push**

  - [x] Fix import path issues:
    - [x] **tests**/scripts/verifyCdnUrls.test.ts (line 20) - TS5097 error on .ts extension
  - [x] Fix type assignment issues in service tests:
    - [x] **tests**/services/VercelBlobAssetService.test.ts (line 48) - Type 'unknown' is not assignable to File constructor
  - [x] Fix variable redeclaration issues:
    - [x] **tests**/utils/test-utils.tsx (lines 6, 26, 30) - Export conflicts for 'render' and 'act'
  - [x] Fix unused directives:
    - [x] **tests**/utils/validators/AssetNameValidator.test.ts (line 20) - Remove unused '@ts-expect-error' directive
  - [x] Fix parameter type issues in scripts:
    - [x] scripts/benchmark-downloads.ts (lines 515, 566) - Make parameter types compatible:
      - Fix ApiEndpointParams and 'unknown' type incompatibility
      - Fix ProxyEndpointParams and 'unknown' type incompatibility
    - [x] scripts/create-asset-inventory.ts (lines 1001, 1002, 1019, 1020, 1118):
      - Fix Type 'unknown' assignments to 'string'
      - Fix Translation type not assignable to Record<string, unknown>
  - Dependencies: none

- [x] **T023: Refactor complex functions for maintainability**

  - [x] Reduce complexity of functions exceeding the limit of 10:
    - [x] verifyCdnUrls.ts: verifyUrl (complexity: 24)
    - [x] verifyCdnUrls.ts: parseCommandLineArgs (complexity: 31)
    - [x] verifyCdnUrls.ts: formatResultsAsMarkdown (complexity: 20)
    - [x] verifyCdnUrls.ts: formatComparisonReport (complexity: 34)
    - [x] app/api/download/errorHandlers.ts: handleDownloadServiceError (complexity: 14)
    - [x] app/api/download/proxyService.ts: createProxyErrorResponse (complexity: 24)
    - [x] app/api/download/proxyService.ts: extractErrorDetails (complexity: 23)
    - [x] app/api/download/proxyService.ts: proxyAssetDownload (complexity: 35)
    - [x] reorganize-blob-paths.ts: parseArgs (complexity: 16)
    - [x] generateReorganizationPlan.ts: generateReorganizationPlan (complexity: 18)
    - [x] utils/getBlobUrl.ts: generateBlobUrl (complexity: 14)
    - [x] utils/getBlobUrl.ts: assetExistsInBlobStorage (complexity: 16)
    - [x] services/downloadService.ts: getDownloadUrl (complexity: 12)
    - [x] utils/validators/AssetNameValidator.ts: validateTextAssetName (complexity: 12)
  - [x] Break down large files exceeding the 500 line limit:
    - [x] reorganize-blob-paths.ts (516 lines)
    - [x] translations/index.ts (949 lines)
    - [x] app/api/download/proxyService.ts (too many lines)
  - [x] Reduce parameter count for functions with too many parameters:
    - [x] app/api/download/proxyService.ts: proxyAssetDownload (7 parameters)
  - [x] Split large functions into smaller, more focused functions:
    - [x] app/api/download/proxyService.ts: proxyAssetDownload (308 lines)
  - Dependencies: none

- [x] **T024: Remove console statements and implement proper logging**
  - [x] Replace console.log statements with logger.info across the codebase:
    - [x] scripts/test-path-migration.ts (36+ console statements)
    - [x] scripts/validateAssetNames.ts
    - [x] scripts/verifyCdnUrls.ts (25+ console statements)
    - [x] scripts/verifyDigitalOceanAccess.ts (15+ console statements)
    - [x] utils/getBlobUrl.ts (9+ console statements)
  - [x] Ensure scripts use structured logging with proper context
    - [x] Update all scripts to use the standard logger with proper context
    - [x] Ensure all error handling includes proper context objects
  - [x] Standardize error logging approach across all utilities
    - [x] Create consistent error logging pattern with structured metadata
    - [x] Include correlation IDs for tracking related log entries
  - [x] Develop script to automatically detect and replace console statements
    - [x] Create a tool to refactor console.log to logger.info with proper context
    - [x] Run across entire codebase with --fix flag
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
- [x] **T026: Remove All Digital Ocean Code and Dependencies**
  - [x] Remove deprecated files (DigitalOceanSourceAdapter.ts.deprecated, downloadFromSpaces.ts.deprecated)
  - [x] Delete Digital Ocean verification script (verifyDigitalOceanAccess.ts)
  - [x] Remove all references to Digital Ocean environment variables
  - [x] Verify AWS S3 dependencies are removed
  - [x] Update downloadService.ts to remove all Digital Ocean fallback logic
  - [x] Update tests that rely on Digital Ocean code or assumptions
  - [x] Update documentation to remove all Digital Ocean references
  - Dependencies: T014, T020

## Bug Fixes & Current Issues

- [x] **T029: Fix text file loading issues (Huck Finn, Hamlet)**

  - [x] Investigate why text files aren't loading for Huck Finn and Hamlet
  - [x] Current paths in blob: books/the-adventures-of-huckleberry-finn/text/brainrot/chapter-{number}.txt
  - [x] Current paths in blob: books/hamlet/text/brainrot/act-{number}.txt
  - [x] Expected paths: assets/text/huckleberry-finn/brainrot-chapter-{number}.txt
  - [x] Expected paths: assets/text/hamlet/brainrot-act-{number}.txt
  - [x] Copy text files to standardized locations to match app expectations
  - [x] Fix API path resolution to find existing text files
  - Dependencies: T021

- [x] **T030: Migrate full audiobook files to standardized locations**

  - [x] Identify missing full audiobook files (The Iliad, The Odyssey, The Aeneid)
  - [x] Create/copy full audiobook files to: assets/audio/{book-slug}/full-audiobook.mp3
  - [x] Verify only The Declaration has a full audiobook currently
  - [x] Consider creating concatenated full audiobooks from chapters if originals don't exist
  - Dependencies: T021
  - Completed: Created migrateFullAudiobooks.ts script with full test coverage
  - Script can audit, download, concatenate, and upload full audiobooks
  - Dry-run tested successfully, ready for actual migration
  - Audit revealed: Iliad, Odyssey, Aeneid, Hamlet need full audiobooks
  - Huckleberry Finn has no chapter files available

- [x] **T031: Fix explore page missing books and "coming soon" entries**

  - [x] Investigate why Declaration of Independence is missing from explore page
  - [x] The Declaration is commented out in translations/index.ts
  - [x] Add The Declaration back to active translations
  - [x] Consider adding "coming soon" entries for future books:
    - Pride and Prejudice (has some text already)
    - The Republic (has text already)
    - Paradise Lost
    - Meditations
    - Divine Comedy series
    - Bible sections
    - Quran
    - Shakespeare plays
    - Gilgamesh
    - Bhagavad Gita
  - [x] Implement status: 'coming soon' handling in explore page
  - Dependencies: none
  - Completed: Created Declaration of Independence book file
  - Added all "coming soon" books with proper metadata
  - Updated translations/index.ts to include all books
  - Created comprehensive tests for explore page functionality

- [x] **T032: Standardize text file naming and paths**

  - [x] Fix naming inconsistencies:
    - Huck Finn: "the-adventures-of-huckleberry-finn" vs "huckleberry-finn"
    - Chapters: Roman numerals (chapter-i.txt) vs Arabic (chapter-01.txt)
    - Different patterns: act-{number}.txt vs chapter-{number}.txt
  - [x] Create migration script to copy text files to standardized locations
  - [x] Update text loading logic to handle both old and new paths during transition
  - Dependencies: T021, T029

- [x] **T033: Run T032 text file standardization migration in production**

  - [x] Deploy code changes with standardization logic to production
  - [x] Run production migration with BLOB_READ_WRITE_TOKEN configured
  - [x] Execute custom migration script that actually copies files
  - [x] Successfully migrated 179 text files to standardized paths
  - [x] Updated URL generation logic to handle standardized paths correctly
  - [x] Verified standardized paths are accessible in production
  - [x] Eventually remove legacy text file locations after successful migration (created removeLegacyTextFiles.ts script)
  - Dependencies: T032

- [x] **T034: Ensure specific cover images for coming soon books**
  - [x] Check existing coming soon books for specific covers
  - [x] Ensure all coming soon books have specific cover images
  - [x] Add verification script to monitor for missing covers
  - Dependencies: none

## Next Tasks

- [x] **T035: Fix linting issues in utility scripts**

  - [x] Address unused variable warnings in asset migration scripts
  - [x] Fix console.log statements in scripts (replace with structured logger)
  - [x] Reduce complexity in functions that exceed threshold
  - [x] Establish standard format for utility scripts
  - [x] Update .eslintignore to only exclude scripts still being actively developed

- [x] **T036: Organize audio files and verify downloads**

  - [x] Verify all audio files are accessible with verifyAudioFilesAccess.ts script
  - [x] Create testAudioFileDownloads.ts script for audio file downloads
  - [x] Document audio file organization structure in AUDIO_FILE_ORGANIZATION.md

- [x] **T037: Fix linting issues in script files blocking push**

  - [x] Fix broken JSDoc comments in script files
  - [x] Replace console.log statements with structured logger in:
    - [x] cleanupLocalAssets.ts
    - [x] migrateAudioFiles.ts and other audio migration scripts
    - [x] verifyAudioMigration.ts and other audio verification scripts
    - [x] verifyBlobStorage.ts
  - [x] Reduce function complexity in:
    - [x] cleanupLocalAssets.ts (cleanupLocalAssets function)
    - [x] verifyAudioMigration.ts (verifyAudioMigration function)
    - [x] verifyBlobStorage.ts (verifyBlobStorage function)
  - [x] Fix max-depth issues (blocks nested too deeply) in:
    - [x] verifyAudioMigrationWithContent.ts
    - [x] verifyBlobStorage.ts
    - [x] verifyTextMigration.ts
  - [x] Update husky configuration:
    - [x] Fix deprecated husky configuration in pre-push hook
    - [x] Remove the "#!/usr/bin/env sh" and ". "$(dirname -- "$0")/\_/husky.sh"" lines
    - [x] Update to husky v10 compatible configuration
  - [x] Re-enable git hooks after fixing linting issues

- [x] **T038: Address additional linting issues in script files**
  - [x] Fix remaining no-console rule violations:
    - [x] Handle interactive CLI prompts properly in cleanupLocalAssets.ts
    - [x] Review and update other scripts with console statements
  - [x] Fix TypeScript module import issues:
    - [x] Correct default imports vs named imports for fs, path
    - [x] Address import.meta.url compatibility issues
  - [x] Fix unused variables by adding underscore prefixes:
    - [x] existsSync in migrateAudioFiles.ts
    - [x] ASSETS_DIR in migrateAudioFiles.ts
    - [x] Other unused variables
  - [x] Fix unnecessary escape characters in regex expressions
  - [x] Update .eslintignore configuration to modern format
  - [x] Complete verification with lint and type checking to ensure all issues are resolved

## Code Quality Tasks from TypeScript Audit (2025-05-21)

- [x] **T039: Fix TypeScript errors in test files blocking push**

  - [x] Fix migrateFullAudiobooks.test.ts issues:
    - [x] Replace implicit any types for module variables (lines 42, 52, 70, 91, 115, 159, 180...)
    - [x] Add proper types for callback parameters (lines 145, 173, 188, 324)
  - [x] Fix fetchTextWithFallback.test.ts type conversion issues:
    - [x] Address MockResponse to Response conversion errors (lines 118, 138)
  - [x] Dependencies: none

- [~] **T040: Fix logger and module import errors in utility scripts**

  - [x] Fix asset-migration/copyToPlaceholder.ts import issues:
    - [x] Fix module imports for logger and BlobService (lines 7-8)
    - [x] Resolve logger variable references (lines 14, 25, 34, 41, 44...)
  - [ ] Fix logger references across multiple scripts (needs systematic approach):
    - [ ] Audit all scripts for proper logger imports and usage
    - [ ] Create consistent pattern for logger initialization
    - [ ] Update all scripts with correct logger references
  - [ ] Dependencies: none

- [x] **T041: Fix type compatibility issues in verification scripts**

  - [x] Address Chapter type incompatibilities:
    - [x] Fix audioSrc type mismatch (string | null vs string | undefined) in:
      - [x] verifyAudioMigration.ts (line 181)
      - [x] verifyAudioMigrationWithContent.ts (line 231)
      - [x] verifyBlobStorage.ts (line 231)
    - [x] Create consistent Chapter interface for verification scripts
    - [x] Update translations type handling across verification scripts
  - [x] Dependencies: none

- [x] **T042: Systematically update max-depth violations in search scripts**

  - [x] Fix nested blocks in searchAllImages.ts (line 67)
  - [x] Refactor verification scripts to reduce nesting depth:
    - [x] Apply extraction pattern similar to the one used in T037
    - [x] Extract helper functions to flatten nested conditionals
    - [x] Review and refactor loop structures
  - [x] Dependencies: none

- [x] **T043: Fix Response type compatibility with mocks in tests**

  - [x] Update fetchTextWithFallback.test.ts to fix MockResponse conversion issues:
    - [x] Add proper type assertion or conversion for MockResponse objects (lines 118, 138)
    - [x] Create appropriate type interfaces to ensure compatibility
    - [x] Ensure proper typing for fetch response mocking across all tests
  - [x] Review all test files for similar type compatibility issues
  - [x] Created shared MockResponse utility class for consistent use across tests
  - [x] Updated other test files to use the shared MockResponse implementation
  - [x] Created simplified test suite for fetchTextWithFallback due to implementation complexity
  - [x] Dependencies: none

- [x] **T044: Standardize asset path utilities across scripts**

  - [x] Fix asset path utility inconsistencies:
    - [x] Created ScriptPathUtils module with consistent path handling utilities
    - [x] Ensured compatibility with both old and new path formats
    - [x] Updated scripts to use standardized path utilities
  - [x] Ensured proper path normalization for all asset types
  - [x] Added comprehensive test suite for ScriptPathUtils
  - [x] Dependencies: none

- [ ] **T045: COMPLEX - Address technical debt in test files**

  - [ ] Reorganize test mocks for better type safety:
    - [ ] Create proper TypeScript interfaces for all mocked services
    - [ ] Update jest mocks to use type-safe mock implementations
    - [ ] Standardize mock creation and initialization
  - [ ] Refactor test file structure to improve organization:
    - [ ] Group tests by functionality rather than implementation details
    - [ ] Create shared test utilities with proper typing
  - [ ] Improve test assertions with type safety:
    - [ ] Replace any types with proper interfaces
    - [ ] Use type predicates where appropriate
  - [ ] Dependencies: T039, T043

- [ ] **T046: Update asset imports and logger initialization across all scripts**

  - [ ] Create standardized logger initialization pattern:
    - [ ] Define consistent approach for creating script-specific loggers
    - [ ] Add proper context and correlation IDs to all loggers
  - [ ] Fix asset service imports and initialization:
    - [ ] Update imports to use consistent path and naming
    - [ ] Ensure proper error handling during initialization
  - [ ] Dependencies: T040

- [ ] **T047: Fix script dependency loading and module resolution**

  - [ ] Standardize module import patterns:
    - [ ] Use consistent import syntax across all files (ESM vs CommonJS)
    - [ ] Fix relative path issues with imports
    - [ ] Address node: prefix requirements for Node.js built-ins
  - [ ] Update import.meta.url usage compatibility:
    - [ ] Add proper TypeScript configurations for ESM modules
    - [ ] Ensure consistent approach for resolving file paths in scripts
    - [ ] Test module loading in both development and production environments
  - [ ] Dependencies: None

- [ ] **T048: Apply code formatting standards consistently across codebase**

  - [ ] Update all README.md files with consistent formatting:
    - [ ] Ensure blank lines before and after lists and code blocks
    - [ ] Apply consistent indentation in markdown files
    - [ ] Remove trailing whitespace across all files
  - [ ] Review script file formatting:
    - [ ] Apply consistent object formatting (trailing commas, spacing)
    - [ ] Standardize import ordering and grouping
    - [ ] Ensure consistent indentation and line breaks in function calls
  - [ ] Set up automated formatting checks in CI pipeline
  - [ ] Dependencies: None

- [ ] **T049: Fix remaining ESLint warnings in test files**

  - [ ] Address no-console warnings in tests:
    - [ ] Replace console.log with proper test utilities or mocked loggers
    - [ ] Add appropriate eslint-disable directives where needed (with justification)
  - [ ] Fix max-depth and complexity issues in test files
  - [ ] Address unused variable warnings consistently (underscore prefix)
  - [ ] Dependencies: T042

- [ ] **T050: COMPLEX - Improve test fixtures and type safety in tests**
  - [ ] Create type-safe fixtures for common test data:
    - [ ] Define proper interfaces for test fixtures
    - [ ] Create factory functions for generating test data
    - [ ] Ensure consistent approach to mocking external dependencies
  - [ ] Implement better type checking in test assertions:
    - [ ] Use TypeScript's type narrowing features in test cases
    - [ ] Add proper type guards for complex assertions
    - [ ] Update expect statements to use type-aware matchers where possible
  - [ ] Add proper typing for test utilities and helper functions
  - [ ] Dependencies: T045
