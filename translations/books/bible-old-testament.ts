/**
 * Translation data for Bible: Old Testament
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE } from '../utils';

const bibleOldTestament: Translation = {
  slug: 'bible-old-testament',
  title: 'bible: old testament',
  shortDescription:
    'OG biblical lore drops. god tier world building, moses main character arc goes crazy.',
  coverImage: getAssetUrl('/assets/covers/placeholder.jpg', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default bibleOldTestament;
