#!/usr/bin/env node
/**
 * Check Digital Ocean Spaces for The Iliad Audio Files
 *
 * This script checks the Digital Ocean Spaces at the path
 * `brainrot-publishing/the-iliad/audio` for audio files,
 * specifically looking for:
 * - full-audiobook.mp3
 * - introduction.mp3
 * - translators-preface.mp3
 *
 * Reports file names and sizes.
 */
import * as dotenv from 'dotenv';
import { HeadObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize S3 client for Digital Ocean Spaces
const s3Client = new S3Client({
  region: 'nyc3',
  endpoint: `https://${process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com'}`,
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY || '',
  },
  forcePathStyle: false, // Digital Ocean Spaces uses virtual hosted-style
});

interface AudioFileInfo {
  key: string;
  size: number;
  lastModified: Date;
  sizeFormatted: string;
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * List all objects in the Iliad audio directory
 */
async function listIliadAudioFiles(): Promise<AudioFileInfo[]> {
  const bucketName = process.env.DO_SPACES_BUCKET || 'brainrot-publishing';
  const prefix = 'the-iliad/audio/';

  console.log(`Checking Digital Ocean Spaces bucket: ${bucketName}`);
  console.log(`Looking for files with prefix: ${prefix}`);
  console.log('');

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      console.log('No files found in the-iliad/audio/ directory');
      return [];
    }

    const audioFiles: AudioFileInfo[] = [];

    for (const object of response.Contents) {
      if (object.Key && object.Size !== undefined && object.LastModified) {
        audioFiles.push({
          key: object.Key,
          size: object.Size,
          lastModified: object.LastModified,
          sizeFormatted: formatFileSize(object.Size),
        });
      }
    }

    return audioFiles.sort((a, b) => a.key.localeCompare(b.key));
  } catch (error) {
    console.error('Error listing files from Digital Ocean Spaces:', error);
    throw error;
  }
}

/**
 * Get detailed information about a specific file
 */
async function _getFileDetails(
  key: string,
): Promise<{ size: number; lastModified: Date; contentType?: string }> {
  const bucketName = process.env.DO_SPACES_BUCKET || 'brainrot-publishing';

  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      size: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      contentType: response.ContentType,
    };
  } catch (error) {
    console.error(`Error getting details for ${key}:`, error);
    throw error;
  }
}

/**
 * Check for specific files of interest
 */
function checkSpecificFiles(audioFiles: AudioFileInfo[]): void {
  const filesOfInterest = ['full-audiobook.mp3', 'introduction.mp3', 'translators-preface.mp3'];

  console.log('\n=== FILES OF SPECIFIC INTEREST ===\n');

  for (const fileName of filesOfInterest) {
    const fullPath = `the-iliad/audio/${fileName}`;
    const file = audioFiles.find((f) => f.key === fullPath);

    if (file) {
      console.log(`✅ ${fileName}`);
      console.log(`   Size: ${file.sizeFormatted} (${file.size.toLocaleString()} bytes)`);
      console.log(`   Last Modified: ${file.lastModified.toISOString()}`);
      console.log(`   Full Path: ${file.key}`);
    } else {
      console.log(`❌ ${fileName} - NOT FOUND`);
    }
    console.log('');
  }
}

/**
 * Display all files in the directory
 */
function displayAllFiles(audioFiles: AudioFileInfo[]): void {
  console.log('=== ALL AUDIO FILES IN the-iliad/audio/ ===\n');

  if (audioFiles.length === 0) {
    console.log('No audio files found.');
    return;
  }

  let totalSize = 0;

  for (const file of audioFiles) {
    const fileName = file.key.replace('the-iliad/audio/', '');
    console.log(`📁 ${fileName}`);
    console.log(`   Size: ${file.sizeFormatted} (${file.size.toLocaleString()} bytes)`);
    console.log(`   Last Modified: ${file.lastModified.toISOString()}`);
    console.log(`   Full Path: ${file.key}`);
    console.log('');

    totalSize += file.size;
  }

  console.log(`📊 SUMMARY:`);
  console.log(`   Total Files: ${audioFiles.length}`);
  console.log(`   Total Size: ${formatFileSize(totalSize)} (${totalSize.toLocaleString()} bytes)`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log('Digital Ocean Spaces - The Iliad Audio Files Check');
    console.log('='.repeat(55));
    console.log('');

    // Verify environment variables
    if (!process.env.DO_SPACES_ACCESS_KEY || !process.env.DO_SPACES_SECRET_KEY) {
      throw new Error(
        'Digital Ocean Spaces credentials not configured. Please check .env.local file.',
      );
    }

    // List all audio files
    const audioFiles = await listIliadAudioFiles();

    // Display all files
    displayAllFiles(audioFiles);

    // Check for specific files of interest
    checkSpecificFiles(audioFiles);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main();
