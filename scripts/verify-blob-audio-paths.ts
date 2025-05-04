#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { list } from '@vercel/blob';
import type { ListBlobResult } from '@vercel/blob';

dotenv.config({ path: '.env.local' });

interface BlobFile {
  path: string;
  size: number;
}

/**
 * Script to verify audio file paths in Vercel Blob
 * This helps debug path issues by checking all possible patterns
 */
async function verifyBlobAudioPaths(): Promise<void> {
  console.warn('🔍 Verifying audio file paths in Vercel Blob...');

  // Possible path patterns to check
  const pathPrefixes = [
    'books', // books/<slug>/audio/...
    '', // <slug>/audio/...
    'audio', // audio/<slug>/...
    'assets/audio', // assets/audio/<slug>/...
  ];

  // Sample book slugs to check
  const booksToCheck = ['the-iliad', 'the-odyssey', 'hamlet'];

  // Track what we find
  const foundFiles: BlobFile[] = [];

  try {
    for (const prefix of pathPrefixes) {
      console.warn(`\nChecking with prefix: "${prefix}"`);

      let cursor: string | undefined;
      let page = 1;
      let totalCount = 0;

      do {
        console.warn(`  Page ${page}...`);
        const result: ListBlobResult = await list({ prefix, cursor });
        totalCount += result.blobs.length;

        // Look for audio files and pattern matches
        const audioFiles = result.blobs.filter(
          (blob) =>
            blob.pathname.endsWith('.mp3') &&
            booksToCheck.some((slug) => blob.pathname.includes(slug))
        );

        if (audioFiles.length > 0) {
          console.warn(`  Found ${audioFiles.length} matching audio files on page ${page}`);

          for (const file of audioFiles) {
            const sizeKB = Math.round(file.size / 1024);
            console.warn(`  - ${file.pathname} (${sizeKB}KB)`);
            foundFiles.push({
              path: file.pathname,
              size: file.size,
            });
          }
        }

        cursor = result.cursor;
        page++;
      } while (cursor);

      console.warn(`  Checked ${totalCount} files with prefix "${prefix}"`);
    }

    // Analyze findings
    console.warn('\n📊 Summary:');
    console.warn(`Found ${foundFiles.length} audio files matching the requested books`);

    // Organize by pattern
    const patterns = new Map<string, number>();

    for (const file of foundFiles) {
      const { path: filePath } = file;
      let pattern = 'unknown';

      if (filePath.match(/^books\/[^/]+\/audio\//)) {
        pattern = 'books/<slug>/audio/';
      } else if (filePath.match(/^[^/]+\/audio\//)) {
        pattern = '<slug>/audio/';
      } else if (filePath.match(/^audio\/[^/]+\//)) {
        pattern = 'audio/<slug>/';
      } else if (filePath.match(/^assets\/audio\/[^/]+\//)) {
        pattern = 'assets/audio/<slug>/';
      }

      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }

    console.warn('\nFile pattern distribution:');
    for (const [pattern, count] of patterns.entries()) {
      console.warn(`- ${pattern}: ${count} files`);
    }

    // Find real audio files (not placeholders)
    const realAudioFiles = foundFiles.filter((f) => f.size > 100 * 1024); // > 100KB
    const placeholders = foundFiles.filter((f) => f.size <= 100 * 1024);

    console.warn(`\nReal audio files (>100KB): ${realAudioFiles.length}`);
    console.warn(`Placeholder files (≤100KB): ${placeholders.length}`);

    if (realAudioFiles.length > 0) {
      console.warn('\nSample real audio files:');
      for (let i = 0; i < Math.min(realAudioFiles.length, 5); i++) {
        const file = realAudioFiles[i];
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        console.warn(`- ${file.path} (${sizeMB}MB)`);
      }
    }
  } catch (error) {
    console.error('Error verifying blob paths:', error);
  }
}

verifyBlobAudioPaths();
