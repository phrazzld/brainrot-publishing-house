/**
 * Translation data for The Bhagavad Gita
 */
import { getAssetUrl } from '../utils.js';
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE } from '../utils.js';

const bhagavadGita: Translation = {
  slug: 'bhagavad-gita',
  title: 'the bhagavad gita',
  shortDescription:
    'krishna drops philosophy mid-battle, arjuna contemplates existence. hindu wisdom literature stays undefeated.',
  coverImage: getAssetUrl('/assets/bhagavad-gita/images/gita-01.png', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default bhagavadGita;
