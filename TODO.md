# Complete Migration from Digital Ocean to Vercel Blob

## Overview

This TODO list details the tasks required to fully migrate all asset management from Digital Ocean Spaces to Vercel Blob. Our verification has revealed path inconsistencies between the two systems and a complex dual-provider approach that's causing reliability issues. This migration will simplify our architecture, improve reliability, and reduce maintenance overhead.

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

- [ ] **T016: Create Asset Management Guide**

  - Document asset path structure and naming conventions
  - Create guide for adding new assets to the system
  - Document asset service API and usage patterns
  - Include examples for common operations
  - Dependencies: T009, T010, T015

- [ ] **T017: Implement Monitoring for Asset Access**
  - Add structured logging for all asset operations
  - Create dashboard for monitoring asset access patterns
  - Set up alerts for failed access attempts
  - Document monitoring approach
  - Dependencies: T009

## Phase 5: Testing & Verification

- [ ] **T018: Run End-to-End Download Tests**

  - Test download functionality across environments
  - Verify both direct and proxied downloads
  - Test with various file sizes and types
  - Document any issues or edge cases
  - Dependencies: All code refactoring tasks

- [ ] **T019: Create Performance Baseline**

  - Measure and document download performance
  - Establish baseline metrics for monitoring
  - Identify any performance bottlenecks
  - Compare with previous dual-provider approach
  - Dependencies: T018

- [ ] **T020: Complete Final Verification**

  - Verify all assets are accessible in production
  - Check all references in translations data
  - Ensure no regressions in functionality
  - Create verification report
  - Dependencies: T018, T019

- [ ] **T021: COMPLEX - Create and implement standardized file naming convention**
  - Audit current file naming practices across ALL asset types (critical)
  - Resolve inconsistencies between implementation ("chapter-XX.mp3") and tests ("book-XX.mp3")
  - Define explicit rules for each asset type (audio, text, images)
  - Create standardized rules for numeric components (padding, formatting)
  - Update AssetPathService to enforce these standards
  - Document migration plan for non-compliant legacy assets
  - Create a path validator to catch non-compliant paths
  - Update all tests to use standardized file naming
  - Dependencies: T009, T010, T016
