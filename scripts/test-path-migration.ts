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
scriptLogger.info({ section: 'direct-path-generation' }, '=== Direct Path Generation ===');

scriptLogger.info({ section: 'audio-paths' }, 'Audio Paths:');
scriptLogger.info(
  {
    book: 'the-iliad',
    chapter: 1,
    path: assetPathService.getAudioPath('the-iliad', 1),
  },
  `Chapter 1: ${assetPathService.getAudioPath('the-iliad', 1)}`
);

scriptLogger.info(
  {
    book: 'hamlet',
    chapter: 10,
    path: assetPathService.getAudioPath('hamlet', 10),
  },
  `Chapter 10: ${assetPathService.getAudioPath('hamlet', 10)}`
);

scriptLogger.info(
  {
    book: 'macbeth',
    type: 'full',
    path: assetPathService.getAudioPath('macbeth', 'full'),
  },
  `Full audiobook: ${assetPathService.getAudioPath('macbeth', 'full')}`
);

scriptLogger.info({ section: 'brainrot-text-paths' }, 'Brainrot Text Paths:');
scriptLogger.info(
  {
    book: 'the-odyssey',
    chapter: 2,
    path: assetPathService.getBrainrotTextPath('the-odyssey', 2),
  },
  `Chapter 2: ${assetPathService.getBrainrotTextPath('the-odyssey', 2)}`
);

scriptLogger.info(
  {
    book: 'othello',
    type: 'full',
    path: assetPathService.getBrainrotTextPath('othello', 'full'),
  },
  `Full text: ${assetPathService.getBrainrotTextPath('othello', 'full')}`
);

scriptLogger.info({ section: 'source-text-paths' }, 'Source Text Paths:');
scriptLogger.info(
  {
    book: 'king-lear',
    chapter: '3',
    path: assetPathService.getSourceTextPath('king-lear', '3'),
  },
  `Chapter 3: ${assetPathService.getSourceTextPath('king-lear', '3')}`
);

scriptLogger.info(
  {
    book: 'romeo-and-juliet',
    type: 'introduction.txt',
    path: assetPathService.getSourceTextPath('romeo-and-juliet', 'introduction.txt'),
  },
  `Introduction: ${assetPathService.getSourceTextPath('romeo-and-juliet', 'introduction.txt')}`
);

scriptLogger.info({ section: 'book-image-paths' }, 'Book Image Paths:');
scriptLogger.info(
  {
    book: 'hamlet',
    image: 'cover.jpg',
    path: assetPathService.getBookImagePath('hamlet', 'cover.jpg'),
  },
  `Cover: ${assetPathService.getBookImagePath('hamlet', 'cover.jpg')}`
);

scriptLogger.info(
  {
    book: 'macbeth',
    image: 'chapter-02.png',
    path: assetPathService.getBookImagePath('macbeth', 'chapter-02.png'),
  },
  `Chapter image: ${assetPathService.getBookImagePath('macbeth', 'chapter-02.png')}`
);

scriptLogger.info({ section: 'shared-image-paths' }, 'Shared Image Paths:');
scriptLogger.info(
  {
    image: 'logo.png',
    path: assetPathService.getSharedImagePath('logo.png'),
  },
  `Logo: ${assetPathService.getSharedImagePath('logo.png')}`
);

scriptLogger.info(
  {
    image: 'twitter.svg',
    category: 'social',
    path: assetPathService.getSharedImagePath('twitter.svg', 'social'),
  },
  `Social icon: ${assetPathService.getSharedImagePath('twitter.svg', 'social')}`
);

scriptLogger.info({ section: 'site-asset-paths' }, 'Site Asset Paths:');
scriptLogger.info(
  {
    asset: 'favicon.ico',
    path: assetPathService.getSiteAssetPath('favicon.ico'),
  },
  `Favicon: ${assetPathService.getSiteAssetPath('favicon.ico')}`
);

scriptLogger.info(
  {
    asset: 'download.svg',
    category: 'icons',
    path: assetPathService.getSiteAssetPath('download.svg', 'icons'),
  },
  `Icon: ${assetPathService.getSiteAssetPath('download.svg', 'icons')}`
);

// Test legacy path conversion
scriptLogger.info({ section: 'legacy-path-conversion' }, '=== Legacy Path Conversion ===');

scriptLogger.info({ section: 'legacy-path-conversion' }, 'Before → After:');
for (const path of testPaths) {
  const newPath = assetPathService.convertLegacyPath(path);
  scriptLogger.info(
    {
      originalPath: path,
      convertedPath: newPath,
    },
    `${path.padEnd(45)} → ${newPath}`
  );
}

// Test book slug extraction
scriptLogger.info({ section: 'book-slug-extraction' }, '=== Book Slug Extraction ===');

const slugTestPaths = [
  'assets/audio/the-iliad/chapter-01.mp3',
  'books/the-odyssey/audio/01.mp3',
  'hamlet/audio/02.mp3',
  '/assets/macbeth/images/cover.jpg',
  'assets/shared/logo.png',
  'books/king-lear/text/brainrot/fulltext.txt',
];

scriptLogger.info({ section: 'book-slug-extraction' }, 'Path → Book Slug:');
for (const path of slugTestPaths) {
  const slug = assetPathService.getBookSlugFromPath(path);
  scriptLogger.info(
    {
      path: path,
      bookSlug: slug || 'null',
    },
    `${path.padEnd(45)} → ${slug || 'null'}`
  );
}

// Demonstrate the full migration path for a sample asset
scriptLogger.info({ section: 'sample-migration-flow' }, '=== Sample Migration Flow ===');

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
  scriptLogger.info(
    {
      section: 'sample-asset',
      assetType: asset.type,
      legacyPath: asset.legacyPath,
      extractedSlug: asset.extractedSlug,
      convertedPath: asset.newPath,
      directlyGenerated: asset.directGeneration,
      pathsMatch: asset.newPath === asset.directGeneration,
    },
    `Asset Type: ${asset.type}`
  );

  scriptLogger.info({ assetType: asset.type }, `Legacy Path: ${asset.legacyPath}`);
  scriptLogger.info({ assetType: asset.type }, `Extracted Slug: ${asset.extractedSlug}`);
  scriptLogger.info({ assetType: asset.type }, `Converted Path: ${asset.newPath}`);
  scriptLogger.info({ assetType: asset.type }, `Directly Generated: ${asset.directGeneration}`);
  scriptLogger.info(
    {
      assetType: asset.type,
      pathsMatch: asset.newPath === asset.directGeneration,
    },
    `Paths Match: ${asset.newPath === asset.directGeneration ? 'Yes ✓' : 'No ✗'}`
  );
}

scriptLogger.info({ section: 'completion' }, 'Path migration testing complete.');
