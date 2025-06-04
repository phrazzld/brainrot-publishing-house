#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import { put } from '@vercel/blob';

dotenv.config({ path: '.env.local' });

async function migrateFullAudiobook() {
  console.log('Starting migration of Iliad full audiobook...');

  const doUrl =
    'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/full-audiobook.mp3';
  const blobPath = 'assets/audio/the-iliad/full-audiobook.mp3';

  try {
    console.log('Downloading full audiobook from Digital Ocean...');
    console.log('URL:', doUrl);

    const response = await fetch(doUrl);

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    console.log(
      `Content-Length: ${contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(2) + ' MB' : 'unknown'}`,
    );

    const arrayBuffer = await response.arrayBuffer();
    console.log(`Downloaded successfully: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

    console.log('Uploading to Vercel Blob...');
    console.log('This may take several minutes for a 213MB file...');

    const result = await put(blobPath, arrayBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
    });

    console.log('✅ Successfully migrated Iliad full audiobook!');
    console.log(`   URL: ${result.url}`);
    console.log(`   Size: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Path: ${blobPath}`);
  } catch (error) {
    console.error('❌ Failed to migrate full audiobook:', error);
    process.exit(1);
  }
}

migrateFullAudiobook();
