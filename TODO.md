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

- [ ] **T010: Refactor BlobPathService**

  - Update to ensure consistent path generation
  - Remove legacy path conversion logic
  - Simplify API to more clearly represent asset types
  - Add tests for all methods
  - Dependencies: T002

- [ ] **T011: Update Download API Routes**

  - Modify API route to use the new unified asset service
  - Remove all Digital Ocean and fallback logic
  - Update error handling and response formats
  - Add detailed logging for troubleshooting
  - Dependencies: T009

- [ ] **T012: Update Proxy Download Handler**

  - Refactor proxy download to use unified asset service
  - Simplify streaming logic without fallbacks
  - Enhance error reporting for troubleshooting
  - Add performance metrics for monitoring
  - Dependencies: T009, T011

- [ ] **T013: Refactor Client-Side Components**
  - Update DownloadButton component to use new API
  - Modify any components that directly reference assets
  - Improve error handling and user feedback
  - Add loading states for better UX
  - Dependencies: T011

## Phase 4: Clean Up & Documentation

- [ ] **T014: Remove Digital Ocean Dependencies**

  - Remove @aws-sdk/client-s3 dependency
  - Delete unused S3/DO integration code
  - Remove DO environment variables from .env files
  - Update environment variable documentation
  - Dependencies: T009, T011, T012, T013

- [ ] **T015: Update Configuration Documentation**

  - Create detailed documentation for Vercel Blob setup
  - Document required environment variables
  - Add troubleshooting guide for common issues
  - Include links to Vercel Blob documentation
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
