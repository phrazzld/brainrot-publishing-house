# Audio File Organization

This document outlines the organization, naming conventions, and access patterns for audio files in the Brainrot Publishing House platform.

## Table of Contents

- [Overview](#overview)
- [Path Structure](#path-structure)
- [Naming Conventions](#naming-conventions)
- [File Format Standards](#file-format-standards)
- [Adding New Audio Files](#adding-new-audio-files)
- [Accessing Audio Files](#accessing-audio-files)
- [Verification Tools](#verification-tools)
- [Common Issues and Troubleshooting](#common-issues-and-troubleshooting)

## Overview

Audio files are a critical component of our platform, providing users with audio versions of book chapters and full audiobooks. All audio files are stored in Vercel Blob storage, which provides reliable, low-latency access and global distribution via a CDN.

Two main categories of audio files are supported:
1. **Chapter audio files** - Individual audio files for each chapter/section of a book
2. **Full audiobooks** - Complete audiobooks for the entire book

## Path Structure

Audio files follow a standardized path structure to ensure consistency across the platform:

```
assets/audio/{book-slug}/{file-name}.mp3
```

Where:
- `book-slug` is the standardized slug for the book (e.g., `the-iliad`, `hamlet`)
- `file-name` is either:
  - `chapter-{xx}` for chapter audio files, where `xx` is the zero-padded chapter number (01, 02, etc.)
  - `full-audiobook` for complete audiobook files

Examples:
```
assets/audio/the-iliad/chapter-01.mp3
assets/audio/the-iliad/chapter-02.mp3
...
assets/audio/the-iliad/full-audiobook.mp3

assets/audio/hamlet/chapter-01.mp3
assets/audio/hamlet/chapter-02.mp3
...
assets/audio/hamlet/full-audiobook.mp3
```

## Naming Conventions

### Book Slugs

Book slugs must follow these conventions:
- All lowercase
- No spaces (use hyphens instead)
- Include definite articles (`the-`) when part of the original title
- Match the slug used in translations data

Examples:
- `the-iliad`
- `the-odyssey`
- `hamlet`
- `huckleberry-finn`

### File Names

Chapter audio files:
- Must use the format `chapter-XX.mp3` where XX is the chapter number padded to 2 digits
- Chapter numbers start at 01
- For books with non-standard divisions (acts, books, etc.), still use the `chapter-XX.mp3` format

Full audiobook files:
- Must use the exact filename `full-audiobook.mp3`

## File Format Standards

Audio files must adhere to these technical standards:

- **Format**: MP3
- **Bitrate**: 128kbps minimum
- **Channels**: Stereo (preferred) or Mono
- **Sample Rate**: 44.1kHz
- **Maximum File Size**: 
  - Chapter files: 30MB recommended maximum
  - Full audiobooks: No strict limit, but should be optimized for streaming

## Adding New Audio Files

To add new audio files to the platform:

1. **Prepare the files** according to the format standards
2. **Name the files** according to the naming conventions
3. **Upload to Vercel Blob** using one of these methods:
   - Use the `migrateAudioFiles.ts` script for batch uploads
   - Use the `migrateFullAudiobooks.ts` script specifically for full audiobooks
   - For individual files, you can use the VercelBlobAssetService directly

Example upload script usage:
```bash
# Upload chapter files for a book
npm run migrate:audio -- --book=hamlet

# Upload a full audiobook
npm run migrate:audiobook -- --book=hamlet
```

## Accessing Audio Files

Audio files can be accessed through two primary methods:

### 1. Direct URL Access

For development and testing purposes, audio files can be accessed directly via their Vercel Blob URLs:

```
https://<vercel-blob-url>/assets/audio/<book-slug>/<file-name>.mp3
```

However, direct URLs should not be used in production as they may change or have limited availability.

### 2. API Access (Recommended)

The preferred method for accessing audio files is through the API:

```
/api/download?slug=<book-slug>&type=<type>&chapter=<chapter-number>&proxy=<true|false>
```

Parameters:
- `slug`: The book slug (e.g., `the-iliad`)
- `type`: Either `chapter` or `full`
- `chapter`: Required when `type=chapter`, specifies the chapter number
- `proxy`: When `true`, the API will stream the file directly; when `false` or omitted, the API returns a URL

Examples:
```
# Get URL for chapter 1 of The Iliad
/api/download?slug=the-iliad&type=chapter&chapter=1

# Stream full audiobook of Hamlet directly
/api/download?slug=hamlet&type=full&proxy=true
```

## Verification Tools

Two scripts are available to verify and test audio files:

### 1. verifyAudioFilesAccess.ts

This script verifies that all expected audio files exist and are accessible. It checks:
- That all audio files referenced in translations exist
- That all existing files are accessible
- The presence of full audiobooks for each book

Usage:
```bash
# Full verification including accessibility checks
npm run verify:audio-files

# Check only existence, skip accessibility checks
npm run verify:audio-files -- --skip-access-check
```

The script generates detailed HTML and JSON reports in the `test-reports` directory.

### 2. testAudioFileDownloads.ts

This script tests the download functionality for audio files in different environments:

Usage:
```bash
# Test all books in the local environment
npm run test:audio-downloads

# Test specific books in production environment
npm run test:audio-downloads -- --env=production --books=the-iliad,hamlet

# Test only chapter files (skip full audiobooks)
npm run test:audio-downloads -- --skip-full

# Test only the first 2 chapters of each book
npm run test:audio-downloads -- --max-chapters=2
```

The script generates detailed HTML and JSON reports in the `test-reports` directory.

## Common Issues and Troubleshooting

### Missing Files

If audio files are reported as missing:
1. Check if the file exists in the Vercel Blob storage using the `listAudioFiles.ts` script
2. Verify the path follows the standard format
3. Check translations data to ensure references are correct
4. Upload missing files using the migration scripts

### Inaccessible Files

If audio files exist but aren't accessible:
1. Check Vercel Blob storage permissions
2. Verify the BLOB_READ_WRITE_TOKEN environment variable is correctly set
3. Try re-uploading the file

### File Format Issues

If audio files have playback issues:
1. Check the file's encoding and format
2. Re-encode the file using standard parameters
3. Verify with testAudioPlayback.ts script

### API Errors

If the API returns errors:
1. Check API logs for specific error messages
2. Verify the request parameters are correct
3. Test direct URL access to isolate if it's a storage or API issue