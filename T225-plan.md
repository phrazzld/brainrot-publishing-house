# T225: Delete placeholder audio files from Vercel Blob

## Task Description
Identify and delete all existing 1KB placeholder audio files from Vercel Blob.

## Analysis
During previous audio migration attempts (T220, T221), placeholder audio files of approximately 1KB size were created in Vercel Blob instead of properly downloading and uploading the actual audio content. These placeholders need to be identified and deleted before attempting another migration.

## Implementation Plan

### 1. Create a Script to Identify Placeholder Files
- Develop a TypeScript script that queries Vercel Blob storage for audio files
- Filter files based on size (approximately 1KB) to identify placeholders
- Use the BlobService utility already in the codebase to access Vercel Blob
- Generate a report of identified placeholder files before deletion

### 2. Implement Safe Deletion Mechanism
- Add a "dry run" mode to preview which files would be deleted
- Implement a confirmation step before actual deletion
- Ensure the deletion process is idempotent (can be run multiple times safely)
- Add detailed logging and error handling

### 3. Testing Approach
- Test the script in dry-run mode first to ensure it correctly identifies placeholders
- Verify it doesn't identify actual audio files (>1MB) as placeholders
- Test deletion of a single file to confirm functionality
- Add verification after deletion to confirm files are actually removed

## Implementation Details

1. Create a script `scripts/deletePlaceholderAudioFiles.ts`:
   - Use BlobService for blob storage operations
   - List all audio files in Blob storage
   - Filter files by size (1-10KB threshold)
   - Implement dry-run, verbose, and confirmation modes
   - Provide detailed reporting

2. Key functions in the script:
   - `listAudioFiles`: Get all audio files in Blob storage
   - `identifyPlaceholders`: Filter files by size to find placeholders
   - `deletePlaceholders`: Delete identified placeholder files
   - `generateReport`: Create a detailed report of deleted files

3. Script options:
   - `--dry-run`: Show which files would be deleted without actually deleting them
   - `--force`: Skip confirmation prompt
   - `--verbose`: Show detailed output for each file
   - `--size-threshold=<number>`: Custom size threshold in bytes (default: 10240)

## Acceptance Criteria
- Script successfully identifies all placeholder audio files in Vercel Blob
- All identified placeholder files are deleted (confirmed via verification)
- A detailed report is generated showing which files were deleted
- Script is safe to run multiple times (idempotent)
- Provides clear error handling and logging