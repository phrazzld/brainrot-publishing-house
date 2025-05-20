/**
 * Translation data for Bible: New Testament
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE } from '../utils';

const bibleNewTestament: Translation = {
  slug: 'bible-new-testament',
  title: 'bible: new testament',
  shortDescription:
    'jesus speedruns salvation meta, apostles document the whole vibe. christianity origin story hits different.',
  coverImage: getAssetUrl(
    '/assets/the-bible-new-testament/images/new-testament-01.png',
    USE_BLOB_STORAGE
  ),
  status: 'coming soon',
  chapters: [],
};

export default bibleNewTestament;
