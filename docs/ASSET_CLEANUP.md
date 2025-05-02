# Asset Cleanup Guide

After migrating assets from local storage to Vercel Blob storage, this guide will help you safely clean up redundant local assets.

## Prerequisites

Before running the cleanup process, ensure:

1. All assets have been successfully migrated to Blob storage
2. You have run the verification script (`scripts/verifyBlobStorage.ts`) and confirmed assets render correctly
3. You have manually tested the reading room to confirm all books load properly

## Cleanup Script

The `cleanupLocalAssets.ts` script safely removes local assets that have been confirmed to exist in Blob storage.

### Features

- **Verification First**: Only deletes local files that definitely exist in Blob storage
- **Dry Run Mode**: Tests what would be deleted without actually removing files (default)
- **Detailed Reporting**: Generates reports of what was deleted or kept
- **Interactive Safety**: Asks for confirmation before deleting files

### Usage

```bash
# Run in dry-run mode (no files deleted)
npx tsx scripts/cleanupLocalAssets.ts

# Run with actual deletion
npx tsx scripts/cleanupLocalAssets.ts --delete

# Run non-interactively (for automation)
npx tsx scripts/cleanupLocalAssets.ts --delete --no-interactive
```

## Cleanup Process

1. **Dry Run First**: Always start with a dry run to see what will be deleted

   ```bash
   npx tsx scripts/cleanupLocalAssets.ts
   ```

2. **Review the Report**: Check the generated report in the `/reports` directory

3. **Delete with Confirmation**: When ready, run with the delete flag

   ```bash
   npx tsx scripts/cleanupLocalAssets.ts --delete
   ```

4. **Verify Application**: After cleanup, test the application to ensure everything still works

## Troubleshooting

### Missing Files After Cleanup

If files were accidentally deleted or are missing:

1. Check the cleanup report to verify what was deleted
2. Run the verification script to confirm Blob storage status
   ```bash
   npx tsx scripts/verifyBlobStorage.ts
   ```
3. If needed, re-run the migration scripts for specific asset types

### Errors During Cleanup

If you encounter errors during cleanup:

1. Check the error messages in the report
2. Verify network connectivity to Blob storage
3. Try running with a smaller subset of books by modifying the script temporarily

## Best Practices

- Always run in dry-run mode first
- Keep cleanup reports for future reference
- Perform cleanup during low-traffic periods
- Consider backing up important assets before cleanup
- Test the application thoroughly after cleanup
