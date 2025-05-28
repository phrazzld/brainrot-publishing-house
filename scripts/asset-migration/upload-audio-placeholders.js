#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { put, list } = require('@vercel/blob');

// List of books to create placeholders for
const BOOKS = [
  'the-aeneid',
  'the-odyssey',
  'the-iliad',
  'hamlet',
  'huckleberry-finn',
  'the-declaration',
];

// Number of chapters per book
const CHAPTERS_PER_BOOK = {
  'the-aeneid': 12,
  'the-odyssey': 24,
  'the-iliad': 24,
  hamlet: 5,
  'huckleberry-finn': 42,
  'the-declaration': 10,
};

/**
 * Creates a valid MP3 placeholder with ID3v2 header
 */
function createMP3PlaceholderBuffer() {
  // Create a minimal valid MP3 with ID3v2 header
  const header = new Uint8Array([
    0x49,
    0x44,
    0x33, // "ID3"
    0x03,
    0x00, // Version 2.3.0
    0x00, // Flags
    0x00,
    0x00,
    0x00,
    0x20, // Size (32 bytes)
    // Title frame
    0x54,
    0x49,
    0x54,
    0x32, // "TIT2"
    0x00,
    0x00,
    0x00,
    0x10, // Frame size
    0x00,
    0x00, // Flags
    0x00, // Encoding
    // Content: "Audio Placeholder"
    0x41,
    0x75,
    0x64,
    0x69,
    0x6f,
    0x20,
    0x50,
    0x6c,
    0x61,
    0x63,
    0x65,
    0x68,
    0x6f,
    0x6c,
    0x64,
    0x65,
    // MP3 frame header (silent)
    0xff,
    0xe0,
    0x00,
    0x00, // Empty MPEG frame
  ]);

  return new Blob([header], { type: 'audio/mpeg' });
}

async function uploadPlaceholderAudioFiles() {
  console.log('🚀 Starting placeholder audio file upload to Vercel Blob...\n');

  let totalUploaded = 0;
  let totalErrors = 0;

  // Check environment
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ BLOB_READ_WRITE_TOKEN not found in environment');
    return;
  }

  for (const bookSlug of BOOKS) {
    console.log(`\n📚 Processing book: ${bookSlug}`);

    const chapters = CHAPTERS_PER_BOOK[bookSlug];
    console.log(`  Chapters: ${chapters}`);

    // Upload full audiobook placeholder
    try {
      const pathname = `assets/audio/${bookSlug}/full-audiobook.mp3`;
      console.log(`  Uploading ${pathname}...`);

      const result = await put(pathname, createMP3PlaceholderBuffer(), {
        contentType: 'audio/mpeg',
        access: 'public',
        addRandomSuffix: false,
      });

      totalUploaded++;
      console.log(`  ✅ Uploaded to: ${result.url}`);
    } catch (error) {
      totalErrors++;
      console.error(`  ❌ Error uploading full audiobook:`, error.message || error);
    }

    // Upload chapter placeholders
    for (let chapter = 1; chapter <= chapters; chapter++) {
      try {
        const paddedChapter = String(chapter).padStart(2, '0');
        const pathname = `assets/audio/${bookSlug}/chapter-${paddedChapter}.mp3`;
        console.log(`  Uploading ${pathname}...`);

        const result = await put(pathname, createMP3PlaceholderBuffer(), {
          contentType: 'audio/mpeg',
          access: 'public',
          addRandomSuffix: false,
        });

        totalUploaded++;
        console.log(`  ✅ Uploaded to: ${result.url}`);
      } catch (error) {
        totalErrors++;
        console.error(`  ❌ Error uploading chapter ${chapter}:`, error.message || error);
      }
    }
  }

  console.log('\n\n📊 Summary:');
  console.log(`  Total uploaded: ${totalUploaded}`);
  console.log(`  Total errors: ${totalErrors}`);
  console.log(
    `  Success rate: ${((totalUploaded / (totalUploaded + totalErrors)) * 100).toFixed(1)}%`,
  );

  // Verify uploads
  console.log('\n\n🔍 Verifying uploads...');
  try {
    const { blobs } = await list({ prefix: 'assets/audio/' });
    const audioFiles = blobs.filter((blob) => blob.pathname.endsWith('.mp3'));
    console.log(`  Found ${audioFiles.length} audio files in Vercel Blob`);
  } catch (error) {
    console.error('  Error listing files:', error.message || error);
  }
}

// Run the upload if this file is executed directly
if (require.main === module) {
  uploadPlaceholderAudioFiles()
    .then(() => {
      console.log('\n✨ Upload complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Upload failed:', error);
      process.exit(1);
    });
}
