/**
 * Translation data for The Quran
 */
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE, getAssetUrl } from '../utils.js';

const quran: Translation = {
  slug: 'quran',
  title: 'the quran',
  shortDescription:
    'final islamic scripture drops, prophet muhammad delivers divine bars. monotheism endgame achieved.',
  coverImage: getAssetUrl('/assets/the-quran/images/quran-01.png', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default quran;
