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
  coverImage: getAssetUrl(
    '/assets/the-bible-old-testament/images/old-testament-03.png',
    USE_BLOB_STORAGE,
  ),
  status: 'coming soon',
  chapters: [],
};

export default bibleOldTestament;
