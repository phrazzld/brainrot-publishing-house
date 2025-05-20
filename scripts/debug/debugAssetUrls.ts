/**
 * Debug script to understand how asset URLs are being generated
 */
import { getAssetUrl } from '../utils';
// Check asset path mapping
import { mapAssetPath } from '../utils/assetPathMapping';
import { logger as _logger } from '../utils/logger';
// Also let's check what the blob path service does with these
import { blobPathService } from '../utils/services/BlobPathService';

// Test paths
const testPaths = {
  'inferno-cover': '/assets/the-divine-comedy-inferno/images/inferno-01.png',
  placeholder: '/assets/covers/placeholder.jpg',
  'pride-cover': '/assets/pride-and-prejudice/images/pride-and-prejudice-01.png',
};

console.log('\n=== Debug Asset URL Generation ===\n');

for (const [name, path] of Object.entries(testPaths)) {
  console.log(`\nTesting: ${name}`);
  console.log(`Input path: ${path}`);

  const url = getAssetUrl(path, true);
  console.log(`Generated URL: ${url}`);

  // Check what the base URL is
  console.log(`Base URL: ${process.env.NEXT_PUBLIC_BLOB_BASE_URL}`);
}

console.log('\n\n=== BlobPathService Conversion ===\n');

for (const [name, path] of Object.entries(testPaths)) {
  console.log(`\nTesting: ${name}`);
  console.log(`Input path: ${path}`);

  const convertedPath = blobPathService.convertLegacyPath(path);
  console.log(`Converted path: ${convertedPath}`);
}

console.log('\n\n=== Asset Path Mapping ===\n');

for (const [name, path] of Object.entries(testPaths)) {
  console.log(`\nTesting: ${name}`);
  console.log(`Input path: ${path}`);

  const mappedPath = mapAssetPath(path);
  console.log(`Mapped path: ${mappedPath}`);
}
