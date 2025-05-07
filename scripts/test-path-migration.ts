/**
 * Test utility for path migration
 *
 * This script tests the new AssetPathService by converting legacy paths to the new
 * unified structure and printing the results. It helps verify the consistency and
 * correctness of path conversion for various asset types.
 */
import { AssetType } from '../types/assets';
import { AssetPathService } from '../utils/services/AssetPathService';

const assetPathService = new AssetPathService();

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
console.log('\n=== Direct Path Generation ===\n');

console.log('Audio Paths:');
console.log(`Chapter 1: ${assetPathService.getAudioPath('the-iliad', 1)}`);
console.log(`Chapter 10: ${assetPathService.getAudioPath('hamlet', 10)}`);
console.log(`Full audiobook: ${assetPathService.getAudioPath('macbeth', 'full')}`);

console.log('\nBrainrot Text Paths:');
console.log(`Chapter 2: ${assetPathService.getBrainrotTextPath('the-odyssey', 2)}`);
console.log(`Full text: ${assetPathService.getBrainrotTextPath('othello', 'full')}`);

console.log('\nSource Text Paths:');
console.log(`Chapter 3: ${assetPathService.getSourceTextPath('king-lear', '3')}`);
console.log(
  `Introduction: ${assetPathService.getSourceTextPath('romeo-and-juliet', 'introduction.txt')}`
);

console.log('\nBook Image Paths:');
console.log(`Cover: ${assetPathService.getBookImagePath('hamlet', 'cover.jpg')}`);
console.log(`Chapter image: ${assetPathService.getBookImagePath('macbeth', 'chapter-02.png')}`);

console.log('\nShared Image Paths:');
console.log(`Logo: ${assetPathService.getSharedImagePath('logo.png')}`);
console.log(`Social icon: ${assetPathService.getSharedImagePath('twitter.svg', 'social')}`);

console.log('\nSite Asset Paths:');
console.log(`Favicon: ${assetPathService.getSiteAssetPath('favicon.ico')}`);
console.log(`Icon: ${assetPathService.getSiteAssetPath('download.svg', 'icons')}`);

// Test legacy path conversion
console.log('\n\n=== Legacy Path Conversion ===\n');

console.log('Before → After:');
for (const path of testPaths) {
  const newPath = assetPathService.convertLegacyPath(path);
  console.log(`${path.padEnd(45)} → ${newPath}`);
}

// Test book slug extraction
console.log('\n\n=== Book Slug Extraction ===\n');

const slugTestPaths = [
  'assets/audio/the-iliad/chapter-01.mp3',
  'books/the-odyssey/audio/01.mp3',
  'hamlet/audio/02.mp3',
  '/assets/macbeth/images/cover.jpg',
  'assets/shared/logo.png',
  'books/king-lear/text/brainrot/fulltext.txt',
];

console.log('Path → Book Slug:');
for (const path of slugTestPaths) {
  const slug = assetPathService.getBookSlugFromPath(path);
  console.log(`${path.padEnd(45)} → ${slug || 'null'}`);
}

// Demonstrate the full migration path for a sample asset
console.log('\n\n=== Sample Migration Flow ===\n');

const sampleAssets = [
  {
    type: 'Audio Chapter',
    legacyPath: 'the-iliad/audio/01.mp3',
    extractedSlug: null,
    newPath: null,
    directGeneration: null,
  },
  {
    type: 'Brainrot Text',
    legacyPath: 'books/hamlet/text/brainrot/03.txt',
    extractedSlug: null,
    newPath: null,
    directGeneration: null,
  },
  {
    type: 'Book Image',
    legacyPath: 'books/the-odyssey/images/cover.jpg',
    extractedSlug: null,
    newPath: null,
    directGeneration: null,
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
  console.log(`Asset Type: ${asset.type}`);
  console.log(`Legacy Path: ${asset.legacyPath}`);
  console.log(`Extracted Slug: ${asset.extractedSlug}`);
  console.log(`Converted Path: ${asset.newPath}`);
  console.log(`Directly Generated: ${asset.directGeneration}`);
  console.log(`Paths Match: ${asset.newPath === asset.directGeneration ? 'Yes ✓' : 'No ✗'}`);
  console.log('');
}

console.log('Path migration testing complete.');
