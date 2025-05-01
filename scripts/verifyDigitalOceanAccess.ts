#!/usr/bin/env node
/**
 * DigitalOcean Access Verification Script
 *
 * This script verifies access to DigitalOcean Spaces:
 * 1. Attempts to authenticate with DigitalOcean credentials
 * 2. Lists available objects in the audio directory
 * 3. Attempts to download a sample audio file
 * 4. Reports success/failure with detailed information
 *
 * Usage:
 *   npx tsx scripts/verifyDigitalOceanAccess.ts
 *
 * Options:
 *   --list-all     List all files in the space
 *   --prefix=path  Specify a path prefix to search under
 *   --download     Attempt to download a sample file
 */
// Load environment variables
import * as dotenv from 'dotenv';
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

dotenv.config({ path: '.env.local' });

// Constants
const DO_SPACES_ACCESS_KEY = process.env.DO_SPACES_ACCESS_KEY;
const DO_SPACES_SECRET_KEY = process.env.DO_SPACES_SECRET_KEY;
const DO_SPACES_ENDPOINT = process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com';
const DO_SPACES_BUCKET = process.env.DO_SPACES_BUCKET || 'brainrot-publishing';
const DO_REGION = 'nyc3';

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    listAll: false,
    prefix: '',
    download: false,
  };

  for (const arg of args) {
    if (arg === '--list-all') {
      options.listAll = true;
    } else if (arg === '--download') {
      options.download = true;
    } else if (arg.startsWith('--prefix=')) {
      options.prefix = arg.substring('--prefix='.length);
    }
  }

  return options;
}

/**
 * Create a Digital Ocean S3 client
 */
function createDigitalOceanClient(): S3Client {
  if (!DO_SPACES_ACCESS_KEY || !DO_SPACES_SECRET_KEY) {
    throw new Error(
      'Digital Ocean credentials not found. Please set DO_SPACES_ACCESS_KEY and DO_SPACES_SECRET_KEY in .env.local'
    );
  }

  console.log('Creating DigitalOcean S3 client with:');
  console.log(`- Region: ${DO_REGION}`);
  console.log(`- Endpoint: https://${DO_SPACES_ENDPOINT}`);
  console.log(`- Bucket: ${DO_SPACES_BUCKET}`);

  return new S3Client({
    region: DO_REGION,
    endpoint: `https://${DO_SPACES_ENDPOINT}`,
    credentials: {
      accessKeyId: DO_SPACES_ACCESS_KEY,
      secretAccessKey: DO_SPACES_SECRET_KEY,
    },
  });
}

/**
 * List objects in the DigitalOcean Space
 */
async function listObjects(
  client: S3Client,
  prefix: string = ''
): Promise<{ key: string; size: number }[]> {
  try {
    console.log(`Listing objects with prefix: ${prefix || '(root)'}`);

    const command = new ListObjectsV2Command({
      Bucket: DO_SPACES_BUCKET,
      Prefix: prefix,
      MaxKeys: 100,
    });

    const response = await client.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      console.log('No objects found.');
      return [];
    }

    return response.Contents.filter((item) => item.Key).map((item) => ({
      key: item.Key as string,
      size: item.Size || 0,
    }));
  } catch (error) {
    console.error('Error listing objects:', error);
    throw error;
  }
}

/**
 * Download an object from DigitalOcean Space
 */
async function downloadObject(
  client: S3Client,
  key: string
): Promise<{ content: Buffer; contentType: string; size: number }> {
  try {
    console.log(`Downloading object: ${key}`);

    const command = new GetObjectCommand({
      Bucket: DO_SPACES_BUCKET,
      Key: key,
    });

    const response = await client.send(command);

    if (!response.Body) {
      throw new Error(`Empty body received for ${key}`);
    }

    const contentType = response.ContentType || 'application/octet-stream';
    const size = response.ContentLength || 0;

    // Convert stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    const content = Buffer.concat(chunks);

    return {
      content,
      contentType,
      size,
    };
  } catch (error) {
    console.error(`Error downloading object: ${key}`, error);
    throw error;
  }
}

/**
 * Find an MP3 file in the list of objects
 */
function findSampleAudioFile(objects: { key: string; size: number }[]): string | null {
  // Look for .mp3 files with a reasonable size (>50KB)
  const audioFiles = objects.filter((obj) => obj.key.endsWith('.mp3') && obj.size > 50 * 1024);

  if (audioFiles.length === 0) {
    return null;
  }

  // Return the first one
  return audioFiles[0].key;
}

/**
 * Save a downloaded file to disk for verification
 */
async function saveDownloadedFile(content: Buffer, key: string): Promise<string> {
  const filename = path.basename(key);
  const outputDir = path.join(process.cwd(), 'tmp');
  const outputPath = path.join(outputDir, filename);

  // Create output directory if it doesn't exist
  await fs.mkdir(outputDir, { recursive: true });

  // Write file
  await fs.writeFile(outputPath, content);

  return outputPath;
}

/**
 * Print a summary of the found objects
 */
function printObjectsSummary(objects: { key: string; size: number }[]) {
  // Count objects by type
  const types = new Map<string, { count: number; totalSize: number }>();

  for (const obj of objects) {
    const ext = path.extname(obj.key).toLowerCase() || '(no extension)';

    if (!types.has(ext)) {
      types.set(ext, { count: 0, totalSize: 0 });
    }

    const typeInfo = types.get(ext)!;
    typeInfo.count++;
    typeInfo.totalSize += obj.size;
  }

  // Print summary
  console.log('\nObjects by type:');
  for (const [ext, info] of types.entries()) {
    const sizeInMB = (info.totalSize / (1024 * 1024)).toFixed(2);
    console.log(`- ${ext}: ${info.count} files, ${sizeInMB} MB total`);
  }
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  let success = false;

  try {
    console.log('=== DigitalOcean Access Verification ===');

    // Create client
    const client = createDigitalOceanClient();
    console.log('✅ Successfully created DigitalOcean client');

    // List objects
    const defaultPrefix = options.prefix || '';
    const objects = await listObjects(client, defaultPrefix);
    console.log(`✅ Successfully listed ${objects.length} objects in the bucket`);

    // Print summary of found objects
    printObjectsSummary(objects);

    // List all objects if requested
    if (options.listAll) {
      console.log('\nAll objects:');
      objects.forEach((obj, idx) => {
        const sizeInKB = (obj.size / 1024).toFixed(2);
        console.log(`${idx + 1}. ${obj.key} (${sizeInKB} KB)`);
      });
    }

    // Attempt to download a sample file
    if (options.download) {
      // Find a sample audio file
      const sampleKey = findSampleAudioFile(objects);

      if (!sampleKey) {
        console.log('❌ No suitable audio files found for download test');
      } else {
        console.log(`\nAttempting to download a sample file: ${sampleKey}`);

        // Download the file
        const downloaded = await downloadObject(client, sampleKey);
        console.log(`✅ Successfully downloaded ${downloaded.size} bytes`);
        console.log(`- Content type: ${downloaded.contentType}`);

        // Save the file for verification
        const savedPath = await saveDownloadedFile(downloaded.content, sampleKey);
        console.log(`✅ Sample file saved to: ${savedPath}`);

        // Print file info
        const sizeMB = (downloaded.size / (1024 * 1024)).toFixed(2);
        console.log(`- File size: ${sizeMB} MB`);
      }
    }

    console.log('\n✅ DigitalOcean access verification completed successfully!');
    success = true;
  } catch (error) {
    console.error('\n❌ DigitalOcean access verification failed:');
    console.error(error);
    success = false;
  }

  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Run the main function
main();
