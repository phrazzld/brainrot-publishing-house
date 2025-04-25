# Brainrot Text Files Migration Script Plan

## Task Description
Create a migration script for brainrot text files from the local filesystem to Vercel Blob storage.

## Implementation Approach

### Core Components
1. Create a script at `scripts/migrateBrainrotTextFiles.ts` based on the existing chapter images migration script
2. Reuse the `MigrationLog` class for tracking migration status
3. Implement a `BrainrotTextMigrationService` class that will:
   - Scan the filesystem for brainrot text files in each book's directory
   - Convert local paths to Blob paths using the BlobPathService
   - Upload text files to Vercel Blob with appropriate caching headers
   - Verify uploads and track progress
4. Add CLI options for flexibility (similar to previous migration scripts)

### Key Differences from Image Migration
1. Text files will be uploaded using `blobService.uploadText()` instead of `uploadFile()`
2. We'll need to handle special cases for fulltext.txt separately
3. We'll use a different log file for tracking text file migrations
4. We'll set different caching headers appropriate for text content

### Script Interface
```
Usage:
  npx tsx scripts/migrateBrainrotTextFiles.ts [options]

Options:
  --dry-run             Simulate migration without uploading (default: false)
  --books=slug1,slug2   Comma-separated list of book slugs to migrate (default: all)
  --force               Re-upload even if already migrated (default: false)
  --retries=3           Number of retries for failed uploads (default: 3)
  --concurrency=5       Number of concurrent uploads (default: 5)
  --log-file=path       Path to migration log file (default: brainrot-text-migration.json)
```

### Implementation Steps
1. Create the script file with appropriate command-line argument parsing
2. Implement the BrainrotTextMigrationService class with methods for:
   - Finding all brainrot text files for books
   - Migrating a single text file
   - Migrating all text files with concurrency control
   - Verifying uploads
3. Reuse the MigrationLog class from previous scripts
4. Implement the main function to orchestrate the migration process
5. Add appropriate error handling and reporting
6. Update the package.json to add npm scripts for running the migration

### Package.json Changes
Add the following scripts:
```json
"migrate:brainrot-text": "tsx scripts/migrateBrainrotTextFiles.ts",
"migrate:brainrot-text:dry": "tsx scripts/migrateBrainrotTextFiles.ts --dry-run"
```

### Documentation Updates
Update `docs/BLOB_STORAGE.md` to include information about the brainrot text files migration script.