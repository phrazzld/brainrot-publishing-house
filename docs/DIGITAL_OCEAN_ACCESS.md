# Digital Ocean Access Configuration

This document provides instructions for configuring and verifying access to Digital Ocean Spaces for audio file migration.

## Environment Configuration

Digital Ocean Spaces credentials must be configured in `.env.local`:

```
DO_SPACES_ACCESS_KEY=your_access_key
DO_SPACES_SECRET_KEY=your_secret_key
DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
DO_SPACES_BUCKET=brainrot-publishing
```

## Audio File Structure

Audio files in Digital Ocean Spaces follow this structure:

- Bucket: `brainrot-publishing`
- Path pattern: `{book-slug}/audio/{filename}.mp3`

Example: `hamlet/audio/act-i.mp3`

## AWS SDK Configuration

When working with Digital Ocean Spaces, configure the AWS SDK v3 as follows:

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'nyc3',
  endpoint: 'https://nyc3.digitaloceanspaces.com',
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
  },
});
```

## Verifying Access

Use the verification script to confirm access to Digital Ocean Spaces:

```bash
# List audio files
npx tsx scripts/verifyDigitalOceanAccess.ts

# Download a sample file to verify download capability
npx tsx scripts/verifyDigitalOceanAccess.ts --download

# List files for a specific book
npx tsx scripts/verifyDigitalOceanAccess.ts --prefix=hamlet/audio --list-all
```

## Available Audio Files

The following audio files have been confirmed in Digital Ocean Spaces:

- **hamlet**: 1 file (act-i.mp3)
- **the-aeneid**: 13 files (book-01.mp3 through book-12.mp3, full-audiobook.mp3)
- **the-declaration-of-independence**: 1 file (the-declaration-of-independence.mp3)
- **the-iliad**: 26 files (book-01.mp3 through book-24.mp3, introduction.mp3, translators-preface.mp3, full-audiobook.mp3)
- **the-odyssey**: 25 files (book-01.mp3 through book-24.mp3, full-audiobook.mp3)

Total: 66 audio files, approximately 1053 MB

## Migration Process

After confirming access, follow the [Audio Migration Fix Plan](../AUDIO-FIX-PLAN.md) to properly migrate audio files from Digital Ocean Spaces to Vercel Blob storage.
