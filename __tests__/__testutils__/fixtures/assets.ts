/**
 * Fixtures for asset-related test data
 */

/**
 * Asset types supported by the application
 */
export type AssetType = 'audio' | 'text' | 'image';

/**
 * Interface for asset metadata
 */
export interface AssetData {
  assetType: AssetType;
  bookSlug: string;
  assetName: string;
  path: string;
  url: string;
  contentType?: string;
  size?: number;
}

/**
 * Creates an asset data fixture
 */
export function createAssetFixture<T extends Partial<AssetData> = Record<string, never>>(
  assetType: AssetType,
  bookSlug: string,
  assetName: string,
  overrides?: T,
): AssetData & T {
  // Determine content type based on asset type and file extension
  let contentType = 'application/octet-stream';
  if (assetType === 'text') {
    contentType = 'text/plain';
  } else if (assetType === 'audio') {
    contentType = 'audio/mpeg';
  } else if (assetType === 'image') {
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
  } as AssetData & T;
}

/**
 * Creates an audio asset fixture
 */
export function createAudioAssetFixture<T extends Partial<AssetData> = Record<string, never>>(
  bookSlug: string,
  chapter: number | 'full-audiobook',
  overrides?: T,
): AssetData & T {
  const assetName =
    typeof chapter === 'number'
      ? `chapter-${String(chapter).padStart(2, '0')}.mp3`
      : 'full-audiobook.mp3';

  return createAssetFixture('audio', bookSlug, assetName, {
    contentType: 'audio/mpeg',
    size: 1024 * 1024 * 2, // 2MB for audio files
    ...overrides,
  });
}

/**
 * Creates a text asset fixture
 */
export function createTextAssetFixture<T extends Partial<AssetData> = Record<string, never>>(
  bookSlug: string,
  chapter: number | 'fulltext' | string,
  textType: 'brainrot' | 'source' = 'brainrot',
  overrides?: T,
): AssetData & T {
  let assetName: string;

  if (typeof chapter === 'number') {
    assetName = `${textType}-chapter-${String(chapter).padStart(2, '0')}.txt`;
  } else if (chapter === 'fulltext') {
    assetName = `${textType}-fulltext.txt`;
  } else {
    assetName = `${textType}-${chapter}.txt`;
  }

  return createAssetFixture('text', bookSlug, assetName, {
    contentType: 'text/plain',
    size: 1024 * 10, // 10KB for text files
    ...overrides,
  });
}

/**
 * Creates an image asset fixture
 */
export function createImageAssetFixture<T extends Partial<AssetData> = Record<string, never>>(
  bookSlug: string,
  imageName: string,
  overrides?: T,
): AssetData & T {
  return createAssetFixture('image', bookSlug, imageName, {
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
export function createCoverImageFixture<T extends Partial<AssetData> = Record<string, never>>(
  bookSlug: string,
  overrides?: T,
): AssetData & T {
  return createImageAssetFixture(bookSlug, 'cover.jpg', overrides);
}
