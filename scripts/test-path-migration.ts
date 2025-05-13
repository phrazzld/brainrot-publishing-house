/**
 * Test utility for path migration
 *
 * This script tests the new AssetPathService by converting legacy paths to the new
 * unified structure and printing the results. It helps verify the consistency and
 * correctness of path conversion for various asset types.
 */
import { AssetType as _AssetType } from '../types/assets';
import { logger } from '../utils/logger';
import { AssetPathService } from '../utils/services/AssetPathService';

const assetPathService = new AssetPathService();
const scriptLogger = logger.child({ module: 'test-path-migration' });

// Sample paths to test
const testPaths = [
  // Book images
  'books/the-iliad/images/cover.jpg',
  '/books/the-odyssey/images/chapter-01.png',

  // Audio files
  'books/hamlet/audio/01.mp3',
  'books/macbeth/audio/10.mp3',
  'the-iliad/audio/01.mp3',
  '/the-odyssey/audio/full.mp3',

  // Brainrot text
  'books/hamlet/text/brainrot/01.txt',
  'books/macbeth/text/brainrot/fulltext.txt',

  // Source text
  'books/othello/text/source/introduction.txt',
  'books/romeo-and-juliet/text/source/chapter-01.txt',

  // Shared images
  'images/logo.png',
  '/images/background.jpg',

  // Site assets
  'site-assets/favicon.ico',
  'site-assets/icons/download.svg',

  // Edge cases
  'some-random-path.txt',
  '/assets/king-lear/images/cover.jpg',
];

// Test direct path generation
scriptLogger.info({ msg: '=== Direct Path Generation ===', section: 'direct-path-generation' });

scriptLogger.info({ msg: 'Audio Paths:', section: 'audio-paths' });
scriptLogger.info({
  msg: `Chapter 1: ${assetPathService.getAudioPath('the-iliad', 1)}`,
  book: 'the-iliad',
  chapter: 1,
  path: assetPathService.getAudioPath('the-iliad', 1),
});

scriptLogger.info({
  msg: `Chapter 10: ${assetPathService.getAudioPath('hamlet', 10)}`,
  book: 'hamlet',
  chapter: 10,
  path: assetPathService.getAudioPath('hamlet', 10),
});

scriptLogger.info({
  msg: `Full audiobook: ${assetPathService.getAudioPath('macbeth', 'full')}`,
  book: 'macbeth',
  type: 'full',
  path: assetPathService.getAudioPath('macbeth', 'full'),
});

scriptLogger.info({ msg: 'Brainrot Text Paths:', section: 'brainrot-text-paths' });
scriptLogger.info({
  msg: `Chapter 2: ${assetPathService.getBrainrotTextPath('the-odyssey', 2)}`,
  book: 'the-odyssey',
  chapter: 2,
  path: assetPathService.getBrainrotTextPath('the-odyssey', 2),
});

scriptLogger.info({
  msg: `Full text: ${assetPathService.getBrainrotTextPath('othello', 'full')}`,
  book: 'othello',
  type: 'full',
  path: assetPathService.getBrainrotTextPath('othello', 'full'),
});

scriptLogger.info({ msg: 'Source Text Paths:', section: 'source-text-paths' });
scriptLogger.info({
  msg: `Chapter 3: ${assetPathService.getSourceTextPath('king-lear', '3')}`,
  book: 'king-lear',
  chapter: '3',
  path: assetPathService.getSourceTextPath('king-lear', '3'),
});

scriptLogger.info({
  msg: `Introduction: ${assetPathService.getSourceTextPath('romeo-and-juliet', 'introduction.txt')}`,
  book: 'romeo-and-juliet',
  type: 'introduction.txt',
  path: assetPathService.getSourceTextPath('romeo-and-juliet', 'introduction.txt'),
});

scriptLogger.info({ msg: 'Book Image Paths:', section: 'book-image-paths' });
scriptLogger.info({
  msg: `Cover: ${assetPathService.getBookImagePath('hamlet', 'cover.jpg')}`,
  book: 'hamlet',
  image: 'cover.jpg',
  path: assetPathService.getBookImagePath('hamlet', 'cover.jpg'),
});

scriptLogger.info({
  msg: `Chapter image: ${assetPathService.getBookImagePath('macbeth', 'chapter-02.png')}`,
  book: 'macbeth',
  image: 'chapter-02.png',
  path: assetPathService.getBookImagePath('macbeth', 'chapter-02.png'),
});

scriptLogger.info({ msg: 'Shared Image Paths:', section: 'shared-image-paths' });
scriptLogger.info({
  msg: `Logo: ${assetPathService.getSharedImagePath('logo.png')}`,
  image: 'logo.png',
  path: assetPathService.getSharedImagePath('logo.png'),
});

scriptLogger.info({
  msg: `Social icon: ${assetPathService.getSharedImagePath('twitter.svg', 'social')}`,
  image: 'twitter.svg',
  category: 'social',
  path: assetPathService.getSharedImagePath('twitter.svg', 'social'),
});

