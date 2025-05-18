/**
 * Translation data for The Quran
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE } from '../utils';

const quran: Translation = {
  slug: 'quran',
  title: 'the quran',
  shortDescription:
    'final islamic scripture drops, prophet muhammad delivers divine bars. monotheism endgame achieved.',
  coverImage: getAssetUrl('/assets/covers/placeholder.jpg', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default quran;
