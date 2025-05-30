/**
 * Translation data for Romeo and Juliet
 */
import { getAssetUrl } from '../utils.js';
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE } from '../utils.js';

const romeoAndJuliet: Translation = {
  slug: 'romeo-and-juliet',
  title: 'romeo and juliet',
  shortDescription:
    'teen love speedrun any%, family beef ruins everything. shakespeare understood toxic relationships fr.',
  coverImage: getAssetUrl(
    '/assets/romeo-and-juliet/images/romeo-and-juliet-02.png',
    USE_BLOB_STORAGE,
  ),
  status: 'coming soon',
  chapters: [],
};

export default romeoAndJuliet;
