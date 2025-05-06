# Migration Plan: Digital Ocean to Vercel Blob

## Overview

This document outlines the comprehensive plan to migrate all assets from Digital Ocean Spaces to Vercel Blob. The migration aims to simplify our architecture, improve reliability, and eliminate the path inconsistencies currently causing issues in our asset management system.

## Current State Assessment

Our application currently uses a complex dual-provider approach for asset storage:

1. **Digital Ocean Spaces (primary)**: Used for CDN delivery of assets

   - Path patterns: `{slug}/audio/{file}`, `{slug}/images/{file}`
   - CDN URL format: `https://{bucket}.{region}.cdn.digitaloceanspaces.com/{path}`
   - Fallback URL format: `https://{bucket}.{region}.digitaloceanspaces.com/{path}`

2. **Vercel Blob (secondary)**: Used as a fallback when Digital Ocean is unavailable
   - Path patterns: `books/{slug}/audio/{file}`, `books/{slug}/text/{file}`
   - URL format: `https://{tenant-id}.public.blob.vercel-storage.com/{path}`

### Key Issues

1. **Path Inconsistency**: Different path formats between storage providers

   - Digital Ocean uses `{slug}/audio/{file}`
   - Vercel Blob uses `books/{slug}/audio/{file}` in some places and `{slug}/audio/{file}` in others

2. **Complex Fallback Logic**: Error-prone fallback mechanisms with multiple storage providers

3. **Dual Configuration**: Maintaining configuration for two different storage systems

4. **Reliability Issues**: Path inconsistencies causing failed lookups and 500 errors

## Target State Architecture

We will establish a single, consistent asset storage solution using Vercel Blob with a clear path structure and API:

1. **Standardized Path Structure**:

   ```
   assets/{type}/{book-slug}/{asset-name}
   ```

2. **Unified Asset Service**:

   - Clear, consistent interface for all asset operations
   - Strong typing for all parameters and return values
   - Comprehensive error handling and logging
   - High-level methods for common asset operations

3. **Simple Configuration**:
   - Single set of environment variables
   - Validation of required configuration at startup
   - Clear documentation of all configuration options

## Migration Approach

We will follow a methodical, phased approach to ensure a smooth transition without disrupting the application:

### Phase 1: Audit & Planning

1. **Create Asset Inventory**:

   - Document all assets across both storage systems
   - Map assets to their references in translations
   - Identify missing or inconsistent assets
   - Document current path patterns

2. **Design New Path Structure**:

   - Define clear, consistent paths for all asset types
   - Document path construction rules
   - Create migration mapping between old and new paths

3. **Define Asset Service Contract**:
   - Design interface for all asset operations
   - Define error handling approach
   - Document service configuration requirements

### Phase 2: Asset Migration

1. **Create Migration Tool**:

   - Support both storage providers as sources
   - Handle path mapping between old and new structures
   - Include verification of migrated assets
   - Support dry-run mode for testing

2. **Migrate Assets in Sequence**:

   - Text assets (smallest, simplest)
   - Image assets (medium size)
   - Audio assets (largest, most critical)

3. **Verify Migration**:
   - Confirm all assets accessible in new locations
   - Verify file integrity and metadata
   - Compare content between old and new locations

### Phase 3: Code Refactoring

1. **Implement Asset Service**:

   - Create Vercel Blob implementation of the interface
   - Add comprehensive logging and error handling
   - Implement caching for performance

2. **Update Dependent Components**:

   - Modify API routes to use the new service
   - Update proxy download handler
   - Refactor client-side components

3. **Add Test Coverage**:
   - Unit tests for the asset service
   - Integration tests for asset access
   - End-to-end tests for download flow

### Phase 4: Clean Up & Documentation

1. **Remove Legacy Code**:

   - Delete Digital Ocean integration code
   - Remove unused dependencies
   - Clean up environment variables

2. **Update Documentation**:
   - Document new asset service
   - Update contribution guidelines
   - Create troubleshooting guide

### Phase 5: Validation & Monitoring

1. **Deploy & Test**:

   - Deploy to production
   - Verify all functionality
   - Perform load testing

2. **Implement Monitoring**:
   - Add asset access metrics
   - Set up alerts for failures
   - Create dashboard for asset performance

## Migration Tasks

Each phase of the migration is broken down into specific, actionable tasks in the updated TODO.md file. The tasks include dependencies, expected outcomes, and complexity assessments.

## Risk Mitigation

1. **Rollback Plan**:

   - Maintain both storage systems during transition
   - Keep old code paths available but inactive
   - Document rollback procedures

2. **Testing Strategy**:

   - Test in multiple environments (local, preview, production)
   - Verify both small and large assets
   - Test edge cases and error scenarios

3. **Incremental Approach**:
   - Migrate one asset type at a time
   - Verify each step before proceeding
   - Monitor performance and errors closely

## Timeline and Milestones

1. **Audit & Planning**: 1-2 days

   - Complete asset inventory
   - Finalize path structure
   - Define service interface

2. **Asset Migration**: 2-3 days

   - Develop migration tool
   - Migrate all assets
   - Verify migration success

3. **Code Refactoring**: 3-4 days

   - Implement asset service
   - Update dependent components
   - Add test coverage

4. **Clean Up & Documentation**: 1-2 days

   - Remove legacy code
   - Update documentation
   - Create user guides

5. **Validation & Monitoring**: 1-2 days
   - Deploy and validate
   - Implement monitoring
   - Create performance baseline

## Success Criteria

The migration will be considered successful when:

1. All assets are migrated to Vercel Blob with consistent paths
2. All application code uses the new asset service
3. Digital Ocean dependencies are removed
4. Download success rate is 99.9% or higher
5. Documentation is updated and accurate
6. Monitoring is in place for asset access

## Conclusion

This migration plan provides a clear, methodical approach to simplifying our asset management architecture. By transitioning to a single storage provider with consistent paths and a well-defined service interface, we'll improve reliability, maintainability, and performance of our asset access system.

The phased approach ensures we can verify each step of the migration and maintain the ability to roll back if necessary, minimizing risk to the application.
