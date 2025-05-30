/**
 * Fixtures for asset-related test data
 */
import { AssetType } from '@/types/assets.js';

/**
 * Asset data structure
 */
export interface AssetData {
  assetType: AssetType;
  bookSlug: string;
  assetName: string;
  path: string;
  url: string;
  contentType: string;
  size: number;
  [key: string]: unknown;
}

/**
 * Creates an asset data fixture
 */
function createAssetFixture(
  assetType: AssetType,
  bookSlug: string,
  assetName: string,
  overrides: Partial<AssetData> = {},
): AssetData {
  // Determine content type based on asset type and file extension
  let contentType = 'application/octet-stream';
  if (assetType === AssetType.TEXT) {
    contentType = 'text/plain';
  } else if (assetType === AssetType.AUDIO) {
    contentType = 'audio/mpeg';
  } else if (assetType === AssetType.IMAGE) {
    contentType =
      assetName.endsWith('.jpg') || assetName.endsWith('.jpeg')
        ? 'image/jpeg'
        : assetName.endsWith('.png')
          ? 'image/png'
          : 'image/webp';
  }

  const path = `assets/${assetType}/${bookSlug}/${assetName}`;
  const url = `https://example.blob.vercel-storage.com/${path}`;

  return {
    assetType,
    bookSlug,
    assetName,
    path,
    url,
    contentType,
    size: 1024,
    ...overrides,
  };
}

/**
 * Creates an audio asset fixture
 */
function createAudioAssetFixture(
  bookSlug: string,
  chapter: number | 'full' | null,
  overrides: Partial<AssetData> = {},
): AssetData {
  const assetName =
    typeof chapter === 'number'
      ? `chapter-${String(chapter).padStart(2, '0')}.mp3`
      : 'full-audiobook.mp3';

  return createAssetFixture(AssetType.AUDIO, bookSlug, assetName, {
    contentType: 'audio/mpeg',
    size: 1024 * 1024 * 2, // 2MB for audio files
    ...overrides,
  });
}

/**
 * Creates a text asset fixture
 */
function createTextAssetFixture(
  bookSlug: string,
  chapter: number | 'fulltext' | string,
  textType: string = 'brainrot',
  overrides: Partial<AssetData> = {},
): AssetData {
  let assetName: string;

  if (typeof chapter === 'number') {
    assetName = `${textType}-chapter-${String(chapter).padStart(2, '0')}.txt`;
  } else if (chapter === 'fulltext') {
    assetName = `${textType}-fulltext.txt`;
  } else {
    assetName = `${textType}-${chapter}.txt`;
  }

  return createAssetFixture(AssetType.TEXT, bookSlug, assetName, {
    contentType: 'text/plain',
    size: 1024 * 10, // 10KB for text files
    ...overrides,
  });
}

/**
 * Creates an image asset fixture
 */
function createImageAssetFixture(
  bookSlug: string,
  imageName: string,
  overrides: Partial<AssetData> = {},
): AssetData {
  return createAssetFixture(AssetType.IMAGE, bookSlug, imageName, {
    contentType:
      imageName.endsWith('.jpg') || imageName.endsWith('.jpeg')
        ? 'image/jpeg'
        : imageName.endsWith('.png')
          ? 'image/png'
          : 'image/webp',
    size: 1024 * 100, // 100KB for image files
    ...overrides,
  });
}

/**
 * Creates a cover image asset fixture
 */
function createCoverImageFixture(bookSlug: string, overrides: Partial<AssetData> = {}): AssetData {
  return createImageAssetFixture(bookSlug, 'cover.jpg', overrides);
}

// Export asset functions
export {
  createAssetFixture,
  createAudioAssetFixture,
  createTextAssetFixture,
  createImageAssetFixture,
  createCoverImageFixture,
};
