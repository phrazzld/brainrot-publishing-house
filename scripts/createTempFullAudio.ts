#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import { put } from '@vercel/blob';

dotenv.config({ path: '.env.local' });

async function createTemporaryFullAudiobook() {
  try {
    console.log('Creating temporary full audiobook using introduction file...');

    // Get the introduction file from Vercel Blob
    const introUrl =
      'https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com/assets/audio/the-iliad/introduction.mp3';

    console.log('Downloading introduction file...');
    const response = await fetch(introUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch intro: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`Downloaded: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

    console.log('Uploading as temporary full audiobook...');
    const result = await put('assets/audio/the-iliad/full-audiobook.mp3', arrayBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
    });

    console.log('✅ Temporary full audiobook created');
    console.log(`URL: ${result.url}`);
    console.log('NOTE: This is just the introduction - replace with real full audiobook later');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTemporaryFullAudiobook();
