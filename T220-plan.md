# T220 Plan: Create a Proper Audio Migration Script

## Task Description
Develop a script that downloads each audio file from Digital Ocean, verifies its integrity, and uploads it to Vercel Blob.

## Context
- Previous audio migration script (migrateAudioFiles.ts) created placeholder files (1KB each) instead of uploading actual audio content
- We now have a proper utility function (downloadFromSpaces.ts) to fetch the actual audio files
- We need to create a real migration script that actually downloads the content and uploads it to Vercel Blob

## Implementation Plan

1. Create a new script `scripts/migrateAudioFilesWithContent.ts` that will:
   - Use the `downloadFromSpaces` utility to fetch audio files from Digital Ocean Spaces
   - Verify downloaded file integrity (check file size, content type, etc.)
   - Upload the actual file content to Vercel Blob storage
   - Generate a detailed report of the migration process

2. Key Features to Include:
   - Command-line options for dry run, forced migration, book selection
   - Concurrency control for parallel processing
   - Progress tracking and detailed logging
   - Integrity validation before and after upload
   - Error handling with retry logic

3. Technical Approach:
   - Extract audio paths from translations
   - Download files using our new utility
   - Verify file integrity before upload
   - Use BlobService for uploads to Vercel Blob
   - Generate comprehensive migration report

## Deliverables
1. `scripts/migrateAudioFilesWithContent.ts` - The main migration script
2. Unit tests for the script
3. Documentation for running the script

## Implementation Steps
1. Review existing migration scripts as reference
2. Create the new script structure
3. Implement command-line argument parsing
4. Implement the core migration logic
5. Add validation and verification capabilities
6. Add reporting and logging
7. Write tests
8. Document usage instructions