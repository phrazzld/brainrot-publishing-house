# T216 Plan: Complete Remaining Asset Migration

## Task Summary
Create and run a script to identify and migrate any remaining assets not yet in Blob storage, including any recently added content.

## Analysis of Current State

1. The project uses Vercel Blob Storage for various assets:
   - Book cover images
   - Book chapter images
   - Brainrot text files
   - Source text files
   - Audio files

2. Each asset type has specialized migration scripts, and there have been multiple migration efforts:
   - Initial migrations for most asset types were completed
   - Audio migration had issues with placeholder files
   - Audio files were fixed in a secondary migration

3. The verification script (`verifyBlobStorage.ts`) identifies missing assets by:
   - Checking assets referenced in the translations file
   - Verifying each asset exists in blob storage using `assetExistsInBlobStorage`
   - Generating a report of missing assets

4. Current issue: Some assets referenced in translations file are still missing from blob storage

## Strategy

1. **Identification**: Create a script that identifies all missing assets by leveraging the existing verification script, but capturing the specific missing assets into a structured format for migration.

2. **Migration**: Implement selective migration of just the missing assets using the existing migration scripts' patterns but focusing only on the identified missing assets.

3. **Verification**: After migration, run verification again to ensure all assets are now available.

## Implementation Plan

1. Create a new script `scripts/migrateRemainingAssets.ts` that:
   - Runs verification to identify missing assets
   - Groups missing assets by type (cover, chapter, audio, etc.)
   - Uses appropriate existing migration logic for each asset type
   - Handles edge cases like normalized URL paths

2. The script will use the following key components:
   - BlobService for interacting with Vercel Blob
   - BlobPathService for path generation and normalization
   - assetExistsInBlobStorage for checking asset availability
   - Existing migration patterns from the successful scripts

3. The script will support:
   - Dry run mode to preview actions
   - Filtering by asset type
   - Logging of all operations
   - Resilient retry logic with exponential backoff

## Implementation Details

1. **Identification Function**:
   - Build on `verifyBlobStorage.ts` but extract just the missing asset identification
   - Create a data structure that groups missing assets by type and book
   - Return a structured list of assets that need migration

2. **Asset Migration Function**:
   - Use a factory pattern to select the appropriate migration logic by asset type
   - Leverage existing migration code but focused on just the identified assets
   - Handle path normalization issues that might have caused previous failures

3. **URL Normalization**:
   - Ensure URLs are properly normalized between formats
   - Handle tenant-specific domains correctly
   - Fix double URL prefix issues (a common problem in earlier migrations)

4. **Error Handling**:
   - Implement retry logic with exponential backoff
   - Log all failures with detailed error information
   - Continue with remaining assets even if some fail

5. **Reporting**:
   - Generate detailed reports of migration attempts
   - Provide summary statistics
   - Format reports for both JSON and markdown formats

## Next Steps

After this script is implemented and run successfully, we can move on to:
1. T217: Execute final local asset cleanup
2. T218: Git removal of asset directory structure