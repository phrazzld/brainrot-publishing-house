/**
 * Script to update coming soon translation files with new cover paths
 */
import fs from 'fs';
import path from 'path';

import { logger } from '../utils/logger';

// Map of book slug to new cover paths
const coverPaths: Record<string, string> = {
  'pride-and-prejudice': '/assets/pride-and-prejudice/images/pride-and-prejudice-01.png',
  'paradise-lost': '/assets/paradise-lost/images/paradise-lost-01.png',
  meditations: '/assets/meditations/images/meditations-01.png',
  'divine-comedy-inferno': '/assets/the-divine-comedy-inferno/images/inferno-01.png',
  'divine-comedy-purgatorio': '/assets/the-divine-comedy-purgatorio/images/purgatorio-02.png',
  'divine-comedy-paradiso': '/assets/the-divine-comedy-paradiso/images/paradiso-02.png',
  'bible-old-testament': '/assets/the-bible-old-testament/images/old-testament-03.png',
  'bible-new-testament': '/assets/the-bible-new-testament/images/new-testament-01.png',
  quran: '/assets/the-quran/images/quran-01.png',
  'romeo-and-juliet': '/assets/romeo-and-juliet/images/romeo-and-juliet-02.png',
  'midsummer-nights-dream': '/assets/a-midsummer-nights-dream/images/midsummer-02.png',
  gilgamesh: '/assets/gilgamesh/images/gilgamesh-01.png',
  'bhagavad-gita': '/assets/bhagavad-gita/images/gita-01.png',
};

async function updateTranslationFiles() {
  const translationsDir = path.join(process.cwd(), 'translations', 'books');
  const successful: string[] = [];
  const failed: string[] = [];

  for (const [slug, newPath] of Object.entries(coverPaths)) {
    try {
      const filePath = path.join(translationsDir, `${slug}.ts`);

      if (!fs.existsSync(filePath)) {
        logger.warn({ msg: 'Translation file not found', file: filePath });
        failed.push(slug);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      // Replace placeholder with actual cover path
      const updatedContent = content.replace(
        /coverImage: getAssetUrl\('\/assets\/covers\/placeholder\.jpg', USE_BLOB_STORAGE\)/,
        `coverImage: getAssetUrl('${newPath}', USE_BLOB_STORAGE)`
      );

      if (content === updatedContent) {
        logger.info({ msg: 'No placeholder found, checking for existing path', file: slug });
        // May already have been updated, check if it needs different update
        if (!content.includes(newPath)) {
          logger.warn({ msg: 'Could not update cover path', file: slug });
          failed.push(slug);
          continue;
        }
      }

      fs.writeFileSync(filePath, updatedContent);
      logger.info({ msg: 'Updated translation file', file: slug, newPath });
      successful.push(slug);
    } catch (error) {
      logger.error({ msg: 'Failed to update file', file: slug, error: error.message });
      failed.push(slug);
    }
  }

  // Summary
  logger.info({
    msg: 'Update complete',
    successful: successful.length,
    failed: failed.length,
    successful_books: successful,
    failed_books: failed,
  });
}

// Run the update
updateTranslationFiles().catch(console.error);
