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
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

import { logger } from '../utils/logger';

const _moduleLogger = logger.child({ module: 'verifyDigitalOceanAccess' });
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

  logger.info(
    {
      operation: 'create_client',
      region: DO_REGION,
      endpoint: `https://${DO_SPACES_ENDPOINT}`,
      bucket: DO_SPACES_BUCKET,
    },
    'Creating DigitalOcean S3 client with:'
  );

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
    logger.info(
      {
        operation: 'list_objects',
        prefix: prefix || '(root)',
      },
      `Listing objects with prefix: ${prefix || '(root)'}`
    );

    const command = new ListObjectsV2Command({
      Bucket: DO_SPACES_BUCKET,
      Prefix: prefix,
      MaxKeys: 100,
    });

    const response = await client.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      logger.info(
        {
          operation: 'list_objects_result',
          count: 0,
        },
        'No objects found.'
      );
      return [];
    }

    return response.Contents.filter((item) => item.Key).map((item) => ({
      key: item.Key as string,
      size: item.Size || 0,
    }));
  } catch (error) {
    logger.error(
      {
        operation: 'list_objects_error',
        error: error instanceof Error ? error.message : String(error),
      },
      'Error listing objects:'
    );
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
    logger.info(
      {
        operation: 'download_object',
        key,
      },
      `Downloading object: ${key}`
    );

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
    logger.error(
      {
        operation: 'download_object_error',
        key,
        error: error instanceof Error ? error.message : String(error),
      },
      `Error downloading object: ${key}`
    );
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

    // We know this exists because we just set it if it didn't exist
    const typeInfo = types.get(ext);
    if (typeInfo) {
      typeInfo.count++;
      typeInfo.totalSize += obj.size;
    }
  }

  // Print summary
  logger.info(
    {
      operation: 'objects_summary',
    },
    'Objects by type:'
  );

  for (const [ext, info] of types.entries()) {
    const sizeInMB = (info.totalSize / (1024 * 1024)).toFixed(2);
    logger.info(
      {
        operation: 'object_type',
        extension: ext,
        count: info.count,
        size: `${sizeInMB} MB`,
      },
      `- ${ext}: ${info.count} files, ${sizeInMB} MB total`
    );
  }
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  let success = false;

  try {
    logger.info(
      {
        operation: 'start',
      },
      '=== DigitalOcean Access Verification ==='
    );

    // Create client
    const client = createDigitalOceanClient();
    logger.info(
      {
        operation: 'client_created',
      },
      '✅ Successfully created DigitalOcean client'
    );

    // List objects
    const defaultPrefix = options.prefix || '';
    const objects = await listObjects(client, defaultPrefix);
    logger.info(
      {
        operation: 'list_complete',
        count: objects.length,
      },
      `✅ Successfully listed ${objects.length} objects in the bucket`
    );

    // Print summary of found objects
    printObjectsSummary(objects);

    // List all objects if requested
    if (options.listAll) {
      logger.info(
        {
          operation: 'list_all',
        },
        'All objects:'
      );

      objects.forEach((obj, idx) => {
        const sizeInKB = (obj.size / 1024).toFixed(2);
        logger.info(
          {
            operation: 'object_detail',
            index: idx + 1,
            key: obj.key,
            size: `${sizeInKB} KB`,
          },
          `${idx + 1}. ${obj.key} (${sizeInKB} KB)`
        );
      });
    }

    // Attempt to download a sample file
    if (options.download) {
      // Find a sample audio file
      const sampleKey = findSampleAudioFile(objects);

      if (!sampleKey) {
        logger.warn(
          {
            operation: 'download_test',
            status: 'failed',
            reason: 'no_suitable_files',
          },
          '❌ No suitable audio files found for download test'
        );
      } else {
        logger.info(
          {
            operation: 'download_test',
            key: sampleKey,
          },
          `Attempting to download a sample file: ${sampleKey}`
        );

        // Download the file
        const downloaded = await downloadObject(client, sampleKey);
        logger.info(
          {
            operation: 'download_complete',
            size: downloaded.size,
          },
          `✅ Successfully downloaded ${downloaded.size} bytes`
        );

        logger.info(
          {
            operation: 'download_info',
            contentType: downloaded.contentType,
          },
          `- Content type: ${downloaded.contentType}`
        );

        // Save the file for verification
        const savedPath = await saveDownloadedFile(downloaded.content, sampleKey);
        logger.info(
          {
            operation: 'file_saved',
            path: savedPath,
          },
          `✅ Sample file saved to: ${savedPath}`
        );

        // Print file info
        const sizeMB = (downloaded.size / (1024 * 1024)).toFixed(2);
        logger.info(
          {
            operation: 'file_size',
            size: `${sizeMB} MB`,
          },
          `- File size: ${sizeMB} MB`
        );
      }
    }

    logger.info(
      {
        operation: 'completion',
        status: 'success',
      },
      '✅ DigitalOcean access verification completed successfully!'
    );
    success = true;
  } catch (error) {
    logger.error(
      {
        operation: 'completion',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      },
      '❌ DigitalOcean access verification failed:'
    );
    success = false;
  }

  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Run the main function
main();
