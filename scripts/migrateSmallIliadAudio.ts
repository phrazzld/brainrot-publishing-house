#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import { put } from '@vercel/blob';

dotenv.config({ path: '.env.local' });

async function migrateSmallFiles() {
  console.log('Starting migration of smaller Iliad audio files...');

  const files = [
    {
      doUrl:
        'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/introduction.mp3',
      blobPath: 'assets/audio/the-iliad/introduction.mp3',
      name: 'Introduction',
    },
    {
      doUrl:
        'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/translators-preface.mp3',
      blobPath: 'assets/audio/the-iliad/translators-preface.mp3',
      name: 'Translators Preface',
    },
  ];

  for (const file of files) {
    try {
      console.log(`Downloading ${file.name}...`);
      const response = await fetch(file.doUrl);

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log(
        `Downloaded ${file.name}: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`,
      );

      console.log(`Uploading ${file.name} to Vercel Blob...`);
      const result = await put(file.blobPath, arrayBuffer, {
        access: 'public',
        contentType: 'audio/mpeg',
      });

      console.log(`✅ Successfully migrated ${file.name}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Size: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error(`❌ Failed to migrate ${file.name}:`, error);
    }
  }
}

migrateSmallFiles();