scriptLogger.info({ msg: 'Site Asset Paths:', section: 'site-asset-paths' });
scriptLogger.info({
  msg: `Favicon: ${assetPathService.getSiteAssetPath('favicon.ico')}`,
  asset: 'favicon.ico',
  path: assetPathService.getSiteAssetPath('favicon.ico'),
});

scriptLogger.info({
  msg: `Icon: ${assetPathService.getSiteAssetPath('download.svg', 'icons')}`,
  asset: 'download.svg',
  category: 'icons',
  path: assetPathService.getSiteAssetPath('download.svg', 'icons'),
});

// Test legacy path conversion
scriptLogger.info({ msg: '=== Legacy Path Conversion ===', section: 'legacy-path-conversion' });

scriptLogger.info({ msg: 'Before → After:', section: 'legacy-path-conversion' });
for (const path of testPaths) {
  const newPath = assetPathService.convertLegacyPath(path);
  scriptLogger.info({
    msg: `${path.padEnd(45)} → ${newPath}`,
    originalPath: path,
    convertedPath: newPath,
  });
}

// Test book slug extraction
scriptLogger.info({ msg: '=== Book Slug Extraction ===', section: 'book-slug-extraction' });

const slugTestPaths = [
  'assets/audio/the-iliad/chapter-01.mp3',
  'books/the-odyssey/audio/01.mp3',
  'hamlet/audio/02.mp3',
  '/assets/macbeth/images/cover.jpg',
  'assets/shared/logo.png',
  'books/king-lear/text/brainrot/fulltext.txt',
];

scriptLogger.info({ msg: 'Path → Book Slug:', section: 'book-slug-extraction' });
for (const path of slugTestPaths) {
  const slug = assetPathService.getBookSlugFromPath(path);
  scriptLogger.info({
    msg: `${path.padEnd(45)} → ${slug || 'null'}`,
    path: path,
    bookSlug: slug || 'null',
  });
}

// Demonstrate the full migration path for a sample asset
scriptLogger.info({ msg: '=== Sample Migration Flow ===', section: 'sample-migration-flow' });

const sampleAssets = [
  {
    type: 'Audio Chapter',
    legacyPath: 'the-iliad/audio/01.mp3',
    extractedSlug: null as string | null,
    newPath: null as string | null,
    directGeneration: null as string | null,
  },
  {
    type: 'Brainrot Text',
    legacyPath: 'books/hamlet/text/brainrot/03.txt',
    extractedSlug: null as string | null,
    newPath: null as string | null,
    directGeneration: null as string | null,
  },
  {
    type: 'Book Image',
    legacyPath: 'books/the-odyssey/images/cover.jpg',
    extractedSlug: null as string | null,
    newPath: null as string | null,
    directGeneration: null as string | null,
  },
];

for (const asset of sampleAssets) {
  // Extract the book slug
  asset.extractedSlug = assetPathService.getBookSlugFromPath(asset.legacyPath);

  // Convert the legacy path
  asset.newPath = assetPathService.convertLegacyPath(asset.legacyPath);

  // Generate the path directly (to compare)
  if (asset.type === 'Audio Chapter') {
    const match = asset.legacyPath.match(/(\d+)\.mp3$/);
    if (match && asset.extractedSlug) {
      asset.directGeneration = assetPathService.getAudioPath(asset.extractedSlug, match[1]);
    }
  } else if (asset.type === 'Brainrot Text') {
    const match = asset.legacyPath.match(/brainrot\/(\w+)\.txt$/);
    if (match && asset.extractedSlug) {
      asset.directGeneration = assetPathService.getBrainrotTextPath(asset.extractedSlug, match[1]);
    }
  } else if (asset.type === 'Book Image') {
    const match = asset.legacyPath.match(/images\/(.+)$/);
    if (match && asset.extractedSlug) {
      asset.directGeneration = assetPathService.getBookImagePath(asset.extractedSlug, match[1]);
    }
  }
}

// Display the results
for (const asset of sampleAssets) {
  scriptLogger.info({
    msg: `Asset Type: ${asset.type}`,
    section: 'sample-asset',
    assetType: asset.type,
    legacyPath: asset.legacyPath,
    extractedSlug: asset.extractedSlug,
    convertedPath: asset.newPath,
    directlyGenerated: asset.directGeneration,
    pathsMatch: asset.newPath === asset.directGeneration,
  });

  scriptLogger.info({ msg: `Legacy Path: ${asset.legacyPath}`, assetType: asset.type });
  scriptLogger.info({ msg: `Extracted Slug: ${asset.extractedSlug}`, assetType: asset.type });
  scriptLogger.info({ msg: `Converted Path: ${asset.newPath}`, assetType: asset.type });
  scriptLogger.info({
    msg: `Directly Generated: ${asset.directGeneration}`,
    assetType: asset.type,
  });
  scriptLogger.info({
    msg: `Paths Match: ${asset.newPath === asset.directGeneration ? 'Yes ✓' : 'No ✗'}`,
    assetType: asset.type,
    pathsMatch: asset.newPath === asset.directGeneration,
  });
}

scriptLogger.info({ msg: 'Path migration testing complete.', section: 'completion' });
