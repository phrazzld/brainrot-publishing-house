#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { list } from '@vercel/blob';
import type { ListBlobResult } from '@vercel/blob';

dotenv.config({ path: '.env.local' });

interface BlobFile {
  pathname: string;
  size: number;
  uploadedAt: Date;
}

async function listBlobAudioFiles(): Promise<void> {
  console.warn('🔍 Listing audio files in Vercel Blob...\n');

  try {
    let cursor: string | undefined;
    const audioFiles: BlobFile[] = [];
    let page = 1;
    let totalCount = 0;

    // List all files with prefix 'books/'
    console.warn('Fetching files from Vercel Blob...\n');

    do {
      const result: ListBlobResult = await list({ prefix: 'books/', cursor });
      totalCount += result.blobs.length;

      // Filter only audio files
      const pageAudioFiles = result.blobs.filter(
        (blob) => blob.pathname.includes('/audio/') && blob.pathname.endsWith('.mp3')
      );

      audioFiles.push(...pageAudioFiles);

      console.warn(
        `Page ${page}: Found ${pageAudioFiles.length} audio files (${result.blobs.length} total files)`
      );

      cursor = result.cursor;
      page++;
    } while (cursor);

    // Group by book
    const bookMap = new Map<string, BlobFile[]>();

    for (const file of audioFiles) {
      // Extract book slug from pathname (format: books/book-slug/audio/file.mp3)
      const pathParts = file.pathname.split('/');
      if (pathParts.length >= 3) {
        const bookSlug = pathParts[1];

        if (!bookMap.has(bookSlug)) {
          bookMap.set(bookSlug, []);
        }

        const files = bookMap.get(bookSlug);
        if (files) {
          files.push(file);
        }
      }
    }

    // Print results
    console.warn(`\n📊 Found ${audioFiles.length} audio files across ${bookMap.size} books:`);

    for (const [bookSlug, files] of bookMap.entries()) {
      console.warn(`- ${bookSlug}: ${files.length} audio files`);

      // Print file details
      for (const file of files) {
        const sizeKB = file.size / 1024;
        const sizeMB = sizeKB / 1024;
        const size = sizeMB >= 1 ? `${sizeMB.toFixed(2)} MB` : `${sizeKB.toFixed(2)} KB`;

        console.warn(`  - ${file.pathname} (${size})`);
      }

      console.warn('');
    }

    console.warn(`Total files in Blob storage: ${totalCount}`);
    console.warn(`Total audio files: ${audioFiles.length}`);
  } catch (error) {
    console.error('Error listing Blob files:', error);
  }
}

listBlobAudioFiles();
