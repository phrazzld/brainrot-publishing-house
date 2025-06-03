/**
 * Debug script to understand how asset URLs are being generated
 */
import { getAssetUrl } from '../../utils.js';
// Check asset path mapping
import { mapAssetPath } from '../../utils/assetPathMapping.js';
import { logger } from '../../utils/logger.js';
// Also let's check what the blob path service does with these
import { blobPathService } from '../../utils/services/BlobPathService.js';

// Create a debug-specific logger
const debugLogger = logger.child({ module: 'debug-asset-urls' });

// Test paths
const testPaths = {
  'inferno-cover': '/assets/the-divine-comedy-inferno/images/inferno-01.png',
  placeholder: '/assets/covers/placeholder.jpg',
  'pride-cover': '/assets/pride-and-prejudice/images/pride-and-prejudice-01.png',
};

debugLogger.info({ msg: '=== Debug Asset URL Generation ===' });

for (const [name, path] of Object.entries(testPaths)) {
  debugLogger.info({ name, path, msg: `Testing asset path` });

  const url = getAssetUrl(path, true);
  debugLogger.info({ name, url, msg: `Generated URL` });

  // Check what the base URL is
  debugLogger.info({ baseUrl: process.env.NEXT_PUBLIC_BLOB_BASE_URL, msg: `Base URL` });
}

debugLogger.info({ msg: '=== BlobPathService Conversion ===' });

for (const [name, path] of Object.entries(testPaths)) {
  debugLogger.info({ name, path, msg: `Testing BlobPathService conversion` });

  const convertedPath = blobPathService.convertLegacyPath(path);
  debugLogger.info({ name, path, convertedPath, msg: `Converted path` });
}

debugLogger.info({ msg: '=== Asset Path Mapping ===' });

for (const [name, path] of Object.entries(testPaths)) {
  debugLogger.info({ name, path, msg: `Testing asset path mapping` });

  const mappedPath = mapAssetPath(path);
  debugLogger.info({ name, path, mappedPath, msg: `Mapped path` });
}
