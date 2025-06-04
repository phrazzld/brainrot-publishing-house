/**
 * Asset path mapping for handling legacy path inconsistencies
 * Maps expected paths from translations to actual blob storage paths
 */

export const ASSET_PATH_MAPPINGS: Record<string, string> = {
  // Declaration of Independence mappings
  '/assets/text/declaration-of-independence/brainrot-declaration.txt':
    'books/the-declaration/text/brainrot-the-declaration-of-independence.txt',
  '/assets/declaration-of-independence/images/the-declaration-01.png':
    'books/the-declaration-of-independence/images/america-01.png',

  // Huckleberry Finn - add books/ prefix for images
  '/assets/the-adventures-of-huckleberry-finn/images/huck-finn-09.png':
    'books/the-adventures-of-huckleberry-finn/images/huck-finn-09.png',

  // Placeholder image for coming soon books
  '/assets/covers/placeholder.jpg': 'images/placeholder.jpg',

  // Coming soon book covers - map to actual blob locations
  '/assets/pride-and-prejudice/images/pride-and-prejudice-01.png':
    'assets/pride-and-prejudice/images/pride-and-prejudice-01.png',
  '/assets/paradise-lost/images/paradise-lost-01.png':
    'assets/paradise-lost/images/paradise-lost-01.png',
  '/assets/meditations/images/meditations-01.png': 'assets/meditations/images/meditations-01.png',
  '/assets/the-divine-comedy-inferno/images/inferno-01.png':
    'assets/the-divine-comedy-inferno/images/inferno-01.png',
  '/assets/the-divine-comedy-purgatorio/images/purgatorio-02.png':
    'assets/the-divine-comedy-purgatorio/images/purgatorio-02.png',
  '/assets/the-divine-comedy-paradiso/images/paradiso-02.png':
    'assets/the-divine-comedy-paradiso/images/paradiso-02.png',
  '/assets/the-bible-old-testament/images/old-testament-03.png':
    'assets/the-bible-old-testament/images/old-testament-03.png',
  '/assets/the-bible-new-testament/images/new-testament-01.png':
    'assets/the-bible-new-testament/images/new-testament-01.png',
  '/assets/the-quran/images/quran-01.png': 'assets/the-quran/images/quran-01.png',
  '/assets/romeo-and-juliet/images/romeo-and-juliet-02.png':
    'assets/romeo-and-juliet/images/romeo-and-juliet-02.png',
  '/assets/a-midsummer-nights-dream/images/midsummer-02.png':
    'assets/a-midsummer-nights-dream/images/midsummer-02.png',
  '/assets/gilgamesh/images/gilgamesh-01.png': 'assets/gilgamesh/images/gilgamesh-01.png',
  '/assets/bhagavad-gita/images/gita-01.png': 'assets/bhagavad-gita/images/gita-01.png',
};

/**
 * Map an asset path to its actual blob storage location
 * @param path - The expected path from translations
 * @returns The actual blob storage path
 */
export function mapAssetPath(path: string): string {
  // Check if there's a direct mapping
  if (ASSET_PATH_MAPPINGS[path]) {
    return ASSET_PATH_MAPPINGS[path];
  }

  // For Huckleberry Finn images, add the books/ prefix if missing
  if (path.startsWith('/assets/the-adventures-of-huckleberry-finn/images/')) {
    return path.replace('/assets/', 'books/');
  }

  // For other assets, use default mapping
  return path;
}
